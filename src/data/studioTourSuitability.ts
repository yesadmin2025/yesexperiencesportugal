// Slice C (closure) — Per-tour traveller suitability registry.
//
// Every reachable Signature tour (Studio candidate pool) MUST appear here
// with an explicit `status`. Missing entries are treated as `unknown` at
// runtime and blocked for minor-carrying groups.
//
// Facts are operational (vehicle capacity, boat access, cave descent). Never
// inferred from marketing copy. The Mercedes V-class fleet used for private
// full-day tours seats 7 passengers.

import type { SuitabilityRecord } from "@/lib/pricing/travellerSuitability";

const V_CLASS_CAPACITY = 7;

/**
 * SuitabilityRecord map keyed by SignatureTour.id.
 * status="explicitly-unrestricted" = no operational restriction on any axis.
 * status="confirmed" = at least one attested restriction listed.
 */
export const STUDIO_TOUR_SUITABILITY: Readonly<Record<string, SuitabilityRecord>> =
  Object.freeze({
    // Boat outing — infants not carried on the RIB; strollers can't board.
    "arrabida-boat": {
      status: "confirmed",
      minimumAge: 4,
      infantsAllowed: false,
      strollerSuitable: false,
    },
    // Winery all-inclusive: kids may accompany the cellar visit (tastings are
    // supplier-gated at the venue); winery floors are not stroller-friendly.
    "arrabida-wine-allinclusive": {
      status: "confirmed",
      infantsAllowed: true,
      strollerSuitable: false,
    },

    // Private full-day vehicle experiences visiting towns / viewpoints /
    // workshops / beaches — no operational safety restriction beyond the
    // vehicle capacity already gated by Bókun categories.
    "wild-beaches-picnic": { status: "explicitly-unrestricted" },
    "tiles-workshop": { status: "explicitly-unrestricted" },
    "azeitao-cheese": { status: "explicitly-unrestricted" },
    "sintra-cascais": { status: "explicitly-unrestricted" },
    "troia-comporta": { status: "explicitly-unrestricted" },
    "evora-alentejo": { status: "explicitly-unrestricted" },
    "tomar-coimbra": { status: "explicitly-unrestricted" },
    "fatima-nazare-obidos": { status: "explicitly-unrestricted" },
    "roman-heritage-alentejo": { status: "explicitly-unrestricted" },
    "southwest-vicentine-coast": { status: "explicitly-unrestricted" },
  });

/** Known vehicle capacity per tour. Missing = no capacity check. */
export const STUDIO_TOUR_CAPACITY: Readonly<Record<string, number>> = Object.freeze({
  "arrabida-wine-allinclusive": V_CLASS_CAPACITY,
  "wild-beaches-picnic": V_CLASS_CAPACITY,
  "tiles-workshop": V_CLASS_CAPACITY,
  "azeitao-cheese": V_CLASS_CAPACITY,
  "sintra-cascais": V_CLASS_CAPACITY,
  "troia-comporta": V_CLASS_CAPACITY,
  "evora-alentejo": V_CLASS_CAPACITY,
  "tomar-coimbra": V_CLASS_CAPACITY,
  "fatima-nazare-obidos": V_CLASS_CAPACITY,
  "roman-heritage-alentejo": V_CLASS_CAPACITY,
  "southwest-vicentine-coast": V_CLASS_CAPACITY,
  // arrabida-boat capacity gated by the RIB supplier — omitted intentionally.
});

export function getTourSuitability(tourId: string | null | undefined): SuitabilityRecord | undefined {
  if (!tourId) return undefined;
  return STUDIO_TOUR_SUITABILITY[tourId];
}

export function getTourCapacity(tourId: string | null | undefined): number | undefined {
  if (!tourId) return undefined;
  return STUDIO_TOUR_CAPACITY[tourId];
}
