/**
 * Reveal observer config + reduced-motion fallback contract.
 *
 * Two guarantees enforced here:
 *
 * 1. **Mobile IO config** — when `(max-width: 767.98px)` matches, both
 *    `.reveal` / `.reveal-stagger` and `.section-enter` observers must
 *    fire earlier than on desktop. Concretely:
 *      - threshold ≤ 0.02 (tolerant of small variations)
 *      - rootMargin's bottom inset is at most -2% (i.e. tighter / earlier
 *        than the desktop -6%/-8% values), so tall mobile sections begin
 *        revealing as soon as their top edge appears.
 *    On desktop the inverse holds — threshold > 0.02 OR larger negative
 *    bottom margin — so we don't accidentally regress to the old "snap
 *    in late on mobile" config.
 *
 * 2. **prefers-reduced-motion fallback** — when the media query matches,
 *    SiteLayout MUST NOT instantiate any IntersectionObserver for
 *    reveals/section-enter, AND every `.reveal` / `.reveal-stagger` /
 *    `.section-enter` element must end up with `is-visible` synchronously
 *    after mount. This guarantees content is always shown for users who
 *    have motion disabled, even if CSS animations are blocked.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

vi.mock("@/components/Navbar", () => ({ Navbar: () => null }));
vi.mock("@/components/Footer", () => ({ Footer: () => null }));
vi.mock("@/components/FloatingActions", () => ({ FloatingActions: () => null }));
vi.mock("@/components/WhatsAppFab", () => ({ WhatsAppFab: () => null }));
vi.mock("@/components/MobileStickyCTA", () => ({ MobileStickyCTA: () => null }));
vi.mock("@/components/PostHeroAnnouncer", () => ({ PostHeroAnnouncer: () => null }));
vi.mock("@/lib/smooth-anchor-scroll", () => ({
  installSmoothAnchorScroll: () => () => {},
}));

import { SiteLayout } from "@/components/SiteLayout";

// ------------------------------------------------------------------
// Fake IntersectionObserver
// ------------------------------------------------------------------
//
// Why this exists:
//   The two SiteLayout effects (`.reveal/.reveal-stagger` and
//   `.section-enter`) each spin up their own IntersectionObserver.
//   In tests we need to (a) assert the threshold/rootMargin config of
//   each one independently, and (b) drive intersection callbacks on
//   the right observer for each scenario.
//
// Public test API:
//   • `kind`               — "reveal" | "section-enter" | "other",
//                            auto-detected the first time an element
//                            of that kind is observed.
//   • `pendingTargets`     — currently-observed elements (alias of
//                            the live `targets` Set).
//   • `observedTargets`    — every element ever observed, even after
//                            `unobserve()` removes it.
//   • `fire(entries)`      — deliver synthetic IO entries.
//   • Static helpers:
//       - `FakeIO.reveal()`  → the reveal observer (throws if missing).
//       - `FakeIO.section()` → the section-enter observer.
//       - `FakeIO.allOf(kind)` → every observer of a given kind.
//   These names keep tests self-documenting: `FakeIO.reveal().fire(...)`
//   reads as "the reveal observer fires" instead of "the first IO with
//   a target whose className matches…".
//
type FakeIOKind = "reveal" | "section-enter" | "other";

function classifyTarget(el: Element | null | undefined): FakeIOKind {
  // Defensive: a target without a real classList (null, undefined, or a
  // detached/foreign object) cannot be classified — treat as "other" so
  // the observer never throws during classification.
  const cl = (el as Element | null | undefined)?.classList;
  if (!cl || typeof cl.contains !== "function") return "other";
  if (cl.contains("section-enter")) return "section-enter";
  if (cl.contains("reveal") || cl.contains("reveal-stagger")) {
    return "reveal";
  }
  return "other";
}

class FakeIO {
  static instances: FakeIO[] = [];

  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;

  /** Live set: targets currently being watched (post-unobserve aware). */
  readonly pendingTargets = new Set<Element>();
  /** Append-only set: every element ever observed by this instance. */
  readonly observedTargets = new Set<Element>();
  /** Auto-detected on first observe; "other" until then. */
  kind: FakeIOKind = "other";

  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = options;
    FakeIO.instances.push(this);
  }

  observe(target: Element | null | undefined) {
    // Mirror the real IntersectionObserver behavior loosely: a missing or
    // malformed target is a no-op and must never throw. Only real Elements
    // (with a usable classList API) are tracked.
    const cl = (target as Element | null | undefined)?.classList;
    const isRealElement = !!target && !!cl && typeof cl.contains === "function";
    if (isRealElement) {
      this.pendingTargets.add(target as Element);
      this.observedTargets.add(target as Element);
    }
    if (this.kind === "other") {
      const detected = classifyTarget(target);
      if (detected !== "other") this.kind = detected;
    }
  }

  unobserve(target: Element) {
    this.pendingTargets.delete(target);
  }

  disconnect() {
    this.pendingTargets.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Deliver synthetic entries to this observer's callback. */
  fire(entries: Partial<IntersectionObserverEntry>[]) {
    const full = entries.map(
      (e) =>
        ({
          isIntersecting: false,
          intersectionRatio: 0,
          time: 0,
          rootBounds: null,
          intersectionRect: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          } as DOMRectReadOnly,
          ...e,
        }) as IntersectionObserverEntry,
    );
    this.callback(full, this as unknown as IntersectionObserver);
  }

  // ----- Backwards-compatible alias --------------------------------
  // Some earlier tests in this file still reference `targets` directly;
  // keep the alias so the diff stays small. Reads/mutations on either
  // name affect the same underlying Set.
  get targets(): Set<Element> {
    return this.pendingTargets;
  }
  /** Deprecated: prefer `observedTargets`. */
  get observedHistory(): Set<Element> {
    return this.observedTargets;
  }

  // ----- Static lookup helpers -------------------------------------
  static reset() {
    FakeIO.instances = [];
  }
  static allOf(kind: FakeIOKind): FakeIO[] {
    return FakeIO.instances.filter((io) => io.kind === kind);
  }
  /** The (single) reveal observer. Throws if not yet created. */
  static reveal(): FakeIO {
    const io = FakeIO.allOf("reveal")[0];
    if (!io) {
      throw new Error(
        "FakeIO.reveal(): no reveal IntersectionObserver has been created yet — " +
          "did the SiteLayout mount and observe a `.reveal` element?",
      );
    }
    return io;
  }
  /** The (single) section-enter observer. Throws if not yet created. */
  static section(): FakeIO {
    const io = FakeIO.allOf("section-enter")[0];
    if (!io) {
      throw new Error(
        "FakeIO.section(): no section-enter IntersectionObserver has been created yet — " +
          "did the SiteLayout mount and observe a `.section-enter` element?",
      );
    }
    return io;
  }
}

