/**
 * Age-band pricing — single server-side source of truth.
 *
 * Mirrors `AGE_BAND_PCT` / `ageBand()` in `src/data/signatureTourPricing.ts`.
 * Deno edge functions can't import from `src/`, so this file is the
 * canonical copy for every Supabase function that prices minors.
 * If you change these percentages, change the frontend copy in the
 * same commit.
 */

export type AgeBand = "adult" | "youth" | "child" | "infant";

export const AGE_BAND_PCT: Record<AgeBand, number> = {
  adult: 1.0,
  youth: 0.75,
  child: 0.5,
  infant: 0,
};

export function ageBand(age: number): AgeBand | null {
  if (!Number.isFinite(age) || age < 0 || age > 17 || !Number.isInteger(age)) return null;
  if (age >= 11) return "youth";
  if (age >= 3) return "child";
  return "infant";
}

/* ---------------------------------------------------------------- *
 * Direct-booking discount + Tailor reduction policy (server copy). *
 * Mirrors `src/config/pricing.ts`. Edit both in the same commit.   *
 * ---------------------------------------------------------------- */

export const DIRECT_DISCOUNT_PCT = 0.15;
export const MIN_OPERATIONAL_PCT = 0.7;
export const TAILOR_PRINCIPAL_STEP_PCT = 0.05;
export const MAX_TAILOR_REDUCTION_PCT = 0.15;

export function directFromPlatform(platformEur: number): number {
  if (!Number.isFinite(platformEur) || platformEur <= 0) return 0;
  return Math.round(platformEur * (1 - DIRECT_DISCOUNT_PCT));
}

export function operationalFloor(directEur: number): number {
  if (!Number.isFinite(directEur) || directEur <= 0) return 0;
  return Math.round(directEur * MIN_OPERATIONAL_PCT);
}

export function tailorAdjustedPerPax(
  directEur: number,
  principalsRemoved: number,
): number {
  if (!Number.isFinite(directEur) || directEur <= 0) return 0;
  const raw = Math.max(0, principalsRemoved) * TAILOR_PRINCIPAL_STEP_PCT;
  const reductionPct = Math.min(raw, MAX_TAILOR_REDUCTION_PCT);
  const proposed = Math.round(directEur * (1 - reductionPct));
  return Math.max(proposed, operationalFloor(directEur));
}
