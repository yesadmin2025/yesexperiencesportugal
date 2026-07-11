// canonicalRouteStops — the SINGLE source of confirmed stops used by the
// signed Studio V3 quote snapshot, checkout summary, Stripe metadata, and
// every visible itinerary panel from the Final Signature phase onward.
//
// Rules (Pass 1B §1b + §4):
//   - Derived from resolveStudioV3Route(latestState).routePoints, honoring
//     any editedRoutePoints override (reorder, remove, swap the guest made
//     during Refine).
//   - NEVER derived from `tour.stops`. `tour.stops` is the static Signature
//     catalogue, not what the guest actually refined.
//   - Alternative-winery suggestions, removed stops, stale initial-proposal
//     stops, and unvalidated physical add-ons are excluded (they never
//     appear in editedRoutePoints unless the guest explicitly promoted
//     them via Refine).
//
// The id is a deterministic slug of the label; the server accepts any id as
// long as label is provided (see quoteSnapshotSchema.ts). Slug ids give us
// stable identity across refresh and cross-surface convergence tests.

import { resolveStudioV3Route } from "@/components/studio-v3/curation";
import type { StudioV3State } from "@/components/studio-v3/types";

export interface CanonicalConfirmedStop {
  id: string;
  label: string;
}

export function slugifyStopLabel(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "stop";
}

/**
 * Canonical confirmed stops for the day the guest actually refined.
 * Bounded to the first 4 points so the signed snapshot mirrors the
 * numbered itinerary shown in the final presentation.
 */
export function canonicalConfirmedStops(
  state: Pick<
    StudioV3State,
    | "feeling"
    | "companions"
    | "rhythm"
    | "interests"
    | "pickup"
    | "occasion"
    | "considerations"
    | "investment"
    | "destinationIntent"
    | "dateExact"
    | "editedRoutePoints"
  >,
): CanonicalConfirmedStop[] {
  const resolved = resolveStudioV3Route({
    feeling: state.feeling,
    companions: state.companions,
    rhythm: state.rhythm,
    interests: state.interests,
    pickup: state.pickup,
    occasion: state.occasion,
    considerations: state.considerations,
    investment: state.investment,
    destinationIntent: state.destinationIntent,
    dateExact: state.dateExact,
  });

  const baseStops = resolved.routePoints.map((p) => ({ label: p.label }));
  const refined = state.editedRoutePoints ?? baseStops;

  return refined.slice(0, 4).map((s) => ({
    id: slugifyStopLabel(s.label),
    label: s.label,
  }));
}
