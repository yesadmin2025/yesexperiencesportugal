import { describe, expect, it } from "vitest";

import type { OptionalStop } from "@/data/regionStopPool";
import type { LivingAtlasResolvedComposition } from "../livingAtlasAlternatives";
import { planLivingAtlasRoute } from "../livingAtlasRoutePlanner";
import { resolveTimeBudget } from "@/lib/studio-v3/resolveTimeBudget";
import { projectPlanningTiming } from "@/lib/studio-v3/timingProjection";

const pool: OptionalStop[] = [
  {
    id: "west",
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    name: "West Coast",
    type: "beach",
    coords: { lat: 38.44, lng: -9.2 },
    suitsInterests: ["coast"],
    suitsRhythm: ["balanced"],
    durationMin: 45,
    source: "operator-confirmed",
    active: true,
  },
  {
    id: "centre",
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    name: "Arrábida Centre",
    type: "nature",
    coords: { lat: 38.48, lng: -8.98 },
    suitsInterests: ["nature"],
    suitsRhythm: ["balanced"],
    durationMin: 60,
    source: "signature-core",
    signatureTourId: "wild-beaches-picnic",
    active: true,
  },
  {
    id: "east",
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    name: "Setúbal Market",
    type: "market",
    coords: { lat: 38.52, lng: -8.89 },
    suitsInterests: ["local-life"],
    suitsRhythm: ["balanced"],
    durationMin: 30,
    source: "signature-core",
    signatureTourId: "wild-beaches-picnic",
    active: true,
  },
  {
    id: "unplaced",
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    name: "Supplier to confirm",
    type: "boat",
    suitsInterests: ["coast"],
    suitsRhythm: ["balanced"],
    durationMin: 75,
    source: "signature-core",
    signatureTourId: "arrabida-boat",
    active: true,
  },
];

function moment(stopId: string) {
  const stop = pool.find((item) => item.id === stopId);
  if (!stop) throw new Error(`Missing stop ${stopId}`);
  return {
    stopId,
    slotId: stopId,
    replacedStopId: null,
    originalLabel: null,
    label: stop.name,
    type: stop.type,
    durationMin: stop.durationMin,
    region: stop.region,
    routeCluster: stop.routeCluster ?? null,
    sourceTourIds: stop.signatureTourId ? [stop.signatureTourId] : [],
    dimensions: [],
    score: 1,
    reasons: [],
  };
}

function composition(stopIds: string[]): LivingAtlasResolvedComposition {
  return {
    status: "complete",
    anchorSignatureId: "wild-beaches-picnic",
    moments: stopIds.map(moment),
    totalDurationMin: stopIds.reduce(
      (sum, stopId) => sum + (pool.find((item) => item.id === stopId)?.durationMin ?? 0),
      0,
    ),
    targetMomentCount: stopIds.length,
    planningTiming: projectPlanningTiming({
      moments: [],
      budget: resolveTimeBudget({}),
      rhythm: "balanced",
    }),
    conflict: null,
    missingDimensions: [],
    missingRequiredTypes: [],
    rejected: [],
    routeOrderReady: false,
    appliedReplacements: {},
    ignoredReplacements: [],
  };
}

describe("Living Atlas route planner", () => {
  it("reorders a scrambled day into the shortest deterministic internal route", () => {
    const route = planLivingAtlasRoute({
      composition: composition(["west", "east", "centre"]),
      pool,
    });

    expect(route.status).toBe("ready");
    expect(route.orderedMoments.map((item) => item.stopId)).toEqual(["east", "centre", "west"]);
    expect(route.legs).toHaveLength(2);
    expect(route.totalEstimatedRoadKm).toBeGreaterThan(20);
    expect(route.totalEstimatedDrivingMin).toBeGreaterThan(20);
    expect(route.warnings).toEqual([]);
  });

  it("keeps an unplaced verified moment visible and marks the estimate as partial", () => {
    const route = planLivingAtlasRoute({
      composition: composition(["west", "unplaced", "east", "centre"]),
      pool,
    });

    expect(route.status).toBe("partial");
    expect(route.orderedMoments.at(-1)?.stopId).toBe("unplaced");
    expect(route.locatedMomentCount).toBe(3);
    expect(route.warnings[0]).toContain("not geographically placed");
  });

  it("flags a route that breaks an explicit operating budget", () => {
    const route = planLivingAtlasRoute({
      composition: composition(["west", "east", "centre"]),
      pool,
      limits: { maxTotalKm: 10, maxDrivingMin: 15, maxLegKm: 5 },
    });

    expect(route.status).toBe("over-budget");
    expect(route.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("distance exceeds"),
        expect.stringContaining("driving exceeds"),
        expect.stringContaining("transfer exceeds"),
      ]),
    );
  });

  it("does not invent a route when fewer than two coordinates are verified", () => {
    const route = planLivingAtlasRoute({
      composition: composition(["unplaced"]),
      pool,
    });

    expect(route.status).toBe("unavailable");
    expect(route.legs).toEqual([]);
    expect(route.totalEstimatedRoadKm).toBe(0);
  });
});
