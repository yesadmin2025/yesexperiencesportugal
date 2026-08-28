import { describe, expect, it } from "vitest";

import { applyHybridComposition } from "../studioHybridComposition";
import { resolveStudioV3Route, type ResolvedRoutePoint } from "../curation";

function point(index: number, label: string, story = ""): ResolvedRoutePoint {
  return { index, label, story, lat: null, lng: null };
}

const BASE = [point(0, "Arrábida viewpoint"), point(1, "Azeitão village")];

describe("applyHybridComposition", () => {
  it("never mutates the input array", () => {
    const input = [...BASE];
    const before = JSON.stringify(input);
    applyHybridComposition(input, {
      skeletonTourId: "arrabida-wine-allinclusive",
      feeling: "wine-food",
      interests: ["gastronomy", "coast"],
      rhythm: "balanced",
      wineIntent: true,
      maxPoints: 4,
    });
    expect(JSON.stringify(input)).toBe(before);
  });

  it("never exceeds the rhythm stop target", () => {
    const out = applyHybridComposition(BASE, {
      skeletonTourId: "arrabida-wine-allinclusive",
      feeling: "wine-food",
      interests: ["gastronomy", "coast", "heritage"],
      rhythm: "slow",
      wineIntent: true,
      maxPoints: 3,
    });
    expect(out.length).toBeLessThanOrEqual(3);
  });

  it("returns the route untouched when the cap is already reached", () => {
    const full = [point(0, "A"), point(1, "B"), point(2, "C"), point(3, "D")];
    expect(
      applyHybridComposition(full, {
        skeletonTourId: "arrabida-wine-allinclusive",
        feeling: "wine-food",
        interests: ["gastronomy"],
        rhythm: "balanced",
        maxPoints: 4,
      }),
    ).toEqual(full);
  });

  it("returns the route untouched for a non Living Atlas anchor", () => {
    expect(
      applyHybridComposition(BASE, {
        skeletonTourId: "not-a-real-signature",
        feeling: "wine-food",
        interests: ["gastronomy"],
        rhythm: "balanced",
        maxPoints: 5,
      }),
    ).toEqual(BASE);
  });

  it("returns the route untouched when no taste signal exists", () => {
    expect(
      applyHybridComposition(BASE, {
        skeletonTourId: "arrabida-wine-allinclusive",
        feeling: null,
        interests: [],
        rhythm: "balanced",
        maxPoints: 5,
      }),
    ).toEqual(BASE);
  });

  it("preserves the existing moments and their order when it adds one", () => {
    const out = applyHybridComposition(BASE, {
      skeletonTourId: "arrabida-wine-allinclusive",
      feeling: "wine-food",
      interests: ["gastronomy", "coast", "heritage"],
      rhythm: "immersive",
      wineIntent: true,
      maxPoints: 6,
    });
    const labels = out.map((p) => p.label);
    expect(labels).toContain("Arrábida viewpoint");
    expect(labels).toContain("Azeitão village");
    expect(labels.indexOf("Arrábida viewpoint")).toBeLessThan(labels.indexOf("Azeitão village"));
    expect(out.map((p) => p.index)).toEqual(out.map((_, i) => i));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("never inserts a winery without explicit wine intent", () => {
    const out = applyHybridComposition(BASE, {
      skeletonTourId: "arrabida-wine-allinclusive",
      feeling: "wine-food",
      interests: ["wine", "gastronomy", "coast"],
      rhythm: "immersive",
      wineIntent: false,
      maxPoints: 6,
    });
    const added = out.filter((p) => !BASE.some((b) => b.label === p.label));
    for (const moment of added) {
      expect(moment.label.toLowerCase()).not.toMatch(/adega|quinta|winery|wine estate/);
    }
  });

  it("is deterministic for identical input", () => {
    const args = {
      skeletonTourId: "arrabida-wine-allinclusive",
      feeling: "wine-food" as const,
      interests: ["gastronomy", "coast"] as const,
      rhythm: "balanced" as const,
      wineIntent: true,
      maxPoints: 5,
    };
    expect(applyHybridComposition(BASE, { ...args })).toEqual(
      applyHybridComposition(BASE, { ...args }),
    );
  });
});

describe("resolveStudioV3Route with hybrid composition", () => {
  const input = {
    feeling: "wine-food" as const,
    companions: "couple" as const,
    rhythm: "balanced" as const,
    interests: ["gastronomy", "coast"] as const,
    pickup: "lisbon" as const,
  };

  it("keeps the composed route within the rhythm target and free of duplicates", () => {
    const resolved = resolveStudioV3Route({ ...input, interests: [...input.interests] });
    expect(resolved.composedRoutePoints.length).toBeGreaterThan(0);
    expect(resolved.composedRoutePoints.length).toBeLessThanOrEqual(6);
    const labels = resolved.composedRoutePoints.map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(resolved.composedRoutePoints.map((p) => p.index)).toEqual(labels.map((_, i) => i));
  });

  it("keeps the compact projection capped at 4 and the anchor unchanged", () => {
    const resolved = resolveStudioV3Route({ ...input, interests: [...input.interests] });
    expect(resolved.routePoints.length).toBeLessThanOrEqual(4);
    expect(resolved.skeletonTourKey).toBeTruthy();
  });

  it("is deterministic end to end", () => {
    const a = resolveStudioV3Route({ ...input, interests: [...input.interests] });
    const b = resolveStudioV3Route({ ...input, interests: [...input.interests] });
    expect(a.composedRoutePoints).toEqual(b.composedRoutePoints);
  });
});
