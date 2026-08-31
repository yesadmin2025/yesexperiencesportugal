/**
 * BUILD 2 — Pass 1. NO-LOSS compatibility projection.
 *
 * Projects a `StudioSemanticProfile` onto the Living Atlas dimension
 * vocabulary WITHOUT touching `livingAtlasBridge.ts`. The downstream
 * compatibility limit (MAX_SELECTED_DIMENSIONS / MAX_LEAD_DIMENSIONS) still
 * applies, but every explicit dimension that cannot fit is reported in
 * `deferred` with a rationale — never silently dropped.
 *
 * FIX 5 — EQUAL-RANK BOUNDARY HONESTY:
 * `represented` is a DETERMINISTIC WORKING SET for compatibility and
 * debugging only. It is NOT a statement of traveller priority. When the
 * capacity boundary splits dimensions that share the same *semantic* rank
 * ({ authority, confidence, domainPrecedence } — explicitly EXCLUDING the
 * final stable-key/id tiebreak), `priorityBoundary.status` is
 * `unresolved-equal-rank` and every dimension in that rank group is listed in
 * `tiedDimensions`, on both sides of the cutoff. Stable id order must never be
 * read as the traveller having ranked one above the other.
 *
 * The interest/feeling maps below are a PASS-1 COMPATIBILITY MIRROR of the
 * current mappings in `livingAtlasBridge.ts`, kept local so parity can be
 * tested. They are NOT a new product authority and will be consolidated when
 * the bridge is switched over in Pass 4.
 */

import {
  MAX_LEAD_DIMENSIONS,
  MAX_SELECTED_DIMENSIONS,
  validateDecisionProfile as validateDecisionProfileContract,
  type ExperienceDimensionId,
  type ExperienceProfile,
} from "@/components/studio-v3/livingAtlasTaxonomy";

import type { Feeling, Interest } from "@/components/studio-v3/types";
import type { SemanticSignal, StudioSemanticProfile } from "@/lib/studio-v3/semanticProfile";
import { SEMANTIC_DOMAIN_PRECEDENCE } from "@/lib/studio-v3/semanticSourceEvents";

/** PASS-1 COMPATIBILITY MIRROR of livingAtlasBridge.INTEREST_TO_DIMENSION. */
const INTEREST_TO_DIMENSION_MIRROR: Readonly<Record<Interest, ExperienceDimensionId>> = {
  wine: "wine-table",
  gastronomy: "wine-table",
  nature: "nature-landscapes",
  coast: "atlantic-coast",
  heritage: "history-heritage",
  photography: "nature-landscapes",
  wellness: "nature-landscapes",
  "local-life": "local-life",
  faith: "faith-reflection",
  "hands-on": "hands-on-traditions",
};

/** PASS-1 COMPATIBILITY MIRROR of livingAtlasBridge.FEELING_TO_DIMENSION. */
const FEELING_TO_DIMENSION_MIRROR: Readonly<Record<Feeling, ExperienceDimensionId>> = {
  coastal: "atlantic-coast",
  "wine-food": "wine-table",
  hidden: "local-life",
  romance: "nature-landscapes",
  culture: "history-heritage",
  adventure: "atlantic-coast",
  "slow-luxury": "wine-table",
  faith: "faith-reflection",
  "hands-on": "hands-on-traditions",
};

/**
 * Semantic rank of a signal. Deliberately EXCLUDES the stable-key tiebreak:
 * a stable id is a display ordering device, never semantic authority.
 */
export type SemanticRank = {
  /** Lower = stronger. */
  authority: number;
  /** Higher = stronger. */
  confidence: number;
  /** Lower = earlier declared domain precedence. */
  domainPrecedence: number;
};

export function semanticRankOf(signal: SemanticSignal): SemanticRank {
  return {
    authority: signal.authority,
    confidence: signal.confidence,
    domainPrecedence: SEMANTIC_DOMAIN_PRECEDENCE[signal.domain],
  };
}

/** Negative when `a` is strictly stronger. Zero means genuinely equal rank. */
export function compareSemanticRank(a: SemanticRank, b: SemanticRank): number {
  if (a.authority !== b.authority) return a.authority - b.authority;
  if (a.confidence !== b.confidence) return b.confidence - a.confidence;
  return a.domainPrecedence - b.domainPrecedence;
}

export function semanticRankEquals(a: SemanticRank, b: SemanticRank): boolean {
  return compareSemanticRank(a, b) === 0;
}

