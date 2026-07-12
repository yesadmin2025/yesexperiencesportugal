// Universal traveller composition — the ONLY public input the browser sends
// to the server for guest counts. The server resolves each minor age against
// the SELECTED Bókun product's real age categories. Browser never decides
// whether an age is Youth/Child/Infant.

import type { AgeBand, GuestMix } from "./ageBandPricing";
import type { MappedBokunPricingCategory } from "./bokunCategories";

export interface TravellerComposition {
  adults: number;
  /** Ordered ages of each minor traveller (0–17). Length = number of minors. */
  minorAges: number[];
}

export const EMPTY_COMPOSITION: TravellerComposition = { adults: 1, minorAges: [] };

export function totalParticipants(c: TravellerComposition): number {
  return Math.max(0, c.adults) + c.minorAges.length;
}

/** Legacy `guests: N` → `{adults: N, minorAges: []}`. */
export function compositionFromLegacyGuests(guests: number | null | undefined): TravellerComposition {
  const n = typeof guests === "number" && guests > 0 ? Math.round(guests) : 1;
  return { adults: n, minorAges: [] };
}

/** Sanitise/clamp incoming composition (defensive on both client and server). */
export function coerceComposition(input: unknown): TravellerComposition {
  if (!input || typeof input !== "object") return { ...EMPTY_COMPOSITION };
  const r = input as Record<string, unknown>;
  const adults = typeof r.adults === "number" && r.adults >= 0 ? Math.min(20, Math.round(r.adults)) : 1;
  const rawMinors = Array.isArray(r.minorAges) ? r.minorAges : [];
  const minorAges: number[] = [];
  for (const raw of rawMinors) {
    const n = typeof raw === "number" ? Math.round(raw) : Number.NaN;
    if (Number.isFinite(n) && n >= 0 && n <= 17) minorAges.push(n);
    if (minorAges.length >= 20) break;
  }
  return { adults, minorAges };
}

/**
 * Resolve a single minor age against the confirmed Bókun categories for the
 * selected product+option+rate+slot. Returns `null` if no category accepts
 * the age (the server treats that as a fatal `age_unsupported` quote error —
 * per spec §19, we do NOT silently promote to Adult).
 */
export function resolveAgeToBokunCategory(
  age: number,
  categories: MappedBokunPricingCategory[],
): MappedBokunPricingCategory | null {
  const confirmed = categories.filter((c) => c.mappingStatus === "confirmed");
  const pool = confirmed.length ? confirmed : categories.filter((c) => c.mappingStatus === "suggested");
  // Prefer the narrowest matching range so overlapping bands resolve deterministically.
  const matches = pool.filter((c) => {
    const min = typeof c.minAge === "number" ? c.minAge : 0;
    const max = typeof c.maxAge === "number" ? c.maxAge : 999;
    return age >= min && age <= max;
  });
  if (!matches.length) return null;
  matches.sort((a, b) => rangeWidth(a) - rangeWidth(b));
  return matches[0];
}

/** Adult category — used for `adults` count. */
export function resolveAdultCategory(
  categories: MappedBokunPricingCategory[],
): MappedBokunPricingCategory | null {
  const pool = categories.filter((c) => c.mappingStatus !== "unmapped" && c.uiBand === "adult");
  return pool[0] ?? null;
}

function rangeWidth(c: MappedBokunPricingCategory): number {
  const min = typeof c.minAge === "number" ? c.minAge : 0;
  const max = typeof c.maxAge === "number" ? c.maxAge : 100;
  return max - min;
}

export interface ResolvedComposition {
  /** Aggregated counts, one entry per Bókun category actually used. */
  categoryQuantities: Array<{
    category: MappedBokunPricingCategory;
    quantity: number;
    /** Ages contributing to this category (empty for the adult category). */
    ages: number[];
  }>;
  /** Legacy view: adult/youth/child/infant counts derived from category.uiBand. */
  guestMix: GuestMix;
  totalParticipants: number;
  /** Ages the server could not resolve — checkout must block if length > 0. */
  unresolvedAges: number[];
}

export function resolveComposition(
  composition: TravellerComposition,
  categories: MappedBokunPricingCategory[],
): ResolvedComposition {
  const adultCat = resolveAdultCategory(categories);
  const byCatId = new Map<string, { category: MappedBokunPricingCategory; quantity: number; ages: number[] }>();
  const mix: GuestMix = { adults: 0, youths: 0, children: 0, infants: 0 };
  const unresolvedAges: number[] = [];

  if (composition.adults > 0) {
    if (!adultCat) {
      // No adult category means the product isn't bookable at all.
      unresolvedAges.push(-1); // sentinel — signals "no adult category"
    } else {
      byCatId.set(adultCat.bokunCategoryId, { category: adultCat, quantity: composition.adults, ages: [] });
      mix.adults = composition.adults;
    }
  }

  for (const age of composition.minorAges) {
    const cat = resolveAgeToBokunCategory(age, categories);
    if (!cat) { unresolvedAges.push(age); continue; }
    const cur = byCatId.get(cat.bokunCategoryId);
    if (cur) { cur.quantity += 1; cur.ages.push(age); }
    else byCatId.set(cat.bokunCategoryId, { category: cat, quantity: 1, ages: [age] });
    const band: AgeBand | "other" = cat.uiBand;
    if (band === "youth") mix.youths += 1;
    else if (band === "child") mix.children += 1;
    else if (band === "infant") mix.infants += 1;
    else if (band === "adult") mix.adults += 1;
  }

  return {
    categoryQuantities: [...byCatId.values()],
    guestMix: mix,
    totalParticipants: totalParticipants(composition),
    unresolvedAges,
  };
}

