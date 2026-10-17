import { findTour } from "@/data/signatureTours";
import { isStopClosedOn } from "@/data/stopOperational";
import { judgeFinalDayTime } from "@/lib/studio-v3/finalTimeGate";
import { certifyFrozenDayFromPickup, frozenDayAllowsCheckout } from "@/lib/studio-v3/pickupDoorToDoor";
import { rebuildLiveCommercialAuthority } from "@/lib/studio-v3/liveCommercialAuthority";
import { pickupOriginCoord, resolveStudioV3Route } from "./curation";
import { isProvablyUntouchedCanonicalAnchor, resolveAuthoritativeRouteStops, studioRouteShapingInput } from "./studioRouteAuthority";
import type { StudioV3State } from "./types";

/** Admission uses the actual composer and the unchanged payment authorities. */
export function admitBookableStudioRoutes(state: StudioV3State, candidateIds: readonly string[]): string[] {
  if (!state.dateExact || !state.pickup) return [];
  return candidateIds.filter((id) => {
    const tour = findTour(id);
    if (!tour || tour.stops.some((stop) => isStopClosedOn(stop.label, state.dateExact))) return false;
    const resolved = resolveStudioV3Route({
      ...studioRouteShapingInput(state),
      eligibleTourIds: [id],
      preferTourId: id,
    });
    if (resolved.skeletonTourKey !== id) return false;
    const points = resolveAuthoritativeRouteStops({ resolved, catalogStops: tour.stops, anchorTourId: id });
    if (points.length < 3 || points.some((point) => isStopClosedOn(point.label, state.dateExact))) return false;
    return judgeFinalDayTime({ points, skeletonTourId: id, rhythm: state.rhythm }).bookable &&
      frozenDayAllowsCheckout(certifyFrozenDayFromPickup({ points, pickupCoord: pickupOriginCoord(state.pickup), rhythm: state.rhythm })) &&
      rebuildLiveCommercialAuthority({
        anchorTourId: id,
        moments: points,
        edited: !isProvablyUntouchedCanonicalAnchor({ resolved, catalogStops: tour.stops, anchorTourId: id }),
      }).safe;
  });
}