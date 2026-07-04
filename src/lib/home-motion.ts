/**
 * Homepage motion controller — `data-motion` / `motion-in`.
 *
 * Single source of truth for visible scroll motion on the homepage.
 *
 * Why a new controller exists:
 *   The legacy `.reveal` / `.reveal-stagger` / `.section-enter` system
 *   technically works (telemetry confirms 45/45 visible after scroll),
 *   but on real devices the entrance animation is so subtle (12px/360ms,
 *   firing while the section is already mid-fold) that humans perceive
 *   the page as static. The user explicitly asked for ONE simple
 *   controller, with clearly visible production values, that does NOT
 *   leave content invisible if JavaScript fails.
 *
 * Contract:
 *   1. Before this controller boots, every `[data-motion]` element is
 *      visible (no opacity:0). CSS only hides them once `html.motion-ready`
 *      is set. If JS fails, content stays visible.
 *   2. After boot, we add `html.motion-ready`. CSS now hides untriggered
 *      `[data-motion]` elements at opacity:0 + translateY(22px).
 *   3. On every animation frame during scroll/resize, we check each
 *      pending element with `getBoundingClientRect()`:
 *        rect.top  < window.innerHeight * 0.88
 *        rect.bottom > 0
 *      If true, we add `motion-in` and stop tracking it.
 *   4. Elements scrolled past (rect.bottom <= 0) without triggering are
 *      also marked `motion-in` so nothing stays hidden above the fold.
 *   5. `prefers-reduced-motion: reduce` short-circuits everything: we
 *      mark every element `motion-in` immediately and never add
 *      `motion-ready`.
 *   6. Pure vertical check. No horizontal intersection. No scroll
 *      animation. No hash-sync. No autoplay. No parallax wiring.
 *
 * The controller also auto-tags legacy reveal classes
 * (`.reveal`, `.reveal-stagger`, `.section-enter`) with `data-motion` so
 * the existing component tree benefits without per-component edits.
 *
 * Returns a dispose function for React effect cleanup.
 */

export type HomeMotionTelemetry = {
  total: number;
  triggered: number;
  pending: number;
  reducedMotion: boolean;
  ready: boolean;
  active: boolean;
  /** Lightweight perf counters — populated only when the controller is active. */
  lowPower?: boolean;
  sweepCount?: number;
  sweepMsTotal?: number;
  sweepMsMax?: number;
  firstTriggerMs?: number;
  lastTriggerMs?: number;
  longtaskMsTotal?: number;
  longtaskCount?: number;
};

declare global {
  interface Window {
    __yesHomeMotion?: HomeMotionTelemetry;
  }
}

const ENTER_RATIO = 0.88; // top must be above 88% of viewport
const POLL_AFTER_INIT_MS = 1500; // belt-and-suspenders sweep window

