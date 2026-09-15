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
  // YOU
  feeling: 0,
  who: 0,
  interests: 0,
  rhythm: 0,
  destination: 0,
  occasion: 0,
  considerations: 0,
  language: 0,
  // YOUR DAY
  refinement: 1,
  storyboard: 1,
  map: 1,
  confirmation: 1,
  investment: 1,
  // MAKE IT YOURS
  logistics: 2,
  guestDetails: 2,
  checkoutSummary: 2,
  date: 2,
  pickup: 2,
  guests: 2,
};

/**
 * The REAL live sequence, in order. The visible progress must never move
 * backwards across it.
 */
const CANONICAL_LIVE_SEQUENCE: StudioV3Phase[] = [
  "feeling",
  "who",
  "interests",
  "rhythm",
  "refinement",
  "storyboard",
  "logistics",
  "guestDetails",
  "checkoutSummary",
];

describe("StudioV3ProgressStepper", () => {
  it("maps every internal phase to the documented chapter", () => {
    for (const [phase, expected] of Object.entries(PHASE_TO_BEAT)) {
      expect(beatIndexForPhase(phase as StudioV3Phase)).toBe(expected);
    }
  });

  it("hides the stepper on intro (no chapter yet)", () => {
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

  it("keeps the three labels exactly: You → Your day → Make it yours", () => {
    expect(STUDIO_V3_BEATS.map((b) => b.label)).toEqual(["You", "Your day", "Make it yours"]);
  });

  it("never regresses across the canonical live sequence (holds or advances only)", () => {
    const indices = CANONICAL_LIVE_SEQUENCE.map((p) => beatIndexForPhase(p));
    for (const i of indices) expect(i).not.toBeNull();
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]!).toBeGreaterThanOrEqual(indices[i - 1]!);
    }
    // The sequence visits all three chapters, in order, exactly once each.
    expect(indices).toEqual([0, 0, 0, 0, 1, 1, 2, 2, 2]);
  });

  it("renders the active chapter monotonically while walking the live sequence", () => {
    const { rerender } = render(<StudioV3ProgressStepper phase={CANONICAL_LIVE_SEQUENCE[0]} />);
    let previous = -1;
    for (const phase of CANONICAL_LIVE_SEQUENCE) {
      rerender(<StudioV3ProgressStepper phase={phase} />);
      const nav = screen.getByTestId("studio-v3-progress-stepper");
      const idx = STUDIO_V3_BEATS.findIndex((b) => b.id === nav.getAttribute("data-active-beat"));
      expect(idx).toBeGreaterThanOrEqual(previous);
      expect(idx).toBe(beatIndexForPhase(phase));
      previous = idx;
    }
    expect(previous).toBe(2);
  });
});
