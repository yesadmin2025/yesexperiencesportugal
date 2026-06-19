/**
 * @vitest-environment jsdom
 *
 * Visual regression for StudioV3ProgressStepper.
 *
 * We don't ship a pixel-diff pipeline for this primitive; instead we lock
 * the structural + style contract that drives the visual: container
 * spacing classes, per-step inline style tokens (gold / charcoal mixes),
 * label typography, and the active-step affordance. Any unintended visual
 * drift (spacing, color token swap, label rename) changes this snapshot.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  StudioV3ProgressStepper,
  STUDIO_V3_BEATS,
} from "../StudioV3ProgressStepper";
import type { StudioV3Phase } from "../types";

vi.mock("@/lib/studio-v3-telemetry", () => ({
  recordStudioV3BuilderStep: vi.fn(),
}));

afterEach(() => cleanup());

const PHASES_PER_BEAT: StudioV3Phase[] = ["feeling", "rhythm", "date", "map"];

describe("StudioV3ProgressStepper — visual contract", () => {
  it("locks container spacing + layout classes", () => {
    const { getByTestId } = render(<StudioV3ProgressStepper phase="feeling" />);
    const nav = getByTestId("studio-v3-progress-stepper");
    expect(nav.className).toMatchInlineSnapshot(
      `"mt-4 mb-1 flex w-full items-center justify-between gap-2 px-5"`,
    );
    expect(nav.getAttribute("aria-label")).toBe("Studio progress");
  });

  it("renders the four canonical labels in order, regardless of active beat", () => {
    for (const phase of PHASES_PER_BEAT) {
      const { getByTestId, unmount } = render(
        <StudioV3ProgressStepper phase={phase} />,
      );
      const nav = getByTestId("studio-v3-progress-stepper");
      const labels = Array.from(nav.querySelectorAll("span:not([aria-hidden])"))
        .map((n) => n.textContent?.trim())
        .filter(Boolean);
      expect(labels).toEqual(STUDIO_V3_BEATS.map((b) => b.label));
      unmount();
    }
  });

  it("applies the correct color tokens to active / done / upcoming steps", () => {
    // Phase "date" → beat 2 active; beats 0,1 done; beat 3 upcoming.
    const { getByTestId } = render(<StudioV3ProgressStepper phase="date" />);
    const nav = getByTestId("studio-v3-progress-stepper");
    const bars = nav.querySelectorAll<HTMLSpanElement>("span[aria-hidden]");
    expect(bars.length).toBe(4);

    // Done steps use a transparent gold mix.
    expect(bars[0].style.background).toContain("var(--gold)");
    expect(bars[0].style.background).toContain("55%");
    expect(bars[1].style.background).toContain("var(--gold)");

    // Active step uses pure gold.
    expect(bars[2].style.background).toBe("var(--gold)");

    // Upcoming step uses charcoal mix.
    expect(bars[3].style.background).toContain("var(--charcoal)");
    expect(bars[3].style.background).toContain("12%");

    // Only one aria-current="step".
    expect(nav.querySelectorAll('[aria-current="step"]').length).toBe(1);
  });

  it("keeps label typography stable (display font, uppercase, tracking)", () => {
    const { getByTestId } = render(<StudioV3ProgressStepper phase="rhythm" />);
    const nav = getByTestId("studio-v3-progress-stepper");
    const labelNodes = nav.querySelectorAll<HTMLSpanElement>(
      "span:not([aria-hidden])",
    );
    for (const node of Array.from(labelNodes)) {
      expect(node.className).toContain("uppercase");
      expect(node.className).toContain("tracking-[0.22em]");
      expect(node.className).toContain("font-semibold");
      expect(node.style.fontFamily).toBe("var(--font-display)");
    }
  });

  it("snapshot: active-beat=dates DOM shape stays locked", () => {
    const { getByTestId } = render(<StudioV3ProgressStepper phase="date" />);
    const nav = getByTestId("studio-v3-progress-stepper");
    // Normalize so the snapshot is structural, not whitespace-sensitive.
    expect(nav.outerHTML.replace(/\s+/g, " ")).toMatchSnapshot();
  });
});
