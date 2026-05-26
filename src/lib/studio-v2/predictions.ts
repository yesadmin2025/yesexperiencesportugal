// Studio v2 — Predictive engine (pure, isomorphic).
//
// Online Bayesian-ish update of priority weights, mood vector, and pace
// confidence based on micro-gestures. No external deps; safe in browser
// or server. Persistence lives in predictions.functions.ts.
//
// Philosophy: the engine never asks. Every swipe/long-press/dwell is a
// signal that nudges the model so the next stop feels inevitable.

import type { PriorityKey, TravelerProfile } from "./profile";

export const MOOD_KEYS = [
  "food",
  "coastal",
  "culture",
  "wellness",
  "social",
  "quiet",
] as const;

export type MoodKey = (typeof MOOD_KEYS)[number];
export type MoodVector = Record<MoodKey, number>;

// Map priority → mood contribution. One priority can hit multiple moods.
const PRIORITY_TO_MOODS: Record<PriorityKey, MoodKey[]> = {
  vineyard_lunch:   ["food", "social"],
  wine_cellar:      ["culture", "quiet"],
  coastal_scenery:  ["coastal", "quiet"],
  hidden_villages:  ["culture", "quiet"],
  architecture:     ["culture"],
  heritage:         ["culture"],
  local_gastronomy: ["food", "social"],
  photography:      ["coastal", "culture"],
  quiet_luxury:     ["quiet", "wellness"],
  wellness:         ["wellness", "quiet"],
  boat:             ["coastal", "social"],
};

export interface PredictionState {
  weights: Record<PriorityKey, number>;
  moodVector: MoodVector;
  paceConfidence: number; // 0..1 — how confident we are about pace
  signalCount: number;
}

export type GestureSignal =
  // Refine swap = user rejected the prior stop, accepted the replacement.
  | { type: "swap"; fromKey: string; toKey: string; toPriorities?: PriorityKey[] }
  // Remove = strong negative signal toward whatever priorities that stop carried.
  | { type: "remove"; stopKey: string; priorities?: PriorityKey[] }
  // Dwell = soft positive signal toward that stop's mood/priorities.
  | { type: "dwell"; stopKey: string; ms: number; priorities?: PriorityKey[] }
  // Reorder = no priority change, but increases pace confidence.
  | { type: "reorder"; stopKey: string }
  // Long-press = strong positive on that stop's mood.
  | { type: "longpress"; stopKey: string; priorities?: PriorityKey[] };

const LEARNING_RATE = 0.12;
const DWELL_FLOOR_MS = 800;
const DWELL_CEIL_MS = 8000;

