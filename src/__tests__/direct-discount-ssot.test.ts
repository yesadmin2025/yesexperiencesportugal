/**
 * Direct-booking discount SSOT lock.
 *
 * Guarantees for every Signature tour:
 *   1. Every tier in VIATOR_META.priceTiersEUR matches the DB snapshot
 *      (recorded here) — i.e. the offline fallback == the DB source of
 *      truth.
 *   2. Each direct tier == round(platform_tier × (1 − DIRECT_DISCOUNT_PCT)),
 *      i.e. the 15% direct-booking discount is applied everywhere.
 *   3. signatureTours[id].priceFrom == the smallest direct tier, i.e. the
 *      "From €X" anchor on cards matches what checkout will actually charge
 *      a full group.
 *
 * If a tier moves, update PLATFORM_TIERS below (the true supplier rate) and
 * the discounted DIRECT_TIERS falls out automatically — mismatches then
 * either point at a stale DB row (fix the DB) or a VIATOR_META tier that
 * wasn't re-discounted (fix the code).
 */
import { describe, it, expect } from "vitest";
import { signatureTours } from "@/data/signatureTours";
import { VIATOR_META } from "@/data/signatureToursViator";
import { DIRECT_DISCOUNT_PCT } from "@/config/pricing";

// Snapshot of the current Viator/platform per-pax EUR by group size for
// every tour we sell directly. Source: supplier.viator.com (see each
// VIATOR_META entry's inline comment).
const PLATFORM_TIERS: Record<string, Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>>> = {
  "arrabida-wine-allinclusive": { 1: 279, 2: 215, 3: 215, 4: 189, 5: 189, 6: 189, 7: 159, 8: 159 },
  "wild-beaches-picnic": { 2: 159, 3: 159, 4: 159, 5: 159, 6: 159, 7: 139, 8: 139 },
  "arrabida-boat": { 2: 209, 3: 209, 4: 199, 5: 199, 6: 159, 7: 159, 8: 159 },
  "azeitao-cheese": { 2: 239, 3: 189, 4: 189, 5: 149, 6: 149, 7: 149, 8: 119 },
  "sintra-cascais": { 2: 215, 3: 215, 4: 199, 5: 199, 6: 199, 7: 189, 8: 189 },
  "troia-comporta": { 2: 285, 3: 235, 4: 235, 5: 195, 6: 195, 7: 195, 8: 185 },
  "evora-alentejo": { 2: 279, 3: 249, 4: 249, 5: 199, 6: 199, 7: 199, 8: 199 },
  "tomar-coimbra": { 2: 318, 3: 189, 4: 189, 5: 189, 6: 189, 7: 189, 8: 179 },
  "fatima-nazare-obidos": { 1: 359, 2: 229, 3: 229, 4: 179, 5: 179, 6: 179, 7: 179, 8: 159 },
  "roman-heritage-alentejo": { 2: 399, 3: 345, 4: 345, 5: 320, 6: 320, 7: 299, 8: 299 },
  "southwest-vicentine-coast": { 2: 359, 3: 359, 4: 299, 5: 299, 6: 299, 7: 239, 8: 239 },
};

function directOf(platform: number): number {
  return Math.round(platform * (1 - DIRECT_DISCOUNT_PCT));
}

describe("Direct-booking discount — 15% off platform on every tier", () => {
  it("DIRECT_DISCOUNT_PCT is exactly 0.15", () => {
    expect(DIRECT_DISCOUNT_PCT).toBe(0.15);
  });

  for (const [tourId, platform] of Object.entries(PLATFORM_TIERS)) {
    describe(tourId, () => {
      const meta = VIATOR_META[tourId];
      const tour = signatureTours.find((t) => t.id === tourId);

      it("has VIATOR_META with priceTiersEUR", () => {
        expect(meta, `missing VIATOR_META entry for ${tourId}`).toBeTruthy();
        expect(meta?.priceTiersEUR, `missing priceTiersEUR for ${tourId}`).toBeTruthy();
      });

      it("has a signatureTours entry with priceFrom", () => {
        expect(tour, `missing signatureTours entry for ${tourId}`).toBeTruthy();
        expect(typeof tour?.priceFrom).toBe("number");
      });

      for (const [tierKeyStr, platformEur] of Object.entries(platform)) {
        const tier = Number(tierKeyStr) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
        const expectedDirect = directOf(platformEur!);
        it(`tier ${tier}: €${platformEur} platform → €${expectedDirect} direct`, () => {
          const actual = meta?.priceTiersEUR?.[tier];
          expect(actual, `${tourId} tier ${tier} missing from VIATOR_META`).toBe(expectedDirect);
        });
      }

      it("priceFrom matches the smallest direct tier (full-group anchor)", () => {
        const directTiers = Object.values(platform).map((p) => directOf(p!));
        const anchor = Math.min(...directTiers);
        expect(tour?.priceFrom).toBe(anchor);
      });
    });
  }
});
