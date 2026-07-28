import { describe, expect, it } from "vitest";
import { signatureTours } from "@/data/signatureTours";

/**
 * Card price parity with Stripe.
 *
 * `create-signature-checkout` resolves the per-person price SERVER-SIDE
 * from `public.tour_price_tiers` (tier = total headcount, capped at 8).
 * The "From €X per person" figure on every Signature card is
 * `signatureTours[].priceFrom`, which by definition must equal the
 * 8-guest tier — the lowest per-person price a guest can ever be charged.
 *
 * TIER_8 below mirrors `tour_price_tiers.tiers->>'8'` as verified against
 * the live table on 2026-07-28. If a tier changes in the database, this
 * table AND `priceFrom` must be updated in the same change — otherwise a
 * card advertises a price Stripe will never charge.
 */
const TIER_8: Record<string, number> = {
  "arrabida-boat": 135,
  "arrabida-wine-allinclusive": 135,
  "azeitao-cheese": 101,
  "evora-alentejo": 169,
  "fatima-nazare-obidos": 135,
  "roman-heritage-alentejo": 254,
  "sintra-cascais": 161,
  "southwest-vicentine-coast": 203,
  "tiles-workshop": 135,
  "tomar-coimbra": 152,
  "troia-comporta": 157,
  "wild-beaches-picnic": 118,
};

describe("Signature card price parity with Stripe tiers", () => {
  it("every Signature has a known 8-guest tier", () => {
    for (const t of signatureTours) {
      expect(TIER_8[t.id], `${t.id} missing tier row`).toBeTypeOf("number");
    }
  });

  it('card "From €X" equals the 8-guest tier Stripe charges', () => {
    for (const t of signatureTours) {
      expect(t.priceFrom, `${t.id} priceFrom`).toBe(TIER_8[t.id]);
    }
  });

  it("no Signature advertises a price below its cheapest tier", () => {
    for (const t of signatureTours) {
      expect(t.priceFrom).toBeGreaterThan(0);
      expect(t.priceFrom).toBeGreaterThanOrEqual(TIER_8[t.id]);
    }
  });
});
