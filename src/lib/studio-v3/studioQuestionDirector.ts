/**
 * BUILD 2 — Pass 2. Deterministic, NON-LIVE Adaptive Question Director.
 *
 * Pure over PREBUILT inputs (`DirectorContext` + `StudioSemanticProfile` +
 * question history). It never resolves its own context, never imports
 * capability / reachability / `adaptiveQuestions`, never writes state or
 * performs I/O, and never invents an option id.
 *
 * TRUE 0→N: there is no numeric product cap anywhere in this module. The
 * director stops when there is no material uncertainty left, not after a
 * fixed number of questions.
 */

import type { DirectorChoice } from "@/lib/studio-v3/questionOptionCatalog";
import { timingConflictIdentity, type DirectorContext } from "@/lib/studio-v3/directorContext";
import {
  detectMaterialUncertainties,
  uncertaintyOptionsAreCatalogued,
  type MaterialUncertainty,
} from "@/lib/studio-v3/questionUncertainty";
import type { StudioSemanticProfile } from "@/lib/studio-v3/semanticProfile";
import type { QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";
import { hasQuestionSemanticProgress } from "@/lib/studio-v3/questionHistory";

export type StudioQuestionDecision = {
  shouldAsk: boolean;
  questionKey?: string;
  uncertaintyKey?: string;
  /** Machine reason. Never traveller-facing copy. */
  reason: string;
  /** Concrete ordered choices. Each carries a collision-safe `choiceKey`. */
  options?: DirectorChoice[];
  /** Ordered choice keys — the identity used by history and cycle checks. */
  choiceKeys?: string[];
  dependencyFingerprint?: string;
  /** Identity of the whole decision, including ORDERED option ids. */
  decisionFingerprint?: string;
};

export type DecideStudioQuestionInput = {
  context: DirectorContext;
  profile: StudioSemanticProfile;
  history?: readonly QuestionAnswerEvent[];
  /**
   * TURBO 1 — options the traveller EXPLICITLY ruled out (today: deterministic
   * free text). They are removed from the offered set before the question is
   * emitted, so an explicit "I hate boats" can never be offered back. A
   * question left with fewer than two real choices is not asked at all.
   */
  excludedOptionIds?: readonly string[];
};


/**
 * Canonical structured dependency fingerprint, SCOPED to the uncertainty.
 *
 * Only the inputs this uncertainty actually depends on participate, so an
 * unrelated upstream change does not invalidate an unrelated resolved answer.
 * `createdAt` / `eventId` are never read here.
 */
export function uncertaintyDependencyFingerprint(
  context: DirectorContext,
  profile: StudioSemanticProfile,
  uncertainty: MaterialUncertainty,
  /**
   * The ordered option set the traveller would ACTUALLY be offered, after
   * explicit exclusions. Changing an exclusion materially changes the fork,
   * so a previously resolved answer over a different option set can never
   * keep suppressing it. Defaults to the unfiltered catalogue set.
   */
  allowedChoiceKeys?: readonly string[],
): string {
  const relevantSignals = uncertainty.dependencySemanticKeys.map((key) => {
    const signal = profile.semanticSignals.find(
      (candidate) =>
        candidate.key === key && candidate.polarity === "positive" && !candidate.defeatedByExclusion,
    );
    return signal
      ? [signal.key, signal.authority, signal.confidence, signal.declaredPriority === true]
      : [key, null, null, false];
  });

  return JSON.stringify([
    uncertainty.uncertaintyKey,
    uncertainty.kind,
    // Concrete choice identity: two swap instances are never interchangeable.
    uncertainty.choices.map((choice) => choice.choiceKey),
    allowedChoiceKeys ? [...allowedChoiceKeys] : null,
    [...uncertainty.dependencySignals],
    relevantSignals,
    uncertainty.kind === "time-tradeoff" ? timingConflictIdentity(context.timingConflict) : null,
    // Candidate space matters only through the signals the fork consumes.
    uncertainty.dependencySignals.filter((signal) =>
      context.allowedDiscoverySignals.includes(signal),
    ),
  ]);
}

/** Canonical decision identity. Reversing option order changes this value. */
export function questionDecisionFingerprint(input: {
  questionKey: string;
  optionIds: readonly string[];
  dependencyFingerprint: string;
}): string {
  return JSON.stringify([input.questionKey, [...input.optionIds], input.dependencyFingerprint]);
}

function resolvedWithProgress(
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

function sameOrderedOptions(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * CYCLE PROTECTION. The exact same question (key + ORDERED options + scoped
 * dependency fingerprint) that was already attempted and produced NO semantic
 * progress is not immediately re-emitted. It is not a counter: the same
 * question becomes askable again as soon as any of its dependencies change.
 */
function attemptedWithoutProgress(
  history: readonly QuestionAnswerEvent[],
  questionKey: string,
  optionIds: readonly string[],
  dependencyFingerprint: string,
): boolean {
  return history.some(
    (event) =>
      event.questionKey === questionKey &&
      event.dependencyFingerprint === dependencyFingerprint &&
      sameOrderedOptions(event.offeredOptionIds, optionIds) &&
      !hasQuestionSemanticProgress(event),
  );
}

export function decideStudioQuestion(
  input: DecideStudioQuestionInput,
): StudioQuestionDecision {
  const history = input.history ?? [];
  const excluded = new Set(input.excludedOptionIds ?? []);
  const uncertainties = detectMaterialUncertainties(input.context, input.profile);

  for (const uncertainty of uncertainties) {
    // Fail closed: an uncatalogued option can never be offered.
    if (!uncertaintyOptionsAreCatalogued(uncertainty)) continue;

    // Explicit traveller exclusions are removed BEFORE identity is computed,
    // so the offered set and its fingerprints stay honest.
    const allowed: DirectorChoice[] = uncertainty.choices.filter(
      (choice) => !excluded.has(choice.choiceKey),
    );
    // Exclusions may only remove; they never change what a question WITHOUT
    // exclusions would have been. A question emptied out by an explicit "not
    // this" is dropped rather than offered back with a single hollow choice.
    const removedByExclusion = allowed.length !== uncertainty.choices.length;
    if (allowed.length === 0 || (removedByExclusion && allowed.length < 2)) continue;


    const dependencyFingerprint = uncertaintyDependencyFingerprint(
      input.context,
      input.profile,
      uncertainty,
      allowed.map((choice) => choice.choiceKey),
    );

    if (resolvedWithProgress(history, uncertainty.uncertaintyKey, dependencyFingerprint)) continue;
    if (
      attemptedWithoutProgress(
        history,
        uncertainty.questionKey,
        allowed.map((choice) => choice.choiceKey),
        dependencyFingerprint,
      )
    ) {
      continue;
    }

    const options: DirectorChoice[] = [...allowed];

    const choiceKeys = options.map((choice) => choice.choiceKey);

    return {
      shouldAsk: true,
      questionKey: uncertainty.questionKey,
      uncertaintyKey: uncertainty.uncertaintyKey,
      reason: uncertainty.reason,
      options,
      choiceKeys,
      dependencyFingerprint,
      decisionFingerprint: questionDecisionFingerprint({
        questionKey: uncertainty.questionKey,
        optionIds: choiceKeys,
        dependencyFingerprint,
      }),
    };
  }

  return { shouldAsk: false, reason: "no-material-uncertainty" };
}
