import type { StudioV3State } from "./types";

/**
 * Semantic facts the traveller has already told Studio.
 *
 * This layer is deliberately deterministic and product-blind: it remembers
 * meaning across Feeling / Interests / Rhythm so later questions can add a new
 * dimension instead of asking the same thing again with different copy.
 */
export type StudioSemanticKey =
  | "theme.faith"
  | "activity.hands-on"
  | "theme.wine"
  | "theme.coast"
  | "interest.local-life"
  | "intent.photography"
  | "pace.rhythm";

type SemanticState = Pick<
  StudioV3State,
  "feeling" | "interests" | "rhythm"
>;

export interface StudioSemanticMemory {
  known: ReadonlySet<StudioSemanticKey>;
  summarySignals: readonly string[];
}

function addUnique(target: string[], value: string | null | undefined) {
  if (!value || target.includes(value)) return;
  target.push(value);
}

/** Build the known semantic facts from explicit, safe Studio choices only. */
export function deriveStudioSemanticMemory(
  state: SemanticState,
): StudioSemanticMemory {
  const known = new Set<StudioSemanticKey>();

  if (state.feeling === "faith" || state.interests.includes("faith")) {
    known.add("theme.faith");
  }

  if (state.feeling === "hands-on" || state.interests.includes("hands-on")) {
    known.add("activity.hands-on");
  }

  if (state.feeling === "wine-food" || state.interests.includes("wine")) {
    known.add("theme.wine");
  }

  if (state.feeling === "coastal" || state.interests.includes("coast")) {
    known.add("theme.coast");
  }

  if (state.feeling === "hidden" || state.interests.includes("local-life")) {
    known.add("interest.local-life");
  }

  if (state.interests.includes("photography")) {
    known.add("intent.photography");
  }

  if (state.rhythm) {
    known.add("pace.rhythm");
  }

  const summarySignals: string[] = [];

  // Lead with explicit experiential themes rather than generic personality
  // labels. Maximum three signals keeps the acknowledgement quiet and useful.
  if (known.has("theme.coast")) addUnique(summarySignals, "coast first");
  if (known.has("theme.faith")) addUnique(summarySignals, "a reflective thread");
  if (known.has("activity.hands-on")) addUnique(summarySignals, "something made by hand");
  if (known.has("theme.wine")) addUnique(summarySignals, "wine");
  if (known.has("interest.local-life")) addUnique(summarySignals, "local life");
  if (known.has("intent.photography")) addUnique(summarySignals, "photography");

  if (summarySignals.length < 3) {
    if (state.interests.includes("gastronomy")) addUnique(summarySignals, "local food");
    if (state.interests.includes("nature")) addUnique(summarySignals, "nature");
    if (state.interests.includes("heritage")) addUnique(summarySignals, "heritage");
    if (state.interests.includes("wellness")) addUnique(summarySignals, "wellness");
  }

  if (summarySignals.length < 3) {
    const rhythmLabel =
      state.rhythm === "slow"
        ? "slow rhythm"
        : state.rhythm === "balanced"
          ? "balanced rhythm"
          : state.rhythm === "full"
            ? "a fuller day"
            : state.rhythm === "immersive"
              ? "immersive rhythm"
              : null;
    addUnique(summarySignals, rhythmLabel);
  }

  return {
    known,
    summarySignals: summarySignals.slice(0, 3),
  };
}

export function hasKnownSemantic(
  state: SemanticState,
  key: StudioSemanticKey,
): boolean {
  return deriveStudioSemanticMemory(state).known.has(key);
}

/**
 * A short positive acknowledgement. Never mentions absences, stops, suppliers,
 * availability or prices because none of those belong to semantic memory.
 */
export function buildUnderstoodSummary(state: SemanticState): string | null {
  const signals = deriveStudioSemanticMemory(state).summarySignals;
  return signals.length > 0 ? signals.join(" · ") : null;
}