export function startHomeMotion(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Slow-device signal — hoisted so both the stagger tuning below AND
  // the perf logger at the end can read the same value.
  type NavigatorWithHints = Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const nav = navigator as NavigatorWithHints;
  const lowPower =
    (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) ||
    (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) ||
    nav.connection?.saveData === true ||
    nav.connection?.effectiveType === "2g" ||
    nav.connection?.effectiveType === "slow-2g";

  // Debug flag — `?motionDebug=1` in the URL forces the perf summary log
  // even on fast devices, useful for on-device profiling in the field.
  const debugFlag =
    typeof window.location !== "undefined" &&
    /[?&]motionDebug=1\b/.test(window.location.search);

  // Auto-tag legacy reveal classes so the new controller is the single
  // source of truth on the homepage.
  const legacy = document.querySelectorAll<HTMLElement>(".reveal, .reveal-stagger, .section-enter");
  legacy.forEach((el) => {
    if (!el.hasAttribute("data-motion")) el.setAttribute("data-motion", "fade-up");
  });

  // Auto-tag section-level headings, eyebrows and lead paragraphs inside
  // `.home-energy` so every homepage section gains a subtle scroll-in
  // reveal without touching individual components. Skip anything already
  // wearing `data-motion` (from `.reveal-stagger` above, from explicit
  // component markup, or from a live/interactive surface). We tag by
  // proximity — the closest section/article/header — and space children
  // in staggered 90ms increments (capped) so the eye tracks a rhythm.
  const homeScope = document.querySelector<HTMLElement>(".home-energy");
  if (homeScope) {
    // Cadence — tuned so a full row of ~4 cards resolves inside ~360ms on
    // fast devices and inside ~200ms on slow devices. Uses the hoisted
    // `lowPower` signal (see top of function).
    const HEADING_STEP = lowPower ? 55 : 80;
    const HEADING_CAP = lowPower ? 200 : 300;
    const CARD_STEP = lowPower ? 70 : 100;
    const CARD_CAP = lowPower ? 260 : 400;

    const revealSelector = [
      "h2",
      "h3",
      "[data-eyebrow]",
      ".he-eyebrow",
      ".he-eyebrow-bar",
      ".lead",
      ".section-lead",
    ].join(",");

    const seenContainers = new WeakMap<HTMLElement, number>();
    const nodes = homeScope.querySelectorAll<HTMLElement>(revealSelector);
    nodes.forEach((el) => {
      if (el.hasAttribute("data-motion")) return;
      if (el.closest('[data-section="hero"], [aria-live], .sr-only')) return;

      const container =
        (el.closest("section, article, header") as HTMLElement | null) ?? homeScope;
      const idx = seenContainers.get(container) ?? 0;
      seenContainers.set(container, idx + 1);

      el.setAttribute("data-motion", "fade-up-sm");
      const delay = Math.min(idx * HEADING_STEP, HEADING_CAP);
      if (delay > 0 && !el.hasAttribute("data-motion-delay")) {
        el.setAttribute("data-motion-delay", String(delay));
      }
    });

    const cardParents = new WeakMap<HTMLElement, number>();
    const cards = homeScope.querySelectorAll<HTMLElement>(
      ".he-card-lift, .reveal-stagger[class*='rounded'], .fw-card",
    );
    cards.forEach((el) => {
      const parent = el.parentElement as HTMLElement | null;
      if (!parent) return;
      const idx = cardParents.get(parent) ?? 0;
      cardParents.set(parent, idx + 1);
      if (idx === 0) return;
      if (el.hasAttribute("data-motion-delay")) return;
      const delay = Math.min(idx * CARD_STEP, CARD_CAP);
      el.setAttribute("data-motion-delay", String(delay));
    });
  }




  const all = () => Array.from(document.querySelectorAll<HTMLElement>("[data-motion]"));

  // Reduced motion: never hide anything, mark everything triggered, exit.
  if (reduced) {
    const els = all();
    els.forEach((el) => {
      el.classList.add("motion-in");
      // Also satisfy legacy CSS selectors in case anything still keys off them.
      el.classList.add("is-visible");
    });
    window.__yesHomeMotion = {
      total: els.length,
      triggered: els.length,
      pending: 0,
      reducedMotion: true,
      ready: false,
      active: false,
    };
    return () => {};
  }

  // Activate hidden state. CSS rule `.motion-ready [data-motion]:not(.motion-in)`
  // now applies. We do this in rAF so the browser has paint-ready styles
  // before we hide anything.
  const setReady = () => {
    if (!root.classList.contains("motion-ready")) {
      root.classList.add("motion-ready");
    }
  };

  const pending = new Set<HTMLElement>(all());
  const triggered = new Set<HTMLElement>();
  const telemetry: HomeMotionTelemetry = {
    total: pending.size,
    triggered: 0,
    pending: pending.size,
    reducedMotion: false,
    ready: false,
    active: true,
  };
  window.__yesHomeMotion = telemetry;

  const trigger = (el: HTMLElement) => {
    if (triggered.has(el)) return;
    triggered.add(el);
    pending.delete(el);
    el.classList.add("motion-in");
    // Keep legacy class in sync so any CSS still keyed to it stays consistent.
    el.classList.add("is-visible");
    telemetry.triggered = triggered.size;
    telemetry.pending = pending.size;
  };

  const sweep = () => {
    if (pending.size === 0) return;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const trigLine = vh * ENTER_RATIO;
    // Snapshot first — we mutate the set inside the loop.
    const snapshot = Array.from(pending);
    for (const el of snapshot) {
      // Cheap visibility guard: skip detached nodes.
      if (!el.isConnected) {
        pending.delete(el);
        continue;
      }
      const rect = el.getBoundingClientRect();
      // Above the fold (already scrolled past) → reveal so nothing stays hidden.
      if (rect.bottom <= 0) {
        trigger(el);
        continue;
      }
      // Inside the entry zone.
      if (rect.top < trigLine && rect.bottom > 0) {
        trigger(el);
      }
    }
  };

  let rafId = 0;
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    rafId = window.requestAnimationFrame(() => {
      scheduled = false;
      sweep();
    });
  };

  // Wire ready + initial sweep on the next frame so initial layout is settled.
  const bootRaf = window.requestAnimationFrame(() => {
    setReady();
    telemetry.ready = true;
    // Re-collect in case more elements mounted after first paint.
    const fresh = all();
    fresh.forEach((el) => {
      if (!triggered.has(el)) pending.add(el);
    });
    telemetry.total = pending.size + triggered.size;
    sweep();
  });

  // Re-scan periodically during the early-mount window to catch elements
  // that mount lazily after the initial frame (e.g. Trustmary, images).
  const pollEnd = Date.now() + POLL_AFTER_INIT_MS;
  let pollId = 0;
  const poll = () => {
    const fresh = all();
    fresh.forEach((el) => {
      if (!triggered.has(el)) pending.add(el);
    });
    telemetry.total = pending.size + triggered.size;
    sweep();
    if (Date.now() < pollEnd) {
      pollId = window.setTimeout(poll, 200);
    }
  };
  pollId = window.setTimeout(poll, 200);

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  // Some mobile browsers fire orientationchange without resize.
  window.addEventListener("orientationchange", schedule, { passive: true });
  // Also schedule on load — webfonts/images can shift layout enough to bring
  // an element into the entry zone after first paint.
  window.addEventListener("load", schedule, { passive: true });

  return () => {
    window.cancelAnimationFrame(bootRaf);
    window.cancelAnimationFrame(rafId);
    window.clearTimeout(pollId);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("orientationchange", schedule);
    window.removeEventListener("load", schedule);
    telemetry.active = false;
  };
}
