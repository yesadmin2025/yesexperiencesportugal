// Drift behavior tracker.
//
// Captures raw interaction signals during a session — decision latency,
// linger time, skip events, and "attraction" gestures on scenes — and
// derives a pacing class + intensity preference. Consumed by `predict.ts`
// to influence sequencing, weighting, pacing, and reveal tone.
//
// Pure client-side, in-memory + sessionStorage (anon, no PII).

import { useCallback, useEffect, useRef, useState } from "react";
import { recordDriftBehaviorEvent } from "./telemetry";

export type PacingClass = "decisive" | "balanced" | "exploratory";

export type Mood =
  | "arrival"
  | "intimacy"
  | "celebration"
  | "slowness"
  | "discovery"
  | "temptation"
  | "ritual";

export interface BehaviorState {
  /** ms between scene-in and the user's first action on that scene */
  decisionLatency: number[];
  /** ms the user stayed on a scene without acting (idle reads) */
  lingerEvents: number[];
  /** scenes the user saw but did not pick (when the chapter had alternatives) */
  skipEvents: { sceneId: string; mood?: Mood; intensity?: number }[];
  /** strong positive signals: long-press, double-tap, repeated hover */
  attractionEvents: { sceneId: string; mood?: Mood; intensity?: number; weight: number }[];
}

const SS_KEY = "drift_behavior_v1";

function emptyState(): BehaviorState {
  return { decisionLatency: [], lingerEvents: [], skipEvents: [], attractionEvents: [] };
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Classify pacing from accumulated decision latencies. */
export function classifyPacing(state: BehaviorState): PacingClass {
  if (state.decisionLatency.length < 2) return "balanced";
  const med = median(state.decisionLatency);
  if (med < 1200) return "decisive";
  if (med > 4000) return "exploratory";
  return "balanced";
}

/** Average intensity (1-5) of scenes that drew attraction. */
export function intensityPreference(state: BehaviorState): number {
  const xs = state.attractionEvents
    .map((e) => e.intensity)
    .filter((x): x is number => typeof x === "number");
  if (xs.length === 0) return 3;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Per-mood affinity weight in [0, 1], computed from attractions minus skips. */
export function moodAffinity(state: BehaviorState): Record<Mood, number> {
  const base: Record<Mood, number> = {
    arrival: 0.5,
    intimacy: 0.5,
    celebration: 0.5,
    slowness: 0.5,
    discovery: 0.5,
    temptation: 0.5,
    ritual: 0.5,
  };
  for (const e of state.attractionEvents) {
    if (e.mood) base[e.mood] = Math.min(1, base[e.mood] + 0.18 * e.weight);
  }
  for (const e of state.skipEvents) {
    if (e.mood) base[e.mood] = Math.max(0, base[e.mood] - 0.08);
  }
  return base;
}

interface UseDriftBehaviorApi {
  state: BehaviorState;
  /** Mark scene-in time so latency can be computed on next action. */
  markSceneShown: (sceneId: string) => void;
  /** Record an explicit choice — latency derived from last markSceneShown. */
  recordChoice: (opts: {
    sceneId: string;
    mood?: Mood;
    intensity?: number;
    /** other options visible but not chosen (counted as skips) */
    alternatives?: { sceneId: string; mood?: Mood; intensity?: number }[];
  }) => void;
  /** Strong positive: long-press or double-tap on a scene. */
  recordAttraction: (opts: {
    sceneId: string;
    mood?: Mood;
    intensity?: number;
    weight?: number;
  }) => void;
  /** Medium positive: passive linger without a tap. */
  recordLinger: (ms: number) => void;
  reset: () => void;
}

/** React hook — keeps live state in a ref, mirrors to sessionStorage. */
export function useDriftBehavior(): UseDriftBehaviorApi {
  const ref = useRef<BehaviorState>(emptyState());
  const sceneShownAt = useRef<Map<string, number>>(new Map());
  const [, force] = useState(0);

  // Hydrate from sessionStorage once.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) ref.current = { ...emptyState(), ...JSON.parse(raw) };
    } catch {
      /* noop */
    }
  }, []);

  const persist = useCallback(() => {
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify(ref.current));
    } catch {
      /* noop */
    }
    force((t) => t + 1);
  }, []);

  const markSceneShown = useCallback((sceneId: string) => {
    sceneShownAt.current.set(sceneId, performance.now());
  }, []);

  const recordChoice = useCallback<UseDriftBehaviorApi["recordChoice"]>(
    ({ sceneId, mood, intensity, alternatives }) => {
      const shown = sceneShownAt.current.get(sceneId);
      let dt: number | undefined;
      if (typeof shown === "number") {
        dt = Math.max(0, performance.now() - shown);
        ref.current.decisionLatency.push(dt);
      }
      if (alternatives) {
        for (const a of alternatives) {
          if (a.sceneId !== sceneId) {
            ref.current.skipEvents.push(a);
            void recordDriftBehaviorEvent("skip", {
              chapterId: a.sceneId,
              meta: { mood: a.mood, intensity: a.intensity },
            });
          }
        }
      }
      // A pick is also a mild attraction signal.
      if (mood) {
        ref.current.attractionEvents.push({ sceneId, mood, intensity, weight: 0.6 });
      }
      void recordDriftBehaviorEvent("decision", {
        chapterId: sceneId,
        decisionLatencyMs: dt,
        meta: { mood, intensity },
      });
      persist();
    },
    [persist],
  );

  const recordAttraction = useCallback<UseDriftBehaviorApi["recordAttraction"]>(
    ({ sceneId, mood, intensity, weight = 1 }) => {
      ref.current.attractionEvents.push({ sceneId, mood, intensity, weight });
      void recordDriftBehaviorEvent("attraction", {
        chapterId: sceneId,
        attractionTarget: sceneId,
        meta: { mood, intensity, weight },
      });
      persist();
    },
    [persist],
  );

  const recordLinger = useCallback(
    (ms: number) => {
      if (ms > 800) {
        ref.current.lingerEvents.push(ms);
        void recordDriftBehaviorEvent("linger", { lingerMs: Math.round(ms) });
        persist();
      }
    },
    [persist],
  );

  const reset = useCallback(() => {
    ref.current = emptyState();
    sceneShownAt.current.clear();
    persist();
  }, [persist]);

  return {
    state: ref.current,
    markSceneShown,
    recordChoice,
    recordAttraction,
    recordLinger,
    reset,
  };
}