export type DeferredReason =
  /** Deferred purely because capacity ran out at an EQUAL semantic rank. */
  | "equal-priority-capacity-boundary"
  /** Deferred because it is genuinely weaker than everything represented. */
  | "lower-ranked-overflow";

export type DeferredDimension = {
  dimension: ExperienceDimensionId;
  /** Semantic keys that asked for this dimension. */
  sourceSignals: string[];
  reason: DeferredReason;
};

export type PriorityBoundary = {
  /**
   * `decisive` — the cutoff separates strictly different semantic ranks.
   * `unresolved-equal-rank` — the cutoff splits an equal-rank group; which of
   * those dimensions leads is NOT decided by this projection.
   */
  status: "decisive" | "unresolved-equal-rank";
  boundaryRank?: SemanticRank;
  /** All dimensions in the rank group crossing the cutoff, both sides. */
  tiedDimensions: ExperienceDimensionId[];
};

export type SemanticProfileProjection = {
  /**
   * Legacy-compatible profile. Reproduces `buildExperienceProfile()` exactly
   * for the current canonical inputs (feeling + interest collection order).
   */
  experienceProfile: ExperienceProfile | null;
  /**
   * Explicit alias for the parity mode, so the distinction between legacy
   * compatibility output and order-independent semantic ranking is visible.
   */
  legacyCompatibilityProjection: ExperienceProfile | null;
  /**
   * BUILD 2 / Pass 4 — the REAL decision authority. Every ranked demanded
   * dimension survives here: there is NO max-selected cap. Leads keep the
   * existing 1–2 lead semantics. This is what the Living Atlas engine scores
   * in the modern path; `legacyCompatibilityProjection` is for old contracts.
   */
  fullDecisionProfile: ExperienceProfile | null;
  /**
   * DETERMINISTIC WORKING SET, not a traveller priority decision. Read
   * `priorityBoundary` before treating this order as meaningful.
   */
  represented: ExperienceDimensionId[];
  /** Explicit dimensions that could not fit. Never silently erased. */
  deferred: DeferredDimension[];
  /** Explicit model of the capacity cutoff. See FIX 5. */
  priorityBoundary: PriorityBoundary;
  rationale: string[];
};

export type { DecisionProfileValidation } from "@/components/studio-v3/livingAtlasTaxonomy";
export { validateDecisionProfile } from "@/components/studio-v3/livingAtlasTaxonomy";



function dimensionOf(signal: SemanticSignal): ExperienceDimensionId | null {
  if (signal.domain === "interest")
    return INTEREST_TO_DIMENSION_MIRROR[signal.value as Interest] ?? null;
  if (signal.domain === "feeling")
    return FEELING_TO_DIMENSION_MIRROR[signal.value as Feeling] ?? null;
  return null;
}

/** Byte-equivalent of the current `buildExperienceProfile()` algorithm. */
function legacyProfile(profile: StudioSemanticProfile): ExperienceProfile | null {
  const lead = profile.feeling ? FEELING_TO_DIMENSION_MIRROR[profile.feeling] : null;

  const fromInterests: ExperienceDimensionId[] = [];
  for (const interest of profile.interestOrderForCompatibility) {
    const dimension = INTEREST_TO_DIMENSION_MIRROR[interest];
    if (dimension && !fromInterests.includes(dimension)) fromInterests.push(dimension);
  }

  const selected: ExperienceDimensionId[] = [];
  if (lead) selected.push(lead);
  for (const dimension of fromInterests) {
    if (selected.length >= MAX_SELECTED_DIMENSIONS) break;
    if (!selected.includes(dimension)) selected.push(dimension);
  }

  if (selected.length === 0) return null;
  const leads = (lead ? [lead] : selected.slice(0, 1)).slice(0, MAX_LEAD_DIMENSIONS);
  return { selected, leads };
}

function formatRank(rank: SemanticRank): string {
  return `a${rank.authority}/c${rank.confidence}/d${rank.domainPrecedence}`;
}

