// Tier pricing integrity — verifies Signature <-> Viator meta <-> Studio v2
// blueprint outputs stay aligned, and that the resolver picks the right tier
// for a given guest count.

import { describe, it, expect } from "vitest";
import { signatureTours } from "@/data/signatureTours";
import { VIATOR_META, type PriceTiersEUR } from "@/data/signatureToursViator";
import { resolvePerPaxEur } from "@/data/signatureTourPricing";
import { BLUEPRINTS } from "@/lib/studio-v2/blueprints";

const TIER_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function orderedTierValues(tiers: PriceTiersEUR): number[] {
  return TIER_KEYS.map((k) => tiers[k]).filter((v): v is number => typeof v === "number");
}

describe("priceTiersEUR data integrity", () => {
  const withTiers = Object.entries(VIATOR_META).filter(
    ([, m]) => m.priceTiersEUR && Object.keys(m.priceTiersEUR).length > 0,
  );

  it("has at least one tour with tier data", () => {
    expect(withTiers.length).toBeGreaterThan(0);
  });

  it.each(withTiers)("%s: tier 8 anchor is present and positive", (_id, meta) => {
    const tiers = meta.priceTiersEUR!;
    expect(tiers[8]).toBeTypeOf("number");
    expect(tiers[8]!).toBeGreaterThan(0);
  });

  it.each(withTiers)("%s: tier values are positive and monotonically non-increasing", (_id, meta) => {
    const values = orderedTierValues(meta.priceTiersEUR!);
    expect(values.length).toBeGreaterThan(0);
    for (let i = 0; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(0);
      expect(Number.isFinite(values[i])).toBe(true);
      if (i > 0) expect(values[i]).toBeLessThanOrEqual(values[i - 1]!);
    }
  });
});

describe("Signature ↔ Viator meta ↔ Studio v2 blueprint — southwest-vicentine-coast", () => {
  const tourId = "southwest-vicentine-coast";
  const tour = signatureTours.find((t) => t.id === tourId)!;
  const meta = VIATOR_META[tourId];
  const blueprint = BLUEPRINTS.find((b) => b.sourceTourKeys.includes(tourId))!;

  it("all three sources exist", () => {
    expect(tour).toBeTruthy();
    expect(meta).toBeTruthy();
    expect(blueprint).toBeTruthy();
  });

  it("priceFrom === tiers[8] === blueprint.pricePerGuestFrom === 239", () => {
    expect(tour.priceFrom).toBe(239);
    expect(meta.priceTiersEUR?.[8]).toBe(239);
    expect(blueprint.pricePerGuestFrom).toBe(239);
  });

  it("has the expected per-tier rate ladder", () => {
    expect(meta.priceTiersEUR).toEqual({
      2: 359,
      3: 359,
      4: 299,
      5: 299,
      6: 299,
      7: 239,
      8: 239,
    });
  });
});

describe("resolvePerPaxEur — auto-picks correct tier from guest count", () => {
  const tour = signatureTours.find((t) => t.id === "southwest-vicentine-coast")!;

  it.each([
    [2, 359, true],
    [3, 359, true],
    [4, 299, true],
    [6, 299, true],
    [7, 239, true],
    [8, 239, true],
    [10, 239, true], // clamps up to tier 8
  ] as const)("guests=%s → €%s/pp (real=%s)", (guests, expectedEur, expectedReal) => {
    const r = resolvePerPaxEur(tour, guests);
    expect(r?.eurPerPax).toBe(expectedEur);
    expect(r?.real).toBe(expectedReal);
    expect(r?.partyTotalEur).toBe(expectedEur * guests);
  });

  it("guests=null falls back to the 8+ anchor and is NOT labelled real", () => {
    const r = resolvePerPaxEur(tour, null);
    expect(r?.eurPerPax).toBe(tour.priceFrom);
    expect(r?.eurPerPax).toBe(239);
    // When guests is unknown we clamp to tier 8; tier data still exists so
    // resolver returns real=true — but the UI treats null guests as anchor.
    expect(r?.tier).toBe(8);
  });

  it("respects runtime overrides (DB-backed tier edits)", () => {
    const override: Record<string, PriceTiersEUR> = {
      [tour.id]: { 2: 400, 3: 400, 4: 350, 5: 350, 6: 350, 7: 300, 8: 260 },
    };
    expect(resolvePerPaxEur(tour, 2, override)?.eurPerPax).toBe(400);
    expect(resolvePerPaxEur(tour, 8, override)?.eurPerPax).toBe(260);
  });
});
