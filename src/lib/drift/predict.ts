// Drift predictive layer.
//
// Pure function: confidence map + behavior state → Prediction.
// Drives:
//   · holdMs scaling (pacing)
//   · ChoicePhase option ordering + weak-option hiding (scene weighting)
//   · advance() collapse list (skip future chapters when system is sure)
//   · reveal tonal register (passed to revealJourney)
//   · CTA confidence gate (book vs talk-to-local)
//
// No I/O. Safe everywhere.

import { totalConfidence, type ConfidenceMap } from "@/lib/drift/inference";
import {
  classifyPacing,
  intensityPreference,
  moodAffinity,
  type BehaviorState,
  type Mood,
  type PacingClass,
} from "@/lib/drift/behavior";

export type TonalRegister = "intimate" | "expansive" | "playful" | "ritual";

export interface Prediction {
  pacingClass: PacingClass;
  /** Multiplier applied to chapter.holdMs */
  holdScale: number;
  /** Per-mood weight in [0, 1], used to order/dim ChoicePhase options. */
  sceneWeighting: Record<Mood, number>;
  /** Average intensity preference (1-5). */
  intensity: number;
  /** Final reveal tone hint, sent to revealJourney. */
  tonalRegister: TonalRegister;
  /** 0-1 confidence the system has built a coherent picture. */
  revealConfidence: number;
  /** When true, the engine should collapse low-value next chapters. */
  shouldCollapseAhead: boolean;
  /** Optional chapters the engine can skip because confidence is already high. */
  collapseNextChapters: Array<"energy" | "style" | "social">;
  /** Ranked optional dimensions that still need a direct interaction. */
  nextBestDimensions: Array<"energy" | "style" | "social">;
}

const DEFAULT_WEIGHTS: Record<Mood, number> = {
  arrival: 0.5,
  intimacy: 0.5,
  celebration: 0.5,
  slowness: 0.5,
  discovery: 0.5,
  temptation: 0.5,
  ritual: 0.5,
};

const CONFIDENCE_MOOD_PULL: Record<string, Partial<Record<Mood, number>>> = {
  "style:coast": { arrival: 0.12, discovery: 0.18, celebration: 0.06 },
  "style:heritage": { slowness: 0.18, discovery: 0.1, ritual: 0.08 },
  "style:wine": { ritual: 0.2, slowness: 0.12, intimacy: 0.08 },
  "style:table": { intimacy: 0.18, ritual: 0.12, celebration: 0.08 },
  "energy:slow": { slowness: 0.18, intimacy: 0.1, ritual: 0.06 },
  "energy:vivid": { celebration: 0.18, discovery: 0.12, arrival: 0.06 },
  "social:intimate": { intimacy: 0.2, slowness: 0.08, ritual: 0.06 },
  "social:shared": { celebration: 0.16, intimacy: 0.08, discovery: 0.06 },
  "companions:solo": { slowness: 0.12, discovery: 0.08 },
  "companions:couple": { intimacy: 0.16, ritual: 0.08 },
  "companions:family": { discovery: 0.12, celebration: 0.08 },
  "companions:group": { celebration: 0.14, discovery: 0.08 },
};

function confidenceMoodWeights(confidence: ConfidenceMap): Record<Mood, number> {
  const weights = { ...DEFAULT_WEIGHTS };
  for (const [key, conf] of Object.entries(confidence)) {
    const pulls = CONFIDENCE_MOOD_PULL[key];
    if (!pulls || conf <= 0) continue;
    for (const [mood, amount] of Object.entries(pulls) as [Mood, number][]) {
      weights[mood] = Math.min(1, weights[mood] + amount * Math.min(1, conf));
    }
  }
  return weights;
}

function blendMoodWeights(a: Record<Mood, number>, b: Record<Mood, number>, behaviorStrength: number): Record<Mood, number> {
  const behaviorShare = Math.min(0.72, behaviorStrength);
  const confidenceShare = 1 - behaviorShare;
  return (Object.keys(DEFAULT_WEIGHTS) as Mood[]).reduce<Record<Mood, number>>((out, mood) => {
    out[mood] = Math.max(0, Math.min(1, a[mood] * confidenceShare + b[mood] * behaviorShare));
    return out;
  }, { ...DEFAULT_WEIGHTS });
}

export function derivePrediction(
  confidence: ConfidenceMap,
  behavior: BehaviorState,
): Prediction {
  const pacingClass = classifyPacing(behavior);
  const intensity = intensityPreference(behavior);
  const confidenceWeights = confidenceMoodWeights(confidence);
  const behaviorWeights = moodAffinity(behavior);
  const behaviorStrength = Math.min(
    0.72,
    behavior.attractionEvents.length * 0.18 + behavior.skipEvents.length * 0.06,
  );
  const sceneWeighting = blendMoodWeights(confidenceWeights, behaviorWeights, behaviorStrength);

  const holdScale =
    pacingClass === "decisive" ? 0.55 : pacingClass === "exploratory" ? 1.35 : 1;

  // Tonal register: combine top mood affinity with intensity.
  const topMood = (Object.entries(sceneWeighting) as [Mood, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  let tonalRegister: TonalRegister = "expansive";
  if (topMood === "intimacy" || topMood === "slowness") tonalRegister = "intimate";
  else if (topMood === "celebration" || topMood === "temptation")
    tonalRegister = intensity >= 3.5 ? "playful" : "expansive";
  else if (topMood === "ritual") tonalRegister = "ritual";
  else if (topMood === "discovery" || topMood === "arrival") tonalRegister = "expansive";

  const tConf = totalConfidence(confidence);
  // Reveal confidence blends inferred confidence with interaction richness.
  const interactionRichness = Math.min(
    1,
    (behavior.attractionEvents.length + behavior.decisionLatency.length) / 8,
  );
  const revealConfidence = Math.max(0, Math.min(1, tConf * 0.7 + interactionRichness * 0.3));

  const optionalDims = ["energy", "style", "social"] as const;
  const collapseNextChapters = optionalDims.filter((dim) => topConfidence(dim) >= 0.78);
  const shouldCollapseAhead =
    tConf >= 0.7 || (pacingClass === "decisive" && behavior.decisionLatency.length >= 3);
  const nextBestDimensions = [...optionalDims].sort((a, b) => dimensionNeed(b) - dimensionNeed(a));

  return {
    pacingClass,
    holdScale,
    sceneWeighting,
    intensity,
    tonalRegister,
    revealConfidence,
    shouldCollapseAhead,
    collapseNextChapters,
    nextBestDimensions,
  };

  function topConfidence(dim: (typeof optionalDims)[number]): number {
    const prefix = `${dim}:`;
    return Math.max(0, ...Object.entries(confidence)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value));
  }

  function dimensionNeed(dim: (typeof optionalDims)[number]): number {
    const top = topConfidence(dim);
    const moodPull =
      dim === "energy"
        ? Math.max(sceneWeighting.celebration, sceneWeighting.discovery, sceneWeighting.slowness)
        : dim === "style"
          ? Math.max(sceneWeighting.discovery, sceneWeighting.ritual, sceneWeighting.arrival)
          : Math.max(sceneWeighting.intimacy, sceneWeighting.celebration);
    return (1 - top) * 0.7 + moodPull * 0.3;
  }
}
