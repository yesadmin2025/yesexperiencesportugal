/**
 * PASS 5 — Studio strict commercial tier authority.
 *
 * The Stripe edge function prices Studio journeys exclusively from the
 * `tour_price_tiers` runtime rows. Anything the Studio shows must therefore
 * come from that same authority: no `VIATOR_META` static tiers, no
 * `priceFrom` anchor. When the approved runtime row is missing the Studio
 * stays unpriced (curator path) instead of quoting a number Stripe would
 * refuse.
 *
 * Pure module: no React, no network, no side effects.
 */

import type { PriceTiersEUR } from "@/data/signatureToursViator";
import { AGE_BAND_PCT, ageBand, type JourneyPriceLine } from "@/data/signatureTourPricing";

export type StudioTiersMap = Record<string, PriceTiersEUR | undefined> | null | undefined;

/** Public "from"/add-on anchor semantics used by the server: the 8-pax tier. */
export const STUDIO_ADD_ON_ANCHOR_TIER = 8 as const;

function positive(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function tierKeyFor(guests: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null {
  if (!Number.isFinite(guests) || guests < 1) return null;
  const rounded = Math.round(guests);
  const clamped = rounded >= 8 ? 8 : rounded;
  return clamped as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

/**
 * Exact approved adult per-pax EUR for a Studio party, from runtime rows only.
 * Returns null when the row or the exact tier is absent.
 */
export function resolveStudioStrictPerPaxEur(
  tourId: string | null | undefined,
  guests: number | null | undefined,
  tiers: StudioTiersMap,
): number | null {
  if (!tourId || typeof guests !== "number") return null;
  const key = tierKeyFor(guests);
  if (key == null) return null;
  return positive(tiers?.[tourId]?.[key]);
}

/**
 * The server's add-on pricing anchor: the approved runtime tier-8 per-pax EUR.
 * Never `priceFrom`, never a USD conversion.
 */
export function resolveStudioAddOnAnchorEur(
  tourId: string | null | undefined,
  tiers: StudioTiersMap,
): number | null {
  if (!tourId) return null;
  return positive(tiers?.[tourId]?.[STUDIO_ADD_ON_ANCHOR_TIER]);
}

export interface StudioPartyCandidate {
  readonly adults?: number | null;
  readonly minorAges?: readonly number[] | null;
  readonly guests?: number | null;
  readonly guestsInferred?: boolean;
}

export interface ConfirmedStudioParty {
  readonly adults: number;
  readonly minorAges: readonly number[];
  readonly guests: number;
}

/**
 * A Studio party is commercially confirmed only when the traveller has
 * explicitly stated it AND the composition is internally coherent.
 * Inferred guest counts never authorise an exact price.
 */
export function resolveConfirmedStudioParty(
  candidate: StudioPartyCandidate | null | undefined,
): ConfirmedStudioParty | null {
  if (!candidate) return null;
  if (candidate.guestsInferred === true) return null;
  const adults = candidate.adults;
  if (typeof adults !== "number" || !Number.isInteger(adults) || adults < 1) return null;
  const minorAges = candidate.minorAges ?? [];
  for (const age of minorAges) {
    if (ageBand(age) == null) return null;
  }
  const guests = candidate.guests;
  if (typeof guests !== "number" || guests !== adults + minorAges.length) return null;
  return { adults, minorAges, guests };
}

export function isStudioPartyConfirmed(candidate: StudioPartyCandidate | null | undefined): boolean {
  return resolveConfirmedStudioParty(candidate) != null;
}

export interface StudioStrictJourneyPricing {
  readonly perPaxAdultEur: number;
  readonly lines: readonly JourneyPriceLine[];
  readonly totalEur: number;
  readonly headcount: number;
}

/**
 * Age-banded journey pricing for a CONFIRMED party, anchored on the exact
 * approved runtime tier. Age bands and percentages are unchanged.
 */
export function resolveStudioStrictJourneyPricing(
  tourId: string | null | undefined,
  party: ConfirmedStudioParty | null,
  tiers: StudioTiersMap,
  /**
   * Authorized composed-day supplement in EUR per person (currently the
   * extra-winery action). Mirrors the server's `tailorFinalPerPax`: it is
   * added to the ADULT per-pax before age bands are applied, so the client
   * total and the Stripe total are derived by the same arithmetic. The value
   * itself always comes from the shared approved constant — never invented,
   * never taken from a payload.
   */
  supplementPerPaxEur = 0,
): StudioStrictJourneyPricing | null {
  if (!party) return null;
  const base = resolveStudioStrictPerPaxEur(tourId, party.guests, tiers);
  if (base == null) return null;
  const supplement =
    Number.isFinite(supplementPerPaxEur) && supplementPerPaxEur > 0
      ? Math.round(supplementPerPaxEur)
      : 0;
  const adultEur = base + supplement;

  const lines: JourneyPriceLine[] = [];
  for (let i = 0; i < party.adults; i += 1) {
    lines.push({ kind: "adult", band: "adult", age: null, unitEur: adultEur, qty: 1 });
  }
  for (const age of party.minorAges) {
    const band = ageBand(age);
    if (!band) return null;
    lines.push({
      kind: "minor",
      band,
      age: Math.floor(age),
      unitEur: Math.round(adultEur * AGE_BAND_PCT[band]),
      qty: 1,
    });
  }
  return {
    perPaxAdultEur: adultEur,
    lines,
    totalEur: lines.reduce((sum, l) => sum + l.unitEur, 0),
    headcount: party.guests,
  };
}
