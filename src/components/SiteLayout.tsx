import { ReactNode, useEffect } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { FloatingActions } from "./FloatingActions";
import { WhatsAppFab } from "./WhatsAppFab";

import { PostHeroAnnouncer } from "./PostHeroAnnouncer";
import { QaPanel } from "./dev/QaPanel";
import { MotionQaPanel } from "./dev/MotionQaPanel";
import { installSmoothAnchorScroll } from "@/lib/smooth-anchor-scroll";
import {
  applyScrollDebugClasses,
  getScrollDebugFlags,
  reportScrollDebug,
} from "@/lib/scroll-debug";

// Reveal telemetry: tracks how every `.reveal` / `.reveal-stagger` /
// `.section-enter` element actually gets shown — by IntersectionObserver,
// by the initial mount sweep, or by the delayed (250ms) safety-net sweep.
// Helps diagnose "section stays invisible during fast mobile scroll".
// • If `pending > 0` after ~1s → IO genuinely missed an element.
// • If `sweepDelayed` is large on mobile → IO fires too late; tune
//   rootMargin/threshold.
// • If `sweepInitial` dominates → most reveals were already on-screen at
//   mount (deep-link, refresh mid-page, or fast fling before first frame).
//
// Entry-mode telemetry: every reveal is also tagged with the navigation
// entry that produced this page load — `hash` (URL had #fragment),
// `scroll-restore` (browser restored a non-zero scrollY without a hash —
// e.g. back/forward cache), or `cold` (fresh top-of-page load). This lets
// us answer: "for hash/deep-link entries, how many reveals are caught by
// sweepInitial vs IO?" — exactly the case where the IO routinely misses
// elements that are already past the fold at t=0.
//
// Counters are always collected (cheap); console logging only happens
// when ?scroll-debug is active. Inspect via `window.__yesRevealTelemetry.report()`.
type RevealSource = "io" | "sweepInitial" | "sweepDelayed";
type RevealEntry = "cold" | "hash" | "scroll-restore";
type RevealSectionTiming = {
  section: string;
  selector: string;
  source: RevealSource;
  atMs: number;
  top: number;
  bottom: number;
  viewportHeight: number;
  fold: "above" | "inside" | "below";
  durationMs: number;
  delayMs: number;
  realisticallyVisible: boolean;
  note: string;
};
type RevealBucket = {
  total: number;
  io: number;
  sweepInitial: number;
  sweepDelayed: number;
  readonly pending: number;
};
type RevealEntryBucket = {
  io: number;
  sweepInitial: number;
  sweepDelayed: number;
};
type RevealTelemetry = {
  entry: RevealEntry;
  hash: string;
  initialScrollY: number;
  reveal: RevealBucket;
  sectionEnter: RevealBucket;
  byEntry: Record<RevealEntry, { reveal: RevealEntryBucket; sectionEnter: RevealEntryBucket }>;
  /** True once any IntersectionObserver has fired at least one entry. */
  ioFired: boolean;
  /** True once the 1200ms fail-safe forced visibility on at least one element. */
  failSafeFired: boolean;
  /** True once the iframe-aware safety pass forced visibility (iframe only). */
  iframeFallbackFired: boolean;
  log: (
    bucket: "reveal" | "sectionEnter",
    source: RevealSource,
    target?: HTMLElement,
    selector?: string,
  ) => void;
  setTotal: (bucket: "reveal" | "sectionEnter", total: number) => void;
  markIoFired: () => void;
  markFailSafeFired: () => void;
  markIframeFallbackFired: () => void;
  timings: RevealSectionTiming[];
  report: () => unknown;
  reset: () => void;
};

declare global {
  interface Window {
    __yesRevealTelemetry?: RevealTelemetry;
    __yesMotionStartedAt?: number;
  }
}

function makeBucket(): RevealBucket {
  return {
    total: 0,
    io: 0,
    sweepInitial: 0,
    sweepDelayed: 0,
    get pending() {
      return Math.max(0, this.total - this.io - this.sweepInitial - this.sweepDelayed);
    },
  };
}

