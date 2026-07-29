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
export function tailorAdjustedPerPax(directEur: number, principalsRemoved: number): number {
  if (!Number.isFinite(directEur) || directEur <= 0) return 0;
  const raw = Math.max(0, principalsRemoved) * TAILOR_PRINCIPAL_STEP_PCT;
  const reductionPct = Math.min(raw, MAX_TAILOR_REDUCTION_PCT);
  const proposed = Math.round(directEur * (1 - reductionPct));
  return Math.max(proposed, operationalFloor(directEur));
}

/* -------------------------------------------------------------------- *
 * Authorized Tailor supplements (Canonical Signature Bible v1.1).      *
 * Supplements are flat per-person amounts and are NEVER touched by the *
 * percentage reduction or the operational floor.                       *
 * -------------------------------------------------------------------- */

/** "Add lunch" — offered only on Signatures where lunch is excluded. */
export const TAILOR_LUNCH_SUPPLEMENT_EUR = 35;
/** "Add a 3rd / 4th winery" — Setúbal & Arrábida Wine only. */
export const TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR = 20;

/**
 * "Remove the included lunch" — Setúbal & Arrábida Wine ONLY.
 * A fixed per-person credit. It is NOT a negative "Add lunch" supplement
 * and NOT an itinerary-stop removal: it never counts towards the −15%
 * removal cap, is never scaled by the percentage reduction, is applied
 * after the 70% operational floor, and never unlocks the 4th winery.
 */
export const TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR = 15;

/** Signatures where the canonical product includes lunch and it may be removed. */
export const TAILOR_LUNCH_REMOVAL_ELIGIBLE: ReadonlySet<string> = new Set([
  "arrabida-wine-allinclusive",
]);

/** Flat per-person credit for removing the included lunch (0 when not eligible). */
export function lunchRemovalDiscountEur(tourId: string, lunchRemoved: boolean): number {
  return lunchRemoved === true && TAILOR_LUNCH_REMOVAL_ELIGIBLE.has(tourId)
    ? TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR
    : 0;
}

/**
 * Final Tailor per-pax price: the reduced base, plus flat supplements,
 * minus the flat lunch-removal credit.
 * This is the exact amount shown as "Final price" and charged by Stripe.
 */
export function tailorFinalPerPax(
  directEur: number,
  principalsRemoved: number,
  supplementsEur = 0,
  lunchRemovalEur = 0,
): number {
  const base = tailorAdjustedPerPax(directEur, principalsRemoved);
  const extra = Number.isFinite(supplementsEur) ? Math.max(0, Math.round(supplementsEur)) : 0;
  const credit = Number.isFinite(lunchRemovalEur) ? Math.max(0, Math.round(lunchRemovalEur)) : 0;
  return Math.max(0, base + extra - credit);
}
