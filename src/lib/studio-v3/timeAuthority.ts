/**
 * PASS 2.2 — STUDIO V3 TIME AUTHORITY (THIN ADAPTER OVER CANONICAL TIMING).
 *
 * ONE question, answered ONLY from structurally proven minutes: does THIS day
 * fit?
 *
 * This module owns NO time arithmetic and NO budget constants of its own:
 *  - minute arithmetic is `projectPlanningTiming` from
 *    `@/lib/studio-v3/timingProjection` — the canonical V3 planning-time
 *    authority (dwell + internal travel + FIXED_OPERATIONAL_SLACK_MIN +
 *    per-transition slack, conservative missing-geo travel, pickup→first and
 *    last→drop-off excluded by construction);
 *  - the budget is a `ResolvedTimeBudget` from
 *    `@/lib/studio-v3/resolveTimeBudget`, whose
 *    `availableExperienceMinutes` is THE authority.
 *
 * Its only responsibility is the PROVENANCE BOUNDARY: deciding whether
 * certified minute truth exists for a set of stops, and translating those
 * certified stops into canonical `TimingMomentInput`s.
 *
 * PROVENANCE RULES (reusing `DwellSource` from timeDomain.ts):
 *  - Authoritative: `sot-chapter`, `addon-catalog`, `inventory` — and only
 *    together with an explicit positive duration.
 *  - NOT authoritative: `kind-table`, `conservative-default`, or an absent /
 *    unknown provenance. Label inference (`inferKind`) is never consulted.
 *  - Certification depends on structural identity (`stopId`), never on the
 *    display label.
 *
 * RULES
 *  - Never shortens dwell to force a fit.
 *  - Never removes or zeroes a selected add-on to force a fit.
 *  - Unknown minutes stay unknown: `evaluable: false`, and the caller must
 *    fall back to its explicit legacy count branch.
 *  - Pure, synchronous, deterministic. No React, no fetch, no dates.
 */

import {
  projectPlanningTiming,
  type TimingMomentInput,
} from "@/lib/studio-v3/timingProjection";
import { resolveTimeBudget } from "@/lib/studio-v3/resolveTimeBudget";
import type { DwellSource, ResolvedTimeBudget } from "@/lib/studio-v3/timeDomain";
import type { Rhythm } from "@/components/studio-v3/types";

/** Dwell provenances that certify structural minute truth. */
export const AUTHORITATIVE_DWELL_SOURCES: ReadonlySet<DwellSource> = new Set<DwellSource>([
  "sot-chapter",
  "addon-catalog",
  "inventory",
]);

export interface TimeAuthorityStop {
  /** Stable structural identity. Certification never depends on the label. */
  stopId: string;
  /** Display label. Diagnostics only — never a certification input. */
  label?: string;
  /** Signature tour id(s) this moment truthfully belongs to. */
  sourceTourIds?: readonly string[];
  /** Commercial id when the moment is a paid insert. */
  commercialId?: string;
  lat?: number | null;
  lng?: number | null;
  /** Explicit minutes. Only certifying when `durationSource` is authoritative. */
  durationMinutes?: number | null;
  /** Provenance of `durationMinutes`, using the canonical `DwellSource`. */
  durationSource?: DwellSource | null;
}

export type TimeVerdict =
  | "fits"
  | "over-day-budget"
  | /** No certified minutes — the caller must use its legacy count fallback. */
    "not-evaluable";

export interface TimeFitResult {
  /** True only when structurally proven minutes exist for every stop. */
  readonly evaluable: boolean;
  /** True only when `evaluable` AND the day is inside the resolved budget. */
  readonly fits: boolean;
  readonly verdict: TimeVerdict;
  /** Canonical total: dwell + internal travel + slack (+ aggregate add-ons). */
  readonly totalMin: number;
  /** Dwell only (+ aggregate add-on minutes). */
  readonly experienceMin: number;
  /** Canonical internal travel between consecutive moments. */
  readonly driveMin: number;
  /** Fixed operational slack + per-transition slack. */
  readonly slackMin: number;
  readonly remainingMin: number;
  /** `ResolvedTimeBudget.availableExperienceMinutes`. */
  readonly budgetMin: number;
}

const NOT_EVALUABLE: TimeFitResult = {
  evaluable: false,
  fits: false,
  verdict: "not-evaluable",
  totalMin: 0,
  experienceMin: 0,
  driveMin: 0,
  slackMin: 0,
  remainingMin: 0,
  budgetMin: 0,
};

/**
 * Does this single stop carry STRUCTURAL minute truth?
 *
 * TRUE only when a stable structural identity and an explicit positive
 * duration are accompanied by an authoritative provenance. Label inference is
 * never sufficient.
 */
