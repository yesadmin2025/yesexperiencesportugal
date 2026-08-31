import type { OptionalStop, RegionId } from "@/data/regionStopPool";
import {
  MIN_TRANSFER_MINUTES,
  PLANNING_SPEED_KMH,
  ROAD_DISTANCE_FACTOR,
} from "@/lib/studio-v3/routePlanningConstants";
import type {
  LivingAtlasResolvedComposition,
  LivingAtlasResolvedMoment,
} from "@/components/studio-v3/livingAtlasAlternatives";

export type LivingAtlasRouteStatus = "ready" | "partial" | "over-budget" | "unavailable";

export type LivingAtlasRouteLeg = {
  fromStopId: string;
  toStopId: string;
  straightLineKm: number;
  estimatedRoadKm: number;
  estimatedDrivingMin: number;
};

export type LivingAtlasRoutePlan = {
  status: LivingAtlasRouteStatus;
  orderedMoments: LivingAtlasResolvedMoment[];
  legs: LivingAtlasRouteLeg[];
  totalEstimatedRoadKm: number;
  totalEstimatedDrivingMin: number;
  locatedMomentCount: number;
  totalMomentCount: number;
  maxDrivingMin: number;
  maxTotalKm: number;
  maxLegKm: number;
  warnings: string[];
  methodology:
    | "verified-coordinates-estimate"
    | "partial-coordinate-estimate"
    | "insufficient-coordinates";
};

/**
 * Read-only preview mirror of the active Builder routing rule inspected in the
 * Lovable-linked database. These are not checkout or supplier constraints.
 */
export const LIVING_ATLAS_PREVIEW_ROUTING_LIMITS = {
  maxDrivingMin: 180,
  maxTotalKm: 250,
  maxLegKm: 60,
} as const;

// Route-planning constants are shared with the Pass-1 timing projection so the
// two estimates can never drift apart. Values unchanged.

/** Regional orientation points from the existing Builder region inventory. */
const REGION_ORIENTATION: Partial<Record<RegionId, { lat: number; lng: number }>> = {
  "arrabida-setubal": { lat: 38.49, lng: -8.95 },
  "alentejo-evora": { lat: 38.57, lng: -7.91 },
  "comporta-troia": { lat: 38.4, lng: -8.79 },
  "fatima-nazare-obidos": { lat: 39.53, lng: -9.07 },
  "tomar-coimbra": { lat: 39.9, lng: -8.42 },
  "sintra-cascais": { lat: 38.78, lng: -9.4 },
  "lisbon-sintra-cascais": { lat: 38.7223, lng: -9.1393 },
  "douro-porto": { lat: 41.1579, lng: -8.6291 },
};

type LocatedMoment = {
  moment: LivingAtlasResolvedMoment;
  coords: { lat: number; lng: number };
};

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const a =
    Math.sin(latDelta / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function roadDistanceKm(from: LocatedMoment, to: LocatedMoment): number {
  return haversineDistanceKm(from.coords, to.coords) * ROAD_DISTANCE_FACTOR;
}

function estimatedDrivingMinutes(estimatedRoadKm: number): number {
  return Math.max(MIN_TRANSFER_MINUTES, Math.round((estimatedRoadKm / PLANNING_SPEED_KMH) * 60));
}

function routeDistanceKm(route: readonly LocatedMoment[]): number {
  let total = 0;
  for (let index = 1; index < route.length; index += 1) {
    total += roadDistanceKm(route[index - 1], route[index]);
  }
  return total;
}

function orientationDistanceKm(route: readonly LocatedMoment[]): number {
  if (route.length === 0) return 0;
  const orientation = REGION_ORIENTATION[route[0].moment.region];
  if (!orientation) return 0;
  return haversineDistanceKm(orientation, route[0].coords);
}

function routeKey(route: readonly LocatedMoment[]): string {
  return route.map((item) => item.moment.stopId).join("|");
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const result: T[][] = [];
  items.forEach((item, index) => {
    const remaining = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const suffix of permutations(remaining)) result.push([item, ...suffix]);
  });
  return result;
}

function optimizedOrder(items: readonly LocatedMoment[]): LocatedMoment[] {
  if (items.length <= 1) return [...items];

  let best: LocatedMoment[] | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestOrientationDistance = Number.POSITIVE_INFINITY;
  let bestKey = "";

  for (const candidate of permutations(items)) {
    const distance = routeDistanceKm(candidate);
    const orientationDistance = orientationDistanceKm(candidate);
    const key = routeKey(candidate);
    const distanceDifference = distance - bestDistance;
    const orientationDifference = orientationDistance - bestOrientationDistance;

    const isBetter =
      distanceDifference < -0.01 ||
      (Math.abs(distanceDifference) <= 0.01 && orientationDifference < -0.01) ||
      (Math.abs(distanceDifference) <= 0.01 &&
        Math.abs(orientationDifference) <= 0.01 &&
        (best === null || key.localeCompare(bestKey) < 0));

    if (isBetter) {
      best = candidate;
      bestDistance = distance;
      bestOrientationDistance = orientationDistance;
      bestKey = key;
    }
  }

  return best ?? [...items];
}

