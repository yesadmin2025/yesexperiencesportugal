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
