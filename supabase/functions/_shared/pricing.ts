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

export function tailorAdjustedPerPax(directEur: number, principalsRemoved: number): number {
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
  const lunch = lunchAdded && TAILOR_LUNCH_ELIGIBLE.has(tourId) ? TAILOR_LUNCH_SUPPLEMENT_EUR : 0;
  const maxExtra = TAILOR_MAX_EXTRA_WINERIES[tourId] ?? 0;
  const extra = Math.min(maxExtra, Math.max(0, Number(extraWineries) | 0));
  return lunch + extra * TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR;
}

/* ---------------------------------------------------------------- *
 * Reveal add-ons — server mirror of `src/data/signatureAddOns.ts`. *
 * The server NEVER trusts a client-supplied add-on euro amount: it *
 * re-derives it from the catalog percentage and the tour's own     *
 * approved 8-pax anchor. Ids absent from this table are rejected.  *
 * Parity with the client catalog is enforced by a unit test.       *
 * ---------------------------------------------------------------- */

export type AddOnPricingUnit = "per_person" | "per_group" | "per_vehicle" | "fixed";

export const SIGNATURE_ADD_ON_CATALOG: Record<
  string,
  { pricePctOfBase: number; pricingUnit: AddOnPricingUnit }
> = {
  "hidden-cove-picnic": { pricePctOfBase: 0.18, pricingUnit: "per_person" },
  "coastal-boat-ride": { pricePctOfBase: 0.22, pricingUnit: "per_person" },
  "azulejo-workshop": { pricePctOfBase: 0.16, pricingUnit: "per_person" },
  "azeitao-cheese": { pricePctOfBase: 0.14, pricingUnit: "per_person" },
  "sintra-detour": { pricePctOfBase: 0.2, pricingUnit: "per_person" },
  "chapel-of-bones": { pricePctOfBase: 0.16, pricingUnit: "per_person" },
  "talha-amphora": { pricePctOfBase: 0.18, pricingUnit: "per_person" },
  "roman-ruins-trail": { pricePctOfBase: 0.12, pricingUnit: "per_person" },
  "roman-troia": { pricePctOfBase: 0.14, pricingUnit: "per_person" },
  "herdade-tasting": { pricePctOfBase: 0.2, pricingUnit: "per_person" },
  "templar-tomar": { pricePctOfBase: 0.18, pricingUnit: "per_person" },
  "obidos-walls": { pricePctOfBase: 0.14, pricingUnit: "per_person" },
  "nazare-cliffs": { pricePctOfBase: 0.16, pricingUnit: "per_person" },
};

/** Round to nearest €5, floor €5 — mirrors `roundEur5` in the client catalog. */
export function serverRoundEur5(eur: number): number {
  return Math.max(5, Math.round(eur / 5) * 5);
}

/**
 * Server-authoritative add-on line. `baseEur` MUST be the tour's approved
 * 8-pax anchor from `tour_price_tiers` — never a client-supplied number.
 * Returns null when the add-on id is not in the approved catalog.
 */
export function serverAddOnLine(
  id: string,
  baseEur: number,
  guests: number,
  vehicleCapacity = 4,
): { perUnitEur: number; quantity: number; unit: AddOnPricingUnit } | null {
  const entry = SIGNATURE_ADD_ON_CATALOG[id];
  if (!entry || !Number.isFinite(baseEur) || baseEur <= 0) return null;
  const perUnitEur = serverRoundEur5(baseEur * entry.pricePctOfBase);
  const guestsSafe = Math.max(1, Math.floor(guests));
  const cap = Math.max(1, Math.floor(vehicleCapacity));
  const quantity =
    entry.pricingUnit === "per_person"
      ? guestsSafe
      : entry.pricingUnit === "per_vehicle"
        ? Math.ceil(guestsSafe / cap)
        : 1;
  return { perUnitEur, quantity, unit: entry.pricingUnit };
}
