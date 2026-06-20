import { createFileRoute } from "@tanstack/react-router";

/**
 * /api/health — dev/preview readiness probe.
 *
 * Returns a small JSON payload describing server liveness, build
 * identity, and (optionally) a client-reported readiness stage.
 *
 * Shape:
 *   {
 *     ok: true,
 *     service: "yes-experiences-portugal",
 *     ts: "2026-04-30T...",                  // server time
 *     env: "development" | "production" | ...,
 *     build: {
 *       version: string,                     // package.json version
 *       commit: string,                      // short git sha or "unknown"
 *       builtAt: string,                     // ISO build timestamp
 *       mode: "development" | "production",  // Vite mode
 *     },
 *     uptimeMs: number,                      // since module init
 *     stage: "boot" | "ssr-ready" | "hydrating" | "app-ready" | "unknown",
 *     stageDetail?: string,                  // optional free-form hint
 *   }
 *
 * Readiness stages (for diagnosing slow initialization):
 *   - boot         → Worker/SSR runtime is up, app code not yet evaluated
 *   - ssr-ready    → SSR shell rendered (server-side default once handler runs)
 *   - hydrating    → client started hydration
 *   - app-ready    → window.__APP_READY__ === true (React tree mounted)
 *
 * Clients can POST progress to this same endpoint to update the
 * server-cached stage (best effort, in-memory):
 *   fetch("/api/health", { method: "POST",
 *     body: JSON.stringify({ stage: "hydrating" }) });
 *
 * Or pass ?stage=... on a GET to echo a stage without mutating cache.
 */

// Build-time constants. Vite replaces `import.meta.env.*` and we read
// process.env at module init for values injected by the bundler.
const BUILD_VERSION =
  // @ts-expect-error - injected at build time when available
  (typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__) ||
  process.env.npm_package_version ||
  "0.0.0";

const BUILD_COMMIT =
  process.env.VITE_GIT_COMMIT ||
  process.env.GIT_COMMIT ||
  process.env.CF_PAGES_COMMIT_SHA ||
  "unknown";

const BUILD_AT = process.env.BUILD_TIMESTAMP || new Date().toISOString();
const BOOT_AT = Date.now();

type Stage = "boot" | "ssr-ready" | "hydrating" | "app-ready" | "unknown";
const VALID_STAGES: ReadonlySet<Stage> = new Set([
  "boot",
  "ssr-ready",
  "hydrating",
  "app-ready",
  "unknown",
]);

// In-memory, best-effort. Workers may recycle this between requests —
// that's fine, this is a diagnostic hint, not a source of truth.
let lastStage: Stage = "ssr-ready";
let lastStageDetail: string | undefined;
let lastStageAt: string = new Date().toISOString();

function buildPayload(stageOverride?: Stage, detailOverride?: string) {
  // Public liveness probe: do NOT leak build identity (commit / version /
  // build timestamp / NODE_ENV) to anonymous callers — that data
  // fingerprints the deployment and helps attackers map known CVEs.
  // Build identity is still embedded in source via BUILD_* constants for
  // server-side logging if needed.
  void BUILD_VERSION;
  void BUILD_COMMIT;
  void BUILD_AT;
  return {
    ok: true,
    service: "yes-experiences-portugal",
    ts: new Date().toISOString(),
    uptimeMs: Date.now() - BOOT_AT,
    stage: stageOverride ?? lastStage,
    stageDetail: detailOverride ?? lastStageDetail,
    stageAt: lastStageAt,
  };
}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function coerceStage(raw: unknown): Stage | undefined {
  if (typeof raw !== "string") return undefined;
  return VALID_STAGES.has(raw as Stage) ? (raw as Stage) : undefined;
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const stageParam = coerceStage(url.searchParams.get("stage"));
        const detailParam = url.searchParams.get("detail") ?? undefined;
        return new Response(JSON.stringify(buildPayload(stageParam, detailParam ?? undefined)), {
          status: 200,
          headers: JSON_HEADERS,
        });
      },
      POST: async ({ request }) => {
        let body: { stage?: unknown; detail?: unknown } = {};
        try {
          body = await request.json();
        } catch {
          // ignore — treat as no-op stage update
        }
        const next = coerceStage(body.stage);
        if (next) {
          lastStage = next;
          lastStageDetail = typeof body.detail === "string" ? body.detail : undefined;
          lastStageAt = new Date().toISOString();
        }
        return new Response(JSON.stringify(buildPayload()), {
          status: 200,
          headers: JSON_HEADERS,
        });
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: JSON_HEADERS }),
    },
  },
});