export function projectSemanticProfile(
  profile: StudioSemanticProfile,
): SemanticProfileProjection {
  // Order-independent ranked demand: signals are already sorted by authority,
  // then confidence, then declared domain precedence, then stable key. The
  // stable key only stabilises the WORKING SET order; it is never authority.
  const ranked = profile.semanticSignals.filter(
    (signal) => signal.polarity === "positive" && !signal.defeatedByExclusion,
  );

  const demand = new Map<ExperienceDimensionId, string[]>();
  const rankOf = new Map<ExperienceDimensionId, SemanticRank>();
  const order: ExperienceDimensionId[] = [];
  for (const signal of ranked) {
    const dimension = dimensionOf(signal);
    if (!dimension) continue;
    const rank = semanticRankOf(signal);
    const existing = demand.get(dimension);
    if (existing) {
      existing.push(signal.key);
      const currentRank = rankOf.get(dimension)!;
      // A dimension inherits the STRONGEST rank among its contributing signals.
      if (compareSemanticRank(rank, currentRank) < 0) rankOf.set(dimension, rank);
      continue;
    }
    demand.set(dimension, [signal.key]);
    rankOf.set(dimension, rank);
    order.push(dimension);
  }

  const represented = order.slice(0, MAX_SELECTED_DIMENSIONS);
  const overflow = order.slice(MAX_SELECTED_DIMENSIONS);

  // Boundary analysis uses semantic rank ONLY — stable-id tiebreak excluded.
  const boundaryRank =
    overflow.length > 0 && represented.length > 0
      ? rankOf.get(represented[represented.length - 1])
      : undefined;

  const tiedDimensions: ExperienceDimensionId[] = [];
  let unresolved = false;
  if (boundaryRank) {
    const tiedOverflow = overflow.filter((dimension) =>
      semanticRankEquals(rankOf.get(dimension)!, boundaryRank),
    );
    if (tiedOverflow.length > 0) {
      unresolved = true;
      for (const dimension of order) {
        if (semanticRankEquals(rankOf.get(dimension)!, boundaryRank))
          tiedDimensions.push(dimension);
      }
    }
  }

  const deferred: DeferredDimension[] = overflow.map((dimension) => ({
    dimension,
    sourceSignals: [...(demand.get(dimension) ?? [])],
    reason:
      unresolved && boundaryRank && semanticRankEquals(rankOf.get(dimension)!, boundaryRank)
        ? ("equal-priority-capacity-boundary" as const)
        : ("lower-ranked-overflow" as const),
  }));

  const priorityBoundary: PriorityBoundary = unresolved
    ? { status: "unresolved-equal-rank", boundaryRank, tiedDimensions }
    : { status: "decisive", ...(boundaryRank ? { boundaryRank } : {}), tiedDimensions: [] };

  const rationale: string[] = [];
  for (const dimension of represented) {
    rationale.push(`represented:${dimension}:${(demand.get(dimension) ?? []).join("+")}`);
  }
  for (const entry of deferred) {
    rationale.push(
      `deferred:${entry.dimension}:${entry.sourceSignals.join("+")}:${entry.reason}`,
    );
  }
  rationale.push(
    `boundary:${priorityBoundary.status}` +
      (boundaryRank ? `:${formatRank(boundaryRank)}` : "") +
      (tiedDimensions.length > 0 ? `:tied=${tiedDimensions.join("+")}` : ""),
  );
  // Working-set order is deterministic for debugging only; it does not encode
  // traveller priority at an unresolved equal-rank boundary.
  rationale.push("note:represented-order-is-working-set-not-traveller-priority");

  const legacy = legacyProfile(profile);

  // FULL decision profile — no max-selected cap. The lead keeps the existing
  // semantics (the feeling leads the day, else the strongest demand does).
  const feelingLead = profile.feeling ? FEELING_TO_DIMENSION_MIRROR[profile.feeling] : null;
  const fullSelected: ExperienceDimensionId[] = [];
  if (feelingLead) fullSelected.push(feelingLead);
  for (const dimension of order) {
    if (!fullSelected.includes(dimension)) fullSelected.push(dimension);
  }
  const fullLeads = (feelingLead ? [feelingLead] : fullSelected.slice(0, 1)).slice(
    0,
    MAX_LEAD_DIMENSIONS,
  );
  const fullCandidate: ExperienceProfile | null =
    fullSelected.length > 0 ? { selected: fullSelected, leads: fullLeads } : null;
  const fullValidation = fullCandidate ? validateDecisionProfileContract(fullCandidate) : null;
  const fullDecisionProfile = fullValidation?.ok ? fullValidation.profile : null;

  return {
    experienceProfile: legacy,
    legacyCompatibilityProjection: legacy,
    fullDecisionProfile,
    represented,
    deferred,
    priorityBoundary,
    rationale,
  };
}

