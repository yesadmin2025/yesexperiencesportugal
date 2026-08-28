/**
 * PARTY-TOTAL MONOTONICITY AUDIT (report-only).
 *
 * Per-pax price tiers drop as the party grows. When a band drops sharply,
 * the PARTY TOTAL (`n x pricePerPax(n)`) can DECREASE when a guest is added,
 * so a direct customer can pay less by declaring an extra traveller.
 *
 * This module only REPORTS. It never changes an approved amount and is not
 * wired into pricing or checkout. Owner approval is required before any tier
 * is edited or before a monotonic floor is applied at total level.
 */
import { VIATOR_META, type PriceTiersEUR } from "./signatureToursViator";

export type NonMonotonicStep = {
  /** Party size before adding a guest. */
  from: number;
  /** Party size after adding a guest. */
  to: number;
  fromTotalEur: number;
  toTotalEur: number;
  /** Positive euro amount the larger party saves. */
  dropEur: number;
};

export type TourMonotonicityFinding = {
  tourId: string;
  steps: NonMonotonicStep[];
};

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** Party total for an exact size, or null when that exact tier is absent. */
export function partyTotalEur(
  tiers: PriceTiersEUR | undefined,
  guests: number,
): number | null {
  if (!tiers) return null;
  const perPax = tiers[guests as (typeof PARTY_SIZES)[number]];
  if (typeof perPax !== "number") return null;
  return perPax * guests;
}

/** Every adjacent step where adding one guest lowers the party total. */
export function findNonMonotonicSteps(
  tiers: PriceTiersEUR | undefined,
): NonMonotonicStep[] {
  const steps: NonMonotonicStep[] = [];
  for (let n = 1; n < 8; n += 1) {
    const fromTotalEur = partyTotalEur(tiers, n);
    const toTotalEur = partyTotalEur(tiers, n + 1);
    if (fromTotalEur == null || toTotalEur == null) continue;
    if (toTotalEur < fromTotalEur) {
      steps.push({
        from: n,
        to: n + 1,
        fromTotalEur,
        toTotalEur,
        dropEur: fromTotalEur - toTotalEur,
      });
    }
  }
  return steps;
}

/** Audit every Signature tour that carries verified tier data. */
export function auditSignatureTierMonotonicity(): TourMonotonicityFinding[] {
  return Object.entries(VIATOR_META)
    .map(([tourId, meta]) => ({
      tourId,
      steps: findNonMonotonicSteps(meta.priceTiersEUR),
    }))
    .filter((finding) => finding.steps.length > 0)
    .sort((a, b) => a.tourId.localeCompare(b.tourId));
}

/**
 * Owner-acknowledged non-monotonic steps present in the currently APPROVED
 * tier data (2026-08 audit). Listed as `tourId` -> smaller party size.
 *
 * These are reported, not fixed: correcting them changes approved amounts and
 * needs an owner decision. The regression test fails if a NEW drop appears,
 * so future tier edits cannot introduce one silently.
 */
export const ACKNOWLEDGED_NON_MONOTONIC_STEPS: Readonly<
  Record<string, readonly number[]>
> = {
  "arrabida-boat": [5],
  "arrabida-wine-allinclusive": [6],
  "azeitao-cheese": [4, 7],
  "evora-alentejo": [4],
  "southwest-vicentine-coast": [6],
  "tiles-workshop": [6],
  "tomar-coimbra": [2],
};
