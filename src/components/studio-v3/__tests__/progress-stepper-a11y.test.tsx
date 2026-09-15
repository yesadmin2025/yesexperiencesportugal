// A11y tests for StudioV3ProgressStepper:
//  - aria-current="step" on (and only on) the active chapter
//  - completed chapters become focusable buttons; upcoming chapters do NOT take focus
//  - keyboard navigation: ArrowLeft/Right, Home, End move focus across REACHABLE chapters only
//  - focus order matches DOM order in both light and dark themes
//  - onJumpToBeat fires with the correct chapter id + entry phase

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

  it("sets aria-current=step on the active chapter and nothing else", () => {
    render(<StudioV3ProgressStepper phase="logistics" onJumpToBeat={() => {}} />);
    const nav = screen.getByTestId("studio-v3-progress-stepper");
    const current = within(nav).getAllByRole("button");
    // 2 completed (You, Your day) + 1 active (Make it yours) … active uses div.
    expect(current).toHaveLength(2);
    const stepEls = nav.querySelectorAll('[aria-current="step"]');
    expect(stepEls).toHaveLength(1);
    expect(stepEls[0].getAttribute("data-beat")).toBe("compose");
  });

  it("upcoming chapters are not interactive and not in tab order", () => {
    render(<StudioV3ProgressStepper phase="feeling" onJumpToBeat={() => {}} />);
    const nav = screen.getByTestId("studio-v3-progress-stepper");
    expect(within(nav).queryAllByRole("button")).toHaveLength(0);
    const upcoming = nav.querySelectorAll('[data-state="upcoming"]');
    expect(upcoming).toHaveLength(2);
    upcoming.forEach((el) => {
      expect(el.tagName).toBe("DIV");
      expect(el.getAttribute("tabindex")).toBeNull();
    });
  });

  it("ArrowRight / ArrowLeft / Home / End move focus across reachable chapters only", () => {
    render(<StudioV3ProgressStepper phase="checkoutSummary" onJumpToBeat={() => {}} />);
    // reachable: You, Your day (buttons) + Make it yours (active, div).
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("data-beat"))).toEqual(["region", "rhythm"]);

    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);

    fireEvent.keyDown(buttons[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[1]);

    fireEvent.keyDown(buttons[1], { key: "End" });
    // End → last reachable index is `active` (compose), but compose is a div.
    // The stepper only focuses buttons; End therefore lands on the last button.
    expect((document.activeElement as HTMLElement).getAttribute("data-beat")).toBe("rhythm");

    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect((document.activeElement as HTMLElement).getAttribute("data-beat")).toBe("region");

    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    // already at first → stays put
    expect((document.activeElement as HTMLElement).getAttribute("data-beat")).toBe("region");
  });

  it("clicking a completed chapter invokes onJumpToBeat with its entry phase", () => {
    const onJump = vi.fn();
    render(<StudioV3ProgressStepper phase="guestDetails" onJumpToBeat={onJump} />);
    fireEvent.click(screen.getByRole("button", { name: /return to you/i }));
    expect(onJump).toHaveBeenCalledWith("region", "feeling");

    fireEvent.click(screen.getByRole("button", { name: /return to your day/i }));
    expect(onJump).toHaveBeenCalledWith("rhythm", "refinement");
  });

  it("never moves focus forward past the active chapter", () => {
    render(<StudioV3ProgressStepper phase="storyboard" onJumpToBeat={() => {}} />);
    // Only You is a button (done). Active = Your day is a div.
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("focus order matches DOM order in light theme", () => {
    const { container } = renderInTheme(
      "light",
      <StudioV3ProgressStepper phase="guestDetails" onJumpToBeat={() => {}} />,
    );
    const order = Array.from(container.querySelectorAll("button")).map((b) =>
      b.getAttribute("data-beat"),
    );
    expect(order).toEqual(["region", "rhythm"]);
  });

  it("focus order matches DOM order in dark theme", () => {
    const { container } = renderInTheme(
      "dark",
      <StudioV3ProgressStepper phase="guestDetails" onJumpToBeat={() => {}} />,
    );
    const order = Array.from(container.querySelectorAll("button")).map((b) =>
      b.getAttribute("data-beat"),
    );
    expect(order).toEqual(["region", "rhythm"]);
  });

  it("every chapter label is present and rendered exactly once", () => {
    render(<StudioV3ProgressStepper phase="logistics" onJumpToBeat={() => {}} />);
    STUDIO_V3_BEATS.forEach((b) => {
      expect(screen.getAllByText(b.label)).toHaveLength(1);
    });
  });

  it("nav has an accessible name", () => {
    render(<StudioV3ProgressStepper phase="logistics" />);
    expect(screen.getByRole("navigation", { name: /studio progress/i })).toBeInTheDocument();
  });
});
