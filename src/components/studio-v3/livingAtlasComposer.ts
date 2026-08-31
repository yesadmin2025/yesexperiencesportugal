import { REGION_STOP_POOL, type OptionalStop, type OptionalStopType } from "@/data/regionStopPool";
import { deriveLivingAtlasDimensions } from "@/components/studio-v3/livingAtlasInventory";
import {
  type ExperienceDimensionId,
  type ExperienceProfile,
  type LivingAtlasSignatureId,
  validateExperienceProfile,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import type { Rhythm } from "@/components/studio-v3/types";
import {
  DURATION_ENVELOPES,
  type ComposedTiming,
  type ResolvedDurationClass,
  type ResolvedTimeBudget,
  type TimingConflict,
  type TimingConflictOption,
  type UnfittedRequest,
} from "@/lib/studio-v3/timeDomain";
import { resolveTimeBudget } from "@/lib/studio-v3/resolveTimeBudget";
import {
  describeRequestedDimensions,
  projectPlanningTiming,
  type TimingMomentInput,
} from "@/lib/studio-v3/timingProjection";

export type LivingAtlasDensity = "slow" | "balanced" | "rich";

export type LivingAtlasCompositionRequest = {
  anchorSignatureId: LivingAtlasSignatureId;
  profile: ExperienceProfile;
  density: LivingAtlasDensity;
  /** Hard activity requirements created by contextual questions. */
  requiredTypes?: OptionalStopType[];
  /** Soft activity preferences used after coverage obligations. */
  preferredTypes?: OptionalStopType[];
  /** Explicit exclusions, e.g. no boat or no winery. */
  excludedTypes?: OptionalStopType[];
  /** Quantity controls, e.g. `{ winery: 1 }`. */
  maxByType?: Partial<Record<OptionalStopType, number>>;
  /** Exact verified moments that must remain in the draft. */
  mustIncludeStopIds?: string[];
  /** Used by tests and future server inventory. Defaults to the verified pool. */
  pool?: readonly OptionalStop[];
  /**
   * @deprecated BUILD 1 / Pass 2 — no longer authoritative. Time fit is decided
   * exclusively by `timeBudget`. Retained only so existing callers still
   * type-check; it is IGNORED by admission, fill and status.
   */
  maxStopMinutes?: number;
  /**
   * Explicit truthful budget. When absent it is resolved deterministically
   * from the anchor Signature skeleton (Pass-1 resolver).
   */
  timeBudget?: ResolvedTimeBudget;
  /**
   * Pace/depth ONLY — it shapes dwell and slack, never day length. When
   * absent it is derived from `density` for backward compatibility.
   */
  rhythm?: Rhythm;
};

export type LivingAtlasComposedMoment = {
  stopId: string;
  label: string;
  type: OptionalStopType;
  durationMin: number;
  region: OptionalStop["region"];
  routeCluster: string | null;
  sourceTourIds: string[];
  dimensions: ExperienceDimensionId[];
  score: number;
  reasons: string[];
};

export type LivingAtlasComposition = {
  status: "complete" | "partial" | "impossible" | "invalid" | "tradeoff";
  anchorSignatureId: LivingAtlasSignatureId;
  moments: LivingAtlasComposedMoment[];
  /**
   * LEGACY dwell subtotal: the plain sum of `OptionalStop.durationMin`. It has
   * always meant only that and is NOT repurposed. The truthful day total is
   * `planningTiming.totalMinutes` (dwell + internal travel + internal slack).
   */
  totalDurationMin: number;
  /**
   * @deprecated BUILD 1 / Pass 2 — diagnostics/compatibility only. NON-BINDING:
   * it never decides admission, fill termination, status or conflicts.
   */
  targetMomentCount: number;
  /** Truthful planning-stage timing of the selected moments. */
  planningTiming: ComposedTiming;
  /** Populated when a real obligation cannot fit the truthful envelope. */
  conflict: TimingConflict | null;
  missingDimensions: ExperienceDimensionId[];
  missingRequiredTypes: OptionalStopType[];
  rejected: Array<{ stopId: string; reason: string }>;
  /** Selection is valid, but geographic visit order is a later routing step. */
  routeOrderReady: false;
  validationError?: string;
};

type ScoredStop = {
  stop: OptionalStop;
  dimensions: ExperienceDimensionId[];
  score: number;
  reasons: string[];
  poolIndex: number;
};

/**
 * BUILD 1 / Pass 2 — RETIRED COUNT AUTHORITY.
 *
 * `legacyTargetCount` is a legacy compatibility value, read ONLY to populate
 * the deprecated `targetMomentCount` output field. `rhythmTags` remains a live
 * SCORING signal (preference), never a fit rule. No minute cap lives here.
 */
const DENSITY_RULES: Readonly<
  Record<LivingAtlasDensity, { legacyTargetCount: number; rhythmTags: string[] }>
> = {
  slow: { legacyTargetCount: 3, rhythmTags: ["slow"] },
  balanced: { legacyTargetCount: 4, rhythmTags: ["balanced", "slow"] },
  rich: {
    legacyTargetCount: 5,
    rhythmTags: ["full", "immersive", "balanced"],
  },
};

/**
 * Pace fallback ONLY. This mapping must NEVER influence the resolved duration
 * budget — day length comes exclusively from `resolveTimeBudget`.
 */
const DENSITY_TO_RHYTHM: Readonly<Record<LivingAtlasDensity, Rhythm>> = {
  slow: "slow",
  balanced: "balanced",
  rich: "full",
};

const DURATION_CLASS_LADDER: readonly ResolvedDurationClass[] = [
  "half-day",
  "medium",
  "full-day",
  "extended",
] as const;

function stopSourceTourIds(stop: OptionalStop): string[] {
  return [
    ...new Set([stop.signatureTourId, ...(stop.sourceTourIds ?? [])].filter(Boolean)),
  ] as string[];
}

function coversDimension(stop: ScoredStop, dimension: ExperienceDimensionId): boolean {
  return stop.dimensions.includes(dimension);
}

function scoreStop(
  stop: OptionalStop,
  poolIndex: number,
  request: LivingAtlasCompositionRequest,
): ScoredStop {
  const dimensions = deriveLivingAtlasDimensions({
    label: stop.name,
    intentionTags: stop.suitsInterests,
    // Pass 3: verified capabilities are authoritative for hands-on semantics.
    capabilities: stop.capabilities ?? [],
  });
  const reasons: string[] = [];
  let score = 0;

  for (const lead of request.profile.leads) {
    if (dimensions.includes(lead)) {
      score += 36;
      reasons.push(`lead:${lead}`);
    }
  }

  for (const support of request.profile.selected.filter(
    (dimension) => !request.profile.leads.includes(dimension),
  )) {
    if (dimensions.includes(support)) {
      score += 16;
      reasons.push(`support:${support}`);
    }
  }

  const sourceTourIds = stopSourceTourIds(stop);
  if (sourceTourIds.includes(request.anchorSignatureId)) {
    score += 9;
    reasons.push("anchor-source");
  }

  if ((request.preferredTypes ?? []).includes(stop.type)) {
    score += 10;
    reasons.push(`preferred-type:${stop.type}`);
  }

  if ((request.requiredTypes ?? []).includes(stop.type)) {
    score += 24;
    reasons.push(`required-type:${stop.type}`);
  }

  const densityRule = DENSITY_RULES[request.density];
  if (stop.suitsRhythm.some((tag) => densityRule.rhythmTags.includes(tag))) {
    score += 5;
    reasons.push(`density:${request.density}`);
  }

  if (stop.source === "signature-core") {
    score += 3;
    reasons.push("verified-signature-core");
  }

  return { stop, dimensions, score, reasons, poolIndex };
}

function candidatePool(request: LivingAtlasCompositionRequest): {
  candidates: OptionalStop[];
  anchorFound: boolean;
} {
  const pool = request.pool ?? REGION_STOP_POOL;
  const active = pool.filter((stop) => stop.active);
  const anchors = active.filter((stop) =>
    stopSourceTourIds(stop).includes(request.anchorSignatureId),
  );
  if (anchors.length === 0) return { candidates: [], anchorFound: false };

  const anchorRegions = new Set(anchors.map((stop) => stop.region));
  const anchorClusters = new Set(
    anchors.map((stop) => stop.routeCluster).filter((value): value is string => Boolean(value)),
  );

  const candidates = active.filter((stop) => {
    if ((request.excludedTypes ?? []).includes(stop.type)) return false;
    if (!anchorRegions.has(stop.region)) return false;

    const belongsToAnchor = stopSourceTourIds(stop).includes(request.anchorSignatureId);
    if (anchorClusters.size === 0) return belongsToAnchor;
    return belongsToAnchor || Boolean(stop.routeCluster && anchorClusters.has(stop.routeCluster));
  });

  return { candidates, anchorFound: true };
}
/**
 * @deprecated BUILD 1 / Pass 2 — compatibility output only.
 *
 * Retained ONLY to populate `LivingAtlasComposition.targetMomentCount`. It is
 * never consulted by `structuralReason`, admission, fill termination, status,
 * timing validity or conflict construction. The number of moments is an OUTPUT
 * of truthful time.
 */
function legacyTargetMomentCount(request: LivingAtlasCompositionRequest): number {
  const base = DENSITY_RULES[request.density].legacyTargetCount;
  return Math.max(base, request.requiredTypes?.length ?? 0, request.profile.selected.length);
}

/**
 * Convert a scored inventory stop into timing truth. No invention: dwell comes
 * from real inventory minutes, meals are proven by `type === "table"` only, and
 * no canonical `travelToNextMinutes` is fabricated — the projection falls back
 * to the shared geo estimate or the conservative default.
 */
function toTimingMomentInput(item: ScoredStop): TimingMomentInput {
  return {
    stopId: item.stop.id,
    sourceTourIds: stopSourceTourIds(item.stop),
    label: item.stop.name,
    inventoryDurationMinutes: item.stop.durationMin,
    coords: item.stop.coords ?? null,
    isMeal: item.stop.type === "table",
  };
}

/**
 * PLANNING ESTIMATE ONLY. Route ordering is a later step (Pass 3/5), so this
 * pass uses one deterministic non-public planning sequence — stable
 * `poolIndex` — purely so travel legs are reproducible. It is never a
 * traveller-facing promised order.
 */
function projectSelection(
  items: readonly ScoredStop[],
  budget: ResolvedTimeBudget,
  rhythm: Rhythm,
): ComposedTiming {
  const ordered = [...items].sort(
    (a, b) => a.poolIndex - b.poolIndex || a.stop.id.localeCompare(b.stop.id),
  );
  return projectPlanningTiming({
    moments: ordered.map(toTimingMomentInput),
    budget,
    rhythm,
  });
}

type BlockedCandidateCost = {
  stopId: string;
  /**
   * Truthful extra minutes required AT THE MOMENT the obligation failed,
   * measured against the obligation envelope ceiling and captured before any
   * discretionary filler exists. Never recomputed later, never guessed.
   */
  totalCostMinutes: number;
};

type TimeBlockedObligation = {
  dimension: ExperienceDimensionId | null;
  candidates: ScoredStop[];
  /** Costs frozen at the failure point (see BlockedCandidateCost). */
  candidateCosts: BlockedCandidateCost[];
  /** Structural nature of the obligation, for conflict classification. */
  origin: "must-include" | "required-type" | "dimension";
};


/**
 * Compose a region-contained set of real moments before route ordering.
 *
 * The function is deterministic and AI-free. TIME is the governing validity
 * authority (BUILD 1 / Pass 2): a moment is admitted when truthful projected
 * dwell + internal travel + internal slack still fits the resolved envelope.
 * Stop count is an output, never a target.
 */
export function composeLivingAtlasDay(
  request: LivingAtlasCompositionRequest,
): LivingAtlasComposition {
  const validation = validateExperienceProfile(request.profile);
  const targetMomentCount = legacyTargetMomentCount(request);

  // Duration is resolved independently of rhythm and density.
  const budget =
    request.timeBudget ?? resolveTimeBudget({ skeletonTourId: request.anchorSignatureId });
  const rhythm: Rhythm = request.rhythm ?? DENSITY_TO_RHYTHM[request.density];
  const emptyTiming = projectSelection([], budget, rhythm);

  if (!validation.ok) {
    return {
      status: "invalid",
      anchorSignatureId: request.anchorSignatureId,
      moments: [],
      totalDurationMin: 0,
      targetMomentCount,
      planningTiming: emptyTiming,
      conflict: null,
      missingDimensions: [...request.profile.selected],
      missingRequiredTypes: [...(request.requiredTypes ?? [])],
      rejected: [],
      routeOrderReady: false,
      validationError: validation.reason,
    };
  }

  const { candidates, anchorFound } = candidatePool(request);
  if (!anchorFound) {
    return {
      status: "impossible",
      anchorSignatureId: request.anchorSignatureId,
      moments: [],
      totalDurationMin: 0,
      targetMomentCount,
      planningTiming: emptyTiming,
      conflict: null,
      missingDimensions: [...request.profile.selected],
      missingRequiredTypes: [...(request.requiredTypes ?? [])],
      rejected: [],
      routeOrderReady: false,
      validationError: "anchor-has-no-verified-stops",
    };
  }

  const scored = candidates
    .map((stop, index) => scoreStop(stop, index, request))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.poolIndex !== b.poolIndex) return a.poolIndex - b.poolIndex;
      return a.stop.id.localeCompare(b.stop.id);
    });

  const selected: ScoredStop[] = [];
  const rejected: Array<{ stopId: string; reason: string }> = [];
  const timeBlocked: TimeBlockedObligation[] = [];

  const pushRejected = (stopId: string, reason: string): void => {
    if (rejected.some((entry) => entry.stopId === stopId && entry.reason === reason)) return;
    rejected.push({ stopId, reason });
  };

  /**
   * Structural constraints are evaluated FIRST and are independent of time:
   * duplicates, one-of groups and per-type caps.
   */
  const structuralReason = (candidate: ScoredStop): string | null => {
    if (selected.some((item) => item.stop.id === candidate.stop.id)) return "already-selected";

    const group = candidate.stop.oneOfGroup;
    if (group && selected.some((item) => item.stop.oneOfGroup === group)) {
      return `one-of-group:${group}`;
    }

    const cap = request.maxByType?.[candidate.stop.type];
    if (
      cap != null &&
      selected.filter((item) => item.stop.type === candidate.stop.type).length >= cap
    ) {
      return `type-cap:${candidate.stop.type}`;
    }

    return null;
  };

  const projectedMinutesWith = (candidate: ScoredStop): number =>
    projectSelection([...selected, candidate], budget, rhythm).totalMinutes;

  /**
   * Ceiling for satisfying an EXPLICIT traveller obligation: the truthful
   * envelope maximum, which preserves the owner's "about 4h / about 6h /
   * 8–9h" language without letting optional filler bloat past the target.
   */
  const obligationCeiling = budget.maxMinutes;
  /** Ceiling for discretionary/supporting fill: the chosen target itself. */
  const discretionaryCeiling = budget.availableExperienceMinutes;

  /** Cost of admitting `candidate` right now, frozen at this failure point. */
  const blockedCostAtFailure = (candidate: ScoredStop): BlockedCandidateCost => ({
    stopId: candidate.stop.id,
    totalCostMinutes: Math.max(1, projectedMinutesWith(candidate) - obligationCeiling),
  });

  const sortCosts = (costs: BlockedCandidateCost[]): BlockedCandidateCost[] =>
    [...costs].sort(
      (a, b) => a.totalCostMinutes - b.totalCostMinutes || a.stopId.localeCompare(b.stopId),
    );

  const attemptObligation = (
    predicate: (candidate: ScoredStop) => boolean,
  ): {
    added: ScoredStop | null;
    eligible: ScoredStop[];
    costs: BlockedCandidateCost[];
  } => {
    const eligible: ScoredStop[] = [];
    const costs: BlockedCandidateCost[] = [];
    for (const candidate of scored) {
      if (!predicate(candidate)) continue;
      const reason = structuralReason(candidate);
      if (reason) {
        if (reason !== "already-selected") pushRejected(candidate.stop.id, reason);
        continue;
      }
      eligible.push(candidate);
      if (projectedMinutesWith(candidate) <= obligationCeiling) {
        selected.push(candidate);
        return { added: candidate, eligible, costs };
      }
      costs.push(blockedCostAtFailure(candidate));
      pushRejected(candidate.stop.id, "time-envelope");
    }
    return { added: null, eligible, costs: sortCosts(costs) };
  };


  let hardRequirementFailed = false;

  // 1 · Exact must-include moments.
  for (const stopId of request.mustIncludeStopIds ?? []) {
    const exact = scored.find((item) => item.stop.id === stopId) ?? null;
    if (!exact) {
      hardRequirementFailed = true;
      pushRejected(stopId, "hard-stop-not-found");
      continue;
    }
    const reason = structuralReason(exact);
    if (reason === "already-selected") continue;
    if (reason) {
      hardRequirementFailed = true;
      pushRejected(stopId, "hard-stop-conflict");
      continue;
    }
    if (projectedMinutesWith(exact) <= obligationCeiling) {
      selected.push(exact);
      continue;
    }
    // The moment exists and is structurally admissible — this is a TIME
    // tradeoff, never a structural impossibility and never a silent drop.
    pushRejected(stopId, "time-envelope");
    timeBlocked.push({
      dimension: exact.dimensions[0] ?? null,
      candidates: [exact],
      candidateCosts: [blockedCostAtFailure(exact)],
      origin: "must-include",
    });
  }

  // 2 · Required activity types.
  const missingRequiredTypes: OptionalStopType[] = [];
  for (const type of request.requiredTypes ?? []) {
    if (selected.some((item) => item.stop.type === type)) continue;
    const attempt = attemptObligation((item) => item.stop.type === type);
    if (attempt.added) continue;
    missingRequiredTypes.push(type);
    if (attempt.eligible.length > 0) {
      timeBlocked.push({
        dimension: attempt.eligible[0]?.dimensions[0] ?? null,
        candidates: attempt.eligible,
        candidateCosts: attempt.costs,
        origin: "required-type",
      });
    } else {
      hardRequirementFailed = true;
    }
  }

  // 3 · Lead dimensions.
  for (const dimension of request.profile.leads) {
    if (selected.some((item) => coversDimension(item, dimension))) continue;
    const attempt = attemptObligation((item) => coversDimension(item, dimension));
    if (!attempt.added && attempt.eligible.length > 0) {
      timeBlocked.push({
        dimension,
        candidates: attempt.eligible,
        candidateCosts: attempt.costs,
        origin: "dimension",
      });
    }
  }

  // 4 · Remaining selected/supporting dimensions.
  for (const dimension of request.profile.selected.filter(
    (item) => !request.profile.leads.includes(item),
  )) {
    if (selected.some((item) => coversDimension(item, dimension))) continue;
    const attempt = attemptObligation((item) => coversDimension(item, dimension));
    if (!attempt.added && attempt.eligible.length > 0) {
      timeBlocked.push({
        dimension,
        candidates: attempt.eligible,
        candidateCosts: attempt.costs,
        origin: "dimension",
      });
    }
  }

  // Obligation costs (steps 1–4) were already frozen at their failure points,
  // so discretionary filler below can never inflate a reported conflict.



  // 5 · Discretionary scored filler. No count target, and no early break — a
  //     later, shorter candidate may still fit after a longer one did not.
  for (const candidate of scored) {
    const reason = structuralReason(candidate);
    if (reason) {
      if (reason !== "already-selected") pushRejected(candidate.stop.id, reason);
      continue;
    }
    if (projectedMinutesWith(candidate) <= discretionaryCeiling) {
      selected.push(candidate);
      continue;
    }
    pushRejected(candidate.stop.id, "time-envelope");
  }

  const coverage = new Map<ExperienceDimensionId, string[]>();
  for (const dimension of request.profile.selected) coverage.set(dimension, []);
  for (const item of selected) {
    for (const dimension of item.dimensions) {
      if (coverage.has(dimension)) coverage.get(dimension)!.push(item.stop.id);
    }
  }

  const missingDimensions = request.profile.selected.filter(
    (dimension) => (coverage.get(dimension)?.length ?? 0) === 0,
  );

  const planningTiming = projectSelection(selected, budget, rhythm);
  const totalDurationMin = selected.reduce((sum, item) => sum + item.stop.durationMin, 0);

  const conflict = buildTimingConflict({
    request,
    selected,
    timeBlocked,
    budget,
  });


  const status: LivingAtlasComposition["status"] = hardRequirementFailed
    ? "impossible"
    : conflict
      ? "tradeoff"
      : missingDimensions.length > 0 || missingRequiredTypes.length > 0
        ? "partial"
        : "complete";

  const moments = [...selected]
    .sort((a, b) => a.poolIndex - b.poolIndex)
    .map<LivingAtlasComposedMoment>((item) => ({
      stopId: item.stop.id,
      label: item.stop.name,
      type: item.stop.type,
      durationMin: item.stop.durationMin,
      region: item.stop.region,
      routeCluster: item.stop.routeCluster ?? null,
      sourceTourIds: stopSourceTourIds(item.stop),
      dimensions: item.dimensions,
      score: item.score,
      reasons: item.reasons,
    }));

  return {
    status,
    anchorSignatureId: request.anchorSignatureId,
    moments,
    totalDurationMin,
    targetMomentCount,
    planningTiming,
    conflict,
    missingDimensions,
    missingRequiredTypes,
    rejected,
    routeOrderReady: false,
  };
}

