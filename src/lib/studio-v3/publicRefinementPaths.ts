/**
 * Public refinement paths — BUILD 0 diagnostics only. PURE AND READ-ONLY.
 *
 * Single authority for the question "can the CURRENT public Studio question
 * logic actually present this refinement option to a traveller?".
 *
 * It never consults `REFINEMENT_TO_SIGNAL` to answer that question: a mapping
 * proves only that an answer WOULD mean something, not that anyone can ever
 * give it.
 *
 * Certification authority = the DETERMINISTIC DEFAULT question, i.e.
 * `resolveAdaptiveQuestion(state, null)`. Production StudioV3 shows at most one
 * adaptive question and the AI advisor that could steer its kind is
 * non-blocking (null / fallback / rate-limited), so only the default question
 * is guaranteed. Advisor-reachable extras are exposed as diagnostics and never
 * certify anything.
 */

import {
  availableAdaptiveQuestionKinds,
  resolveAdaptiveQuestion,
  type AdaptiveQuestionKind,
} from "@/components/studio-v3/adaptiveQuestions";
import {
  INITIAL_STATE,
  type AdaptiveRefinementId,
  type DestinationIntent,
  type Feeling,
  type Interest,
  type StudioV3State,
} from "@/components/studio-v3/types";
import {
  DISCOVERY_SIGNAL_TARGET,
  type LivingAtlasDiscoverySignal,
} from "@/components/studio-v3/livingAtlasDecision";
import type { LivingAtlasSignatureId } from "@/components/studio-v3/livingAtlasTaxonomy";
import { buildDirectorContext } from "@/lib/studio-v3/directorContext";
import { decideStudioQuestion } from "@/lib/studio-v3/studioQuestionDirector";
import { deriveSemanticProfile } from "@/lib/studio-v3/semanticProfile";
import { projectSemanticProfile } from "@/lib/studio-v3/semanticProfileProjection";
import { LEGACY_REFINEMENT_SIGNAL_MIRROR } from "@/lib/studio-v3/questionOptionCatalog";
import { deriveDirectorAnswerProjection } from "@/lib/studio-v3/directorAnswerProjection";
import {
  appendQuestionAnswer,
  type QuestionAnswerEvent,
} from "@/lib/studio-v3/questionHistory";

/* ------------------------------------------------------------------ */
/* Bounded, plausible base-state matrix (shared authority)              */
/* ------------------------------------------------------------------ */

export const SIMULATION_FEELINGS: readonly (Feeling | null)[] = [
  null,
  "coastal",
  "wine-food",
  "hidden",
  "romance",
  "culture",
  "adventure",
  "slow-luxury",
  "faith",
  "hands-on",
];

/** Interest sets kept small and plausible — a traveller picks one to three. */
export const SIMULATION_INTEREST_SETS: readonly (readonly Interest[])[] = [
  [],
  ["wine"],
  ["gastronomy"],
  ["nature"],
  ["coast"],
  ["heritage"],
  ["faith"],
  ["hands-on"],
  ["local-life"],
  ["photography"],
  ["wine", "gastronomy"],
  ["coast", "nature"],
  ["heritage", "faith"],
  ["heritage", "wine"],
  ["hands-on", "local-life"],
  ["hands-on", "gastronomy"],
  ["coast", "local-life"],
  ["nature", "local-life"],
  ["wine", "local-life"],
  ["heritage", "coast"],
  ["heritage", "photography"],
  ["coast", "gastronomy"],
  // Real triple: the Alentejo fork is only genuinely public with all three.
  ["wine", "heritage", "local-life"],
];

export const SIMULATION_DESTINATIONS: readonly DestinationIntent[] = [
  "no-preference",
  "anywhere-special",
  "lisbon-sintra-cascais",
  "arrabida-setubal-azeitao",
  "alentejo-evora-wine",
  "alentejo-roman-talha",
  "vicentine-coast",
  "comporta-troia",
  "spiritual-coast",
  "central-portugal",
];

