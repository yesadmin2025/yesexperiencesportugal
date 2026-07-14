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

export type BlockingReason = SuitabilityReason | "category_unresolved";

export interface SuitabilityFilterResult {
  compatible: SignatureTour[];
  excluded: Array<{
    tourId: string;
    unsupportedAges: number[];
    reasons: BlockingReason[];
  }>;
  hasCompatible: boolean;
  /** Priority: unsupported_age > suitability_not_ready > category_unresolved > other > null. */
  firstBlockingReason: BlockingReason | null;
}

function pickFirstBlockingReason(
  excluded: SuitabilityFilterResult["excluded"],
): BlockingReason | null {
  const priority: BlockingReason[] = [
    "unsupported_age",
    "infant_not_allowed",
    "suitability_not_ready",
    "capacity_exceeded",
    "child_seat_missing",
    "stroller_unsupported",
    "category_unresolved",
  ];
  for (const p of priority) {
    if (excluded.some((e) => e.reasons.includes(p))) return p;
  }
  return null;
}

export function filterStudioCandidatesBySuitability(
  composition: TravellerComposition,
  tours: SignatureTour[],
  readinessMap: Record<string, TourBokunReadiness> | undefined,
  requirements: SuitabilityRequirements,
  options: { requireCategoryReadiness?: boolean } = {},
): SuitabilityFilterResult {
  // Studio's commercial product currently uses the manual Viator age-band
  // quote, not per-Signature Bókun categories. In that mode an empty Bókun
  // mirror must not erase every family-compatible itinerary candidate.
  const ageResult = options.requireCategoryReadiness === false
    ? { compatible: tours, excluded: [], hasCompatible: tours.length > 0 }
    : filterSignatureCandidatesForAges(composition, tours, readinessMap);
  const ageCompatibleIds = new Set(ageResult.compatible.map((t) => t.id));
  const excluded: SuitabilityFilterResult["excluded"] = [];

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

  const hasCompatible = compatible.length > 0;
  return {
    compatible,
    excluded,
    hasCompatible,
    firstBlockingReason: hasCompatible ? null : pickFirstBlockingReason(excluded),
  };
}
