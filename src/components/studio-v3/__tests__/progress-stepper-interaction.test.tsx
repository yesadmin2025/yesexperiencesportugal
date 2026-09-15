/**
 * @vitest-environment jsdom
 *
 * Interaction test: a small harness drives a phase through the canonical
 * live sequence via a user click, and the stepper's active chapter must
 * stay synchronized with the harness's "internal phase" state on every
 * step — and never move backwards while going forward.
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

// Canonical traveller journey — the real live sequence.
const JOURNEY: StudioV3Phase[] = [
  "feeling", // You
  "who", // You
  "interests", // You
  "rhythm", // You
  "refinement", // Your day
  "storyboard", // Your day
  "logistics", // Make it yours
  "guestDetails", // Make it yours
  "checkoutSummary", // Make it yours
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
  it("advances You → Your day → Make it yours, staying in sync and never regressing", () => {
    render(<Harness />);

    let previous = -1;
    for (let i = 0; i < JOURNEY.length; i++) {
      const phase = JOURNEY[i];
      const expectedIdx = beatIndexForPhase(phase)!;
      const expectedBeat = STUDIO_V3_BEATS[expectedIdx].id;

      expect(screen.getByTestId("harness-phase").textContent).toBe(phase);
      const nav = screen.getByTestId("studio-v3-progress-stepper");
      expect(nav.getAttribute("data-active-beat")).toBe(expectedBeat);
      expect(nav.querySelector('[aria-current="step"]')?.textContent).toContain(
        STUDIO_V3_BEATS[expectedIdx].label,
      );
      // Forward navigation must never move the visible chapter backwards.
      expect(expectedIdx).toBeGreaterThanOrEqual(previous);
      previous = expectedIdx;

      if (i < JOURNEY.length - 1) {
        act(() => {
          fireEvent.click(screen.getByTestId("harness-next"));
        });
      }
    }

    expect(screen.getByTestId("studio-v3-progress-stepper").getAttribute("data-active-beat")).toBe(
      "compose",
    );
  });

  it("walking backward re-syncs the active chapter each step", () => {
    render(<Harness />);

    for (let i = 0; i < JOURNEY.length - 1; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId("harness-next"));
      });
    }
    expect(screen.getByTestId("studio-v3-progress-stepper").getAttribute("data-active-beat")).toBe(
      "compose",
    );

    for (let i = JOURNEY.length - 2; i >= 0; i--) {
      act(() => {
        fireEvent.click(screen.getByTestId("harness-back"));
      });
      const phase = JOURNEY[i];
      expect(screen.getByTestId("harness-phase").textContent).toBe(phase);
      expect(
        screen.getByTestId("studio-v3-progress-stepper").getAttribute("data-active-beat"),
      ).toBe(STUDIO_V3_BEATS[beatIndexForPhase(phase)!].id);
    }
  });

  it("emits telemetry per perceived phase change, in non-decreasing chapter order", async () => {
    const { recordStudioV3BuilderStep } = await import("@/lib/studio-v3-telemetry");
    const spy = recordStudioV3BuilderStep as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();

    render(<Harness />);

    for (let i = 0; i < JOURNEY.length - 1; i++) {
      act(() => {
        fireEvent.click(screen.getByTestId("harness-next"));
      });
    }

    const indices = spy.mock.calls.map((c) => c[0].stepIndex as number);
    expect(indices.length).toBe(JOURNEY.length);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
    }
    const beats = spy.mock.calls.map((c) => c[0].step as string);
    expect(new Set(beats)).toEqual(new Set(["region", "rhythm", "compose"]));
    expect(beats[0]).toBe("region");
    expect(beats[beats.length - 1]).toBe("compose");
  });
});
