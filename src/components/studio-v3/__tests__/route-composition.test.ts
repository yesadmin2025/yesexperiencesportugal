// Studio V3 — Phase 5E: controlled route composition (flag-gated).
//
// `applyReplacementCandidates` may replace up to N non-critical route points
// with same-type pool candidates. The committed flag is OFF so live
// `resolveStudioV3Route` output is unchanged — these tests exercise the
// pure helper directly and also confirm flag-off parity.

import { describe, it, expect } from "vitest";
import {
  resolveStudioV3Route,
  selectReplacementCandidates,
  applyReplacementCandidates,
  __STUDIO_V3_ROUTE_COMPOSITION_ENABLED_FOR_TESTS,
} from "@/components/studio-v3/curation";
import { REGION_STOP_POOL } from "@/data/regionStopPool";

const baseInput = {
  skeletonTourId: "evora-alentejo",
  interests: ["wine", "heritage", "gastronomy"] as const,
  rhythm: "balanced" as const,
  companions: "couple" as const,
  investment: "elevated" as const,
  considerations: [] as ReadonlyArray<string>,
};

function makeRoutePoints(
  parts: Array<{ label: string; story?: string }>,
) {
  return parts.map((p, i) => ({
    index: i,
    label: p.label,
    story: p.story ?? "",
    lat: null,
    lng: null,
  }));
}

describe("Phase 5E — flag state (staging)", () => {
  it("STUDIO_V3_ROUTE_COMPOSITION_ENABLED stays false in committed code", () => {
    expect(__STUDIO_V3_ROUTE_COMPOSITION_ENABLED_FOR_TESTS).toBe(false);
  });

  it("resolveStudioV3Route is deterministic and never exceeds 4 route points", () => {
    const inputs = [
      { feeling: "wine-food" as const, companions: "couple" as const, rhythm: "balanced" as const, interests: ["wine", "gastronomy"] as const, pickup: "lisbon" as const },
      { feeling: "coastal" as const, companions: "family" as const, rhythm: "slow" as const, interests: ["coast", "nature"] as const, pickup: "lisbon" as const },
      { feeling: "culture" as const, companions: "couple" as const, rhythm: "full" as const, interests: ["heritage"] as const, pickup: "lisbon" as const },
    ];
    for (const i of inputs) {
      const a = resolveStudioV3Route(i);
      const b = resolveStudioV3Route(i);
      expect(b).toEqual(a);
      expect(a.routePoints.length).toBeLessThanOrEqual(4);
    }
  });
});

describe("Phase 5E — selectReplacementCandidates eligibility", () => {
  it("returns [] for unknown skeleton", () => {
    expect(
      selectReplacementCandidates({
        ...baseInput,
        skeletonTourId: "not-a-tour",
        existingRoutePointLabels: [],
      }),
    ).toEqual([]);
  });

  it("never crosses region or routeCluster", () => {
    const out = selectReplacementCandidates({
      ...baseInput,
      existingRoutePointLabels: [],
    });
    for (const stop of out) {
      expect(stop.region).toBe("alentejo-evora");
      expect(stop.routeCluster).toBe("evora-city-classical-wineries");
      expect(stop.active).toBe(true);
    }
  });

  it("never returns a P17 (roman-heritage-talha-wines) stop for P6 Évora skeleton", () => {
    const out = selectReplacementCandidates({
      ...baseInput,
      existingRoutePointLabels: [],
    });
    for (const stop of out) {
      expect(stop.signatureTourId).not.toBe("roman-heritage-talha-wines");
    }
  });
});

