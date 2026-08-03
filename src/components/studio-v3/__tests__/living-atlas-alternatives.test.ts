import { describe, expect, it } from "vitest";

import type { OptionalStop } from "@/data/regionStopPool";
import {
  applyLivingAtlasReplacements,
  buildLivingAtlasAlternatives,
} from "../livingAtlasAlternatives";
import { composeLivingAtlasDay, type LivingAtlasCompositionRequest } from "../livingAtlasComposer";

const pool: OptionalStop[] = [
  {
    id: "winery-anchor",
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    name: "Family Winery",
    type: "winery",
    suitsInterests: ["wine", "gastronomy"],
    suitsRhythm: ["slow", "balanced"],
    durationMin: 75,
    source: "signature-core",
    signatureTourId: "arrabida-wine-allinclusive",
    active: true,
  },
  {
    id: "nature-anchor",
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    name: "Arrábida Nature Chapter",
    type: "nature",
    suitsInterests: ["coast", "nature"],
    suitsRhythm: ["balanced", "full"],
    durationMin: 60,
    source: "signature-core",
    signatureTourId: "arrabida-wine-allinclusive",
    active: true,
  },
  {
    id: "market-anchor",
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    name: "Local Market",
    type: "market",
    suitsInterests: ["local-life", "gastronomy"],
    suitsRhythm: ["slow", "balanced"],
    durationMin: 45,
    source: "signature-core",
    signatureTourId: "arrabida-wine-allinclusive",
    active: true,
  },
  {
    id: "beach-alternative",
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    name: "Hidden Atlantic Beach",
    type: "beach",
    suitsInterests: ["coast", "nature"],
    suitsRhythm: ["slow", "balanced"],
    durationMin: 45,
    source: "signature-core",
    signatureTourId: "wild-beaches-picnic",
    active: true,
  },
  {
    id: "viewpoint-alternative",
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    name: "Atlantic Viewpoint",
    type: "viewpoint",
    suitsInterests: ["coast", "nature"],
    suitsRhythm: ["slow", "balanced"],
    durationMin: 30,
    source: "operator-confirmed",
    active: true,
  },
  {
    id: "third-safe-alternative",
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    name: "Coastal Nature Walk",
    type: "nature",
    suitsInterests: ["coast", "nature"],
    suitsRhythm: ["balanced"],
    durationMin: 55,
    source: "operator-confirmed",
    active: true,
  },
  {
    id: "wrong-cluster",
    region: "arrabida-setubal",
    routeCluster: "remote-cluster",
    name: "Incompatible Coast",
    type: "beach",
    suitsInterests: ["coast", "nature"],
    suitsRhythm: ["balanced"],
    durationMin: 40,
    source: "operator-confirmed",
    active: true,
  },
];

const request: LivingAtlasCompositionRequest = {
  anchorSignatureId: "arrabida-wine-allinclusive",
  profile: {
    selected: ["wine-table", "atlantic-coast", "local-life"],
    leads: ["wine-table", "atlantic-coast"],
  },
  density: "slow",
  requiredTypes: ["winery"],
  preferredTypes: ["nature", "beach", "viewpoint", "market"],
  maxByType: { winery: 1 },
  mustIncludeStopIds: ["market-anchor"],
  pool,
};

function baseComposition() {
  return composeLivingAtlasDay(request);
}

describe("Living Atlas alternatives", () => {
  it("applies a cross-category replacement only when the day remains valid", () => {
    const base = baseComposition();
    expect(base.moments.some((moment) => moment.stopId === "nature-anchor")).toBe(true);

    const resolved = applyLivingAtlasReplacements({
      baseComposition: base,
      request,
      replacements: { "nature-anchor": "beach-alternative" },
      pool,
    });

    expect(resolved.appliedReplacements).toEqual({
      "nature-anchor": "beach-alternative",
    });
    expect(resolved.moments.find((moment) => moment.slotId === "nature-anchor")).toMatchObject({
      stopId: "beach-alternative",
      replacedStopId: "nature-anchor",
      type: "beach",
    });
    expect(resolved.status).toBe("complete");
    expect(resolved.totalDurationMin).toBe(base.totalDurationMin - 15);
  });

  it("rejects a replacement outside the route cluster", () => {
    const base = baseComposition();
    const resolved = applyLivingAtlasReplacements({
      baseComposition: base,
      request,
      replacements: { "nature-anchor": "wrong-cluster" },
      pool,
    });

    expect(resolved.appliedReplacements).toEqual({});
    expect(resolved.ignoredReplacements).toContainEqual({
      slotId: "nature-anchor",
      stopId: "wrong-cluster",
      reason: "route-boundary",
    });
  });

  it("offers no more than two deterministic safe alternatives per slot", () => {
    const base = baseComposition();
    const composition = applyLivingAtlasReplacements({ baseComposition: base, request, pool });
    const alternatives = buildLivingAtlasAlternatives({
      baseComposition: base,
      composition,
      request,
      pool,
    });
    const natureAlternatives = alternatives["nature-anchor"] ?? [];

    expect(natureAlternatives).toHaveLength(2);
    expect(natureAlternatives.map((item) => item.moment.stopId)).not.toContain("wrong-cluster");
    expect(
      natureAlternatives.every(
        (item) => item.moment.routeCluster === "arrabida-azeitao-sesimbra",
      ),
    ).toBe(true);
  });

  it("does not offer the exact market that was locked by a concrete answer for replacement", () => {
    const base = baseComposition();
    const composition = applyLivingAtlasReplacements({ baseComposition: base, request, pool });
    const alternatives = buildLivingAtlasAlternatives({
      baseComposition: base,
      composition,
      request,
      pool,
    });

    expect(alternatives["market-anchor"]).toBeUndefined();
  });
});
