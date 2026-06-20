/**
 * Reveal class coverage — `.reveal`, `.reveal-stagger`, `.section-enter`.
 *
 * For each animation class, verifies that:
 *   1. Every element actually receives the `.is-visible` class once
 *      claimed by the IntersectionObserver.
 *   2. The matching telemetry bucket (`reveal` for `.reveal` /
 *      `.reveal-stagger`, `sectionEnter` for `.section-enter`) records
 *      the correct totals and per-source counts.
 *   3. The two buckets are isolated — claiming a `.reveal` does not
 *      inflate the `sectionEnter` counters and vice versa.
 *   4. Mixed-class trees (all three classes on the page at once)
 *      partition cleanly: every element is counted in exactly one
 *      bucket and every element ends up `.is-visible`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

// SiteLayout pulls heavy children that we don't need for these tests.
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

// Minimal fake IntersectionObserver — SiteLayout calls
// `new IntersectionObserver(...)` in its effects, so we need *a*
// constructor present. The observer body itself is irrelevant for
// these tests because the synchronous initial sweep claims every
// element under JSDOM's default (0,0,0,0) rect before any IO callback
// would have run.
class FakeIO {
  static instances: FakeIO[] = [];
  targets = new Set<Element>();
  constructor(_cb: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    FakeIO.instances.push(this);
  }
  observe(t: Element) {
    this.targets.add(t);
  }
  unobserve(t: Element) {
    this.targets.delete(t);
  }
  disconnect() {
    this.targets.clear();
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  static reset() {
    FakeIO.instances = [];
  }
}

const VH = 800;

beforeEach(() => {
  delete (window as unknown as { __yesRevealTelemetry?: unknown }).__yesRevealTelemetry;
  FakeIO.reset();
  vi.stubGlobal("IntersectionObserver", FakeIO as unknown as typeof IntersectionObserver);
  Object.defineProperty(window, "innerHeight", { value: VH, configurable: true });
  vi.stubGlobal(
    "matchMedia",
    (q: string) =>
      ({
        matches: false,
        media: q,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
  window.history.replaceState({}, "", "/");
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/**
 * In JSDOM every element returns a default rect of (0,0,0,0). The
 * initial sweep in SiteLayout treats this as "above the fold"
 * (`rect.top < vh * 0.95`) and immediately reveals + unobserves every
 * element. So tests don't need to fire IO entries — the sweepInitial
 * counter does the work, and we just assert `io + sweepInitial ==
 * total` (which holds whether the work was done by IO or by sweep).
 */

