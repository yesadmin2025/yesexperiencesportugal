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
