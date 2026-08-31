/**
 * Studio V3 — BUILD 1 / Pass 1: timing projection.
 *
 * Pure, synchronous, deterministic. No network, no OSRM, no side effects.
 * INERT — no production consumer reads it yet.
 *
 * Two stages:
 *   planning   — what the deterministic composer may rely on immediately.
 *   validated  — recomputed with externally supplied routed (OSRM) truth
 *                AFTER an ordered route exists. Never mutates the route.
 *
 * Accounting contract:
 *   totalMinutes = dwellMinutes + internalTravelMinutes + slackMinutes
 *   mealMinutes is a SUBTOTAL of dwellMinutes — never a second addend.
 *   Pickup → first moment and last moment → drop-off are excluded by
 *   construction: only legs BETWEEN consecutive experience moments exist.
 */

import type { StopKind } from "@/data/regionStops";
import { inferKind, stopDurationMinutes } from "@/lib/studio/timing";
import { haversineDistanceKm } from "@/components/studio-v3/livingAtlasRoutePlanner";
import {
  CANONICAL_TRAVEL_SLACK_FACTOR,
  CONSERVATIVE_DEFAULT_DWELL_MIN,
  CONSERVATIVE_MISSING_GEO_TRAVEL_MIN,
  FIXED_OPERATIONAL_SLACK_MIN,
  RHYTHM_TIMING_POLICY,
  type ComposedTiming,
  type DwellSource,
  type MomentTiming,
  type ResolvedTimeBudget,
  type TimingConflict,
  type TravelSource,
} from "@/lib/studio-v3/timeDomain";
import {
  MIN_TRANSFER_MINUTES,
  PLANNING_SPEED_KMH,
  ROAD_DISTANCE_FACTOR,
} from "@/lib/studio-v3/routePlanningConstants";
import type { ExperienceDimensionId } from "@/components/studio-v3/livingAtlasTaxonomy";
import type { Rhythm } from "@/components/studio-v3/types";

/**
 * Planning-estimate constants now live in ONE shared module consumed by both
 * the route planner and this projection (BUILD 1 / Pass 2, item A). The
 * Pass-1 duplication TODO is resolved; values are unchanged.
 */
export {
  MIN_TRANSFER_MINUTES,
  PLANNING_SPEED_KMH,
  ROAD_DISTANCE_FACTOR,
} from "@/lib/studio-v3/routePlanningConstants";

/* ------------------------------------------------------------------ *
 * Input
 * ------------------------------------------------------------------ */

/**
 * A moment as the timing layer needs it: stable identity plus truth facts.
 * Deliberately not a label bag — commercial identity must survive projection.
 */
export type TimingMomentInput = {
  /** Stable inventory / stop id. Required. */
  stopId: string;
  /** Signature tour id(s) this moment truthfully belongs to. */
  sourceTourIds?: readonly string[];
  /** Existing add-on / commercial id when the moment is a paid insert. */
  commercialId?: string;
  /** Display label — used ONLY for the kind-table dwell fallback. */
  label?: string;

  /** 1. Canonical source-of-truth chapter dwell, when published. */
  sotDurationMinutes?: number | null;
  /** 2. Add-on catalogue dwell fact. */
  addOnDurationMinutes?: number | null;
  /** 3. Inventory (`OptionalStop.durationMin`) dwell fact. */
  inventoryDurationMinutes?: number | null;
  /** Verified minimum truthful dwell. A dense rhythm may never go below it. */
  minimumDwellMinutes?: number | null;

  /**
   * Canonical travel to the NEXT moment. Only supply when that truth is
   * genuinely adjacent/applicable (consecutive chapters of the same tour).
   */
  sotTravelToNextMinutes?: number | null;

  coords?: { lat: number; lng: number } | null;
  /** Semantic classification used for the kind-table dwell fallback. */
  kind?: StopKind | null;

  /**
   * Canonical meal truth. NEVER inferred from free text in this foundation:
   * when metadata cannot prove it, this stays false.
   */
  isMeal?: boolean;
};

export type ProjectPlanningTimingInput = {
  moments: readonly TimingMomentInput[];
  budget: ResolvedTimeBudget;
  rhythm: Rhythm;
};

/* ------------------------------------------------------------------ *
 * Dwell
 * ------------------------------------------------------------------ */

function resolveBaseDwell(moment: TimingMomentInput): {
  minutes: number;
  source: DwellSource;
} {
  if (typeof moment.sotDurationMinutes === "number" && moment.sotDurationMinutes > 0) {
    return { minutes: moment.sotDurationMinutes, source: "sot-chapter" };
  }
  if (typeof moment.addOnDurationMinutes === "number" && moment.addOnDurationMinutes > 0) {
    return { minutes: moment.addOnDurationMinutes, source: "addon-catalog" };
  }
  if (typeof moment.inventoryDurationMinutes === "number" && moment.inventoryDurationMinutes > 0) {
    return { minutes: moment.inventoryDurationMinutes, source: "inventory" };
  }
  const kind: StopKind | null = moment.kind ?? (moment.label ? inferKind(moment.label) : null);
  if (kind) {
    return {
      minutes: stopDurationMinutes({ label: moment.label ?? moment.stopId, kind }),
      source: "kind-table",
    };
  }
  return { minutes: CONSERVATIVE_DEFAULT_DWELL_MIN, source: "conservative-default" };
}

