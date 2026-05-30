import { createFileRoute } from "@tanstack/react-router";
import { HERO_COPY, HERO_COPY_VERSION } from "@/content/hero-copy";
import { HERO_COPY_SPEC } from "@/content/hero-copy.spec";

const PUBLISHED_URL = "https://yesexperiencesportugal.com";

/**
 * Allowlist of origins permitted as `?url=` overrides. Any value outside this
 * set is rejected before a fetch is issued (SSRF defence). HTTPS-only.
 */
const ALLOWED_ORIGINS = new Set<string>([
  new URL(PUBLISHED_URL).origin,
  "https://dreamscape-builder-co.lovable.app",
  "https://id-preview--5351efc5-c55a-4e41-b282-a4a019690d38.lovable.app",
]);


/**
 * Validate a caller-supplied base URL. Must parse, must be https, and must
 * have an origin present in ALLOWED_ORIGINS. Returns null on rejection.
 */
function validateTargetUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (!ALLOWED_ORIGINS.has(parsed.origin)) return null;
  // Normalise: strip query/hash, keep pathname only as base.
  return parsed.origin + (parsed.pathname === "/" ? "" : parsed.pathname);
}

/**
 * Validate a caller-supplied path. Must be a relative path beginning with `/`
 * and must not contain a scheme (e.g. `https://attacker.com`) or
 * protocol-relative form (`//attacker.com`). Returns null on rejection.
 */
function validatePath(raw: string): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  if (raw.length > 256) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null; // protocol-relative
  if (raw.includes("://")) return null;
  // Sentinel-base check: resolving against a placeholder origin must not
  // change the origin (which would indicate the path overrode the base).
  try {
    const sentinel = "http://verify-hero.invalid";
    const resolved = new URL(raw, sentinel);
    if (resolved.origin !== sentinel) return null;
  } catch {
    return null;
  }
  return raw;
}

/**
 * Constant-time string comparison to avoid leaking auth tokens via timing.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Redact sensitive fields from a URL before logging. Strips the entire query
 * string and fragment so callers can never leak `?token=...` or other
 * sensitive overrides via worker logs. Returns only `<origin><pathname>`,
 * or `"<unparseable-url>"` if the input is not a valid URL.
 */
function redactUrlForLog(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "<unparseable-url>";
  }
}

/**
 * Generate a short request correlation ID for cross-referencing log lines
 * with client-side traces. Uses crypto.randomUUID when available, otherwise
 * falls back to a base36 random string. The ID is opaque, non-secret, and
 * safe to return in response headers.
 */
function newRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to fallback
  }
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

type AuditOutcome = "ok" | "reject" | "error";

/**
 * Single audit logger for every request — successes, rejections, and
 * unexpected errors. Records only:
 *   - rid: request correlation ID
 *   - method: HTTP method
 *   - route: redacted path (no query string, no fragment, no token)
 *   - status: HTTP response status
 *   - outcome: "ok" | "reject" | "error"
 *   - reason: stable machine code (never an error message or stack)
 *
 * It deliberately does NOT log: tokens, the raw request URL, query
 * parameters, request/response headers, request/response bodies, IPs, or
 * caller-supplied `?url=` / `?path=` values.
 */
function logAudit(
  rid: string,
  method: string,
  requestUrl: string,
  status: number,
  outcome: AuditOutcome,
  reason: string,
): void {
  const line = JSON.stringify({
    evt: "verify_hero_audit",
    rid,
    method,
    route: redactUrlForLog(requestUrl),
    status,
    outcome,
    reason,
  });

  if (outcome === "ok") console.info(line);
  else console.warn(line);
}

/**
 * Every routable path generated from `src/routes/` (excluding `__root` and the
 * api/* server routes). Keep this list in sync when new top-level routes are
 * added — it powers the multi-page hero verification mode.
 */
const ALL_ROUTES = [
  "/",
  "/about",
  "/brand-qa",
  "/builder",
  "/contact",
  "/corporate",
  "/day-tours",
  "/experiences",
  "/local-stories",
  "/multi-day",
  "/proposals",
  "/hero-verify",
] as const;

const HERO_KEYS = [
  "eyebrow",
  "headlineLine1",
  "headlineLine2",
  "subheadline",
  "primaryCta",
  "secondaryCta",
  "microcopy",
] as const;

type CheckResult = {
  key: string;
  expected: string;
  found: boolean;
};