function makeEntryBuckets(): RevealTelemetry["byEntry"] {
  const empty = (): RevealEntryBucket => ({ io: 0, sweepInitial: 0, sweepDelayed: 0 });
  return {
    cold: { reveal: empty(), sectionEnter: empty() },
    hash: { reveal: empty(), sectionEnter: empty() },
    "scroll-restore": { reveal: empty(), sectionEnter: empty() },
  };
}

function detectEntry(win: Window): { entry: RevealEntry; hash: string; initialScrollY: number } {
  const hash = win.location.hash || "";
  const initialScrollY = win.scrollY || win.pageYOffset || 0;
  let entry: RevealEntry = "cold";
  if (hash && hash !== "#") {
    entry = "hash";
  } else if (initialScrollY > 1) {
    // Browser restored scroll position (e.g. bfcache, back/forward) without
    // a hash. We bucket this separately because it produces the same
    // "many reveals already past the fold" pattern as a hash entry.
    entry = "scroll-restore";
  }
  return { entry, hash, initialScrollY };
}

function getRevealTelemetry(): RevealTelemetry {
  if (typeof window === "undefined") {
    // SSR: return a no-op shim so call sites stay simple.
    return {
      entry: "cold",
      hash: "",
      initialScrollY: 0,
      reveal: makeBucket(),
      sectionEnter: makeBucket(),
      byEntry: makeEntryBuckets(),
      ioFired: false,
      failSafeFired: false,
      iframeFallbackFired: false,
      timings: [],
      log: () => {},
      setTotal: () => {},
      markIoFired: () => {},
      markFailSafeFired: () => {},
      markIframeFallbackFired: () => {},
      report: () => null,
      reset: () => {},
    };
  }
  if (window.__yesRevealTelemetry) return window.__yesRevealTelemetry;

  const debug = getScrollDebugFlags(window).enabled;
  const { entry, hash, initialScrollY } = detectEntry(window);
  const state: RevealTelemetry = {
    entry,
    hash,
    initialScrollY,
    reveal: makeBucket(),
    sectionEnter: makeBucket(),
    byEntry: makeEntryBuckets(),
    ioFired: false,
    failSafeFired: false,
    iframeFallbackFired: false,
    timings: [],
    log(bucket, source, target, selector) {
      const b = state[bucket];
      b[source] += 1;
      state.byEntry[state.entry][bucket][source] += 1;
      if (target) {
        const rect = target.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const cs = window.getComputedStyle(target);
        const fold = rect.bottom <= 0 ? "above" : rect.top >= viewportHeight ? "below" : "inside";
        const delayMs = parseMs(cs.transitionDelay || "0ms") + parseMs(cs.animationDelay || "0ms");
        const durationMs = Math.max(
          parseMs(cs.transitionDuration || "0ms"),
          parseMs(cs.animationDuration || "0ms"),
        );
        const atMs = Math.round(performance.now() - (window.__yesMotionStartedAt ?? 0));
        const realisticallyVisible = fold === "inside" && source === "io" && atMs >= 120;
        state.timings.push({
          section: sectionNameFor(target),
          selector: selector ?? describeReveal(target),
          source,
          atMs,
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          viewportHeight: Math.round(viewportHeight),
          fold,
          durationMs: Math.round(durationMs),
          delayMs: Math.round(delayMs),
          realisticallyVisible,
          note: realisticallyVisible
            ? "visible on scroll"
            : fold === "below"
              ? "triggered while still below fold"
              : fold === "above"
                ? "animation completed before visible"
                : source === "io"
                  ? "triggered immediately on/near first paint"
                  : "fallback/sweep path",
        });
      }
      if (debug) {
        console.debug(
          `[reveal-telemetry] ${bucket} via ${source} (entry=${state.entry})`,
          selector ?? "",
          {
            total: b.total,
            io: b.io,
            sweepInitial: b.sweepInitial,
            sweepDelayed: b.sweepDelayed,
            pending: b.pending,
          },
        );
      }
    },
    setTotal(bucket, total) {
      state[bucket].total = total;
    },
    markIoFired() {
      state.ioFired = true;
    },
    markFailSafeFired() {
      state.failSafeFired = true;
    },
    markIframeFallbackFired() {
      state.iframeFallbackFired = true;
    },
    report() {
      const snapshot = {
        entry: state.entry,
        hash: state.hash,
        initialScrollY: state.initialScrollY,
        reveal: {
          total: state.reveal.total,
          io: state.reveal.io,
          sweepInitial: state.reveal.sweepInitial,
          sweepDelayed: state.reveal.sweepDelayed,
          pending: state.reveal.pending,
        },
        sectionEnter: {
          total: state.sectionEnter.total,
          io: state.sectionEnter.io,
          sweepInitial: state.sectionEnter.sweepInitial,
          sweepDelayed: state.sectionEnter.sweepDelayed,
          pending: state.sectionEnter.pending,
        },
        byEntry: state.byEntry,
        timings: state.timings,
      };

      console.groupCollapsed(
        `[reveal-telemetry] entry=${state.entry}${state.hash ? ` ${state.hash}` : ""} y=${state.initialScrollY}`,
      );

      console.table([
        { bucket: "reveal", ...snapshot.reveal },
        { bucket: "sectionEnter", ...snapshot.sectionEnter },
      ]);
      // Per-entry breakdown highlights how hash/deep-link entries lean
      // on sweepInitial vs IO compared to a cold top-of-page load.
      const rows: Array<Record<string, unknown>> = [];
      (["cold", "hash", "scroll-restore"] as RevealEntry[]).forEach((e) => {
        rows.push({ entry: e, bucket: "reveal", ...state.byEntry[e].reveal });
        rows.push({ entry: e, bucket: "sectionEnter", ...state.byEntry[e].sectionEnter });
      });

      console.table(rows);

      console.table(state.timings);

      console.groupEnd();
      return snapshot;
    },
    reset() {
      state.reveal = makeBucket();
      state.sectionEnter = makeBucket();
      state.byEntry = makeEntryBuckets();
      state.timings = [];
    },
  };
  window.__yesRevealTelemetry = state;
  return state;
}

