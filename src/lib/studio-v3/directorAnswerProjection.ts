/**
 * BUILD 2 — Pass 3 causal fix. PURE DERIVED director answer projection.
 *
 * `QuestionAnswerEvent[]` stays the ONE canonical answer store. This module
 * derives — never persists — the discovery / direction / timing state implied
 * by the answers already given, so the NEXT director call can actually see
 * what the traveller chose. Without it, history could only ever suppress
 * questions, which is suppression, not causality.
 *
 * It deliberately does NOT invent semantic interests: a director discovery
 * choice carries no synthetic `SemanticSourceEvent`. Discovery/direction is a
 * separate derived projection.
 *
 * LOW-LEVEL MODULE. It MUST NOT import the director, question uncertainty,
 * public refinement paths, capability matrix, reachability simulator or the
 * live `adaptiveQuestions`.
 *
 * Pure: no I/O, no wall clock, no randomness. `eventId` / `createdAt` never
 * participate.
 */

import {
  DISCOVERY_SIGNAL_TARGET,
  type LivingAtlasDiscoverySignal,
} from "@/components/studio-v3/livingAtlasDecision";
import type { LivingAtlasSignatureId } from "@/components/studio-v3/livingAtlasTaxonomy";
import {
  DIRECTOR_OPTION_CATALOG,
  TIMING_ACTION_OPTION_ID,
  isDirectorOptionId,
} from "@/lib/studio-v3/questionOptionCatalog";
import {
  authoritativeSelectedOptionIds,
  hasQuestionSemanticProgress,
  legacyCompatibilityRefinementOf,
  type QuestionAnswerEvent,
} from "@/lib/studio-v3/questionHistory";


export type DirectorAnswerProjection = {
  /** Catalogued discovery choice keys actually selected, first-seen order. */
  selectedDiscoveryChoiceKeys: readonly string[];
  /** Discovery signals those selections really emit, first-seen order. */
  selectedDiscoverySignals: readonly LivingAtlasDiscoverySignal[];
  /** Signature directions those signals target, first-seen order. */
  selectedDirectionIds: readonly LivingAtlasSignatureId[];
  /** Recognised BUILD-1 timing choice keys, verbatim, first-seen order. */
  selectedTimingChoiceKeys: readonly string[];
};

export const EMPTY_DIRECTOR_ANSWER_PROJECTION: DirectorAnswerProjection = {
  selectedDiscoveryChoiceKeys: [],
  selectedDiscoverySignals: [],
  selectedDirectionIds: [],
  selectedTimingChoiceKeys: [],
};

const TIMING_ACTION_KINDS = new Set(Object.keys(TIMING_ACTION_OPTION_ID));

/**
 * Recognise a BUILD-1 timing choice key WITHOUT inventing business meaning:
 * the key is the canonical JSON identity whose first element is a real
 * BUILD-1 action kind. Anything else is not a timing selection.
 */
function isTimingChoiceKey(value: string): boolean {
  if (!value.startsWith("[")) return false;
  try {
    const parsed: unknown = JSON.parse(value);
    return (
      Array.isArray(parsed) &&
      typeof parsed[0] === "string" &&
      TIMING_ACTION_KINDS.has(parsed[0])
    );
  } catch {
    return false;
  }
}

/**
 * Derive the answer state implied by canonical history.
 *
 * Fail-closed: a selected key that the catalogue does not recognise as a
 * discovery option produces NO discovery signal and NO direction. Only events
 * with real semantic progress are read.
 */
export function deriveDirectorAnswerProjection(
  history: readonly QuestionAnswerEvent[] = [],
): DirectorAnswerProjection {
  const discoveryChoiceKeys: string[] = [];
  const signals: LivingAtlasDiscoverySignal[] = [];
  const directions: LivingAtlasSignatureId[] = [];
  const timingChoiceKeys: string[] = [];

  const consumeDiscovery = (selected: string) => {
    if (!isDirectorOptionId(selected)) return false;
    const option = DIRECTOR_OPTION_CATALOG[selected];
    if (option.kind !== "discovery") return false;
    if (!discoveryChoiceKeys.includes(selected)) discoveryChoiceKeys.push(selected);
    const signal = option.discoverySignal;
    if (!signal) return true;
    if (!signals.includes(signal)) signals.push(signal);
    const direction = DISCOVERY_SIGNAL_TARGET[signal];
    if (direction && !directions.includes(direction)) directions.push(direction);
    return true;
  };

  for (const event of history) {
    if (!hasQuestionSemanticProgress(event)) continue;
    // PASS 4 offered-option gate: catalogue validity ALONE is insufficient —
    // the option must also have been offered by that exact question.
    for (const selected of authoritativeSelectedOptionIds(event)) {
      if (consumeDiscovery(selected)) continue;
      if (isTimingChoiceKey(selected) && !timingChoiceKeys.includes(selected)) {
        timingChoiceKeys.push(selected);
      }
    }
    // HONEST LEGACY COMPATIBILITY: an old draft's proven answer, validated
    // against the canonical catalogue. It never weakens the live gate above.
    const legacy = legacyCompatibilityRefinementOf(event);
    if (legacy) consumeDiscovery(legacy);
  }


  return {
    selectedDiscoveryChoiceKeys: discoveryChoiceKeys,
    selectedDiscoverySignals: signals,
    selectedDirectionIds: directions,
    selectedTimingChoiceKeys: timingChoiceKeys,
  };
}

export function projectionHasDiscoverySignal(
  projection: DirectorAnswerProjection | null | undefined,
  signal: LivingAtlasDiscoverySignal,
): boolean {
  return projection ? projection.selectedDiscoverySignals.includes(signal) : false;
}

/** Canonical, metadata-free identity of a derived answer projection. */
export function directorAnswerProjectionIdentity(
  projection: DirectorAnswerProjection | null,
): unknown {
  if (!projection) return null;
  return [
    [...projection.selectedDiscoveryChoiceKeys],
    [...projection.selectedDiscoverySignals],
    [...projection.selectedDirectionIds],
    [...projection.selectedTimingChoiceKeys],
  ];
}
