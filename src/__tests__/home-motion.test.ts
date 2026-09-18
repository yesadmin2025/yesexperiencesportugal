/**
 * Smoke test for the homepage `data-motion` controller.
 *
 * Verifies the production contract:
 *   1. Before boot, `[data-motion]` elements are visible (no rule
 *      hides them until `html.motion-ready` is added).
 *   2. After boot, controller adds `html.motion-ready`.
 *   3. Elements inside the entry zone receive `motion-in`.
 *   4. Elements far below the fold do NOT receive `motion-in` at boot.
 *   5. Scrolling brings them into the entry zone → they receive
 *      `motion-in` on the next sweep.
 *   6. Under `prefers-reduced-motion: reduce`, every element is
 *      marked `motion-in` immediately and `motion-ready` is NOT set.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { startHomeMotion } from "@/lib/home-motion";

function makeNode(top: number, height = 200): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("data-motion", "fade-up");
  // jsdom does not lay out → stub getBoundingClientRect.
  el.getBoundingClientRect = () =>
    ({
      top,
      bottom: top + height,
      left: 0,
      right: 320,
      width: 320,
      height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

function flushRaf() {
  // jsdom rAF is microtask-ish; nudge with a few ticks.
  return new Promise<void>((resolve) => setTimeout(resolve, 20));
}

describe("home-motion controller", () => {
  let dispose: () => void;

  beforeEach(() => {
    document.documentElement.className = "";
    document.body.innerHTML = "";
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      configurable: true,
      writable: true,
    });
    // Force not-reduced-motion by default.
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    dispose?.();
  });

  it("does not hide content before boot (motion-ready absent)", () => {
    makeNode(100);
    expect(document.documentElement.classList.contains("motion-ready")).toBe(false);
  });

  it("adds motion-ready after boot and triggers in-fold elements", async () => {
    const inFold = makeNode(200); // top < 800 * 0.88 = 704
    const belowFold = makeNode(2000); // far below — should stay pending
    dispose = startHomeMotion();
    await flushRaf();
    expect(document.documentElement.classList.contains("motion-ready")).toBe(true);
    expect(inFold.classList.contains("motion-in")).toBe(true);
    expect(belowFold.classList.contains("motion-in")).toBe(false);
  });

  it("triggers below-fold elements after they enter the entry zone on scroll", async () => {
    const el = makeNode(2000);
    dispose = startHomeMotion();
    await flushRaf();
    expect(el.classList.contains("motion-in")).toBe(false);

    // Simulate scroll bringing it into view by mutating its rect.
    el.getBoundingClientRect = () =>
      ({
        top: 300,
        bottom: 500,
        left: 0,
        right: 320,
        width: 320,
        height: 200,
        x: 0,
        y: 300,
        toJSON: () => ({}),
      }) as DOMRect;

    window.dispatchEvent(new Event("scroll"));
    await flushRaf();
    expect(el.classList.contains("motion-in")).toBe(true);
  });

  it("leaves legacy reveal classes to the SiteLayout controller", async () => {
    const legacy = document.createElement("div");
    legacy.className = "reveal";
    legacy.getBoundingClientRect = () =>
      ({
        top: 100,
        bottom: 300,
        left: 0,
        right: 0,
        width: 0,
        height: 200,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(legacy);
    dispose = startHomeMotion();
    await flushRaf();
    expect(legacy.hasAttribute("data-motion")).toBe(false);
    expect(legacy.classList.contains("motion-in")).toBe(false);
  });

  it("auto-tags public editorial headings, imagery, and conversion actions", async () => {
    document.documentElement.dataset.motionScope = "marketing";
    document.body.innerHTML = `
      <main>
        <section>
          <h1>Portugal, privately</h1>
          <figure><img alt="Coast" /></figure>
          <a class="premium-cta" href="/experiences">Explore</a>
        </section>
      </main>
    `;
    document.querySelectorAll<HTMLElement>("h1, figure, a").forEach((el) => {
      el.getBoundingClientRect = () =>
        ({ top: 100, bottom: 200, left: 0, right: 320, width: 320, height: 100, x: 0, y: 100, toJSON: () => ({}) }) as DOMRect;
    });

    dispose = startHomeMotion();
    await flushRaf();

    expect(document.querySelector("h1")?.getAttribute("data-motion")).toBe("editorial-clip");
    expect(document.querySelector("figure")?.getAttribute("data-motion")).toBe("settle");
    expect(document.querySelector("a")?.getAttribute("data-motion")).toBe("settle");
  });

  it("auto-tags supporting copy and repeated discovery cards", async () => {
    document.documentElement.dataset.motionScope = "marketing";
    document.body.innerHTML = `
      <main><section>
        <p>Choose the day that feels right.</p>
        <ul>
          <li><h3>Arrábida</h3><a href="/tours/arrabida">Reserve</a></li>
          <li><h3>Sintra</h3><a href="/tours/sintra">Reserve</a></li>
        </ul>
      </section></main>
    `;
    document.querySelectorAll<HTMLElement>("p, li, h3").forEach((el) => {
      el.getBoundingClientRect = () =>
        ({ top: 100, bottom: 200, left: 0, right: 320, width: 320, height: 100, x: 0, y: 100, toJSON: () => ({}) }) as DOMRect;
    });
    dispose = startHomeMotion();
    await flushRaf();

    expect(document.querySelector("p")?.getAttribute("data-motion")).toBe("editorial-clip");
    const cards = document.querySelectorAll("li");
    expect(cards[0]?.getAttribute("data-motion")).toBe("settle");
    expect(cards[1]?.getAttribute("data-motion-delay")).toBe("100");
  });

  it("does not double-tag content already owned by a legacy reveal", async () => {
    document.documentElement.dataset.motionScope = "marketing";
    document.body.innerHTML = `
      <main><section><div class="reveal"><h2>One calm entrance</h2></div></section></main>
    `;
    dispose = startHomeMotion();
    await flushRaf();
    expect(document.querySelector("h2")?.hasAttribute("data-motion")).toBe(false);
  });

  it("under prefers-reduced-motion, marks everything motion-in and skips motion-ready", () => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    const a = makeNode(100);
    const b = makeNode(5000);
    dispose = startHomeMotion();
    expect(a.classList.contains("motion-in")).toBe(true);
    expect(b.classList.contains("motion-in")).toBe(true);
    expect(document.documentElement.classList.contains("motion-ready")).toBe(false);
  });
});
