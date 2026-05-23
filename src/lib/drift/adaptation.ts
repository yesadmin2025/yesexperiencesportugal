// Drift adaptation telemetry — pure helpers.
//
// Goal: prove the predictive engine adapts in real time to behavior, not
// only to explicit answers. We snapshot the smallest set of values that
// *must change* when the engine reacts (top mood weight, top inferred
// dimension, predicted itinerary stop ids, collapse list), then emit a
// `prediction_update` event only when one of them actually shifts.
//
// This keeps DB volume low (no churn rows when nothing changed) and turns
// every row into evidence that a specific user signal moved the engine.
//
// Pure TS, no I/O — safe to import from React + tests.

import type { Prediction } from "./predict";
import type { ConfidenceMap } from "./inference";
import type { Mood } from "./behavior";
import type { ComposedDay } from "./composer";

export interface AdaptationSnapshot {
  /** Mood currently most weighted by the engine. */
  topMood: Mood | null;
  /** Weight of that mood, rounded for stable diffing. */
  topMoodWeight: number;
  /** Tonal register flowing into the reveal copy. */
  tonalRegister: Prediction["tonalRegister"];
  /** Average intensity preference inferred from attractions (1-5). */
  intensity: number;
  /** Reveal confidence rounded for stable diffing. */
  revealConfidence: number;
  /** Pacing class derived from decision latency. */
  pacingClass: Prediction["pacingClass"];
  /** Chapters the engine is currently willing to skip. */
  collapseAhead: Prediction["collapseNextChapters"];
  /** Strongest inferred dimension above the soft threshold, e.g. "style:wine". */
  topInferred: string | null;
  /** Confidence of that top inferred value, rounded. */
  topInferredConfidence: number;
  /** Ordered stop ids of the live itinerary the engine would compose right now. */
  dayStopIds: string[];
}

export type AdaptationReason =
  | "top_mood"
  | "tonal_register"
  | "pacing"
  | "collapse_ahead"
  | "top_inferred"
  | "itinerary"
  | "confidence";

export interface AdaptationDiff {
  changed: boolean;
  reasons: AdaptationReason[];
  previous: AdaptationSnapshot | null;
  next: AdaptationSnapshot;
}

/** Soft-drift thresholds for `diffAdaptation`. All values are absolute
 *  deltas on the rounded snapshot fields. Tune these to control how
 *  sensitive the telemetry is to micro-movement. */
export interface AdaptationThresholds {
  /** Minimum absolute change in the top mood's weight to count as movement
   *  when the mood label itself is stable. Default: 0.08. */
  topMoodWeight: number;
  /** Minimum absolute change in the top inferred dimension's confidence
   *  to count as movement when the key is stable. Default: 0.1. */
  topInferredConfidence: number;
  /** Minimum absolute change in reveal confidence to emit a `confidence`
   *  reason. Default: 0.06. */
  revealConfidence: number;
}

export const DEFAULT_ADAPTATION_THRESHOLDS: AdaptationThresholds = {
  topMoodWeight: 0.08,
  topInferredConfidence: 0.1,
  revealConfidence: 0.06,
};

function resolveThresholds(
  overrides?: Partial<AdaptationThresholds>,
): AdaptationThresholds {
  if (!overrides) return DEFAULT_ADAPTATION_THRESHOLDS;
  return {
    topMoodWeight:
      overrides.topMoodWeight ?? DEFAULT_ADAPTATION_THRESHOLDS.topMoodWeight,
    topInferredConfidence:
      overrides.topInferredConfidence ??
      DEFAULT_ADAPTATION_THRESHOLDS.topInferredConfidence,
    revealConfidence:
      overrides.revealConfidence ??
      DEFAULT_ADAPTATION_THRESHOLDS.revealConfidence,
  };
}

const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

function topMoodOf(prediction: Prediction): { mood: Mood | null; weight: number } {
  let bestMood: Mood | null = null;
  let bestWeight = -Infinity;
  for (const [mood, w] of Object.entries(prediction.sceneWeighting) as [Mood, number][]) {
    if (w > bestWeight) {
      bestMood = mood;
      bestWeight = w;
    }
  }
  return { mood: bestMood, weight: bestMood ? round(bestWeight, 2) : 0 };
}

function topInferredOf(confidence: ConfidenceMap, floor = 0.4): {
  key: string | null;
  conf: number;
} {
  let bestKey: string | null = null;
  let bestConf = floor;
  for (const [k, v] of Object.entries(confidence)) {
    if (v > bestConf) {
      bestKey = k;
      bestConf = v;
    }
  }
  return { key: bestKey, conf: bestKey ? round(bestConf, 2) : 0 };
}

export function snapshotAdaptation(
  prediction: Prediction,
  confidence: ConfidenceMap,
  day: Pick<ComposedDay, "stops">,
): AdaptationSnapshot {
  const top = topMoodOf(prediction);
  const inferred = topInferredOf(confidence);
  return {
    topMood: top.mood,
    topMoodWeight: top.weight,
    tonalRegister: prediction.tonalRegister,
    intensity: round(prediction.intensity, 2),
    revealConfidence: round(prediction.revealConfidence, 2),
    pacingClass: prediction.pacingClass,
    collapseAhead: [...prediction.collapseNextChapters].sort(),
    topInferred: inferred.key,
    topInferredConfidence: inferred.conf,
    dayStopIds: day.stops.map((s) => s.stop.id),
  };
}

function sameList<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/** Diff two snapshots and return the human-readable reasons the engine
 *  adapted. When `previous` is null, this counts as the initial baseline
 *  (changed = true, reasons = []) so callers can choose to emit or not. */
export function diffAdaptation(
  previous: AdaptationSnapshot | null,
  next: AdaptationSnapshot,
  thresholds?: Partial<AdaptationThresholds>,
): AdaptationDiff {
  if (!previous) return { changed: true, reasons: [], previous: null, next };
  const t = resolveThresholds(thresholds);
  const reasons: AdaptationReason[] = [];
  if (previous.topMood !== next.topMood) reasons.push("top_mood");
  // Top mood weight shift above threshold also counts as real movement even
  // when the top mood label is stable, otherwise we miss soft drift.
  else if (Math.abs(previous.topMoodWeight - next.topMoodWeight) > t.topMoodWeight)
    reasons.push("top_mood");
  if (previous.tonalRegister !== next.tonalRegister) reasons.push("tonal_register");
  if (previous.pacingClass !== next.pacingClass) reasons.push("pacing");
  if (!sameList(previous.collapseAhead, next.collapseAhead)) reasons.push("collapse_ahead");
  if (previous.topInferred !== next.topInferred) reasons.push("top_inferred");
  else if (
    Math.abs(previous.topInferredConfidence - next.topInferredConfidence) >
    t.topInferredConfidence
  )
    reasons.push("top_inferred");
  if (!sameList(previous.dayStopIds, next.dayStopIds)) reasons.push("itinerary");
  if (Math.abs(previous.revealConfidence - next.revealConfidence) > t.revealConfidence)
    reasons.push("confidence");
  return { changed: reasons.length > 0, reasons, previous, next };
}
