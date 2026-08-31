/**
 * BUILD 2 — Pass 1. Inert question-history primitives.
 *
 * This is the ONE future answer store for every question the Studio asks
 * (director questions, legacy refinement, free text). Nothing here is added
 * to `StudioV3State` in Pass 1 — no persisted state field is introduced.
 *
 * Hard rules:
 *   - Pure: no wall clock, no randomness, no UUID generation, no I/O.
 *   - `eventId` / `createdAt` are opaque metadata, excluded from every
 *     logical identity, fingerprint and resolution helper.
 *   - No duplicated discovery mapping: `adaptiveQuestions.ts` is not imported.
 */

import type { AdaptiveRefinementId } from "@/components/studio-v3/types";
import type { SemanticSourceEvent } from "@/lib/studio-v3/semanticSourceEvents";
import { semanticEventFingerprint } from "@/lib/studio-v3/semanticSourceEvents";

export type QuestionAnswerSource = "director" | "legacy-refinement" | "free-text";

export type QuestionAnswerEvent = {
  /** Stable identity of the question that was asked. */
  questionKey: string;
  /** Stable identity of the uncertainty the question was resolving. */
  uncertaintyKey: string;
  /** Semantic keys the question targeted, in stable order. */
  targetKeys: readonly string[];
  /** Option ids exactly as offered, in the order offered. */
  offeredOptionIds: readonly string[];
  /** Option id(s) the traveller selected. Empty = skipped. */
  selectedOptionIds: readonly string[];
  /** Semantic effect of the answer, supplied by the caller. */
  semanticEffects: readonly SemanticSourceEvent[];
  /** Dependency fingerprint of the inputs the question was derived from. */
  dependencyFingerprint: string;
  source: QuestionAnswerSource;
  /**
   * PASS 4 — HONEST LEGACY COMPATIBILITY PAYLOAD.
   *
   * Valid ONLY for `source: "legacy-refinement"`. It carries the proven old
   * `AdaptiveRefinementId` meaning of a draft saved before the canonical
   * store existed, WITHOUT fabricating a historical offered set. It is
   * semantic, so it participates in identity and fingerprints.
   */
  legacyCompatibilityRefinementId?: AdaptiveRefinementId;
  /** Opaque, non-semantic. Excluded from every helper below. */
  eventId?: string;
  /** Opaque, non-semantic. Excluded from every helper below. */
  createdAt?: string;
};

/** Logical identity of a history event — provably metadata-free. */
export type QuestionAnswerIdentity = {
  questionKey: string;
  uncertaintyKey: string;
  targetKeys: readonly string[];
  offeredOptionIds: readonly string[];
  selectedOptionIds: readonly string[];
  semanticEffects: readonly string[];
  dependencyFingerprint: string;
  source: QuestionAnswerSource;
  legacyCompatibilityRefinementId: AdaptiveRefinementId | null;
};

export function questionAnswerIdentity(event: QuestionAnswerEvent): QuestionAnswerIdentity {
  return {
    questionKey: event.questionKey,
    uncertaintyKey: event.uncertaintyKey,
    targetKeys: [...event.targetKeys],
    offeredOptionIds: [...event.offeredOptionIds],
    selectedOptionIds: [...event.selectedOptionIds],
    semanticEffects: event.semanticEffects.map(semanticEventFingerprint),
    dependencyFingerprint: event.dependencyFingerprint,
    source: event.source,
    legacyCompatibilityRefinementId:
      event.source === "legacy-refinement"
        ? (event.legacyCompatibilityRefinementId ?? null)
        : null,
  };
}


/**
 * Canonical, collision-safe logical fingerprint. Structured JSON over the
 * explicitly ordered, metadata-free identity: delimiter characters inside
 * caller-supplied strings cannot forge another identity. Ordered option ids
 * are preserved as ordered arrays.
 */
export function questionAnswerFingerprint(event: QuestionAnswerEvent): string {
  const id = questionAnswerIdentity(event);
  return JSON.stringify([
    id.questionKey,
    id.uncertaintyKey,
    id.targetKeys,
    id.offeredOptionIds,
    id.selectedOptionIds,
    id.semanticEffects,
    id.dependencyFingerprint,
    id.source,
    id.legacyCompatibilityRefinementId,
  ]);
}

