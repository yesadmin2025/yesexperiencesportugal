/**
 * BUILD 2 — Pass 4. LIVE canonical question-history wiring.
 *
 * `QuestionAnswerEvent[]` is now the ONE canonical answer store for the
 * Studio question flow. This module is the only seam between the live Studio
 * UI (which still renders the BUILD-0 fixed adaptive question) and that
 * canonical store:
 *
 *   - `appendLiveRefinementAnswer` records a NEW live answer exactly once,
 *     with the options that were REALLY offered by that question;
 *   - `hydrateLegacyRefinementHistory` turns an OLD saved
 *     `AdaptiveRefinementId` into EXACTLY ONE compatibility event, and only
 *     when that answer is not already represented canonically.
 *
 * No second semantic answer store is created: `state.refinement` survives only
 * as a read-only legacy contract field for old drafts and the Living Atlas
 * decision input.
 *
 * Pure: no I/O, no wall clock, no randomness. Nothing here invents an option,
 * a stop, a supplier, a price or a provenance.
 */

import type { AdaptiveRefinementId } from "@/components/studio-v3/types";
import {
  deriveDirectorAnswerProjection,
} from "@/lib/studio-v3/directorAnswerProjection";
import {
  appendQuestionAnswer,
  legacyRefinementToHistoryEvent,
  type QuestionAnswerEvent,
} from "@/lib/studio-v3/questionHistory";
import {
  discoverySignalForOption,
  isDirectorOptionId,
} from "@/lib/studio-v3/questionOptionCatalog";

/** Stable question family of a legacy refinement id ("coast-wild-beaches" → "coast"). */
export function refinementFamily(refinement: AdaptiveRefinementId): string {
  const index = refinement.indexOf("-");
  return index === -1 ? refinement : refinement.slice(0, index);
}

export function refinementQuestionKey(refinement: AdaptiveRefinementId): string {
  return `question:refinement:${refinementFamily(refinement)}`;
}

export function refinementUncertaintyKey(refinement: AdaptiveRefinementId): string {
  return `uncertainty:refinement:${refinementFamily(refinement)}`;
}

/**
 * Dependency fingerprint for the BUILD-0 fixed refinement question. It is
 * scoped to the question family and the options that were really offered, so
 * an unrelated upstream change never invalidates this answer, while a genuine
 * change to THIS question's offered set does.
 */
export function refinementDependencyFingerprint(
  refinement: AdaptiveRefinementId,
  offeredOptionIds: readonly string[],
): string {
  return JSON.stringify(["refinement", refinementFamily(refinement), [...offeredOptionIds]]);
}

/**
 * Canonical LIVE event for an answer the traveller just gave in the Studio.
 * `offeredOptionIds` MUST be the options the question actually rendered.
 */
export function liveRefinementAnswerEvent(
  refinement: AdaptiveRefinementId,
  offeredOptionIds: readonly string[],
): QuestionAnswerEvent {
  const offered = [...offeredOptionIds];
  return {
    questionKey: refinementQuestionKey(refinement),
    uncertaintyKey: refinementUncertaintyKey(refinement),
    targetKeys: [],
    offeredOptionIds: offered,
    selectedOptionIds: [refinement],
    // A discovery choice carries direction, not a synthetic taste interest.
    semanticEffects: [],
    dependencyFingerprint: refinementDependencyFingerprint(refinement, offered),
    source: "director",
  };
}

/**
 * Append a live answer EXACTLY ONCE per question. Re-answering the same
 * question replaces the previous answer instead of stacking a duplicate, so
 * the canonical store never double-counts one question.
 */
export function appendLiveRefinementAnswer(
  history: readonly QuestionAnswerEvent[],
  refinement: AdaptiveRefinementId,
  offeredOptionIds: readonly string[],
): QuestionAnswerEvent[] {
  const event = liveRefinementAnswerEvent(refinement, offeredOptionIds);
  const withoutSameQuestion = history.filter((e) => e.questionKey !== event.questionKey);
  return appendQuestionAnswer(withoutSameQuestion, event);
}

