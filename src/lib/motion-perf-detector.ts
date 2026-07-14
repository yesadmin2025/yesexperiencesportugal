/**
 * motion-perf-detector.ts
 *
 * Runtime performance telemetry for premium motion surfaces
 * (route-draw animations on <EditorialMap>, `.editorial-zoom` hover
 * zoom, `.reveal` entries). Watches for the two things that visibly
 * degrade motion on mid-range devices:
 *
 *   1. Long tasks (> LONG_TASK_MS) that block the compositor during
 *      an animation window — reported via PerformanceObserver.
 *   2. Sustained frame times worse than FRAME_BUDGET_MS during the
 *      first 3 s after a `.reveal` element or `<EditorialMap>` mounts.
 *
 * Emits `[motion-perf]` warnings to the browser console. Always on in
 * dev; in production, gated behind either
 *   • `localStorage.YES_MOTION_DEBUG = "1"`
 *   • `?motionDebug=1` query flag
 *
 * A production-safe beacon can be enabled by setting
 * `window.__motionPerfBeacon = (report) => …` (opt-in only; no beacon
 * is fired by default so the detector never adds request cost).
 *
 * Zero cost when nothing observed — the IntersectionObserver only
 * measures for a bounded 3 s window per surface, then disconnects.
 */

const LONG_TASK_MS = 120; // matches "significant jank" heuristic
const FRAME_BUDGET_MS = 20; // ~50 FPS floor; below is visibly stuttery
const OBSERVE_MS = 3000;

type PerfReport = {
  kind: "long-task" | "frame-budget";
  detail: string;
  surface?: string;
  value: number;
};

declare global {
  interface Window {
    __motionPerfBeacon?: (r: PerfReport) => void;
    __motionPerfInstalled?: boolean;
  }
}

function enabled(): boolean {
  if (typeof window === "undefined") return false;
  // Dev is always on.
  if (import.meta.env?.DEV) return true;
  try {
    if (window.localStorage?.getItem("YES_MOTION_DEBUG") === "1") return true;
    if (new URLSearchParams(window.location.search).get("motionDebug") === "1") return true;
  } catch {
    /* noop */
  }
  return false;
}

function report(r: PerfReport) {
  // eslint-disable-next-line no-console
  console.warn(`[motion-perf] ${r.kind} ${r.value.toFixed(1)}ms — ${r.detail}`);
  try {
    window.__motionPerfBeacon?.(r);
  } catch {
    /* noop */
  }
}

/** Watch a single element's next OBSERVE_MS window for dropped frames. */
function watchFrames(surface: string) {
  let last = performance.now();
  const start = last;
  let worst = 0;
  let rafId = 0;
  const step = (now: number) => {
    const dt = now - last;
    last = now;
    if (dt > worst) worst = dt;
    if (dt > FRAME_BUDGET_MS * 2) {
      report({
        kind: "frame-budget",
        surface,
        value: dt,
        detail: `${surface} single-frame stall`,
      });
    }
    if (now - start < OBSERVE_MS) {
      rafId = requestAnimationFrame(step);
    } else if (worst > FRAME_BUDGET_MS) {
      // Only emit the summary if we actually crossed the budget once.
      report({
        kind: "frame-budget",
        surface,
        value: worst,
        detail: `${surface} worst frame across ${OBSERVE_MS / 1000}s window`,
      });
    }
  };
  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId);
}

export function installMotionPerfDetector(): () => void {
  if (typeof window === "undefined") return () => {};
  if (window.__motionPerfInstalled) return () => {};
  if (!enabled()) return () => {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return () => {}; // nothing to measure
  window.__motionPerfInstalled = true;

  const disposers: Array<() => void> = [];

  // 1) Long-task PerformanceObserver — fires whenever the main thread
  //    is blocked > LONG_TASK_MS. Not throttled; long tasks are rare.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const PO: any = (window as any).PerformanceObserver;
    if (PO && PO.supportedEntryTypes?.includes("longtask")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const po = new PO((list: any) => {
        for (const e of list.getEntries()) {
          if (e.duration > LONG_TASK_MS) {
            report({
              kind: "long-task",
              value: e.duration,
              detail: `main thread blocked (${(e.name as string) || "task"})`,
            });
          }
        }
      });
      po.observe({ entryTypes: ["longtask"] });
      disposers.push(() => po.disconnect());
    }
  } catch {
    /* noop */
  }

  // 2) IntersectionObserver watches for motion surfaces entering the
  //    viewport, then measures a 3 s frame window from that surface.
  //    Selectors match the canonical animated surfaces.
  const SURFACE_SELECTOR = [
    '[data-motion-surface="editorial-map"]',
    ".editorial-zoom",
    ".reveal",
  ].join(",");

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        const surface =
          el.dataset.motionSurface ??
          (el.classList.contains("reveal") ? "reveal" : "surface");
        io.unobserve(el);
        const cancel = watchFrames(surface);
        disposers.push(cancel);
      }
    },
    { threshold: 0.35 },
  );

  // Attach after first paint so we don't measure hydration itself.
  const timer = window.setTimeout(() => {
    document.querySelectorAll(SURFACE_SELECTOR).forEach((el) => io.observe(el));
  }, 400);
  disposers.push(() => {
    window.clearTimeout(timer);
    io.disconnect();
  });

  return () => {
    for (const d of disposers) d();
    window.__motionPerfInstalled = false;
  };
}
