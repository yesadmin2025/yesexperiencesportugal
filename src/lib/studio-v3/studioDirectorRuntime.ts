/**
 * BUILD 2 — Pass 4 correction. PURE LIVE DIRECTOR RUNTIME.
 *
 * ONE projection that derives, in order:
 *   answers -> full semantic profile -> projection -> director context ->
 *   director decision.
 *
 * This is the SOLE live authority for whether a question exists, which
 * question it is, and the exact ordered options offered. The legacy
 * `resolveAdaptiveQuestion()` remains for presentation lookups and
 * diagnostics only.
 *
 * LOW-LEVEL: it must NOT import curation, capabilityMatrix, public refinement
 * paths, the reachability simulator or `adaptiveQuestions`.
 *
 * Pure: no I/O, no wall clock, no randomness, no state writes.
 */

import type {
  DestinationIntent,
  Feeling,
  Interest,
  Rhythm,
} from "@/components/studio-v3/types";
import type { TimingConflict } from "@/lib/studio-v3/timeDomain";
import {
  deriveDirectorAnswerProjection,
  type DirectorAnswerProjection,
} from "@/lib/studio-v3/directorAnswerProjection";
import { freeTextExcludedOptionIdsFromHistory } from "@/lib/studio-v3/freeTextAnswer";
import { buildDirectorContext, type DirectorContext } from "@/lib/studio-v3/directorContext";
import type { QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";
import {
  deriveSemanticProfile,
  type StudioSemanticProfile,
} from "@/lib/studio-v3/semanticProfile";
import {
  projectSemanticProfile,
  type SemanticProfileProjection,
} from "@/lib/studio-v3/semanticProfileProjection";
import {
  decideStudioQuestion,
  type StudioQuestionDecision,
} from "@/lib/studio-v3/studioQuestionDirector";

/** Minimal structural input. Deliberately NOT the full Studio state object. */
export type StudioDirectorRuntimeInput = {
  feeling: Feeling | null;
  interests: readonly Interest[];
  rhythm?: Rhythm | null;
  destinationIntent?: DestinationIntent | null;
  questionHistory?: readonly QuestionAnswerEvent[];
  /**
   * BUILD-1 read model ONLY, and only when it is synchronously and truthfully
   * available. A timing conflict is never invented here.
   */
  timingConflict?: TimingConflict | null;
};

export type StudioDirectorRuntime = {
  answers: DirectorAnswerProjection;
  profile: StudioSemanticProfile;
  projection: SemanticProfileProjection;
  context: DirectorContext;
  decision: StudioQuestionDecision;
};

export function deriveStudioDirectorRuntime(
  input: StudioDirectorRuntimeInput,
): StudioDirectorRuntime {
  const history = input.questionHistory ?? [];
  const answers = deriveDirectorAnswerProjection(history);
  const profile = deriveSemanticProfile({
    feeling: input.feeling,
    interests: input.interests,
    rhythm: input.rhythm ?? null,
    destinationIntent: input.destinationIntent ?? null,
    history,
  });
  const projection = projectSemanticProfile(profile);
  const context = buildDirectorContext({
    destinationIntent: input.destinationIntent ?? null,
    projection,
    answers,
    timingConflict: input.timingConflict ?? null,
  });
  // Explicit free-text exclusions are removed from the offered set before a
  // question exists. An option the traveller ruled out is never offered back.
  const decision = decideStudioQuestion({
    context,
    profile,
    history,
    excludedOptionIds: freeTextExcludedOptionIdsFromHistory(history),
  });

  return { answers, profile, projection, context, decision };
}

/** Convenience: does the live Director still have a material question? */
export function studioDirectorHasQuestion(input: StudioDirectorRuntimeInput): boolean {
  return deriveStudioDirectorRuntime(input).decision.shouldAsk;
}
