// Studio V3 — Phase 6C lock test.
//
// Locks the exact "Shaping direction" copy rendered in the final reveal
// for each investment tier, and asserts that nothing renders when the
// investment is unset. Pure unit test against investmentShapingLine
// (exported from StudioV3.tsx) — no DOM, no route logic touched.

import { describe, it, expect } from "vitest";
import { investmentShapingLine } from "../StudioV3";

describe("Studio V3 — investmentShapingLine (Shaping direction)", () => {
  it("returns the exact 'considered' copy", () => {
    expect(investmentShapingLine("considered")).toBe(
      "Shaped with clarity, comfort and restraint — private, beautiful, without unnecessary extras.",
    );
  });

  it("returns the exact 'elevated' copy", () => {
    expect(investmentShapingLine("elevated")).toBe(
      "Shaped with stronger curated moments, smoother pacing and a more polished private flow.",
    );
  });

  it("returns the exact 'bespoke' copy", () => {
    expect(investmentShapingLine("bespoke")).toBe(
      "Shaped for a more distinctive day — fewer generic choices, stronger character and more memorable details.",
    );
  });

  it("returns the exact 'open' copy", () => {
    expect(investmentShapingLine("open")).toBe(
      "Shaped around the strongest fit for your route, rhythm and interests.",
    );
  });

  it("returns null when investment is unset (renders nothing)", () => {
    expect(investmentShapingLine(null)).toBeNull();
  });
});
