// Per-pax price resolver — Signature reserve path.
// Truth model:
//   1. signatureTours[id].priceFrom is the EUR "from" anchor.
//   2. VIATOR_META[id].priceTiersEUR (optional) carries per-pax EUR rates
//      for each smaller group size.
//   3. When tier data is absent we fall back to the "from" anchor.

import { VIATOR_META, type PriceTiersEUR } from "./signatureToursViator";
import type { SignatureTour } from "./signatureTours";

export type PerPaxResolution = {
  eurPerPax: number;
  real: boolean;
  tier: number;
  partyTotalEur: number;
};

export function resolvePerPaxEur(
  tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined,
  guests: number | null | undefined,
  overrides?: Record<string, PriceTiersEUR | undefined> | null,
): PerPaxResolution | null {
  if (!tour) return null;
  const anchor = typeof tour.priceFrom === "number" && tour.priceFrom > 0 ? tour.priceFrom : null;
  if (anchor == null) return null;

  const tier = clampTier(guests);
  const tiers = overrides?.[tour.id] ?? VIATOR_META[tour.id]?.priceTiersEUR;
  const real =
    tiers && typeof tiers[tier as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8] === "number"
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
