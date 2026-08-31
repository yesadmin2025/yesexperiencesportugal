/**
 * BUILD 1 / Pass 3 — HYBRID COMPOSITION TRUTH GATES.
 *
 * These tests certify real inventory truth (durations, provenance, one-of
 * semantics), capability-based semantics, skeleton replaceability, the single
 * composition authority and the structured operational validation contract.
 *
 * No fixture invents a tour, a stop, a partner or a duration: every asserted
 * number comes from `tailorBlueprints.ts` structural truth.
 */

import { describe, expect, it } from "vitest";

import { REGION_STOP_POOL, type OptionalStop } from "@/data/regionStopPool";
import { deriveLivingAtlasDimensions } from "../livingAtlasInventory";
import { composeLivingAtlasDay } from "../livingAtlasComposer";
import { composeHybridDay, applyHybridComposition } from "../studioHybridComposition";
import { validateLivingAtlasOperations } from "../livingAtlasOperationalConfidence";
import { planLivingAtlasRoute } from "../livingAtlasRoutePlanner";
import { resolveTimeBudget } from "@/lib/studio-v3/resolveTimeBudget";
import type { ResolvedRoutePoint } from "../curation";

const ANCHOR_BOAT = "arrabida-boat" as const;

function stop(id: string): OptionalStop {
  const found = REGION_STOP_POOL.find((entry) => entry.id === id);
  if (!found) throw new Error(`missing pool stop: ${id}`);
  return found;
}

/* ------------------------------------------------------------------ *
 * 1 · Real inventory truth
 * ------------------------------------------------------------------ */

