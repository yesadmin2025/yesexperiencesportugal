import {
  REGION_STOP_POOL,
  type OptionalStop,
  type OptionalStopType,
} from "@/data/regionStopPool";
import {
  deriveLivingAtlasDimensions,
} from "@/components/studio-v3/livingAtlasInventory";
import {
  type ExperienceDimensionId,
  type ExperienceProfile,
  type LivingAtlasSignatureId,
  validateExperienceProfile,
} from "@/components/studio-v3/livingAtlasTaxonomy";

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
  /** Optional override from the active routing rule. */
  maxStopMinutes?: number;
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
  status: "complete" | "partial" | "impossible" | "invalid";
  anchorSignatureId: LivingAtlasSignatureId;
  moments: LivingAtlasComposedMoment[];
  totalDurationMin: number;
  targetMomentCount: number;
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

const DENSITY_RULES: Readonly<
  Record<LivingAtlasDensity, { targetCount: number; maxStopMinutes: number; rhythmTags: string[] }>
> = {
  slow: { targetCount: 3, maxStopMinutes: 300, rhythmTags: ["slow"] },
  balanced: { targetCount: 4, maxStopMinutes: 390, rhythmTags: ["balanced", "slow"] },
  rich: { targetCount: 5, maxStopMinutes: 480, rhythmTags: ["full", "immersive", "balanced"] },
};

function stopSourceTourIds(stop: OptionalStop): string[] {
  return [...new Set([stop.signatureTourId, ...(stop.sourceTourIds ?? [])].filter(Boolean))] as string[];
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

function candidatePool(
  request: LivingAtlasCompositionRequest,
): { candidates: OptionalStop[]; anchorFound: boolean } {
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

function targetCountFor(request: LivingAtlasCompositionRequest): number {
  const base = DENSITY_RULES[request.density].targetCount;
  return Math.max(base, request.requiredTypes?.length ?? 0, request.profile.selected.length);
}

/**
 * Compose a region-contained set of real moments before route ordering.
 *
 * The function is deterministic and AI-free. It guarantees that selected
 * dimensions are treated as coverage obligations, supports cross-category
 * replacement, and honours explicit quantity caps such as one winery.
 */
export function composeLivingAtlasDay(
  request: LivingAtlasCompositionRequest,
): LivingAtlasComposition {
  const validation = validateExperienceProfile(request.profile);
  const targetMomentCount = targetCountFor(request);
  if (!validation.ok) {
    return {
      status: "invalid",
      anchorSignatureId: request.anchorSignatureId,
      moments: [],
      totalDurationMin: 0,
      targetMomentCount,
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
  const maxStopMinutes = request.maxStopMinutes ?? DENSITY_RULES[request.density].maxStopMinutes;

  const canAdd = (candidate: ScoredStop, hard = false): boolean => {
    if (selected.some((item) => item.stop.id === candidate.stop.id)) return false;

    const group = candidate.stop.oneOfGroup;
    if (group && selected.some((item) => item.stop.oneOfGroup === group)) {
      rejected.push({ stopId: candidate.stop.id, reason: `one-of-group:${group}` });
      return false;
    }

    const cap = request.maxByType?.[candidate.stop.type];
    if (
      cap != null &&
      selected.filter((item) => item.stop.type === candidate.stop.type).length >= cap
    ) {
      rejected.push({ stopId: candidate.stop.id, reason: `type-cap:${candidate.stop.type}` });
      return false;
    }

    const nextDuration =
      selected.reduce((sum, item) => sum + item.stop.durationMin, 0) + candidate.stop.durationMin;
    if (!hard && nextDuration > maxStopMinutes) {
      rejected.push({ stopId: candidate.stop.id, reason: "duration-budget" });
      return false;
    }

    return true;
  };

  const addBest = (
    predicate: (candidate: ScoredStop) => boolean,
    hard = false,
  ): ScoredStop | null => {
    const candidate = scored.find((item) => predicate(item) && canAdd(item, hard));
    if (!candidate) return null;
    selected.push(candidate);
    return candidate;
  };

  let hardRequirementFailed = false;

  for (const stopId of request.mustIncludeStopIds ?? []) {
    const exact = scored.find((item) => item.stop.id === stopId) ?? null;
    if (!exact || !canAdd(exact, true)) {
      hardRequirementFailed = true;
      rejected.push({ stopId, reason: exact ? "hard-stop-conflict" : "hard-stop-not-found" });
      continue;
    }
    selected.push(exact);
  }

  const missingRequiredTypes: OptionalStopType[] = [];
  for (const type of request.requiredTypes ?? []) {
    if (selected.some((item) => item.stop.type === type)) continue;
    if (!addBest((item) => item.stop.type === type, true)) {
      missingRequiredTypes.push(type);
      hardRequirementFailed = true;
    }
  }

  for (const dimension of request.profile.leads) {
    if (selected.some((item) => coversDimension(item, dimension))) continue;
    addBest((item) => coversDimension(item, dimension), true);
  }

  for (const dimension of request.profile.selected.filter(
    (item) => !request.profile.leads.includes(item),
  )) {
    if (selected.some((item) => coversDimension(item, dimension))) continue;
    addBest((item) => coversDimension(item, dimension));
  }

  for (const candidate of scored) {
    if (selected.length >= targetMomentCount) break;
    if (canAdd(candidate)) selected.push(candidate);
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

  const totalDurationMin = selected.reduce((sum, item) => sum + item.stop.durationMin, 0);
  const status: LivingAtlasComposition["status"] = hardRequirementFailed
    ? "impossible"
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
    missingDimensions,
    missingRequiredTypes,
    rejected,
    routeOrderReady: false,
  };
}
