import type { OptionalStop } from "@/data/regionStopPool";
import {
  MERCADO_DO_LIVRAMENTO_STOP_ID,
  isMercadoDoLivramentoOpenOn,
} from "@/components/studio-v3/dateGuards";
import {
  LIVING_ATLAS_PREVIEW_ROUTING_LIMITS,
  haversineDistanceKm,
  type LivingAtlasRouteLeg,
  type LivingAtlasRoutePlan,
  type LivingAtlasRouteStatus,
} from "@/components/studio-v3/livingAtlasRoutePlanner";

const ROAD_DISTANCE_FACTOR = 1.24;
const PLANNING_SPEED_KMH = 44;
const MIN_TRANSFER_MINUTES = 7;

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function drivingMinutes(roadKm: number): number {
  return Math.max(MIN_TRANSFER_MINUTES, Math.round((roadKm / PLANNING_SPEED_KMH) * 60));
}

function buildLegs(
  orderedMoments: LivingAtlasRoutePlan["orderedMoments"],
  pool: readonly OptionalStop[],
): LivingAtlasRouteLeg[] {
  const stopById = new Map(pool.map((stop) => [stop.id, stop]));
  const legs: LivingAtlasRouteLeg[] = [];

  for (let index = 1; index < orderedMoments.length; index += 1) {
    const fromMoment = orderedMoments[index - 1];
    const toMoment = orderedMoments[index];
    const from = stopById.get(fromMoment.stopId)?.coords;
    const to = stopById.get(toMoment.stopId)?.coords;
    if (!from || !to) continue;
    const straightLineKm = haversineDistanceKm(from, to);
    const estimatedRoadKm = straightLineKm * ROAD_DISTANCE_FACTOR;
    legs.push({
      fromStopId: fromMoment.stopId,
      toStopId: toMoment.stopId,
      straightLineKm: round(straightLineKm),
      estimatedRoadKm: round(estimatedRoadKm),
      estimatedDrivingMin: drivingMinutes(estimatedRoadKm),
    });
  }

  return legs;
}

/**
 * Applies operational time windows after geographic optimisation.
 * Mercado do Livramento is a morning-only moment, so when it is available
 * and selected it becomes the first scheduled visit. The route metrics are
 * then recalculated from the scheduled order.
 */
export function applyLivingAtlasSchedule(input: {
  routePlan: LivingAtlasRoutePlan;
  pool: readonly OptionalStop[];
  selectedDate: string | null;
}): LivingAtlasRoutePlan {
  const { routePlan, pool, selectedDate } = input;
  if (!selectedDate || !isMercadoDoLivramentoOpenOn(selectedDate)) return routePlan;

  const marketIndex = routePlan.orderedMoments.findIndex(
    (moment) => moment.stopId === MERCADO_DO_LIVRAMENTO_STOP_ID,
  );
  if (marketIndex <= 0) return routePlan;

  const market = routePlan.orderedMoments[marketIndex];
  const orderedMoments = [
    market,
    ...routePlan.orderedMoments.filter((_, index) => index !== marketIndex),
  ];
  const legs = buildLegs(orderedMoments, pool);
  const totalEstimatedRoadKm = round(legs.reduce((sum, leg) => sum + leg.estimatedRoadKm, 0));
  const totalEstimatedDrivingMin = legs.reduce((sum, leg) => sum + leg.estimatedDrivingMin, 0);
  const longestLeg = Math.max(0, ...legs.map((leg) => leg.estimatedRoadKm));
  const warnings = routePlan.warnings.filter(
    (warning) => !warning.startsWith("Schedule order:"),
  );
  warnings.unshift("Schedule order: Mercado do Livramento is placed in the morning.");

  const overBudget =
    totalEstimatedRoadKm > LIVING_ATLAS_PREVIEW_ROUTING_LIMITS.maxTotalKm ||
    totalEstimatedDrivingMin > LIVING_ATLAS_PREVIEW_ROUTING_LIMITS.maxDrivingMin ||
    longestLeg > LIVING_ATLAS_PREVIEW_ROUTING_LIMITS.maxLegKm;
  const status: LivingAtlasRouteStatus = overBudget
    ? "over-budget"
    : routePlan.locatedMomentCount < routePlan.totalMomentCount
      ? "partial"
      : "ready";

  return {
    ...routePlan,
    status,
    orderedMoments,
    legs,
    totalEstimatedRoadKm,
    totalEstimatedDrivingMin,
    warnings,
  };
}
