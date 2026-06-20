/**
 * Iframe footer-jump runtime guard tests.
 *
 * Verifies that:
 *  · isInIframe returns true when window.self !== window.top
 *  · The guard is a no-op outside an iframe
 *  · A programmatic "jump to footer" scroll inside an iframe is reverted
 *  · A genuine user scroll (after wheel/touch input) is left alone
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installIframeFooterGuard, isInIframe } from "../lib/iframe-footer-guard";

type MockWin = Window & {
  scrollY: number;
  innerHeight: number;
};

function makeWindow(opts: {
  isIframe: boolean;
  scrollHeight: number;
  innerHeight: number;
}): MockWin {
  const listeners = new Map<string, Set<EventListener>>();
  const scrollTo = vi.fn((arg: ScrollToOptions | number, y?: number) => {
    const top = typeof arg === "number" ? y! : arg.top!;
    (win as unknown as { scrollY: number }).scrollY = top;
  });

  const win = {
    scrollY: 0,
    innerHeight: opts.innerHeight,
    document: {
      documentElement: { scrollHeight: opts.scrollHeight },
    },
    addEventListener(type: string, fn: EventListener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: EventListener) {
      listeners.get(type)?.delete(fn);
    },
    scrollTo,
    __dispatch: (type: string) => {
      listeners.get(type)?.forEach((fn) => fn(new Event(type)));
    },
  } as unknown as MockWin & {
    __dispatch: (t: string) => void;
    scrollTo: typeof scrollTo;
  };

  // Simulate iframe vs top-level
  Object.defineProperty(win, "self", { value: win });
  Object.defineProperty(win, "top", { value: opts.isIframe ? {} : win });

  return win;
}

describe("isInIframe", () => {
  it("returns true when self !== top", () => {
    const win = makeWindow({ isIframe: true, scrollHeight: 5000, innerHeight: 800 });
    expect(isInIframe(win)).toBe(true);
  });
  it("returns false at top level", () => {
    const win = makeWindow({ isIframe: false, scrollHeight: 5000, innerHeight: 800 });
    expect(isInIframe(win)).toBe(false);
  });
});

describe("installIframeFooterGuard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is a no-op outside an iframe", () => {
    const win = makeWindow({ isIframe: false, scrollHeight: 5000, innerHeight: 800 });
    const dispose = installIframeFooterGuard({}, win);
    win.scrollY = 4200; // would trigger if active
    (win as unknown as { __dispatch: (t: string) => void }).__dispatch("scroll");
    expect(
      (win as unknown as { scrollTo: ReturnType<typeof vi.fn> }).scrollTo,
    ).not.toHaveBeenCalled();
    dispose();
  });

  it("reverts a programmatic jump to the footer inside an iframe", () => {
    const win = makeWindow({ isIframe: true, scrollHeight: 5000, innerHeight: 800 });
    const dispose = installIframeFooterGuard({}, win);

    // Establish a "safe" mid-page position.
    win.scrollY = 1200;
    (win as unknown as { __dispatch: (t: string) => void }).__dispatch("scroll");

    // Programmatic jump to bottom (no recent user input).
    win.scrollY = 4250; // within 120px of bottom (5000 - 800 = 4200 max)
    (win as unknown as { __dispatch: (t: string) => void }).__dispatch("scroll");

    const scrollTo = (win as unknown as { scrollTo: ReturnType<typeof vi.fn> }).scrollTo;
    expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: "auto" });
    dispose();
  });

  it("respects a genuine user scroll after wheel input", () => {
    const win = makeWindow({ isIframe: true, scrollHeight: 5000, innerHeight: 800 });
    const dispose = installIframeFooterGuard({}, win);

    win.scrollY = 1200;
    (win as unknown as { __dispatch: (t: string) => void }).__dispatch("scroll");

    // User scrolls — wheel event fires shortly before scroll.
    (win as unknown as { __dispatch: (t: string) => void }).__dispatch("wheel");
    win.scrollY = 4250;
    (win as unknown as { __dispatch: (t: string) => void }).__dispatch("scroll");

    const scrollTo = (win as unknown as { scrollTo: ReturnType<typeof vi.fn> }).scrollTo;
    expect(scrollTo).not.toHaveBeenCalled();
    dispose();
  });
});
