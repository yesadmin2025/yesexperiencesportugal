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

import { VIATOR_META, type PriceTiersEUR } from "./signatureToursViator";
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
 *
 * TRUTH RULE (owner-approved): a price is only shown for an EXACT approved
 * party-size tier.
 *  - `guests` null/undefined → generic pre-composition "from" anchor
 *    (real=false). This is the only legitimate use of `priceFrom`.
 *  - `guests` >= 8 → clamps to tier 8, which IS the approved anchor tier.
 *  - `guests` 1..7 with an approved tier → that exact tier (real=true).
 *  - `guests` 1..7 WITHOUT an approved tier → **null** (unavailable).
 *    We never fabricate a tier, never reuse a neighbouring tier and never
 *    fall back to the 8-pax anchor: that would show a solo traveller the
 *    group rate and fail later at checkout (the server already returns
 *    409 `owner_data_missing` for the same case).
 */
export function resolvePerPaxEur(
  tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined,
  guests: number | null | undefined,
  /**
   * Optional runtime overrides keyed by tour id. When present, these take
   * precedence over the code-defined VIATOR_META tiers. Sourced from the
   * `tour_price_tiers` table via the admin editor.
   */
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

  const exactGuests = knownGuestCount(guests);
  // Exact party size known but no approved tier for it → unavailable.
  if (exactGuests != null && exactGuests < 8 && real == null) return null;

  const eurPerPax = real ?? anchor;
  const partyGuests = exactGuests ?? 1;
  return {
    eurPerPax,
    real: real != null,
    tier,
    partyTotalEur: eurPerPax * partyGuests,
  };
}

/** The exact party size, or null when the caller has not composed one yet. */
function knownGuestCount(guests: number | null | undefined): number | null {
  if (typeof guests !== "number" || !Number.isFinite(guests) || guests < 1) return null;
  return Math.round(guests);
}

/**
 * True when an EXACT approved tier exists for this party size — i.e. the
 * traveller can be shown a real total and allowed into checkout.
 * `guests` null/undefined counts as available (generic "from" anchor).
 */
export function hasApprovedTier(
  tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined,
  guests: number | null | undefined,
  overrides?: Record<string, PriceTiersEUR | undefined> | null,
): boolean {
  return resolvePerPaxEur(tour, guests, overrides) != null;
}


function clampTier(guests: number | null | undefined): number {
  if (typeof guests !== "number" || !Number.isFinite(guests) || guests < 1) return 8;
  if (guests >= 8) return 8;
  return Math.round(guests);
}

/* ---------------------------------------------------------------- *
 * Age-band pricing (owner-approved, uniform across all Signatures) *
 * ---------------------------------------------------------------- *
 *
 * Decision recorded 2026-07-14 by owner:
 *   - Adult (18+)         → 100% of resolved per-pax tier
 *   - Youth (11–17)       →  75%
 *   - Child (3–10)        →  50%
 *   - Infant (0–2)        →   0% (free)
 *   - Tier lookup uses TOTAL headcount (adults + all minors, incl. infants)
 *   - No adults-only tours today (composition step blocks nothing)
 *
 * There is NO fallback that silently prices a minor as an adult. When
 * an age falls outside the four bands the resolver returns null for
 * that line and the server checkout must reject the request.
 */

export type AgeBand = "adult" | "youth" | "child" | "infant";

export const AGE_BAND_PCT: Record<AgeBand, number> = {
  adult: 1.0,
  youth: 0.75,
  child: 0.5,
  infant: 0,
};

/** Return the age band an integer age belongs to, or null if out of range. */
export function ageBand(age: number): AgeBand | null {
  if (!Number.isFinite(age) || age < 0 || age > 120) return null;
  const a = Math.floor(age);
  if (a >= 18) return "adult";
  if (a >= 11) return "youth";
  if (a >= 3) return "child";
  if (a >= 0) return "infant";
  return null;
}

export interface JourneyPriceLine {
  readonly kind: "adult" | "minor";
  readonly band: AgeBand;
  readonly age: number | null; // null for adults (no age captured)
  readonly unitEur: number; // per-person EUR after band %
  readonly qty: 1;
}

export interface JourneyPricing {
  readonly perPaxAdultEur: number; // resolved from tier
  readonly tier: number; // tier used (1..8)
  readonly real: boolean; // true when tier came from real data
  readonly lines: readonly JourneyPriceLine[];
  readonly totalEur: number; // sum of every line
  readonly headcount: number; // adults + minorAges.length
}

/**
 * Resolve full itemised pricing for a Signature tour with mixed traveller
 * ages. Returns null if:
 *   - the tour has no anchor price, OR
 *   - any minor age is not a valid band (server MUST reject checkout).
 *
 * `minorAges` is a list of integer ages (0..17) for every non-adult on
 * the booking. The caller is responsible for validating counts (>=1 adult).
 */
export function resolveJourneyPricing(
  tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined,
  adults: number,
  minorAges: readonly number[],
  overrides?: Record<string, PriceTiersEUR | undefined> | null,
): JourneyPricing | null {
  if (!tour) return null;
  if (!Number.isInteger(adults) || adults < 1) return null;
  const headcount = adults + minorAges.length;

  const per = resolvePerPaxEur(tour, headcount, overrides);
  if (!per) return null;
  const adultEur = per.eurPerPax;

  const lines: JourneyPriceLine[] = [];
  for (let i = 0; i < adults; i++) {
    lines.push({ kind: "adult", band: "adult", age: null, unitEur: adultEur, qty: 1 });
  }
  for (const age of minorAges) {
    const band = ageBand(age);
    if (!band) return null; // caller must reject
    const unitEur = Math.round(adultEur * AGE_BAND_PCT[band]);
    lines.push({ kind: "minor", band, age: Math.floor(age), unitEur, qty: 1 });
  }
  const totalEur = lines.reduce((s, l) => s + l.unitEur, 0);
  return {
    perPaxAdultEur: adultEur,
    tier: per.tier,
    real: per.real,
    lines,
    totalEur,
    headcount,
  };
}
