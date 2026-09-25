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
 *      `[data-motion]` elements with opacity or a horizontal editorial mask.
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
 *   6. Pure viewport check. No hash-sync or repeating decorative motion.
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
    typeof window.location !== "undefined" && /[?&]motionDebug=1\b/.test(window.location.search);

  // `.reveal`, `.reveal-stagger` and `.section-enter` are already driven by
  // SiteLayout. Do not auto-tag them here: one element must never be animated
  // by two reveal controllers at the same time.

  // Auto-tag section-level headings, eyebrows and lead paragraphs inside
  // `.home-energy` so every homepage section gains a subtle scroll-in
  // reveal without touching individual components. Skip anything already
  // wearing `data-motion` (from `.reveal-stagger` above, from explicit
  // component markup, or from a live/interactive surface). We tag by
  // proximity — the closest section/article/header — and space children
  // in staggered 90ms increments (capped) so the eye tracks a rhythm.
  // Scope root: `.home-energy` on homepage, `<main>` (or body) on marketing
  // pages that boot via `useMarketingMotion` (sets `data-motion-scope`).
  const isMarketing = document.documentElement.getAttribute("data-motion-scope") === "marketing";
  const homeScope =
    document.querySelector<HTMLElement>(".home-energy") ??
    (isMarketing ? (document.querySelector<HTMLElement>("main") ?? document.body) : null);
  if (homeScope) {
    // Cadence — tuned so a full row of ~4 cards resolves inside ~360ms on
    // fast devices and inside ~200ms on slow devices. Uses the hoisted
    // `lowPower` signal (see top of function).
    const HEADING_STEP = lowPower ? 55 : 80;
    const HEADING_CAP = lowPower ? 200 : 300;
    const CARD_STEP = lowPower ? 70 : 100;
    const CARD_CAP = lowPower ? 260 : 400;

    const revealSelector = [
      "h1",
      "h2",
      "h3",
      "[data-eyebrow]",
      ".he-eyebrow",
      ".he-eyebrow-bar",
      ".lead",
      ".section-lead",
      "section > p",
      "article > p",
    ].join(",");

    const seenContainers = new WeakMap<HTMLElement, number>();
    const nodes = homeScope.querySelectorAll<HTMLElement>(revealSelector);
    nodes.forEach((el) => {
      if (el.hasAttribute("data-motion")) return;
      if (el.closest('[data-section="hero"], [aria-live], .sr-only, form, dialog, nav, [data-motion-skip]')) return;
      if (el.closest(".reveal, .reveal-stagger, .section-enter")) return;
      if (el.parentElement?.closest("[data-motion]")) return;

      const container = (el.closest("section, article, header") as HTMLElement | null) ?? homeScope;
      const idx = seenContainers.get(container) ?? 0;
      seenContainers.set(container, idx + 1);

      el.setAttribute("data-motion", isMarketing ? "editorial-clip" : "fade-up-sm");
      const delay = Math.min(idx * HEADING_STEP, HEADING_CAP);
      if (delay > 0 && !el.hasAttribute("data-motion-delay")) {
        el.setAttribute("data-motion-delay", String(delay));
        el.style.setProperty("--motion-delay", `${delay}ms`);
      }
    });

    // Cascade: every repeated card in a row gets an increasing delay so the
    // eye tracks a rhythm instead of the whole row landing at once. Includes
    // plain `.reveal-stagger` children (the CSS reads `--motion-delay`).
    const cards = homeScope.querySelectorAll<HTMLElement>(
      ".he-card-lift, .reveal-stagger, .fw-card, .editorial-card, [data-editorial-card]",
    );
    cards.forEach((el) => {
      // Legacy reveal nodes are owned by SiteLayout. Mutating their attributes
      // during selective hydration causes React attribute mismatches.
      if (el.matches(".reveal, .reveal-stagger, .section-enter")) return;
      // Stagger timing is CSS-owned. Adding inline attributes here can race
      // React's selective hydration on long pages.
    });

    // Give public imagery and conversion groups one calm entrance. Never tag
    // interactive form surfaces or anything already governed by a parent
    // reveal, so movement stays editorial rather than busy.
    const supportingNodes = homeScope.querySelectorAll<HTMLElement>(
      [
        "section figure",
        "section picture",
        "section .editorial-card",
        "section .decision-scene",
        "section .he-card-lift",
        "section .fw-card",
        "section [data-editorial-card]",
        "section .premium-cta",
        "section .editorial-action",
        "section [data-cta-group]",
      ].join(","),
    );
    supportingNodes.forEach((el) => {
      if (el.hasAttribute("data-motion")) return;
      if (el.closest('[data-section="hero"], [aria-live], form, dialog, nav, [data-motion-skip]')) return;
      if (el.closest(".reveal, .reveal-stagger, .section-enter")) return;
      if (el.parentElement?.closest("[data-motion]")) return;
      el.setAttribute("data-motion", "card-reveal");
    });

    // Route-specific discovery grids still share a reliable semantic shape:
    // repeated list items containing a heading and a link. Tag that structure
    // once, without coupling the motion system to every card class name.
    const collections = homeScope.querySelectorAll<HTMLElement>(
      "section > ul, section > ol, section > [role='list']",
    );
    collections.forEach((collection) => {
      const discoveryCards = Array.from(collection.children).filter(
        (node): node is HTMLElement =>
          node instanceof HTMLElement &&
          Boolean(node.querySelector("h2, h3")) &&
          Boolean(node.querySelector("a[href]")) &&
          !node.closest("form, dialog, nav, [aria-live]"),
      );
      if (discoveryCards.length < 2) return;
      discoveryCards.forEach((card, idx) => {
        if (card.hasAttribute("data-motion")) return;
        if (card.closest(".reveal, .reveal-stagger, .section-enter")) return;
        if (card.parentElement?.closest("[data-motion]")) return;
        card.setAttribute("data-motion", "card-reveal");
        const delay = Math.min(idx * CARD_STEP, CARD_CAP);
        if (delay > 0) {
          card.setAttribute("data-motion-delay", String(delay));
          card.style.setProperty("--motion-delay", `${delay}ms`);
        }
      });
    });
  }

  const all = () =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-motion]:not([data-reveal-image])"));

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
  const bootMark = performance.now();
  const telemetry: HomeMotionTelemetry = {
    total: pending.size,
    triggered: 0,
    pending: pending.size,
    reducedMotion: false,
    ready: false,
    active: true,
    lowPower,
    sweepCount: 0,
    sweepMsTotal: 0,
    sweepMsMax: 0,
    longtaskMsTotal: 0,
    longtaskCount: 0,
  };
  window.__yesHomeMotion = telemetry;

  const trigger = (el: HTMLElement) => {
    if (triggered.has(el)) return;
    triggered.add(el);
    pending.delete(el);
    el.classList.add("motion-in");
    // Keep legacy class in sync so any CSS still keyed to it stays consistent.
    el.classList.add("is-visible");
    const now = performance.now() - bootMark;
    if (telemetry.firstTriggerMs === undefined) telemetry.firstTriggerMs = now;
    telemetry.lastTriggerMs = now;
    telemetry.triggered = triggered.size;
    telemetry.pending = pending.size;
  };

  const sweep = () => {
    if (pending.size === 0) return;
    const t0 = performance.now();
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
    const dt = performance.now() - t0;
    telemetry.sweepCount = (telemetry.sweepCount ?? 0) + 1;
    telemetry.sweepMsTotal = (telemetry.sweepMsTotal ?? 0) + dt;
    if (dt > (telemetry.sweepMsMax ?? 0)) telemetry.sweepMsMax = dt;
  };

  // Longtask observer — sums main-thread blocking >50ms during the
  // reveal lifecycle. Only wired if the browser exposes the API
  // (Chromium-based; Safari/Firefox no-op silently).
  let longtaskObserver: PerformanceObserver | null = null;
  try {
    const PO = window.PerformanceObserver as typeof PerformanceObserver | undefined;
    if (PO && PO.supportedEntryTypes?.includes("longtask")) {
      longtaskObserver = new PO((list) => {
        for (const entry of list.getEntries()) {
          telemetry.longtaskMsTotal = (telemetry.longtaskMsTotal ?? 0) + entry.duration;
          telemetry.longtaskCount = (telemetry.longtaskCount ?? 0) + 1;
        }
      });
      longtaskObserver.observe({ type: "longtask", buffered: true });
    }
  } catch {
    // PerformanceObserver may throw in restrictive contexts (e.g. jsdom); ignore.
  }

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
  // that mount lazily after the initial frame (e.g. lazy images).
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

  // ── Scroll scene (hero) ────────────────────────────────────────────────
  // ONE rAF loop writes CSS custom properties; CSS owns every transform.
  // `--scene-progress` runs 0 → 1 while the hero leaves the viewport and
  // drives a slow push-in (1 → 1.06) and gradual tonal shift. Copy and CTAs
  // remain geometrically fixed: the film itself is the scene movement.
  const heroSection = document.querySelector<HTMLElement>('[data-hero-cinematic="true"]');
  const heroStage = heroSection?.querySelector<HTMLElement>(".hero-story-stage") ?? null;
  let heroRaf = 0;
  let heroScheduled = false;

  const updateScene = () => {
    heroScheduled = false;
    const vh = window.innerHeight || 1;

    if (heroSection?.isConnected) {
      const rect = heroSection.getBoundingClientRect();
      if (rect.bottom > -120 && rect.top < vh) {
        const progress = Math.min(Math.max(-rect.top / Math.max(rect.height, 1), 0), 1);
        const eased = progress * progress * (3 - 2 * progress); // smoothstep
        // Do not add inline styles at the initial 0 position: React may still
        // be selectively hydrating this subtree. CSS defaults already express
        // the same values, and real scroll updates begin once progress > 0.
        if (eased > 0.001) {
          heroSection.style.setProperty("--scene-progress", eased.toFixed(3));
          heroStage?.style.setProperty("--hero-zoom", (1 + eased * 0.06).toFixed(4));
          heroStage?.style.setProperty("--hero-dim", (eased * 0.34).toFixed(3));
        }
      }
    }
  };
  const scheduleScene = () => {
    if (heroScheduled) return;
    heroScheduled = true;
    heroRaf = window.requestAnimationFrame(updateScene);
  };
  if (!reduced && heroSection) {
    scheduleScene();
    window.addEventListener("scroll", scheduleScene, { passive: true });
    window.addEventListener("resize", scheduleScene, { passive: true });
  }

  // One-shot perf summary — logs a compact single-line diagnostic ~4s
  // after boot when the device is low-power OR `?motionDebug=1` is set.
  // Silent on fast devices in production, so this is safe to ship.
  const summaryDelay = 4000;
  const summaryId = window.setTimeout(() => {
    if (!(lowPower || debugFlag)) return;
    const t = telemetry;
    // Guard console access — jsdom-in-tests provides it but keep defensive.
    if (typeof console === "undefined" || typeof console.info !== "function") return;
    const avg = t.sweepCount ? (t.sweepMsTotal! / t.sweepCount).toFixed(2) : "0";

    console.info(
      `[home-motion] ${t.triggered}/${t.total} revealed · sweeps=${t.sweepCount} ` +
        `avg=${avg}ms max=${(t.sweepMsMax ?? 0).toFixed(2)}ms · ` +
        `longtasks=${t.longtaskCount ?? 0} (${(t.longtaskMsTotal ?? 0).toFixed(0)}ms) · ` +
        `first=${t.firstTriggerMs?.toFixed(0) ?? "—"}ms last=${t.lastTriggerMs?.toFixed(0) ?? "—"}ms · ` +
        `lowPower=${lowPower}`,
    );
  }, summaryDelay);

  return () => {
    window.cancelAnimationFrame(bootRaf);
    window.cancelAnimationFrame(rafId);
    window.cancelAnimationFrame(heroRaf);
    window.clearTimeout(pollId);
    window.clearTimeout(summaryId);
    longtaskObserver?.disconnect();
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("orientationchange", schedule);
    window.removeEventListener("load", schedule);
    window.removeEventListener("scroll", scheduleScene);
    window.removeEventListener("resize", scheduleScene);
    heroStage?.style.removeProperty("--hero-zoom");
    heroStage?.style.removeProperty("--hero-dim");
    heroSection?.style.removeProperty("--scene-progress");

    telemetry.active = false;
  };
}
