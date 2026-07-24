import { describe, expect, it } from "vitest";
import {
  MAX_TAILOR_REDUCTION_PCT,
  MIN_OPERATIONAL_PCT,
  TAILOR_PRINCIPAL_STEP_PCT,
  operationalFloor,
  tailorAdjustedPerPax,
} from "@/config/pricing";

/**
 * SSOT lock — Batch B (Tailor pricing).
 * Each principal stop removed = −5%, capped at −15%, floored at 70% of
 * direct. See docs/audit-2026-07/tailor-formula.md.
 */
describe("tailorAdjustedPerPax", () => {
  it("returns the direct price when no principals removed", () => {
    expect(tailorAdjustedPerPax(200, 0)).toBe(200);
    expect(tailorAdjustedPerPax(139, 0)).toBe(139);
  });

  it("applies −5% per principal removed up to the −15% cap", () => {
    // €200 anchor
    expect(tailorAdjustedPerPax(200, 1)).toBe(Math.round(200 * 0.95)); // 190
    expect(tailorAdjustedPerPax(200, 2)).toBe(Math.round(200 * 0.9));  // 180
    expect(tailorAdjustedPerPax(200, 3)).toBe(Math.round(200 * 0.85)); // 170
    // Cap holds beyond 3 removals
    expect(tailorAdjustedPerPax(200, 4)).toBe(Math.round(200 * 0.85));
    expect(tailorAdjustedPerPax(200, 8)).toBe(Math.round(200 * 0.85));
  });

  it("never drops below the operational floor (70% of direct)", () => {
    const direct = 100;
    const floor = operationalFloor(direct);
    expect(floor).toBe(70);
    // Reduction cap (−15%) already keeps us above the 70% floor, so
    // the floor engages only when the cap ever moves.
    for (let n = 0; n <= 8; n++) {
      expect(tailorAdjustedPerPax(direct, n)).toBeGreaterThanOrEqual(floor);
    }
  });

  it("clamps negative principal counts to zero", () => {
    expect(tailorAdjustedPerPax(139, -2)).toBe(139);
  });

  it("returns 0 for invalid anchors", () => {
    expect(tailorAdjustedPerPax(0, 3)).toBe(0);
    expect(tailorAdjustedPerPax(Number.NaN, 1)).toBe(0);
  });

  it("keeps the policy constants stable", () => {
    expect(TAILOR_PRINCIPAL_STEP_PCT).toBe(0.05);
    expect(MAX_TAILOR_REDUCTION_PCT).toBe(0.15);
    expect(MIN_OPERATIONAL_PCT).toBe(0.7);
  });
});
