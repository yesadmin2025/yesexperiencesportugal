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

export function derivePrediction(
  confidence: ConfidenceMap,
  behavior: BehaviorState,
): Prediction {
  const pacingClass = classifyPacing(behavior);
  const intensity = intensityPreference(behavior);
  const sceneWeighting =
    behavior.attractionEvents.length + behavior.skipEvents.length > 0
      ? moodAffinity(behavior)
      : { ...DEFAULT_WEIGHTS };

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

  const shouldCollapseAhead =
    tConf >= 0.7 || (pacingClass === "decisive" && behavior.decisionLatency.length >= 3);

  return {
    pacingClass,
    holdScale,
    sceneWeighting,
    intensity,
    tonalRegister,
    revealConfidence,
    shouldCollapseAhead,
  };
}
