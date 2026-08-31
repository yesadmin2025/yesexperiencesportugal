/**
 * FINAL STUDIO CLOSURE — the canonical Time Authority as BOOKING truth.
 *
 * This module owns NO timing arithmetic, NO budget, and NO product rules. It
 * is a thin, shared projection so that BOTH final seams — the Your Day
 * Reserve gate and the Stripe checkout invocation — ask the SAME canonical
 * authority (`judgeRouteTimeFit`) exactly the same question about exactly the
 * same authored route:
 *
 *   "Does the day we are about to sell fit, under proven minute truth?"
 *
 * Rules:
 *  - Structural identity (`inventoryStopId` / `blueprintStopId`), duration and
 *    duration provenance travel through untouched — nothing is re-timed,
 *    compressed, removed or substituted here.
 *  - The selected add-on minutes are passed to the authority exactly ONCE.
 *  - Fail closed: `not-evaluable` is NOT "safe". Anything other than a
 *    certified `fits` is a curator-review outcome.
 */

import {
  judgeRouteTimeFit,
  type TimeAuthorityStop,
  type TimeFitResult,
} from "@/lib/studio-v3/timeAuthority";
import type { DwellSource } from "@/lib/studio-v3/timeDomain";
import type { Rhythm } from "@/components/studio-v3/types";

export interface FinalGateRoutePoint {
  label: string;
  inventoryStopId?: string | null;
  blueprintStopId?: string | null;
  lat?: number | null;
  lng?: number | null;
  durationMinutes?: number | null;
  durationSource?: DwellSource | null;
}

export interface FinalDayTimeGate {
  /** The canonical authority's verdict for this exact day. */
  readonly fit: TimeFitResult;
  /** True ONLY for a certified in-budget day. Never true for `not-evaluable`. */
  readonly bookable: boolean;
  /** True whenever the day must go to the existing curator/review path. */
  readonly requiresReview: boolean;
}

/** Project authored route points into canonical Time Authority stops. */
export function toTimeAuthorityStops(
  points: ReadonlyArray<FinalGateRoutePoint>,
): TimeAuthorityStop[] {
  return points.map((p) => ({
    stopId: p.inventoryStopId ?? p.blueprintStopId ?? "",
    label: p.label,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    durationMinutes: p.durationMinutes ?? null,
    durationSource: p.durationSource ?? null,
  }));
}

/**
 * Ask the canonical Time Authority whether THIS day — the authoritative
 * authored/frozen route plus the currently selected add-on minutes — may be
 * sold. Pure and deterministic.
 */
export function judgeFinalDayTime(input: {
  points: ReadonlyArray<FinalGateRoutePoint>;
  /** Minutes committed by the CURRENT add-on basket. Counted exactly once. */
  addOnsMinutes?: number;
  skeletonTourId?: string | null;
  rhythm?: Rhythm | null;
}): FinalDayTimeGate {
  const fit = judgeRouteTimeFit({
    stops: toTimeAuthorityStops(input.points),
    ...(input.addOnsMinutes ? { addOnsMinutes: input.addOnsMinutes } : {}),
    skeletonTourId: input.skeletonTourId ?? null,
    ...(input.rhythm ? { rhythm: input.rhythm } : {}),
  });
  const bookable = fit.evaluable && fit.fits && fit.verdict === "fits";
  return { fit, bookable, requiresReview: !bookable };
}
