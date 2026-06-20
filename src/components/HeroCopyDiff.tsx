import { useCallback, useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { HERO_COPY, HERO_COPY_VERSION } from "@/content/hero-copy";

/**
 * Hidden hero-copy diff helper.
 *
 * On mount, compares the current `HERO_COPY` JSON against a baseline
 * stored in `localStorage` under `hero-copy:baseline`. If anything
 * changed, it logs a tidy table of `{ field, before, after }` rows to
 * the console — perfect for spotting accidental copy drift in preview.
 *
 * Manual controls (exposed on `window.__heroCopy`):
 *   __heroCopy.diff()        // re-run the diff and return the rows
 *   __heroCopy.snapshot()    // current { version, copy } object
 *   __heroCopy.baseline()    // stored baseline (or null)
 *   __heroCopy.setBaseline() // overwrite the baseline with current copy
 *   __heroCopy.clear()       // remove the baseline entirely
 *
 * Renders nothing visible. Skips gracefully on the server.
 *
 * brand-audit-ignore-file — this dev-only diff visualizer uses standard
 * semantic colors (green=added, red=removed, amber=changed, gray=neutral),
 * not brand chrome. It is intentionally excluded from the brand audit.
 */

const STORAGE_KEY = "hero-copy:baseline";
const LAST_ACTION_KEY = "hero-copy:last-action";

type BaselineAction = "accepted" | "reset";

type LastBaselineAction = {
  action: BaselineAction;
  at: string; // ISO timestamp
  version: string | null; // baseline version captured (accept) or cleared (reset)
};

function readLastAction(): LastBaselineAction | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_ACTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.action === "accepted" || parsed.action === "reset") &&
      typeof parsed.at === "string"
    ) {
      return parsed as LastBaselineAction;
    }
    return null;
  } catch {
    return null;
  }
}

function writeLastAction(action: BaselineAction, version: string | null) {
  if (typeof window === "undefined") return;
  try {
    const payload: LastBaselineAction = {
      action,
      at: new Date().toISOString(),
      version,
    };
    localStorage.setItem(LAST_ACTION_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const delta = Math.max(0, Date.now() - then);
  const s = Math.floor(delta / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

type Snapshot = {
  version: string;
  copy: Record<string, string>;
};

type DiffRow = {
  field: string;
  before: string | undefined;
  after: string | undefined;
  change: "added" | "removed" | "changed";
};

function currentSnapshot(): Snapshot {
  return {
    version: HERO_COPY_VERSION,
    copy: { ...HERO_COPY },
  };
}

function readBaseline(): Snapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.version === "string" &&
      parsed.copy &&
      typeof parsed.copy === "object"
    ) {
      return parsed as Snapshot;
    }
    return null;
  } catch {
    return null;
  }
}

function writeBaseline(snapshot: Snapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / privacy mode — ignore */
  }
}

function diffSnapshots(before: Snapshot, after: Snapshot): DiffRow[] {
  const rows: DiffRow[] = [];
  const keys = new Set<string>([...Object.keys(before.copy), ...Object.keys(after.copy)]);
  for (const field of keys) {
    const b = before.copy[field];
    const a = after.copy[field];
    if (b === a) continue;
    let change: DiffRow["change"];
    if (b === undefined) change = "added";
    else if (a === undefined) change = "removed";
    else change = "changed";
    rows.push({ field, before: b, after: a, change });
  }
  return rows.sort((x, y) => x.field.localeCompare(y.field));
}

function runDiff(): DiffRow[] {
  const after = currentSnapshot();
  const before = readBaseline();

  if (!before) {
    writeBaseline(after);
    console.info(
      "%c[hero-copy] baseline stored (first run)",
      "color:#9ca3af",
      `version=${after.version}`,
    );
    return [];
  }

  if (before.version === after.version) {
    console.debug("%c[hero-copy] no changes", "color:#9ca3af", `version=${after.version}`);
    return [];
  }

  const rows = diffSnapshots(before, after);
  console.groupCollapsed(
    `%c[hero-copy] ${rows.length} field${rows.length === 1 ? "" : "s"} changed`,
    "color:#f59e0b;font-weight:bold",
    `${before.version} → ${after.version}`,
  );
  // Use console.table so before/after are easy to scan and copy.
  console.table(rows);
  console.info("Call __heroCopy.setBaseline() to accept these changes as the new baseline.");
  console.groupEnd();

  return rows;
}

