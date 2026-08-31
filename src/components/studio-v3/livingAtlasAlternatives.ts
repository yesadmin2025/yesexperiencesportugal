import type { OptionalStop, OptionalStopType } from "@/data/regionStopPool";
import { deriveLivingAtlasDimensions } from "@/components/studio-v3/livingAtlasInventory";
import type {
  LivingAtlasComposedMoment,
  LivingAtlasComposition,
  LivingAtlasCompositionRequest,
} from "@/components/studio-v3/livingAtlasComposer";
import type { ExperienceDimensionId } from "@/components/studio-v3/livingAtlasTaxonomy";

export type LivingAtlasReplacementMap = Record<string, string>;

export type LivingAtlasResolvedMoment = LivingAtlasComposedMoment & {
  /** Stable identity for the original itinerary position. */
  slotId: string;
  /** Original stop replaced in this slot, or null when unchanged. */
  replacedStopId: string | null;
  originalLabel: string | null;
};

export type LivingAtlasResolvedComposition = Omit<LivingAtlasComposition, "moments"> & {
  moments: LivingAtlasResolvedMoment[];
  appliedReplacements: LivingAtlasReplacementMap;
  ignoredReplacements: Array<{ slotId: string; stopId: string; reason: string }>;
};

export type LivingAtlasMomentAlternative = {
  slotId: string;
  replacesStopId: string;
  moment: LivingAtlasResolvedMoment;
  durationDeltaMin: number;
  keepsDimensions: ExperienceDimensionId[];
  addsDimensions: ExperienceDimensionId[];
  explanation: string;
  score: number;
};

export type LivingAtlasAlternativesBySlot = Record<string, LivingAtlasMomentAlternative[]>;

const DENSITY_MAX_STOP_MINUTES: Readonly<Record<LivingAtlasCompositionRequest["density"], number>> =
  {
    slow: 300,
    balanced: 390,
    rich: 480,
  };

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function stopSourceTourIds(stop: OptionalStop): string[] {
  return [
    ...new Set([stop.signatureTourId, ...(stop.sourceTourIds ?? [])].filter(Boolean)),
  ] as string[];
}

function momentFromStop(
  stop: OptionalStop,
  slotId: string,
  original: LivingAtlasComposedMoment,
): LivingAtlasResolvedMoment {
  const dimensions = deriveLivingAtlasDimensions({
    label: stop.name,
    intentionTags: stop.suitsInterests,
    // Pass 3: verified capabilities are authoritative for hands-on semantics.
    capabilities: stop.capabilities ?? [],
  });

  return {
    stopId: stop.id,
    slotId,
    replacedStopId: stop.id === original.stopId ? null : original.stopId,
    originalLabel: stop.id === original.stopId ? null : original.label,
    label: stop.name,
    type: stop.type,
    durationMin: stop.durationMin,
    region: stop.region,
    routeCluster: stop.routeCluster ?? null,
    sourceTourIds: stopSourceTourIds(stop),
    dimensions,
    score: original.score,
    reasons:
      stop.id === original.stopId
        ? original.reasons
        : unique([...original.reasons, "traveller-validated-replacement"]),
  };
}

function baseResolvedMoment(moment: LivingAtlasComposedMoment): LivingAtlasResolvedMoment {
  return {
    ...moment,
    slotId: moment.stopId,
    replacedStopId: null,
    originalLabel: null,
  };
}

function sameRouteBoundary(moment: LivingAtlasResolvedMoment, candidate: OptionalStop): boolean {
  if (candidate.region !== moment.region) return false;
  if (!moment.routeCluster) return true;
  return candidate.routeCluster === moment.routeCluster;
}

