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

/* ---------------------------------------------------------------- *
 * Authorized Tailor supplements (Canonical Signature Bible v1.1).  *
 * Mirrors `src/config/pricing.ts`. Edit both in the same commit.   *
 * Flat per-person amounts — never scaled by the % reduction.       *
 * ---------------------------------------------------------------- */

export const TAILOR_LUNCH_SUPPLEMENT_EUR = 35;
export const TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR = 20;

/**
 * "Remove the included lunch" — Setúbal & Arrábida Wine ONLY.
 * Fixed per-person credit. Not a negative supplement, not a stop removal:
 * excluded from the −15% cap, the % reduction and the 70% floor.
 */
export const TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR = 15;

export const TAILOR_LUNCH_REMOVAL_ELIGIBLE: ReadonlySet<string> = new Set([
  "arrabida-wine-allinclusive",
]);

/** Server-derived lunch-removal credit. Never trusts a client euro amount. */
export function serverLunchRemovalEur(tourId: string, lunchRemoved: boolean): number {
  return lunchRemoved === true && TAILOR_LUNCH_REMOVAL_ELIGIBLE.has(tourId)
    ? TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR
    : 0;
}

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

/**
 * Per-Signature Tailor entitlements — server mirror of `src/data/tailorRules.ts`.
 * The server never trusts a client-supplied euro amount: it re-derives the
 * supplement from booleans/counts using these tables.
 */
export const TAILOR_LUNCH_ELIGIBLE: ReadonlySet<string> = new Set([
  "troia-comporta",
  "southwest-vicentine-coast",
  "arrabida-boat",
  "sintra-cascais",
  "azeitao-cheese",
  "tomar-coimbra",
  "evora-alentejo",
  "fatima-nazare-obidos",
  "tiles-workshop",
]);

/** Extra wineries beyond the included baseline, per Signature. */
export const TAILOR_MAX_EXTRA_WINERIES: Record<string, number> = {
  "arrabida-wine-allinclusive": 2, // 2 included, up to 4
};

export function serverTailorSupplementsEur(
  tourId: string,
  lunchAdded: boolean,
  extraWineries: number,
): number {
  const lunch =
    lunchAdded && TAILOR_LUNCH_ELIGIBLE.has(tourId) ? TAILOR_LUNCH_SUPPLEMENT_EUR : 0;
  const maxExtra = TAILOR_MAX_EXTRA_WINERIES[tourId] ?? 0;
  const extra = Math.min(maxExtra, Math.max(0, Number(extraWineries) | 0));
  return lunch + extra * TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR;
}