/**
 * Rhythm shapes depth, never length. A multiplier below 1 may only take
 * effect down to an explicit truthful minimum; without one the base dwell
 * fact is the floor.
 */
function applyRhythmToDwell(
  baseMinutes: number,
  moment: TimingMomentInput,
  rhythm: Rhythm,
): number {
  const { dwellMultiplier } = RHYTHM_TIMING_POLICY[rhythm];
  const scaled = Math.round(baseMinutes * dwellMultiplier);
  if (dwellMultiplier >= 1) return scaled;
  const floor =
    typeof moment.minimumDwellMinutes === "number" && moment.minimumDwellMinutes > 0
      ? Math.min(moment.minimumDwellMinutes, baseMinutes)
      : baseMinutes;
  return Math.max(scaled, floor);
}

/* ------------------------------------------------------------------ *
 * Travel (planning stage)
 * ------------------------------------------------------------------ */

function geoEstimateMinutes(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const roadKm = haversineDistanceKm(from, to) * ROAD_DISTANCE_FACTOR;
  return Math.max(MIN_TRANSFER_MINUTES, Math.round((roadKm / PLANNING_SPEED_KMH) * 60));
}

function resolvePlanningTravel(
  from: TimingMomentInput,
  to: TimingMomentInput,
): { minutes: number; source: TravelSource } {
  if (typeof from.sotTravelToNextMinutes === "number" && from.sotTravelToNextMinutes >= 0) {
    return { minutes: from.sotTravelToNextMinutes, source: "sot-travel-to-next" };
  }
  if (from.coords && to.coords) {
    return { minutes: geoEstimateMinutes(from.coords, to.coords), source: "geo-estimate" };
  }
  return {
    minutes: CONSERVATIVE_MISSING_GEO_TRAVEL_MIN,
    source: "conservative-missing-geo",
  };
}

function transitionSlackFor(rhythm: Rhythm, travelSource: TravelSource): number {
  const base = RHYTHM_TIMING_POLICY[rhythm].perTransitionSlackMin;
  // Canonical stored travel already carries operational padding — halve the
  // per-transition slack so the same minutes are not padded twice.
  if (travelSource === "sot-travel-to-next") {
    return Math.round(base * CANONICAL_TRAVEL_SLACK_FACTOR);
  }
  return base;
}

/* ------------------------------------------------------------------ *
 * Assembly
 * ------------------------------------------------------------------ */

function assemble(
  stage: ComposedTiming["stage"],
  perMoment: MomentTiming[],
  budget: ResolvedTimeBudget,
): ComposedTiming {
  const dwellMinutes = perMoment.reduce((sum, m) => sum + m.dwellMinutes, 0);
  const mealMinutes = perMoment.reduce((sum, m) => sum + (m.isMeal ? m.dwellMinutes : 0), 0);
  const internalTravelMinutes = perMoment.reduce((sum, m) => sum + (m.travelToNextMinutes ?? 0), 0);
  const transitionSlack = perMoment.reduce((sum, m) => sum + m.transitionSlackMinutes, 0);
  const slackMinutes = perMoment.length > 0 ? FIXED_OPERATIONAL_SLACK_MIN + transitionSlack : 0;
  const totalMinutes = dwellMinutes + internalTravelMinutes + slackMinutes;

  return {
    stage,
    perMoment,
    dwellMinutes,
    mealMinutes,
    internalTravelMinutes,
    slackMinutes,
    totalMinutes,
    budget,
    remainingMinutes: budget.availableExperienceMinutes - totalMinutes,
    withinEnvelope: totalMinutes >= budget.minMinutes && totalMinutes <= budget.maxMinutes,
    excluded: { pickupToFirst: true, lastToDropoff: true },
  };
}

/**
 * Deterministic planning projection. Same inputs always produce a deep-equal
 * result. Only legs BETWEEN consecutive experience moments are counted, so
 * pickup→first and last→drop-off transfers are excluded by construction.
 */