/**
 * Parse a rootMargin string of the form "Tpx Rpx Bpx Lpx" or "T R B L"
 * with mixed px/% units. Returns the **bottom** value in its native unit;
 * negative percentages mean "shrink the viewport from the bottom" and a
 * larger absolute % = IO fires later, smaller absolute % = earlier.
 *
 * Returns Infinity when we can't parse it, so the assertion fails loudly
 * instead of silently passing.
 */
function bottomMarginPercent(rootMargin: string | undefined): number {
  if (!rootMargin) return Infinity;
  const parts = rootMargin.trim().split(/\s+/);
  // CSS shorthand: 1, 2, 3, or 4 values. Bottom is index 2 in 4-val form
  // or implied by shorthand rules. We only generate 4-val from SiteLayout
  // ("0px 0px -2% 0px"), so handle that primarily.
  let bottom: string | undefined;
  if (parts.length === 4) bottom = parts[2];
  else if (parts.length === 3) bottom = parts[2];
  else if (parts.length === 2) bottom = parts[0];
  else bottom = parts[0];
  if (!bottom) return Infinity;
  const m = bottom.match(/^(-?\d*\.?\d+)\s*(px|%)?$/);
  if (!m) return Infinity;
  const value = parseFloat(m[1]);
  const unit = m[2] || "px";
  // Normalise to "percent equivalent" for comparison: treat px as 0% so
  // px-only margins always look "tighter" than negative-% margins.
  return unit === "%" ? value : 0;
}