function describeReveal(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls =
    typeof el.className === "string"
      ? el.className
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((c) => `.${c}`)
          .join("")
      : "";
  return `${tag}${id}${cls}`;
}

function sectionNameFor(el: HTMLElement): string {
  const section = el.closest<HTMLElement>("section[id], [data-motion-section]");
  if (!section) return "unsectioned";
  const explicit = section.dataset.motionSection;
  if (explicit) return explicit;
  const id = section.id || "unsectioned";
  const names: Record<string, string> = {
    reviews: "Trust strip",
    builder: "Three Ways / Studio",
    studio: "Studio / Builder",
    "why-yes": "Why YES",
    signatures: "Signature Experiences",
    occasions: "Occasions / Groups",
    faq: "FAQ",
    "final-cta": "Final CTA / Footer",
  };
  return names[id] ?? id;
}

function parseMs(value: string): number {
  const first = value.split(",")[0]?.trim() ?? "0ms";
  if (first.endsWith("ms")) return Number.parseFloat(first) || 0;
  if (first.endsWith("s")) return (Number.parseFloat(first) || 0) * 1000;
  return Number.parseFloat(first) || 0;
}

/**
 * Visual debug flash: outlines the element in gold and pins a small
 * label badge for ~1.5s, so reveal triggers are visible on mobile
 * without needing dev tools open. Idempotent + cheap.
 */
