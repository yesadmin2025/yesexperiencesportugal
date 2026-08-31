/**
 * BUILD 2 — Pass 2. Pure director context.
 *
 * Carries ONLY what the deterministic question director needs, derived from
 * low-level canonical authorities (`livingAtlasDecision`) — never from
 * capabilityMatrix, publicRefinementPaths or reachabilitySimulator.
 *
 * Pure: no state writes, no I/O, no wall clock, no randomness.
 * Fail-closed: missing truth yields an empty candidate/signal space, which
 * makes every dependent question un-askable rather than speculative.
 */

import {
  DISCOVERY_SIGNAL_BY_SIGNATURE,
  livingAtlasCandidatesForDestination,
  type LivingAtlasDiscoverySignal,
} from "@/components/studio-v3/livingAtlasDecision";
import type { LivingAtlasSignatureId } from "@/components/studio-v3/livingAtlasTaxonomy";
import type { DestinationIntent } from "@/components/studio-v3/types";
import type { TimingConflict } from "@/lib/studio-v3/timeDomain";
import type { SemanticProfileProjection } from "@/lib/studio-v3/semanticProfileProjection";
import { timingOptionIdentity } from "@/lib/studio-v3/questionOptionCatalog";
import {
  EMPTY_DIRECTOR_ANSWER_PROJECTION,
  projectionHasDiscoverySignal,
  type DirectorAnswerProjection,
} from "@/lib/studio-v3/directorAnswerProjection";


export type DirectorContext = {
  destinationIntent: DestinationIntent | null;
  /** Signature directions still commercially possible for that intent. */
  candidateSignatureIds: readonly LivingAtlasSignatureId[];
  /** Discovery signals those candidates can actually consume. */
  allowedDiscoverySignals: readonly LivingAtlasDiscoverySignal[];
  /** True when more than one direction is still open. */
  destinationOpen: boolean;
  /** Pass-1 no-loss projection. Optional; the director degrades gracefully. */
  projection: SemanticProfileProjection | null;
  /** BUILD-1 read model only. The director never invents timing. */
  timingConflict: TimingConflict | null;
  /**
   * PURE DERIVED answer state from canonical history. It is a composition /
   * direction effect, NOT a hard filter: the base candidate space is never
   * collapsed, because hybrid compositions stay legitimate.
   */
  answers: DirectorAnswerProjection;
};

export type DirectorContextInput = {
  destinationIntent?: DestinationIntent | null;
  projection?: SemanticProfileProjection | null;
  timingConflict?: TimingConflict | null;
  answers?: DirectorAnswerProjection | null;
};

export function buildDirectorContext(input: DirectorContextInput): DirectorContext {
  const destinationIntent = input.destinationIntent ?? null;
  // Fail closed: with no destination truth there is no candidate space and
  // therefore no material discovery question can be justified.
  const candidateSignatureIds = destinationIntent
    ? [...livingAtlasCandidatesForDestination(destinationIntent)]
    : [];

  const allowed = new Set<LivingAtlasDiscoverySignal>();
  for (const signatureId of candidateSignatureIds) {
    const signal = DISCOVERY_SIGNAL_BY_SIGNATURE[signatureId];
    if (signal) allowed.add(signal);
  }

  return {
    destinationIntent,
    candidateSignatureIds,
    allowedDiscoverySignals: [...allowed].sort(),
    destinationOpen: candidateSignatureIds.length > 1,
    projection: input.projection ?? null,
    timingConflict: input.timingConflict ?? null,
    answers: input.answers ?? EMPTY_DIRECTOR_ANSWER_PROJECTION,
  };
}

/** True when the derived answer state already carries this discovery signal. */
export function contextHasSelectedSignal(
  context: DirectorContext,
  signal: LivingAtlasDiscoverySignal,
): boolean {
  return projectionHasDiscoverySignal(context.answers, signal);
}


export function contextAllowsSignal(
  context: DirectorContext,
  signal: LivingAtlasDiscoverySignal,
): boolean {
  return context.allowedDiscoverySignals.includes(signal);
}

/**
 * Canonical structured identity of the timing truth. Structural and
 * TRUTH-COMPLETE: kind, stage, overflow, the requested/unfitted shape and the
 * FULL payload of every offered option in the order BUILD 1 supplied it. No
 * labels, no timestamps, no ids that could reorder non-deterministically.
 */
export function timingConflictIdentity(conflict: TimingConflict | null): unknown {
  if (!conflict) return null;
  return {
    kind: conflict.kind,
    stage: conflict.stage,
    overflowMinutes: conflict.overflowMinutes,
    requestedDimensions: [...conflict.requestedDimensions]
      .map(
        (entry) =>
          [entry.dimension, entry.status, [...entry.representedByStopIds].sort()] as const,
      )
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    unfittedRequests: [...conflict.unfittedRequests]
      .map(
        (entry) =>
          [
            entry.dimension,
            [...entry.candidateStopIds].sort(),
            entry.minimumExtraMinutesNeeded,
          ] as const,
      )
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    // Order preserved: BUILD 1's option order is itself truth.
    options: conflict.options.map(timingOptionIdentity),
  };
}

