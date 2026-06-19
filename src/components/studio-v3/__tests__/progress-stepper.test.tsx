/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  StudioV3ProgressStepper,
  STUDIO_V3_BEATS,
  beatIndexForPhase,
} from "../StudioV3ProgressStepper";
import type { StudioV3Phase } from "../types";

vi.mock("@/lib/studio-v3-telemetry", () => ({
  recordStudioV3BuilderStep: vi.fn(),
}));

afterEach(() => cleanup());

const PHASE_TO_BEAT: Record<StudioV3Phase, number | null> = {
  intro: null,
  feeling: 0,
  destination: 0,
  who: 0,
  occasion: 0,
  pickup: 0,
  guests: 0,
  interests: 1,
  rhythm: 1,
  considerations: 1,
  language: 1,
  investment: 1,
  date: 2,
  map: 3,
  storyboard: 3,
};

describe("StudioV3ProgressStepper", () => {
  it("maps every internal phase to the documented beat", () => {
    for (const [phase, expected] of Object.entries(PHASE_TO_BEAT)) {
      expect(beatIndexForPhase(phase as StudioV3Phase)).toBe(expected);
    }
  });

  it("hides the stepper on intro (no beat yet)", () => {
    const { container } = render(<StudioV3ProgressStepper phase="intro" />);
    expect(container.firstChild).toBeNull();
  });

  for (const [phase, beatIdx] of Object.entries(PHASE_TO_BEAT)) {
    if (beatIdx == null) continue;
    const expectedBeat = STUDIO_V3_BEATS[beatIdx];
    it(`renders ${expectedBeat.id} as active for phase "${phase}"`, () => {
      render(<StudioV3ProgressStepper phase={phase as StudioV3Phase} />);
      const nav = screen.getByTestId("studio-v3-progress-stepper");
      expect(nav.getAttribute("data-active-beat")).toBe(expectedBeat.id);

      const stepNodes = nav.querySelectorAll('[aria-current="step"]');
      expect(stepNodes.length).toBe(1);
      expect(stepNodes[0].textContent).toContain(expectedBeat.label);
    });
  }

  it("transitions through Region → Rhythm → Dates → Compose in order", async () => {
    const sequence: StudioV3Phase[] = [
      "feeling",
      "destination",
      "interests",
      "rhythm",
      "date",
      "map",
      "storyboard",
    ];
    const expectedBeats = sequence.map((p) => STUDIO_V3_BEATS[PHASE_TO_BEAT[p]!].id);

    const { rerender } = render(<StudioV3ProgressStepper phase={sequence[0]} />);
    for (let i = 0; i < sequence.length; i++) {
      rerender(<StudioV3ProgressStepper phase={sequence[i]} />);
      const nav = screen.getByTestId("studio-v3-progress-stepper");
      expect(nav.getAttribute("data-active-beat")).toBe(expectedBeats[i]);
    }

    // Beats advance monotonically across the sequence.
    const indices = sequence.map((p) => PHASE_TO_BEAT[p]!);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
    }
  });

  it("emits telemetry with the resolved beat whenever phase changes", async () => {
    const { recordStudioV3BuilderStep } = await import("@/lib/studio-v3-telemetry");
    const spy = recordStudioV3BuilderStep as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();

    const { rerender } = render(<StudioV3ProgressStepper phase="feeling" />);
    rerender(<StudioV3ProgressStepper phase="rhythm" />);
    rerender(<StudioV3ProgressStepper phase="date" />);
    rerender(<StudioV3ProgressStepper phase="map" />);

    const calls = spy.mock.calls.map((c) => c[0]);
    const beats = calls.map((c) => c.step);
    expect(beats).toContain("region");
    expect(beats).toContain("rhythm");
    expect(beats).toContain("dates");
    expect(beats).toContain("compose");

    for (const call of calls) {
      const beat = STUDIO_V3_BEATS[call.stepIndex];
      expect(beat.id).toBe(call.step);
    }
  });
});
