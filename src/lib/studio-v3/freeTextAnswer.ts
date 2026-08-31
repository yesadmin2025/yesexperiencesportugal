/**
 * TURBO 1 — CANONICAL FREE-TEXT ANSWER.
 *
 * One optional traveller note ("Anything this day should know?") becomes
 * EXACTLY ONE `QuestionAnswerEvent` with `source: "free-text"` inside the
 * canonical `questionHistory`. There is no second semantic store, and the
 * raw sentence never leaves the Studio component's local draft state: only
 * closed-vocabulary structured effects are recorded here.
 *
 * Pure: no I/O, no wall clock, no randomness, no AI.
 */

import {
  freeTextExclusionKeys,
  interpretFreeText,
  mergeInterpreterOverlay,
  type FreeTextInterpretation,
} from "@/lib/studio-v3/freeTextInterpreter";
import type { SemanticSourceEvent } from "@/lib/studio-v3/semanticSourceEvents";
import { isDirectorOptionId, type DirectorOptionId } from "@/lib/studio-v3/questionOptionCatalog";
import {
  appendQuestionAnswer,
  type QuestionAnswerEvent,
} from "@/lib/studio-v3/questionHistory";
import { semanticEventFingerprint } from "@/lib/studio-v3/semanticSourceEvents";

export const FREE_TEXT_QUESTION_KEY = "question:free-text";
export const FREE_TEXT_UNCERTAINTY_KEY = "uncertainty:free-text";

/**
 * Dependency identity of a free-text answer. Deliberately derived from the
 * STRUCTURED result only — never from the raw sentence — so no personal text
 * can leak into a fingerprint, analytics payload or cache key.
 */
export function freeTextDependencyFingerprint(interpretation: FreeTextInterpretation): string {
  return JSON.stringify([
    "free-text",
    interpretation.effects.map(semanticEventFingerprint),
    [...interpretation.excludedOptionIds].sort(),
  ]);
}

/** Stable target key for an explicitly ruled-out Director option. */
export function optionExclusionKey(id: DirectorOptionId): string {
  return `option-exclusion:${id}`;
}

/** The one canonical event for a note, or `null` when nothing is representable. */
export function freeTextAnswerEvent(
  raw: string | null | undefined,
  /**
   * OPTIONAL AI overlay. Additive, positive-only and closed-vocabulary — the
   * merge drops anything the deterministic pass already excluded, so an AI
   * reading can never override an explicit traveller negation.
   */
  aiOverlay?: readonly SemanticSourceEvent[],
): QuestionAnswerEvent | null {
  const interpretation = mergeInterpreterOverlay(interpretFreeText(raw), aiOverlay);
  if (interpretation.empty) return null;
  return {
    questionKey: FREE_TEXT_QUESTION_KEY,
    uncertaintyKey: FREE_TEXT_UNCERTAINTY_KEY,
    targetKeys: [
      ...freeTextExclusionKeys(interpretation),
      ...interpretation.excludedOptionIds.map(optionExclusionKey),
    ],
    // Free text was never an offered-option question.
    offeredOptionIds: [],
    selectedOptionIds: [],
    semanticEffects: interpretation.effects,
    dependencyFingerprint: freeTextDependencyFingerprint(interpretation),
    source: "free-text",
  };
}

/**
 * REPLACE-OR-REMOVE. Re-editing the note replaces the single free-text event;
 * clearing it removes the event cleanly. Never duplicates, always idempotent
 * for identical input.
 */
export function upsertFreeTextAnswer(
  history: readonly QuestionAnswerEvent[],
  raw: string | null | undefined,
  aiOverlay?: readonly SemanticSourceEvent[],
): QuestionAnswerEvent[] {
  const without = history.filter((event) => event.source !== "free-text");
  const event = freeTextAnswerEvent(raw, aiOverlay);
  return event ? appendQuestionAnswer(without, event) : without;
}

/** The canonical free-text event currently in history, if any. */
export function freeTextEventOf(
  history: readonly QuestionAnswerEvent[],
): QuestionAnswerEvent | null {
  return history.find((event) => event.source === "free-text") ?? null;
}

/**
 * Director options the traveller explicitly ruled out through free text.
 * Recomputed from the note itself, so this stays a pure read of one truth.
 */
export function freeTextExcludedOptionIds(
  raw: string | null | undefined,
): DirectorOptionId[] {
  return interpretFreeText(raw).excludedOptionIds;
}

/**
 * The same exclusions, read back from canonical history alone. The raw note
 * is never persisted, so history is the only durable authority.
 */
export function freeTextExcludedOptionIdsFromHistory(
  history: readonly QuestionAnswerEvent[],
): DirectorOptionId[] {
  const event = freeTextEventOf(history);
  if (!event) return [];
  return event.targetKeys
    .filter((key) => key.startsWith("option-exclusion:"))
    .map((key) => key.slice("option-exclusion:".length))
    .filter(isDirectorOptionId)
    .sort();
}
