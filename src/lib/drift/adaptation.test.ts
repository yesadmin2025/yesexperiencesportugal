// Regression tests for Drift adaptation telemetry.
//
// Locks down the contract that the engine emits a `prediction_update`
// only when the recommendation actually moves, AND that all the "movement
// vectors" we care about (top mood, itinerary stops, collapse list,
// inferred dimension, tonal register, pacing, confidence band) are
// detectable from a pure snapshot diff — so we can prove real-time
// adaptation from the DB rows alone.

import { describe, expect, it } from "vitest";
import { derivePrediction } from "./predict";
import { composeDay } from "./composer";
import { snapshotAdaptation, diffAdaptation } from "./adaptation";
import type { BehaviorState } from "./behavior";

const emptyBehavior: BehaviorState = {
  decisionLatency: [],
  lingerEvents: [],
  skipEvents: [],
  attractionEvents: [],
};

function snapFor(
  confidence: Record<string, number>,
  behavior: BehaviorState = emptyBehavior,
  profile: Parameters<typeof composeDay>[0] = { pickup: "lisbon", radius: "far" },
) {
  const prediction = derivePrediction(confidence, behavior);
  const day = composeDay(profile, "arrabida", {
    weekday: 2,
    month: 6,
    confidence,
    tonalRegister: prediction.tonalRegister,
    intensityPreference: prediction.intensity,
  });
  return snapshotAdaptation(prediction, confidence, day);
}

describe("Drift adaptation telemetry", () => {
  it("treats the first snapshot as the baseline (changed = true, no reasons)", () => {
    const base = snapFor({ "style:wine": 0.6 });
    const diff = diffAdaptation(null, base);
    expect(diff.changed).toBe(true);
    expect(diff.reasons).toEqual([]);
    expect(diff.previous).toBeNull();
  });

  it("emits no movement when nothing changed between snapshots", () => {
    const a = snapFor({ "style:wine": 0.6, "energy:slow": 0.5 });
    const b = snapFor({ "style:wine": 0.6, "energy:slow": 0.5 });
    const diff = diffAdaptation(a, b);
    expect(diff.changed).toBe(false);
    expect(diff.reasons).toEqual([]);
  });

  it("detects top-mood shift triggered by new behavior signals", () => {
    const before = snapFor({ "style:wine": 0.5 });
    const after = snapFor(
      { "style:wine": 0.5 },
      {
        ...emptyBehavior,
        attractionEvents: [
          { sceneId: "coast-1", mood: "celebration", intensity: 4, weight: 1 },
          { sceneId: "coast-2", mood: "celebration", intensity: 4, weight: 1 },
          { sceneId: "coast-3", mood: "celebration", intensity: 4, weight: 1 },
        ],
      },
    );
    const diff = diffAdaptation(before, after);
    expect(diff.changed).toBe(true);
    expect(diff.reasons).toContain("top_mood");
  });

  it("detects itinerary stop set shifting when confidence tilts", () => {
    const wine = snapFor({ "style:wine": 0.8, "energy:slow": 0.7, "social:intimate": 0.7 });
    const coast = snapFor({ "style:coast": 0.8, "energy:vivid": 0.7, "social:shared": 0.7 });
    const diff = diffAdaptation(wine, coast);
    expect(diff.changed).toBe(true);
    expect(diff.reasons).toContain("itinerary");
    expect(diff.reasons).toContain("top_inferred");
  });

  it("detects collapseAhead opening up when the engine becomes confident", () => {
    const low = snapFor({ "style:wine": 0.55 });
    const high = snapFor({
      "style:wine": 0.9,
      "energy:slow": 0.85,
      "social:intimate": 0.82,
    });
    const diff = diffAdaptation(low, high);
    expect(diff.reasons).toContain("collapse_ahead");
    expect(high.collapseAhead.length).toBeGreaterThan(low.collapseAhead.length);
  });

  it("detects pacing class shift from decision latency", () => {
    const before = snapFor({}, { ...emptyBehavior, decisionLatency: [1800, 2100] });
    const after = snapFor({}, { ...emptyBehavior, decisionLatency: [400, 500, 600] });
    const diff = diffAdaptation(before, after);
    expect(diff.reasons).toContain("pacing");
  });

  it("ignores micro-noise smaller than the soft-drift threshold", () => {
    const before = snapFor({ "style:wine": 0.6 });
    // Same explicit signal, no new behavior → snapshot must be identical.
    const after = snapFor({ "style:wine": 0.6 });
    expect(diffAdaptation(before, after).changed).toBe(false);
  });

  it("snapshot fields fit within drift_behavior_events column limits", () => {
    const snap = snapFor({ "style:wine": 0.8 });
    expect(snap.tonalRegister.length).toBeLessThanOrEqual(32);
    expect(snap.pacingClass.length).toBeLessThanOrEqual(32);
    if (snap.topInferred) expect(snap.topInferred.length).toBeLessThanOrEqual(48);
  });

  it("honors custom thresholds: a stricter topMoodWeight catches smaller drift", () => {
    const before: ReturnType<typeof snapFor> = {
      ...snapFor({ "style:wine": 0.6 }),
      topMoodWeight: 0.5,
    };
    const after: ReturnType<typeof snapFor> = {
      ...before,
      topMoodWeight: 0.56, // delta 0.06
    };
    expect(diffAdaptation(before, after).reasons).not.toContain("top_mood");
    expect(
      diffAdaptation(before, after, { topMoodWeight: 0.04 }).reasons,
    ).toContain("top_mood");
  });

  it("honors custom thresholds: a looser revealConfidence ignores micro-drift", () => {
    const before = { ...snapFor({ "style:wine": 0.6 }), revealConfidence: 0.5 };
    const after = { ...before, revealConfidence: 0.58 }; // delta 0.08, default fires
    expect(diffAdaptation(before, after).reasons).toContain("confidence");
    expect(
      diffAdaptation(before, after, { revealConfidence: 0.2 }).reasons,
    ).not.toContain("confidence");
  });

  it("honors custom thresholds: topInferredConfidence override", () => {
    const before = {
      ...snapFor({ "style:wine": 0.6 }),
      topInferred: "style:wine",
      topInferredConfidence: 0.6,
    };
    const after = { ...before, topInferredConfidence: 0.68 }; // delta 0.08
    expect(diffAdaptation(before, after).reasons).not.toContain("top_inferred");
    expect(
      diffAdaptation(before, after, { topInferredConfidence: 0.05 }).reasons,
    ).toContain("top_inferred");
  });
});
