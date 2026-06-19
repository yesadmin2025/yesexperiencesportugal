// Studio V3 — Quality Score (Studio Bible §11 Quality Engine guardrails).
//
// Pure function. Computes a 0-100 score from the current StudioV3State,
// plus a short label + tone (excellent / good / consider). Drives the
// visible QualityScore card and is unit-tested in isolation.
//
// Heuristics (no invention, no AI):
//   - Theme diversity: more distinct interests (capped at 3) → higher score.
//   - Pacing coherence: rhythm + companion fit (relaxed + family = ✓,
//     packed + couple-romantic = warn).
//   - Overload guard: too many interests vs short rhythm window → penalty.
//   - Direction set: feeling + companions + rhythm all present → baseline 70.
//   - Investment alignment: any tier set adds confidence.

import type { StudioV3State } from "@/components/studio-v3/types";

export type QualityTone = "excellent" | "good" | "consider";

export interface QualityScore {
  /** 0-100 integer, rounded to nearest 5 for calm UI. */
  score: number;
  /** Short label, max ~22 chars. */
  label: string;
  /** Tone bucket for color/styling. */
  tone: QualityTone;
  /** Editorial one-liner under the bar — Studio Bible voice, no superlatives. */
  caption: string;
}

const round5 = (n: number) => Math.max(0, Math.min(100, Math.round(n / 5) * 5));

export function computeQualityScore(state: StudioV3State): QualityScore | null {
  // Need a meaningful direction before scoring — otherwise we silently
  // return null (component renders nothing).
  const hasDirection = !!state.feeling && !!state.companions;
  if (!hasDirection) return null;

  let raw = 55; // baseline once feeling + companions exist

  if (state.rhythm) raw += 12;
  if (state.investment) raw += 5;
  if (state.pickup) raw += 4;

  // Theme diversity — bonus for 2–3 interests, penalty for 5+
  const themeCount = state.interests?.length ?? 0;
  if (themeCount === 1) raw += 4;
  else if (themeCount === 2) raw += 9;
  else if (themeCount === 3) raw += 12;
  else if (themeCount === 4) raw += 6;
  else if (themeCount >= 5) raw -= 6; // overload

  // Pacing coherence — slow rhythm + family/group reads premium
  if (state.rhythm === "slow" && state.companions === "family") raw += 4;
  // Full/immersive rhythm + couple-romantic reads contradictory
  if ((state.rhythm === "full" || state.rhythm === "immersive") && state.companions === "couple") raw -= 6;
  // Slow rhythm + many themes = overload warning
  if (state.rhythm === "slow" && themeCount >= 4) raw -= 4;


  const score = round5(raw);

  if (score >= 85) {
    return {
      score,
      label: "Excellent flow",
      tone: "excellent",
      caption:
        "Your selections obey our premium pacing guardrails. The day reads as one coherent private journey.",
    };
  }
  if (score >= 65) {
    return {
      score,
      label: "Good shape",
      tone: "good",
      caption:
        "The journey is taking form. A clearer rhythm or one more theme can elevate the flow.",
    };
  }
  return {
    score,
    label: "Consider easing pace",
    tone: "consider",
    caption:
      "A few more decisions will sharpen the day — pick a rhythm and your top interests.",
  };
}
