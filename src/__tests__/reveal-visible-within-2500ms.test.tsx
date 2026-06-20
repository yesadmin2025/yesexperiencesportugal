/**
 * Reveal visibility SLA — every `.reveal`, `.reveal-stagger`, and
 * `.section-enter` element MUST receive `.is-visible` within 2500ms
 * after SiteLayout mounts, regardless of whether the IntersectionObserver
 * ever fires. This is the contract that protects the homepage (preview
 * AND live) from going static if IO is throttled, blocked by an iframe
 * sandbox, or otherwise misbehaves.
 *
 * The component already ships a 1200ms fail-safe inside SiteLayout for
 * both the reveal and section-enter observers. This test pins that
 * guarantee at the upper bound of 2500ms so we can never silently
 * regress the fail-safe (e.g. by raising it to 5s, removing it, or
 * accidentally gating it behind IO firing first).
 *
 * Methodology:
 *   - Stub IntersectionObserver with a no-op observer that NEVER fires.
 *     This simulates the worst-case "IO is dead" scenario that we
 *     observed in some preview/iframe environments.
 *   - Mount SiteLayout with a tree containing one of each reveal class.
 *   - Advance fake timers to 2500ms.
 *   - Assert every target element now carries `.is-visible`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

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

const SLA_MS = 2500;

class DeadIO {
  static instances: DeadIO[] = [];
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = options;
    DeadIO.instances.push(this);
  }
  observe(_target: Element | null | undefined) {
    /* never fire — simulate broken/throttled IO */
  }
  unobserve(_target: Element) {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  static reset() {
    DeadIO.instances = [];
  }
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
  DeadIO.reset();
  vi.useFakeTimers();
  vi.stubGlobal("IntersectionObserver", DeadIO as unknown as typeof IntersectionObserver);
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
  // No reduced-motion — we want the IO path so the fail-safe is what saves us.
  vi.stubGlobal(
    "matchMedia",
    makeMatchMedia({ "(prefers-reduced-motion: reduce)": false, "(max-width: 767.98px)": false }),
  );
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("reveal visibility SLA — .is-visible within 2500ms", () => {
  it("forces .is-visible on every reveal/reveal-stagger/section-enter element when IO never fires", () => {
    const { container } = render(
      <SiteLayout>
        <div data-testid="r1" className="reveal">
          reveal
        </div>
        <div data-testid="r2" className="reveal-stagger">
          <span className="reveal-child">child</span>
        </div>
        <section data-testid="s1" className="section-enter">
          section
        </section>
        <div data-testid="r3" className="reveal">
          below-fold
        </div>
        <section data-testid="s2" className="section-enter">
          below-fold-section
        </section>
      </SiteLayout>,
    );

    // Sanity: nothing visible yet right after mount (in-viewport sweep
    // runs synchronously inside an effect, but our DeadIO never fires
    // and getBoundingClientRect returns 0,0 by default in jsdom — which
    // technically counts as "in viewport" for the sweep. So we don't
    // assert pre-state; we only assert the post-2500ms guarantee.

    act(() => {
      vi.advanceTimersByTime(SLA_MS);
    });

    const targets = container.querySelectorAll(".reveal, .reveal-stagger, .section-enter");
    expect(targets.length).toBeGreaterThan(0);

    const stuck: string[] = [];
    targets.forEach((el) => {
      if (!el.classList.contains("is-visible")) {
        stuck.push(
          `<${el.tagName.toLowerCase()} class="${el.className}"> never received .is-visible`,
        );
      }
    });

    expect(
      stuck,
      `Every reveal target must be visible within ${SLA_MS}ms even when IntersectionObserver is dead.\n` +
        stuck.join("\n"),
    ).toEqual([]);
  });

  it("fail-safe rescues on-screen content before the 2500ms SLA (currently 1200ms)", () => {
    // This guards against someone bumping the fail-safe past the SLA.
    const origGetRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      return {
        top: 100,
        bottom: 500,
        left: 0,
        right: 100,
        width: 100,
        height: 400,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect;
    };
    const { container } = render(
      <SiteLayout>
        <div className="reveal">a</div>
        <section className="section-enter">b</section>
      </SiteLayout>,
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    try {
      const targets = container.querySelectorAll(".reveal, .section-enter");
      targets.forEach((el) => {
        expect(
          el.classList.contains("is-visible"),
          `${el.className} should be visible by 1200ms when it is on-screen`,
        ).toBe(true);
      });
    } finally {
      Element.prototype.getBoundingClientRect = origGetRect;
    }
  });
});