/* ------------------------------------------------------------------ *
 * Conflict construction — truthful data only
 * ------------------------------------------------------------------ */

function buildTimingConflict(input: {
  request: LivingAtlasCompositionRequest;
  selected: readonly ScoredStop[];
  timeBlocked: readonly TimeBlockedObligation[];
  budget: ResolvedTimeBudget;
}): TimingConflict | null {
  const { request, selected, timeBlocked, budget } = input;
  if (timeBlocked.length === 0) return null;

  const coverageByStopId: Record<string, ExperienceDimensionId[]> = {};
  for (const item of selected) coverageByStopId[item.stop.id] = item.dimensions;

  const requestedDimensions = describeRequestedDimensions({
    requestedDimensions: request.profile.selected,
    coverageByStopId,
  });

  const fallbackDimension =
    request.profile.leads[0] ?? request.profile.selected[0] ?? null;

  const unfittedRequests: UnfittedRequest[] = [];
  for (const blocked of timeBlocked) {
    const dimension = blocked.dimension ?? fallbackDimension;
    if (!dimension) continue;
    // Costs were frozen AT THE FAILURE POINT, before any discretionary filler
    // existed, and are already sorted by cost then stable id. They are never
    // recomputed against the final composition, never guessed, never AI.
    const costs = blocked.candidateCosts;
    if (costs.length === 0) continue;
    unfittedRequests.push({
      dimension,
      candidateStopIds: costs.map((entry) => entry.stopId),
      minimumExtraMinutesNeeded: costs[0]!.totalCostMinutes,
    });
  }


  if (unfittedRequests.length === 0) return null;

  const cheapestExtra = Math.min(
    ...unfittedRequests.map((entry) => entry.minimumExtraMinutesNeeded),
  );

  const options: TimingConflictOption[] = [];

  // extend-duration is offered ONLY when a real next envelope would actually
  // create enough headroom. `extended` stays internal data, never UI.
  const requiredCeiling = budget.maxMinutes + cheapestExtra;
  for (const cls of DURATION_CLASS_LADDER) {
    const envelope = DURATION_ENVELOPES[cls];
    if (envelope.maxMinutes <= budget.maxMinutes) continue;
    if (envelope.maxMinutes >= requiredCeiling) {
      options.push({
        option: "extend-duration",
        toClass: cls,
        extraMinutesGained: envelope.maxMinutes - budget.maxMinutes,
      });
      break;
    }
  }

  // Two or more genuine obligations competing for the same envelope.
  if (timeBlocked.length >= 2) {
    const anchorStopIds = [
      ...new Set(unfittedRequests.map((entry) => entry.candidateStopIds[0]!).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));
    if (anchorStopIds.length >= 2) {
      options.push({ option: "choose-between-anchors", anchorStopIds });
    }
  }

  // No `swap-moment`: this pass cannot PROVE a replacement recovers enough
  // minutes without removing another obligation, so it is omitted, not invented.
  // No `shorten-dwell`: verified dwell is never compressed.

  const structuralOrigins = timeBlocked.filter((entry) => entry.origin !== "dimension");
  const kind: TimingConflict["kind"] =
    timeBlocked.length >= 2
      ? "competing-anchors"
      : structuralOrigins.length > 0
        ? "unfittable-required-type"
        : "time-overflow";

  return {
    kind,
    stage: "planning",
    requestedDimensions,
    unfittedRequests,
    // Minimum truthful headroom needed to resolve the cheapest blocked
    // obligation, measured against the valid envelope ceiling.
    overflowMinutes: cheapestExtra,
    options,
  };
}