/** The answers a traveller has given before the adaptive question is asked. */
export type PublicBaseState = {
  feeling: Feeling | null;
  interests: readonly Interest[];
  destinationIntent: DestinationIntent;
};

export function enumerateBaseStates(): PublicBaseState[] {
  const states: PublicBaseState[] = [];
  for (const feeling of SIMULATION_FEELINGS) {
    for (const interests of SIMULATION_INTEREST_SETS) {
      if (!feeling && interests.length === 0) continue;
      for (const destinationIntent of SIMULATION_DESTINATIONS) {
        states.push({ feeling, interests, destinationIntent });
      }
    }
  }
  return states;
}

/* ------------------------------------------------------------------ */
/* Real emittability                                                    */
/* ------------------------------------------------------------------ */

export function toStudioState(base: PublicBaseState): StudioV3State {
  return {
    ...INITIAL_STATE,
    feeling: base.feeling,
    interests: [...base.interests],
    destinationIntent: base.destinationIntent,
  };
}

export type EmittedQuestion = {
  kind: AdaptiveQuestionKind;
  refinements: AdaptiveRefinementId[];
};

/**
 * The ONE question production StudioV3 is guaranteed to show for this state.
 *
 * `StudioV3` calls `resolveAdaptiveQuestion(state, advisor.preferredKind ?? null)`
 * and the AI advisor is non-blocking: it may be null, fall back or be rate
 * limited. So the deterministic default — `preferredKind = null`, resolved by
 * the module's own `orderedKinds` — is the only guaranteed public surface and
 * therefore the sole certification authority for BUILD 0.
 */
export function defaultPublicQuestion(base: PublicBaseState): EmittedQuestion | null {
  const question = resolveAdaptiveQuestion(toStudioState(base), null);
  if (!question) return null;
  return { kind: question.kind, refinements: question.options.map((option) => option.id) };
}

/** Refinement answers the deterministic default question actually contains. */
export function defaultPublicRefinements(base: PublicBaseState): AdaptiveRefinementId[] {
  return defaultPublicQuestion(base)?.refinements ?? [];
}

/**
 * DIAGNOSTIC ONLY — kinds the advisor could steer toward. These never certify
 * reachability and never make a capability green.
 */
export function advisorEligibleKinds(base: PublicBaseState): AdaptiveQuestionKind[] {
  return [...availableAdaptiveQuestionKinds(toStudioState(base))];
}

/** DIAGNOSTIC ONLY — refinements only an AI preference could surface. */
export function aiPreferableRefinements(base: PublicBaseState): AdaptiveRefinementId[] {
  const state = toStudioState(base);
  const guaranteed = new Set(defaultPublicRefinements(base));
  const extra = new Set<AdaptiveRefinementId>();
  for (const kind of availableAdaptiveQuestionKinds(state)) {
    const question = resolveAdaptiveQuestion(state, kind);
    if (!question || question.kind !== kind) continue;
    for (const option of question.options) {
      if (!guaranteed.has(option.id)) extra.add(option.id);
    }
  }
  return [...extra];
}

/** Certification alias: the deterministic default question, as a list. */
export function emittableQuestions(base: PublicBaseState): EmittedQuestion[] {
  const question = defaultPublicQuestion(base);
  return question ? [question] : [];
}

/** Certification alias: refinements of the deterministic default question. */
export function emittableRefinements(base: PublicBaseState): AdaptiveRefinementId[] {
  return defaultPublicRefinements(base);
}

export function canEmitRefinement(
  base: PublicBaseState,
  refinement: AdaptiveRefinementId,
): boolean {
  return defaultPublicRefinements(base).includes(refinement);
}


export type PublicRefinementPath = {
  refinement: AdaptiveRefinementId;
  questionKind: AdaptiveQuestionKind;
  base: PublicBaseState;
};

/**
 * First proven public path to a refinement across the bounded base matrix, or
 * null when no plausible state can present it.
 */
