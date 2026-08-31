/**
 * FINAL CERTIFICATION — per-candidate fit authority.
 *
 * A pool of candidates is NOT uniformly addable. "The day has 40 minutes
 * left" proves nothing about a 90-minute winery. This module answers ONE
 * question per candidate, against the day it would actually create:
 *
 *   if THIS candidate were inserted/swapped HERE, does the resulting day
 *   still fit the existing regional budget?
 *
 * It creates no new arithmetic. Two authorities, in strict order:
 *
 *   1. CANONICAL V3 TIME AUTHORITY (`timeAuthority.judgeAdmission`) whenever
 *      the current route AND the candidate carry structural stop identity
 *      with authoritative duration provenance. A canonically proven fit is
 *      never overturned by a legacy label/count heuristic.
 *   2. LEGACY FALLBACK (`summarizeDay` + `inferKind`) ONLY when the V3 time
 *      authority reports `not-evaluable`.
 *
 * Selected add-on minutes are counted exactly once on either path, and are
 * never zeroed or shortened to force a fit.
 *
 * It also enforces regional coherence: a candidate whose region is known and
 * differs from the anchor region can never be offered.
 *
 * FAILS CLOSED. Anything unproven (no anchor region resolution failure, an
 * over-drive or over-budget projection) is reported as not fitting.
 *
 * Pure, synchronous, deterministic. No React, no fetch.
 */

import { inferKind, summarizeDay, type TimingStop } from "@/lib/studio/timing";
import {
  hasMinuteTruth,
  judgeAdmission,
  stopHasMinuteTruth,
  type TimeAuthorityStop,
} from "@/lib/studio-v3/timeAuthority";
import type { DwellSource } from "@/lib/studio-v3/timeDomain";
import type { Rhythm } from "@/components/studio-v3/types";

export type FitReason =
  | "fits"
  | "over-day-budget"
  | "over-drive-budget"
  | "region-mismatch"
  | "unknown-candidate";

export interface CandidateFitInput {
  /** The day exactly as it stands right now, in order. */
  stops: ReadonlyArray<{
    label: string;
    lat?: number | null;
    lng?: number | null;
    durationMinutes?: number | null;
    /** Structural identity. Required for V3 time certification. */
    stopId?: string | null;
    /** Provenance of `durationMinutes`. Only authoritative sources certify. */
    durationSource?: DwellSource | null;
  }>;
  /** Region of the anchor Signature. Used for the budget and for coherence. */
  region: string | null | undefined;
  /** Minutes already committed by selected add-ons, if any. */
  addOnsMinutes?: number;
  /** Anchor Signature id — resolves the canonical V3 time budget. */
  skeletonTourId?: string | null;
  /** Depth/pace only — never a day-length input. */
  rhythm?: Rhythm;
}

export interface FitCandidate {
  label: string;
  lat?: number | null;
  lng?: number | null;
  durationMinutes?: number | null;
  /** Structural identity, when the source owns one. Never invented here. */
  stopId?: string | null;
  /** Provenance of `durationMinutes`, when the source owns one. */
  durationSource?: DwellSource | null;
  /** Region the candidate belongs to, when the data layer proves one. */
  region?: string | null;
}

export interface CandidateFitResult {
  readonly label: string;
  readonly fits: boolean;
  readonly reason: FitReason;
  /** Total minutes of the projected day, including the candidate. */
  readonly projectedTotalMin: number;
  /** Minutes still free after the candidate. Never negative. */
  readonly projectedRemainingMin: number;
}

const sameRegion = (a: string | null | undefined, b: string | null | undefined): boolean => {
  if (!a || !b) return true; // unknown region is not proof of mismatch
  return a.trim().toLowerCase() === b.trim().toLowerCase();
};

const toTimingStop = (stop: {
  label: string;
  lat?: number | null;
  lng?: number | null;
  durationMinutes?: number | null;
}): TimingStop => ({
  label: stop.label,
  lat: stop.lat ?? null,
  lng: stop.lng ?? null,
  kind: inferKind(stop.label),
  durationMinutes: stop.durationMinutes ?? null,
});