// -----------------------------------------------------------------------------
// SLICE B — strict category resolution
// -----------------------------------------------------------------------------
//
// resolveCompositionAgainstCategories() is the ONLY resolver checkout should
// use. Unlike resolveComposition() (kept for legacy adults-only quote paths)
// it enforces the launch contract:
//   • Only `confirmed` categories are considered.
//   • Zero OR multiple matches for a minor age → unsupported_age (no narrowest-
//     range tiebreak, no Adult fallback, no first-category fallback).
//   • Adults resolve against the single confirmed adult category; absence =
//     unsupported.
//   • Infants (age 0) count toward totalParticipants like every other guest.

export interface CategoryBooking {
  bokunCategoryId: string;
  label: string;
  minAge: number | null;
  maxAge: number | null;
  quantity: number;
}

export interface ResolvedCompositionAgainstCategories {
  travellerComposition: TravellerComposition;
  resolvedGuestMix: {
    adults: number;
    youths: number;
    children: number;
    infants: number;
    totalParticipants: number;
  };
  categoryBookings: CategoryBooking[];
  unsupportedAges: number[];
}

function confirmedMatchesForAge(
  age: number,
  categories: MappedBokunPricingCategory[],
): MappedBokunPricingCategory[] {
  return categories.filter((c) => {
    if (c.mappingStatus !== "confirmed") return false;
    const min = typeof c.minAge === "number" ? c.minAge : 0;
    const max = typeof c.maxAge === "number" ? c.maxAge : 17;
    return age >= min && age <= max;
  });
}

export function resolveCompositionAgainstCategories(
  composition: TravellerComposition,
  categories: MappedBokunPricingCategory[],
): ResolvedCompositionAgainstCategories {
  const bookings = new Map<string, CategoryBooking & { uiBand: string }>();
  const mix = { adults: 0, youths: 0, children: 0, infants: 0 };
  const unsupportedAges: number[] = [];

  const bump = (c: MappedBokunPricingCategory, qty: number) => {
    const cur = bookings.get(c.bokunCategoryId);
    if (cur) cur.quantity += qty;
    else bookings.set(c.bokunCategoryId, {
      bokunCategoryId: c.bokunCategoryId,
      label: c.bokunTitle,
      minAge: typeof c.minAge === "number" ? c.minAge : null,
      maxAge: typeof c.maxAge === "number" ? c.maxAge : null,
      quantity: qty,
      uiBand: c.uiBand,
    });
    if (c.uiBand === "adult") mix.adults += qty;
    else if (c.uiBand === "youth") mix.youths += qty;
    else if (c.uiBand === "child") mix.children += qty;
    else if (c.uiBand === "infant") mix.infants += qty;
  };

  if (composition.adults > 0) {
    const adultCats = categories.filter(
      (c) => c.mappingStatus === "confirmed" && c.uiBand === "adult",
    );
    if (adultCats.length !== 1) unsupportedAges.push(-1);
    else bump(adultCats[0], composition.adults);
  }

  for (const age of composition.minorAges) {
    const matches = confirmedMatchesForAge(age, categories);
    if (matches.length !== 1) { unsupportedAges.push(age); continue; }
    bump(matches[0], 1);
  }

  const totalParticipants = composition.adults + composition.minorAges.length;
  return {
    travellerComposition: composition,
    resolvedGuestMix: { ...mix, totalParticipants },
    categoryBookings: [...bookings.values()].map(({ uiBand: _u, ...rest }) => rest),
    unsupportedAges,
  };
}

// -----------------------------------------------------------------------------
// SLICE B — Studio candidate fallback
// -----------------------------------------------------------------------------
//
// Given a set of Studio itinerary candidates (each carrying its own resolved
// Bókun categories for pricing purposes) plus the guest composition, exclude
// candidates that cannot support every selected age and return the survivors
// in original order. The caller (Studio orchestrator) picks the first survivor
// and only returns `unsupported_age` when the survivor list is empty.
//
// Note: Studio's *commercial* identity is separate (studio-v3-private-full-day)
// and is NOT swapped by this filter — this only affects which itinerary
// template feeds the reveal.

export interface StudioCandidate<T = unknown> {
  key: string;
  categories: MappedBokunPricingCategory[];
  payload?: T;
}

export interface StudioCandidateFilterResult<T = unknown> {
  compatible: StudioCandidate<T>[];
  excluded: Array<{ key: string; unsupportedAges: number[] }>;
}

export function filterStudioCandidatesByAges<T>(
  composition: TravellerComposition,
  candidates: StudioCandidate<T>[],
): StudioCandidateFilterResult<T> {
  const compatible: StudioCandidate<T>[] = [];
  const excluded: Array<{ key: string; unsupportedAges: number[] }> = [];
  for (const cand of candidates) {
    const r = resolveCompositionAgainstCategories(composition, cand.categories);
    if (r.unsupportedAges.length === 0) compatible.push(cand);
    else excluded.push({ key: cand.key, unsupportedAges: r.unsupportedAges });
  }
  return { compatible, excluded };
}

export function hasMinors(c: TravellerComposition): boolean {
  return c.minorAges.length > 0;
}
