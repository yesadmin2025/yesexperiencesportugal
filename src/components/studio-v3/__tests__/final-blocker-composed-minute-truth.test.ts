/**
 * FINAL BLOCKER — the normal modern Arrábida Studio path must reach a COMPOSED
 * Living Atlas day whose every moment carries structural identity and verified
 * minute truth, so the canonical final gate can certify it.
 *
 * The strict gate is never weakened here: an authored/catalogue day without
 * proven minutes must still be curator-only.
 */
import { describe, expect, it } from "vitest";

import { resolveStudioV3Route } from "../curation";
import { judgeFinalDayTime } from "@/lib/studio-v3/finalTimeGate";
import { AUTHORITATIVE_DWELL_SOURCES } from "@/lib/studio-v3/timeAuthority";

const ARRABIDA = {
  feeling: "wine-food" as const,
  companions: "couple" as const,
  rhythm: "balanced" as const,
  interests: ["wine", "gastronomy", "coast"],
  pickup: "lisbon" as const,
};

function resolveArrabida(overrides: Record<string, unknown> = {}) {
  return resolveStudioV3Route({ ...ARRABIDA, ...overrides } as never);
}

describe("normal Arrábida modern path", () => {
  it("resolves through the live Living Atlas composition, not the authored fallback", () => {
    const live = resolveArrabida().livingAtlasLive;
    expect(live).toBeTruthy();
    expect(live?.liveResolution).toBe("composed");
    expect(live?.fallbackReason).toBe("none");
    expect(live?.requiresCuratorReview).toBe(false);
  });

  it("gives every projected moment structural identity and verified dwell", () => {
    const points = resolveArrabida().composedRoutePoints;
    expect(points.length).toBeGreaterThan(0);
    for (const point of points) {
      expect(point.inventoryStopId).toBeTruthy();
      expect(point.durationMinutes).toBeGreaterThan(0);
      expect(AUTHORITATIVE_DWELL_SOURCES.has(point.durationSource!)).toBe(true);
    }
  });

  it("certifies the composed day at the canonical final booking gate", () => {
    const resolved = resolveArrabida();
    const gate = judgeFinalDayTime({
      points: resolved.composedRoutePoints,
      skeletonTourId: resolved.skeletonTourKey,
      rhythm: "balanced",
    });
    expect(gate.fit.evaluable).toBe(true);
    expect(gate.fit.verdict).toBe("fits");
    expect(gate.bookable).toBe(true);
    expect(gate.requiresReview).toBe(false);
  });

  it("keeps an unproven authored day curator-only", () => {
    const gate = judgeFinalDayTime({
      points: [
        { label: "Santuário Nacional de Cristo Rei", lat: 38.6781, lng: -9.1721 },
        { label: "Azeitao — long traditional lunch", lat: 38.5167, lng: -9.0167 },
      ],
      skeletonTourId: "arrabida-wine-allinclusive",
      rhythm: "balanced",
    });
    expect(gate.fit.verdict).toBe("not-evaluable");
    expect(gate.bookable).toBe(false);
    expect(gate.requiresReview).toBe(true);
  });

  it("is deterministic", () => {
    expect(resolveArrabida().composedRoutePoints).toEqual(
      resolveArrabida().composedRoutePoints,
    );
  });
});