declare global {
  interface Window {
    __heroCopy?: {
      diff: () => DiffRow[];
      snapshot: () => Snapshot;
      baseline: () => Snapshot | null;
      setBaseline: () => Snapshot;
      clear: () => void;
    };
  }
}

type DiffState = {
  baselineVersion: string | null;
  currentVersion: string;
  rows: DiffRow[];
  status: "no-baseline" | "no-changes" | "changed";
  ranAt: string;
};

function buildDiffState(): DiffState {
  const after = currentSnapshot();
  const before = readBaseline();
  const ranAt = new Date().toISOString();

  if (!before) {
    return {
      baselineVersion: null,
      currentVersion: after.version,
      rows: [],
      status: "no-baseline",
      ranAt,
    };
  }
  if (before.version === after.version) {
    return {
      baselineVersion: before.version,
      currentVersion: after.version,
      rows: [],
      status: "no-changes",
      ranAt,
    };
  }
  return {
    baselineVersion: before.version,
    currentVersion: after.version,
    rows: diffSnapshots(before, after),
    status: "changed",
    ranAt,
  };
}

const SR_ONLY: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Should the hidden control panel be shown? It is invisible by default;
 * reveal it with EITHER:
 *   • `?hero-debug` (or `?hero-debug=1`) on the URL, OR
 *   • `Shift + H + R` pressed together (toggles)
 *
 * The "shown" preference is remembered in sessionStorage so it survives
 * client-side navigation within the tab. Never on by default.
 */
const PANEL_VISIBILITY_KEY = "hero-copy:panel-visible";
const OUTLINES_KEY = "hero-copy:last-outlines";
/**
 * One-shot "force refresh on next route boundary" flag. Set by the
 * <HeroCopyDiffResetButton/> on the index page. The route-boundary effect
 * consumes (reads + clears) this flag and, when present, bypasses the
 * version guard so the next refresh always runs end-to-end.
 */
const FORCE_REFRESH_KEY = "hero-copy:force-refresh-next";

function armForceRefresh() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FORCE_REFRESH_KEY, "1");
  } catch {
    /* ignore */
  }
}

function consumeForceRefresh(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const armed = sessionStorage.getItem(FORCE_REFRESH_KEY) === "1";
    if (armed) sessionStorage.removeItem(FORCE_REFRESH_KEY);
    return armed;
  } catch {
    return false;
  }
}

/**
 * Decide whether the post-route-boundary refresh should run.
 *
 * Pure function — no I/O, no globals — so it can be unit tested in
 * isolation. Inputs intentionally mirror the call site:
 *
 *   • isIndex          — did we just enter the index route?
 *   • forced           — was the one-shot override armed?
 *   • baselineVersion  — version stored in localStorage (or null)
 *   • currentVersion   — HERO_COPY_VERSION at runtime
 *
 * Returns { shouldRefresh, reason } where `reason` is one of:
 *   "not-index"     → navigated away from "/", nothing to do
 *   "forced"        → reset-button override bypasses the guard
 *   "no-baseline"   → first run; nothing to compare against, refresh anyway
 *   "version-diff"  → versions differ, a meaningful diff is possible
 *   "version-match" → versions match, guard skips the refresh
 */
export type RefreshDecisionReason =
  | "not-index"
  | "forced"
  | "no-baseline"
  | "version-diff"
  | "version-match";

export type RefreshDecision = {
  shouldRefresh: boolean;
  reason: RefreshDecisionReason;
};

