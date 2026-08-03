import { describe, expect, it } from "vitest";

import type { OptionalStop } from "@/data/regionStopPool";
import type { LivingAtlasResolvedMoment } from "../livingAtlasAlternatives";
import type { LivingAtlasRoutePlan } from "../livingAtlasRoutePlanner";
import { applyLivingAtlasSchedule } from "../livingAtlasSchedule";

function moment(
  stopId: string,
  label: string,
  type: LivingAtlasResolvedMoment["type"],
): LivingAtlasResolvedMoment {
  return {
    stopId,
    slotId: stopId,
    replacedStopId: null,
    originalLabel: null,
    label,
    type,
    durationMin: 60,
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    sourceTourIds: ["arrabida-wine-allinclusive"],
    dimensions: [],
    score: 1,
    reasons: [],
  };
}

const market = moment("mercado-do-livramento", "Mercado do Livramento", "market");
const winery = moment("winery-example", "Winery Example", "winery");

const pool = [
  {
    id: market.stopId,
    name: market.label,
    type: market.type,
    region: market.region,
    coords: { lat: 38.5244, lng: -8.8882 },
    durationMin: 60,
    active: true,
  },
  {
    id: winery.stopId,
    name: winery.label,
    type: winery.type,
    region: winery.region,
    coords: { lat: 38.52, lng: -9.01 },
    durationMin: 60,
    active: true,
  },
] as OptionalStop[];

const routePlan: LivingAtlasRoutePlan = {
  status: "ready",
  orderedMoments: [winery, market],
  legs: [],
  totalEstimatedRoadKm: 0,
  totalEstimatedDrivingMin: 0,
  locatedMomentCount: 2,
  totalMomentCount: 2,
  maxDrivingMin: 180,
  maxTotalKm: 250,
  maxLegKm: 60,
  warnings: [],
  methodology: "verified-coordinates-estimate",
};

describe("Living Atlas schedule", () => {
  it("places Mercado do Livramento first on an open day", () => {
    const scheduled = applyLivingAtlasSchedule({
      routePlan,
      pool,
      selectedDate: "2026-08-04",
    });
    expect(scheduled.orderedMoments[0].stopId).toBe("mercado-do-livramento");
    expect(scheduled.warnings[0]).toMatch(/morning/i);
  });

  it("does not schedule the market on a Monday assumption", () => {
    const scheduled = applyLivingAtlasSchedule({
      routePlan,
      pool,
      selectedDate: "2026-08-03",
    });
    expect(scheduled).toBe(routePlan);
  });
});
