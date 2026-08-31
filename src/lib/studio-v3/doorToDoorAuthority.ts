/**
 * STUDIO V3 — CANONICAL DOOR-TO-DOOR TIME AUTHORITY.
 *
 * ONE clock for the customer day, owner-defined:
 *
 *   doorToDoorMinutes =
 *       pickupToFirstMinutes            (pickup origin -> first moment)
 *     + experienceMinutes              (proven dwell + selected add-on minutes)
 *     + internalTravelMinutes          (legs BETWEEN consecutive moments)
 *     + slackMinutes                   (fixed internal slack + per-transition
 *                                       slack + pickup/drop-off transfer buffer)
 *     + lastToDropoffMinutes           (last moment -> drop-off)
 *
 * HARD MAX = 540 minutes (9h). Target envelope = 480–540 where enough REAL
 * content exists. Under 480 is valid, never padded with irrelevant moments.
 *
 * Existing authorities are REUSED, never duplicated:
 *  - dwell / internal travel / internal slack: `projectPlanningTiming`
 *    (`timingProjection.ts`) via `judgeRouteTimeFit` provenance rules;
 *  - minute-truth certification: `hasMinuteTruth` (`timeAuthority.ts`);
 *  - geo planning estimate: `ROAD_DISTANCE_FACTOR` / `PLANNING_SPEED_KMH` /
 *    `MIN_TRANSFER_MINUTES` (`routePlanningConstants.ts`);
 *  - transfer buffer: `PICKUP_RETURN_BUFFER_MIN` (`itinerary-thresholds.ts`);
 *  - pickup zone origin: `pickupOriginCoord` (`curation.ts`) — the caller
 *    passes the resolved coordinate, so this module stays UI-free.
 *
 * FAIL CLOSED. Unknown essential minutes are never treated as 0:
 *  - no certified dwell for every moment  -> `not-evaluable`
 *  - no pickup origin coordinate/zone     -> `not-evaluable`
 *  - missing first/last coordinates       -> conservative missing-geo minutes
 *
 * Pure, synchronous, deterministic. No React, no fetch, no dates.
 */

import { haversineDistanceKm } from "@/components/studio-v3/livingAtlasRoutePlanner";
import { PICKUP_RETURN_BUFFER_MIN } from "@/lib/studio-v3/itinerary-thresholds";
import {
  MIN_TRANSFER_MINUTES,
  PLANNING_SPEED_KMH,
  ROAD_DISTANCE_FACTOR,
} from "@/lib/studio-v3/routePlanningConstants";
import {
  CONSERVATIVE_MISSING_GEO_TRAVEL_MIN,
  STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN,
  STUDIO_DOOR_TO_DOOR_TARGET_MIN_MIN,
} from "@/lib/studio-v3/timeDomain";
import { hasMinuteTruth, judgeRouteTimeFit, type TimeAuthorityStop } from "@/lib/studio-v3/timeAuthority";
import type { Rhythm } from "@/components/studio-v3/types";

export type LatLng = { lat: number; lng: number };

export type DoorToDoorStatus =
  | "fits"
  | "underfilled-but-valid"
  | "over-hard-max"
  | "not-evaluable";

export interface DoorToDoorInput {
  /** Ordered structural moments with proven dwell + provenance. */
  stops: ReadonlyArray<TimeAuthorityStop>;
  /**
   * Planning origin: the truthful pickup zone coordinate before the exact
   * address is known, or the geocoded address once it is. `null` means the
   * day CANNOT be door-to-door certified.
   */
  pickupCoord: LatLng | null;
  /** Defaults to `pickupCoord` (same place/zone) when omitted. */
  dropoffCoord?: LatLng | null;
  /** Minutes committed by selected add-ons with no structural moment. */
  addOnsMinutes?: number;
  /** Depth/pace only — never a day-length input. */
  rhythm?: Rhythm;
  /**
   * Verified pickup->first minutes when real routing truth exists. Highest
   * authority; otherwise a conservative geo estimate is used.
   */
  routedPickupToFirstMinutes?: number | null;
  /** Verified last->drop-off minutes when real routing truth exists. */
  routedLastToDropoffMinutes?: number | null;
  /**
   * True once an exact pickup/drop-off address (not just a zone) backs the
   * origin. Reported back so checkout gating can require recertification.
   */
  originIsExactAddress?: boolean;
}

export interface DoorToDoorCertification {
  readonly status: DoorToDoorStatus;
  /** True only when certified minutes exist for the WHOLE door-to-door day. */
  readonly evaluable: boolean;
  /** True only when `evaluable` and `doorToDoorMinutes <= 540`. */
  readonly fitsHardMax: boolean;
  readonly doorToDoorMinutes: number;
  readonly pickupToFirstMinutes: number;
  readonly experienceMinutes: number;
  readonly internalTravelMinutes: number;
  readonly lastToDropoffMinutes: number;
  readonly slackMinutes: number;
  readonly remainingToHardMaxMinutes: number;
  readonly hardMaxMinutes: number;
  readonly targetMinMinutes: number;
  /** Transfer legs derived from a zone centroid rather than an exact address. */
  readonly originIsExactAddress: boolean;
  /** Minutes by which the day exceeds the hard max. 0 when it fits. */
  readonly overflowMinutes: number;
  readonly reason: string;
}

const NOT_EVALUABLE = (reason: string): DoorToDoorCertification => ({
  status: "not-evaluable",
  evaluable: false,
  fitsHardMax: false,
  doorToDoorMinutes: 0,
  pickupToFirstMinutes: 0,
  experienceMinutes: 0,
  internalTravelMinutes: 0,
  lastToDropoffMinutes: 0,
  slackMinutes: 0,
  remainingToHardMaxMinutes: 0,
  hardMaxMinutes: STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN,
  targetMinMinutes: STUDIO_DOOR_TO_DOOR_TARGET_MIN_MIN,
  originIsExactAddress: false,
  overflowMinutes: 0,
  reason,
});