function flashDebug(el: HTMLElement, label: string) {
  if (!el || el.dataset.revealDebugFlashed === "1") return;
  el.dataset.revealDebugFlashed = "1";
  const prevOutline = el.style.outline;
  const prevOffset = el.style.outlineOffset;
  const prevTransition = el.style.transition;
  el.style.outline = "2px dashed var(--gold)";
  el.style.outlineOffset = "2px";
  el.style.transition = (prevTransition ? prevTransition + ", " : "") + "outline-color 600ms ease";

  const badge = document.createElement("span");
  badge.textContent = label;
  badge.style.cssText = [
    "position:absolute",
    "top:0",
    "left:0",
    "z-index:99998",
    "padding:2px 6px",
    "background:color:var(--gold)",
    "color:var(--charcoal)",
    "font:700 10px/1.2 ui-monospace,monospace",
    "border-radius:0 0 4px 0",
    "pointer-events:none",
  ].join(";");
  // Position the badge over the element using a wrapper anchor.
  const rect = el.getBoundingClientRect();
  badge.style.position = "fixed";
  badge.style.top = `${Math.max(0, rect.top)}px`;
  badge.style.left = `${Math.max(0, rect.left)}px`;
  document.body.appendChild(badge);

  window.setTimeout(() => {
    el.style.outline = prevOutline;
    el.style.outlineOffset = prevOffset;
    el.style.transition = prevTransition;
    badge.remove();
  }, 1500);
}