type PageReport = {
  path: string;
  url: string;
  ok: boolean;
  httpStatus: number;
  liveVersion: string | null;
  versionMatch: boolean | null;
  checks: CheckResult[];
  missing: { key: string; expected: string }[];
  error?: string;
};

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&middot;/g, "·")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function verifyPage(targetUrl: string, path: string): Promise<PageReport> {
  const url = new URL(path, targetUrl).toString();
  const base: Omit<PageReport, "ok" | "httpStatus" | "checks" | "missing"> = {
    path,
    url,
    liveVersion: null,
    versionMatch: null,
  };

  try {
    const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
    const liveVersion = res.headers.get("x-hero-copy-version");
    const html = await res.text();
    const decoded = decodeHtml(html);

    const checks: CheckResult[] = HERO_KEYS.map((key) => ({
      key,
      expected: HERO_COPY_SPEC[key],
      found: decoded.includes(HERO_COPY_SPEC[key]),
    }));

    const missing = checks
      .filter((c) => !c.found)
      .map((c) => ({ key: c.key, expected: c.expected }));

    return {
      ...base,
      httpStatus: res.status,
      liveVersion,
      versionMatch: liveVersion === null ? null : liveVersion === HERO_COPY_VERSION,
      checks,
      missing,
      ok: missing.length === 0 && res.status === 200,
    };
  } catch (err) {
    return {
      ...base,
      httpStatus: 0,
      checks: [],
      missing: HERO_KEYS.map((key) => ({ key, expected: HERO_COPY_SPEC[key] })),
      ok: false,
      error: (err as Error).message,
    };
  }
}

/**
 * Compare the in-source HERO_COPY against the frozen HERO_COPY_SPEC. If any
 * string drifts, the verifier reports it before even hitting the network — so
 * unauthorised wording changes are caught at the source, not after publish.
 */
function detectSpecDrift() {
  const drifted = HERO_KEYS.filter((k) => HERO_COPY[k] !== HERO_COPY_SPEC[k]).map((k) => ({
    key: k,
    expected: HERO_COPY_SPEC[k],
    actual: HERO_COPY[k],
  }));
  return { ok: drifted.length === 0, drifted };
}

type FailureReason = "fetch_error" | "non_200" | "missing_strings" | "stale_version" | "spec_drift";

type FailedRouteSummary = {
  path: string;
  url: string;
  httpStatus: number;
  reasons: FailureReason[];
  missingKeys: string[];
  liveVersion: string | null;
};

type SpecDriftEntry = { key: string; expected: string; actual: string };
type SpecDriftResult = { ok: boolean; drifted: SpecDriftEntry[] };

type Summary = {
  totalPages: number;
  passedPages: number;
  failedPages: number;
  failedRoutes: FailedRouteSummary[];
  failedPaths: string[];
  specDriftKeys: string[];
  message: string;
};

function buildSummary(pages: PageReport[], specDrift: SpecDriftResult): Summary {
  const failed = pages.filter((p) => !p.ok);
  const failedRoutes: FailedRouteSummary[] = failed.map((p) => {
    const reasons: FailureReason[] = [];
    if (p.error) reasons.push("fetch_error");
    if (!p.error && p.httpStatus !== 200) reasons.push("non_200");
    if (p.missing.length > 0) reasons.push("missing_strings");
    if (p.versionMatch === false) reasons.push("stale_version");
    return {
      path: p.path,
      url: p.url,
      httpStatus: p.httpStatus,
      reasons,
      missingKeys: p.missing.map((m) => m.key),
      liveVersion: p.liveVersion,
    };
  });

  const failedPaths = failedRoutes.map((r) => r.path);
  const specDriftKeys = specDrift.drifted.map((d) => d.key);

  const parts: string[] = [];
  if (!specDrift.ok) {
    parts.push(`Source HERO_COPY drifted from spec: ${specDriftKeys.join(", ")}`);
  }
  if (failed.length > 0) {
    parts.push(`${failed.length} of ${pages.length} page(s) failed: ${failedPaths.join(", ")}`);
  }
  const message =
    parts.length === 0
      ? `All ${pages.length} page(s) match the frozen hero copy spec.`
      : parts.join(" — ");

  return {
    totalPages: pages.length,
    passedPages: pages.length - failed.length,
    failedPages: failed.length,
    failedRoutes,
    failedPaths,
    specDriftKeys,
    message,
  };
}

/**
 * GET /api/verify-hero
 *
 * Default: verifies the homepage of the published site against the current
 * source `HERO_COPY` (eyebrow, both headline lines, subheadline, CTAs,
 * microcopy).
 *
 * Query params:
 *   ?url=<base>   Override the base URL (e.g. preview deployment).
 *   ?all=1        Fan out across every route in ALL_ROUTES and require every
 *                 page to contain all 7 hero strings verbatim.
 *   ?path=/x      Check a single specific path instead of "/".
 *   ?strict=1     Escalate any failure to HTTP 422 (instead of 409) and
 *                 include a top-level `summary` object listing failed routes
 *                 and reason codes — designed for CI / curl `--fail` checks.
 *
 * Status codes:
 *   200  all checks passed
 *   409  one or more strings missing (default failure code)
 *   422  failure under ?strict=1
 *   502  network/fetch error reaching the target
 */