function coordOf(stop: TimeAuthorityStop | undefined): LatLng | null {
  if (!stop) return null;
  return typeof stop.lat === "number" && typeof stop.lng === "number"
    ? { lat: stop.lat, lng: stop.lng }
    : null;
}

/** Conservative transfer estimate. Never returns 0 for a real transfer. */
export function transferMinutes(from: LatLng | null, to: LatLng | null): number {
  if (!from || !to) return CONSERVATIVE_MISSING_GEO_TRAVEL_MIN;
  const roadKm = haversineDistanceKm(from, to) * ROAD_DISTANCE_FACTOR;
  return Math.max(MIN_TRANSFER_MINUTES, Math.round((roadKm / PLANNING_SPEED_KMH) * 60));
}

/**
 * THE canonical Studio door-to-door certification. Composition, Add / Swap /
 * Remove, logistics revalidation and checkout gating all read this one result.
 */
export function certifyDoorToDoor(input: DoorToDoorInput): DoorToDoorCertification {
  if (input.stops.length === 0) return NOT_EVALUABLE("No moments composed yet.");
  if (!hasMinuteTruth(input.stops)) {
    return NOT_EVALUABLE("Some moments have no verified duration yet.");
  }
  if (!input.pickupCoord) {
    return NOT_EVALUABLE("Pickup area not known yet, so the full day can't be certified.");
  }

  // Internal experience-day truth comes from the existing authority. Its
  // budget is irrelevant here: door-to-door has its own owner-defined ceiling.
  const internal = judgeRouteTimeFit({
    stops: input.stops,
    ...(typeof input.addOnsMinutes === "number" ? { addOnsMinutes: input.addOnsMinutes } : {}),
    ...(input.rhythm ? { rhythm: input.rhythm } : {}),
  });
  if (!internal.evaluable) {
    return NOT_EVALUABLE("Some moments have no verified duration yet.");
  }

  const dropoff = input.dropoffCoord ?? input.pickupCoord;
  const pickupToFirst =
    typeof input.routedPickupToFirstMinutes === "number" && input.routedPickupToFirstMinutes >= 0
      ? Math.round(input.routedPickupToFirstMinutes)
      : transferMinutes(input.pickupCoord, coordOf(input.stops[0]));
  const lastToDropoff =
    typeof input.routedLastToDropoffMinutes === "number" && input.routedLastToDropoffMinutes >= 0
      ? Math.round(input.routedLastToDropoffMinutes)
      : transferMinutes(coordOf(input.stops[input.stops.length - 1]), dropoff);

  // The transfer buffer is operational slack on the two door legs, not travel.
  const slackMinutes = internal.slackMin + PICKUP_RETURN_BUFFER_MIN;
  const doorToDoorMinutes =
    pickupToFirst + internal.experienceMin + internal.driveMin + slackMinutes + lastToDropoff;

  const overflowMinutes = Math.max(0, doorToDoorMinutes - STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN);
  const status: DoorToDoorStatus =
    overflowMinutes > 0
      ? "over-hard-max"
      : doorToDoorMinutes < STUDIO_DOOR_TO_DOOR_TARGET_MIN_MIN
        ? "underfilled-but-valid"
        : "fits";

  return {
    status,
    evaluable: true,
    fitsHardMax: overflowMinutes === 0,
    doorToDoorMinutes,
    pickupToFirstMinutes: pickupToFirst,
    experienceMinutes: internal.experienceMin,
    internalTravelMinutes: internal.driveMin,
    lastToDropoffMinutes: lastToDropoff,
    slackMinutes,
    remainingToHardMaxMinutes: Math.max(0, STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN - doorToDoorMinutes),
    hardMaxMinutes: STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN,
    targetMinMinutes: STUDIO_DOOR_TO_DOOR_TARGET_MIN_MIN,
    originIsExactAddress: input.originIsExactAddress === true,
    overflowMinutes,
    reason:
      status === "over-hard-max"
        ? `This day runs about ${Math.round(overflowMinutes)} minutes past the 9-hour limit from your pickup area.`
        : status === "underfilled-but-valid"
          ? "A shorter, coherent day — nothing padded to fill time."
          : "Fits a full 8–9 hour day, door to door.",
  };
}

/**
 * Would admitting `candidate` keep the day inside 540 door-to-door?
 * `replaceAt` models a swap; omit it to insert at `insertAt` (or append).
 */
export function certifyDoorToDoorAdmission(
  input: DoorToDoorInput,
  candidate: TimeAuthorityStop,
  options: { insertAt?: number; replaceAt?: number } = {},
): DoorToDoorCertification {
  const projected = input.stops.map((s) => ({ ...s }));
  if (typeof options.replaceAt === "number" && projected[options.replaceAt]) {
    projected[options.replaceAt] = { ...candidate };
  } else if (
    typeof options.insertAt === "number" &&
    options.insertAt >= 0 &&
    options.insertAt <= projected.length
  ) {
    projected.splice(options.insertAt, 0, { ...candidate });
  } else {
    projected.push({ ...candidate });
  }
  return certifyDoorToDoor({ ...input, stops: projected });
}

/**
 * Checkout gate. Stripe may only be invoked for a day whose door-to-door
 * certification is evaluable and inside the hard max.
 */
export function doorToDoorAllowsCheckout(cert: DoorToDoorCertification): boolean {
  return cert.evaluable && cert.fitsHardMax;
}