describe("Phase 5E — applyReplacementCandidates rules", () => {
  it("never replaces the first route point", () => {
    const route = makeRoutePoints([
      { label: "Évora", story: "Old town heritage walk." },
      { label: "Some Winery", story: "Classical Alentejo winery tasting." },
      { label: "Another Winery", story: "Wine estate cellar visit." },
      { label: "Viewpoint", story: "Panoramic overlook above the plain." },
    ]);
    const out = applyReplacementCandidates(route, baseInput);
    expect(out[0].label).toBe("Évora");
  });

  it("never replaces the second route point (protected anchor)", () => {
    const route = makeRoutePoints([
      { label: "Évora", story: "Old town heritage walk." },
      { label: "Some Winery", story: "Classical Alentejo winery tasting." },
      { label: "Another Winery", story: "Wine estate cellar visit." },
    ]);
    const out = applyReplacementCandidates(route, baseInput);
    expect(out[1].label).toBe("Some Winery");
  });

  it("preserves array length (never grows beyond 4)", () => {
    const route = makeRoutePoints([
      { label: "Évora", story: "Old town heritage walk." },
      { label: "Some Winery", story: "Classical Alentejo winery tasting." },
      { label: "Another Winery", story: "Wine estate cellar visit." },
      { label: "Third Winery", story: "Wine estate cellar visit." },
    ]);
    const out = applyReplacementCandidates(route, baseInput);
    expect(out.length).toBe(4);
  });

  it("slow rhythm replaces at most 1 stop", () => {
    const route = makeRoutePoints([
      { label: "Évora", story: "Old town walk." },
      { label: "WineryA", story: "Wine estate tasting." },
      { label: "WineryB", story: "Wine cellar visit." },
      { label: "WineryC", story: "Adega visit." },
    ]);
    const out = applyReplacementCandidates(route, { ...baseInput, rhythm: "slow" });
    const changed = out.filter((p, i) => p.label !== route[i].label);
    expect(changed.length).toBeLessThanOrEqual(1);
  });

  it("balanced rhythm replaces at most 2 stops", () => {
    const route = makeRoutePoints([
      { label: "Évora", story: "Old town walk." },
      { label: "WineryA", story: "Wine estate tasting." },
      { label: "WineryB", story: "Wine cellar visit." },
      { label: "WineryC", story: "Adega visit." },
    ]);
    const out = applyReplacementCandidates(route, { ...baseInput, rhythm: "balanced" });
    const changed = out.filter((p, i) => p.label !== route[i].label);
    expect(changed.length).toBeLessThanOrEqual(2);
  });

  it("immersive rhythm replaces at most 3 stops", () => {
    const route = makeRoutePoints([
      { label: "Évora", story: "Old town walk." },
      { label: "WineryA", story: "Wine estate tasting." },
      { label: "WineryB", story: "Wine cellar visit." },
      { label: "WineryC", story: "Adega visit." },
    ]);
    const out = applyReplacementCandidates(route, { ...baseInput, rhythm: "immersive" });
    const changed = out.filter((p, i) => p.label !== route[i].label);
    expect(changed.length).toBeLessThanOrEqual(3);
  });

  it("type is preserved on every replacement (winery stays winery)", () => {
    const route = makeRoutePoints([
      { label: "Évora", story: "Old town walk." },
      { label: "WineryA", story: "Wine estate tasting." },
      { label: "WineryB", story: "Wine cellar visit." },
      { label: "WineryC", story: "Adega visit." },
    ]);
    const out = applyReplacementCandidates(route, { ...baseInput, rhythm: "immersive" });
    for (let i = 2; i < out.length; i++) {
      if (out[i].label === route[i].label) continue;
      const stop = REGION_STOP_POOL.find((s) => s.name === out[i].label);
      expect(stop?.type).toBe("winery");
    }
  });

  it("respects oneOfGroup — never picks two members of the same group", () => {
    const route = makeRoutePoints([
      { label: "Évora", story: "Old town walk." },
      { label: "WineryA", story: "Wine estate tasting." },
      { label: "WineryB", story: "Wine cellar visit." },
      { label: "WineryC", story: "Adega visit." },
    ]);
    const out = applyReplacementCandidates(route, { ...baseInput, rhythm: "immersive" });
    const groups: Record<string, number> = {};
    for (const p of out) {
      const stop = REGION_STOP_POOL.find((s) => s.name === p.label);
      if (stop?.oneOfGroup) {
        groups[stop.oneOfGroup] = (groups[stop.oneOfGroup] ?? 0) + 1;
      }
    }
    for (const n of Object.values(groups)) {
      expect(n).toBeLessThanOrEqual(1);
    }
  });

  it("reduced-mobility excludes viewpoint replacements", () => {
    const route = makeRoutePoints([
      { label: "Sesimbra", story: "Coastal village walk." },
      { label: "Anchor stop", story: "Azeitão village stroll." },
      { label: "Some Viewpoint", story: "Panoramic miradouro above the bay." },
    ]);
    const out = applyReplacementCandidates(route, {
      skeletonTourId: "wild-beaches-picnic",
      interests: ["coast", "nature"],
      rhythm: "balanced",
      companions: "couple",
      investment: "elevated",
      considerations: ["reduced-mobility"],
    });
    // If a replacement happened at index 2, it must NOT be a viewpoint.
    if (out[2].label !== route[2].label) {
      const stop = REGION_STOP_POOL.find((s) => s.name === out[2].label);
      expect(stop?.type).not.toBe("viewpoint");
    }
  });

  it("never crosses region or routeCluster on a replacement", () => {
    const route = makeRoutePoints([
      { label: "Évora", story: "Old town walk." },
      { label: "WineryA", story: "Wine estate tasting." },
      { label: "WineryB", story: "Wine cellar visit." },
      { label: "WineryC", story: "Adega visit." },
    ]);
    const out = applyReplacementCandidates(route, { ...baseInput, rhythm: "immersive" });
    for (const p of out) {
      const stop = REGION_STOP_POOL.find((s) => s.name === p.label);
      if (!stop) continue; // original tour stop, not from pool
      expect(stop.region).toBe("alentejo-evora");
      expect(stop.routeCluster).toBe("evora-city-classical-wineries");
    }
  });
});
