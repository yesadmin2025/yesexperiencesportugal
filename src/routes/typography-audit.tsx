import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/typography-audit")({
  head: () => ({
    meta: [
      { title: "Typography Audit — YES experiences" },
      {
        name: "description",
        content:
          "Per-route audit of which webfonts each typography token resolves to in the live DOM.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TypographyAuditPage,
});

// ─── Routes to audit ──────────────────────────────────────────────
// Keep this aligned with the public sitemap; debug-only routes excluded.
const ROUTES = [
  "/",
  "/about",
  "/experiences",
  "/builder",
  "/proposals",
  "/contact",
  "/corporate",
  "/day-tours",
  "/multi-day",
  "/local-stories",
];

// ─── Tokens we sample on each route ───────────────────────────────
// `expected` = the family name that MUST appear first in the resolved
// font-family stack. Anything else means a fallback rendered.
type Token = {
  key: string;
  label: string;
  selector: string;
  expectedFamily: string;
  thresholds: { minPx?: number; minLh?: number; minContrast?: number };
};

const TOKENS: Token[] = [
  {
    key: "h1",
    label: "H1 — display",
    selector: "h1",
    expectedFamily: "Cormorant Garamond",
    thresholds: { minPx: 24, minLh: 1.0, minContrast: 3.0 /* large text */ },
  },
  {
    key: "h2",
    label: "H2 — section",
    selector: "h2",
    expectedFamily: "Cormorant Garamond",
    thresholds: { minPx: 20, minLh: 1.0, minContrast: 3.0 },
  },
  {
    key: "h3",
    label: "H3 — sub-section",
    selector: "h3",
    expectedFamily: "Cormorant Garamond",
    thresholds: { minPx: 18, minLh: 1.0, minContrast: 4.5 },
  },
  {
    key: "body",
    label: "Body — paragraph",
    selector: "p",
    expectedFamily: "Inter",
    thresholds: { minPx: 14, minLh: 1.5, minContrast: 4.5 },
  },
  {
    key: "button",
    label: "Button / CTA",
    selector: "button, .hero-cta-button, a[role='button']",
    expectedFamily: "Inter",
    thresholds: { minPx: 12, minLh: 1.2, minContrast: 4.5 },
  },
  {
    key: "eyebrow",
    label: "Eyebrow caps",
    selector: ".eyebrow",
    expectedFamily: "Inter",
    thresholds: { minPx: 11, minLh: 1.2, minContrast: 4.5 },
  },
  {
    key: "script",
    label: "Script accent",
    selector: ".script",
    expectedFamily: "Kaushan Script",
    thresholds: { minPx: 12, minLh: 1.0, minContrast: 4.5 },
  },
];

// ─── Color helpers (sRGB → relative luminance → WCAG ratio) ───────
const parseColor = (raw: string): [number, number, number] | null => {
  const m = raw.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1]
    .split(/[ ,/]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(parseFloat);
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  return [parts[0], parts[1], parts[2]];
};
const luminance = (rgb: [number, number, number]) => {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number | null => {
  const ra = parseColor(a),
    rb = parseColor(b);
  if (!ra || !rb) return null;
  const la = luminance(ra),
    lb = luminance(rb);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};
const rgbToHex = (raw: string) => {
  const rgb = parseColor(raw);
  if (!rgb) return raw;
  return "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
};

// ─── Per-token sample ─────────────────────────────────────────────
type Sample = {
  token: Token;
  found: boolean;
  count: number;
  fontFamily: string;
  resolvedFirst: string;
  expectedMatched: boolean;
  fontPx: number;
  lineHeight: number;
  fontWeight: string;
  fg: string;
  bg: string;
  contrast: number | null;
  issues: string[];
};

// Sample the FIRST visible element matching the selector inside doc.
// "Visible" = has non-zero box and is not display:none / visibility:hidden.
const sampleToken = (doc: Document, win: Window, t: Token): Sample => {
  const all = [...doc.querySelectorAll<HTMLElement>(t.selector)];
  const visible = all.filter((el) => {
    const cs = win.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  const el = visible[0] ?? all[0];
  if (!el) {
    return {
      token: t,
      found: false,
      count: 0,
      fontFamily: "—",
      resolvedFirst: "—",
      expectedMatched: false,
      fontPx: 0,
      lineHeight: 0,
      fontWeight: "—",
      fg: "—",
      bg: "—",
      contrast: null,
      issues: ["element not present on this route"],
    };
  }
  const cs = win.getComputedStyle(el);
  const ff = cs.fontFamily;
  // First family in the stack — strip quotes
  const first = (ff.split(",")[0] || "").replace(/['"]/g, "").trim();
  const expectedMatched = first.toLowerCase() === t.expectedFamily.toLowerCase();

  const fontPx = parseFloat(cs.fontSize) || 0;
  const lhRaw = cs.lineHeight;
  const lh =
    lhRaw === "normal"
      ? 1.2
      : lhRaw.endsWith("px")
        ? parseFloat(lhRaw) / fontPx
        : parseFloat(lhRaw);

  // Walk up to first non-transparent background
  let bgRaw = "rgba(0, 0, 0, 0)";
  let p: HTMLElement | null = el;
  while (p && p !== doc.documentElement) {
    const b = win.getComputedStyle(p).backgroundColor;
    if (b && !/rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(b) && b !== "transparent") {
      bgRaw = b;
      break;
    }
    p = p.parentElement;
  }
  if (/rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bgRaw))
    bgRaw = win.getComputedStyle(doc.body).backgroundColor || "rgb(255,255,255)";
  const fgRaw = cs.color;
  const ratio = contrast(fgRaw, bgRaw);

  const issues: string[] = [];
  if (!expectedMatched)
    issues.push(`font fallback — got "${first}", expected "${t.expectedFamily}"`);
  if (t.thresholds.minPx && fontPx < t.thresholds.minPx)
    issues.push(`font-size ${fontPx}px < ${t.thresholds.minPx}px`);
  if (t.thresholds.minLh && lh < t.thresholds.minLh)
    issues.push(`line-height ${lh.toFixed(2)} < ${t.thresholds.minLh}`);
  if (t.thresholds.minContrast && ratio != null && ratio < t.thresholds.minContrast) {
    issues.push(`contrast ${ratio.toFixed(2)}:1 < ${t.thresholds.minContrast}:1`);
  }
  return {
    token: t,
    found: true,
    count: visible.length || all.length,
    fontFamily: ff,
    resolvedFirst: first,
    expectedMatched,
    fontPx,
    lineHeight: lh,
    fontWeight: cs.fontWeight,
    fg: rgbToHex(fgRaw),
    bg: rgbToHex(bgRaw),
    contrast: ratio,
    issues,
  };
};

// ─── Per-route audit (loads route in hidden iframe with retry + SSR fallback) ──
type AuditVia = "iframe" | "ssr-fallback";
type RouteResult = {
  path: string;
  status: "pending" | "loading" | "done" | "error";
  samples: Sample[];
  error?: string;
  attempts?: number; // total attempts taken (1–3)
  via?: AuditVia; // which path produced the final samples
  attemptLog?: string[]; // per-attempt failure reasons (visible in UI)
};

// Sample a route once via the shared iframe with a hard timeout.
// Returns { ok: true, samples } or { ok: false, error }.
type AttemptResult = { ok: true; samples: Sample[] } | { ok: false; error: string };

type SampleOpts = { fontsReadyCapMs: number; postLoadSettleMs: number };

const sampleViaIframe = (
  iframe: HTMLIFrameElement,
  path: string,
  timeoutMs: number,
  ssrFallback: boolean,
  opts: SampleOpts,
): Promise<AttemptResult> =>
  new Promise((resolve) => {
    let settled = false;
    const settle = (r: AttemptResult) => {
      if (settled) return;
      settled = true;
      iframe.removeEventListener("load", onLoad);
      clearTimeout(timer);
      resolve(r);
    };
    const onLoad = async () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        if (!win || !doc)
          return settle({ ok: false, error: "iframe blocked (cross-origin or sandbox)" });

        // Wait for webfonts so we sample the LOADED font, not fallback.
        // Race against a soft cap so a stuck font.ready doesn't eat the budget.
        if (doc.fonts && (doc.fonts as FontFaceSet & { ready?: Promise<unknown> }).ready) {
          await Promise.race([
            doc.fonts.ready.catch(() => undefined),
            new Promise((r) => setTimeout(r, opts.fontsReadyCapMs)),
          ]);
        }
        // Let async hero hooks (parallax, scroll-scale, hydration) settle.
        await new Promise((r) => setTimeout(r, opts.postLoadSettleMs));
        const samples = TOKENS.map((t) => sampleToken(doc, win, t));

        // Sanity guard: if EVERY token is "not present", treat as a failed render
        // (likely a hydration crash or a stripped-down SSR shell that lost layout).
        const anyFound = samples.some((s) => s.found);
        if (!anyFound)
          return settle({
            ok: false,
            error: "no tokens found in document — likely hydration failure",
          });
        settle({ ok: true, samples });
      } catch (e) {
        settle({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    };
    iframe.addEventListener("load", onLoad);

    if (ssrFallback) {
      // Load via srcdoc so the iframe contains the SSR HTML even if the runtime would crash.
      fetch(`${path}${path.includes("?") ? "&" : "?"}__audit=${Date.now()}`, {
        credentials: "same-origin",
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`SSR fetch ${res.status}`);
          const html = await res.text();
          // Inject a <base> so relative asset URLs resolve and a no-script marker
          // so we can tell this was the fallback path.
          const withBase = html.replace(
            /<head([^>]*)>/i,
            `<head$1><base href="${location.origin}/"><meta name="x-audit-via" content="ssr-fallback">`,
          );
          iframe.srcdoc = withBase;
        })
        .catch((err) =>
          settle({
            ok: false,
            error: `SSR fetch failed: ${err instanceof Error ? err.message : String(err)}`,
          }),
        );
    } else {
      // Cache-bust so the iframe re-renders fresh on every attempt.
      iframe.removeAttribute("srcdoc");
      iframe.src = `${path}${path.includes("?") ? "&" : "?"}__audit=${Date.now()}`;
    }

    const timer = setTimeout(
      () => settle({ ok: false, error: `timeout after ${Math.round(timeoutMs / 1000)}s` }),
      timeoutMs,
    );
  });

// ─── Settings (persisted to localStorage) ─────────────────────────
type StageSettings = { enabled: boolean; timeoutMs: number; backoffMs: number };
type AuditSettings = {
  iframeAttempt1: StageSettings;
  iframeAttempt2: StageSettings;
  ssrFallback: StageSettings;
  fontsReadyCapMs: number; // max time to wait for document.fonts.ready
  postLoadSettleMs: number; // delay after load before sampling (lets hydration finish)
};

const DEFAULT_SETTINGS: AuditSettings = {
  iframeAttempt1: { enabled: true, timeoutMs: 8000, backoffMs: 0 },
  iframeAttempt2: { enabled: true, timeoutMs: 12000, backoffMs: 600 },
  ssrFallback: { enabled: true, timeoutMs: 8000, backoffMs: 400 },
  fontsReadyCapMs: 3000,
  postLoadSettleMs: 250,
};

const SETTINGS_KEY = "yes:typography-audit:settings:v1";

const loadSettings = (): AuditSettings => {
  if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AuditSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      iframeAttempt1: { ...DEFAULT_SETTINGS.iframeAttempt1, ...(parsed.iframeAttempt1 || {}) },
      iframeAttempt2: { ...DEFAULT_SETTINGS.iframeAttempt2, ...(parsed.iframeAttempt2 || {}) },
      ssrFallback: { ...DEFAULT_SETTINGS.ssrFallback, ...(parsed.ssrFallback || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const persistSettings = (s: AuditSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* quota/private mode */
  }
};

// Coerce an unknown value into a safe StageSettings, clamped to UI ranges.
const coerceStage = (raw: unknown, fallback: StageSettings): StageSettings => {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown, fb: number, min: number, max: number) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return fb;
    return Math.min(max, Math.max(min, Math.round(n)));
  };
  return {
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : fallback.enabled,
    timeoutMs: num(obj.timeoutMs, fallback.timeoutMs, 500, 60000),
    backoffMs: num(obj.backoffMs, fallback.backoffMs, 0, 5000),
  };
};

// ─── Validation & parsing ────────────────────────────────────────
// Numeric ranges accepted by the SettingsPanel UI. Kept in one place so
// validation and coercion can't drift apart.
type FieldRange = { min: number; max: number };
const FIELD_RANGES = {
  stageTimeoutMs: { min: 500, max: 60000 } satisfies FieldRange,
  stageBackoffMs: { min: 0, max: 5000 } satisfies FieldRange,
  fontsReadyCapMs: { min: 0, max: 30000 } satisfies FieldRange,
  postLoadSettleMs: { min: 0, max: 10000 } satisfies FieldRange,
} as const;

type ValidationIssue = {
  level: "error" | "warning" | "info";
  path: string; // dotted path, e.g. "iframeAttempt1.timeoutMs"
  message: string;
};

type ValidationReport = {
  ok: boolean; // no errors (warnings allowed)
  shape: "envelope" | "bare" | "invalid";
  exportedAt?: string;
  issues: ValidationIssue[];
  parsed: AuditSettings | null; // clamped result if parseable, else null
};

const STAGE_KEYS: StageKey[] = ["iframeAttempt1", "iframeAttempt2", "ssrFallback"];

// Validate a JSON string thoroughly. Always returns a report — never throws.
// Used by both the regular Import (apply parsed) and Validate-only (report only).
const validateSettingsJson = (text: string): ValidationReport => {
  const issues: ValidationIssue[] = [];
  const err = (path: string, message: string) => issues.push({ level: "error", path, message });
  const warn = (path: string, message: string) => issues.push({ level: "warning", path, message });
  const info = (path: string, message: string) => issues.push({ level: "info", path, message });

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    err("$", `Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`);
    return { ok: false, shape: "invalid", issues, parsed: null };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    err("$", "Top-level value must be a JSON object.");
    return { ok: false, shape: "invalid", issues, parsed: null };
  }
  const root = data as Record<string, unknown>;

  let shape: "envelope" | "bare" = "bare";
  let candidate: Record<string, unknown> = root;
  let exportedAt: string | undefined;
  if (root.settings && typeof root.settings === "object" && !Array.isArray(root.settings)) {
    shape = "envelope";
    candidate = root.settings as Record<string, unknown>;
    if (typeof root.exportedAt === "string") exportedAt = root.exportedAt;
    if (root.version !== undefined && root.version !== 1) {
      warn("version", `Unknown export version "${String(root.version)}" — proceeding anyway.`);
    }
  } else {
    info("$", "No `settings` envelope detected — treating top-level object as raw settings.");
  }

  const hasAnyStage = STAGE_KEYS.some((k) => candidate[k] && typeof candidate[k] === "object");
  if (!hasAnyStage) {
    err("settings", "Missing stage settings (iframeAttempt1 / iframeAttempt2 / ssrFallback).");
    return { ok: false, shape, exportedAt, issues, parsed: null };
  }

  const checkNum = (path: string, raw: unknown, fb: number, range: FieldRange): number => {
    if (raw === undefined) {
      warn(path, `Missing — will fall back to default (${fb}).`);
      return fb;
    }
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) {
      err(path, `Expected a finite number, got ${JSON.stringify(raw)}. Falling back to ${fb}.`);
      return fb;
    }
    if (typeof raw !== "number") {
      warn(path, `Value was a string ${JSON.stringify(raw)} — coerced to number ${n}.`);
    }
    if (n < range.min) {
      warn(path, `Below minimum (${n} < ${range.min}) — would clamp to ${range.min}.`);
      return range.min;
    }
    if (n > range.max) {
      warn(path, `Above maximum (${n} > ${range.max}) — would clamp to ${range.max}.`);
      return range.max;
    }
    if (!Number.isInteger(n)) {
      warn(path, `Non-integer value (${n}) — would round to ${Math.round(n)}.`);
      return Math.round(n);
    }
    return n;
  };

  const checkStage = (key: StageKey, fallback: StageSettings): StageSettings => {
    const raw = candidate[key];
    if (!raw || typeof raw !== "object") {
      err(key, `Missing or not an object — using defaults.`);
      return fallback;
    }
    const obj = raw as Record<string, unknown>;
    let enabled = fallback.enabled;
    if (obj.enabled === undefined) {
      warn(`${key}.enabled`, `Missing — defaulting to ${fallback.enabled}.`);
    } else if (typeof obj.enabled !== "boolean") {
      err(
        `${key}.enabled`,
        `Expected boolean, got ${JSON.stringify(obj.enabled)}. Defaulting to ${fallback.enabled}.`,
      );
    } else {
      enabled = obj.enabled;
    }
    const timeoutMs = checkNum(
      `${key}.timeoutMs`,
      obj.timeoutMs,
      fallback.timeoutMs,
      FIELD_RANGES.stageTimeoutMs,
    );
    const backoffMs = checkNum(
      `${key}.backoffMs`,
      obj.backoffMs,
      fallback.backoffMs,
      FIELD_RANGES.stageBackoffMs,
    );
    return { enabled, timeoutMs, backoffMs };
  };

  const parsed: AuditSettings = {
    iframeAttempt1: checkStage("iframeAttempt1", DEFAULT_SETTINGS.iframeAttempt1),
    iframeAttempt2: checkStage("iframeAttempt2", DEFAULT_SETTINGS.iframeAttempt2),
    ssrFallback: checkStage("ssrFallback", DEFAULT_SETTINGS.ssrFallback),
    fontsReadyCapMs: checkNum(
      "fontsReadyCapMs",
      candidate.fontsReadyCapMs,
      DEFAULT_SETTINGS.fontsReadyCapMs,
      FIELD_RANGES.fontsReadyCapMs,
    ),
    postLoadSettleMs: checkNum(
      "postLoadSettleMs",
      candidate.postLoadSettleMs,
      DEFAULT_SETTINGS.postLoadSettleMs,
      FIELD_RANGES.postLoadSettleMs,
    ),
  };

  if (!STAGE_KEYS.some((k) => parsed[k].enabled)) {
    warn("settings", "All stages are disabled — every route would be skipped at runtime.");
  }

  // Surface unknown fields so authors notice typos.
  const knownTop = new Set<string>([...STAGE_KEYS, "fontsReadyCapMs", "postLoadSettleMs"]);
  for (const k of Object.keys(candidate)) {
    if (!knownTop.has(k)) info(k, `Unknown field — will be ignored.`);
  }

  const ok = !issues.some((i) => i.level === "error");
  return { ok, shape, exportedAt, issues, parsed };
};

// Throwing wrapper kept for any future callers that prefer exceptions.
const parseSettingsJson = (text: string): AuditSettings => {
  const report = validateSettingsJson(text);
  if (!report.ok || !report.parsed) {
    const firstErr = report.issues.find((i) => i.level === "error");
    throw new Error(firstErr ? `${firstErr.path}: ${firstErr.message}` : "Invalid settings file.");
  }
  return report.parsed;
};

// Validate the in-memory settings object the panel is currently holding.
// Reuses the same range/sanity rules as `validateSettingsJson` so the user
// gets a consistent report whether they're checking a file or the live state.
const validateCurrentSettings = (s: AuditSettings): ValidationReport => {
  const issues: ValidationIssue[] = [];
  const warn = (path: string, message: string) => issues.push({ level: "warning", path, message });
  const err = (path: string, message: string) => issues.push({ level: "error", path, message });
  const info = (path: string, message: string) => issues.push({ level: "info", path, message });

  const checkNum = (path: string, v: number, range: FieldRange) => {
    if (!Number.isFinite(v)) err(path, `Not a finite number (${String(v)}).`);
    else if (v < range.min) err(path, `Below minimum (${v} < ${range.min}).`);
    else if (v > range.max) err(path, `Above maximum (${v} > ${range.max}).`);
    else if (!Number.isInteger(v))
      warn(path, `Non-integer value (${v}) — will be rounded on save.`);
  };

  for (const key of STAGE_KEYS) {
    const stage = s[key];
    checkNum(`${key}.timeoutMs`, stage.timeoutMs, FIELD_RANGES.stageTimeoutMs);
    checkNum(`${key}.backoffMs`, stage.backoffMs, FIELD_RANGES.stageBackoffMs);
    if (stage.enabled && stage.timeoutMs < 1000) {
      warn(
        `${key}.timeoutMs`,
        `Very short timeout (${stage.timeoutMs}ms) — slow routes may fail this stage.`,
      );
    }
  }
  checkNum("fontsReadyCapMs", s.fontsReadyCapMs, FIELD_RANGES.fontsReadyCapMs);
  checkNum("postLoadSettleMs", s.postLoadSettleMs, FIELD_RANGES.postLoadSettleMs);

  const enabled = STAGE_KEYS.filter((k) => s[k].enabled);
  if (enabled.length === 0) {
    err("settings", "All stages are disabled — every route will be skipped at runtime.");
  } else if (enabled.length === 1) {
    warn("settings", `Only "${enabled[0]}" is enabled — no fallback if it times out.`);
  }

  const worstCaseMs = STAGE_KEYS.reduce(
    (sum, k) => sum + (s[k].enabled ? s[k].timeoutMs + s[k].backoffMs : 0),
    0,
  );
  info(
    "settings",
    `Worst-case budget per route: ${(worstCaseMs / 1000).toFixed(1)}s across ${enabled.length} stage${enabled.length === 1 ? "" : "s"}.`,
  );
  if (worstCaseMs > 30000) {
    warn(
      "settings",
      `Worst-case per-route budget is high (${(worstCaseMs / 1000).toFixed(1)}s) — full audits will be slow.`,
    );
  }

  if (s.fontsReadyCapMs > 0 && s.fontsReadyCapMs < 500) {
    warn(
      "fontsReadyCapMs",
      `Very short font-ready cap (${s.fontsReadyCapMs}ms) may sample before web fonts load.`,
    );
  }

  const ok = !issues.some((i) => i.level === "error");
  return { ok, shape: "bare", issues, parsed: s };
};

// Build a corrected AuditSettings from a (possibly broken) source: clamp every
// numeric field into its allowed range, round non-integers, fall back to
// defaults for missing/invalid values, and re-enable Stage 1 if every stage was
// disabled. Returns both the fixed settings and a human-readable list of the
// changes that were made (for transparency in the UI).
type AutoFix = { fixed: AuditSettings; changes: string[] };

const autoFixSettings = (s: AuditSettings): AutoFix => {
  const changes: string[] = [];

  const clampNum = (path: string, v: unknown, fb: number, range: FieldRange): number => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) {
      changes.push(`${path}: invalid (${String(v)}) → reset to default ${fb}`);
      return fb;
    }
    let out = n;
    if (out < range.min) {
      changes.push(`${path}: ${out} < ${range.min} → clamped to ${range.min}`);
      out = range.min;
    } else if (out > range.max) {
      changes.push(`${path}: ${out} > ${range.max} → clamped to ${range.max}`);
      out = range.max;
    }
    if (!Number.isInteger(out)) {
      const rounded = Math.round(out);
      changes.push(`${path}: ${out} → rounded to ${rounded}`);
      out = rounded;
    }
    return out;
  };

  const fixStage = (key: StageKey, fb: StageSettings): StageSettings => {
    const stage = s[key] ?? fb;
    let enabled = stage.enabled;
    if (typeof enabled !== "boolean") {
      changes.push(`${key}.enabled: invalid → reset to ${fb.enabled}`);
      enabled = fb.enabled;
    }
    return {
      enabled,
      timeoutMs: clampNum(
        `${key}.timeoutMs`,
        stage.timeoutMs,
        fb.timeoutMs,
        FIELD_RANGES.stageTimeoutMs,
      ),
      backoffMs: clampNum(
        `${key}.backoffMs`,
        stage.backoffMs,
        fb.backoffMs,
        FIELD_RANGES.stageBackoffMs,
      ),
    };
  };

  const fixed: AuditSettings = {
    iframeAttempt1: fixStage("iframeAttempt1", DEFAULT_SETTINGS.iframeAttempt1),
    iframeAttempt2: fixStage("iframeAttempt2", DEFAULT_SETTINGS.iframeAttempt2),
    ssrFallback: fixStage("ssrFallback", DEFAULT_SETTINGS.ssrFallback),
    fontsReadyCapMs: clampNum(
      "fontsReadyCapMs",
      s.fontsReadyCapMs,
      DEFAULT_SETTINGS.fontsReadyCapMs,
      FIELD_RANGES.fontsReadyCapMs,
    ),
    postLoadSettleMs: clampNum(
      "postLoadSettleMs",
      s.postLoadSettleMs,
      DEFAULT_SETTINGS.postLoadSettleMs,
      FIELD_RANGES.postLoadSettleMs,
    ),
  };

  // Cross-field repair: a fully-disabled config means the audit silently does
  // nothing. Re-enable Stage 1 so the pipeline has at least one shot.
  if (!STAGE_KEYS.some((k) => fixed[k].enabled)) {
    fixed.iframeAttempt1 = { ...fixed.iframeAttempt1, enabled: true };
    changes.push("iframeAttempt1.enabled: all stages were off → re-enabled Stage 1");
  }

  return { fixed, changes };
};

function TypographyAuditPage() {
  const [results, setResults] = useState<RouteResult[]>(() =>
    ROUTES.map((p) => ({ path: p, status: "pending", samples: [] })),
  );
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState<AuditSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Persist whenever settings change.
  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  // Hold a live ref to settings so the in-flight audit always reads the LATEST
  // values (e.g. user adjusts a timeout mid-run). Without this, useCallback
  // would close over the snapshot at audit start.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Per-route pipeline driven by settings: iframe attempt 1 → iframe attempt 2
  // → SSR HTML fallback. Disabled stages are skipped.
  const auditRoute = useCallback(async (path: string): Promise<RouteResult> => {
    const iframe = iframeRef.current;
    if (!iframe) return { path, status: "error", samples: [], error: "iframe missing" };
    const s = settingsRef.current;
    const opts: SampleOpts = {
      fontsReadyCapMs: s.fontsReadyCapMs,
      postLoadSettleMs: s.postLoadSettleMs,
    };

    const stages: Array<{ label: string; cfg: StageSettings; via: AuditVia; ssr: boolean }> = [
      { label: "iframe attempt 1", cfg: s.iframeAttempt1, via: "iframe" as AuditVia, ssr: false },
      { label: "iframe attempt 2", cfg: s.iframeAttempt2, via: "iframe" as AuditVia, ssr: false },
      {
        label: "SSR HTML fallback",
        cfg: s.ssrFallback,
        via: "ssr-fallback" as AuditVia,
        ssr: true,
      },
    ].filter((stage) => stage.cfg.enabled);

    if (stages.length === 0) {
      return {
        path,
        status: "error",
        samples: [],
        error: "all retry stages disabled in settings",
        attemptLog: [],
      };
    }

    const log: string[] = [];
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (stage.cfg.backoffMs) await new Promise((r) => setTimeout(r, stage.cfg.backoffMs));
      const r = await sampleViaIframe(iframe, path, stage.cfg.timeoutMs, stage.ssr, opts);
      if (r.ok) {
        return {
          path,
          status: "done",
          samples: r.samples,
          attempts: i + 1,
          via: stage.via,
          attemptLog: log,
        };
      }
      log.push(`${stage.label}: ${r.error}`);
    }
    return {
      path,
      status: "error",
      samples: [],
      error: `all ${stages.length} attempt${stages.length === 1 ? "" : "s"} failed`,
      attempts: stages.length,
      attemptLog: log,
    };
  }, []);

  const runAudit = useCallback(async () => {
    setRunning(true);
    setResults(ROUTES.map((p) => ({ path: p, status: "pending", samples: [] })));
    for (const path of ROUTES) {
      setResults((prev) => prev.map((r) => (r.path === path ? { ...r, status: "loading" } : r)));
      const result = await auditRoute(path);
      setResults((prev) => prev.map((r) => (r.path === path ? result : r)));
    }
    setRunning(false);
  }, [auditRoute]);

  // Auto-run on mount
  useEffect(() => {
    runAudit();
  }, [runAudit]);

  // ── Aggregate stats ──
  const stats = useMemo(() => {
    let total = 0,
      ok = 0,
      fontFallbacks = 0,
      sizeIssues = 0,
      lhIssues = 0,
      contrastIssues = 0;
    for (const r of results) {
      for (const s of r.samples) {
        if (!s.found) continue;
        total++;
        if (s.issues.length === 0) ok++;
        if (!s.expectedMatched) fontFallbacks++;
        if (s.issues.some((i) => i.startsWith("font-size"))) sizeIssues++;
        if (s.issues.some((i) => i.startsWith("line-height"))) lhIssues++;
        if (s.issues.some((i) => i.startsWith("contrast"))) contrastIssues++;
      }
    }
    return { total, ok, fontFallbacks, sizeIssues, lhIssues, contrastIssues };
  }, [results]);

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[color:var(--charcoal-deep)] font-[var(--font-sans)]">
      {/* Hidden iframe used to load each route in isolation. allow-same-origin
          is required so we can read computed styles via getComputedStyle, and
          srcdoc is used by the SSR-HTML fallback path. */}
      <iframe
        ref={iframeRef}
        title="audit-target"
        className="fixed -left-[9999px] -top-[9999px] h-[900px] w-[1280px]"
        sandbox="allow-same-origin allow-scripts allow-forms"
      />

      <header className="border-b border-[color:var(--border)] px-6 py-8 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <p className="eyebrow mb-3">Internal · Typography Audit</p>
          <h1 className="font-[var(--font-serif)] text-3xl md:text-5xl leading-[1.05]">
            Live typography audit
          </h1>
          <p className="mt-3 max-w-3xl text-sm md:text-base">
            For each route, the page below loads in a hidden iframe, waits for fonts to be ready,
            and samples
            <code className="mx-1 rounded bg-black/5 px-1 py-0.5 text-[12px]">
              getComputedStyle
            </code>
            on representative elements. A row is flagged if the resolved family doesn't match the
            expected token, or if size / line-height / contrast falls below the WCAG threshold.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runAudit}
              disabled={running}
              className="rounded-md bg-[color:var(--charcoal-deep)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition disabled:opacity-50"
            >
              {running ? "Auditing…" : "Re-run audit"}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
              className="rounded-md border border-[color:var(--border)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              {settingsOpen ? "Hide settings" : "Settings"}
            </button>
            <a
              href="/"
              className="rounded-md border border-[color:var(--border)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              ← Back to site
            </a>
          </div>
          {settingsOpen && (
            <SettingsPanel
              settings={settings}
              onChange={setSettings}
              onReset={() => setSettings(DEFAULT_SETTINGS)}
              disabled={running}
            />
          )}
        </div>
      </header>

      {/* Aggregate */}
      <section className="border-b border-[color:var(--border)] bg-white/60 px-6 py-6 md:px-10">
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-3 md:grid-cols-6">
          <Stat label="Samples taken" value={stats.total} />
          <Stat
            label="Passing"
            value={stats.ok}
            tone={stats.total && stats.ok === stats.total ? "ok" : "neutral"}
          />
          <Stat
            label="Font fallbacks"
            value={stats.fontFallbacks}
            tone={stats.fontFallbacks ? "bad" : "ok"}
          />
          <Stat
            label="Size issues"
            value={stats.sizeIssues}
            tone={stats.sizeIssues ? "warn" : "ok"}
          />
          <Stat
            label="Line-height issues"
            value={stats.lhIssues}
            tone={stats.lhIssues ? "warn" : "ok"}
          />
          <Stat
            label="Contrast issues"
            value={stats.contrastIssues}
            tone={stats.contrastIssues ? "bad" : "ok"}
          />
        </div>
      </section>

      {/* Per-route tables */}
      <main className="px-6 py-8 md:px-10">
        <div className="mx-auto max-w-[1240px] space-y-10">
          {results.map((r) => (
            <RouteSection key={r.path} result={r} />
          ))}
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "bad" | "neutral";
}) {
  const ring =
    tone === "ok"
      ? "ring-emerald-500/40 bg-emerald-50"
      : tone === "warn"
        ? "ring-amber-500/40 bg-amber-50"
        : tone === "bad"
          ? "ring-rose-500/50 bg-rose-50"
          : "ring-black/10 bg-white";
  return (
    <div className={`rounded-lg px-4 py-3 ring-1 ${ring}`}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] opacity-70">{label}</div>
    </div>
  );
}