function validateMomentSet(input: {
  moments: LivingAtlasResolvedMoment[];
  baseComposition: LivingAtlasComposition;
  request: LivingAtlasCompositionRequest;
  pool: readonly OptionalStop[];
}): { ok: boolean; status: LivingAtlasComposition["status"]; reason?: string } {
  const { moments, baseComposition, request, pool } = input;
  const stopById = new Map(pool.map((stop) => [stop.id, stop]));
  const ids = moments.map((moment) => moment.stopId);

  if (new Set(ids).size !== ids.length)
    return { ok: false, status: "invalid", reason: "duplicate-stop" };

  for (const moment of moments) {
    const stop = stopById.get(moment.stopId);
    if (!stop || !stop.active)
      return { ok: false, status: "invalid", reason: "inactive-or-missing-stop" };
  }

  const groups = new Set<string>();
  for (const moment of moments) {
    const group = stopById.get(moment.stopId)?.oneOfGroup;
    if (!group) continue;
    if (groups.has(group)) return { ok: false, status: "invalid", reason: `one-of-group:${group}` };
    groups.add(group);
  }

  for (const [type, cap] of Object.entries(request.maxByType ?? {})) {
    if (cap == null) continue;
    const count = moments.filter((moment) => moment.type === type).length;
    if (count > cap) return { ok: false, status: "invalid", reason: `type-cap:${type}` };
  }

  for (const stopId of request.mustIncludeStopIds ?? []) {
    if (!ids.includes(stopId))
      return { ok: false, status: "impossible", reason: `required-stop:${stopId}` };
  }

  for (const type of request.requiredTypes ?? []) {
    if (!moments.some((moment) => moment.type === type)) {
      return { ok: false, status: "impossible", reason: `required-type:${type}` };
    }
  }

  const allowedDuration = Math.max(
    request.maxStopMinutes ?? DENSITY_MAX_STOP_MINUTES[request.density],
    baseComposition.totalDurationMin,
  );
  const totalDuration = moments.reduce((sum, moment) => sum + moment.durationMin, 0);
  if (totalDuration > allowedDuration) {
    return { ok: false, status: "invalid", reason: "duration-budget" };
  }

  const missingDimensions = request.profile.selected.filter(
    (dimension) => !moments.some((moment) => moment.dimensions.includes(dimension)),
  );
  if (missingDimensions.length > baseComposition.missingDimensions.length) {
    return { ok: false, status: "partial", reason: "coverage-regression" };
  }

  return {
    ok: true,
    status: missingDimensions.length > 0 ? "partial" : "complete",
  };
}

function resolvedCompositionFrom(input: {
  baseComposition: LivingAtlasComposition;
  moments: LivingAtlasResolvedMoment[];
  appliedReplacements: LivingAtlasReplacementMap;
  ignoredReplacements: LivingAtlasResolvedComposition["ignoredReplacements"];
  request: LivingAtlasCompositionRequest;
}): LivingAtlasResolvedComposition {
  const { baseComposition, moments, appliedReplacements, ignoredReplacements, request } = input;
  const totalDurationMin = moments.reduce((sum, moment) => sum + moment.durationMin, 0);
  const missingDimensions = request.profile.selected.filter(
    (dimension) => !moments.some((moment) => moment.dimensions.includes(dimension)),
  );
  const missingRequiredTypes = (request.requiredTypes ?? []).filter(
    (type) => !moments.some((moment) => moment.type === type),
  );
  const missingRequiredStops = (request.mustIncludeStopIds ?? []).filter(
    (stopId) => !moments.some((moment) => moment.stopId === stopId),
  );

  const status: LivingAtlasComposition["status"] =
    baseComposition.status === "invalid"
      ? "invalid"
      : missingRequiredStops.length > 0 || missingRequiredTypes.length > 0
        ? "impossible"
        : missingDimensions.length > 0
          ? "partial"
          : "complete";

  return {
    ...baseComposition,
    status,
    moments,
    totalDurationMin,
    missingDimensions,
    missingRequiredTypes,
    appliedReplacements,
    ignoredReplacements,
  };
}

/**
 * Applies traveller substitutions one slot at a time. Every accepted change is
 * revalidated against the same region, route cluster, coverage, quantity and
 * duration rules that created the original day.
 */
