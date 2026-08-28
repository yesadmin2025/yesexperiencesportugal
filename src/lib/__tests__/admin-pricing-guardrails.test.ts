import { describe, expect, it } from "vitest";
import type { PriceTiersEUR } from "@/data/signatureToursViator";
import {
  derivePublicFromEur,
  findTierTotalInversions,
  partyTotalForTier,
  pricingGuardrailSummary,
} from "@/lib/admin-pricing-guardrails";

describe("Admin pricing guardrails", () => {
  it("derives the public from anchor from tier 8 only", () => {
    const tiers: PriceTiersEUR = { 2: 270, 3: 161, 8: 152 };
    expect(derivePublicFromEur(tiers)).toBe(152);
    expect(derivePublicFromEur({ 2: 100, 3: 90 })).toBeNull();
  });

  it("computes an exact adult party total without inventing missing tiers", () => {
    const tiers: PriceTiersEUR = { 2: 183, 3: 183, 8: 135 };
    expect(partyTotalForTier(tiers, 2)).toBe(366);
    expect(partyTotalForTier(tiers, 1)).toBeNull();
  });

  it("detects the Tomar 2→3 total inversion and gives the minimum upward correction", () => {
    const tiers: PriceTiersEUR = { 2: 270, 3: 161, 4: 161, 5: 161, 6: 161, 7: 161, 8: 152 };
    expect(findTierTotalInversions(tiers)).toEqual([
      {
        fromGuests: 2,
        toGuests: 3,
        fromPerPaxEur: 270,
        toPerPaxEur: 161,
        fromPartyTotalEur: 540,
        toPartyTotalEur: 483,
        minimumNonDecreasingPerPaxEur: 180,
        shortfallEur: 57,
      },
    ]);
  });

  it("finds multiple inversions without changing the supplied tiers", () => {
    const tiers: PriceTiersEUR = { 2: 203, 3: 161, 4: 161, 5: 127, 6: 127, 7: 127, 8: 101 };
    const before = JSON.stringify(tiers);
    const issues = findTierTotalInversions(tiers);

    expect(issues.map((x) => [x.fromGuests, x.toGuests])).toEqual([
      [4, 5],
      [7, 8],
    ]);
    expect(issues[0]?.minimumNonDecreasingPerPaxEur).toBe(129);
    expect(issues[1]?.minimumNonDecreasingPerPaxEur).toBe(112);
    expect(JSON.stringify(tiers)).toBe(before);
  });

  it("does not compare across missing exact tiers", () => {
    const tiers: PriceTiersEUR = { 1: 300, 3: 50, 8: 100 };
    expect(findTierTotalInversions(tiers)).toEqual([]);
  });

  it("does not flag a total that stays equal or rises", () => {
    const tiers: PriceTiersEUR = { 2: 150, 3: 100, 4: 80, 8: 50 };
    expect(findTierTotalInversions(tiers)).toEqual([]);
  });

  it("returns a compact read-only summary for Admin UI", () => {
    const tiers: PriceTiersEUR = { 2: 270, 3: 161, 8: 152 };
    expect(pricingGuardrailSummary(tiers)).toMatchObject({
      publicFromEur: 152,
      hasInversions: true,
    });
    expect(pricingGuardrailSummary(tiers).inversions).toHaveLength(1);
  });
});
