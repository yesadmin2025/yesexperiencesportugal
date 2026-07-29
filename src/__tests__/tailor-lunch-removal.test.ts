/**
 * Arrábida Wine — "remove the included lunch" (binding rule, 2026-07-27).
 *
 * A flat −€15 per person. NOT a −5% stop removal, NOT a negative "Add lunch"
 * supplement. It is excluded from the −15% removal cap, applied after the 70%
 * operational floor, and never unlocks the 4th winery.
 */

import { describe, expect, it } from "vitest";
import {
  MAX_TAILOR_REDUCTION_PCT,
  TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR,
  lunchRemovalDiscountEur,
  operationalFloor,
  tailorAdjustedPerPax,
  tailorFinalPerPax,
} from "@/config/pricing";
import {
  allowsLunchRemoval,
  canSelectWineries,
  lunchRemovalEur,
  tailorRules,
  tailorSupplementsEur,
} from "@/data/tailorRules";

const ARRABIDA = "arrabida-wine-allinclusive";
const DIRECT = 200;

describe("Arrábida Wine lunch removal", () => {
  it("includes lunch by default — no credit until removed", () => {
    expect(tailorRules(ARRABIDA).allowRemoveLunch).toBe(true);
    expect(lunchRemovalEur(ARRABIDA, false)).toBe(0);
    expect(tailorFinalPerPax(DIRECT, 0, 0, lunchRemovalEur(ARRABIDA, false))).toBe(DIRECT);
  });

  it("removing lunch subtracts exactly €15 per person", () => {
    expect(lunchRemovalEur(ARRABIDA, true)).toBe(15);
    expect(TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR).toBe(15);
    expect(tailorFinalPerPax(DIRECT, 0, 0, 15)).toBe(DIRECT - 15);
  });

  it("party discount equals €15 × participants", () => {
    for (const pax of [1, 2, 4, 7]) {
      const withLunch = tailorFinalPerPax(DIRECT, 0, 0, 0) * pax;
      const without = tailorFinalPerPax(DIRECT, 0, 0, 15) * pax;
      expect(withLunch - without).toBe(15 * pax);
    }
  });

  it("does not apply a −5% stop reduction", () => {
    // Base is untouched by lunch removal; only the flat credit moves.
    expect(tailorAdjustedPerPax(DIRECT, 0)).toBe(DIRECT);
    expect(tailorFinalPerPax(DIRECT, 0, 0, 15)).toBe(DIRECT - 15);
    expect(tailorFinalPerPax(DIRECT, 0, 0, 15)).not.toBe(tailorAdjustedPerPax(DIRECT, 1));
  });

  it("does not unlock the 4th winery", () => {
    const gate = canSelectWineries(ARRABIDA, 4, 0);
    expect(gate.allowed).toBe(false);
    expect(gate.allowed === false && gate.code).toBe("needs-removal");
  });

  it("is ignored by the removal cap and the operational floor", () => {
    // Cap: base reduction saturates at −15% regardless of lunch removal.
    const cappedBase = Math.round(DIRECT * (1 - MAX_TAILOR_REDUCTION_PCT));
    expect(tailorAdjustedPerPax(DIRECT, 99)).toBe(Math.max(cappedBase, operationalFloor(DIRECT)));
    // Floor applies to the base only — the flat credit lands after it.
    expect(tailorFinalPerPax(DIRECT, 99, 0, 15)).toBe(tailorAdjustedPerPax(DIRECT, 99) - 15);
  });

  it("re-adding lunch restores exactly €15 per person", () => {
    const removed = tailorFinalPerPax(DIRECT, 2, 20, lunchRemovalEur(ARRABIDA, true));
    const restored = tailorFinalPerPax(DIRECT, 2, 20, lunchRemovalEur(ARRABIDA, false));
    expect(restored - removed).toBe(15);
  });

  it("stacks correctly with winery supplements", () => {
    // 1 stop removed (−5%), 4 wineries (+€40), lunch removed (−€15).
    const supplements = tailorSupplementsEur(ARRABIDA, { wineriesSelected: 4 });
    expect(supplements).toBe(40);
    expect(tailorFinalPerPax(DIRECT, 1, supplements, 15)).toBe(Math.round(DIRECT * 0.95) + 40 - 15);
  });

  it("is unavailable for every other Signature", () => {
    for (const id of [
      "troia-comporta",
      "roman-heritage-alentejo",
      "wild-beaches-picnic",
      "sintra-cascais",
      "evora-alentejo",
    ]) {
      expect(allowsLunchRemoval(id)).toBe(false);
      expect(lunchRemovalEur(id, true)).toBe(0);
      expect(lunchRemovalDiscountEur(id, true)).toBe(0);
    }
  });
});
