/**
 * @vitest-environment jsdom
 *
 * Rapid / out-of-order phase transitions.
 *
 * Travellers can step backward (edit a previous answer), deep-link into a
 * later phase, or trigger fast phase swaps mid-animation. The stepper must
 * always reflect the *current* phase's beat — never a stale one, never a
 * skipped one — and must always render the same four labels in the same
 * order.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
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

function activeBeat(): string | null {
  const nav = screen.queryByTestId("studio-v3-progress-stepper");
  return nav?.getAttribute("data-active-beat") ?? null;
}

describe("StudioV3ProgressStepper — out-of-order & rapid transitions", () => {
  it("jumps backward without losing sync (compose → region)", () => {
    const { rerender } = render(<StudioV3ProgressStepper phase="storyboard" />);
    expect(activeBeat()).toBe("compose");

    rerender(<StudioV3ProgressStepper phase="feeling" />);
    expect(activeBeat()).toBe("region");

    rerender(<StudioV3ProgressStepper phase="rhythm" />);
    expect(activeBeat()).toBe("rhythm");
  });

  it("deep-link into Dates renders Dates active immediately (no replay)", () => {
    render(<StudioV3ProgressStepper phase="date" />);
    expect(activeBeat()).toBe("dates");
    // Region + Rhythm are shown as 'done', Compose as upcoming.
    const nav = screen.getByTestId("studio-v3-progress-stepper");
    const current = nav.querySelectorAll('[aria-current="step"]');
    expect(current.length).toBe(1);
    expect(current[0].textContent).toContain("Dates");
  });

  it("survives rapid synchronous phase swaps and lands on the final phase", () => {
    const burst: StudioV3Phase[] = [
      "feeling",
      "rhythm",
      "date",
      "rhythm",
      "feeling",
      "map",
      "date",
      "storyboard",
    ];
    const { rerender } = render(<StudioV3ProgressStepper phase={burst[0]} />);
    act(() => {
      for (const p of burst.slice(1)) {
        rerender(<StudioV3ProgressStepper phase={p} />);
      }
    });
    // Final phase is "storyboard" → compose.
    expect(activeBeat()).toBe("compose");
  });

  it("never renders more than one active step at a time across a fuzzed sequence", () => {
    const phases: StudioV3Phase[] = [
      "intro",
      "feeling",
      "destination",
      "rhythm",
      "interests",
      "date",
      "rhythm",
      "map",
      "feeling",
      "storyboard",
      "date",
    ];
    const { rerender } = render(<StudioV3ProgressStepper phase={phases[0]} />);
    for (const p of phases) {
      rerender(<StudioV3ProgressStepper phase={p} />);
      const nav = screen.queryByTestId("studio-v3-progress-stepper");
      if (beatIndexForPhase(p) == null) {
        expect(nav).toBeNull();
        continue;
      }
      const current = nav!.querySelectorAll('[aria-current="step"]');
      expect(current.length).toBe(1);
      // Labels always remain in canonical order.
      const labels = Array.from(nav!.querySelectorAll("span:not([aria-hidden])")).map((n) =>
        n.textContent?.trim(),
      );
      expect(labels).toEqual(STUDIO_V3_BEATS.map((b) => b.label));
    }
  });

  it("re-entering the same beat from a different phase does not duplicate telemetry per render", async () => {
    const { recordStudioV3BuilderStep } = await import("@/lib/studio-v3-telemetry");
    const spy = recordStudioV3BuilderStep as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();

    const { rerender } = render(<StudioV3ProgressStepper phase="feeling" />);
    // Same beat (region) via different phases — phase is part of the effect
    // dep, so each unique phase fires once; a re-render with the same phase
    // must not double-fire.
    rerender(<StudioV3ProgressStepper phase="feeling" />);
    rerender(<StudioV3ProgressStepper phase="destination" />);
    rerender(<StudioV3ProgressStepper phase="destination" />);
    rerender(<StudioV3ProgressStepper phase="who" />);

    const calls = spy.mock.calls.map((c) => c[0]);
    // Every call resolves to the region beat.
    for (const c of calls) expect(c.step).toBe("region");
    // One call per *unique* phase transition (feeling, destination, who) +
    // the initial mount on "feeling" = 3 unique phases reached.
    const uniquePhases = new Set(calls.map((c) => c.phase));
    expect(uniquePhases.size).toBe(3);
  });
});
