import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { CurtainRise } from "../CurtainRise";
import { INITIAL_STATE } from "../types";

describe("CurtainRise — Signature reveal curtain", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the YES voice mark + Portugal voice when no Signature has resolved", () => {
    render(<CurtainRise state={INITIAL_STATE} />);
    const root = screen.getByTestId("studio-v3-curtain-rise");
    expect(root.textContent).toMatch(/YES/);
    expect(root.textContent).toMatch(/PORTUGAL VOICE/);
    expect(root).toHaveAttribute("aria-hidden", "true");
  });

  it("shows the regional eyebrow + whisper for an Arrábida-resolving state", () => {
    const state = {
      ...INITIAL_STATE,
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine"],
    } as typeof INITIAL_STATE;
    render(<CurtainRise state={state} />);
    const root = screen.getByTestId("studio-v3-curtain-rise");
    expect(root.textContent).toMatch(/ARRÁBIDA VOICE/);
  });

  it("dismisses itself after the hold window and calls onDone", () => {
    const onDone = vi.fn();
    render(<CurtainRise state={INITIAL_STATE} onDone={onDone} />);
    expect(screen.getByTestId("studio-v3-curtain-rise")).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDone).toHaveBeenCalled();
    expect(screen.queryByTestId("studio-v3-curtain-rise")).toBeNull();
  });

  it("collapses to a 250ms exit under prefers-reduced-motion", () => {
    const matchMediaMock = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    Object.defineProperty(window, "matchMedia", { writable: true, value: matchMediaMock });
    const onDone = vi.fn();
    render(<CurtainRise state={INITIAL_STATE} onDone={onDone} />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onDone).toHaveBeenCalled();
  });
});