export function findPublicPath(refinement: AdaptiveRefinementId): PublicRefinementPath | null {
  for (const base of enumerateBaseStates()) {
    for (const question of emittableQuestions(base)) {
      if (question.refinements.includes(refinement)) {
        return { refinement, questionKind: question.kind, base };
      }
    }
  }
  return null;
}

/** Every refinement that at least one plausible public state can present. */
export function allEmittableRefinements(): Set<AdaptiveRefinementId> {
  const seen = new Set<AdaptiveRefinementId>();
  for (const base of enumerateBaseStates()) {
    for (const refinement of emittableRefinements(base)) seen.add(refinement);
  }
  return seen;
}

/* ------------------------------------------------------------------ */
/* PASS 3 — SEQUENTIAL certification authority (Question Director)      */
/* ------------------------------------------------------------------ */

/**
 * The legacy helpers above certify only the ONE deterministic default legacy
 * adaptive question. From Pass 3 they are LEGACY DIAGNOSTICS: they may never
 * make a capability green. The authority below replays the real 0→N Pass-2
 * Question Director over a growing `questionHistory`, so a refinement counts
 * as public only when the director actually offered it at that step.
 */

export type SequentialQuestionStep = {
  questionKey: string;
  uncertaintyKey: string;
  /** Ordered choice keys exactly as offered by the director at this step. */
  offeredChoiceKeys: string[];
  /** The concrete choice selected to continue the branch. */
  selectedChoiceKey: string;
  /** Discovery refinement the selected choice corresponds to, when any. */
  selectedRefinement: AdaptiveRefinementId | null;
};

export type SequentialPublicPath = {
  base: PublicBaseState;
  /** Ordered questions actually asked before and including the target. */
  steps: SequentialQuestionStep[];
  /** Refinement proven emittable at the LAST step of this path. */
  refinement: AdaptiveRefinementId;
  targetSignal: LivingAtlasDiscoverySignal | null;
  /** Derived answer state AFTER replaying every step. Proof of causality. */
  finalDiscoverySignals: LivingAtlasDiscoverySignal[];
  finalDirectionIds: LivingAtlasSignatureId[];
};

export type SequentialTree = {
  base: PublicBaseState;
  /** First proven path per refinement, deterministic depth-first order. */
  paths: SequentialPublicPath[];
  refinements: AdaptiveRefinementId[];
};

function baseKey(base: PublicBaseState): string {
  return JSON.stringify([base.feeling, [...base.interests], base.destinationIntent]);
}

/**
 * Re-derive EVERYTHING from base + CURRENT history before every director call:
 * answer projection -> semantic profile (history supplied) -> Pass-1
 * projection -> DirectorContext. Nothing is carried over between steps.
 */
function currentDirectorInputs(
  base: PublicBaseState,
  history: readonly QuestionAnswerEvent[],
) {
  const answers = deriveDirectorAnswerProjection(history);
  const profile = deriveSemanticProfile({
    feeling: base.feeling,
    interests: [...base.interests],
    history,
  });
  return {
    answers,
    profile,
    context: buildDirectorContext({
      destinationIntent: base.destinationIntent,
      projection: projectSemanticProfile(profile),
      // No timing conflict: the public reachability matrix is taste-only.
      timingConflict: null,
      answers,
    }),
  };
}

function directorContextFor(base: PublicBaseState) {
  const { profile, context } = currentDirectorInputs(base, []);
  return { profile, context };
}

const TREE_CACHE = new Map<string, SequentialTree>();

/**
 * Depth-first replay of the real director. Every branch appends a TRUTHFUL
 * `QuestionAnswerEvent` (ordered offered choice keys, selected choice key,
 * the director's own dependency fingerprint) and then RE-DERIVES the answer
 * projection, semantic profile and director context from that new history
 * before asking again. Termination is structural: a decision identity already
 * visited on the current branch is never re-entered, and the director stops on
 * its own when no material uncertainty remains. There is no numeric cap.
 */
