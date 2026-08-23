/**
 * Let YES decide — first-class "decide for me" signal.
 *
 * A traveller tapping "Let YES decide" is NOT missing data. It is an
 * explicit act of trust in the curator, and the Studio must answer it with
 * a real, coherent choice derived from what the traveller already told us.
 *
 * Hard rules (mirrors the project no-invention rule):
 *   - only ids that already exist in the Studio taxonomy are returned
 *   - inference reads ONLY real inputs already in state
 *   - when there is not enough signal, a neutral, explainable operational
 *     default is used (never a random or "surprising" pick)
 *   - deterministic: same state in, same answer out, always
 */

import type { Feeling, Interest, Rhythm, StudioV3State } from "./types";

export type DecidedForMeKey = "feeling" | "interests" | "rhythm";

/** Neutral operational defaults — used only when no real signal exists. */
const DEFAULT_FEELING: Feeling = "coastal";
const DEFAULT_RHYTHM: Rhythm = "balanced";
const DEFAULT_INTERESTS: Interest[] = ["coast", "gastronomy"];

/**
 * decideFeeling — infer the mood from interests and company.
 * Falls back to the coastal default (Portugal's most universally loved
 * signature and the widest Signature coverage in the catalogue).
 */
export function decideFeeling(state: StudioV3State): Feeling {
  const i = new Set(state.interests);
  if (i.has("wine") || i.has("gastronomy")) return "wine-food";
  if (i.has("coast")) return "coastal";
  if (i.has("heritage")) return "culture";
  if (i.has("faith")) return "faith";
  if (i.has("hands-on")) return "hands-on";
  if (i.has("local-life")) return "hidden";
  if (i.has("wellness")) return "slow-luxury";
  if (state.companions === "couple" || state.companions === "proposal") return "romance";
  if (state.companions === "corporate") return "slow-luxury";
  return DEFAULT_FEELING;
}

/**
 * decideInterests — infer up to three tastes from the chosen feeling and
 * company. Never returns more than the Studio cap (4) and never an empty
 * list, so curation always receives a usable signal.
 */
export function decideInterests(state: StudioV3State): Interest[] {
  const byFeeling: Partial<Record<Feeling, Interest[]>> = {
    coastal: ["coast", "nature", "gastronomy"],
    "wine-food": ["wine", "gastronomy", "local-life"],
    hidden: ["local-life", "nature", "gastronomy"],
    romance: ["coast", "wine", "photography"],
    culture: ["heritage", "local-life", "gastronomy"],
    adventure: ["nature", "coast", "photography"],
    "slow-luxury": ["wine", "wellness", "gastronomy"],
    faith: ["faith", "heritage", "local-life"],
    "hands-on": ["hands-on", "local-life", "gastronomy"],
  };
  const base = (state.feeling ? byFeeling[state.feeling] : null) ?? DEFAULT_INTERESTS;
  const out = [...base];
  if (state.companions === "family" && !out.includes("nature")) out.push("nature");
  return out.slice(0, 4);
}

/**
 * decideRhythm — infer pacing from company and how much the traveller
 * already asked for. More tastes → fuller day; families and slow moods →
 * gentler day. Neutral default is "balanced".
 */
export function decideRhythm(state: StudioV3State): Rhythm {
  if (state.feeling === "slow-luxury" || state.feeling === "faith") return "slow";
  if (state.companions === "family") return "balanced";
  if (state.interests.length >= 4) return "full";
  if (state.interests.length <= 1 && state.companions === "couple") return "slow";
  return DEFAULT_RHYTHM;
}

/** One short, honest line explaining the decision the curator just made. */
export function decisionWhisper(key: DecidedForMeKey, state: StudioV3State): string {
  const hasSignal =
    state.interests.length > 0 || state.feeling != null || state.companions != null;
  if (!hasSignal) return "We start from our most-loved shape and refine it with you.";
  if (key === "feeling") return "Chosen from what you've already told us.";
  if (key === "interests") return "Shaped around the mood you picked.";
  return "Paced for how your day is taking form.";
}

/** True when this dimension was decided by YES rather than by the guest. */
export function wasDecidedByYes(state: StudioV3State, key: DecidedForMeKey): boolean {
  return (state.decidedForMe ?? []).includes(key);
}
