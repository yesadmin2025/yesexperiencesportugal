// Real per-pax price resolver — Studio V3 + Reveal.
//
// Truth model:
//   1. signatureTours[id].priceFrom is the EUR "from" anchor (= Viator
//      8+ pax tier, the lowest per-person rate).
//   2. VIATOR_META[id].priceTiersEUR (optional) carries the REAL per-pax
//      EUR rate for each smaller group size, scraped from the live Viator
//      product page. When present, we display the exact per-pax rate for
//      the traveller's chosen guest count.
//   3. When tier data is absent, we NEVER invent it — we fall back to the
//      "from" anchor and the UI labels it as such.

import { VIATOR_META } from "./signatureToursViator";
import type { SignatureTour } from "./signatureTours";

export type PerPaxResolution = {
  /** EUR per person — either real (tier-matched) or the "from" anchor. */
  eurPerPax: number;
  /** True when the value came from real Viator tier data for THIS group size. */
  real: boolean;
  /** Group size we resolved against (clamped to 1..8). */
  tier: number;
  /** Convenience: party total when guests ≥ 1. */
  partyTotalEur: number;
};

/**
 * Resolve the per-pax EUR price for a tour + party size.
 *  - When `guests` is null/undefined, returns the 8+ "from" anchor (real=false).
 *  - When `guests` >= 8, clamps to tier 8 (=== priceFrom).
 *  - When real tier data exists for the resolved tier, returns it (real=true).
 *  - Otherwise returns priceFrom (real=false).
 */
export function resolvePerPaxEur(
  tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined,
  guests: number | null | undefined,
): PerPaxResolution | null {
  if (!tour) return null;
  const anchor = typeof tour.priceFrom === "number" && tour.priceFrom > 0 ? tour.priceFrom : null;
  if (anchor == null) return null;

  const tier = clampTier(guests);
  const tiers = VIATOR_META[tour.id]?.priceTiersEUR;
  const real = tiers && typeof tiers[tier as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8] === "number"
    ? (tiers[tier as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8] as number)
    : null;

  const eurPerPax = real ?? anchor;
  const partyGuests = typeof guests === "number" && guests > 0 ? guests : 1;
  return {
    eurPerPax,
    real: real != null,
    tier,
    partyTotalEur: eurPerPax * partyGuests,
  };
}

function clampTier(guests: number | null | undefined): number {
  if (typeof guests !== "number" || !Number.isFinite(guests) || guests < 1) return 8;
  if (guests >= 8) return 8;
  return Math.round(guests);
}
