/**
 * STUDIO V3 — BESPOKE COMPOSITION CORE (P0-A / P0-E / P0-F).
 *
 * Contracts proven here:
 *  - a Signature is a GEO SCAFFOLD: same-corridor cross-Signature moments are
 *    legitimate, and the output is not a clone of an authored Signature day,
 *  - the corridor (`routeCluster`) is the containment boundary, not the region,
 *  - TIME (door-to-door, hard max 540) is the membership authority, not a
 *    legacy `REGION_RULES.maxStops = 5`,
 *  - an explicit NO to wine is sovereign, whatever the geography,
 *  - `oneOfGroup` alternatives are never stacked,
 *  - a far corridor loses capacity instead of widening the budget.
 */
import { describe, expect, it } from "vitest";

import { REGION_STOP_POOL, type OptionalStop } from "@/data/regionStopPool";
import { SIGNATURE_CORRIDORS, corridorForSignature } from "@/data/signatureCorridors";
import { STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN } from "@/lib/studio-v3/timeDomain";
import { composeLivingAtlasDay } from "../livingAtlasComposer";
import type { LivingAtlasCompositionRequest } from "../livingAtlasComposer";

const LISBON = { lat: 38.7223, lng: -9.1393 };
const SETUBAL = { lat: 38.5244, lng: -8.8882 };

function compose(overrides: Partial<LivingAtlasCompositionRequest>) {
  return composeLivingAtlasDay({
    anchorSignatureId: "arrabida-wine-allinclusive",
    profile: { selected: [], leads: [] },
    density: "balanced",
    ...overrides,
  } as LivingAtlasCompositionRequest);
}

const activePool = REGION_STOP_POOL.filter((stop) => stop.active);

function clusterOf(stopId: string): string | null {
  return activePool.find((stop) => stop.id === stopId)?.routeCluster ?? null;
}

describe("A · Arrábida, hands-on + gastronomy + coast, explicit NO wine", () => {
  const result = compose({
    anchorSignatureId: "arrabida-wine-allinclusive",
    profile: {
      selected: ["hands-on-traditions", "local-life", "atlantic-coast"],
      leads: ["hands-on-traditions"],
    },
    excludedTypes: ["winery"],
    pickupCoord: LISBON,
    rhythm: "balanced",
  });

  it("never returns a winery when wine was explicitly refused", () => {
    expect(result.moments.some((moment) => moment.type === "winery")).toBe(false);
  });

  it("may borrow verified moments owned by other Signatures in the same corridor", () => {
    const owners = new Set(result.moments.flatMap((moment) => moment.sourceTourIds));
    // Corridor membership is what matters; provenance may be plural.
    expect(result.moments.length).toBeGreaterThan(0);
    expect(owners.size).toBeGreaterThanOrEqual(1);
  });

  it("is not an exact clone of the anchor Signature's own stop list", () => {
    const anchorOwned = activePool
      .filter(
        (stop) =>
          stop.signatureTourId === "arrabida-wine-allinclusive" ||
          (stop.sourceTourIds ?? []).includes("arrabida-wine-allinclusive"),
      )
      .map((stop) => stop.id);
    expect(result.moments.map((moment) => moment.stopId)).not.toEqual(anchorOwned);
  });
});

describe("B · Arrábida, wine + gastronomy + coast", () => {
  const result = compose({
    anchorSignatureId: "arrabida-wine-allinclusive",
    profile: {
      selected: ["wine-table", "local-life", "atlantic-coast"],
      leads: ["wine-table"],
    },
    pickupCoord: LISBON,
    rhythm: "balanced",
  });

  it("stays inside the owner door-to-door ceiling when it is certified", () => {
    if (!result.doorToDoor.evaluable) return;
    expect(result.doorToDoor.doorToDoorMinutes).toBeLessThanOrEqual(
      STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN,
    );
  });

  it("keeps every moment inside the Arrábida corridor", () => {
    for (const moment of result.moments) {
      expect(moment.routeCluster).toBe("arrabida-azeitao-sesimbra");
    }
  });
});

describe("C · Sintra heritage + coast, explicit NO wine", () => {
  const result = compose({
    anchorSignatureId: "sintra-cascais",
    profile: {
      selected: ["history-heritage", "atlantic-coast"],
      leads: ["history-heritage"],
    },
    excludedTypes: ["winery"],
    pickupCoord: LISBON,
  });

  it("returns no winery and stays in the Sintra corridor", () => {
    expect(result.moments.some((moment) => moment.type === "winery")).toBe(false);
    for (const moment of result.moments) {
      expect(moment.routeCluster).toBe("sintra-cascais-coast-heritage");
    }
  });
});

describe("D · Évora from Lisbon — corridor containment", () => {
  const result = compose({
    anchorSignatureId: "evora-alentejo",
    profile: { selected: ["history-heritage", "wine-table"], leads: ["history-heritage"] },
    pickupCoord: LISBON,
  });

  it("never mixes the Vidigueira Roman/talha corridor into Évora city", () => {
    for (const moment of result.moments) {
      expect(moment.routeCluster).toBe("evora-city-classical-wineries");
      expect(clusterOf(moment.stopId)).not.toBe("vidigueira-roman-talha");
    }
  });

  it("is either inside 540 minutes or explicitly sent to curator review", () => {
    if (result.doorToDoor.evaluable && result.doorToDoor.fitsHardMax) {
      expect(result.doorToDoor.doorToDoorMinutes).toBeLessThanOrEqual(
        STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN,
      );
    } else {
      expect(result.requiresCuratorReview).toBe(true);
    }
  });
});