export function applyLivingAtlasReplacements(input: {
  baseComposition: LivingAtlasComposition;
  request: LivingAtlasCompositionRequest;
  replacements?: LivingAtlasReplacementMap;
  pool: readonly OptionalStop[];
}): LivingAtlasResolvedComposition {
  const { baseComposition, request, pool } = input;
  const requested = input.replacements ?? {};
  let moments = baseComposition.moments.map(baseResolvedMoment);
  const stopById = new Map(pool.map((stop) => [stop.id, stop]));
  const appliedReplacements: LivingAtlasReplacementMap = {};
  const ignoredReplacements: LivingAtlasResolvedComposition["ignoredReplacements"] = [];

  if (baseComposition.status === "invalid" || baseComposition.status === "impossible") {
    return resolvedCompositionFrom({
      baseComposition,
      moments,
      appliedReplacements,
      ignoredReplacements,
      request,
    });
  }

  for (const original of baseComposition.moments) {
    const slotId = original.stopId;
    const replacementId = requested[slotId];
    if (!replacementId || replacementId === original.stopId) continue;

    const candidate = stopById.get(replacementId);
    const current = moments.find((moment) => moment.slotId === slotId);
    if (!candidate || !candidate.active || !current) {
      ignoredReplacements.push({ slotId, stopId: replacementId, reason: "missing-or-inactive" });
      continue;
    }
    if (!sameRouteBoundary(current, candidate)) {
      ignoredReplacements.push({ slotId, stopId: replacementId, reason: "route-boundary" });
      continue;
    }
    if (moments.some((moment) => moment.slotId !== slotId && moment.stopId === replacementId)) {
      ignoredReplacements.push({ slotId, stopId: replacementId, reason: "duplicate-stop" });
      continue;
    }

    const proposed = moments.map((moment) =>
      moment.slotId === slotId ? momentFromStop(candidate, slotId, original) : moment,
    );
    const validation = validateMomentSet({ moments: proposed, baseComposition, request, pool });
    if (!validation.ok) {
      ignoredReplacements.push({
        slotId,
        stopId: replacementId,
        reason: validation.reason ?? "invalid-replacement",
      });
      continue;
    }

    moments = proposed;
    appliedReplacements[slotId] = replacementId;
  }

  return resolvedCompositionFrom({
    baseComposition,
    moments,
    appliedReplacements,
    ignoredReplacements,
    request,
  });
}

function alternativeExplanation(input: {
  keepsDimensions: ExperienceDimensionId[];
  addsDimensions: ExperienceDimensionId[];
  durationDeltaMin: number;
  typeChanged: boolean;
}): string {
  const fragments: string[] = [];
  if (input.keepsDimensions.length > 0) fragments.push("keeps your selected threads intact");
  if (input.addsDimensions.length > 0) fragments.push("brings another selected thread forward");
  if (input.typeChanged) fragments.push("changes the texture of the day");
  if (input.durationDeltaMin === 0) fragments.push("without changing the timing");
  else if (input.durationDeltaMin < 0)
    fragments.push(`frees ${Math.abs(input.durationDeltaMin)} minutes`);
  else fragments.push(`uses ${input.durationDeltaMin} more minutes`);
  return `${fragments.join(", ")}.`;
}

function alternativeScore(input: {
  candidate: OptionalStop;
  moment: LivingAtlasResolvedMoment;
  request: LivingAtlasCompositionRequest;
  durationDeltaMin: number;
}): number {
  const dimensions = deriveLivingAtlasDimensions({
    label: input.candidate.name,
    intentionTags: input.candidate.suitsInterests,
    capabilities: input.candidate.capabilities ?? [],
  });
  let score = 0;

  for (const lead of input.request.profile.leads) {
    if (dimensions.includes(lead)) score += 30;
  }
  for (const support of input.request.profile.selected.filter(
    (dimension) => !input.request.profile.leads.includes(dimension),
  )) {
    if (dimensions.includes(support)) score += 12;
  }
  if ((input.request.preferredTypes ?? []).includes(input.candidate.type)) score += 8;
  if (input.candidate.type !== input.moment.type) score += 5;
  if (input.candidate.source === "signature-core") score += 3;
  score -= Math.floor(Math.abs(input.durationDeltaMin) / 15);
  return score;
}

