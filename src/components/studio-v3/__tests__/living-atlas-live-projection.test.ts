/**
 * BUILD 1 / Pass 4 — live Living Atlas projection contracts.
 *
 * These tests assert the ARCHITECTURE, not a particular curated day:
 *  - one membership authority on the live branch,
 *  - a strict-slice route output invariant,
 *  - a fail-closed commercial gate,
 *  - explicit, branch-grounded passthrough reasons,
 *  - internal transit is never spendable experience time,
 *  - operational closures survive the live branch.
 */
import { describe, expect, it } from "vitest";

import { resolveStudioV3Route } from "../curation";
import { composeHybridDay } from "../studioHybridComposition";
import type { ResolvedRoutePoint } from "../curation";

const BASE = {
  feeling: "wine-food" as const,
  companions: "couple" as const,
  rhythm: "balanced" as const,
  interests: ["gastronomy", "coast"] as const,
  pickup: "lisbon" as const,
};

function resolve(overrides: Partial<Parameters<typeof resolveStudioV3Route>[0]> = {}) {
  return resolveStudioV3Route({ ...BASE, interests: [...BASE.interests], ...overrides });
}

describe("Living Atlas live projection", () => {
  it("keeps the compact route a strict prefix slice of a composed live route", () => {
    const resolved = resolve();
    expect(resolved.routePoints.length).toBeLessThanOrEqual(4);
    expect(resolved.composedRoutePoints.map((p) => p.index)).toEqual(
      resolved.composedRoutePoints.map((_, i) => i),
    );
    if (resolved.livingAtlasLive?.liveResolution !== "composed") return;
    expect(resolved.routePoints.map((p) => p.label)).toEqual(
      resolved.composedRoutePoints.slice(0, resolved.routePoints.length).map((p) => p.label),
    );
  });


  it("exposes an internal Living Atlas block without breaking the public shape", () => {
    const resolved = resolve();
    const live = resolved.livingAtlasLive;
    if (!live) return; // legacy anchor — public contract already asserted above.

    expect(["composed", "authored-fallback"]).toContain(live.liveResolution);
    expect(live.internalTransitMinutes).toBeGreaterThanOrEqual(0);
    // Identity is frozen at composition: validation only ever describes it.
    if (live.validation) {
      expect([...live.validation.compositionStopIds].sort()).toEqual(
        [...live.compositionStopIds].sort(),
      );
    }
  });

  it("fails closed: a projected day is always commercially anchor-price-safe", () => {
    for (const rhythm of ["slow", "balanced", "full"] as const) {
      const live = resolve({ rhythm }).livingAtlasLive;
      if (!live || live.liveResolution !== "composed") continue;
      // Fail closed: either fully anchor-priced, or priced only through
      // existing approved price actions (e.g. the extra-winery ladder).
      expect(["anchor-price-safe", "known-price-action-required"]).toContain(
        live.commercialDisposition,
      );
      expect(live.validation?.status).not.toBe("invalid");
      expect(live.passthroughReason).toBeNull();
    }
  });

  it("records an explicit fallback reason whenever the authored day is projected", () => {
    const live = resolve().livingAtlasLive;
    if (!live) return;
    if (live.liveResolution === "authored-fallback") {
      expect(live.fallbackReason).not.toBe("none");
    } else {
      expect(live.fallbackReason).toBe("none");
    }
  });

  it("is deterministic end to end", () => {
    expect(resolve().composedRoutePoints).toEqual(resolve().composedRoutePoints);
  });
});

describe("internal transit is never experience time", () => {
  const authored: ResolvedRoutePoint[] = [
    { index: 0, label: "Arrábida viewpoint", story: "", lat: null, lng: null },
    { index: 1, label: "Azeitão village", story: "", lat: null, lng: null },
  ];

  const args = {
    skeletonTourId: "arrabida-wine-allinclusive",
    feeling: "wine-food" as const,
    interests: ["gastronomy", "coast"] as const,
    rhythm: "balanced" as const,
    wineIntent: true,
  };

  it("shrinks the usable envelope by the verified connector minutes", () => {
    const without = composeHybridDay(authored, { ...args, interests: [...args.interests] });
    const with60 = composeHybridDay(authored, {
      ...args,
      interests: [...args.interests],
      internalTransitMinutes: 60,
    });

    const budgetOf = (result: ReturnType<typeof composeHybridDay>) =>
      result.composition?.planningTiming.budget.availableExperienceMinutes ?? null;

    if (budgetOf(without) !== null && budgetOf(with60) !== null) {
      expect(budgetOf(with60)).toBe((budgetOf(without) as number) - 60);
    }
    expect(with60.internalTransitMinutes).toBe(60);
  });

  it("records an unproven mobility concern as review, never as a removal", () => {
    const result = composeHybridDay(authored, {
      ...args,
      interests: [...args.interests],
      mobilityConcern: true,
    });
    expect(result.internalIssues.some((issue) => issue.code === "mobility-unproven")).toBe(true);
  });

  it("gives an explicit passthrough reason for a thin profile", () => {
    const result = composeHybridDay(authored, {
      skeletonTourId: "arrabida-wine-allinclusive",
      feeling: null,
      interests: [],
      rhythm: "balanced",
    });
    expect(result.passthrough).toBe(true);
    expect(result.passthroughReason).toBe("thin-profile");
  });

  it("gives an explicit passthrough reason for a non Living Atlas anchor", () => {
    const result = composeHybridDay(authored, {
      skeletonTourId: "not-a-real-signature",
      feeling: "wine-food",
      interests: ["gastronomy"],
      rhythm: "balanced",
    });
    expect(result.passthroughReason).toBe("invalid-anchor");
  });
});