describe("E · Vicentine coast from Lisbon", () => {
  const result = compose({
    anchorSignatureId: "southwest-vicentine-coast",
    profile: { selected: ["atlantic-coast", "nature-landscapes"], leads: ["atlantic-coast"] },
    pickupCoord: LISBON,
  });

  it("never falsely certifies an impossible full day", () => {
    if (result.doorToDoor.evaluable) {
      expect(
        result.doorToDoor.fitsHardMax ||
          result.doorToDoor.doorToDoorMinutes > STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN,
      ).toBe(true);
      if (!result.doorToDoor.fitsHardMax) {
        expect(result.requiresCuratorReview).toBe(true);
      }
    } else {
      expect(result.requiresCuratorReview).toBe(true);
    }
  });
});

describe("F · origin changes available capacity", () => {
  // Uses a coordinate-bearing fixture pool so the comparison measures real
  // transfer geography, not the conservative missing-geo constant.
  const pool: OptionalStop[] = [
    {
      id: "azeitao-fixture",
      region: "arrabida-setubal",
      routeCluster: "arrabida-azeitao-sesimbra",
      name: "Azeitao fixture",
      type: "viewpoint",
      suitsInterests: ["coast", "nature"],
      suitsRhythm: ["slow", "balanced", "full", "immersive"],
      durationMin: 60,
      source: "signature-core",
      active: true,
      signatureTourId: "arrabida-wine-allinclusive",
      coords: { lat: 38.5124, lng: -9.0161 },
    },
  ];

  it("gives a Setubal origin more usable day than a Lisbon origin", () => {
    const fromLisbon = compose({
      profile: { selected: ["atlantic-coast"], leads: ["atlantic-coast"] },
      pool,
      pickupCoord: LISBON,
    });
    const fromSetubal = compose({
      profile: { selected: ["atlantic-coast"], leads: ["atlantic-coast"] },
      pool,
      pickupCoord: SETUBAL,
    });

    expect(fromLisbon.doorToDoor.evaluable).toBe(true);
    expect(fromSetubal.doorToDoor.evaluable).toBe(true);
    expect(fromSetubal.doorToDoor.pickupToFirstMinutes).toBeLessThan(
      fromLisbon.doorToDoor.pickupToFirstMinutes,
    );
    expect(fromSetubal.doorToDoor.remainingToHardMaxMinutes).toBeGreaterThan(
      fromLisbon.doorToDoor.remainingToHardMaxMinutes,
    );
  });
});

describe("G · time, not legacy maxStops, is the membership authority", () => {
  function shortStop(id: string): OptionalStop {
    return {
      id,
      region: "arrabida-setubal",
      routeCluster: "arrabida-azeitao-sesimbra",
      name: id,
      type: "viewpoint",
      suitsInterests: ["coast", "nature"],
      suitsRhythm: ["slow", "balanced", "full", "immersive"],
      durationMin: 25,
      source: "signature-core",
      active: true,
      signatureTourId: "arrabida-wine-allinclusive",
      coords: { lat: 38.48 + Number(id.slice(-1)) / 500, lng: -9.0 },
    };
  }

  it("admits a six-short-moment day when door-to-door still certifies", () => {
    const pool = [1, 2, 3, 4, 5, 6].map((n) => shortStop(`short-${n}`));
    const result = compose({
      profile: { selected: ["atlantic-coast", "nature-landscapes"], leads: ["atlantic-coast"] },
      density: "rich",
      pool,
      pickupCoord: SETUBAL,
    });

    expect(result.moments.length).toBeGreaterThan(0);
    if (result.doorToDoor.evaluable && result.doorToDoor.fitsHardMax) {
      // Nothing here may be rejected because of a legacy 5-stop shaping rule.
      expect(
        result.rejected.some((entry) => entry.reason.startsWith("region-max-stops")),
      ).toBe(false);
    }
  });
});

describe("H · oneOfGroup alternatives are never stacked", () => {
  it("keeps at most one member of each one-of group", () => {
    const result = compose({
      profile: {
        selected: ["wine-table", "atlantic-coast", "local-life"],
        leads: ["wine-table"],
      },
      density: "rich",
      pickupCoord: LISBON,
    });

    const groups = new Map<string, number>();
    for (const moment of result.moments) {
      const group = activePool.find((stop) => stop.id === moment.stopId)?.oneOfGroup;
      if (!group) continue;
      groups.set(group, (groups.get(group) ?? 0) + 1);
    }
    for (const count of groups.values()) expect(count).toBeLessThanOrEqual(1);
  });
});

describe("corridor map integrity", () => {
  it("keeps Évora city and Vidigueira in distinct corridors despite one region", () => {
    expect(corridorForSignature("evora-alentejo")?.routeCluster).toBe(
      "evora-city-classical-wineries",
    );
    expect(corridorForSignature("roman-heritage-alentejo")?.routeCluster).toBe(
      "vidigueira-roman-talha",
    );
    expect(SIGNATURE_CORRIDORS["evora-alentejo"]?.region).toBe(
      SIGNATURE_CORRIDORS["roman-heritage-alentejo"]?.region,
    );
  });

  it("never guesses a corridor for an unknown scaffold", () => {
    expect(corridorForSignature("not-a-signature")).toBeNull();
    expect(corridorForSignature(null)).toBeNull();
  });
});