/** True when this legacy answer is already represented in canonical history. */
export function legacyRefinementAlreadyRepresented(
  history: readonly QuestionAnswerEvent[],
  refinement: AdaptiveRefinementId,
): boolean {
  const projection = deriveDirectorAnswerProjection(history);
  if (projection.selectedDiscoveryChoiceKeys.includes(refinement)) return true;
  const signal = discoverySignalForOption(refinement);
  // Same discovery signal through another door is still the same meaning.
  if (signal && projection.selectedDiscoverySignals.includes(signal)) return true;
  // A signal-less refinement can only be matched by its own id, which the
  // choice-key check above already covers.
  return false;
}

/** Generic legacy compatibility identity. Never a fabricated question family. */
export const LEGACY_COMPATIBILITY_QUESTION_KEY = "legacy:refinement";
export const LEGACY_COMPATIBILITY_UNCERTAINTY_KEY = "legacy:refinement";

/**
 * BACKWARD HYDRATION — EXACTLY ONCE.
 *
 * An old saved `AdaptiveRefinementId` becomes ONE compatibility event with a
 * GENERIC legacy identity, an EMPTY offered set, NO live selection, and the
 * proven old meaning in `legacyCompatibilityRefinementId`. Nothing about the
 * historical question is invented. Idempotent — calling it repeatedly, or
 * after the same meaning already arrived through the canonical live path,
 * changes nothing.
 */
export function hydrateLegacyRefinementHistory(
  history: readonly QuestionAnswerEvent[],
  refinement: AdaptiveRefinementId | null | undefined,
): QuestionAnswerEvent[] {
  const current = [...history];
  if (!refinement || !isDirectorOptionId(refinement)) return current;
  if (legacyRefinementAlreadyRepresented(current, refinement)) return current;

  const event = legacyRefinementToHistoryEvent(refinement, {
    questionKey: LEGACY_COMPATIBILITY_QUESTION_KEY,
    uncertaintyKey: LEGACY_COMPATIBILITY_UNCERTAINTY_KEY,
    offeredOptionIds: [],
    dependencyFingerprint: refinementDependencyFingerprint(refinement, []),
  });
  return event ? appendQuestionAnswer(current, event) : current;
}

/**
 * LIVE DIRECTOR ANSWER — the canonical write path.
 *
 * Every field comes from the Director decision that was actually rendered:
 * the offered set is the decision's exact ordered choice keys, and the
 * selection is the one key the traveller pressed. Re-answering the same
 * question replaces its previous answer instead of stacking a duplicate.
 */
export function appendLiveDirectorAnswer(
  history: readonly QuestionAnswerEvent[],
  answer: {
    questionKey: string;
    uncertaintyKey: string;
    dependencyFingerprint: string;
    offeredOptionIds: readonly string[];
    selectedOptionId: string;
  },
): QuestionAnswerEvent[] {
  const event: QuestionAnswerEvent = {
    questionKey: answer.questionKey,
    uncertaintyKey: answer.uncertaintyKey,
    targetKeys: [],
    offeredOptionIds: [...answer.offeredOptionIds],
    selectedOptionIds: [answer.selectedOptionId],
    // A discovery/timing choice carries direction, not a synthetic interest.
    semanticEffects: [],
    dependencyFingerprint: answer.dependencyFingerprint,
    source: "director",
  };
  const withoutSameQuestion = history.filter((e) => e.questionKey !== event.questionKey);
  return appendQuestionAnswer(withoutSameQuestion, event);
}



/**
 * Hydrate a restored Studio state. Legacy `refinement` is read-only input;
 * the canonical store is `questionHistory`.
 */
export function hydrateStudioQuestionHistory<
  S extends {
    refinement: AdaptiveRefinementId | null;
    questionHistory?: QuestionAnswerEvent[];
  },
>(state: S): S {
  const history = state.questionHistory ?? [];
  const hydrated = hydrateLegacyRefinementHistory(history, state.refinement);
  if (hydrated.length === history.length && state.questionHistory) return state;
  return { ...state, questionHistory: hydrated };
}