export function stopHasMinuteTruth(stop: TimeAuthorityStop): boolean {
  if (!stop.stopId || stop.stopId.trim() === "") return false;
  if (typeof stop.durationMinutes !== "number" || !(stop.durationMinutes > 0)) return false;
  if (!stop.durationSource) return false;
  return AUTHORITATIVE_DWELL_SOURCES.has(stop.durationSource);
}

/**
 * Does the WHOLE day carry structural minute truth? Requires at least one stop
 * and every stop certified. Missing geo is tolerated (canonical projection
 * applies its conservative missing-geo travel); unproven dwell is not.
 */
export function hasMinuteTruth(stops: ReadonlyArray<TimeAuthorityStop>): boolean {
  if (stops.length === 0) return false;
  return stops.every(stopHasMinuteTruth);
}

/**
 * Certified stop -> canonical timing moment. The certified duration is written
 * to the field matching its provenance so the canonical resolver reports the
 * same `dwellSource` back.
 */
function toTimingMoment(stop: TimeAuthorityStop): TimingMomentInput {
  const minutes = stop.durationMinutes as number;
  const coords =
    typeof stop.lat === "number" && typeof stop.lng === "number"
      ? { lat: stop.lat, lng: stop.lng }
      : null;
  const base: TimingMomentInput = {
    stopId: stop.stopId,
    ...(stop.sourceTourIds ? { sourceTourIds: [...stop.sourceTourIds] } : {}),
    ...(stop.commercialId ? { commercialId: stop.commercialId } : {}),
    coords,
  };
  switch (stop.durationSource) {
    case "sot-chapter":
      return { ...base, sotDurationMinutes: minutes };
    case "addon-catalog":
      return { ...base, addOnDurationMinutes: minutes };
    default:
      return { ...base, inventoryDurationMinutes: minutes };
  }
}

export interface JudgeRouteTimeFitInput {
  stops: ReadonlyArray<TimeAuthorityStop>;
  /**
   * Minutes committed by SELECTED add-ons that have NO structural moment of
   * their own. Already-committed external experience time: counted exactly
   * once, never zeroed to force a fit, never given fabricated travel/slack.
   */
  addOnsMinutes?: number;
  /** Explicit canonical budget. Highest authority when supplied. */
  budget?: ResolvedTimeBudget | null;
  /** Resolves a budget deterministically when none is supplied. */
  skeletonTourId?: string | null;
  /** Depth/pace only — never a day-length input. */
  rhythm?: Rhythm;
}

function resolveBudget(input: JudgeRouteTimeFitInput): ResolvedTimeBudget {
  if (input.budget) return input.budget;
  return resolveTimeBudget({ skeletonTourId: input.skeletonTourId ?? null });
}

/**
 * Judge a whole route against certified minutes, using the canonical V3
 * planning projection.
 *
 * Returns `not-evaluable` (never `fits`) when minute truth is absent, so a
 * caller can never mistake "unknown" for "safe".
 */
export function judgeRouteTimeFit(input: JudgeRouteTimeFitInput): TimeFitResult {
  if (!hasMinuteTruth(input.stops)) return NOT_EVALUABLE;

  const budget = resolveBudget(input);
  const timing = projectPlanningTiming({
    moments: input.stops.map(toTimingMoment),
    budget,
    rhythm: input.rhythm ?? "balanced",
  });

  const addOns = Math.max(0, Math.round(input.addOnsMinutes ?? 0));
  const totalMin = timing.totalMinutes + addOns;
  const budgetMin = budget.availableExperienceMinutes;
  const verdict: TimeVerdict = totalMin > budgetMin ? "over-day-budget" : "fits";

  return {
    evaluable: true,
    fits: verdict === "fits",
    verdict,
    totalMin,
    experienceMin: timing.dwellMinutes + addOns,
    driveMin: timing.internalTravelMinutes,
    slackMin: timing.slackMinutes,
    remainingMin: Math.max(0, budgetMin - totalMin),
    budgetMin,
  };
}

/**
 * Would adding `candidate` to `stops` still fit? Used by Add / Swap / extra
 * moment composition so a certified, fitting addition is never rejected merely
 * because a legacy stop count says the day is "full".
 *
 * `replaceAt` models a swap; omit it to append at `insertAt` (or the end).
 */
export function judgeAdmission(
  input: JudgeRouteTimeFitInput,
  candidate: TimeAuthorityStop,
  options: { insertAt?: number; replaceAt?: number } = {},
): TimeFitResult {
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
  return judgeRouteTimeFit({ ...input, stops: projected });
}
