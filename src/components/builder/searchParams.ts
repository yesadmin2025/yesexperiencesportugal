/**
 * Builder URL search-param contract.
 *
 * Step state and selections live in the URL so:
 *  - "Start building" + every mood-to-next click updates the URL
 *  - Browser back/forward replays the flow
 *  - Deep-links (e.g. /builder?step=3&mood=slow) land on the right screen
 *
 * The validator is exported separately so it can be smoke-tested without
 * mounting the full route tree.
 */

import type { Intention, Mood, Pace, Who } from "@/components/builder/types";
import { BUILDER_REGION_KEYS, type BuilderRegionKey } from "@/components/builder/RegionStep";

export type BuilderStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BuilderSearch {
  step?: BuilderStep;
  region?: BuilderRegionKey;
  mood?: Mood;
  who?: Who;
  intention?: Intention;
  pace?: Pace;
  status?: "success";
}

export const BUILDER_STEP_VALUES: BuilderStep[] = [0, 1, 2, 3, 4, 5, 6, 7];
export const BUILDER_MOOD_VALUES: Mood[] = ["slow", "curious", "romantic", "open", "energetic"];
export const BUILDER_WHO_VALUES: Who[] = [
  "couple",
  "family",
  "friends",
  "solo",
  "corporate",
  "group",
];
export const BUILDER_INTENTION_VALUES: Intention[] = [
  "wine",
  "gastronomy",
  "nature",
  "heritage",
  "coast",
  "hidden",
  "wonder",
  "wellness",
];
export const BUILDER_PACE_VALUES: Pace[] = ["relaxed", "balanced", "full"];

function pick<T extends string | number>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export function parseBuilderSearch(search: Record<string, unknown>): BuilderSearch {
  return {
    step: (pick<BuilderStep>(Number(search.step), BUILDER_STEP_VALUES) ?? 0) as BuilderStep,
    region: pick<BuilderRegionKey>(search.region as BuilderRegionKey, BUILDER_REGION_KEYS),
    mood: pick<Mood>(search.mood as Mood, BUILDER_MOOD_VALUES),
    who: pick<Who>(search.who as Who, BUILDER_WHO_VALUES),
    intention: pick<Intention>(search.intention as Intention, BUILDER_INTENTION_VALUES),
    pace: pick<Pace>(search.pace as Pace, BUILDER_PACE_VALUES),
    status: search.status === "success" ? "success" : undefined,
  };
}

/**
 * Pure step-advance reducer used by the builder flow. Keeping this pure makes
 * it trivial to unit-test the "Start building" + mood-to-next guarantees:
 *   - clicking Start building from step 0 returns step 1
 *   - selecting a mood from step 1 returns { step: 2, mood }
 *   - subsequent steps preserve previous selections
 */
export function advanceBuilderSearch(
  current: BuilderSearch,
  patch: Partial<BuilderSearch>,
): BuilderSearch {
  return { ...current, ...patch };
}