describe("reveal class coverage — .reveal / .reveal-stagger / .section-enter", () => {
  it(".reveal: each element gets .is-visible and lands in the `reveal` bucket", () => {
    const items = Array.from({ length: 3 }, (_, i) => (
      <div key={i} className="reveal" data-kind="reveal" />
    ));
    render(<SiteLayout>{items}</SiteLayout>);

    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    expect(els).toHaveLength(3);

    // Initial sweep claims everything synchronously (default JSDOM
    // rect = 0,0,0,0 satisfies the on-screen check).

    const t = window.__yesRevealTelemetry!;
    expect(t.reveal.total).toBe(3);
    expect(t.reveal.io + t.reveal.sweepInitial).toBe(3);
    expect(t.reveal.pending).toBe(0);
    // Cross-bucket isolation: section-enter must stay untouched.
    expect(t.sectionEnter.total).toBe(0);
    expect(t.sectionEnter.io).toBe(0);
    expect(t.sectionEnter.sweepInitial).toBe(0);
    expect(t.sectionEnter.sweepDelayed).toBe(0);

    els.forEach((el) => expect(el.classList.contains("is-visible")).toBe(true));
  });

  it(".reveal-stagger: each element gets .is-visible, lands in `reveal` bucket, and receives a transition delay", () => {
    // Wrap stagger items in a parent so SiteLayout assigns sequential
    // delays based on sibling index.
    render(
      <SiteLayout>
        <section>
          <div className="reveal-stagger" data-i="0" />
          <div className="reveal-stagger" data-i="1" />
          <div className="reveal-stagger" data-i="2" />
        </section>
      </SiteLayout>,
    );

    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal-stagger"));
    expect(els).toHaveLength(3);

    // Initial sweep claims everything synchronously.

    const t = window.__yesRevealTelemetry!;
    expect(t.reveal.total).toBe(3);
    expect(t.reveal.io + t.reveal.sweepInitial).toBe(3);
    expect(t.reveal.pending).toBe(0);
    expect(t.sectionEnter.total).toBe(0);

    els.forEach((el) => expect(el.classList.contains("is-visible")).toBe(true));
    // Stagger cadence side-effect: each sibling gets a transitionDelay
    // proportional to its sibling index (0ms, 110ms, 220ms in
    // SiteLayout's current cadence). We assert monotonically
    // non-decreasing rather than exact values so cadence tweaks don't
    // break this test.
    const delays = els.map((el) => parseInt(el.style.transitionDelay || "0", 10));
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBeGreaterThan(0);
    expect(delays[2]).toBeGreaterThanOrEqual(delays[1]);
  });

  it(".section-enter: each element gets .is-visible and lands in the `sectionEnter` bucket", () => {
    const sections = Array.from({ length: 2 }, (_, i) => (
      <section key={i} className="section-enter" data-kind="section" />
    ));
    render(<SiteLayout>{sections}</SiteLayout>);

    const els = Array.from(document.querySelectorAll<HTMLElement>(".section-enter"));
    expect(els).toHaveLength(2);

    // Initial sweep claims everything synchronously.

    const t = window.__yesRevealTelemetry!;
    expect(t.sectionEnter.total).toBe(2);
    expect(t.sectionEnter.io + t.sectionEnter.sweepInitial).toBe(2);
    expect(t.sectionEnter.pending).toBe(0);
    // Cross-bucket isolation: reveal bucket must stay at zero.
    expect(t.reveal.total).toBe(0);
    expect(t.reveal.io).toBe(0);
    expect(t.reveal.sweepInitial).toBe(0);
    expect(t.reveal.sweepDelayed).toBe(0);

    els.forEach((el) => expect(el.classList.contains("is-visible")).toBe(true));
  });

  it("mixed tree: counters partition cleanly across .reveal, .reveal-stagger and .section-enter", () => {
    render(
      <SiteLayout>
        <section className="section-enter">
          <div className="reveal" />
          <div className="reveal-stagger" />
          <div className="reveal-stagger" />
        </section>
        <section className="section-enter">
          <div className="reveal" />
        </section>
      </SiteLayout>,
    );

    const reveals = Array.from(document.querySelectorAll<HTMLElement>(".reveal, .reveal-stagger"));
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".section-enter"));
    expect(reveals).toHaveLength(4);
    expect(sections).toHaveLength(2);

    // Initial sweeps for both observers claim everything synchronously
    // at mount under JSDOM's default rect of (0,0,0,0).

    const t = window.__yesRevealTelemetry!;
    // Per-class counter assertions:
    expect(t.reveal.total).toBe(4);
    expect(t.reveal.io + t.reveal.sweepInitial).toBe(4);
    expect(t.reveal.pending).toBe(0);
    expect(t.sectionEnter.total).toBe(2);
    expect(t.sectionEnter.io + t.sectionEnter.sweepInitial).toBe(2);
    expect(t.sectionEnter.pending).toBe(0);

    // Class-flip side-effect: every animated node ends up visible.
    [...reveals, ...sections].forEach((el) =>
      expect(el.classList.contains("is-visible")).toBe(true),
    );

    // Conservation check: the sum across both buckets equals the total
    // animated nodes — proving no element is double-counted and none
    // is missed.
    const totalClaimed =
      t.reveal.io +
      t.reveal.sweepInitial +
      t.reveal.sweepDelayed +
      t.sectionEnter.io +
      t.sectionEnter.sweepInitial +
      t.sectionEnter.sweepDelayed;
    expect(totalClaimed).toBe(reveals.length + sections.length);
  });

  it("IO never fires + initial sweep misses → sweepDelayed alone applies .is-visible and updates counters", () => {
    // Goal: prove the 250ms safety-net is functional in isolation.
    //
    // Setup recipe:
    //   1. Override Element.prototype.getBoundingClientRect so the
    //      INITIAL sweep sees rects firmly below the fold (skip), and
    //      the DELAYED sweep sees rects "scrolled past" (claim).
    //   2. The fake IntersectionObserver never fires — it's a no-op.
    //   3. Use fake timers so we can advance to the 250ms tick on
    //      demand and assert state both before and after.
    vi.useFakeTimers();

    let phase: "initial" | "delayed" = "initial";
    const realRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      // Only redirect rects for animated nodes — leave everything else
      // alone so React/JSDOM internals stay sane.
      const isAnimated =
        this instanceof Element &&
        (this.classList.contains("reveal") ||
          this.classList.contains("reveal-stagger") ||
          this.classList.contains("section-enter"));
      if (!isAnimated) return realRect.call(this);
      if (phase === "initial") {
        // Below the fold: top > vh*0.95 AND bottom > 0 → sweep skips.
        return {
          top: VH + 200,
          bottom: VH + 400,
          left: 0,
          right: 100,
          width: 100,
          height: 200,
          x: 0,
          y: VH + 200,
          toJSON: () => ({}),
        } as DOMRect;
      }
      // Scrolled past: bottom <= 0 → delayed sweep claims it.
      return {
        top: -400,
        bottom: -200,
        left: 0,
        right: 100,
        width: 100,
        height: 200,
        x: 0,
        y: -400,
        toJSON: () => ({}),
      } as DOMRect;
    };

    try {
      render(
        <SiteLayout>
          <div className="reveal" />
          <div className="reveal-stagger" />
          <section className="section-enter" />
        </SiteLayout>,
      );

      const reveal = document.querySelector<HTMLElement>(".reveal")!;
      const stagger = document.querySelector<HTMLElement>(".reveal-stagger")!;
      const section = document.querySelector<HTMLElement>(".section-enter")!;
      const t = window.__yesRevealTelemetry!;

      // Phase 1 — immediately after mount: initial sweeps ran but saw
      // below-the-fold rects and skipped. IO never fires. Nothing
      // should be visible yet, and every counter should be zero.
      expect(reveal.classList.contains("is-visible")).toBe(false);
      expect(stagger.classList.contains("is-visible")).toBe(false);
      expect(section.classList.contains("is-visible")).toBe(false);
      expect(t.reveal.io).toBe(0);
      expect(t.reveal.sweepInitial).toBe(0);
      expect(t.reveal.sweepDelayed).toBe(0);
      expect(t.sectionEnter.io).toBe(0);
      expect(t.sectionEnter.sweepInitial).toBe(0);
      expect(t.sectionEnter.sweepDelayed).toBe(0);
      // Totals were registered by setTotal regardless of sweep result.
      expect(t.reveal.total).toBe(2);
      expect(t.sectionEnter.total).toBe(1);
      // Pending = total - claimed → still all unclaimed at this point.
      expect(t.reveal.pending).toBe(2);
      expect(t.sectionEnter.pending).toBe(1);

      // Phase 2 — advance past 600ms. The delayed sweep now sees
      // "scrolled past" rects and must claim every element.
      phase = "delayed";
      vi.advanceTimersByTime(700);

      // Class-flip side-effect must have happened on every node.
      expect(reveal.classList.contains("is-visible")).toBe(true);
      expect(stagger.classList.contains("is-visible")).toBe(true);
      expect(section.classList.contains("is-visible")).toBe(true);

      // Every claim must be attributed to sweepDelayed — IO and
      // sweepInitial stay at zero (proving the delayed sweep, alone,
      // did the work).
      expect(t.reveal.io).toBe(0);
      expect(t.reveal.sweepInitial).toBe(0);
      expect(t.reveal.sweepDelayed).toBe(2);
      expect(t.reveal.pending).toBe(0);

      expect(t.sectionEnter.io).toBe(0);
      expect(t.sectionEnter.sweepInitial).toBe(0);
      expect(t.sectionEnter.sweepDelayed).toBe(1);
      expect(t.sectionEnter.pending).toBe(0);
    } finally {
      Element.prototype.getBoundingClientRect = realRect;
    }
  });

  /**
   * Telemetry / DOM reset guarantee.
   *
   * Goal: prove that the per-test reset machinery (beforeEach +
   * afterEach + cleanup) leaves a pristine slate between scenarios:
   *   - `window.__yesRevealTelemetry` is wiped (deleted), so a fresh
   *     mount starts at zero — counters never leak from a previous run.
   *   - The DOM is fully cleaned: no `.reveal`, `.reveal-stagger`, or
   *     `.section-enter` nodes survive, so no stale `.is-visible`
   *     flags can be observed by the next scenario.
   *   - Re-rendering after reset reproduces the same fully-claimed
   *     end state (parity with the first run) — the telemetry object
   *     is recreated, not reused.
   *
   * This test runs three back-to-back scenarios inside a single `it`
   * to exercise reset *between* render/cleanup cycles within one test,
   * complementing the implicit reset that `beforeEach` provides
   * across tests.
   */
  it("reset: telemetry + .is-visible flags return to a clean state before each new scenario", () => {
    type Telemetry = NonNullable<typeof window.__yesRevealTelemetry>;
    const ZERO_BUCKET = {
      total: 0,
      io: 0,
      sweepInitial: 0,
      sweepDelayed: 0,
      pending: 0,
    } as const;

    const expectCleanSlate = (label: string) => {
      // Telemetry global must be absent (deleted by beforeEach OR by
      // our manual reset below) — not merely zeroed-in-place.
      expect(
        (window as unknown as { __yesRevealTelemetry?: unknown }).__yesRevealTelemetry,
        `${label}: telemetry global should be absent before mount`,
      ).toBeUndefined();
      // No animated nodes should linger in the DOM from a prior run.
      expect(
        document.querySelectorAll(".reveal, .reveal-stagger, .section-enter").length,
        `${label}: DOM should have no animated nodes pre-mount`,
      ).toBe(0);
      // And of course no stray `.is-visible` flags anywhere.
      expect(
        document.querySelectorAll(".is-visible").length,
        `${label}: DOM should have no .is-visible flags pre-mount`,
      ).toBe(0);
    };

    const expectFullyClaimed = (
      t: Telemetry,
      revealCount: number,
      sectionCount: number,
      label: string,
    ) => {
      expect(t.reveal.total, `${label}: reveal total`).toBe(revealCount);
      expect(
        t.reveal.io + t.reveal.sweepInitial + t.reveal.sweepDelayed,
        `${label}: reveal claimed sum`,
      ).toBe(revealCount);
      expect(t.reveal.pending, `${label}: reveal pending`).toBe(0);
      expect(t.sectionEnter.total, `${label}: section total`).toBe(sectionCount);
      expect(
        t.sectionEnter.io + t.sectionEnter.sweepInitial + t.sectionEnter.sweepDelayed,
        `${label}: section claimed sum`,
      ).toBe(sectionCount);
      expect(t.sectionEnter.pending, `${label}: section pending`).toBe(0);
    };

    // ------------------------------------------------------------------
    // Scenario A — first mount. Confirms a clean baseline and full claim.
    // ------------------------------------------------------------------
    expectCleanSlate("scenario A");
    const { unmount: unmountA } = render(
      <SiteLayout>
        <div className="reveal" data-scenario="A" />
        <div className="reveal" data-scenario="A" />
        <section className="section-enter" data-scenario="A" />
      </SiteLayout>,
    );
    const tA = window.__yesRevealTelemetry!;
    expectFullyClaimed(tA, 2, 1, "scenario A");
    document
      .querySelectorAll<HTMLElement>(".reveal, .section-enter")
      .forEach((el) => expect(el.classList.contains("is-visible")).toBe(true));

    // Manual mid-test reset — same shape as beforeEach. This is the
    // moment the test is really about: between scenarios, both the DOM
    // and the telemetry global must come back to zero.
    unmountA();
    cleanup();
    delete (window as unknown as { __yesRevealTelemetry?: unknown }).__yesRevealTelemetry;
    FakeIO.reset();

    // ------------------------------------------------------------------
    // Scenario B — second mount. Counters must NOT carry over from A;
    // they must start at zero and reflect only B's nodes.
    // ------------------------------------------------------------------
    expectCleanSlate("scenario B");
    const { unmount: unmountB } = render(
      <SiteLayout>
        <div className="reveal-stagger" data-scenario="B" />
        <section className="section-enter" data-scenario="B" />
        <section className="section-enter" data-scenario="B" />
      </SiteLayout>,
    );
    const tB = window.__yesRevealTelemetry!;
    // Identity check: a brand-new telemetry object, not A's mutated
    // back to zero — proves the reset deleted, not just zeroed.
    expect(tB).not.toBe(tA);
    // Bucket totals reflect B's tree only (1 stagger + 2 sections),
    // never A's 2+1.
    expectFullyClaimed(tB, 1, 2, "scenario B");
    document
      .querySelectorAll<HTMLElement>(".reveal-stagger, .section-enter")
      .forEach((el) => expect(el.classList.contains("is-visible")).toBe(true));

    // Reset again before the final scenario.
    unmountB();
    cleanup();
    delete (window as unknown as { __yesRevealTelemetry?: unknown }).__yesRevealTelemetry;
    FakeIO.reset();

    // ------------------------------------------------------------------
    // Scenario C — empty tree. With zero animated nodes, the telemetry
    // object must still be created (SiteLayout always installs it),
    // every bucket must be exactly zero, and no `.is-visible` flag may
    // exist anywhere — a strict baseline that catches "ghost" leakage
    // from earlier scenarios.
    // ------------------------------------------------------------------
    expectCleanSlate("scenario C");
    render(<SiteLayout>{null}</SiteLayout>);
    const tC = window.__yesRevealTelemetry!;
    expect(tC).not.toBe(tA);
    expect(tC).not.toBe(tB);
    expect(tC.reveal).toEqual(ZERO_BUCKET);
    expect(tC.sectionEnter).toEqual(ZERO_BUCKET);
    expect(document.querySelectorAll(".is-visible").length).toBe(0);
  });
});