// eslint-disable-next-line react-refresh/only-export-components
export function evaluateRefreshDecision(input: {
  isIndex: boolean;
  forced: boolean;
  baselineVersion: string | null;
  currentVersion: string;
}): RefreshDecision {
  const { isIndex, forced, baselineVersion, currentVersion } = input;
  if (!isIndex) return { shouldRefresh: false, reason: "not-index" };
  if (forced) return { shouldRefresh: true, reason: "forced" };
  if (baselineVersion === null) return { shouldRefresh: true, reason: "no-baseline" };
  if (baselineVersion === currentVersion) return { shouldRefresh: false, reason: "version-match" };
  return { shouldRefresh: true, reason: "version-diff" };
}

function readInitialPanelVisibility(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("hero-debug")) return true;
    return sessionStorage.getItem(PANEL_VISIBILITY_KEY) === "1";
  } catch {
    return false;
  }
}

function persistPanelVisibility(next: boolean) {
  try {
    if (next) sessionStorage.setItem(PANEL_VISIBILITY_KEY, "1");
    else sessionStorage.removeItem(PANEL_VISIBILITY_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Persisted outline payload. Keyed by the baseline version it was diffed
 * against, so restoring it after a reload is safe: if the baseline has
 * since been reset/changed, the saved outlines are discarded.
 */
type PersistedOutlines = {
  baselineVersion: string;
  currentVersion: string;
  outlines: { field: string; change: DiffRow["change"] }[];
  savedAt: string;
};

function readPersistedOutlines(): PersistedOutlines | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(OUTLINES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.baselineVersion === "string" &&
      Array.isArray(parsed.outlines)
    ) {
      return parsed as PersistedOutlines;
    }
    return null;
  } catch {
    return null;
  }
}

function writePersistedOutlines(payload: PersistedOutlines) {
  try {
    sessionStorage.setItem(OUTLINES_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function clearPersistedOutlines() {
  try {
    sessionStorage.removeItem(OUTLINES_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Strip every rendered hero outline immediately. Belt-and-braces companion
 * to clearPersistedOutlines(): the outline effect's cleanup runs on the
 * next state change, but on baseline acceptance we want the visual to
 * disappear synchronously so the user sees an instant confirmation.
 */
function clearRenderedOutlines() {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll<HTMLElement>("[data-hero-diff-highlight]")
    .forEach((el) => el.removeAttribute("data-hero-diff-highlight"));
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  // Modern path — works on https + localhost.
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  // Legacy fallback for older browsers / non-secure contexts.
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function HeroCopyDiff() {
  const [state, setState] = useState<DiffState | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [lastAction, setLastAction] = useState<LastBaselineAction | null>(null);
  // Re-render the panel periodically so the relative timestamp stays fresh.
  const [, setNowTick] = useState(0);

  const refresh = useCallback(() => {
    const next = buildDiffState();
    setState(next);
    return next;
  }, []);

  const recordAction = useCallback((action: BaselineAction, version: string | null) => {
    writeLastAction(action, version);
    setLastAction(readLastAction());
  }, []);

  const resetBaseline = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    // Resetting the baseline invalidates any persisted outlines: the
    // saved "before" version no longer exists to diff against.
    clearPersistedOutlines();
    clearRenderedOutlines();
    recordAction("reset", null);
    console.info("%c[hero-copy] baseline cleared via UI", "color:#9ca3af");
    refresh();
  }, [refresh, recordAction]);

  const exportDiff = useCallback(async () => {
    const snap = buildDiffState();
    const payload = JSON.stringify(snap, null, 2);
    const ok = await copyTextToClipboard(payload);
    setCopyStatus(ok ? "ok" : "fail");
    console.info(
      ok ? "%c[hero-copy] diff JSON copied to clipboard" : "%c[hero-copy] copy to clipboard failed",
      ok ? "color:#10b981" : "color:#ef4444",
      snap,
    );
    window.setTimeout(() => setCopyStatus("idle"), 2000);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setPanelVisible(readInitialPanelVisibility());
    setLastAction(readLastAction());

    // Tick once a minute so the relative timestamp ("3m ago") stays current.
    const tickId = window.setInterval(() => setNowTick((n) => n + 1), 60_000);

    window.__heroCopy = {
      diff: () => {
        const next = refresh();
        runDiff();
        return next.rows;
      },
      snapshot: currentSnapshot,
      baseline: readBaseline,
      setBaseline: () => {
        const snap = currentSnapshot();
        writeBaseline(snap);
        // New baseline → previously persisted outlines no longer apply.
        clearPersistedOutlines();
        clearRenderedOutlines();
        recordAction("accepted", snap.version);
        console.info("%c[hero-copy] baseline updated", "color:#10b981", `version=${snap.version}`);
        refresh();
        return snap;
      },
      clear: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        clearPersistedOutlines();
        clearRenderedOutlines();
        recordAction("reset", null);
        console.info("%c[hero-copy] baseline cleared", "color:#9ca3af");
        refresh();
      },
    };

    runDiff();
    refresh();

    // Shift+H+R toggles the panel. Three keys at once = no accidental triggers.
    const pressed = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      pressed.add(e.key.toLowerCase());
      if ((e.shiftKey || pressed.has("shift")) && pressed.has("h") && pressed.has("r")) {
        setPanelVisible((v) => {
          const next = !v;
          persistPanelVisibility(next);
          return next;
        });
        pressed.clear();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.clearInterval(tickId);
    };
  }, [refresh, recordAction]);

  // ---- Outlines on changed UI elements -----------------------------------
  // When the diff reports changes, find every rendered hero element tagged
  // with `data-hero-field="<field>"` (space-separated lists supported, e.g.
  // the <h1> tagged "headlineLine1 headlineLine2") and apply a highlight
  // attribute. Outlines persist until the baseline is reset / accepted —
  // they survive a preview reload via sessionStorage.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!state) return;

    const STYLE_ID = "hero-copy-diff-highlight-style";
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        [data-hero-diff-highlight] {
          outline: 2px dashed #f59e0b !important;
          outline-offset: 4px !important;
          border-radius: 4px;
          transition: outline-color 0.2s ease;
          animation: hero-diff-pulse 1.4s ease-in-out infinite;
        }
        [data-hero-diff-highlight="added"]   { outline-color: #10b981 !important; }
        [data-hero-diff-highlight="removed"] { outline-color: #ef4444 !important; }
        [data-hero-diff-highlight="changed"] { outline-color: #f59e0b !important; }
        @keyframes hero-diff-pulse {
          0%, 100% { outline-offset: 4px; }
          50%      { outline-offset: 7px; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-hero-diff-highlight] { animation: none !important; }
        }
      `;
      document.head.appendChild(style);
    }

    // Resolve which {field → change} map we should apply. Live diff wins;
    // otherwise fall back to the persisted set IF it's still valid against
    // the current baseline (so a baseline reset implicitly clears it).
    let source: { field: string; change: DiffRow["change"] }[] = state.rows;
    let origin: "live" | "restored" = "live";
    if (source.length === 0) {
      const persisted = readPersistedOutlines();
      if (
        persisted &&
        persisted.baselineVersion === (state.baselineVersion ?? "") &&
        persisted.outlines.length > 0
      ) {
        source = persisted.outlines;
        origin = "restored";
      }
    }

    if (source.length === 0) return;

    const changedByField = new Map<string, DiffRow["change"]>();
    for (const row of source) changedByField.set(row.field, row.change);

    const tagged = document.querySelectorAll<HTMLElement>("[data-hero-field]");
    const touched: HTMLElement[] = [];
    tagged.forEach((el) => {
      const fields = (el.dataset.heroField ?? "").split(/\s+/).filter(Boolean);
      // Pick the "strongest" change for elements that map to multiple fields:
      // changed > added > removed (any of them is enough to highlight).
      let hit: DiffRow["change"] | undefined;
      for (const f of fields) {
        const c = changedByField.get(f);
        if (c) {
          if (c === "changed" || !hit) hit = c;
        }
      }
      if (hit) {
        el.setAttribute("data-hero-diff-highlight", hit);
        touched.push(el);
      }
    });

    if (touched.length === 0) return;

    // Persist on live diffs only — never re-persist a restoration, that
    // would just rewrite the same payload with a new timestamp.
    if (origin === "live" && state.baselineVersion) {
      writePersistedOutlines({
        baselineVersion: state.baselineVersion,
        currentVersion: state.currentVersion,
        outlines: source,
        savedAt: new Date().toISOString(),
      });
    }

    console.info(
      `%c[hero-copy] outlining changed UI elements (${origin})`,
      "color:#f59e0b",
      touched.map((el) => el.dataset.heroField),
    );

    return () => {
      // Strip outlines on unmount / next effect run; the next run will
      // re-apply from the latest source. We do NOT clear the persisted
      // payload here — only baseline mutations clear it.
      touched.forEach((el) => el.removeAttribute("data-hero-diff-highlight"));
    };
  }, [state]);

  // ---- Clear outlines on route entry / exit ------------------------------
  // Watch the current pathname via the router. Whenever we cross the
  // boundary into or out of "/", wipe both the persisted payload AND any
  // rendered outlines, then re-run the diff so a fresh state is computed
  // for whatever copy is now live. This guarantees that navigating away
  // from /index and back never shows stale highlights from a previous
  // session-level diff.
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const prevPathnameRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    // Skip the very first render — we don't want a "fresh visit" to wipe
    // outlines that were just restored from sessionStorage on this mount.
    if (prev === null) return;

    const wasIndex = prev === "/";
    const isIndex = pathname === "/";
    if (wasIndex === isIndex) return; // no boundary crossed

    // Detect whether there was actually anything to clear, so we don't
    // surface a toast for a no-op transition.
    const hadPersisted = readPersistedOutlines() !== null;
    const hadRendered =
      typeof document !== "undefined" &&
      document.querySelector("[data-hero-diff-highlight]") !== null;
    const hadOutlines = hadPersisted || hadRendered;

    clearPersistedOutlines();
    clearRenderedOutlines();
    console.info("%c[hero-copy] route boundary", "color:#9ca3af", {
      prev,
      next: pathname,
      hadPersisted,
      hadRendered,
      cleared: hadOutlines,
    });

    // Re-run the diff if we just landed back on the index so any genuine
    // copy change since the baseline is re-detected and (if so) freshly
    // outlined and persisted from scratch. Logged either way so you can
    // tell at a glance whether the boundary triggered a fresh diff or
    // intentionally skipped it (e.g. when navigating away from index).
    if (isIndex) {
      // One-shot override armed by the on-page reset button. When set, we
      // skip the version guard entirely and always run the refresh.
      const forced = consumeForceRefresh();

      // Version guard: a refresh only meaningfully changes anything when
      // the stored baseline version differs from the current code version.
      // If they match, the diff result is guaranteed to be "no-changes",
      // so we skip the refresh and log the guard hit instead.
      const baselineSnap = readBaseline();
      const baselineVersion = baselineSnap?.version ?? null;
      const currentVersion = HERO_COPY_VERSION;

      if (!forced && baselineVersion !== null && baselineVersion === currentVersion) {
        console.info(
          "%c[hero-copy] post-boundary diff refresh: skipped (version guard)",
          "color:#9ca3af",
          {
            prev,
            next: pathname,
            baselineVersion,
            currentVersion,
            reason: "baseline version matches current — nothing to diff",
          },
        );
      } else {
        try {
          const next = refresh();
          console.info(
            forced
              ? "%c[hero-copy] post-boundary diff refresh: ok (forced)"
              : "%c[hero-copy] post-boundary diff refresh: ok",
            "color:#10b981",
            {
              prev,
              next: pathname,
              forced,
              status: next.status,
              changed: next.rows.length,
              baselineVersion: next.baselineVersion,
              currentVersion: next.currentVersion,
            },
          );
        } catch (err) {
          console.warn("%c[hero-copy] post-boundary diff refresh: failed", "color:#ef4444", {
            prev,
            next: pathname,
            error: err,
          });
        }
      }
    } else {
      console.info("%c[hero-copy] post-boundary diff refresh: skipped", "color:#9ca3af", {
        prev,
        next: pathname,
        reason: "leaving index route",
      });
    }

    if (hadOutlines) {
      // Brief, low-noise toast. Auto-dismisses after the diff refresh has
      // had a moment to settle so the user sees it disappear once a fresh
      // diff state is in place.
      const toastId = toast(`Hero outlines cleared`, {
        description: `Route ${prev} → ${pathname}`,
        duration: 1800,
        id: "hero-copy-route-clear",
        className: "hero-copy-route-toast",
      });
      // Belt-and-braces: explicitly dismiss after the refresh tick so the
      // fade-out is tied to the diff settling, not just the static duration.
      window.setTimeout(() => toast.dismiss(toastId), 1800);
    }
  }, [pathname, refresh]);

  if (!state) return null;

  const changedFields = state.rows.map((r) => r.field).join(",");

  // ---- Per-field flags ---------------------------------------------------
  // Two layers, both rendered on the container so DevTools "find by
  // attribute" can pinpoint a single field without walking children:
  //
  //   1. data-changed-<field>="added|removed|changed"  (one per HERO_COPY key)
  //      e.g. data-changed-headline-line1="changed"
  //   2. data-changed-<category>="<comma-list of fields>"
  //      Categories group semantically related fields:
  //        title       → eyebrow, headlineLine1, headlineLine2
  //        description → subheadline, microcopy, brandLine
  //        cta         → primaryCta, secondaryCta
  //
  // Unchanged fields/categories simply omit the attribute so a CSS
  // selector like `[data-hero-copy-diff][data-changed-primary-cta]`
  // matches only when that exact thing changed.
  const FIELD_CATEGORIES: Record<string, "title" | "description" | "cta"> = {
    eyebrow: "title",
    headlineLine1: "title",
    headlineLine2: "title",
    subheadline: "description",
    microcopy: "description",
    brandLine: "description",
    primaryCta: "cta",
    secondaryCta: "cta",
  };

  const fieldFlags: Record<string, string> = {};
  const categoryHits: Record<"title" | "description" | "cta", string[]> = {
    title: [],
    description: [],
    cta: [],
  };

  // camelCase → kebab-case for clean data-* attribute names.
  const toKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

  for (const row of state.rows) {
    fieldFlags[`data-changed-${toKebab(row.field)}`] = row.change;
    const category = FIELD_CATEGORIES[row.field];
    if (category) categoryHits[category].push(row.field);
  }

  const categoryFlags: Record<string, string> = {};
  (Object.keys(categoryHits) as Array<keyof typeof categoryHits>).forEach((cat) => {
    if (categoryHits[cat].length > 0) {
      categoryFlags[`data-changed-${cat}`] = categoryHits[cat].join(",");
    }
  });

  return (
    <>
      <div
        data-hero-copy-diff=""
        data-testid="hero-copy-diff"
        data-diff-status={state.status}
        data-diff-baseline-version={state.baselineVersion ?? ""}
        data-diff-current-version={state.currentVersion}
        data-diff-changed-count={String(state.rows.length)}
        data-diff-changed-fields={changedFields}
        data-diff-changed-categories={Object.keys(categoryFlags)
          .map((k) => k.replace(/^data-changed-/, ""))
          .join(",")}
        data-diff-ran-at={state.ranAt}
        data-diff-json={JSON.stringify(state)}
        {...fieldFlags}
        {...categoryFlags}
        aria-hidden="true"
        style={SR_ONLY}
      >
        <span data-diff-summary>
          [hero-copy diff] status={state.status} changed={state.rows.length}{" "}
          {state.baselineVersion ?? "—"} → {state.currentVersion}
        </span>
        {state.rows.map((row) => (
          <span
            key={row.field}
            data-diff-row={row.field}
            data-diff-field={toKebab(row.field)}
            data-diff-category={FIELD_CATEGORIES[row.field] ?? "other"}
            data-diff-change={row.change}
            data-diff-before={row.before ?? ""}
            data-diff-after={row.after ?? ""}
          >
            {" | "}
            {row.field} ({row.change}): {JSON.stringify(row.before)} → {JSON.stringify(row.after)}
          </span>
        ))}
      </div>

      {/* Sr-only export button.
          Always present in the DOM, visually hidden from sighted users
          (no layout impact) but discoverable by:
            • Tab navigation (it's focusable and slides into view on focus)
            • Screen readers (announced as "Copy hero-copy diff JSON …")
            • Test runners via [data-testid="hero-copy-export"]
            • Console: document.querySelector('[data-testid="hero-copy-export"]').click()
       */}
      <button
        type="button"
        data-hero-copy-export=""
        data-testid="hero-copy-export"
        data-copy-status={copyStatus}
        onClick={exportDiff}
        className="hero-copy-export-btn"
        style={SR_ONLY}
      >
        {copyStatus === "ok"
          ? "Diff JSON copied"
          : copyStatus === "fail"
            ? "Copy failed — see console"
            : `Copy hero-copy diff JSON (${state.rows.length} change${
                state.rows.length === 1 ? "" : "s"
              })`}
      </button>
      <style>{`
        .hero-copy-export-btn:focus-visible,
        .hero-copy-export-btn:hover {
          position: fixed !important;
          width: auto !important;
          height: auto !important;
          clip: auto !important;
          margin: 0 !important;
          padding: 8px 12px !important;
          overflow: visible !important;
          white-space: normal !important;
          bottom: 16px !important;
          right: 16px !important;
          z-index: 2147483646 !important;
          background: #0f0f0f !important;
          color: #fafafa !important;
          border: 1px solid rgba(255,255,255,0.25) !important;
          border-radius: 6px !important;
          font: 12px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif !important;
          cursor: pointer !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
      `}</style>

      {/* Hidden control panel.
          Invisible by default. Reveal with `?hero-debug` in the URL or
          Shift+H+R. Use it to clear the baseline (and rerun the diff)
          without opening DevTools. */}
      {panelVisible ? (
        <div
          data-hero-copy-panel=""
          role="region"
          aria-label="Hero copy debug panel"
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 2147483647,
            background: "rgba(15,15,15,0.92)",
            color: "#fafafa",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 8,
            padding: "10px 12px",
            font: "12px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
            minWidth: 220,
            maxWidth: 320,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
              gap: 8,
            }}
          >
            <strong style={{ letterSpacing: "0.04em" }}>hero-copy debug</strong>
            <button
              type="button"
              onClick={() => {
                setPanelVisible(false);
                persistPanelVisibility(false);
              }}
              aria-label="Hide debug panel"
              style={{
                background: "transparent",
                color: "#fafafa",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 4,
                padding: "1px 6px",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>
            status: <code>{state.status}</code>
            <br />
            baseline: <code>{state.baselineVersion ?? "—"}</code>
            <br />
            current: <code>{state.currentVersion}</code>
            <br />
            changed: <code>{state.rows.length}</code>
          </div>
          <div
            data-last-baseline-action={lastAction?.action ?? ""}
            data-last-baseline-action-at={lastAction?.at ?? ""}
            data-last-baseline-action-version={lastAction?.version ?? ""}
            style={{
              marginBottom: 8,
              padding: "6px 8px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 11,
              lineHeight: 1.4,
            }}
          >
            <div style={{ opacity: 0.6, marginBottom: 2 }}>last action</div>
            {lastAction ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    padding: "1px 6px",
                    borderRadius: 3,
                    fontWeight: 600,
                    background: lastAction.action === "accepted" ? "#10b981" : "#dc2626",
                    color: "#fff",
                    marginRight: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    fontSize: 10,
                  }}
                >
                  {lastAction.action}
                </span>
                <code title={lastAction.at}>{formatRelativeTime(lastAction.at)}</code>
                {lastAction.version ? (
                  <>
                    {" "}
                    · v=<code>{lastAction.version}</code>
                  </>
                ) : null}
                <div style={{ opacity: 0.5, fontSize: 10, marginTop: 2 }}>
                  {new Date(lastAction.at).toLocaleString()}
                </div>
              </>
            ) : (
              <span style={{ opacity: 0.6 }}>none recorded yet</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={resetBaseline}
              data-action="reset-baseline"
              style={{
                background: "#dc2626",
                color: "#fff",
                border: 0,
                borderRadius: 4,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Reset baseline
            </button>
            <button
              type="button"
              onClick={() => {
                refresh();
                runDiff();
              }}
              data-action="rerun-diff"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 4,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Re-run diff
            </button>
            <button
              type="button"
              onClick={() => {
                const snap = currentSnapshot();
                writeBaseline(snap);
                // Accepting the current copy as the new baseline means
                // there is — by definition — nothing to highlight anymore.
                // Clear both the persisted payload AND any outline already
                // painted on the DOM so the visual disappears immediately.
                clearPersistedOutlines();
                clearRenderedOutlines();
                recordAction("accepted", snap.version);
                console.info(
                  "%c[hero-copy] baseline accepted via UI — outlines cleared",
                  "color:#10b981",
                  `version=${snap.version}`,
                );
                refresh();
              }}
              data-action="accept-current"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 4,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Accept as baseline
            </button>
            <button
              type="button"
              onClick={exportDiff}
              data-action="copy-diff"
              style={{
                background:
                  copyStatus === "ok"
                    ? "#10b981"
                    : copyStatus === "fail"
                      ? "#dc2626"
                      : "rgba(255,255,255,0.12)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 4,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              {copyStatus === "ok"
                ? "Copied ✓"
                : copyStatus === "fail"
                  ? "Copy failed"
                  : "Copy diff JSON"}
            </button>
          </div>
          <div style={{ marginTop: 8, opacity: 0.55, fontSize: 10 }}>
            Toggle: Shift+H+R · or ?hero-debug
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * On-page "Reset hero copy diff" button.
 *
 * Performs the same outline cleanup as the route-boundary effect, then
 * arms a one-shot flag (`hero-copy:force-refresh-next`) so the NEXT
 * navigation back to "/" runs a full diff refresh — even if the version
 * guard would normally skip it.
 *
 * Renders as a discreet ghost button. Drop it anywhere on the index page.
 */
export function HeroCopyDiffResetButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<"idle" | "armed">("idle");

  const onClick = useCallback(() => {
    // Synchronous cleanup: persisted payload + any rendered outlines.
    clearPersistedOutlines();
    clearRenderedOutlines();
    // Arm the override the route-boundary effect will consume on next
    // entry to "/". Stays armed across reloads within the tab session.
    armForceRefresh();
    setStatus("armed");

    toast("Hero copy diff reset", {
      description: "Persisted outlines cleared. Next navigation will force a full diff refresh.",
      duration: 2400,
      id: "hero-copy-reset",
    });

    console.info(
      "%c[hero-copy] reset button: outlines cleared & next-boundary refresh armed",
      "color:#f59e0b",
      { armedKey: "hero-copy:force-refresh-next" },
    );

    window.setTimeout(() => setStatus("idle"), 2400);
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      data-hero-copy-reset=""
      data-testid="hero-copy-reset"
      data-status={status}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-md border border-border/40 bg-background/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur transition-colors hover:border-border hover:text-foreground"
      }
    >
      {status === "armed" ? "Reset · armed ✓" : "Reset hero copy diff"}
    </button>
  );
}
