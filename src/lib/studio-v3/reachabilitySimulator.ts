/**
 * Deterministic reachability simulator — BUILD 0 diagnostics only.
 *
 * PURE AND READ-ONLY. It sweeps a bounded, fully enumerated matrix of
 * plausible traveller states through the EXISTING Living Atlas decision
 * engine and records where each of the twelve commercial directions lands.
 *
 * There is no randomness, no sampling and no learning here. This is not a new
 * recommender and it is never used in a customer-facing path — it exists so
 * that "can a traveller actually reach this product?" becomes a provable
 * question instead of an opinion.
 */

import {
  decideLivingAtlasSignature,
  type LivingAtlasDiscoverySignal,
} from "@/components/studio-v3/livingAtlasDecision";
import {
  LIVING_ATLAS_SIGNATURE_IDS,
  type LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import { buildExperienceProfile } from "@/lib/studio-v3/livingAtlasBridge";
import {
  canEmitRefinementSequentially,
  enumerateBaseStates,
  sequentialEmittableRefinements,
  sequentialPathFor,
  verifySequentialPath,
  type PublicBaseState,
  type SequentialPublicPath,
} from "@/lib/studio-v3/publicRefinementPaths";
import type {
  AdaptiveRefinementId,
  DestinationIntent,
  Feeling,
  Interest,
} from "@/components/studio-v3/types";

/* ------------------------------------------------------------------ */
/* Bounded state matrix                                                 */
/* ------------------------------------------------------------------ */

export type ReachabilityState = {
  feeling: Feeling | null;
  interests: readonly Interest[];
  destinationIntent: DestinationIntent;
  refinement: AdaptiveRefinementId | null;
};

export type ReachabilityOutcome = {
  state: ReachabilityState;
  status: "clear" | "precision-fork" | "weak" | "invalid" | "no-profile";
  /** False when the refinement could never be presented for this base state. */
  publiclyReachable: boolean;
  top1: LivingAtlasSignatureId | null;
  top3: LivingAtlasSignatureId[];
  forkCandidates: LivingAtlasSignatureId[];
  tiedAtTop: LivingAtlasSignatureId[];
};

export type DirectionReachability = {
  signatureId: LivingAtlasSignatureId;
  /** Selected outright (status === "clear"). */
  top1Count: number;
  /** Appears in the top three of the ranking. */
  top3Count: number;
  /** Offered as a resolvable precision-fork candidate. */
  forkCount: number;
  /** Reachable at all: selected outright or offered in a fork. */
  reachable: boolean;
  /** Share of all evaluated states where this direction won outright. */
  top1Share: number;
  /** A shortest proven route to top-1, for documentation and certification. */
  exampleTop1State: ReachabilityState | null;
  exampleForkState: ReachabilityState | null;
};

export type ReachabilityReport = {
  evaluatedStates: number;
  decidedStates: number;
  directions: DirectionReachability[];
  /** Directions never selected and never offered in a fork. */
  deadDirections: LivingAtlasSignatureId[];
  /** Directions winning an implausibly large share of decided states. */
  dominatingDirections: LivingAtlasSignatureId[];
  /** Fraction of decided states left as an unresolved precision fork. */
  forkRate: number;
};

/** Domination threshold: no single direction should own a third of outcomes. */
export const DOMINATION_SHARE_THRESHOLD = 0.33;

/* ------------------------------------------------------------------ */
/* Simulation                                                           */
/* ------------------------------------------------------------------ */

/**
 * Enumerate the bounded state matrix. Deterministic order, no randomness.
 *
 * A refinement is only paired with a base state when the real 0→N Question
 * Director proves that option emittable along a SEQUENTIAL path for that
 * state. Cartesian pairing is deliberately refused. The
 * no-refinement state is always included separately. This deliberately
 * refuses to certify a direction through an answer no traveller could give.
 */
export function enumerateStates(): ReachabilityState[] {
  const states: ReachabilityState[] = [];
  for (const base of enumerateBaseStates()) {
    states.push({ ...base, refinement: null });
    for (const refinement of sequentialEmittableRefinements(base)) {
      states.push({ ...base, refinement });
    }
  }
  return states;
}

/** Proven sequential director path behind a state, when it has a refinement. */
export function sequentialPathForState(state: ReachabilityState): SequentialPublicPath | null {
  if (!state.refinement) return null;
  return sequentialPathFor(
    {
      feeling: state.feeling,
      interests: state.interests,
      destinationIntent: state.destinationIntent,
    },
    state.refinement,
  );
}

/** Public-path guard: is this exact traveller state actually reachable? */
export function isPubliclyReachableState(state: ReachabilityState): boolean {
  if (!state.refinement) return true;
  const base: PublicBaseState = {
    feeling: state.feeling,
    interests: state.interests,
    destinationIntent: state.destinationIntent,
  };
  return canEmitRefinementSequentially(base, state.refinement);
}

export function simulateState(state: ReachabilityState): ReachabilityOutcome {
  const profile = buildExperienceProfile({
    feeling: state.feeling,
    interests: state.interests,
  });
  if (!profile) {
    return {
      state,
      status: "no-profile",
      publiclyReachable: isPubliclyReachableState(state),
      top1: null,
      top3: [],
      forkCandidates: [],
      tiedAtTop: [],
    };
  }

  // PROOF, not mapping: the discovery signal supplied to the Living Atlas
  // decision is the one a VERIFIED sequential director path actually
  // projected into the derived answer state. A refinement nobody could
  // really select — or that never projected a signal — proves nothing.
  const path = sequentialPathForState(state);
  const signal: LivingAtlasDiscoverySignal | null =
    path && verifySequentialPath(path) ? path.targetSignal : null;


  const decision = decideLivingAtlasSignature({
    profile,
    destinationIntent: state.destinationIntent,
    discoverySignal: signal,
  });

  return {
    state,
    status: decision.status,
    publiclyReachable: isPubliclyReachableState(state),
    top1: decision.selectedSignatureId,
    top3: decision.ranked.slice(0, 3).map((candidate) => candidate.signatureId),
    forkCandidates: decision.forkCandidates.map((candidate) => candidate.signatureId),
    tiedAtTop: decision.ambiguity.tiedSignatureIds,
  };
}

export function runReachabilityReport(
  states: readonly ReachabilityState[] = enumerateStates(),
): ReachabilityReport {
  const outcomes = states.map(simulateState);
  const decided = outcomes.filter((o) => o.status !== "no-profile" && o.status !== "invalid");

  const directions: DirectionReachability[] = LIVING_ATLAS_SIGNATURE_IDS.map((signatureId) => {
    let top1Count = 0;
    let top3Count = 0;
    let forkCount = 0;
    let exampleTop1State: ReachabilityState | null = null;
    let exampleForkState: ReachabilityState | null = null;

    for (const outcome of outcomes) {
      if (outcome.top1 === signatureId) {
        top1Count += 1;
        if (!exampleTop1State) exampleTop1State = outcome.state;
      }
      if (outcome.top3.includes(signatureId)) top3Count += 1;
      if (outcome.forkCandidates.includes(signatureId)) {
        forkCount += 1;
        if (!exampleForkState) exampleForkState = outcome.state;
      }
    }

    return {
      signatureId,
      top1Count,
      top3Count,
      forkCount,
      reachable: top1Count > 0 || forkCount > 0,
      top1Share: decided.length === 0 ? 0 : top1Count / decided.length,
      exampleTop1State,
      exampleForkState,
    };
  });

  return {
    evaluatedStates: outcomes.length,
    decidedStates: decided.length,
    directions,
    deadDirections: directions.filter((d) => !d.reachable).map((d) => d.signatureId),
    dominatingDirections: directions
      .filter((d) => d.top1Share > DOMINATION_SHARE_THRESHOLD)
      .map((d) => d.signatureId),
    forkRate:
      decided.length === 0
        ? 0
        : decided.filter((o) => o.status === "precision-fork").length / decided.length,
  };
}

/**
 * Certification helper: does a specific traveller state reach the direction,
 * either as an outright top-1 or as a fork candidate that a resolving signal
 * can then settle?
 */
export function reachesDirection(
  state: ReachabilityState,
  signatureId: LivingAtlasSignatureId,
): { top1: boolean; inFork: boolean; inTop3: boolean; status: ReachabilityOutcome["status"] } {
  const outcome = simulateState(state);
  return {
    top1: outcome.top1 === signatureId,
    inFork: outcome.forkCandidates.includes(signatureId),
    inTop3: outcome.top3.includes(signatureId),
    status: outcome.status,
  };
}
