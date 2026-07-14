// Telemetry contract tests for StudioV3ProgressStepper.
//
// Verifies:
//   1. recordStudioV3BuilderStep fires once per perceived phase change
//      (mount + each phase update), with the correct beat id + index.
//   2. Keyboard navigation between completed beats moves DOM focus
//      but does NOT emit additional telemetry (telemetry is keyed to
//      phase changes, not focus changes).
//   3. Clicking a completed beat fires `onJumpToBeat` but, on its own,
//      does NOT emit telemetry — the parent's resulting phase change
//      will (in real usage) drive the next telemetry event.
//   4. Events outside the stepper (focus / click / keydown elsewhere)
//      never produce stepper telemetry.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StudioV3ProgressStepper } from "../StudioV3ProgressStepper";
import { recordStudioV3BuilderStep } from "@/lib/studio-v3-telemetry";

vi.mock("@/lib/studio-v3-telemetry", () => ({
  recordStudioV3BuilderStep: vi.fn(),
}));

const recordMock = vi.mocked(recordStudioV3BuilderStep);

describe("StudioV3ProgressStepper · telemetry contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits exactly one event on mount with the correct beat", () => {
    render(<StudioV3ProgressStepper phase="feeling" />);
    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(recordMock).toHaveBeenCalledWith({
      step: "region",
      stepIndex: 0,
      phase: "feeling",
    });
  });

  it("emits one event per phase change, with correct beat mapping", () => {
    const { rerender } = render(<StudioV3ProgressStepper phase="feeling" />);
    expect(recordMock).toHaveBeenCalledTimes(1);

    rerender(<StudioV3ProgressStepper phase="rhythm" />);
    expect(recordMock).toHaveBeenCalledTimes(2);
    expect(recordMock).toHaveBeenLastCalledWith({
      step: "rhythm",
      stepIndex: 1,
      phase: "rhythm",
    });

    rerender(<StudioV3ProgressStepper phase="date" />);
    expect(recordMock).toHaveBeenCalledTimes(3);
    expect(recordMock).toHaveBeenLastCalledWith({
      step: "dates",
      stepIndex: 2,
      phase: "date",
    });

    rerender(<StudioV3ProgressStepper phase="storyboard" />);
    expect(recordMock).toHaveBeenCalledTimes(4);
    expect(recordMock).toHaveBeenLastCalledWith({
      step: "compose",
      stepIndex: 3,
      phase: "storyboard",
    });
  });

  it("does NOT emit telemetry for intro phase", () => {
    render(<StudioV3ProgressStepper phase="intro" />);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("does NOT emit telemetry when the phase rerenders to the same value", () => {
    const { rerender } = render(<StudioV3ProgressStepper phase="date" />);
    recordMock.mockClear();
    rerender(<StudioV3ProgressStepper phase="date" />);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("keyboard focus traversal between done beats does NOT emit telemetry", () => {
    render(<StudioV3ProgressStepper phase="storyboard" onJumpToBeat={() => {}} />);
    recordMock.mockClear();

    const buttons = screen.getAllByRole("button"); // region, rhythm, dates
    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    fireEvent.keyDown(document.activeElement!, { key: "End" });

    expect(recordMock).not.toHaveBeenCalled();
  });

  it("clicking a completed beat fires onJumpToBeat but does NOT emit telemetry on its own", () => {
    const onJump = vi.fn();
    render(<StudioV3ProgressStepper phase="storyboard" onJumpToBeat={onJump} />);
    recordMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /return to region/i }));
    fireEvent.click(screen.getByRole("button", { name: /return to rhythm/i }));

    expect(onJump).toHaveBeenCalledTimes(2);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("events on elements OUTSIDE the stepper never emit stepper telemetry", () => {
    render(
      <div>
        <button type="button" data-testid="outside-button">
          outside
        </button>
        <StudioV3ProgressStepper phase="storyboard" onJumpToBeat={() => {}} />
      </div>,
    );
    recordMock.mockClear();

    const outside = screen.getByTestId("outside-button");
    outside.focus();
    fireEvent.click(outside);
    fireEvent.keyDown(outside, { key: "ArrowRight" });
    fireEvent.keyDown(outside, { key: "Enter" });
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });

    expect(recordMock).not.toHaveBeenCalled();
  });

  it("onBeatAdvance fires only when the active beat advances forward, never on back-jumps", () => {
    const onBeatAdvance = vi.fn();
    const { rerender } = render(
      <StudioV3ProgressStepper
        phase="feeling"
        onJumpToBeat={() => {}}
        onBeatAdvance={onBeatAdvance}
      />,
    );
    expect(onBeatAdvance).toHaveBeenCalledTimes(1);
    expect(onBeatAdvance).toHaveBeenLastCalledWith("region", 0);

    rerender(
      <StudioV3ProgressStepper
        phase="date"
        onJumpToBeat={() => {}}
        onBeatAdvance={onBeatAdvance}
      />,
    );
    expect(onBeatAdvance).toHaveBeenCalledTimes(2);
    expect(onBeatAdvance).toHaveBeenLastCalledWith("dates", 2);

    // Jump back to a completed beat → no new advance event.
    rerender(
      <StudioV3ProgressStepper
        phase="feeling"
        onJumpToBeat={() => {}}
        onBeatAdvance={onBeatAdvance}
      />,
    );
    expect(onBeatAdvance).toHaveBeenCalledTimes(2);
  });
});
