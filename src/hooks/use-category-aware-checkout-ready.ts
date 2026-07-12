// Slice B closure — composition-aware readiness guard.
//
// A tour is "category-aware checkout ready" for THIS composition only when
// every selected traveller (adults + each minor age) resolves to exactly one
// confirmed Bókun category. Any unsupported age, missing/duplicate category,
// under- or over-count, or non-confirmed mapping blocks payment.
//
// Callers MUST invoke this hook unconditionally (react rules of hooks).
// For legacy adults-only paths that have no minor UI, the returned `ready`
// is either true (adult category confirmed) or false with a benign reason;
// the caller may keep its legacy behaviour when `composition.minorAges` is
// empty and the readiness row is still absent.

import { useMemo } from "react";
import { useTourBokunReadinessFor } from "./use-tour-bokun-readiness";
import {
  resolveCompositionAgainstCategories,
  totalParticipants,
  type TravellerComposition,
} from "@/lib/pricing/travellerComposition";

export type CategoryReadinessReason =
  | null
  | "loading"
  | "category-not-ready"
  | "no-confirmed-categories"
  | "unsupported-age"
  | "adult-category-missing";

export interface CategoryReadinessResult {
  ready: boolean;
  loading: boolean;
  reason: CategoryReadinessReason;
  unsupportedAges: number[];
  categoryBookings: ReturnType<typeof resolveCompositionAgainstCategories>["categoryBookings"];
}

const EMPTY_ADULT_ONLY: TravellerComposition = { adults: 1, minorAges: [] };

export function useCategoryAwareCheckoutReadyFor(
  tourId: string,
  composition: TravellerComposition = EMPTY_ADULT_ONLY,
): CategoryReadinessResult {
  const { readiness, isLoading } = useTourBokunReadinessFor(tourId);

  return useMemo<CategoryReadinessResult>(() => {
    if (isLoading) {
      return { ready: false, loading: true, reason: "loading", unsupportedAges: [], categoryBookings: [] };
    }
    if (!readiness) {
      return { ready: false, loading: false, reason: "category-not-ready", unsupportedAges: [], categoryBookings: [] };
    }
    const hasAnyConfirmed = readiness.bokunCategories.some((c) => c.mappingStatus === "confirmed");
    if (!hasAnyConfirmed) {
      return { ready: false, loading: false, reason: "no-confirmed-categories", unsupportedAges: [], categoryBookings: [] };
    }

    const result = resolveCompositionAgainstCategories(composition, readiness.bokunCategories);

    // -1 is the resolver's sentinel for "no confirmed adult category".
    if (result.unsupportedAges.includes(-1)) {
      return {
        ready: false,
        loading: false,
        reason: "adult-category-missing",
        unsupportedAges: result.unsupportedAges.filter((a) => a >= 0),
        categoryBookings: result.categoryBookings,
      };
    }
    if (result.unsupportedAges.length > 0) {
      return {
        ready: false,
        loading: false,
        reason: "unsupported-age",
        unsupportedAges: result.unsupportedAges,
        categoryBookings: result.categoryBookings,
      };
    }

    const total = totalParticipants(composition);
    const resolvedQuantity = result.categoryBookings.reduce((s, l) => s + l.quantity, 0);
    const adultQuantity = result.categoryBookings
      .filter((l) => l.uiBand === "adult")
      .reduce((s, l) => s + l.quantity, 0);
    const allConfirmed = result.categoryBookings.every((l) => l.mappingStatus === "confirmed");

    const ready =
      resolvedQuantity === total &&
      adultQuantity === composition.adults &&
      allConfirmed &&
      result.categoryBookings.length > 0;

    return {
      ready,
      loading: false,
      reason: ready ? null : "category-not-ready",
      unsupportedAges: [],
      categoryBookings: result.categoryBookings,
    };
  }, [isLoading, readiness, composition]);
}