describe("Pass 3 · real inventory truth", () => {
  it("uses the 150-minute Tailor structural dwell for the real Arrábida boat", () => {
    const boat = stop("arrabida-bay-boat");
    expect(boat.durationMin).toBe(150);
    expect(boat.durationMin).not.toBe(240); // composite chapter
    expect(boat.durationMin).not.toBe(75); // add-on day-cost abstraction
    expect(boat.type).toBe("boat");
    expect(boat.sourceTourIds).toEqual([ANCHOR_BOAT]);
    expect(boat.capabilities).toContain("from-water");
  });

  it("never imports a 240-minute composite chapter as a pure boat moment", () => {
    const composites = REGION_STOP_POOL.filter(
      (entry) => entry.type === "boat" && entry.durationMin >= 240,
    );
    expect(composites).toEqual([]);
  });

  it("lets the boat and Sesimbra village coexist (both are separate core moments)", () => {
    const boat = stop("arrabida-bay-boat");
    const village = REGION_STOP_POOL.find((entry) => /sesimbra/i.test(entry.name));
    expect(village).toBeDefined();
    const sharedGroup = boat.oneOfGroup && boat.oneOfGroup === village?.oneOfGroup;
    expect(sharedGroup).toBeFalsy();
  });

  it("normalises the generic tile factory visit to 45 minutes, non-participatory", () => {
    const visit = stop("azulejos-de-azeitao");
    expect(visit.durationMin).toBe(45);
    expect(visit.sourceTourIds).toEqual(["arrabida-wine-allinclusive"]);
    expect(visit.capabilities ?? []).not.toContain("participatory");
    expect(visit.oneOfGroup).toBe("azeitao-tile-experience-choice");
  });

  it("adds the 90-minute private tile-painting workshop as participatory truth", () => {
    const painting = stop("azulejos-painting-workshop");
    expect(painting.durationMin).toBe(90);
    expect(painting.sourceTourIds).toEqual(["tiles-workshop"]);
    expect(painting.capabilities).toContain("participatory");
    expect(painting.oneOfGroup).toBe("azeitao-tile-experience-choice");
  });

  it("keeps cheese-making at 75 minutes, participatory and free of the tile one-of", () => {
    const cheese = stop("quinta-velha-cheese-workshop");
    expect(cheese.durationMin).toBe(75);
    expect(cheese.signatureTourId).toBe("azeitao-cheese");
    expect(cheese.capabilities).toContain("participatory");
    expect(cheese.oneOfGroup).toBeUndefined();
  });

  it("retires the false tile-vs-cheese one-of group entirely", () => {
    const legacy = REGION_STOP_POOL.filter(
      (entry) => entry.oneOfGroup === "azeitao-workshop-choice",
    );
    expect(legacy).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 2 · Capability semantics
 * ------------------------------------------------------------------ */

describe("Pass 3 · capability semantics", () => {
  it("derives hands-on for Quinta Velha although its name carries no craft keyword", () => {
    const cheese = stop("quinta-velha-cheese-workshop");
    expect(/workshop|paint|tile|cheese|pottery|artisan/i.test(cheese.name)).toBe(false);
    const dimensions = deriveLivingAtlasDimensions({
      label: cheese.name,
      intentionTags: cheese.suitsInterests,
      capabilities: cheese.capabilities ?? [],
    });
    expect(dimensions).toContain("hands-on-traditions");
  });

  it("does NOT derive hands-on for an observational workshop without the capability", () => {
    const dimensions = deriveLivingAtlasDimensions({
      label: "Cork interpretive centre workshop",
      intentionTags: ["heritage"],
      capabilities: [],
    });
    expect(dimensions).not.toContain("hands-on-traditions");
  });

  it("keeps the generic tile factory visit out of hands-on inventory", () => {
    const visit = stop("azulejos-de-azeitao");
    const dimensions = deriveLivingAtlasDimensions({
      label: visit.name,
      intentionTags: visit.suitsInterests,
      capabilities: visit.capabilities ?? [],
    });
    expect(dimensions).not.toContain("hands-on-traditions");
  });

  it("derives hands-on for the private tile-painting workshop", () => {
    const painting = stop("azulejos-painting-workshop");
    const dimensions = deriveLivingAtlasDimensions({
      label: painting.name,
      intentionTags: painting.suitsInterests,
      capabilities: painting.capabilities ?? [],
    });
    expect(dimensions).toContain("hands-on-traditions");
  });

  it("keeps legacy label evidence for non-inventory callers only", () => {
    const dimensions = deriveLivingAtlasDimensions({ label: "Pottery workshop" });
    expect(dimensions).toContain("hands-on-traditions");
  });
});

/* ------------------------------------------------------------------ *
 * 3 · Composition — one authority, time-governed
 * ------------------------------------------------------------------ */

const HANDS_ON_WATER_PROFILE = {
  selected: ["hands-on-traditions", "atlantic-coast"],
  leads: ["hands-on-traditions", "atlantic-coast"],
} as const;

function composeArrabida(minutes: number, extra: Record<string, unknown> = {}) {
  return composeLivingAtlasDay({
    anchorSignatureId: ANCHOR_BOAT,
    profile: HANDS_ON_WATER_PROFILE as never,
    density: "balanced",
    rhythm: "balanced",
    timeBudget: resolveTimeBudget({ explicitMinutes: minutes }),
    mustIncludeStopIds: ["azulejos-painting-workshop", "arrabida-bay-boat"],
    ...extra,
  });
}

describe("Pass 3 · time-governed hybrid composition", () => {
  it("composes the real 90-minute painting workshop + real 150-minute boat on a full day", () => {
    const result = composeArrabida(510);
    const ids = result.moments.map((moment) => moment.stopId);
    expect(ids).toContain("azulejos-painting-workshop");
    expect(ids).toContain("arrabida-bay-boat");
    expect(result.status).not.toBe("invalid");
  });

  it("never places the generic tile visit alongside the painting workshop", () => {
    const ids = composeArrabida(510).moments.map((moment) => moment.stopId);
    expect(ids.includes("azulejos-de-azeitao") && ids.includes("azulejos-painting-workshop")).toBe(
      false,
    );
  });

  it("allows cheese-making and tile painting together when time truthfully permits", () => {
    const result = composeLivingAtlasDay({
      anchorSignatureId: ANCHOR_BOAT,
      profile: { selected: ["hands-on-traditions"], leads: ["hands-on-traditions"] } as never,
      density: "balanced",
      rhythm: "balanced",
      timeBudget: resolveTimeBudget({ explicitMinutes: 540 }),
      mustIncludeStopIds: ["azulejos-painting-workshop", "quinta-velha-cheese-workshop"],
    });
    const ids = result.moments.map((moment) => moment.stopId);
    expect(ids).toContain("azulejos-painting-workshop");
    expect(ids).toContain("quinta-velha-cheese-workshop");
  });

  it("returns a truthful tradeoff instead of over-stuffing a half day", () => {
    // 150 (boat) + 90 (painting) + 75 (cheese) cannot truthfully fit a Half
    // Day envelope, so the composer must say so rather than silently drop.
    const result = composeLivingAtlasDay({
      anchorSignatureId: ANCHOR_BOAT,
      profile: HANDS_ON_WATER_PROFILE as never,
      density: "balanced",
      rhythm: "balanced",
      timeBudget: resolveTimeBudget({ experienceDurationClass: "half-day" }),
      mustIncludeStopIds: [
        "arrabida-bay-boat",
        "azulejos-painting-workshop",
        "quinta-velha-cheese-workshop",
      ],
    });
    expect(result.status).toBe("tradeoff");
    expect(result.conflict).not.toBeNull();
    expect(result.conflict?.unfittedRequests.length).toBeGreaterThan(0);
    for (const unfitted of result.conflict?.unfittedRequests ?? []) {
      expect(unfitted.minimumExtraMinutesNeeded).toBeGreaterThan(0);
    }
  });

  it("keeps region / route cluster containment and source provenance", () => {
    for (const moment of composeArrabida(510).moments) {
      const entry = REGION_STOP_POOL.find((candidate) => candidate.id === moment.stopId);
      expect(entry?.region).toBe("arrabida-setubal");
      expect(moment.sourceTourIds.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for an identical request", () => {
    const a = composeArrabida(510).moments.map((moment) => moment.stopId);
    const b = composeArrabida(510).moments.map((moment) => moment.stopId);
    expect(a).toEqual(b);
  });
});

/* ------------------------------------------------------------------ *
 * 4 · Hybrid adapter — skeleton is never sacred, maxPoints is inert
 * ------------------------------------------------------------------ */

const AUTHORED: ResolvedRoutePoint[] = [
  { index: 0, label: "Hotel pickup", story: "", lat: null, lng: null },
  { index: 1, label: "Azulejos de Azeitão", story: "", lat: null, lng: null },
  { index: 2, label: "Sesimbra", story: "", lat: null, lng: null },
];

function hybrid(overrides: Record<string, unknown> = {}) {
  return composeHybridDay(AUTHORED, {
    skeletonTourId: ANCHOR_BOAT,
    feeling: null,
    interests: ["coast"],
    rhythm: "balanced",
    principalStopIds: ["azulejos-painting-workshop", "arrabida-bay-boat"],
    mandatoryOperationalLabels: ["Hotel pickup"],
    timeBudget: resolveTimeBudget({ explicitMinutes: 510 }),
    ...overrides,
  } as never);
}

describe("Pass 3 · hybrid policy adapter", () => {
  it("keeps mandatory operational nodes and really omits the replaced generic moment", () => {
    const result = hybrid();
    const labels = result.points.map((point) => point.label);
    expect(labels).toContain("Hotel pickup");
    expect(result.passthrough).toBe(false);
    expect(result.moments.map((moment) => moment.stopId)).toContain(
      "azulejos-painting-workshop",
    );
    expect(result.moments.map((moment) => moment.stopId)).not.toContain("azulejos-de-azeitao");
    expect(result.omitted.some((moment) => moment.stopId === "azulejos-de-azeitao")).toBe(true);
  });


  it("never mutates the authored input array", () => {
    const snapshot = JSON.stringify(AUTHORED);
    hybrid();
    expect(JSON.stringify(AUTHORED)).toBe(snapshot);
  });

  it("treats maxPoints as behaviour-free", () => {
    const few = applyHybridComposition(AUTHORED, {
      skeletonTourId: ANCHOR_BOAT,
      feeling: null,
      interests: ["coast"],
      rhythm: "balanced",
      maxPoints: 2,
      timeBudget: resolveTimeBudget({ explicitMinutes: 510 }),
    } as never);
    const many = applyHybridComposition(AUTHORED, {
      skeletonTourId: ANCHOR_BOAT,
      feeling: null,
      interests: ["coast"],
      rhythm: "balanced",
      maxPoints: 40,
      timeBudget: resolveTimeBudget({ explicitMinutes: 510 }),
    } as never);
    expect(few).toEqual(many);
  });

  it("carries no count authority in its source", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/components/studio-v3/studioHybridComposition.ts", "utf8"),
    );
    expect(source).not.toMatch(/RHYTHM_STOP_COUNT/);
    expect(source).not.toMatch(/slice\(0, *maxPoints\)/);
  });
});

/* ------------------------------------------------------------------ *
 * 5 · Operational validation contract
 * ------------------------------------------------------------------ */

describe("Pass 3 · structured operational validation", () => {
  const composition = composeArrabida(510);
  const resolved = {
    moments: composition.moments,
  } as never;

  it("returns valid / route-review / schedule-review / invalid only", () => {
    const plan = planLivingAtlasRoute({ composition: resolved, pool: REGION_STOP_POOL });
    const result = validateLivingAtlasOperations({
      composition,
      routePlan: plan as never,
    });
    expect(["valid", "route-review", "schedule-review", "invalid"]).toContain(result.status);
    expect(result.compositionStopIds).toEqual(
      [...composition.moments.map((moment) => moment.stopId)].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("fails hard when route or schedule mutates the sold identity set", () => {
    const plan = planLivingAtlasRoute({ composition: resolved, pool: REGION_STOP_POOL }) as never as {
      orderedMoments: Array<{ stopId: string }>;
    };
    const mutated = {
      ...(plan as object),
      orderedMoments: plan.orderedMoments.slice(1),
    } as never;
    const result = validateLivingAtlasOperations({ composition, routePlan: mutated });
    expect(result.status).toBe("invalid");
    expect(result.reasons[0].code).toBe("identity-set-mutated");
  });

  it("treats reordering as identity-preserving", () => {
    const plan = planLivingAtlasRoute({ composition: resolved, pool: REGION_STOP_POOL }) as never as {
      orderedMoments: Array<{ stopId: string }>;
    };
    const reordered = {
      ...(plan as object),
      orderedMoments: [...plan.orderedMoments].reverse(),
    } as never;
    const result = validateLivingAtlasOperations({
      composition,
      routePlan: plan as never,
      scheduledPlan: reordered,
    });
    expect(result.status).not.toBe("invalid");
    expect(result.reasons.some((reason) => reason.code === "schedule-reordered")).toBe(true);
  });

  it("distinguishes route-review from schedule-review", () => {
    const plan = planLivingAtlasRoute({ composition: resolved, pool: REGION_STOP_POOL }) as never as Record<string, unknown>;
    const overDistance = {
      ...plan,
      totalEstimatedRoadKm: 10_000,
      maxTotalKm: 100,
    } as never;
    const routeResult = validateLivingAtlasOperations({
      composition,
      routePlan: overDistance,
    });
    expect(routeResult.status).toBe("route-review");
    expect(routeResult.reasons.some((r) => r.code === "distance-exceeds-plan")).toBe(true);
  });
});