export function projectPlanningTiming(input: ProjectPlanningTimingInput): ComposedTiming {
  const { moments, budget, rhythm } = input;

  const perMoment = moments.map<MomentTiming>((moment, index) => {
    const base = resolveBaseDwell(moment);
    const dwellMinutes = applyRhythmToDwell(base.minutes, moment, rhythm);
    const next = moments[index + 1];

    if (!next) {
      return {
        identity: {
          stopId: moment.stopId,
          sourceTourIds: [...(moment.sourceTourIds ?? [])],
          ...(moment.commercialId ? { commercialId: moment.commercialId } : {}),
        },
        dwellMinutes,
        baseDwellMinutes: base.minutes,
        dwellSource: base.source,
        isMeal: moment.isMeal === true,
        travelToNextMinutes: null,
        travelSource: null,
        transitionSlackMinutes: 0,
      };
    }

    const travel = resolvePlanningTravel(moment, next);
    return {
      identity: {
        stopId: moment.stopId,
        sourceTourIds: [...(moment.sourceTourIds ?? [])],
        ...(moment.commercialId ? { commercialId: moment.commercialId } : {}),
      },
      dwellMinutes,
      baseDwellMinutes: base.minutes,
      dwellSource: base.source,
      isMeal: moment.isMeal === true,
      travelToNextMinutes: travel.minutes,
      travelSource: travel.source,
      transitionSlackMinutes: transitionSlackFor(rhythm, travel.source),
    };
  });

  return assemble("planning", perMoment, budget);
}

/* ------------------------------------------------------------------ *
 * Routed validation
 * ------------------------------------------------------------------ */

export type ValidatedTimingResult = {
  timing: ComposedTiming;
  conflict: TimingConflict | null;
};

/**
 * Recompute a planning projection with externally supplied routed (OSRM)
 * minutes. Pure: it never fetches, never removes, never reorders and never
 * swaps a moment. An overflow is reported as structured data for a later
 * build to resolve.
 *
 * `routedLegMinutes[i]` is the leg from moment i to moment i+1, so its
 * expected length is `moments.length - 1`. Missing entries keep the
 * planning value for that leg.
 */
export function validateTiming(
  planningTiming: ComposedTiming,
  routedLegMinutes: ReadonlyArray<number | null | undefined>,
  rhythm: Rhythm,
): ValidatedTimingResult {
  const perMoment = planningTiming.perMoment.map<MomentTiming>((moment, index) => {
    if (moment.travelToNextMinutes === null) return { ...moment };
    const routed = routedLegMinutes[index];
    if (typeof routed !== "number" || !Number.isFinite(routed) || routed < 0) {
      return { ...moment };
    }
    const minutes = Math.round(routed);
    return {
      ...moment,
      travelToNextMinutes: minutes,
      travelSource: "routed-osrm",
      transitionSlackMinutes: transitionSlackFor(rhythm, "routed-osrm"),
    };
  });

  const timing = assemble("validated", perMoment, planningTiming.budget);
  const overflowMinutes = Math.max(0, timing.totalMinutes - timing.budget.maxMinutes);

  if (overflowMinutes === 0) return { timing, conflict: null };

  return {
    timing,
    conflict: {
      kind: "routed-overflow",
      stage: "validated",
      requestedDimensions: [],
      unfittedRequests: [],
      overflowMinutes,
      options: [],
    },
  };
}

/* ------------------------------------------------------------------ *
 * Conflict helpers (schema-level; selection lands in Pass 2)
 * ------------------------------------------------------------------ */

export type DimensionCoverageInput = {
  /** Every dimension the traveller requested. None may be dropped. */
  requestedDimensions: readonly ExperienceDimensionId[];
  /** Dimensions each composed stop actually carries. */
  coverageByStopId: Readonly<Record<string, readonly ExperienceDimensionId[]>>;
};

/**
 * Classify every requested dimension as represented or unfitted. Pure and
 * order-preserving — no requested dimension is ever silently discarded.
 */
export function describeRequestedDimensions(
  input: DimensionCoverageInput,
): TimingConflict["requestedDimensions"] {
  return input.requestedDimensions.map((dimension) => {
    const representedByStopIds = Object.entries(input.coverageByStopId)
      .filter(([, dimensions]) => dimensions.includes(dimension))
      .map(([stopId]) => stopId)
      .sort((a, b) => a.localeCompare(b));
    return {
      dimension,
      status: representedByStopIds.length > 0 ? ("represented" as const) : ("unfitted" as const),
      representedByStopIds,
    };
  });
}

export type CandidateCostInput = {
  dimension: ExperienceDimensionId;
  /** Truthful candidate moments, each with its total admission cost. */
  candidates: ReadonlyArray<{ stopId: string; totalCostMinutes: number }>;
};

/**
 * Minimum truthful extra minutes needed to admit a dimension: the cheapest
 * candidate's full cost (dwell + its travel + slack, computed by the caller).
 */
export function describeUnfittedRequest(input: CandidateCostInput): TimingConflict["unfittedRequests"][number] {
  const sorted = [...input.candidates].sort(
    (a, b) => a.totalCostMinutes - b.totalCostMinutes || a.stopId.localeCompare(b.stopId),
  );
  return {
    dimension: input.dimension,
    candidateStopIds: sorted.map((candidate) => candidate.stopId),
    minimumExtraMinutesNeeded: sorted[0]?.totalCostMinutes ?? 0,
  };
}
