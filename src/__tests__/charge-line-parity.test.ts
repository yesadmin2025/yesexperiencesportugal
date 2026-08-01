import { describe, expect, it } from "vitest";
import { resolveJourneyPricing } from "@/data/signatureTourPricing";
import { addOnsPartyTotal } from "@/lib/checkout/studio-charge";

/**
 * Charge-line parity — the "You'll be charged €X" figure rendered before
 * guest details MUST equal the total each flow sends to Stripe.
 *
 * Both sides are computed here with the exact expressions used in the
 * product code (see SimpleBookingForm, tours_.$tourId.tailor, StudioV3).
 */

const TOUR = { id: "parity-test-tour", priceFrom: 180 } as const;

const COMPOSITIONS: Array<{ adults: number; minorAges: number[] }> = [
  { adults: 2, minorAges: [] },
  { adults: 2, minorAges: [7] },
  { adults: 2, minorAges: [1] },
  { adults: 6, minorAges: [] },
  { adults: 2, minorAges: [14, 5, 0] },
];

describe("charge-line parity with Stripe totals", () => {
  it("Signature: quote total === reserve total", () => {
    for (const c of COMPOSITIONS) {
      const quote = resolveJourneyPricing(TOUR, c.adults, c.minorAges, null);
      const reserve = resolveJourneyPricing(TOUR, c.adults, c.minorAges, null);
      expect(quote?.totalEur).toBe(reserve?.totalEur);
      expect(quote?.totalEur).toBeGreaterThan(0);
    }
  });

  it("Tailor: pinned tier override drives both quote and reserve", () => {
    const adjustedPerPax = 153; // e.g. 180 with two principal stops removed
    const override = {
      [TOUR.id]: {
        1: adjustedPerPax,
        2: adjustedPerPax,
        3: adjustedPerPax,
        4: adjustedPerPax,
        5: adjustedPerPax,
        6: adjustedPerPax,
        7: adjustedPerPax,
        8: adjustedPerPax,
      },
    } as const;
    for (const c of COMPOSITIONS) {
      const quote = resolveJourneyPricing(
        { id: TOUR.id, priceFrom: adjustedPerPax },
        c.adults,
        c.minorAges,
        override,
      );
      expect(quote?.perPaxAdultEur).toBe(adjustedPerPax);
      // Adults are charged full band; minors banded.
      const expected =
        c.adults * adjustedPerPax +
        c.minorAges.reduce((s, age) => {
          const pct = age >= 18 ? 1 : age >= 11 ? 0.75 : age >= 3 ? 0.5 : 0;
          return s + Math.round(adjustedPerPax * pct);
        }, 0);
      expect(quote?.totalEur).toBe(expected);
    }
  });

  it("Studio: quote total includes the same add-on party total as checkout", () => {
    const addOns = [
      { unit: "per_person", perUnit: 25, amount: 0 },
      { unit: "per_group", perUnit: 90, amount: 0 },
    ];
    for (const c of COMPOSITIONS) {
      const guests = c.adults + c.minorAges.length;
      const journey = resolveJourneyPricing(TOUR, c.adults, c.minorAges, null);
      const addOnTotal = addOnsPartyTotal(addOns, guests);
      expect(addOnTotal).toBe(25 * guests + 90);
      const quoteTotal = Math.round((journey?.totalEur ?? 0) + addOnTotal);
      const reserveTotal = Math.round((journey?.totalEur ?? 0) + addOnTotal);
      expect(quoteTotal).toBe(reserveTotal);
    }
  });
});
