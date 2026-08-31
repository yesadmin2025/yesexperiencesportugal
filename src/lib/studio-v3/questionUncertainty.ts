/**
 * BUILD 2 — Pass 2. Pure material-uncertainty detection.
 *
 * A question exists ONLY when answering it materially changes the composition
 * (two genuinely different real Signature directions are still open) or when
 * BUILD-1 reported a real time conflict that must be traded off rather than
 * silently dropped.
 *
 * Explicitly NOT allowed here:
 *   - theme reconfirmation ("do you like wine?")
 *   - any invented activity, supplier, price or time
 *   - UI copy authority (machine keys only; AI phrasing is Pass 6)
 *
 * Pure: no I/O, no state, no wall clock, no randomness.
 */

import type { LivingAtlasDiscoverySignal } from "@/components/studio-v3/livingAtlasDecision";
import {
  contextAllowsSignal,

  type DirectorContext,
} from "@/lib/studio-v3/directorContext";
import {
  DIRECTOR_OPTION_CATALOG,
  discoveryChoice,
  isDirectorOptionId,
  timingChoice,
  type DirectorChoice,
  type DirectorOptionId,
} from "@/lib/studio-v3/questionOptionCatalog";
import type { AdaptiveRefinementId } from "@/components/studio-v3/types";
import type { StudioSemanticProfile } from "@/lib/studio-v3/semanticProfile";
import type { SemanticKey } from "@/lib/studio-v3/semanticSourceEvents";

export type UncertaintyKind = "time-tradeoff" | "discovery-fork";

export type MaterialUncertainty = {
  /** Stable machine identity of the uncertainty itself. */
  uncertaintyKey: string;
  /** Stable machine identity of the question that resolves it. */
  questionKey: string;
  kind: UncertaintyKind;
  /** Ordered catalog action ids. Order is part of the question's identity. */
  optionIds: readonly DirectorOptionId[];
  /**
   * Ordered CONCRETE choices. For a time tradeoff there is exactly one choice
   * per real BUILD-1 `TimingConflict.options` entry, in the supplied order.
   */
  choices: readonly DirectorChoice[];
  /** Semantic keys this uncertainty depends on, canonically sorted. */
  dependencySemanticKeys: readonly SemanticKey[];
  /** Discovery signals the fork depends on, canonically sorted. */
  dependencySignals: readonly LivingAtlasDiscoverySignal[];
  /** Machine reason. Never traveller copy. */
  reason: string;
};

/** Declared detector order. Deterministic and material, never array luck. */
type ForkSpec = {
  uncertaintyKey: string;
  questionKey: string;
  /** OR-groups: every group must be satisfied by at least one present key. */
  requires: readonly (readonly SemanticKey[])[];
  optionIds: readonly AdaptiveRefinementId[];
  reason: string;
};

const FORK_SPECS: readonly ForkSpec[] = [
  {
    uncertaintyKey: "fork:faith-direction",
    questionKey: "question:faith-direction",
    requires: [["interest:faith", "feeling:faith"]],
    optionIds: ["faith-sanctuary-time", "faith-templar-heritage"],
    reason: "sanctuary-vs-templar-both-open",
  },
  {
    uncertaintyKey: "fork:alentejo-wine-direction",
    questionKey: "question:alentejo-wine-direction",
    requires: [
      ["interest:wine", "feeling:wine-food"],
      ["interest:heritage", "feeling:culture", "interest:local-life", "feeling:hidden"],
    ],
    optionIds: ["wine-monumental-estates", "wine-clay-talha"],
    reason: "monumental-evora-vs-roman-talha-both-open",
  },
  {
    uncertaintyKey: "fork:coast-geography",
    questionKey: "question:coast-geography",
    requires: [
      ["interest:coast", "feeling:coastal"],
      ["interest:nature"],
    ],
    optionIds: ["coast-from-the-water", "coast-remote-southwest"],
    reason: "arrabida-vs-southwest-both-open",
  },
  {
    uncertaintyKey: "fork:hands-on-craft",
    questionKey: "question:hands-on-craft",
    requires: [["interest:hands-on", "feeling:hands-on"]],
    optionIds: ["hands-paint-tile", "hands-make-cheese"],
    reason: "tile-vs-cheese-both-open",
  },
  {
    uncertaintyKey: "fork:arrabida-coast-day",
    questionKey: "question:arrabida-coast-day",
    requires: [
      ["interest:coast", "feeling:coastal"],
      ["interest:gastronomy", "feeling:wine-food"],
    ],
    optionIds: ["coast-from-the-water", "coast-wild-beaches"],
    reason: "boat-day-vs-wild-beach-table-both-open",
  },
  {
    uncertaintyKey: "fork:wine-day-depth",
    questionKey: "question:wine-day-depth",
    requires: [["interest:wine", "feeling:wine-food"]],
    optionIds: ["wine-cellar-depth", "wine-monumental-estates"],
    reason: "arrabida-cellar-vs-monumental-alentejo-both-open",
  },
  {
    uncertaintyKey: "fork:estuary-vs-wild-coast",
    questionKey: "question:estuary-vs-wild-coast",
    requires: [
      ["interest:local-life", "feeling:hidden"],
      ["interest:coast", "feeling:coastal"],
    ],
    optionIds: ["local-river-and-rice", "coast-remote-southwest"],
    reason: "rice-estuary-vs-remote-coast-both-open",
  },
  {
    uncertaintyKey: "fork:heritage-lens",
    questionKey: "question:heritage-lens",
    requires: [
      ["interest:heritage", "feeling:culture"],
      ["interest:photography"],
    ],
    optionIds: ["photo-landmarks", "faith-templar-heritage"],
    reason: "atlantic-palaces-vs-templar-towns-both-open",
  },
];

