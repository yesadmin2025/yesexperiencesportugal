// Slice B — safety guard helper.
//
// A tour is "category-aware checkout ready" only when its stored Bókun
// readiness row has at least one CONFIRMED category (adult, at minimum).
// Any mixed-family (adults + minors) booking MUST be gated on this — the
// legacy per-pax path has no category to resolve minor ages against and
// would silently over-charge / mis-book.

import { useTourBokunReadinessFor } from "./use-tour-bokun-readiness";

export function useCategoryAwareCheckoutReadyFor(tourId: string): {
  ready: boolean;
  loading: boolean;
  reason: "not-ready" | "no-confirmed-categories" | null;
} {
  const { readiness, isLoading } = useTourBokunReadinessFor(tourId);
  if (isLoading) return { ready: false, loading: true, reason: null };
  if (!readiness) return { ready: false, loading: false, reason: "not-ready" };
  const hasConfirmed = readiness.bokunCategories.some(
    (c) => c.mappingStatus === "confirmed",
  );
  if (!hasConfirmed) return { ready: false, loading: false, reason: "no-confirmed-categories" };
  return { ready: true, loading: false, reason: null };
}
