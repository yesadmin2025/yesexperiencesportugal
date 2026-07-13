// Slice C — Per-tour traveller suitability registry.
//
// Additive, keyed by SignatureTour.id. Empty by default — populating this
// map is a downstream content task. Suitability is derived from real
// operational facts (supplier constraints, vehicle capacity, terrain), never
// inferred from marketing copy.

import type { TravellerSuitability } from "@/lib/pricing/travellerSuitability";

export const STUDIO_TOUR_SUITABILITY: Readonly<Record<string, TravellerSuitability>> = Object.freeze({});

/** Optional per-tour capacity override; missing = no capacity check. */
export const STUDIO_TOUR_CAPACITY: Readonly<Record<string, number>> = Object.freeze({});

export function getTourSuitability(tourId: string | null | undefined): TravellerSuitability | undefined {
  if (!tourId) return undefined;
  return STUDIO_TOUR_SUITABILITY[tourId];
}

export function getTourCapacity(tourId: string | null | undefined): number | undefined {
  if (!tourId) return undefined;
  return STUDIO_TOUR_CAPACITY[tourId];
}
