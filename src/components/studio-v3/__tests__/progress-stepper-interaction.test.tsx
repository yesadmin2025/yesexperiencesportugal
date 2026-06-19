/**
 * @vitest-environment jsdom
 *
 * Interaction test: a small harness drives a phase through the canonical
 * Region → Rhythm → Dates → Compose journey via a user click, and the
 * stepper's active beat must stay synchronized with the harness's
 * "internal phase" state on every step.
 *
 * This guards the contract that the stepper is a pure projection of the
 * phase prop — no internal state, no drift between perceived beat and
 * actual phase.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  StudioV3ProgressStepper,
  beatIndexForPhase,
  STUDIO_V3_BEATS,
} from "../StudioV3ProgressStepper";
import type { StudioV3Phase } from "../types";

vi.mock("@/lib/studio-v3-telemetry", () => ({
  recordStudioV3BuilderStep: vi.fn(),
}));

afterEach(() => cleanup());

// Canonical traveller journey — one representative phase per beat, then
// the final compose phase.
const JOURNEY: StudioV3Phase[] = [
  "feeling", // Region
  "rhythm", // Rhythm
  "date", // Dates
  "storyboard", // Compose
];

function Harness() {
  const [idx, setIdx] = useState(0);
  const phase = JOURNEY[idx];
  return (
    <div>
      <StudioV3ProgressStepper phase={phase} />
      <output data-testid="harness-phase">{phase}</output>
      <button
        type="button"
        data-testid="harness-next"
        disabled={idx >= JOURNEY.length - 1}
        onClick={() => setIdx((i) => Math.min(i + 1, JOURNEY.length - 1))}
      >
        Next
      </button>
      <button
        type="button"
        data-testid="harness-back"
        disabled={idx === 0}
        onClick={() => setIdx((i) => Math.max(i - 1, 0))}
      >
        Back
      </button>
    </div>
  );
}

describe("StudioV3ProgressStepper — interaction sync", () => {
  it("advances Region → Rhythm → Dates → Compose, staying in sync with the internal phase", async () => {
    // fireEvent for sync clicks
    render(<Harness />);

    for (let i = 0; i < JOURNEY.length; i++) {
      const phase = JOURNEY[i];
      const expectedBeat = STUDIO_V3_BEATS[beatIndexForPhase(phase)!].id;

      // Harness phase == stepper active beat at every step.
      expect(screen.getByTestId("harness-phase").textContent).toBe(phase);
      const nav = screen.getByTestId("studio-v3-progress-stepper");
      expect(nav.getAttribute("data-active-beat")).toBe(expectedBeat);
      expect(
        nav.querySelector('[aria-current="step"]')?.textContent,
      ).toContain(STUDIO_V3_BEATS[beatIndexForPhase(phase)!].label);

      if (i < JOURNEY.length - 1) {
        act(() => { fireEvent.click(screen.getByTestId("harness-next")); });
      }
    }

    // Reached compose.
    expect(
      screen.getByTestId("studio-v3-progress-stepper").getAttribute("data-active-beat"),
    ).toBe("compose");
  });

  it("walking backward re-syncs the active beat each step", async () => {
    // fireEvent for sync clicks
    render(<Harness />);

    // Fast-forward to the end.
    for (let i = 0; i < JOURNEY.length - 1; i++) {
      act(() => { fireEvent.click(screen.getByTestId("harness-next")); });
    }
    expect(
      screen.getByTestId("studio-v3-progress-stepper").getAttribute("data-active-beat"),
    ).toBe("compose");

    // Walk back, asserting sync at every step.
    for (let i = JOURNEY.length - 2; i >= 0; i--) {
      act(() => { fireEvent.click(screen.getByTestId("harness-back")); });
      const phase = JOURNEY[i];
      expect(screen.getByTestId("harness-phase").textContent).toBe(phase);
      expect(
        screen.getByTestId("studio-v3-progress-stepper").getAttribute("data-active-beat"),
      ).toBe(STUDIO_V3_BEATS[beatIndexForPhase(phase)!].id);
    }
  });

  it("emits one telemetry event per perceived phase change during navigation", async () => {
    const { recordStudioV3BuilderStep } = await import(
      "@/lib/studio-v3-telemetry"
    );
    const spy = recordStudioV3BuilderStep as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();

    // fireEvent for sync clicks
    render(<Harness />);

    for (let i = 0; i < JOURNEY.length - 1; i++) {
      act(() => { fireEvent.click(screen.getByTestId("harness-next")); });
    }

    const beats = spy.mock.calls.map((c) => c[0].step);
    // The journey covers all four beats in order.
    expect(beats).toEqual(["region", "rhythm", "dates", "compose"]);
  });
});