export function sequentialQuestionTree(base: PublicBaseState): SequentialTree {
  const key = baseKey(base);
  const cached = TREE_CACHE.get(key);
  if (cached) return cached;

  const paths: SequentialPublicPath[] = [];
  const firstPathFor = new Map<AdaptiveRefinementId, SequentialPublicPath>();

  const walk = (
    history: readonly QuestionAnswerEvent[],
    steps: readonly SequentialQuestionStep[],
    visited: readonly string[],
  ): void => {
    const { profile, context } = currentDirectorInputs(base, history);
    const decision = decideStudioQuestion({ context, profile, history });
    if (!decision.shouldAsk || !decision.options || decision.options.length === 0) return;
    const identity = decision.decisionFingerprint!;
    if (visited.includes(identity)) return;

    const offeredChoiceKeys = decision.options.map((choice) => choice.choiceKey);
    for (const choice of decision.options) {
      const refinement =
        choice.kind === "discovery" ? (choice.id as AdaptiveRefinementId) : null;
      const step: SequentialQuestionStep = {
        questionKey: decision.questionKey!,
        uncertaintyKey: decision.uncertaintyKey!,
        offeredChoiceKeys: [...offeredChoiceKeys],
        selectedChoiceKey: choice.choiceKey,
        selectedRefinement: refinement,
      };
      const nextSteps = [...steps, step];

      const event: QuestionAnswerEvent = {
        questionKey: decision.questionKey!,
        uncertaintyKey: decision.uncertaintyKey!,
        targetKeys: [],
        offeredOptionIds: [...offeredChoiceKeys],
        selectedOptionIds: [choice.choiceKey],
        semanticEffects: [],
        dependencyFingerprint: decision.dependencyFingerprint!,
        source: "director",
      };
      const nextHistory = appendQuestionAnswer(history, event);
      const nextAnswers = deriveDirectorAnswerProjection(nextHistory);

      if (refinement && !firstPathFor.has(refinement)) {
        // Causality gate: a discovery target only counts when the selection
        // actually PROJECTED its signal into the derived answer state.
        const projected =
          !choice.discoverySignal ||
          nextAnswers.selectedDiscoverySignals.includes(choice.discoverySignal);
        if (projected) {
          const path: SequentialPublicPath = {
            base,
            steps: nextSteps,
            refinement,
            targetSignal: choice.discoverySignal,
            finalDiscoverySignals: [...nextAnswers.selectedDiscoverySignals],
            finalDirectionIds: [...nextAnswers.selectedDirectionIds],
          };
          firstPathFor.set(refinement, path);
          paths.push(path);
        }
      }

      walk(nextHistory, nextSteps, [...visited, identity]);
    }
  };

  walk([], [], []);

  const tree: SequentialTree = {
    base,
    paths,
    refinements: paths.map((path) => path.refinement),
  };
  TREE_CACHE.set(key, tree);
  return tree;
}

/** Refinements the DIRECTOR can genuinely offer somewhere in this base's tree. */
export function sequentialEmittableRefinements(base: PublicBaseState): AdaptiveRefinementId[] {
  return [...sequentialQuestionTree(base).refinements];
}

export function canEmitRefinementSequentially(
  base: PublicBaseState,
  refinement: AdaptiveRefinementId,
): boolean {
  return sequentialQuestionTree(base).refinements.includes(refinement);
}

export function sequentialPathFor(
  base: PublicBaseState,
  refinement: AdaptiveRefinementId,
): SequentialPublicPath | null {
  return (
    sequentialQuestionTree(base).paths.find((path) => path.refinement === refinement) ?? null
  );
}

/**
 * Re-verification helper. Replays the path, RE-DERIVING answer projection,
 * semantic profile and context from the current history before every director
 * call, and proves:
 *   - each step's question and ordered offered keys are what the director
 *     really produced at that point;
 *   - the last step actually SELECTED the claimed target refinement;
 *   - the claimed target discovery signal is present in the FINAL derived
 *     answer projection.
 * A forged path that only marks an uncertainty as answered is rejected.
 */