export const TIME_TRADEOFF_UNCERTAINTY_KEY = "time:tradeoff";
export const TIME_TRADEOFF_QUESTION_KEY = "question:time-tradeoff";

function presentSemanticKeys(profile: StudioSemanticProfile): Set<string> {
  const present = new Set<string>();
  for (const signal of profile.contentInterests) present.add(signal.key);
  for (const signal of profile.semanticSignals) {
    if (signal.polarity !== "positive" || signal.defeatedByExclusion) continue;
    if (signal.domain === "feeling") present.add(signal.key);
  }
  return present;
}

function excludedSemanticKeys(profile: StudioSemanticProfile): Set<string> {
  return new Set(profile.explicitExclusions.map((signal) => signal.key));
}

function signalsForOptions(
  optionIds: readonly AdaptiveRefinementId[],
): LivingAtlasDiscoverySignal[] {
  const signals: LivingAtlasDiscoverySignal[] = [];
  for (const id of optionIds) {
    const signal = DIRECTOR_OPTION_CATALOG[id].discoverySignal;
    if (signal && !signals.includes(signal)) signals.push(signal);
  }
  return signals;
}

/**
 * Ordered material uncertainties. Time conflicts come first: a real overflow
 * must be resolved by a truthful tradeoff before taste is refined further.
 */
export function detectMaterialUncertainties(
  context: DirectorContext,
  profile: StudioSemanticProfile,
): MaterialUncertainty[] {
  const out: MaterialUncertainty[] = [];

  if (context.timingConflict) {
    // TRUTH MIRROR: one concrete choice per REAL BUILD-1 option, in the order
    // BUILD 1 supplied. Fail closed when the conflict offers nothing — a time
    // question is never manufactured.
    const seenChoiceKeys = new Set<string>();
    const choices = context.timingConflict.options
      .map(timingChoice)
      .filter((choice) =>
        seenChoiceKeys.has(choice.choiceKey) ? false : (seenChoiceKeys.add(choice.choiceKey), true),
      );
    if (choices.length > 0) {
      out.push({
        uncertaintyKey: TIME_TRADEOFF_UNCERTAINTY_KEY,
        questionKey: TIME_TRADEOFF_QUESTION_KEY,
        kind: "time-tradeoff",
        optionIds: choices.map((choice) => choice.id),
        choices,
        dependencySemanticKeys: [],
        dependencySignals: [],
        reason: `time-conflict:${context.timingConflict.kind}`,
      });
    }
  }

  const present = presentSemanticKeys(profile);
  const excluded = excludedSemanticKeys(profile);

  for (const spec of FORK_SPECS) {
    // Every option must resolve to a REAL discovery signal that the current
    // candidate space can consume. Otherwise the fork is not material.
    const requiredSignals = signalsForOptions(spec.optionIds);
    if (requiredSignals.length < 2) continue;
    if (!requiredSignals.every((signal) => contextAllowsSignal(context, signal))) continue;
    // PASS 4 CORRECTION — dependency-specific invalidation.
    //
    // Resolution is decided by the DIRECTOR, against THIS uncertainty's key
    // and its CURRENT dependency fingerprint. A historical discovery signal
    // that merely still exists in the unfiltered answer projection may never
    // suppress a fork whose dependencies have since changed, and unrelated
    // resolved history is left untouched.




    const matched: SemanticKey[] = [];
    let satisfied = true;
    let suppressed = false;
    for (const group of spec.requires) {
      const hit = group.filter((key) => present.has(key));
      if (group.some((key) => excluded.has(key))) suppressed = true;
      if (hit.length === 0) {
        satisfied = false;
        break;
      }
      matched.push(...hit);
    }
    if (!satisfied || suppressed) continue;

    out.push({
      uncertaintyKey: spec.uncertaintyKey,
      questionKey: spec.questionKey,
      kind: "discovery-fork",
      optionIds: [...spec.optionIds],
      choices: spec.optionIds.map(discoveryChoice),
      dependencySemanticKeys: [...new Set(matched)].sort(),
      dependencySignals: [...requiredSignals].sort(),
      reason: spec.reason,
    });
  }

  return out;
}

/** Guard used by the director: no option may ever escape the catalogue. */
export function uncertaintyOptionsAreCatalogued(uncertainty: MaterialUncertainty): boolean {
  return (
    uncertainty.choices.length > 0 &&
    uncertainty.choices.every(
      (choice) => isDirectorOptionId(choice.id) && choice.choiceKey.length > 0,
    ) &&
    uncertainty.optionIds.every((id) => isDirectorOptionId(id))
  );
}
