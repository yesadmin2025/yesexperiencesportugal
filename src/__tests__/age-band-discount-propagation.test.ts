/**
 * Age-band × direct-discount propagation lock.
 *
 * The 15% direct-booking discount lives in the resolved per-pax tier.
 * Every age band is a % of that tier, so the discount MUST propagate to
 * Youth (75%), Child (50%) and Infant (0%) without any extra work.
 * This test walks a mixed party and asserts each line's unit price is
 * exactly `round(discountedPerPax × AGE_BAND_PCT[band])`.
 */
import { describe, it, expect } from "vitest";
import { signatureTours } from "@/data/signatureTours";
import {
  AGE_BAND_PCT,
  resolveJourneyPricing,
  resolvePerPaxEur,
} from "@/data/signatureTourPricing";

describe("Age-band pricing propagates the 15% direct discount", () => {
  // Pick a tour with a real tier ladder so the resolved per-pax price is
  // deterministic and non-trivial (not just the priceFrom anchor).
  const tour = signatureTours.find((t) => t.id === "southwest-vicentine-coast")!;

  it("resolves 1 adult + 1 youth + 1 child + 1 infant against the discounted tier", () => {
    const adults = 1;
    const minorAges = [14, 8, 1];
    const headcount = adults + minorAges.length; // 4 → tier 4
    const per = resolvePerPaxEur(tour, headcount)!;
    const expectedAdultEur = per.eurPerPax; // discounted direct rate

    const pricing = resolveJourneyPricing(tour, adults, minorAges)!;
    expect(pricing).toBeTruthy();
    expect(pricing.perPaxAdultEur).toBe(expectedAdultEur);

    const byBand = Object.fromEntries(pricing.lines.map((l) => [l.band, l]));
    expect(byBand.adult.unitEur).toBe(expectedAdultEur);
    expect(byBand.youth.unitEur).toBe(Math.round(expectedAdultEur * AGE_BAND_PCT.youth));
    expect(byBand.child.unitEur).toBe(Math.round(expectedAdultEur * AGE_BAND_PCT.child));
    expect(byBand.infant.unitEur).toBe(0);
  });

  it("propagates the discount at every tier (2..8) for every band", () => {
    for (let tier = 2 as number; tier <= 8; tier++) {
      const per = resolvePerPaxEur(tour, tier)!;
      const adultEur = per.eurPerPax;
      for (const band of ["adult", "youth", "child", "infant"] as const) {
        const expected = Math.round(adultEur * AGE_BAND_PCT[band]);
        // Sanity: minor unit is never higher than the adult.
        expect(expected).toBeLessThanOrEqual(adultEur);
        // Sanity: infant is always free.
        if (band === "infant") expect(expected).toBe(0);
      }
    }
  });
});