export function emptyMoodVector(): MoodVector {
  return MOOD_KEYS.reduce<MoodVector>((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as MoodVector);
}

export function seedStateFromProfile(profile: TravelerProfile): PredictionState {
  const mv = emptyMoodVector();
  // Seed mood from the explicit profile sliders (already 0..100).
  mv.food     = (profile.foodInterest ?? 50) / 100;
  mv.coastal  = (profile.coastalAffinity ?? 50) / 100;
  mv.culture  = (profile.cultureInterest ?? 50) / 100;
  mv.wellness = (profile.wellnessAffinity ?? 50) / 100;
  mv.social   = (profile.socialEnergy ?? 50) / 100;
  mv.quiet    = 1 - mv.social;

  return {
    weights: { ...profile.priorityWeights } as Record<PriorityKey, number>,
    moodVector: mv,
    paceConfidence: 0.5,
    signalCount: 0,
  };
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function nudgeWeights(
  weights: Record<PriorityKey, number>,
  priorities: PriorityKey[] | undefined,
  direction: 1 | -1,
  strength = 1,
): Record<PriorityKey, number> {
  if (!priorities || priorities.length === 0) return weights;
  const next = { ...weights };
  for (const k of priorities) {
    const cur = next[k] ?? 0;
    next[k] = Math.max(0, cur + direction * LEARNING_RATE * strength);
  }
  return next;
}

function nudgeMood(
  mv: MoodVector,
  priorities: PriorityKey[] | undefined,
  direction: 1 | -1,
  strength = 1,
): MoodVector {
  if (!priorities || priorities.length === 0) return mv;
  const next = { ...mv };
  for (const p of priorities) {
    for (const m of PRIORITY_TO_MOODS[p] ?? []) {
      next[m] = clamp01(next[m] + direction * LEARNING_RATE * strength);
    }
  }
  return next;
}

export function applySignal(
  state: PredictionState,
  signal: GestureSignal,
): PredictionState {
  switch (signal.type) {
    case "swap": {
      // Negative toward replaced, positive toward replacement is unknown —
      // we only have outgoing priorities reliably. Mild negative on remove side.
      return {
        ...state,
        weights: state.weights, // priorities unchanged; we don't know `to` semantics here
        moodVector: nudgeMood(state.moodVector, signal.toPriorities, +1, 0.6),
        paceConfidence: clamp01(state.paceConfidence + 0.02),
        signalCount: state.signalCount + 1,
      };
    }
    case "remove": {
      return {
        ...state,
        weights: nudgeWeights(state.weights, signal.priorities, -1, 1.2),
        moodVector: nudgeMood(state.moodVector, signal.priorities, -1, 1),
        paceConfidence: clamp01(state.paceConfidence + 0.01),
        signalCount: state.signalCount + 1,
      };
    }
    case "dwell": {
      const norm =
        (Math.min(DWELL_CEIL_MS, Math.max(DWELL_FLOOR_MS, signal.ms)) - DWELL_FLOOR_MS) /
        (DWELL_CEIL_MS - DWELL_FLOOR_MS);
      const strength = 0.3 + norm * 0.7;
      return {
        ...state,
        weights: nudgeWeights(state.weights, signal.priorities, +1, strength * 0.5),
        moodVector: nudgeMood(state.moodVector, signal.priorities, +1, strength),
        paceConfidence: state.paceConfidence,
        signalCount: state.signalCount + 1,
      };
    }
    case "reorder": {
      return {
        ...state,
        paceConfidence: clamp01(state.paceConfidence + 0.04),
        signalCount: state.signalCount + 1,
      };
    }
    case "longpress": {
      return {
        ...state,
        weights: nudgeWeights(state.weights, signal.priorities, +1, 1.4),
        moodVector: nudgeMood(state.moodVector, signal.priorities, +1, 1.3),
        paceConfidence: state.paceConfidence,
        signalCount: state.signalCount + 1,
      };
    }
  }
}

// Project predictions back into a profile so the existing composer/engine
// can re-run with the updated state without any other wiring.
export function projectStateOntoProfile(
  profile: TravelerProfile,
  state: PredictionState,
): TravelerProfile {
  return {
    ...profile,
    priorityWeights: { ...state.weights },
    foodInterest:    Math.round(state.moodVector.food * 100),
    coastalAffinity: Math.round(state.moodVector.coastal * 100),
    cultureInterest: Math.round(state.moodVector.culture * 100),
    wellnessAffinity:Math.round(state.moodVector.wellness * 100),
    socialEnergy:    Math.round(state.moodVector.social * 100),
  };
}

// Forecast the next best-fit stop key from a candidate pool, given the
// current state. Returns the highest-scoring candidate not already used.
// Pure scoring — used to *prefetch* the likely next substitution before
// the user asks for it.
export function forecastNext<T extends { key: string; priorities?: PriorityKey[] }>(
  state: PredictionState,
  candidates: T[],
  usedKeys: Set<string>,
): T | null {
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    if (usedKeys.has(c.key)) continue;
    let score = 0;
    for (const p of c.priorities ?? []) {
      score += (state.weights[p] ?? 0);
      for (const m of PRIORITY_TO_MOODS[p] ?? []) {
        score += state.moodVector[m] * 0.5;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