/** Structural projection for the canonical V3 time authority. No inference. */
const toTimeAuthorityStop = (stop: {
  label: string;
  lat?: number | null;
  lng?: number | null;
  durationMinutes?: number | null;
  stopId?: string | null;
  durationSource?: DwellSource | null;
}): TimeAuthorityStop => ({
  // Identity is never synthesized from a label or an index.
  stopId: stop.stopId ?? "",
  label: stop.label,
  lat: stop.lat ?? null,
  lng: stop.lng ?? null,
  durationMinutes: stop.durationMinutes ?? null,
  durationSource: stop.durationSource ?? null,
});

/**
 * Project the day WITH the candidate at `position` (append by default, or a
 * replacement when `replaceAt` is given) and judge it against the existing
 * regional budget.
 */
export function evaluateCandidateFit(
  input: CandidateFitInput,
  candidate: FitCandidate,
  options: { insertAt?: number; replaceAt?: number } = {},
): CandidateFitResult {
  const label = candidate.label?.trim() ?? "";
  if (!label) {
    return {
      label: candidate.label ?? "",
      fits: false,
      reason: "unknown-candidate",
      projectedTotalMin: 0,
      projectedRemainingMin: 0,
    };
  }

  if (!sameRegion(candidate.region, input.region)) {
    return {
      label,
      fits: false,
      reason: "region-mismatch",
      projectedTotalMin: 0,
      projectedRemainingMin: 0,
    };
  }

  // 1) CANONICAL V3 TIME AUTHORITY — preferred whenever the current route and
  // the candidate both carry structural identity + authoritative provenance.
  const currentTimeStops = input.stops.map(toTimeAuthorityStop);
  const candidateTimeStop = toTimeAuthorityStop(candidate);
  if (hasMinuteTruth(currentTimeStops) && stopHasMinuteTruth(candidateTimeStop)) {
    const verdict = judgeAdmission(
      {
        stops: currentTimeStops,
        // Selected add-on minutes are real, counted exactly once, never zeroed.
        addOnsMinutes: input.addOnsMinutes ?? 0,
        skeletonTourId: input.skeletonTourId ?? null,
        ...(input.rhythm ? { rhythm: input.rhythm } : {}),
      },
      candidateTimeStop,
      options,
    );
    if (verdict.evaluable) {
      return {
        label,
        fits: verdict.fits,
        reason: verdict.fits ? "fits" : "over-day-budget",
        projectedTotalMin: verdict.totalMin,
        projectedRemainingMin: verdict.remainingMin,
      };
    }
  }

  // 2) EXPLICIT LEGACY FALLBACK — only when V3 minute truth is unavailable.
  const current = input.stops.map(toTimingStop);
  const projectedStops = [...current];
  const candidateStop = toTimingStop(candidate);

  if (typeof options.replaceAt === "number" && projectedStops[options.replaceAt]) {
    projectedStops[options.replaceAt] = candidateStop;
  } else if (
    typeof options.insertAt === "number" &&
    options.insertAt >= 0 &&
    options.insertAt <= projectedStops.length
  ) {
    projectedStops.splice(options.insertAt, 0, candidateStop);
  } else {
    projectedStops.push(candidateStop);
  }

  // Drive minutes are recomputed from geometry for the PROJECTED order:
  // reusing the current route's routed legs would describe a day that no
  // longer exists once a moment moves in or out.
  const summary = summarizeDay({
    stops: projectedStops,
    region: input.region ?? null,
    addOnsMin: input.addOnsMinutes ?? 0,
  });

  const reason: FitReason = summary.overBudget
    ? "over-day-budget"
    : summary.overDrive
      ? "over-drive-budget"
      : "fits";

  return {
    label,
    fits: reason === "fits",
    reason,
    projectedTotalMin: summary.totalMin,
    projectedRemainingMin: summary.remainingMin,
  };
}

/** Evaluate a whole pool at once. Order preserved. */
export function evaluatePoolFit(
  input: CandidateFitInput,
  candidates: ReadonlyArray<FitCandidate>,
  options: { insertAt?: number; replaceAt?: number } = {},
): CandidateFitResult[] {
  return candidates.map((candidate) => evaluateCandidateFit(input, candidate, options));
}

/** Convenience map keyed by candidate label. */
export function fitByLabel(results: ReadonlyArray<CandidateFitResult>): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const result of results) map[result.label] = result.fits;
  return map;
}
