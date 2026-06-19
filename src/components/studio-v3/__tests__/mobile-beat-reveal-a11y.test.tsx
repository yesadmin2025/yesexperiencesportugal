// Accessibility & keyboard contract for MobileBeatReveal.
//
// The overlay is a transient, polite live-region announcer (not a modal
// dialog). It must:
//   • announce the new beat to AT without stealing focus
//   • keep pointer-events: none so underlying CTAs stay reachable
//   • mark decorative pins as aria-hidden
//   • collapse to no-op under prefers-reduced-motion
//   • behave identically across light & dark themes
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, act } from "@testing-library/react";
import { MobileBeatReveal } from "../MobileBeatReveal";

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({
      matches: q.includes("reduce") ? matches : false,
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

function withTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
  withTheme("light");
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  document.documentElement.removeAttribute("data-theme");
});

describe("MobileBeatReveal a11y", () => {
  it.each(["light", "dark"] as const)(
    "[%s theme] is a polite status region with the beat title accessible name",
    (theme) => {
      withTheme(theme);
      render(<MobileBeatReveal beat="region" index={0} onDone={() => {}} />);
      const overlay = screen.getByTestId("studio-v3-mobile-beat-reveal");
      expect(overlay).toHaveAttribute("role", "status");
      expect(overlay).toHaveAttribute("aria-live", "polite");
      expect(overlay).toHaveAttribute("data-beat", "region");
      // Title text is announced
      expect(overlay.textContent).toContain("Where it begins");
    },
  );

  it("marks the decorative pin constellation as aria-hidden", () => {
    const { container } = render(
      <MobileBeatReveal beat="rhythm" index={1} onDone={() => {}} />,
    );
    const constellation = container.querySelector('[aria-hidden="true"]');
    expect(constellation).toBeTruthy();
  });

  it("does not trap focus or block clicks on underlying CTAs (pointer-events: none)", () => {
    const { container } = render(
      <MobileBeatReveal beat="dates" index={2} onDone={() => {}} />,
    );
    const overlay = container.querySelector(
      '[data-testid="studio-v3-mobile-beat-reveal"]',
    ) as HTMLElement;
    expect(overlay.style.pointerEvents).toBe("none");
    // No focusable elements inside
    expect(overlay.querySelectorAll("button, a, input, [tabindex]")).toHaveLength(0);
  });

  it("under prefers-reduced-motion calls onDone immediately and renders nothing", () => {
    setReducedMotion(true);
    const onDone = vi.fn();
    const { container } = render(
      <MobileBeatReveal beat="region" index={0} onDone={onDone} />,
    );
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="studio-v3-mobile-beat-reveal"]'))
      .toBeNull();
  });

  it("auto-dismisses and fires onDone after the cinematic window completes", () => {
    const onDone = vi.fn();
    render(<MobileBeatReveal beat="compose" index={3} onDone={onDone} />);
    expect(screen.getByTestId("studio-v3-mobile-beat-reveal")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(280 + 1200 + 320 + 50);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("clearing beat=null tears the overlay down without leaving live-region noise", () => {
    const { rerender, container } = render(
      <MobileBeatReveal beat="region" index={0} onDone={() => {}} />,
    );
    expect(container.querySelector('[data-testid="studio-v3-mobile-beat-reveal"]'))
      .toBeInTheDocument();
    rerender(<MobileBeatReveal beat={null} index={0} onDone={() => {}} />);
    expect(container.querySelector('[data-testid="studio-v3-mobile-beat-reveal"]'))
      .toBeNull();
  });
});
