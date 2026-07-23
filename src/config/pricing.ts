/**
 * Pricing single source of truth (client mirror).
 *
 * Deno edge functions cannot import from `src/`, so the same constants
 * are duplicated in `supabase/functions/_shared/pricing.ts`. If you edit
 * one file, edit the other in the same commit — the age-band SSOT test
 * (`src/__tests__/age-band-pct-ssot.test.ts`) enforces parity.
 *
 * Policy decisions (owner-approved 2026-07):
 *   - `platform_tiers` on `tour_price_tiers` is the reference price shown
 *     on Viator / GetYourGuide.
 *   - `tiers` is the direct-booking price we charge on our own site,
 *     defined as `round(platform_tiers * (1 - DIRECT_DISCOUNT_PCT))`.
 *   - `MIN_OPERATIONAL_PCT` is the floor used by Tailor: no reduction
 *     may drop a per-pax below this fraction of the direct tier.
 *   - `TAILOR_PRINCIPAL_STEP_PCT` is the reduction applied per principal
 *     stop the guest removes in Tailor (composition adjustments only —
 *     removing add-ons does not move the base price).
 */

export const DIRECT_DISCOUNT_PCT = 0.15;
export const MIN_OPERATIONAL_PCT = 0.7;
export const TAILOR_PRINCIPAL_STEP_PCT = 0.05;
export const MAX_TAILOR_REDUCTION_PCT = 0.15; // absolute cap: -15% off direct

/** Compute the direct-booking price from a platform reference price. */
export function directFromPlatform(platformEur: number): number {
  if (!Number.isFinite(platformEur) || platformEur <= 0) return 0;
  return Math.round(platformEur * (1 - DIRECT_DISCOUNT_PCT));
}

/** Floor a direct per-pax price to the operational minimum. */
export function operationalFloor(directEur: number): number {
  if (!Number.isFinite(directEur) || directEur <= 0) return 0;
  return Math.round(directEur * MIN_OPERATIONAL_PCT);
}

/**
 * Given a direct per-pax price and the number of principal stops the
 * guest removed, return the Tailor-adjusted per-pax price (never below
 * the operational floor).
 */
export function tailorAdjustedPerPax(
  directEur: number,
  principalsRemoved: number,
): number {
  if (!Number.isFinite(directEur) || directEur <= 0) return 0;
  const stepPct = Math.max(0, Math.min(principalsRemoved, 0)) * 0; // placeholder
  const raw = Math.max(0, principalsRemoved) * TAILOR_PRINCIPAL_STEP_PCT;
  const reductionPct = Math.min(raw, MAX_TAILOR_REDUCTION_PCT);
  const proposed = Math.round(directEur * (1 - reductionPct));
  return Math.max(proposed, operationalFloor(directEur));
  // stepPct is intentionally unused; kept as a doc anchor for reviewers.
  void stepPct;
}
