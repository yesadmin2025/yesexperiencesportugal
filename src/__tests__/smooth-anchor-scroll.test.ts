/**
 * Smooth anchor scroll — unit tests.
 *
 * Verifies:
 *   · Hash links call window.scrollTo with the correct offset (navbar
 *     baseline OR the element's scroll-margin-top, whichever is larger).
 *   · Modifier-clicks / non-primary buttons / external hrefs are ignored.
 *   · prefers-reduced-motion forces behavior:"auto" so there is no
 *     animated jump.
 *   · Same-pathname `/path#anchor` form is recognised.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installSmoothAnchorScroll } from "@/lib/smooth-anchor-scroll";

let dispose: () => void;

function setupTarget(id = "section-a", topOffsetPx = 1200) {
  document.body.innerHTML = `
    <a id="link" href="#${id}">Go</a>
    <section id="${id}" data-target>Target</section>
  `;
  const target = document.getElementById(id)!;
  // jsdom doesn't lay out — fake getBoundingClientRect.
  target.getBoundingClientRect = () =>
    ({
      top: topOffsetPx,
      left: 0,
      right: 0,
      bottom: topOffsetPx + 200,
      width: 0,
      height: 200,
      x: 0,
      y: topOffsetPx,
      toJSON: () => ({}),
    }) as DOMRect;
  return target;
}

describe("smooth-anchor-scroll", () => {
  let scrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollToMock = vi.fn();
    Object.defineProperty(window, "scrollTo", {
      value: scrollToMock,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 393, writable: true, configurable: true });
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as never;
    dispose = installSmoothAnchorScroll();
  });

  afterEach(() => {
    dispose?.();
    document.body.innerHTML = "";
  });

  it("scrolls smoothly to the target with the mobile navbar offset (80px)", () => {
    setupTarget("hello", 1000);
    const link = document.getElementById("link")!;
    link.click();
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 1000 - 80, behavior: "smooth" });
  });

  it("uses the desktop offset (96px) at >=1024px", () => {
    Object.defineProperty(window, "innerWidth", {
      value: 1280,
      writable: true,
      configurable: true,
    });
    setupTarget("hello", 1000);
    document.getElementById("link")!.click();
    expect(scrollToMock).toHaveBeenCalledWith({ top: 1000 - 96, behavior: "smooth" });
  });

  it("uses the larger of scroll-margin-top vs navbar baseline", () => {
    const target = setupTarget("hello", 1000);
    target.style.scrollMarginTop = "120px";
    document.getElementById("link")!.click();
    // scroll-mt 120 > 80 baseline → use 120
    expect(scrollToMock).toHaveBeenCalledWith({ top: 1000 - 120, behavior: "smooth" });
  });

  it("respects prefers-reduced-motion (behavior:auto)", () => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes("reduce"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as never;
    setupTarget("hello", 1000);
    document.getElementById("link")!.click();
    expect(scrollToMock).toHaveBeenCalledWith({ top: 920, behavior: "auto" });
  });

  it("ignores meta-clicks (open in new tab)", () => {
    setupTarget("hello", 1000);
    const link = document.getElementById("link")! as HTMLAnchorElement;
    link.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, metaKey: true }),
    );
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("ignores middle-click (button !== 0)", () => {
    setupTarget("hello", 1000);
    const link = document.getElementById("link")! as HTMLAnchorElement;
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 1 }));
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("ignores links to a different pathname", () => {
    document.body.innerHTML = `<a id="link" href="/other#hello">Go</a><section id="hello"></section>`;
    document.getElementById("link")!.click();
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("handles same-pathname /path#anchor links", () => {
    const path = window.location.pathname;
    document.body.innerHTML = `<a id="link" href="${path}#hello">Go</a><section id="hello"></section>`;
    const target = document.getElementById("hello")!;
    target.getBoundingClientRect = () =>
      ({
        top: 500,
        left: 0,
        right: 0,
        bottom: 700,
        width: 0,
        height: 200,
        x: 0,
        y: 500,
        toJSON: () => ({}),
      }) as DOMRect;
    document.getElementById("link")!.click();
    expect(scrollToMock).toHaveBeenCalledWith({ top: 420, behavior: "smooth" });
  });

  it("does nothing when the target id is missing", () => {
    document.body.innerHTML = `<a id="link" href="#nope">Go</a>`;
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    document.getElementById("link")!.dispatchEvent(ev);
    expect(scrollToMock).not.toHaveBeenCalled();
    // Native default not prevented, so the browser would fall back to its
    // own (no-op) behaviour.
    expect(ev.defaultPrevented).toBe(false);
  });

  it("does not clamp negative tops (Math.max(0, top))", () => {
    setupTarget("hello", 10); // very near top
    document.getElementById("link")!.click();
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
