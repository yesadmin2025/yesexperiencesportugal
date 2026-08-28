import type { PriceTiersEUR } from "@/data/signatureToursViator";

export type PricingTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface TierTotalInversion {
  readonly fromGuests: PricingTier;
  readonly toGuests: PricingTier;
  readonly fromPerPaxEur: number;
  readonly toPerPaxEur: number;
  readonly fromPartyTotalEur: number;
  readonly toPartyTotalEur: number;
  /** Smallest whole-euro per-pax value for `toGuests` that prevents the total falling. */
  readonly minimumNonDecreasingPerPaxEur: number;
  readonly shortfallEur: number;
}

const TIERS: readonly PricingTier[] = [1, 2, 3, 4, 5, 6, 7, 8];

function positiveTierValue(tiers: PriceTiersEUR | null | undefined, tier: PricingTier): number | null {
  const value = tiers?.[tier];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Canonical public "from" price for tiered Signatures.
 *
 * YES pricing semantics define the 8-pax tier as the public per-person anchor.
 * The Admin must derive this from the tier table instead of maintaining a
 * second editable `priceFrom` value in code.
 */
export function derivePublicFromEur(tiers: PriceTiersEUR | null | undefined): number | null {
  return positiveTierValue(tiers, 8);
}

/** Exact adult party total for one approved tier. Missing tiers stay missing. */
export function partyTotalForTier(
  tiers: PriceTiersEUR | null | undefined,
  guests: PricingTier,
): number | null {
  const perPax = positiveTierValue(tiers, guests);
  return perPax == null ? null : perPax * guests;
}

/**
 * Find adjacent APPROVED tiers where adding one traveller makes the whole
 * adult party cheaper. Missing tiers are deliberately skipped rather than
 * inferred, matching checkout's fail-closed exact-tier authority.
 */
export function findTierTotalInversions(
  tiers: PriceTiersEUR | null | undefined,
): TierTotalInversion[] {
  const issues: TierTotalInversion[] = [];

  for (let i = 1; i < TIERS.length; i += 1) {
    const fromGuests = TIERS[i - 1]!;
    const toGuests = TIERS[i]!;
    const fromPerPaxEur = positiveTierValue(tiers, fromGuests);
    const toPerPaxEur = positiveTierValue(tiers, toGuests);
    if (fromPerPaxEur == null || toPerPaxEur == null) continue;

    const fromPartyTotalEur = fromPerPaxEur * fromGuests;
    const toPartyTotalEur = toPerPaxEur * toGuests;
    if (toPartyTotalEur >= fromPartyTotalEur) continue;

    issues.push({
      fromGuests,
      toGuests,
      fromPerPaxEur,
      toPerPaxEur,
      fromPartyTotalEur,
      toPartyTotalEur,
      minimumNonDecreasingPerPaxEur: Math.ceil(fromPartyTotalEur / toGuests),
      shortfallEur: fromPartyTotalEur - toPartyTotalEur,
    });
  }

  return issues;
}

/**
 * Human-safe summary used by Admin surfaces. This never mutates tiers and
 * never recommends lowering an existing price.
 */
export function pricingGuardrailSummary(tiers: PriceTiersEUR | null | undefined): {
  readonly publicFromEur: number | null;
  readonly inversions: readonly TierTotalInversion[];
  readonly hasInversions: boolean;
} {
  const inversions = findTierTotalInversions(tiers);
  return {
    publicFromEur: derivePublicFromEur(tiers),
    inversions,
    hasInversions: inversions.length > 0,
  };
}
