/**
 * FINAL BLOCKER — a certified composed day must be ROUTABLE.
 *
 * A composed moment without coordinates makes the reveal route unscoreable,
 * which fails closed to curator review and blocks self-service booking. Every
 * composed moment must therefore carry geography from an existing verified
 * authority (inventory coordinate, or the curated stopGeo gazetteer for the
 * same canonical label). Nothing is geocoded or invented.
 */
import { describe, expect, it } from "vitest";

import { resolveStudioV3Route } from "../curation";
import { judgeFinalDayTime } from "@/lib/studio-v3/finalTimeGate";

const PROFILE = {
  feeling: "wine-food",
  companions: "couple",
  rhythm: "full",
  interests: ["wine", "gastronomy", "coast"],
  pickup: "lisbon-airport",
} as Parameters<typeof resolveStudioV3Route>[0];

describe("certified composed day is routable", () => {
  it("gives every composed moment verified coordinates", () => {
    const resolved = resolveStudioV3Route(PROFILE);
    expect(resolved.livingAtlasLive?.liveResolution).toBe("composed");
    expect(resolved.composedRoutePoints.length).toBeGreaterThan(0);
    for (const point of resolved.composedRoutePoints) {
      expect(typeof point.lat, point.label).toBe("number");
      expect(typeof point.lng, point.label).toBe("number");
    }
  });

  it("keeps structural minute truth on every composed moment", () => {
    for (const point of resolveStudioV3Route(PROFILE).composedRoutePoints) {
      expect(point.inventoryStopId, point.label).toBeTruthy();
      expect(point.durationMinutes, point.label).toBeGreaterThan(0);
      expect(point.durationSource, point.label).toBeTruthy();
    }
  });

  it("passes the canonical final time gate", () => {
    const resolved = resolveStudioV3Route(PROFILE);
    const gate = judgeFinalDayTime({
      points: resolved.composedRoutePoints,
      skeletonTourId: resolved.skeletonTourKey,
      rhythm: "full",
    });
    expect(gate.fit.verdict).toBe("fits");
    expect(gate.bookable).toBe(true);
  });
});