export const Route = createFileRoute("/api/verify-hero")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const rid = newRequestId();
        const auditHeaders = {
          "cache-control": "no-store",
          "x-request-id": rid,
        };
        try {
          const url = new URL(request.url);

          // ---- Auth: require shared secret before any fetch logic runs ----
          const expectedToken = process.env.VERIFY_HERO_TOKEN;
          if (!expectedToken) {
            logAudit(rid, request.method, request.url, 503, "reject", "endpoint_disabled");
            return Response.json(
              { ok: false, error: "endpoint_disabled", rid },
              { status: 503, headers: auditHeaders },
            );
          }
          const authHeader = request.headers.get("authorization") ?? "";
          const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
          const queryToken = url.searchParams.get("token") ?? "";
          const presented = bearer || queryToken;
          if (!presented || !timingSafeEqual(presented, expectedToken)) {
            logAudit(rid, request.method, request.url, 401, "reject", "unauthorized");
            return Response.json(
              { ok: false, error: "unauthorized", rid },
              { status: 401, headers: auditHeaders },
            );
          }

          // ---- Input validation ----
          const rawTarget = url.searchParams.get("url");
          const target = rawTarget === null ? PUBLISHED_URL : validateTargetUrl(rawTarget);
          if (target === null) {
            logAudit(rid, request.method, request.url, 400, "reject", "invalid_url_param");
            return Response.json(
              { ok: false, error: "invalid_url_param", rid },
              { status: 400, headers: auditHeaders },
            );
          }

          const all = url.searchParams.get("all");
          const strictParam = url.searchParams.get("strict");
          const strict = strictParam === "1" || strictParam === "true";

          const rawPath = url.searchParams.get("path");
          const singlePath = rawPath === null ? "/" : validatePath(rawPath);
          if (singlePath === null) {
            logAudit(rid, request.method, request.url, 400, "reject", "invalid_path_param");
            return Response.json(
              { ok: false, error: "invalid_path_param", rid },
              { status: 400, headers: auditHeaders },
            );
          }

          const paths: readonly string[] =
            all === "1" || all === "true" ? ALL_ROUTES : [singlePath];

          const pages = await Promise.all(paths.map((p) => verifyPage(target, p)));

          const specDrift = detectSpecDrift();
          const pagesOk = pages.every((p) => p.ok);
          const ok = pagesOk && specDrift.ok;
          const failedCount = pages.filter((p) => !p.ok).length + (specDrift.ok ? 0 : 1);
          const summary = buildSummary(pages, specDrift);

          if (paths.length === 1) {
            const only = pages[0];
            const failureStatus = strict ? 422 : only.error ? 502 : 409;
            const status = only.ok ? 200 : failureStatus;
            const reason = only.ok ? "verified" : only.error ? "fetch_error" : "missing_strings";
            logAudit(rid, request.method, request.url, status, only.ok ? "ok" : "reject", reason);
            return Response.json(
              {
                ok: only.ok,
                rid,
                strict,
                target: only.url,
                httpStatus: only.httpStatus,
                sourceVersion: HERO_COPY_VERSION,
                specDrift,
                liveVersion: only.liveVersion,
                versionMatch: only.versionMatch,
                checks: only.checks,
                missing: only.missing,
                summary,
                checkedAt: new Date().toISOString(),
                ...(only.error ? { error: only.error } : {}),
              },
              { status, headers: auditHeaders },
            );
          }

          const multiFailureStatus = strict ? 422 : 409;
          const status = ok ? 200 : multiFailureStatus;
          logAudit(
            rid,
            request.method,
            request.url,
            status,
            ok ? "ok" : "reject",
            ok ? "verified_all" : "missing_strings",
          );
          return Response.json(
            {
              ok,
              rid,
              strict,
              mode: "all",
              base: target,
              sourceVersion: HERO_COPY_VERSION,
              specDrift,
              totalPages: pages.length,
              failedCount,
              summary,
              pages,
              checkedAt: new Date().toISOString(),
            },
            { status, headers: auditHeaders },
          );
        } catch {
          logAudit(rid, request.method, request.url, 500, "error", "unexpected_error");
          return Response.json(
            { ok: false, error: "internal_error", rid },
            { status: 500, headers: auditHeaders },
          );
        }
      },
    },
  },
});