/**
 * PASS 4 — STRICT OFFERED-OPTION GATE.
 *
 * A selected option id is authoritative ONLY when it was actually present in
 * the offered set of that exact question event. Being a valid id somewhere in
 * the catalogue is NOT enough: an option that was never offered in this
 * question can never have been chosen by the traveller, so it fails closed.
 * There is NO exception: an old draft whose historical question is unknown
 * carries its meaning in `legacyCompatibilityRefinementId` instead, never in
 * a fabricated offered set. Catalogue validity is enforced one layer up, by
 * `directorAnswerProjection` (this module stays catalogue-free).
 */
export function authoritativeSelectedOptionIds(event: QuestionAnswerEvent): string[] {
  const offered = new Set(event.offeredOptionIds);
  return event.selectedOptionIds.filter((id) => offered.has(id));
}

/** The proven legacy meaning of an old draft, when the event carries one. */
export function legacyCompatibilityRefinementOf(
  event: QuestionAnswerEvent,
): AdaptiveRefinementId | null {
  return event.source === "legacy-refinement"
    ? (event.legacyCompatibilityRefinementId ?? null)
    : null;
}

/**
 * Real semantic progress: the traveller either selected something that was
 * genuinely offered, carried a semantic effect (e.g. free text with no option
 * id), or the event is an honest legacy compatibility record of a real past
 * answer. A pure skip — and an unoffered selection — is NOT progress, so the
 * underlying uncertainty stays open.
 */
export function hasQuestionSemanticProgress(event: QuestionAnswerEvent): boolean {
  return (
    authoritativeSelectedOptionIds(event).length > 0 ||
    event.semanticEffects.length > 0 ||
    legacyCompatibilityRefinementOf(event) !== null
  );
}



/** Immutable append. Never mutates the input array. */
export function appendQuestionAnswer(
  history: readonly QuestionAnswerEvent[],
  event: QuestionAnswerEvent,
): QuestionAnswerEvent[] {
  return [...history, event];
}

/** True when this exact question key was answered with real semantic progress. */
export function isQuestionAnswered(
  history: readonly QuestionAnswerEvent[],
  questionKey: string,
): boolean {
  return history.some(
    (event) => event.questionKey === questionKey && hasQuestionSemanticProgress(event),
  );
}

/** True when the uncertainty was resolved under the same dependency fingerprint. */
export function isUncertaintyResolved(
  history: readonly QuestionAnswerEvent[],
  uncertaintyKey: string,
  dependencyFingerprint: string,
): boolean {
  return history.some(
    (event) =>
      event.uncertaintyKey === uncertaintyKey &&
      event.dependencyFingerprint === dependencyFingerprint &&
      hasQuestionSemanticProgress(event),
  );
}

export function findAnswer(
  history: readonly QuestionAnswerEvent[],
  questionKey: string,
): QuestionAnswerEvent | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].questionKey === questionKey) return history[i];
  }
  return null;
}

/**
 * PURE legacy compatibility helper.
 *
 * Turns the single current `state.refinement` answer into AT MOST ONE
 * compatibility history event. The semantic effect must be supplied by the
 * caller — this module never duplicates `REFINEMENT_TO_SIGNAL` or any
 * discovery mapping. A null refinement yields no event.
 */
export function legacyRefinementToHistoryEvent(
  refinement: AdaptiveRefinementId | null | undefined,
  options: {
    questionKey?: string;
    uncertaintyKey?: string;
    targetKeys?: readonly string[];
    offeredOptionIds?: readonly string[];
    semanticEffects?: readonly SemanticSourceEvent[];
    dependencyFingerprint?: string;
  } = {},
): QuestionAnswerEvent | null {
  if (!refinement) return null;
  return {
    questionKey: options.questionKey ?? "legacy:refinement",
    uncertaintyKey: options.uncertaintyKey ?? "legacy:refinement",
    targetKeys: options.targetKeys ? [...options.targetKeys] : [],
    // Honest default: when the caller does not know the historical offered
    // set, we record NOTHING as offered. The selected answer is never proof of
    // what was offered — sequential certification depends on this.
    offeredOptionIds: options.offeredOptionIds ? [...options.offeredOptionIds] : [],
    // Honest: nothing proves this option was OFFERED, so it is not recorded as
    // a live selection. Its proven meaning lives in the compatibility payload.
    selectedOptionIds: [],
    legacyCompatibilityRefinementId: refinement,
    semanticEffects: options.semanticEffects ? [...options.semanticEffects] : [],
    dependencyFingerprint: options.dependencyFingerprint ?? "legacy",
    source: "legacy-refinement",

  };
}
