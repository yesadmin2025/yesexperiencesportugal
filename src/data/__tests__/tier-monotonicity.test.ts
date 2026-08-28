import { describe, expect, it } from "vitest";
import {
  ACKNOWLEDGED_NON_MONOTONIC_STEPS,
  auditSignatureTierMonotonicity,
  findNonMonotonicSteps,
  partyTotalEur,
} from "../tierMonotonicityAudit";

describe("party-total monotonicity audit", () => {
  it("detects a drop when adding a guest lowers the total", () => {
    const steps = findNonMonotonicSteps({ 5: 169, 6: 135 });
    expect(steps).toEqual([
      { from: 5, to: 6, fromTotalEur: 845, toTotalEur: 810, dropEur: 35 },
    ]);
  });

  it("reports nothing for a monotonic ladder", () => {
    expect(findNonMonotonicSteps({ 1: 200, 2: 150, 3: 120, 4: 100 })).toEqual([]);
  });

  it("skips absent exact tiers instead of inventing a total", () => {
    expect(partyTotalEur({ 2: 150 }, 1)).toBeNull();
    expect(partyTotalEur(undefined, 4)).toBeNull();
    expect(findNonMonotonicSteps({ 2: 300, 4: 100 })).toEqual([]);
  });

  it("matches the owner-acknowledged set exactly (new drops must fail)", () => {
    const actual = Object.fromEntries(
      auditSignatureTierMonotonicity().map((f) => [
        f.tourId,
        f.steps.map((s) => s.from),
      ]),
    );
    expect(actual).toEqual(ACKNOWLEDGED_NON_MONOTONIC_STEPS);
  });

  it("does not mutate or expose any approved amount", () => {
    const tiers = { 5: 169, 6: 135 };
    findNonMonotonicSteps(tiers);
    expect(tiers).toEqual({ 5: 169, 6: 135 });
  });
});
