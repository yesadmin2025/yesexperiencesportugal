// A11y tests for StudioV3ProgressStepper:
//  - aria-current="step" on (and only on) the active beat
//  - completed beats become focusable buttons; upcoming beats do NOT take focus
//  - keyboard navigation: ArrowLeft/Right, Home, End move focus across REACHABLE beats only
//  - focus order matches DOM order in both light and dark themes
//  - onJumpToBeat fires with the correct beat id + entry phase

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { StudioV3ProgressStepper, STUDIO_V3_BEATS } from "../StudioV3ProgressStepper";

vi.mock("@/lib/studio-v3-telemetry", () => ({
  recordStudioV3BuilderStep: vi.fn(),
}));

function renderInTheme(theme: "light" | "dark", ui: React.ReactNode) {
  return render(
    <div
      data-theme={theme}
      style={theme === "dark" ? { background: "#111" } : { background: "#fff" }}
    >
      {ui}
    </div>,
  );
}

describe("StudioV3ProgressStepper · accessibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets aria-current=step on the active beat and nothing else", () => {
    render(<StudioV3ProgressStepper phase="date" onJumpToBeat={() => {}} />);
    const nav = screen.getByTestId("studio-v3-progress-stepper");
    const current = within(nav).getAllByRole("button");
    // 2 completed (region, rhythm) + 1 active (dates) … active uses div, not button.
    expect(current).toHaveLength(2);
    const stepEls = nav.querySelectorAll('[aria-current="step"]');
    expect(stepEls).toHaveLength(1);
    expect(stepEls[0].getAttribute("data-beat")).toBe("dates");
  });

  it("upcoming beats are not interactive and not in tab order", () => {
    render(<StudioV3ProgressStepper phase="feeling" onJumpToBeat={() => {}} />);
    const nav = screen.getByTestId("studio-v3-progress-stepper");
    // active=region (div), upcoming=rhythm/dates/compose (div). No buttons yet.
    expect(within(nav).queryAllByRole("button")).toHaveLength(0);
    const upcoming = nav.querySelectorAll('[data-state="upcoming"]');
    expect(upcoming).toHaveLength(3);
    upcoming.forEach((el) => {
      expect(el.tagName).toBe("DIV");
      expect(el.getAttribute("tabindex")).toBeNull();
    });
  });

  it("ArrowRight / ArrowLeft / Home / End move focus across reachable beats only", () => {
    render(<StudioV3ProgressStepper phase="map" onJumpToBeat={() => {}} />);
    // reachable: region, rhythm, dates (buttons) + compose (active, div).
    // → buttons in DOM order: region, rhythm, dates.
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("data-beat"))).toEqual(["region", "rhythm", "dates"]);

    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);

    fireEvent.keyDown(buttons[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[1]);

    fireEvent.keyDown(buttons[1], { key: "End" });
    // End → last reachable index is `active` (compose), but compose is a div.
    // The stepper only focuses buttons; End therefore lands on the last button.
    expect((document.activeElement as HTMLElement).getAttribute("data-beat")).toBe("dates");

    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect((document.activeElement as HTMLElement).getAttribute("data-beat")).toBe("region");

    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    // already at first → stays put
    expect((document.activeElement as HTMLElement).getAttribute("data-beat")).toBe("region");
  });

  it("clicking a completed beat invokes onJumpToBeat with its entry phase", () => {
    const onJump = vi.fn();
    render(<StudioV3ProgressStepper phase="storyboard" onJumpToBeat={onJump} />);
    const region = screen.getByRole("button", { name: /return to region/i });
    fireEvent.click(region);
    expect(onJump).toHaveBeenCalledWith("region", "feeling");

    const rhythm = screen.getByRole("button", { name: /return to rhythm/i });
    fireEvent.click(rhythm);
    expect(onJump).toHaveBeenCalledWith("rhythm", "rhythm");
  });

  it("never moves focus forward past the active beat", () => {
    render(<StudioV3ProgressStepper phase="rhythm" onJumpToBeat={() => {}} />);
    // Only region is a button (done). Active=rhythm is a div.
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowRight" });
    // no forward button to receive focus
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("focus order matches DOM order in light theme", () => {
    const { container } = renderInTheme(
      "light",
      <StudioV3ProgressStepper phase="storyboard" onJumpToBeat={() => {}} />,
    );
    const order = Array.from(container.querySelectorAll("button")).map((b) =>
      b.getAttribute("data-beat"),
    );
    expect(order).toEqual(["region", "rhythm", "dates"]);
  });

  it("focus order matches DOM order in dark theme", () => {
    const { container } = renderInTheme(
      "dark",
      <StudioV3ProgressStepper phase="storyboard" onJumpToBeat={() => {}} />,
    );
    const order = Array.from(container.querySelectorAll("button")).map((b) =>
      b.getAttribute("data-beat"),
    );
    expect(order).toEqual(["region", "rhythm", "dates"]);
  });

  it("every beat label is present and rendered exactly once", () => {
    render(<StudioV3ProgressStepper phase="date" onJumpToBeat={() => {}} />);
    STUDIO_V3_BEATS.forEach((b) => {
      expect(screen.getAllByText(b.label)).toHaveLength(1);
    });
  });

  it("nav has an accessible name", () => {
    render(<StudioV3ProgressStepper phase="date" />);
    expect(screen.getByRole("navigation", { name: /studio progress/i })).toBeInTheDocument();
  });
});