function RouteSection({ result }: { result: RouteResult }) {
  const failing = result.samples.filter((s) => s.found && s.issues.length > 0).length;
  const passing = result.samples.filter((s) => s.found && s.issues.length === 0).length;
  const missing = result.samples.filter((s) => !s.found).length;

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <code className="rounded bg-black/5 px-2 py-1 text-sm font-semibold">{result.path}</code>
          <StatusBadge status={result.status} />
          {result.via && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                result.via === "ssr-fallback"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-zinc-100 text-zinc-700"
              }`}
              title={
                result.via === "ssr-fallback"
                  ? "Live runtime failed; sampled SSR HTML instead"
                  : "Sampled live runtime"
              }
            >
              via {result.via}
            </span>
          )}
          {result.attempts && result.attempts > 1 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-amber-800">
              {result.attempts} attempts
            </span>
          )}
        </div>
        <div className="flex gap-2 text-[11px] uppercase tracking-[0.12em]">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
            {passing} ok
          </span>
          {failing > 0 && (
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">
              {failing} flagged
            </span>
          )}
          {missing > 0 && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
              {missing} n/a
            </span>
          )}
        </div>
      </header>
      {(result.error || (result.attemptLog && result.attemptLog.length > 0)) && (
        <div
          className={`border-b px-5 py-3 text-sm ${result.error ? "border-rose-100 bg-rose-50 text-rose-800" : "border-amber-100 bg-amber-50/60 text-amber-900"}`}
        >
          {result.error && <div className="font-medium">Error: {result.error}</div>}
          {result.attemptLog && result.attemptLog.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-[12px]">
              {result.attemptLog.map((line, i) => (
                <li key={i}>↳ {line}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-left text-[11px] uppercase tracking-[0.1em] text-black/60">
            <tr>
              <th className="px-4 py-2.5">Token</th>
              <th className="px-4 py-2.5">Resolved family</th>
              <th className="px-4 py-2.5 text-right">Size</th>
              <th className="px-4 py-2.5 text-right">Line-h</th>
              <th className="px-4 py-2.5 text-right">Weight</th>
              <th className="px-4 py-2.5">Color / bg</th>
              <th className="px-4 py-2.5 text-right">Contrast</th>
              <th className="px-4 py-2.5">Issues</th>
            </tr>
          </thead>
          <tbody>
            {result.samples.map((s) => (
              <tr
                key={s.token.key}
                className={`border-b border-black/5 last:border-0 ${s.issues.length ? "bg-rose-50/40" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <div className="font-medium">{s.token.label}</div>
                  <code className="text-[11px] opacity-60">{s.token.selector}</code>
                </td>
                <td className="px-4 py-2.5">
                  {s.found ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${s.expectedMatched ? "bg-emerald-500" : "bg-rose-500"}`}
                      />
                      <span style={{ fontFamily: s.fontFamily }}>{s.resolvedFirst}</span>
                      <span className="text-[11px] opacity-50">
                        expected {s.token.expectedFamily}
                      </span>
                    </span>
                  ) : (
                    <span className="opacity-40">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {s.found ? `${s.fontPx}px` : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {s.found ? s.lineHeight.toFixed(2) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {s.found ? s.fontWeight : "—"}
                </td>
                <td className="px-4 py-2.5">
                  {s.found ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-3 w-3 rounded-sm ring-1 ring-black/10"
                        style={{ background: s.fg }}
                      />
                      <span className="text-[11px]">{s.fg}</span>
                      <span className="opacity-40">/</span>
                      <span
                        className="inline-block h-3 w-3 rounded-sm ring-1 ring-black/10"
                        style={{ background: s.bg }}
                      />
                      <span className="text-[11px]">{s.bg}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {s.contrast != null ? `${s.contrast.toFixed(2)}:1` : "—"}
                </td>
                <td className="px-4 py-2.5">
                  {s.issues.length === 0 ? (
                    <span className="text-emerald-700">✓ ok</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {s.issues.map((i, idx) => (
                        <li key={idx} className="text-[12px] text-rose-700">
                          • {i}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: RouteResult["status"] }) {
  const map = {
    pending: "bg-zinc-100 text-zinc-600",
    loading: "bg-amber-100 text-amber-800",
    done: "bg-emerald-100 text-emerald-800",
    error: "bg-rose-100 text-rose-800",
  } as const;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${map[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Settings panel ──────────────────────────────────────────────
type StageKey = "iframeAttempt1" | "iframeAttempt2" | "ssrFallback";
const STAGE_META: Array<{ key: StageKey; label: string; hint: string }> = [
  {
    key: "iframeAttempt1",
    label: "Stage 1 · iframe (fast)",
    hint: "First live render. Short timeout — fails fast on cold/slow routes so we can retry.",
  },
  {
    key: "iframeAttempt2",
    label: "Stage 2 · iframe (patient)",
    hint: "Second live render with a longer budget. Good for routes that legitimately take time to hydrate.",
  },
  {
    key: "ssrFallback",
    label: "Stage 3 · SSR HTML",
    hint: "Last resort. Fetches the SSR HTML and samples it via srcdoc — bypasses runtime crashes entirely.",
  },
];

function SettingsPanel({
  settings,
  onChange,
  onReset,
  disabled,
}: {
  settings: AuditSettings;
  onChange: (next: AuditSettings) => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  const updateStage = (key: StageKey, patch: Partial<StageSettings>) => {
    onChange({ ...settings, [key]: { ...settings[key], ...patch } });
  };
  const enabledCount = STAGE_META.filter(({ key }) => settings[key].enabled).length;
  const totalBudget = STAGE_META.reduce(
    (sum, { key }) =>
      sum + (settings[key].enabled ? settings[key].timeoutMs + settings[key].backoffMs : 0),
    0,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validateOnly, setValidateOnly] = useState(false);
  // Workflow preference: when ON, an Import will silently apply auto-fix
  // corrections instead of surfacing a report and asking for confirmation.
  // Persisted separately from AuditSettings (it's a UX preference, not a stage).
  const AUTOFIX_KEY = "yes:typography-audit:autofix-on-import:v1";
  const [autoFixOnImport, setAutoFixOnImport] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return false;
    try {
      return localStorage.getItem(AUTOFIX_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(AUTOFIX_KEY, autoFixOnImport ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [autoFixOnImport]);

  // Hold full validation report so the panel can render a structured issue list,
  // not just a single one-line message.
  const [importReport, setImportReport] = useState<{
    fileName: string;
    mode: "applied" | "validated" | "rejected" | "current";
    report: ValidationReport;
  } | null>(null);
  // Set by the "Validate, apply & publish" button after a successful run.
  // The actual publish happens in the Lovable editor — we just surface a CTA.
  // We store the settings snapshot that produced this CTA so any later edit
  // (slider, toggle, reset, import) automatically dismisses the stale banner.
  const [publishReadyFor, setPublishReadyFor] = useState<AuditSettings | null>(null);
  const publishReady = publishReadyFor !== null && publishReadyFor === settings;

  const handleImportFile = async (file: File, dryRun: boolean, autoFix: boolean) => {
    setImportReport(null);
    try {
      if (file.size > 64 * 1024) {
        setImportReport({
          fileName: file.name,
          mode: "rejected",
          report: {
            ok: false,
            shape: "invalid",
            issues: [
              {
                level: "error",
                path: "$",
                message: `File too large (${file.size} bytes > 65536).`,
              },
            ],
            parsed: null,
          },
        });
        return;
      }
      const text = await file.text();
      const report = validateSettingsJson(text);
      // Validate-only mode NEVER mutates current settings — even on a clean file.
      // (Takes precedence over auto-fix, since the user explicitly asked for a dry run.)
      if (dryRun) {
        setImportReport({ fileName: file.name, mode: "validated", report });
        return;
      }

      // Auto-fix path: as long as we got *some* parsed structure (validator
      // returns parsed=null only on totally unparseable JSON), we can mechanically
      // correct it and apply. Surface the corrections as info notes appended to
      // the report so the user always knows what changed.
      if (autoFix && report.parsed) {
        const { fixed, changes } = autoFixSettings(report.parsed);
        onChange(fixed);
        const augmented: ValidationReport = {
          ...report,
          ok: true,
          parsed: fixed,
          issues: [
            ...report.issues,
            ...changes.map(
              (c): ValidationIssue => ({
                level: "info",
                path: "auto-fix",
                message: c,
              }),
            ),
          ],
        };
        setImportReport({ fileName: file.name, mode: "applied", report: augmented });
        return;
      }

      if (report.ok && report.parsed) {
        onChange(report.parsed);
        setImportReport({ fileName: file.name, mode: "applied", report });
      } else {
        setImportReport({ fileName: file.name, mode: "rejected", report });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not read file.";
      setImportReport({
        fileName: file.name,
        mode: "rejected",
        report: {
          ok: false,
          shape: "invalid",
          issues: [{ level: "error", path: "$", message: msg }],
          parsed: null,
        },
      });
    }
  };

  // Read toggle state through refs so the input's onChange (created once per
  // render) always sees the latest values without rebinding listeners.
  const validateOnlyRef = useRef(validateOnly);
  useEffect(() => {
    validateOnlyRef.current = validateOnly;
  }, [validateOnly]);
  const autoFixOnImportRef = useRef(autoFixOnImport);
  useEffect(() => {
    autoFixOnImportRef.current = autoFixOnImport;
  }, [autoFixOnImport]);

  return (
    <div className="mt-6 rounded-xl border border-[color:var(--border)] bg-white/80 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-[var(--font-serif)] text-xl">Reliability tuning</h2>
          <p className="mt-1 text-[12px] text-black/60">
            Per-stage retry behaviour. Settings are saved to your browser and applied to the next
            audit run.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.12em]">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
            {enabledCount}/3 stages on
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
            ≤{(totalBudget / 1000).toFixed(1)}s/route worst-case
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void handleImportFile(file, validateOnlyRef.current, autoFixOnImportRef.current);
              // Reset so re-selecting the same file still fires onChange.
              e.target.value = "";
            }}
          />
          <label
            className={`flex items-center gap-1.5 rounded-md border border-[color:var(--border)] px-2.5 py-1.5 text-[11px] font-semibold normal-case tracking-normal ${disabled ? "opacity-50" : "cursor-pointer hover:bg-zinc-50"}`}
            title="When on, the next file you pick will be checked but NOT applied to your current settings."
          >
            <input
              type="checkbox"
              checked={validateOnly}
              onChange={(e) => setValidateOnly(e.target.checked)}
              disabled={disabled}
              className="h-3.5 w-3.5"
            />
            <span className="uppercase tracking-[0.12em]">Validate only</span>
          </label>
          <label
            className={`flex items-center gap-1.5 rounded-md border border-[color:var(--border)] px-2.5 py-1.5 text-[11px] font-semibold normal-case tracking-normal ${disabled || validateOnly ? "opacity-50" : "cursor-pointer hover:bg-zinc-50"}`}
            title={
              validateOnly
                ? 'Disabled while "Validate only" is on — dry-run never modifies settings.'
                : "When on, imports silently apply auto-fix corrections (clamp out-of-range, fix typos, re-enable Stage 1 if all stages were off) without prompting. Persisted across sessions."
            }
          >
            <input
              type="checkbox"
              checked={autoFixOnImport}
              onChange={(e) => setAutoFixOnImport(e.target.checked)}
              disabled={disabled || validateOnly}
              className="h-3.5 w-3.5"
            />
            <span className="uppercase tracking-[0.12em]">Auto-fix on import</span>
          </label>
          <button
            type="button"
            onClick={() => {
              setImportReport(null);
              fileInputRef.current?.click();
            }}
            disabled={disabled}
            className="rounded-md border border-[color:var(--border)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-zinc-50 disabled:opacity-50"
            title={
              validateOnly
                ? "Pick a JSON file — it will be checked and reported but not applied."
                : autoFixOnImport
                  ? "Pick a JSON file — corrections will be applied automatically."
                  : "Load reliability settings from a JSON file."
            }
          >
            {validateOnly
              ? "Validate JSON…"
              : autoFixOnImport
                ? "Import & auto-fix…"
                : "Import JSON"}
          </button>
          <button
            type="button"
            onClick={() => {
              const payload = {
                $schema: "yes:typography-audit:settings",
                version: 1,
                exportedAt: new Date().toISOString(),
                settings,
              };
              const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              const stamp = new Date().toISOString().replace(/[:.]/g, "-");
              a.href = url;
              a.download = `typography-audit-settings-${stamp}.json`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
            className="rounded-md border border-[color:var(--border)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-zinc-50"
            title="Download current reliability settings as JSON"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => {
              const report = validateCurrentSettings(settings);
              setImportReport({
                fileName: "current panel values",
                mode: "current",
                report,
              });
            }}
            className="rounded-md border border-[color:var(--border)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-zinc-50"
            title="Check the values currently in the panel against the same rules used for imports."
          >
            Validate current
          </button>
          <button
            type="button"
            onClick={() => {
              // One-click "ship it" flow:
              //   1. Validate current panel values.
              //   2. If errors exist, run autoFixSettings ONCE regardless of the
              //      "Auto-fix on import" toggle (the user explicitly asked for
              //      a fix-and-ship action by clicking this button).
              //   3. Apply the fix, re-validate, and surface a publish CTA on
              //      success. The actual publish is a Lovable editor action —
              //      we render a clear next-step banner instead of pretending
              //      the app can publish itself.
              const initial = validateCurrentSettings(settings);
              const hasErrors = initial.issues.some((i) => i.level === "error");
              let finalSettings = settings;
              let finalReport = initial;
              let autoFixNotes: string[] = [];
              if (hasErrors) {
                const { fixed, changes } = autoFixSettings(settings);
                onChange(fixed);
                finalSettings = fixed;
                finalReport = validateCurrentSettings(fixed);
                autoFixNotes = changes;
              }
              const augmented: ValidationReport = autoFixNotes.length
                ? {
                    ...finalReport,
                    issues: [
                      ...finalReport.issues,
                      ...autoFixNotes.map(
                        (c): ValidationIssue => ({
                          level: "info",
                          path: "auto-fix",
                          message: c,
                        }),
                      ),
                    ],
                  }
                : finalReport;
              setImportReport({
                fileName: hasErrors ? "current panel values · auto-fixed" : "current panel values",
                mode: "current",
                report: augmented,
              });
              // Show the publish CTA only when the post-fix report is clean
              // (no errors). Warnings are fine — the user has been informed.
              // We anchor it to the exact AuditSettings reference that was
              // applied; any subsequent edit to `settings` invalidates the CTA.
              const clean = !augmented.issues.some((i) => i.level === "error");
              setPublishReadyFor(clean ? finalSettings : null);
            }}
            disabled={disabled}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
            title="Validate the current settings, auto-fix any errors, apply the result, then offer to open the Publish dialog."
          >
            Validate, apply &amp; publish
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="rounded-md border border-[color:var(--border)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] disabled:opacity-50"
          >
            Reset to defaults
          </button>
        </div>
      </div>

      {importReport &&
        (() => {
          // Source for auto-fix: the parsed (clamped) result if available, else
          // the live settings (so "Validate current" can also auto-fix).
          const source = importReport.report.parsed ?? settings;
          const autoFix = autoFixSettings(source);
          // Only offer auto-fix when it would actually change something AND we
          // either have errors or are clearly off the happy path.
          const canAutoFix =
            autoFix.changes.length > 0 &&
            importReport.report.issues.some((i) => i.level === "error" || i.level === "warning");
          return (
            <ImportReportCard
              fileName={importReport.fileName}
              mode={importReport.mode}
              report={importReport.report}
              onApply={
                importReport.mode === "validated" &&
                importReport.report.ok &&
                importReport.report.parsed
                  ? () => {
                      onChange(importReport.report.parsed!);
                      setImportReport({ ...importReport, mode: "applied" });
                    }
                  : undefined
              }
              onAutoFix={
                canAutoFix
                  ? () => {
                      onChange(autoFix.fixed);
                      // Re-validate against the freshly applied values so the card
                      // reflects the new (hopefully clean) state.
                      setImportReport({
                        fileName: importReport.fileName,
                        mode: "applied",
                        report: validateCurrentSettings(autoFix.fixed),
                      });
                    }
                  : undefined
              }
              autoFixChanges={canAutoFix ? autoFix.changes : undefined}
              onDismiss={() => setImportReport(null)}
            />
          );
        })()}

      {publishReady && (
        <div
          role="status"
          className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-[12px] text-emerald-900"
        >
          <div className="flex flex-col">
            <span className="font-semibold">Settings applied · ready to publish</span>
            <span className="text-[11px] opacity-75">
              Frontend changes go live only after you publish. Use your editor's Publish button to
              push the updated reliability settings.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] opacity-75 md:inline">
              Desktop: Publish (top-right) · Mobile: ⋯ menu → Publish
            </span>
            <button
              type="button"
              onClick={() => setPublishReadyFor(null)}
              className="rounded-md border border-emerald-300 bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {STAGE_META.map(({ key, label, hint }) => {
          const cfg = settings[key];
          return (
            <fieldset
              key={key}
              className={`rounded-lg border p-4 transition ${cfg.enabled ? "border-[color:var(--border)] bg-white" : "border-dashed border-zinc-300 bg-zinc-50 opacity-70"}`}
            >
              <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]">
                {label}
              </legend>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={(e) => updateStage(key, { enabled: e.target.checked })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <span>Enabled</span>
              </label>
              <p className="mt-1 text-[11px] text-black/55">{hint}</p>

              <NumField
                label="Timeout"
                suffix="ms"
                value={cfg.timeoutMs}
                onChange={(v) => updateStage(key, { timeoutMs: v })}
                min={500}
                max={60000}
                step={500}
                disabled={disabled || !cfg.enabled}
              />
              <NumField
                label="Backoff before"
                suffix="ms"
                value={cfg.backoffMs}
                onChange={(v) => updateStage(key, { backoffMs: v })}
                min={0}
                max={5000}
                step={100}
                disabled={disabled || !cfg.enabled}
              />
            </fieldset>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <NumField
          label="Fonts.ready soft cap"
          suffix="ms"
          value={settings.fontsReadyCapMs}
          onChange={(v) => onChange({ ...settings, fontsReadyCapMs: v })}
          min={500}
          max={10000}
          step={250}
          disabled={disabled}
          hint="Don't wait longer than this for document.fonts.ready before sampling."
        />
        <NumField
          label="Post-load settle"
          suffix="ms"
          value={settings.postLoadSettleMs}
          onChange={(v) => onChange({ ...settings, postLoadSettleMs: v })}
          min={0}
          max={2000}
          step={50}
          disabled={disabled}
          hint="Pause after the iframe loads so hydration / parallax hooks settle before reading styles."
        />
      </div>

      {enabledCount === 0 && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          ⚠ All stages are disabled — every route will fail. Enable at least one stage.
        </p>
      )}
    </div>
  );
}

function ImportReportCard({
  fileName,
  mode,
  report,
  onApply,
  onAutoFix,
  autoFixChanges,
  onDismiss,
}: {
  fileName: string;
  mode: "applied" | "validated" | "rejected" | "current";
  report: ValidationReport;
  onApply?: () => void;
  /** Apply a one-click corrected settings object derived from this report. */
  onAutoFix?: () => void;
  /** Human-readable list of changes the auto-fix would make. */
  autoFixChanges?: string[];
  onDismiss: () => void;
}) {
  const errors = report.issues.filter((i) => i.level === "error");
  const warnings = report.issues.filter((i) => i.level === "warning");
  const infos = report.issues.filter((i) => i.level === "info");

  // Tone the banner by outcome:
  //  - applied   → green (settings updated)
  //  - validated → amber (dry-run; current settings untouched)
  //  - current   → green if clean, amber if warnings, red if errors
  //  - rejected  → red (errors blocked the import)
  const toneClass =
    mode === "applied"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : mode === "validated"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : mode === "current"
          ? errors.length
            ? "border-rose-200 bg-rose-50 text-rose-900"
            : warnings.length
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900";

  const headline =
    mode === "applied"
      ? `Imported "${fileName}"`
      : mode === "validated"
        ? report.ok
          ? `Validated "${fileName}" — no errors`
          : `Validated "${fileName}" — ${errors.length} error${errors.length === 1 ? "" : "s"}`
        : mode === "current"
          ? report.ok
            ? warnings.length
              ? `Current settings — OK with ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`
              : `Current settings — all checks passed`
            : `Current settings — ${errors.length} error${errors.length === 1 ? "" : "s"}`
          : `Rejected "${fileName}" — ${errors.length} error${errors.length === 1 ? "" : "s"}`;

  return (
    <div role="status" className={`mt-3 rounded-md border p-3 text-[12px] ${toneClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{headline}</span>
          {mode === "validated" && (
            <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
              Dry run · current settings unchanged
            </span>
          )}
          <span className="text-[11px] opacity-75">
            shape: {report.shape}
            {report.exportedAt ? ` · exported ${report.exportedAt}` : ""}
            {` · ${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}, ${infos.length} note${infos.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onApply && (
            <button
              type="button"
              onClick={onApply}
              className="rounded-md border border-current/30 bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-white"
              title="Apply the validated settings now"
            >
              Apply now
            </button>
          )}
          {onAutoFix && (
            <button
              type="button"
              onClick={onAutoFix}
              className="rounded-md border border-current/30 bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-white"
              title={`Apply ${autoFixChanges?.length ?? 0} automatic correction${(autoFixChanges?.length ?? 0) === 1 ? "" : "s"}`}
            >
              Auto-fix ({autoFixChanges?.length ?? 0})
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-current/30 bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-white"
          >
            Dismiss
          </button>
        </div>
      </div>

      {onAutoFix && autoFixChanges && autoFixChanges.length > 0 && (
        <details className="mt-2 rounded-md border border-current/20 bg-white/50 px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em]">
            Preview {autoFixChanges.length} proposed change{autoFixChanges.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 space-y-1 text-[12px]">
            {autoFixChanges.map((c, i) => (
              <li key={i} className="font-mono leading-snug">
                {c}
              </li>
            ))}
          </ul>
        </details>
      )}

      {(() => {
        // Auto-fix adjustments are stamped onto the report by the
        // "Validate, apply & publish" flow as info issues with path "auto-fix".
        // Lift them into a dedicated, collapsible section so users can scan
        // *what changed* separately from regular validation notes.
        const appliedFixes = report.issues.filter((i) => i.path === "auto-fix");
        const otherIssues = report.issues.filter((i) => i.path !== "auto-fix");
        return (
          <>
            {appliedFixes.length > 0 && (
              <details
                open
                className="mt-2 rounded-md border border-current/20 bg-white/50 px-3 py-2"
              >
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em]">
                  What changed? {appliedFixes.length} auto-fix adjustment
                  {appliedFixes.length === 1 ? "" : "s"} applied
                </summary>
                <ul className="mt-2 space-y-1 text-[12px]">
                  {appliedFixes.map((fix, i) => (
                    <li key={i} className="font-mono leading-snug">
                      {fix.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {otherIssues.length > 0 && (
              <ul className="mt-2 space-y-1">
                {otherIssues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-snug">
                    <span
                      className={`mt-0.5 inline-flex w-14 shrink-0 justify-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                        issue.level === "error"
                          ? "bg-rose-200 text-rose-900"
                          : issue.level === "warning"
                            ? "bg-amber-200 text-amber-900"
                            : "bg-zinc-200 text-zinc-800"
                      }`}
                    >
                      {issue.level}
                    </span>
                    <code className="shrink-0 rounded bg-white/70 px-1.5 py-0.5 text-[11px]">
                      {issue.path}
                    </code>
                    <span className="text-[12px]">{issue.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        );
      })()}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  hint,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`mt-3 block ${disabled ? "opacity-50" : ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/70">
        {label}
      </span>
      <span className="mt-1 flex items-center gap-2">
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 accent-[color:var(--charcoal-deep)]"
        />
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
          }}
          className="w-20 rounded border border-zinc-300 px-2 py-1 text-right text-sm tabular-nums"
        />
        {suffix && <span className="text-[11px] text-black/60">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-[11px] text-black/55">{hint}</span>}
    </label>
  );
}
