// Slice B — Studio candidate fallback wrapper.
//
// Wraps the pure resolver `filterStudioCandidatesByAges` so the Studio
// orchestrator can hand it a list of `SignatureTour` objects + the current
// Bókun readiness map (from useTourBokunReadiness) and receive back the
// subset of tours whose confirmed Bókun categories can resolve every age
// in the current composition. Excluded tours are reported for debug/tests.
//
// The Studio commercial identity (studio-v3-private-full-day) is NOT changed
// by this filter — only the itinerary template that feeds the reveal.

import type { SignatureTour } from "@/data/signatureTours";
import type { TourBokunReadiness } from "@/hooks/use-tour-bokun-readiness";
import {
  filterStudioCandidatesByAges,
  type TravellerComposition,
} from "@/lib/pricing/travellerComposition";

export interface FilterCandidatesResult {
  compatible: SignatureTour[];
  excluded: Array<{ tourId: string; unsupportedAges: number[] }>;
  /** True when at least one candidate could support every selected age. */
  hasCompatible: boolean;
}

export function filterSignatureCandidatesForAges(
  composition: TravellerComposition,
  tours: SignatureTour[],
  readinessMap: Record<string, TourBokunReadiness> | undefined,
): FilterCandidatesResult {
  const candidates = tours.map((t) => ({
    key: t.id,
    categories: readinessMap?.[t.id]?.bokunCategories ?? [],
    payload: t,
  }));
  const { compatible, excluded } = filterStudioCandidatesByAges(composition, candidates);
  return {
    compatible: compatible.map((c) => c.payload!),
    excluded: excluded.map((e) => ({ tourId: e.key, unsupportedAges: e.unsupportedAges })),
    hasCompatible: compatible.length > 0,
  };
}

// -----------------------------------------------------------------------------
// SLICE C — traveller-suitability wrapper (superset of Slice B age filter).
// -----------------------------------------------------------------------------
//
// Runs the confirmed-category age filter AND the per-tour suitability check
// (min/max age, infants allowed, child seat, stroller, capacity) BEFORE any
// ranking or itinerary generation. A candidate must pass BOTH checks to be
// compatible. Studio commercial identity is never changed by this filter.

import {
  checkTravellerSuitability,
  type SuitabilityReason,
  type SuitabilityRequirements,
} from "@/lib/pricing/travellerSuitability";
import { getTourSuitability, getTourCapacity } from "@/data/studioTourSuitability";

export interface SuitabilityFilterResult {
  compatible: SignatureTour[];
  excluded: Array<{
    tourId: string;
    unsupportedAges: number[];
    reasons: Array<SuitabilityReason | "category_unresolved">;
  }>;
  hasCompatible: boolean;
}

export function filterStudioCandidatesBySuitability(
  composition: TravellerComposition,
  tours: SignatureTour[],
  readinessMap: Record<string, TourBokunReadiness> | undefined,
  requirements: SuitabilityRequirements,
): SuitabilityFilterResult {
  const ageResult = filterSignatureCandidatesForAges(composition, tours, readinessMap);
  const ageCompatibleIds = new Set(ageResult.compatible.map((t) => t.id));
  const excluded: SuitabilityFilterResult["excluded"] = [];

  // Carry Slice B exclusions forward (with a distinct reason).
  for (const e of ageResult.excluded) {
    excluded.push({
      tourId: e.tourId,
      unsupportedAges: e.unsupportedAges,
      reasons: ["category_unresolved"],
    });
  }

  const compatible: SignatureTour[] = [];
  for (const tour of tours) {
    if (!ageCompatibleIds.has(tour.id)) continue;
    const check = checkTravellerSuitability(
      getTourSuitability(tour.id),
      requirements,
      getTourCapacity(tour.id),
    );
    if (check.ok) {
      compatible.push(tour);
    } else {
      excluded.push({
        tourId: tour.id,
        unsupportedAges: check.unsupportedAges,
        reasons: check.reasons,
      });
    }
  }

  return { compatible, excluded, hasCompatible: compatible.length > 0 };
}