/** Returns at most two safe, deterministic alternatives for each live slot. */
export function buildLivingAtlasAlternatives(input: {
  baseComposition: LivingAtlasComposition;
  composition: LivingAtlasResolvedComposition;
  request: LivingAtlasCompositionRequest;
  replacements?: LivingAtlasReplacementMap;
  pool: readonly OptionalStop[];
}): LivingAtlasAlternativesBySlot {
  const { baseComposition, composition, request, pool } = input;
  const currentReplacements = input.replacements ?? composition.appliedReplacements;
  const selectedIds = new Set(composition.moments.map((moment) => moment.stopId));
  const result: LivingAtlasAlternativesBySlot = {};

  for (const moment of composition.moments) {
    const original = baseComposition.moments.find((item) => item.stopId === moment.slotId);
    if (!original) continue;

    const alternatives = pool
      .filter(
        (candidate) =>
          candidate.active &&
          candidate.id !== moment.stopId &&
          candidate.id !== original.stopId &&
          !selectedIds.has(candidate.id) &&
          sameRouteBoundary(moment, candidate),
      )
      .map((candidate): LivingAtlasMomentAlternative | null => {
        const proposedMap = { ...currentReplacements, [moment.slotId]: candidate.id };
        const resolved = applyLivingAtlasReplacements({
          baseComposition,
          request,
          replacements: proposedMap,
          pool,
        });
        if (resolved.appliedReplacements[moment.slotId] !== candidate.id) return null;

        const proposedMoment = resolved.moments.find((item) => item.slotId === moment.slotId);
        if (!proposedMoment) return null;

        const keepsDimensions = request.profile.selected.filter(
          (dimension) =>
            moment.dimensions.includes(dimension) && proposedMoment.dimensions.includes(dimension),
        );
        const addsDimensions = request.profile.selected.filter(
          (dimension) =>
            !moment.dimensions.includes(dimension) && proposedMoment.dimensions.includes(dimension),
        );
        const durationDeltaMin = proposedMoment.durationMin - moment.durationMin;
        const score = alternativeScore({ candidate, moment, request, durationDeltaMin });

        return {
          slotId: moment.slotId,
          replacesStopId: moment.stopId,
          moment: proposedMoment,
          durationDeltaMin,
          keepsDimensions,
          addsDimensions,
          explanation: alternativeExplanation({
            keepsDimensions,
            addsDimensions,
            durationDeltaMin,
            typeChanged: proposedMoment.type !== moment.type,
          }),
          score,
        };
      })
      .filter((item): item is LivingAtlasMomentAlternative => Boolean(item))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const durationDifference = Math.abs(a.durationDeltaMin) - Math.abs(b.durationDeltaMin);
        if (durationDifference !== 0) return durationDifference;
        return a.moment.stopId.localeCompare(b.moment.stopId);
      })
      .slice(0, 2);

    if (alternatives.length > 0) result[moment.slotId] = alternatives;
  }

  return result;
}

export function formatLivingAtlasDurationDelta(deltaMin: number): string {
  if (deltaMin === 0) return "same duration";
  return deltaMin > 0 ? `+${deltaMin} min` : `${deltaMin} min`;
}

export function replacementMapsEqual(
  left: LivingAtlasReplacementMap,
  right: LivingAtlasReplacementMap,
): boolean {
  const leftEntries = Object.entries(left).sort(([a], [b]) => a.localeCompare(b));
  const rightEntries = Object.entries(right).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(leftEntries) === JSON.stringify(rightEntries);
}