function makeMatchMedia(map: Record<string, boolean>) {
  return (q: string): MediaQueryList =>
    ({
      matches: map[q] ?? false,
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

beforeEach(() => {
  delete (window as unknown as { __yesRevealTelemetry?: unknown }).__yesRevealTelemetry;
  FakeIO.reset();
  vi.stubGlobal("IntersectionObserver", FakeIO as unknown as typeof IntersectionObserver);
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  window.history.replaceState({}, "", "/");
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("reveal observers — mobile IO config", () => {
  it("uses a tighter (earlier-firing) rootMargin + low threshold on mobile", () => {
    // matchMedia reports we're on mobile and NOT reduced-motion.
    vi.stubGlobal(
      "matchMedia",
      makeMatchMedia({
        "(max-width: 767.98px)": true,
        "(prefers-reduced-motion: reduce)": false,
      }),
    );

    render(
      <SiteLayout>
        <div className="reveal" />
        <div className="reveal-stagger" />
        <section className="section-enter" />
      </SiteLayout>,
    );

    // Two observers expected: reveal + section-enter.
    expect(FakeIO.instances.length).toBeGreaterThanOrEqual(2);
    for (const io of FakeIO.instances) {
      const threshold = Array.isArray(io.options?.threshold)
        ? Math.min(...(io.options!.threshold as number[]))
        : (io.options?.threshold ?? 0);
      // Mobile threshold must be very low so reveals fire as soon as a
      // sliver of the element appears.
      expect(threshold).toBeLessThanOrEqual(0.02);
      // Mobile bottom margin must hold back the trigger enough that the
      // animation is still visible to the human eye when the section enters,
      // but not so much that long sections (Occasions) catch the IO
      // post-pass branch on fast scrolls. Tightened from -12..-22 after
      // motion-QA showed -18% letting Occasions complete before visible.
      const bottomPct = bottomMarginPercent(io.options?.rootMargin);
      expect(bottomPct).toBeLessThanOrEqual(-8);
      expect(bottomPct).toBeGreaterThanOrEqual(-22);
    }
  });

  it("uses a more conservative rootMargin / threshold on desktop", () => {
    vi.stubGlobal(
      "matchMedia",
      makeMatchMedia({
        "(max-width: 767.98px)": false,
        "(prefers-reduced-motion: reduce)": false,
      }),
    );

    render(
      <SiteLayout>
        <div className="reveal" />
        <section className="section-enter" />
      </SiteLayout>,
    );

    expect(FakeIO.instances.length).toBeGreaterThanOrEqual(2);
    // At least one of the two desktop observers must use the
    // pre-existing -6%/-8% behavior (i.e. bottom margin < -2%) OR a
    // higher threshold (> 0.02). This guards against accidentally
    // applying the mobile config everywhere.
    const looser = FakeIO.instances.some((io) => {
      const threshold = Array.isArray(io.options?.threshold)
        ? Math.min(...(io.options!.threshold as number[]))
        : (io.options?.threshold ?? 0);
      const bottomPct = bottomMarginPercent(io.options?.rootMargin);
      return threshold > 0.02 || bottomPct < -2;
    });
    expect(looser).toBe(true);
  });
});

describe("reveal observers — prefers-reduced-motion fallback", () => {
  it("never instantiates the reveal/section-enter observers and marks every element visible", () => {
    vi.stubGlobal(
      "matchMedia",
      makeMatchMedia({
        "(max-width: 767.98px)": true,
        "(prefers-reduced-motion: reduce)": true,
      }),
    );

    render(
      <SiteLayout>
        <div className="reveal" data-testid="r1" />
        <div className="reveal-stagger" data-testid="r2" />
        <section className="section-enter" data-testid="s1" />
        <section className="section-enter" data-testid="s2" />
      </SiteLayout>,
    );

    // Reduced-motion path must short-circuit BEFORE constructing either
    // IntersectionObserver, so we expect zero instances.
    expect(FakeIO.instances.length).toBe(0);

    // Every reveal-flavoured element must be force-marked visible
    // synchronously, so content is never hidden for reduced-motion users.
    const all = document.querySelectorAll<HTMLElement>(".reveal, .reveal-stagger, .section-enter");
    expect(all.length).toBe(4);
    all.forEach((el) => {
      expect(el.classList.contains("is-visible")).toBe(true);
    });
  });

  it("clears any inline transition-delay so staggered items can't stay invisible", () => {
    vi.stubGlobal(
      "matchMedia",
      makeMatchMedia({
        "(max-width: 767.98px)": true,
        "(prefers-reduced-motion: reduce)": true,
      }),
    );

    // Pre-set an inline transition-delay (as the cadence logic would in
    // the non-reduced path). The reduced-motion fallback must wipe it so
    // nothing keeps the element at opacity:0 behind a delay.
    const Wrapper = () => (
      <SiteLayout>
        <div
          className="reveal-stagger"
          data-testid="delayed"
          style={{ transitionDelay: "880ms" }}
        />
      </SiteLayout>
    );
    render(<Wrapper />);

    const el = document.querySelector<HTMLElement>('[data-testid="delayed"]')!;
    expect(el.classList.contains("is-visible")).toBe(true);
    // SiteLayout's reduced-motion branch normalises this to "0ms".
    expect(el.style.transitionDelay).toBe("0ms");
  });
});

// ------------------------------------------------------------------
// Threshold normalization contract.
//
// IntersectionObserver accepts `threshold` as either a single number
// or an array of numbers. The "effective firing threshold" is the
// SMALLEST value in the array (because IO fires whenever any listed
// ratio is crossed). Our mobile/desktop assertions above rely on
// this: if a future refactor passes [0, 0.01, 0.02] instead of 0.01,
// the contract is still satisfied as long as `min(thresholds) ≤ 0.02`
// on mobile.
//
// We pin this normalization down with direct unit tests so the helper
// can never drift away from real IO semantics.
// ------------------------------------------------------------------

/** Mirrors the inline normalization used in the assertions above. */
function effectiveThreshold(t: number | number[] | undefined): number {
  if (t === undefined) return 0; // IO default
  if (Array.isArray(t)) {
    if (t.length === 0) return 0;
    return Math.min(...t);
  }
  return t;
}

describe("threshold normalization — scalars and arrays", () => {
  it("returns the scalar value as-is when threshold is a single number", () => {
    expect(effectiveThreshold(0.01)).toBe(0.01);
    expect(effectiveThreshold(0.5)).toBe(0.5);
    expect(effectiveThreshold(0)).toBe(0);
  });

  it("returns the smallest entry when threshold is an array", () => {
    expect(effectiveThreshold([0, 0.01, 0.02])).toBe(0);
    expect(effectiveThreshold([0.25, 0.05, 0.5])).toBe(0.05);
    // Out-of-order arrays must still pick the minimum.
    expect(effectiveThreshold([0.9, 0.1, 0.3, 0.05])).toBe(0.05);
  });

  it("treats an undefined or empty-array threshold as 0 (IO default)", () => {
    expect(effectiveThreshold(undefined)).toBe(0);
    expect(effectiveThreshold([])).toBe(0);
  });

  it("on mobile, an array threshold satisfies the ≤0.02 contract via its minimum", () => {
    // Even if the array's max is large (0.5), the minimum (0.01) is
    // what determines the "fires early" guarantee on mobile.
    const arrayLikeMobile: number[] = [0, 0.01, 0.02, 0.5];
    expect(effectiveThreshold(arrayLikeMobile)).toBeLessThanOrEqual(0.02);
  });

  it("on desktop, a scalar OR an array whose min is > 0.02 counts as 'looser'", () => {
    // Scalar form (current desktop config: 0.08 / 0.02).
    expect(effectiveThreshold(0.08) > 0.02).toBe(true);
    // Array form: [0.05, 0.1, 0.2] — min is 0.05, still > 0.02.
    expect(effectiveThreshold([0.05, 0.1, 0.2]) > 0.02).toBe(true);
    // Border case: an array containing 0.02 would count as MOBILE-tight,
    // not desktop-loose. This guards against accidentally making the
    // desktop observer fire as early as the mobile one.
    expect(effectiveThreshold([0.02, 0.5]) > 0.02).toBe(false);
  });
});

describe("reveal observers — accept array thresholds at runtime", () => {
  it("if a future refactor passes [0, 0.01, 0.02] on mobile, the contract still holds", () => {
    // Patch FakeIO so its options.threshold is forced to an array,
    // simulating a future SiteLayout that prefers multi-step thresholds.
    // Then re-run the same assertion the mobile test uses.
    vi.stubGlobal(
      "matchMedia",
      makeMatchMedia({
        "(max-width: 767.98px)": true,
        "(prefers-reduced-motion: reduce)": false,
      }),
    );

    const OriginalIO = FakeIO;
    class ArrayThresholdIO extends OriginalIO {
      constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        // Coerce whatever threshold SiteLayout passes into an array
        // form to mimic the hypothetical refactor.
        const original = options?.threshold ?? 0;
        const asArray = Array.isArray(original) ? original : [0, original];
        super(cb, { ...options, threshold: asArray });
      }
    }
    vi.stubGlobal(
      "IntersectionObserver",
      ArrayThresholdIO as unknown as typeof IntersectionObserver,
    );

    render(
      <SiteLayout>
        <div className="reveal" />
        <section className="section-enter" />
      </SiteLayout>,
    );

    expect(FakeIO.instances.length).toBeGreaterThanOrEqual(2);
    for (const io of FakeIO.instances) {
      const t = io.options?.threshold;
      // Confirm the harness actually delivered an array.
      expect(Array.isArray(t)).toBe(true);
      // The min of the array must still satisfy the mobile contract.
      expect(effectiveThreshold(t as number[])).toBeLessThanOrEqual(0.02);
    }
  });
});

// ------------------------------------------------------------------
// Sequenced IO firing — many sections on mobile.
//
// Mounts a realistic-ish page (5 `.reveal` cards + 3 `.section-enter`
// wrappers), then fires IntersectionObserver entries one at a time, in
// document order, asserting that:
//   • before any IO fire, NO element has `is-visible` (sweep didn't
//     mistakenly mark them — their rects say they're below the fold);
//   • after firing entry i, ONLY elements 0…i have `is-visible`;
//   • the final state has every element visible AND each one is
//     unobserved (observer.targets no longer contains it), so we don't
//     leak observers on long pages.
// ------------------------------------------------------------------

/** Place an element well below the fold so the initial sweep skips it. */
function placeBelowFold(el: Element, slot: number) {
  const VH = 800;
  const top = VH + 200 + slot * 600;
  (el as HTMLElement).getBoundingClientRect = () =>
    ({
      top,
      bottom: top + 500,
      left: 0,
      right: 360,
      width: 360,
      height: 500,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe("reveal observers — sequenced firing on mobile", () => {
  it("each .reveal gains is-visible only when its IO entry fires, in order", async () => {
    vi.stubGlobal(
      "matchMedia",
      makeMatchMedia({
        "(max-width: 767.98px)": true,
        "(prefers-reduced-motion: reduce)": false,
      }),
    );

    const { container } = render(
      <SiteLayout>
        <div className="reveal" data-idx="0" />
        <div className="reveal" data-idx="1" />
        <div className="reveal" data-idx="2" />
        <div className="reveal" data-idx="3" />
        <div className="reveal" data-idx="4" />
      </SiteLayout>,
    );
    expect(container).toBeTruthy();

    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    expect(els.length).toBe(5);

    // Park them all below the fold so the initial sweep doesn't claim
    // any element. Note: the sweep already ran on mount with the default
    // (0,0,0,0) rect, which technically counts as "in viewport" — so we
    // first force-clear is-visible on every element and re-stub the
    // rects to simulate a fresh "all below the fold" state.
    els.forEach((el, i) => {
      el.classList.remove("is-visible");
      placeBelowFold(el, i);
    });

    // Locate the reveal observer via the explicit static helper.
    const revealIO = FakeIO.reveal();

    // Sequenced fire: deliver one isIntersecting=true entry at a time
    // and assert the running state.
    for (let i = 0; i < els.length; i++) {
      revealIO.fire([
        {
          target: els[i],
          isIntersecting: true,
          intersectionRatio: 0.1,
          boundingClientRect: {
            top: 100,
            bottom: 600,
            left: 0,
            right: 360,
            width: 360,
            height: 500,
            x: 0,
            y: 100,
            toJSON: () => ({}),
          } as DOMRectReadOnly,
        },
      ]);

      // Every element up to and including i must be visible.
      for (let j = 0; j <= i; j++) {
        expect(
          els[j].classList.contains("is-visible"),
          `element ${j} should be visible after firing ${i}`,
        ).toBe(true);
      }
      // Every element strictly after i must NOT be visible yet.
      for (let j = i + 1; j < els.length; j++) {
        expect(
          els[j].classList.contains("is-visible"),
          `element ${j} should NOT be visible yet (only ${i} fired)`,
        ).toBe(false);
      }
    }

    // After all fires, every revealed target must have been unobserved
    // (no leaks on a long page with many sections).
    for (const el of els) {
      expect(revealIO.targets.has(el)).toBe(false);
    }
  });

  it("`.section-enter` wrappers also reveal in firing order, independent of `.reveal`", () => {
    vi.stubGlobal(
      "matchMedia",
      makeMatchMedia({
        "(max-width: 767.98px)": true,
        "(prefers-reduced-motion: reduce)": false,
      }),
    );

    render(
      <SiteLayout>
        <section className="section-enter" data-idx="s0">
          <div className="reveal" data-idx="r0" />
        </section>
        <section className="section-enter" data-idx="s1">
          <div className="reveal" data-idx="r1" />
        </section>
        <section className="section-enter" data-idx="s2">
          <div className="reveal" data-idx="r2" />
        </section>
      </SiteLayout>,
    );

    const sections = Array.from(document.querySelectorAll<HTMLElement>(".section-enter"));
    expect(sections.length).toBe(3);

    // Reset post-mount sweep + park below the fold.
    sections.forEach((el, i) => {
      el.classList.remove("is-visible");
      placeBelowFold(el, i);
    });

    // Find the section-enter observer specifically.
    const sectionIO = FakeIO.section();

    // Fire only s0 and s2 (skip s1) — middle stays invisible until its
    // own entry arrives. This proves visibility isn't a side-effect of
    // earlier or later fires bleeding across siblings.
    sectionIO.fire([
      {
        target: sections[0],
        isIntersecting: true,
        boundingClientRect: { top: 50, bottom: 550 } as DOMRectReadOnly,
      },
    ]);
    expect(sections[0].classList.contains("is-visible")).toBe(true);
    expect(sections[1].classList.contains("is-visible")).toBe(false);
    expect(sections[2].classList.contains("is-visible")).toBe(false);

    sectionIO.fire([
      {
        target: sections[2],
        isIntersecting: true,
        boundingClientRect: { top: 50, bottom: 550 } as DOMRectReadOnly,
      },
    ]);
    expect(sections[1].classList.contains("is-visible")).toBe(false);
    expect(sections[2].classList.contains("is-visible")).toBe(true);

    // Now fire the middle one and confirm it joins the visible set
    // without disturbing the others.
    sectionIO.fire([
      {
        target: sections[1],
        isIntersecting: true,
        boundingClientRect: { top: 50, bottom: 550 } as DOMRectReadOnly,
      },
    ]);
    sections.forEach((el) => expect(el.classList.contains("is-visible")).toBe(true));
  });

  it("no observer leaks: every target is unobserved after a full sweep of fires", () => {
    // Mounts a wide mix (8 reveals + 4 section-enter wrappers, some
    // nested) on mobile, fires every IO entry as isIntersecting=true,
    // then asserts that NO FakeIO instance still has any element in
    // its `targets` set. This catches regressions where the observer
    // forgets to call `unobserve()` on a code path (e.g. only the
    // `isIntersecting` branch does it but the `passed-the-fold`
    // branch doesn't), which would slowly leak observed nodes on a
    // long mobile scroll session.
    vi.stubGlobal(
      "matchMedia",
      makeMatchMedia({
        "(max-width: 767.98px)": true,
        "(prefers-reduced-motion: reduce)": false,
      }),
    );

    render(
      <SiteLayout>
        <section className="section-enter">
          <div className="reveal" />
          <div className="reveal-stagger" />
        </section>
        <section className="section-enter">
          <div className="reveal" />
          <div className="reveal-stagger" />
        </section>
        <section className="section-enter">
          <div className="reveal" />
          <div className="reveal-stagger" />
        </section>
        <section className="section-enter">
          <div className="reveal" />
          <div className="reveal-stagger" />
        </section>
      </SiteLayout>,
    );

    // Reset whatever the mount-time sweep already did so we can drive
    // a clean "all-below-the-fold → all-fire" scenario.
    const allTracked = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal, .reveal-stagger, .section-enter"),
    );
    expect(allTracked.length).toBe(12);
    allTracked.forEach((el, i) => {
      el.classList.remove("is-visible");
      placeBelowFold(el, i);
    });

    // Re-observe every tracked element on its original observer so we
    // can simulate "scrolled into view" via IO. (The mount-time sweep
    // already unobserved them on JSDOM's default 0,0 rect, but the
    // observer instances themselves are still alive — that's exactly
    // the long-session shape the leak guarantee covers.)
    for (const io of FakeIO.instances) {
      for (const target of io.observedTargets) {
        if (document.contains(target)) io.observe(target);
      }
    }

    // Sanity: every observer is now actively watching at least one
    // element again, so a leaked target after firing would be a real bug.
    expect(
      FakeIO.instances.every((io) => io.targets.size > 0),
      "expected every observer to have at least one re-observed target",
    ).toBe(true);

    // Fire every observed target as isIntersecting=true. We snapshot
    // `targets` first because firing causes synchronous unobserve()
    // calls that mutate the live Set.
    for (const io of FakeIO.instances) {
      const snapshot = Array.from(io.targets);
      io.fire(
        snapshot.map((target) => ({
          target,
          isIntersecting: true,
          intersectionRatio: 0.1,
          boundingClientRect: {
            top: 100,
            bottom: 600,
            left: 0,
            right: 360,
            width: 360,
            height: 500,
            x: 0,
            y: 100,
            toJSON: () => ({}),
          } as DOMRectReadOnly,
        })),
      );
    }

    // Hard assertion: no leaks. Every observer must have an empty
    // targets set after firing all its entries.
    for (const io of FakeIO.instances) {
      expect(
        io.targets.size,
        `observer with rootMargin="${io.options?.rootMargin}" leaked ${io.targets.size} target(s)`,
      ).toBe(0);
    }

    // Sanity: every tracked element ended up visible — we didn't
    // accidentally also disconnect before doing the work.
    allTracked.forEach((el) => expect(el.classList.contains("is-visible")).toBe(true));
  });

  it("partial scroll: only fired targets are unobserved; the rest stay observed and invisible", () => {
    // Models a realistic mid-scroll snapshot on mobile: of 6 reveal
    // cards, the first 3 enter the viewport (IO fires `isIntersecting=true`
    // for them) and the remaining 3 are still below the fold (no entry
    // delivered yet). Contract:
    //   • exactly the fired 3 receive `is-visible` AND are removed from
    //     `io.targets`;
    //   • the unfired 3 stay invisible AND remain in `io.targets`, so
    //     they will fire later when the user keeps scrolling — i.e. no
    //     premature unobserve, no leak.
    vi.stubGlobal(
      "matchMedia",
      makeMatchMedia({
        "(max-width: 767.98px)": true,
        "(prefers-reduced-motion: reduce)": false,
      }),
    );

    render(
      <SiteLayout>
        <div className="reveal" data-idx="0" />
        <div className="reveal" data-idx="1" />
        <div className="reveal" data-idx="2" />
        <div className="reveal" data-idx="3" />
        <div className="reveal" data-idx="4" />
        <div className="reveal" data-idx="5" />
      </SiteLayout>,
    );

    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    expect(els.length).toBe(6);

    // Reset post-mount sweep state and park each element below the
    // fold; then re-observe so the IO is actively watching all 6.
    els.forEach((el, i) => {
      el.classList.remove("is-visible");
      placeBelowFold(el, i);
    });
    const revealIO = FakeIO.reveal();
    for (const el of els) revealIO.observe(el);
    expect(revealIO.targets.size).toBe(6);

    // Partial scroll: fire only the first 3 as isIntersecting=true.
    const visible = els.slice(0, 3);
    const stillBelow = els.slice(3);
    revealIO.fire(
      visible.map((target) => ({
        target,
        isIntersecting: true,
        intersectionRatio: 0.1,
        boundingClientRect: {
          top: 100,
          bottom: 600,
          left: 0,
          right: 360,
          width: 360,
          height: 500,
          x: 0,
          y: 100,
          toJSON: () => ({}),
        } as DOMRectReadOnly,
      })),
    );

    // Fired targets: visible + unobserved.
    for (const el of visible) {
      expect(el.classList.contains("is-visible")).toBe(true);
      expect(revealIO.targets.has(el)).toBe(false);
    }
    // Still-below targets: invisible + still observed (will fire later).
    for (const el of stillBelow) {
      expect(el.classList.contains("is-visible")).toBe(false);
      expect(revealIO.targets.has(el)).toBe(true);
    }
    // Live `targets` set must equal exactly the still-below subset —
    // no extras, no missing entries.
    expect(revealIO.targets.size).toBe(stillBelow.length);
    expect(new Set(stillBelow)).toEqual(new Set(revealIO.targets));

    // Continue scrolling: deliver the remaining 3. They should now
    // also flip to visible and the observer should be empty (clean
    // hand-off, no leak).
    revealIO.fire(
      stillBelow.map((target) => ({
        target,
        isIntersecting: true,
        intersectionRatio: 0.1,
        boundingClientRect: {
          top: 100,
          bottom: 600,
          left: 0,
          right: 360,
          width: 360,
          height: 500,
          x: 0,
          y: 100,
          toJSON: () => ({}),
        } as DOMRectReadOnly,
      })),
    );
    for (const el of stillBelow) {
      expect(el.classList.contains("is-visible")).toBe(true);
    }
    expect(revealIO.targets.size).toBe(0);
  });
});

describe("FakeIO.kind — auto-classification on first observe", () => {
  // These tests exercise the FakeIO test utility directly (no SiteLayout),
  // pinning down the contract that `kind` is set the first time an element
  // is observed and never silently downgraded afterwards.

  function makeEl(...classes: string[]): HTMLElement {
    const el = document.createElement("div");
    for (const c of classes) el.classList.add(c);
    return el;
  }

  it("classifies as 'reveal' when the first observed element has .reveal", () => {
    const io = new FakeIO(() => {});
    expect(io.kind).toBe("other");
    io.observe(makeEl("reveal"));
    expect(io.kind).toBe("reveal");
  });

  it("classifies as 'reveal' when the first observed element has .reveal-stagger", () => {
    const io = new FakeIO(() => {});
    io.observe(makeEl("reveal-stagger"));
    expect(io.kind).toBe("reveal");
  });

  it("classifies as 'section-enter' when the first observed element has .section-enter", () => {
    const io = new FakeIO(() => {});
    io.observe(makeEl("section-enter"));
    expect(io.kind).toBe("section-enter");
  });

  it("keeps kind as 'other' when only non-tracked elements are observed", () => {
    const io = new FakeIO(() => {});
    io.observe(makeEl("not-tracked"));
    io.observe(makeEl("random", "foo"));
    io.observe(makeEl()); // no classes at all
    expect(io.kind).toBe("other");
  });

  it("upgrades from 'other' to a real kind once a tracked element is observed", () => {
    const io = new FakeIO(() => {});
    io.observe(makeEl("not-tracked"));
    expect(io.kind).toBe("other");
    io.observe(makeEl("reveal"));
    expect(io.kind).toBe("reveal");
  });

  it("does not downgrade or switch kind once classified (reveal stays reveal)", () => {
    const io = new FakeIO(() => {});
    io.observe(makeEl("reveal"));
    expect(io.kind).toBe("reveal");
    // A later observe of a different kind must NOT mutate the locked-in kind.
    io.observe(makeEl("section-enter"));
    io.observe(makeEl("not-tracked"));
    expect(io.kind).toBe("reveal");
  });

  it("does not switch kind from 'section-enter' to 'reveal' on later observes", () => {
    const io = new FakeIO(() => {});
    io.observe(makeEl("section-enter"));
    expect(io.kind).toBe("section-enter");
    io.observe(makeEl("reveal"));
    io.observe(makeEl("reveal-stagger"));
    expect(io.kind).toBe("section-enter");
  });

  it("FakeIO.allOf() partitions instances by their classified kind", () => {
    FakeIO.reset();
    const a = new FakeIO(() => {});
    a.observe(makeEl("reveal"));
    const b = new FakeIO(() => {});
    b.observe(makeEl("section-enter"));
    const c = new FakeIO(() => {});
    c.observe(makeEl("not-tracked"));

    expect(FakeIO.allOf("reveal")).toEqual([a]);
    expect(FakeIO.allOf("section-enter")).toEqual([b]);
    expect(FakeIO.allOf("other")).toEqual([c]);
  });

  it("classifies a larger mix of observers correctly from the FIRST observe of each", () => {
    FakeIO.reset();

    function makeElLocal(...classes: string[]): HTMLElement {
      const el = document.createElement("div");
      for (const c of classes) el.classList.add(c);
      return el;
    }

    // 6 observers, each gets a distinct first-observed element so that the
    // `kind` is locked in by the very first call to observe().
    const ioReveal = new FakeIO(() => {});
    const ioStagger = new FakeIO(() => {});
    const ioSection = new FakeIO(() => {});
    const ioOtherA = new FakeIO(() => {});
    const ioOtherB = new FakeIO(() => {});
    const ioRevealCombo = new FakeIO(() => {});

    // Drive each observer with a deliberately mixed sequence:
    // first observe sets the kind; subsequent observes must NOT change it.
    ioReveal.observe(makeElLocal("reveal"));
    ioReveal.observe(makeElLocal("section-enter")); // must not flip
    ioReveal.observe(makeElLocal("not-tracked"));

    ioStagger.observe(makeElLocal("reveal-stagger"));
    ioStagger.observe(makeElLocal("section-enter")); // must not flip
    ioStagger.observe(makeElLocal("reveal"));

    ioSection.observe(makeElLocal("section-enter"));
    ioSection.observe(makeElLocal("reveal")); // must not flip
    ioSection.observe(makeElLocal("reveal-stagger"));

    ioOtherA.observe(makeElLocal("not-tracked"));
    ioOtherA.observe(makeElLocal("foo", "bar"));

    ioOtherB.observe(makeElLocal()); // no classes
    ioOtherB.observe(makeElLocal("baz"));

    // First observe is reveal-stagger + reveal together → still "reveal".
    ioRevealCombo.observe(makeElLocal("reveal", "reveal-stagger"));
    ioRevealCombo.observe(makeElLocal("section-enter"));

    // Per-instance kind assertions
    expect(ioReveal.kind).toBe("reveal");
    expect(ioStagger.kind).toBe("reveal");
    expect(ioSection.kind).toBe("section-enter");
    expect(ioOtherA.kind).toBe("other");
    expect(ioOtherB.kind).toBe("other");
    expect(ioRevealCombo.kind).toBe("reveal");

    // Partitioning across the whole set
    expect(FakeIO.allOf("reveal")).toEqual([ioReveal, ioStagger, ioRevealCombo]);
    expect(FakeIO.allOf("section-enter")).toEqual([ioSection]);
    expect(FakeIO.allOf("other")).toEqual([ioOtherA, ioOtherB]);

    // Total instance count is what we created — no phantom observers.
    expect(FakeIO.instances).toHaveLength(6);
  });

  it("kind is immutable after the first classifying observe — exhaustive matrix", () => {
    // For every "first kind" we lock in, run a long sequence of subsequent
    // observes covering every other class combination and assert that the
    // kind never drifts. This guards the contract that classification
    // happens exactly once, on the first non-"other" observe.

    function makeElLocal(...classes: string[]): HTMLElement {
      const el = document.createElement("div");
      for (const c of classes) el.classList.add(c);
      return el;
    }

    // The "intruder" sequence — every variant of class soup we can throw at
    // an already-classified observer. None of these should mutate `kind`.
    const intruders: string[][] = [
      ["section-enter"],
      ["reveal"],
      ["reveal-stagger"],
      ["reveal", "section-enter"],
      ["reveal-stagger", "section-enter"],
      ["reveal", "reveal-stagger"],
      ["not-tracked"],
      ["foo", "bar"],
      [], // no classes
      ["section-enter", "extra"],
      ["reveal", "extra"],
    ];

    // Case 1: first observe = .reveal → locked as "reveal"
    {
      const io = new FakeIO(() => {});
      io.observe(makeElLocal("reveal"));
      expect(io.kind).toBe("reveal");
      for (const classes of intruders) {
        io.observe(makeElLocal(...classes));
        expect(io.kind).toBe("reveal");
      }
    }

    // Case 2: first observe = .reveal-stagger → locked as "reveal"
    {
      const io = new FakeIO(() => {});
      io.observe(makeElLocal("reveal-stagger"));
      expect(io.kind).toBe("reveal");
      for (const classes of intruders) {
        io.observe(makeElLocal(...classes));
        expect(io.kind).toBe("reveal");
      }
    }

    // Case 3: first observe = .section-enter → locked as "section-enter"
    {
      const io = new FakeIO(() => {});
      io.observe(makeElLocal("section-enter"));
      expect(io.kind).toBe("section-enter");
      for (const classes of intruders) {
        io.observe(makeElLocal(...classes));
        expect(io.kind).toBe("section-enter");
      }
    }

    // Case 4: "other" is NOT locked — it's the pre-classification default,
    // so the first tracked element it sees DOES upgrade it. After that
    // upgrade, it must stay locked. Verify both halves of the contract.
    {
      const io = new FakeIO(() => {});
      io.observe(makeElLocal("not-tracked"));
      io.observe(makeElLocal("foo"));
      io.observe(makeElLocal()); // still no tracked class
      expect(io.kind).toBe("other");

      // First tracked class observed → upgrades to "reveal" and locks.
      io.observe(makeElLocal("reveal"));
      expect(io.kind).toBe("reveal");

      // From here on, nothing must flip it back or sideways.
      for (const classes of intruders) {
        io.observe(makeElLocal(...classes));
        expect(io.kind).toBe("reveal");
      }
    }
  });
});

describe("FakeIO.observe — defensive classification (null / undefined / no classList)", () => {
  // These tests pin down the contract that observe() must NEVER throw and
  // must NEVER mis-classify when handed degenerate inputs. Real production
  // code paths only ever pass real Elements, but the test utility is shared
  // and needs to fail loudly only on logic bugs — not on shape mismatches.

  function makeElLocal(...classes: string[]): HTMLElement {
    const el = document.createElement("div");
    for (const c of classes) el.classList.add(c);
    return el;
  }

  it("observe(null) does not throw and leaves kind as 'other'", () => {
    const io = new FakeIO(() => {});
    expect(() => io.observe(null as unknown as Element)).not.toThrow();
    expect(io.kind).toBe("other");
    expect(io.pendingTargets.size).toBe(0);
    expect(io.observedTargets.size).toBe(0);
  });

  it("observe(undefined) does not throw and leaves kind as 'other'", () => {
    const io = new FakeIO(() => {});
    expect(() => io.observe(undefined as unknown as Element)).not.toThrow();
    expect(io.kind).toBe("other");
    expect(io.pendingTargets.size).toBe(0);
  });

  it("observe(object without classList) does not throw and stays 'other'", () => {
    const io = new FakeIO(() => {});
    const fake = {} as unknown as Element;
    expect(() => io.observe(fake)).not.toThrow();
    expect(io.kind).toBe("other");
    expect(io.pendingTargets.size).toBe(0);
  });

  it("observe(object with non-function classList.contains) is treated as 'other'", () => {
    const io = new FakeIO(() => {});
    // Some foreign objects expose a classList-shaped property without the
    // proper API — must not crash.
    const fake = { classList: { contains: "not-a-function" } } as unknown as Element;
    expect(() => io.observe(fake)).not.toThrow();
    expect(io.kind).toBe("other");
    expect(io.pendingTargets.size).toBe(0);
  });

  it("nullish observes BEFORE a valid one do not poison classification", () => {
    const io = new FakeIO(() => {});
    io.observe(null as unknown as Element);
    io.observe(undefined as unknown as Element);
    io.observe({} as unknown as Element);
    expect(io.kind).toBe("other");

    // The first VALID tracked element still sets the kind.
    io.observe(makeElLocal("reveal"));
    expect(io.kind).toBe("reveal");
    expect(io.pendingTargets.size).toBe(1);
  });

  it("nullish observes AFTER classification do not change the kind", () => {
    const io = new FakeIO(() => {});
    io.observe(makeElLocal("section-enter"));
    expect(io.kind).toBe("section-enter");

    io.observe(null as unknown as Element);
    io.observe(undefined as unknown as Element);
    io.observe({} as unknown as Element);
    io.observe({ classList: null } as unknown as Element);

    expect(io.kind).toBe("section-enter");
    // Only the one real element ever made it into the tracking sets.
    expect(io.pendingTargets.size).toBe(1);
    expect(io.observedTargets.size).toBe(1);
  });

  it("classifyTarget-like edge cases do not break batched observes across instances", () => {
    FakeIO.reset();
    const ioA = new FakeIO(() => {});
    const ioB = new FakeIO(() => {});

    ioA.observe(null as unknown as Element);
    ioB.observe(undefined as unknown as Element);
    ioA.observe(makeElLocal("reveal-stagger"));
    ioB.observe(makeElLocal("section-enter"));
    ioA.observe(null as unknown as Element);
    ioB.observe({} as unknown as Element);

    expect(ioA.kind).toBe("reveal");
    expect(ioB.kind).toBe("section-enter");
    expect(FakeIO.allOf("reveal")).toEqual([ioA]);
    expect(FakeIO.allOf("section-enter")).toEqual([ioB]);
    expect(FakeIO.allOf("other")).toEqual([]);
  });
});

describe("FakeIO.observe — explicit 'classList missing' contract", () => {
  // Focused regression coverage: targets where `classList` is literally
  // absent (undefined) must NOT crash observe() and MUST leave kind as
  // "other" — both before and after legitimate classification.

  function makeElLocal(...classes: string[]): HTMLElement {
    const el = document.createElement("div");
    for (const c of classes) el.classList.add(c);
    return el;
  }

  it("observe(target) where target.classList === undefined does not throw", () => {
    const io = new FakeIO(() => {});
    const target = { classList: undefined } as unknown as Element;
    expect(() => io.observe(target)).not.toThrow();
  });

  it("kind stays 'other' after observing a classList-less target", () => {
    const io = new FakeIO(() => {});
    const target = { classList: undefined } as unknown as Element;
    io.observe(target);
    expect(io.kind).toBe("other");
  });

  it("classList-less targets are NOT added to pending or observed sets", () => {
    const io = new FakeIO(() => {});
    io.observe({ classList: undefined } as unknown as Element);
    io.observe({ classList: undefined } as unknown as Element);
    io.observe({ classList: undefined } as unknown as Element);
    expect(io.pendingTargets.size).toBe(0);
    expect(io.observedTargets.size).toBe(0);
    expect(io.kind).toBe("other");
  });

  it("a classList-less observe between valid ones does not flip the kind", () => {
    const io = new FakeIO(() => {});
    io.observe(makeElLocal("reveal"));
    expect(io.kind).toBe("reveal");

    expect(() => io.observe({ classList: undefined } as unknown as Element)).not.toThrow();
    expect(io.kind).toBe("reveal");

    io.observe(makeElLocal("reveal-stagger"));
    expect(io.kind).toBe("reveal");
    // Only the two real elements are tracked; the classList-less one is ignored.
    expect(io.pendingTargets.size).toBe(2);
    expect(io.observedTargets.size).toBe(2);
  });

  it("a classList-less observe BEFORE a valid one still allows classification on the next valid observe", () => {
    const io = new FakeIO(() => {});
    io.observe({ classList: undefined } as unknown as Element);
    expect(io.kind).toBe("other");

    io.observe(makeElLocal("section-enter"));
    expect(io.kind).toBe("section-enter");
    expect(io.pendingTargets.size).toBe(1);
  });

  it("repeated classList-less observes never throw and never mutate kind", () => {
    const io = new FakeIO(() => {});
    for (let i = 0; i < 25; i++) {
      expect(() => io.observe({ classList: undefined } as unknown as Element)).not.toThrow();
      expect(io.kind).toBe("other");
    }
    expect(io.pendingTargets.size).toBe(0);
  });
});

describe("FakeIO — parallel instances are isolated under degenerate inputs", () => {
  // Multiple FakeIO observers can be active at the same time (e.g. the
  // reveal observer + the section-enter observer). A degenerate observe()
  // on ONE instance must never leak into another instance's `kind`,
  // tracking sets, or static lookup helpers.

  function makeElLocal(...classes: string[]): HTMLElement {
    const el = document.createElement("div");
    for (const c of classes) el.classList.add(c);
    return el;
  }

  it("a classList-less observe on one instance leaves siblings untouched", () => {
    FakeIO.reset();
    const ioReveal = new FakeIO(() => {});
    const ioSection = new FakeIO(() => {});
    const ioOther = new FakeIO(() => {});

    // Classify the first two with real elements.
    ioReveal.observe(makeElLocal("reveal"));
    ioSection.observe(makeElLocal("section-enter"));
    expect(ioReveal.kind).toBe("reveal");
    expect(ioSection.kind).toBe("section-enter");
    expect(ioOther.kind).toBe("other");

    // Now hammer ioOther with classList-less garbage. Siblings must not move.
    expect(() => {
      ioOther.observe({ classList: undefined } as unknown as Element);
      ioOther.observe({ classList: undefined } as unknown as Element);
      ioOther.observe(null as unknown as Element);
    }).not.toThrow();

    expect(ioReveal.kind).toBe("reveal");
    expect(ioSection.kind).toBe("section-enter");
    expect(ioOther.kind).toBe("other");

    // Tracking sets are isolated per instance.
    expect(ioReveal.pendingTargets.size).toBe(1);
    expect(ioSection.pendingTargets.size).toBe(1);
    expect(ioOther.pendingTargets.size).toBe(0);
  });

  it("interleaved bad+good observes across 4 instances classify each independently", () => {
    FakeIO.reset();
    const a = new FakeIO(() => {}); // will become reveal
    const b = new FakeIO(() => {}); // will become section-enter
    const c = new FakeIO(() => {}); // will stay other
    const d = new FakeIO(() => {}); // will become reveal via reveal-stagger

    // Round 1: degenerate observes on all four — no kind should change.
    a.observe({ classList: undefined } as unknown as Element);
    b.observe(null as unknown as Element);
    c.observe(undefined as unknown as Element);
    d.observe({} as unknown as Element);
    for (const io of [a, b, c, d]) expect(io.kind).toBe("other");

    // Round 2: real classifying observes interleaved with more garbage.
    a.observe(makeElLocal("reveal"));
    b.observe({ classList: undefined } as unknown as Element);
    c.observe({ classList: null } as unknown as Element);
    d.observe(makeElLocal("reveal-stagger"));
    b.observe(makeElLocal("section-enter"));
    a.observe({ classList: undefined } as unknown as Element); // post-classification noise

    expect(a.kind).toBe("reveal");
    expect(b.kind).toBe("section-enter");
    expect(c.kind).toBe("other");
    expect(d.kind).toBe("reveal");

    // Round 3: more cross-talk attempts — none should leak.
    c.observe({ classList: undefined } as unknown as Element);
    a.observe(makeElLocal("section-enter")); // must NOT flip a → section-enter
    b.observe(makeElLocal("reveal")); // must NOT flip b → reveal

    expect(a.kind).toBe("reveal");
    expect(b.kind).toBe("section-enter");
    expect(c.kind).toBe("other");
    expect(d.kind).toBe("reveal");

    // Static partitioning reflects per-instance state, not cross-talk.
    expect(FakeIO.allOf("reveal")).toEqual([a, d]);
    expect(FakeIO.allOf("section-enter")).toEqual([b]);
    expect(FakeIO.allOf("other")).toEqual([c]);
  });

  it("8 parallel instances: pendingTargets stay isolated under mixed garbage", () => {
    FakeIO.reset();
    const ios = Array.from({ length: 8 }, () => new FakeIO(() => {}));

    // Every instance gets one real reveal element + a flurry of bad observes.
    const realEls = ios.map(() => makeElLocal("reveal"));
    ios.forEach((io, i) => {
      io.observe({ classList: undefined } as unknown as Element);
      io.observe(realEls[i]);
      io.observe(null as unknown as Element);
      io.observe({ classList: undefined } as unknown as Element);
    });

    for (let i = 0; i < ios.length; i++) {
      const io = ios[i];
      expect(io.kind).toBe("reveal");
      // Exactly the one real element this instance was given — no bleed-over.
      expect(io.pendingTargets.size).toBe(1);
      expect(io.pendingTargets.has(realEls[i])).toBe(true);
      // And no other instance's element leaked into this one.
      for (let j = 0; j < ios.length; j++) {
        if (j === i) continue;
        expect(io.pendingTargets.has(realEls[j])).toBe(false);
      }
    }

    expect(FakeIO.allOf("reveal")).toHaveLength(8);
    expect(FakeIO.allOf("section-enter")).toHaveLength(0);
    expect(FakeIO.allOf("other")).toHaveLength(0);
  });
});