export function verifySequentialPath(path: SequentialPublicPath): boolean {
  let history: QuestionAnswerEvent[] = [];
  for (const step of path.steps) {
    const { profile, context } = currentDirectorInputs(path.base, history);
    const decision = decideStudioQuestion({ context, profile, history });
    if (!decision.shouldAsk || decision.questionKey !== step.questionKey) return false;
    const offered = decision.options!.map((choice) => choice.choiceKey);
    if (offered.length !== step.offeredChoiceKeys.length) return false;
    if (!offered.every((value, index) => value === step.offeredChoiceKeys[index])) return false;
    if (!offered.includes(step.selectedChoiceKey)) return false;
    history = appendQuestionAnswer(history, {
      questionKey: decision.questionKey!,
      uncertaintyKey: decision.uncertaintyKey!,
      targetKeys: [],
      offeredOptionIds: offered,
      selectedOptionIds: [step.selectedChoiceKey],
      semanticEffects: [],
      dependencyFingerprint: decision.dependencyFingerprint!,
      source: "director",
    });
  }

  const last = path.steps[path.steps.length - 1];
  if (!last || last.selectedRefinement !== path.refinement) return false;
  if (last.selectedChoiceKey !== path.refinement) return false;

  const finalAnswers = deriveDirectorAnswerProjection(history);
  if (
    path.targetSignal &&
    !finalAnswers.selectedDiscoverySignals.includes(path.targetSignal)
  ) {
    return false;
  }
  return true;
}

/** Derived answer state proven by replaying a path. Never persisted. */
export function replaySequentialPathAnswers(path: SequentialPublicPath) {
  let history: QuestionAnswerEvent[] = [];
  for (const step of path.steps) {
    history = appendQuestionAnswer(history, {
      questionKey: step.questionKey,
      uncertaintyKey: step.uncertaintyKey,
      targetKeys: [],
      offeredOptionIds: [...step.offeredChoiceKeys],
      selectedOptionIds: [step.selectedChoiceKey],
      semanticEffects: [],
      dependencyFingerprint: "replay",
      source: "director",
    });
  }
  return deriveDirectorAnswerProjection(history);
}


/** First proven SEQUENTIAL public path to a refinement across the matrix. */
export function findSequentialPath(
  refinement: AdaptiveRefinementId,
): SequentialPublicPath | null {
  for (const base of enumerateBaseStates()) {
    const path = sequentialPathFor(base, refinement);
    if (path) return path;
  }
  return null;
}

/**
 * SEQUENTIAL certification: refinements that emit the given discovery signal
 * AND that the real director actually offers along a proven question path.
 */
export function publicPathsForSignal(signal: LivingAtlasDiscoverySignal): {
  refinements: AdaptiveRefinementId[];
  example: SequentialPublicPath | null;
} {
  const refinements: AdaptiveRefinementId[] = [];
  let example: SequentialPublicPath | null = null;
  for (const id of Object.keys(LEGACY_REFINEMENT_SIGNAL_MIRROR) as AdaptiveRefinementId[]) {
    if (LEGACY_REFINEMENT_SIGNAL_MIRROR[id] !== signal) continue;
    const path = findSequentialPath(id);
    if (!path) continue;
    refinements.push(id);
    if (!example) example = path;
  }
  return { refinements, example };
}

/** Every refinement at least one plausible base can sequentially present. */
export function allSequentialRefinements(): Set<AdaptiveRefinementId> {
  const seen = new Set<AdaptiveRefinementId>();
  for (const base of enumerateBaseStates()) {
    for (const refinement of sequentialEmittableRefinements(base)) seen.add(refinement);
  }
  return seen;
}

/** Signature id a signal targets — re-exported for diagnostic convenience. */
export function signatureForSignal(signal: LivingAtlasDiscoverySignal) {
  return DISCOVERY_SIGNAL_TARGET[signal];
}