export function SiteLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__yesMotionStartedAt = performance.now();
    const visibleTest =
      new URLSearchParams(window.location.search).get("motion-visible-test") === "1";
    document.documentElement.classList.toggle("motion-visible-test", visibleTest);
    return () => document.documentElement.classList.remove("motion-visible-test");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flags = getScrollDebugFlags();
    if (!flags.enabled) return;
    applyScrollDebugClasses(flags);
    const timer = window.setTimeout(() => reportScrollDebug(), 500);
    return () => window.clearTimeout(timer);
  }, []);

  // Reveal-telemetry entry-mode tracking: ensure the singleton exists at
  // mount (so the initial entry mode is captured before any sweep runs),
  // and flip `entry` to "hash" whenever the URL hash changes after mount.
  // This way reveals triggered by clicking an in-page anchor mid-session
  // are attributed to `hash` instead of leaking into `cold` totals.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const telemetry = getRevealTelemetry();
    const onHashChange = () => {
      telemetry.entry = "hash";
      telemetry.hash = window.location.hash || "";
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Smooth anchor scroll with navbar offset — covers every <a href="#…">
  // on every page so jumps land cleanly below the fixed header rather
  // than getting clipped under it. Reduced-motion safe.
  useEffect(() => installSmoothAnchorScroll(), []);

  // Manual replay hook: visit any URL with `#replay-reveals` (or call
  // `window.replayReveals()` from the console) to clear `.is-visible`
  // on every reveal element and let the IntersectionObserver re-fire
  // entrance animations from scratch. Useful for QA / demos.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const replay = () => {
      const sel = ".reveal, .reveal-stagger, .section-enter";
      const els = document.querySelectorAll<HTMLElement>(sel);
      els.forEach((el) => {
        el.classList.remove("is-visible");
        el.style.transitionDelay = "";
      });
      // force reflow so the next class add re-triggers the transition
      void document.body.offsetHeight;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          els.forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.top < window.innerHeight && r.bottom > 0) {
              el.classList.add("is-visible");
            }
          });

          console.info(`[replay-reveals] retriggered ${els.length} elements`);
        });
      });
    };
    (window as unknown as { replayReveals?: () => void }).replayReveals = replay;
    const onHash = () => {
      if (window.location.hash === "#replay-reveals") replay();
    };
    if (window.location.hash === "#replay-reveals") {
      // run after first paint
      requestAnimationFrame(replay);
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Reveal-on-scroll with a consistent, calm stagger rhythm.
  // Siblings sharing a parent reveal sequentially at a fixed cadence so
  // every section across the page breathes at the same pace.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = document.querySelectorAll<HTMLElement>(".reveal, .reveal-stagger");
    if (!els.length) return;

    const flags = getScrollDebugFlags();
    const isMobile = window.matchMedia("(max-width: 767.98px)").matches;
    const mobileRevealsDisabled = flags.disableMobileReveals && isMobile;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealDebug = flags.revealDebug;
    const telemetry = getRevealTelemetry();
    telemetry.setTotal("reveal", els.length);

    // prefers-reduced-motion fallback: ensure content is ALWAYS visible
    // even if any CSS/JS animation is blocked. We mark visible AND clear
    // any inline transition delay so nothing keeps content at opacity:0.
    if (mobileRevealsDisabled || typeof IntersectionObserver === "undefined" || reducedMotion) {
      els.forEach((el) => {
        el.style.transitionDelay = "0ms";
        el.classList.add("is-visible");
        if (revealDebug) flashDebug(el, "reduced-motion");
      });
      return;
    }

    // Unified cadence — small enough to feel continuous, slow enough to read.
    const STAGGER_MS = 110;
    const MAX_STEPS = 8; // cap so late items don't drift too far behind

    // Pre-assign a stagger index to every .reveal-stagger element based on
    // its position among same-class siblings under the same parent. This
    // guarantees a consistent rhythm without requiring inline delays.
    const staggerEls = document.querySelectorAll<HTMLElement>(".reveal-stagger");
    const indexByEl = new WeakMap<HTMLElement, number>();
    const groups = new Map<HTMLElement, HTMLElement[]>();
    staggerEls.forEach((el) => {
      const parent = el.parentElement;
      if (!parent) return;
      const arr = groups.get(parent) ?? [];
      arr.push(el);
      groups.set(parent, arr);
    });
    groups.forEach((items) => {
      items.forEach((el, i) => indexByEl.set(el, Math.min(i, MAX_STEPS)));
    });

    const revealEl = (target: HTMLElement, source: RevealSource) => {
      if (target.classList.contains("is-visible")) return;
      // Only apply our cadence when no inline delay is already set, so
      // route-level overrides still win.
      if (target.classList.contains("reveal-stagger") && !target.style.transitionDelay) {
        const idx = indexByEl.get(target) ?? 0;
        target.style.transitionDelay = `${idx * STAGGER_MS}ms`;
      }
      target.classList.add("is-visible");
      telemetry.log("reveal", source, target, describeReveal(target));
      if (revealDebug) flashDebug(target, `reveal·${source}`);
    };

    // Mobile-aware IO config: on narrow viewports we want reveals to
    // trigger slightly earlier so the section is still inside the fold
    // when motion starts (avoids "animation completed before visible"
    // on fast Occasions / long-section scrolls). Reduced from -18% to
    // -10% on mobile after motion-QA showed Occasions occasionally
    // catching the IO catch-up branch (bottom <= 0) on 393px scrolls.
    const ioOptions: IntersectionObserverInit = isMobile
      ? { threshold: 0.01, rootMargin: "0px 0px -10% 0px" }
      : { threshold: 0.04, rootMargin: "0px 0px -12% 0px" };

    // Some `.reveal-stagger` items live inside a horizontal scroller
    // (e.g. mobile Signature carousel: 4 cards at 84vw each, only the
    // first card sits inside the visible horizontal viewport). The
    // default IO root is the document viewport, which uses BOTH axes —
    // so cards that are vertically in view but horizontally off-screen
    // never satisfy `isIntersecting` until the user swipes the strip.
    // We bridge this by observing the carousel parent itself: when its
    // vertical band enters the viewport, we reveal every stagger child
    // at once (the existing per-child stagger delay still produces the
    // sequenced fade). This keeps motion-QA's "hidden" count at 0 even
    // for users who only scroll vertically.
    const horizontalParents = new Map<HTMLElement, HTMLElement[]>();
    els.forEach((el) => {
      let p: HTMLElement | null = el.parentElement;
      while (p && p !== document.body) {
        const cs = window.getComputedStyle(p);
        const ox = cs.overflowX;
        if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth + 1) {
          const arr = horizontalParents.get(p) ?? [];
          arr.push(el);
          horizontalParents.set(p, arr);
          break;
        }
        p = p.parentElement;
      }
    });

    const io = new IntersectionObserver((entries) => {
      telemetry.markIoFired();
      entries.forEach((entry) => {
        const passed = entry.boundingClientRect.bottom <= 0;
        if (!entry.isIntersecting && !passed) return;
        revealEl(entry.target as HTMLElement, "io");
        io.unobserve(entry.target);
      });
    }, ioOptions);

    els.forEach((el) => io.observe(el));

    // Vertical-band observer for horizontal-carousel children. Uses
    // the SAME rootMargin so timing matches the rest of the page. When
    // the parent strip enters the vertical viewport, every off-screen
    // child is revealed via the standard `revealEl` path (so stagger
    // delays still apply and telemetry attributes the source as IO).
    if (horizontalParents.size > 0) {
      const carouselIo = new IntersectionObserver((entries) => {
        telemetry.markIoFired();
        entries.forEach((entry) => {
          if (!entry.isIntersecting && entry.boundingClientRect.bottom > 0) return;
          const children = horizontalParents.get(entry.target as HTMLElement) ?? [];
          children.forEach((child) => {
            revealEl(child, "io");
            io.unobserve(child);
          });
          carouselIo.unobserve(entry.target);
        });
      }, ioOptions);
      horizontalParents.forEach((_children, parent) => carouselIo.observe(parent));
    }

    if (revealDebug) {
      console.info(
        `[reveal-debug] reveal observer: total=${els.length} mobile=${isMobile} threshold=${ioOptions.threshold} rootMargin="${ioOptions.rootMargin}"`,
      );
    }

    // Initial sweep: reveal anything already inside the viewport or already
    // scrolled past. Because `.is-visible` now also starts a keyframe, the
    // mobile preview still gets a visible entrance even when IO reports the
    // element as intersecting immediately on mount.
    const sweep = (source: "sweepInitial" | "sweepDelayed") => {
      els.forEach((el) => {
        if (el.classList.contains("is-visible")) return;
        const rect = el.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const inViewport = rect.top < viewportHeight && rect.bottom > 0;
        const meaningfullyVisible = rect.top < viewportHeight * 0.58;
        if (inViewport && (telemetry.entry !== "cold" || meaningfullyVisible)) {
          revealEl(el, source);
          io.unobserve(el);
        } else if (rect.bottom <= 0) {
          revealEl(el, source);
          io.unobserve(el);
        }
      });
    };
    sweep("sweepInitial");
    // Safety net: re-sweep once shortly after mount in case the IO
    // missed something during the first frame on extreme fling scrolls.
    const t = window.setTimeout(() => sweep("sweepDelayed"), 600);

    // FAIL-SAFE (1200ms): if for any reason the IntersectionObserver
    // never fires for elements that are ALREADY in or above the viewport
    // (sandboxed iframe, throttled tab, browser quirk, layout shift after
    // observe), force ONLY those visible. Elements still legitimately
    // below the fold remain observed and animate when scrolled to —
    // otherwise the fail-safe would defeat the entire reveal system on
    // long pages.
    const failSafe = window.setTimeout(() => {
      let forced = 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      els.forEach((el) => {
        if (el.classList.contains("is-visible")) return;
        const rect = el.getBoundingClientRect();
        // Only force-visible if the element is at or above the viewport
        // bottom (i.e. should already be on-screen). Below-fold stays.
        if (
          rect.top >= viewportHeight ||
          (telemetry.entry === "cold" && rect.top > viewportHeight * 0.72)
        )
          return;
        el.style.transition = "none";
        el.style.transitionDelay = "0ms";
        el.classList.add("is-visible");
        telemetry.log("reveal", "sweepDelayed", el, describeReveal(el));
        forced += 1;
      });
      if (forced > 0) telemetry.markFailSafeFired();
    }, 1200);

    // SCROLL CATCH-UP: throttled scroll listener that catches any reveal
    // element whose vertical bbox enters the viewport but whose IO entry
    // never fires (e.g. an element nested inside a transformed/clipped
    // ancestor whose intersection rect doesn't match the document
    // viewport). Vertical-only check — horizontal position is ignored.
    // Uses requestAnimationFrame coalescing so it never blocks scroll.
    let scrollRaf = 0;
    const scrollSweep = () => {
      scrollRaf = 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      els.forEach((el) => {
        if (el.classList.contains("is-visible")) return;
        const rect = el.getBoundingClientRect();
        // Vertical band only — top has reached at least the lower 90%
        // of the viewport AND bottom is still above the top.
        if (rect.top < viewportHeight * 0.92 && rect.bottom > 0) {
          revealEl(el, "io");
          io.unobserve(el);
        } else if (rect.bottom <= 0) {
          revealEl(el, "io");
          io.unobserve(el);
        }
      });
    };
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = window.requestAnimationFrame(scrollSweep);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(failSafe);
      window.removeEventListener("scroll", onScroll);
      if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
      io.disconnect();
    };
  }, []);

  // Dedicated observer for `.section-enter` wrappers. Fires earlier than
  // the staggered-reveal observer above (rootMargin -8% bottom, very low
  // threshold) so tall sections in narrow mobile viewports begin their
  // calm fade-in as soon as the top edge appears, instead of waiting for
  // 14% of a 1000px+ section to be on screen — that delay was the main
  // cause of "section snaps in late" on mobile scroll. Opacity-only on
  // the CSS side ensures this never duplicates the inner reveals'
  // translateY rhythm.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = document.querySelectorAll<HTMLElement>(".section-enter");
    if (!els.length) return;

    const flags = getScrollDebugFlags();
    const isMobile = window.matchMedia("(max-width: 767.98px)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealDebug = flags.revealDebug;
    const telemetry = getRevealTelemetry();
    telemetry.setTotal("sectionEnter", els.length);

    if (typeof IntersectionObserver === "undefined" || reducedMotion) {
      els.forEach((el) => {
        el.classList.add("is-visible");
        if (revealDebug) flashDebug(el, "section·reduced-motion");
      });
      return;
    }

    const markVisible = (el: Element, source: RevealSource) => {
      if (el.classList.contains("is-visible")) return;
      el.classList.add("is-visible");
      telemetry.log("sectionEnter", source, el as HTMLElement, describeReveal(el));
      if (revealDebug) flashDebug(el as HTMLElement, `section·${source}`);
    };

    // Fire even earlier on mobile. Reduced from -18% to -10% on mobile
    // so Occasions / Groups (a long section that often sits past mid-fold
    // before triggering) starts its calm fade while still inside the
    // viewport rather than catching the IO post-pass branch.
    const ioOptions: IntersectionObserverInit = isMobile
      ? { threshold: 0.01, rootMargin: "0px 0px -10% 0px" }
      : { threshold: 0.02, rootMargin: "0px 0px -12% 0px" };

    const io = new IntersectionObserver((entries) => {
      telemetry.markIoFired();
      entries.forEach((entry) => {
        const passed = entry.boundingClientRect.bottom <= 0;
        if (!entry.isIntersecting && !passed) return;
        markVisible(entry.target, "io");
        io.unobserve(entry.target);
      });
    }, ioOptions);

    els.forEach((el) => io.observe(el));

    if (revealDebug) {
      console.info(
        `[reveal-debug] section-enter observer: total=${els.length} mobile=${isMobile} threshold=${ioOptions.threshold} rootMargin="${ioOptions.rootMargin}"`,
      );
    }

    const sweep = (source: "sweepInitial" | "sweepDelayed") => {
      els.forEach((el) => {
        if (el.classList.contains("is-visible")) return;
        const rect = el.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const inViewport = rect.top < viewportHeight && rect.bottom > 0;
        const meaningfullyVisible = rect.top < viewportHeight * 0.58;
        if (inViewport && (telemetry.entry !== "cold" || meaningfullyVisible)) {
          markVisible(el, source);
          io.unobserve(el);
        } else if (rect.bottom <= 0) {
          markVisible(el, source);
          io.unobserve(el);
        }
      });
    };
    sweep("sweepInitial");
    const t = window.setTimeout(() => sweep("sweepDelayed"), 600);

    // FAIL-SAFE (1200ms): force any still-pending section-enter visible
    // ONLY if it's already at or above the viewport. Below-fold sections
    // remain observed and animate when scrolled to — preserves the
    // intended on-scroll motion on long pages.
    const failSafe = window.setTimeout(() => {
      let forced = 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      els.forEach((el) => {
        if (el.classList.contains("is-visible")) return;
        const rect = el.getBoundingClientRect();
        if (
          rect.top >= viewportHeight ||
          (telemetry.entry === "cold" && rect.top > viewportHeight * 0.72)
        )
          return;
        el.style.transition = "none";
        el.classList.add("is-visible");
        telemetry.log("sectionEnter", "sweepDelayed", el, describeReveal(el));
        forced += 1;
      });
      if (forced > 0) telemetry.markFailSafeFired();
    }, 1200);

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(failSafe);
      io.disconnect();
    };
  }, []);

  // Reveal debug overlay: when ?reveal-debug is on, mount a small fixed
  // HUD that shows live counts, plus log hero CTA pulse status. Helps QA
  // animations on mobile where dev tools console isn't visible.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const flags = getScrollDebugFlags();
    if (!flags.revealDebug) return;

    const hud = document.createElement("div");
    hud.id = "yes-reveal-debug-hud";
    hud.setAttribute("role", "status");
    hud.setAttribute("aria-live", "polite");
    hud.style.cssText = [
      "position:fixed",
      "left:8px",
      "bottom:8px",
      "z-index:99999",
      "padding:8px 10px",
      "background:rgba(20,20,20,0.88)",
      "color:var(--ivory)",
      "font:600 11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace",
      "border:1px solid rgba(201,169,106,0.5)",
      "border-radius:6px",
      "box-shadow:0 4px 16px rgba(0,0,0,0.35)",
      "pointer-events:auto",
      "max-width:60vw",
    ].join(";");
    document.body.appendChild(hud);

    const tick = () => {
      const t = window.__yesRevealTelemetry;
      if (!t) return;
      const pulses = document.querySelectorAll(".hero-cta-arrow-pulse").length;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      hud.innerHTML =
        `<div style="color:var(--gold)">reveal-debug · ${t.entry}</div>` +
        `<div>reveal ${t.reveal.io}/${t.reveal.sweepInitial}/${t.reveal.sweepDelayed} · pending ${t.reveal.pending}/${t.reveal.total}</div>` +
        `<div>section ${t.sectionEnter.io}/${t.sectionEnter.sweepInitial}/${t.sectionEnter.sweepDelayed} · pending ${t.sectionEnter.pending}/${t.sectionEnter.total}</div>` +
        `<div>hero pulses: ${pulses} · reduced-motion: ${reduced ? "ON" : "off"}</div>` +
        `<div style="opacity:.7">io / sweepInit / sweepDelayed</div>`;
    };
    tick();
    const interval = window.setInterval(tick, 500);

    console.info(
      "[reveal-debug] HUD mounted. Add ?scroll-debug=reveal-debug or ?reveal-debug to URL.",
    );

    return () => {
      window.clearInterval(interval);
      hud.remove();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingActions />
      <WhatsAppFab />

      {/* Single polite SR announcer — fires once per tab when the user
          first scrolls past the hero, giving screen-reader users parity
          with sighted users who see the post-hero CTA surfaces appear. */}
      <PostHeroAnnouncer />
      <QaPanel />
      <MotionQaPanel />
    </div>
  );
}