function buildLegs(route: readonly LocatedMoment[]): LivingAtlasRouteLeg[] {
  const legs: LivingAtlasRouteLeg[] = [];
  for (let index = 1; index < route.length; index += 1) {
    const from = route[index - 1];
    const to = route[index];
    const straightLineKm = haversineDistanceKm(from.coords, to.coords);
    const estimatedRoadKm = straightLineKm * ROAD_DISTANCE_FACTOR;
    legs.push({
      fromStopId: from.moment.stopId,
      toStopId: to.moment.stopId,
      straightLineKm: round(straightLineKm),
      estimatedRoadKm: round(estimatedRoadKm),
      estimatedDrivingMin: estimatedDrivingMinutes(estimatedRoadKm),
    });
  }
  return legs;
}

/**
 * Produces a transparent geographic draft from verified stop coordinates.
 * It does not call a navigation service and never presents estimates as live
 * traffic, supplier availability or a confirmed timetable.
 */
export function planLivingAtlasRoute(input: {
  composition: LivingAtlasResolvedComposition;
  pool: readonly OptionalStop[];
  limits?: Partial<Record<keyof typeof LIVING_ATLAS_PREVIEW_ROUTING_LIMITS, number>>;
}): LivingAtlasRoutePlan {
  const limits = { ...LIVING_ATLAS_PREVIEW_ROUTING_LIMITS, ...input.limits };
  const stopById = new Map(input.pool.map((stop) => [stop.id, stop]));
  const located: LocatedMoment[] = [];
  const unlocated: LivingAtlasResolvedMoment[] = [];

  for (const moment of input.composition.moments) {
    const coords = stopById.get(moment.stopId)?.coords;
    if (coords) located.push({ moment, coords });
    else unlocated.push(moment);
  }

  if (located.length < 2) {
    return {
      status: "unavailable",
      orderedMoments: [...input.composition.moments],
      legs: [],
      totalEstimatedRoadKm: 0,
      totalEstimatedDrivingMin: 0,
      locatedMomentCount: located.length,
      totalMomentCount: input.composition.moments.length,
      maxDrivingMin: limits.maxDrivingMin,
      maxTotalKm: limits.maxTotalKm,
      maxLegKm: limits.maxLegKm,
      warnings: ["Not enough verified coordinates to estimate the route."],
      methodology: "insufficient-coordinates",
    };
  }

  const orderedLocated = optimizedOrder(located);
  const legs = buildLegs(orderedLocated);
  const totalEstimatedRoadKm = round(legs.reduce((sum, leg) => sum + leg.estimatedRoadKm, 0));
  const totalEstimatedDrivingMin = legs.reduce((sum, leg) => sum + leg.estimatedDrivingMin, 0);
  const warnings: string[] = [];

  if (unlocated.length > 0) {
    warnings.push(
      `${unlocated.length} moment${unlocated.length === 1 ? " is" : "s are"} not geographically placed yet.`,
    );
  }
  if (totalEstimatedRoadKm > limits.maxTotalKm) {
    warnings.push(`Estimated internal distance exceeds the ${limits.maxTotalKm} km planning cap.`);
  }
  if (totalEstimatedDrivingMin > limits.maxDrivingMin) {
    warnings.push(
      `Estimated internal driving exceeds the ${Math.round(limits.maxDrivingMin / 60)} hour planning cap.`,
    );
  }
  const longestLeg = Math.max(...legs.map((leg) => leg.estimatedRoadKm));
  if (longestLeg > limits.maxLegKm) {
    warnings.push(`At least one transfer exceeds the ${limits.maxLegKm} km leg cap.`);
  }

  const overBudget =
    totalEstimatedRoadKm > limits.maxTotalKm ||
    totalEstimatedDrivingMin > limits.maxDrivingMin ||
    longestLeg > limits.maxLegKm;
  const status: LivingAtlasRouteStatus = overBudget
    ? "over-budget"
    : unlocated.length > 0
      ? "partial"
      : "ready";

  return {
    status,
    orderedMoments: [...orderedLocated.map((item) => item.moment), ...unlocated],
    legs,
    totalEstimatedRoadKm,
    totalEstimatedDrivingMin,
    locatedMomentCount: located.length,
    totalMomentCount: input.composition.moments.length,
    maxDrivingMin: limits.maxDrivingMin,
    maxTotalKm: limits.maxTotalKm,
    maxLegKm: limits.maxLegKm,
    warnings,
    methodology:
      unlocated.length > 0 ? "partial-coordinate-estimate" : "verified-coordinates-estimate",
  };
}

export function formatLivingAtlasDrivingTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}
