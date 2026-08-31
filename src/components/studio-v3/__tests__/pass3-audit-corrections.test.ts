/**
 * BUILD 1 / Pass 3 — AUDIT CORRECTION GATES.
 *
 * Real proofs for the five audit findings:
 *  1. `requiredTypes` are traveller EXPERIENCE obligations, never
 *     `required-operational`.
 *  2. Matched mandatory operational stops go THROUGH the time composer.
 *  3. A truthful `tradeoff` is never projected as a finished day.
 *  4. `missing-coords` / unverified routing produces `route-review`.
 *  5. Real coexistence, real omission, real schedule reorder proofs.
 *
 * REMAINING PASS-4 LIMITATION: unmatched mandatory operational labels
 * (pickup / ferry / transfer without a stable inventory identity) have no
 * verified id or duration, so they remain conservative pass-through nodes and
 * are not time counted. Nothing is guessed here.
 */

import { describe, expect, it } from "vitest";

import { REGION_STOP_POOL, type OptionalStop } from "@/data/regionStopPool";
import { composeLivingAtlasDay } from "../livingAtlasComposer";
import { composeHybridDay, applyHybridComposition } from "../studioHybridComposition";
import { validateLivingAtlasOperations } from "../livingAtlasOperationalConfidence";
import { planLivingAtlasRoute, type LivingAtlasRoutePlan } from "../livingAtlasRoutePlanner";
import { applyLivingAtlasSchedule } from "../livingAtlasSchedule";
import { MERCADO_DO_LIVRAMENTO_STOP_ID } from "../dateGuards";
import { resolveTimeBudget } from "@/lib/studio-v3/resolveTimeBudget";
import type { ResolvedRoutePoint } from "../curation";

const ANCHOR_BOAT = "arrabida-boat" as const;

const COAST_PROFILE = {
  selected: ["atlantic-coast", "hands-on-traditions"],
  leads: ["atlantic-coast"],
} as const;

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
    timeBudget: resolveTimeBudget({ explicitMinutes: 510 }),
    ...overrides,
  } as never);
}

/* 1 · requiredTypes are traveller obligations ------------------------ */

describe("Pass 3 audit · requiredTypes semantics", () => {
  it("classifies a traveller-required boat as principal, not required-operational", () => {
    const result = hybrid({
      requiredTypes: ["boat"],
      principalStopIds: [],
      mandatoryOperationalLabels: ["Hotel pickup"],
    });
    expect(result.passthrough).toBe(false);
    const boat = result.moments.find((moment) => moment.stopId === "arrabida-bay-boat");
    expect(boat).toBeDefined();
    expect(boat?.role).toBe("principal");
    for (const moment of result.moments) {
      if (moment.role === "required-operational") expect(moment.stopId).toBeNull();
    }
  });
});

/* 2 · matched mandatory operational stops are composer-protected ----- */

describe("Pass 3 audit · matched mandatory operational nodes", () => {
  const result = hybrid({
    principalStopIds: ["arrabida-bay-boat"],
    mandatoryOperationalLabels: ["Hotel pickup", "Sesimbra"],
  });

  it("sends the matched stop through the composer and keeps it when it fits", () => {
    expect(result.passthrough).toBe(false);
    const selected = result.composition?.moments.map((moment) => moment.stopId) ?? [];
    expect(selected).toContain("sesimbra-village");
  });

  it("projects the matched mandatory stop as required-operational", () => {
    const sesimbra = result.moments.find((moment) => moment.stopId === "sesimbra-village");
    expect(sesimbra?.role).toBe("required-operational");
  });

  it("never re-adds a matched mandatory stop the time authority dropped", () => {
    for (const moment of result.moments) {
      if (moment.stopId === null) continue;
      expect(result.composition?.moments.some((m) => m.stopId === moment.stopId)).toBe(true);
    }
  });
});

/* 3 · tradeoff is never projected as a final day --------------------- */

describe("Pass 3 audit · tradeoff safety seam", () => {
  const obligations = [
    "arrabida-bay-boat",
    "azulejos-painting-workshop",
    "quinta-velha-cheese-workshop",
  ];

  it("composer reports a truthful tradeoff on a Half Day", () => {
    const composition = composeLivingAtlasDay({
      anchorSignatureId: ANCHOR_BOAT,
      profile: COAST_PROFILE as never,
      density: "balanced",
      rhythm: "balanced",
      timeBudget: resolveTimeBudget({ experienceDurationClass: "half-day" }),
      mustIncludeStopIds: [...obligations],
    });
    expect(composition.status).toBe("tradeoff");
    expect(composition.conflict?.unfittedRequests.length).toBeGreaterThan(0);
  });

  it("hybrid keeps the authored route and does not present a partial day", () => {
    const result = hybrid({
      principalStopIds: obligations,
      timeBudget: resolveTimeBudget({ experienceDurationClass: "half-day" }),
    });
    expect(result.composition?.status).toBe("tradeoff");
    expect(result.passthrough).toBe(true);
    expect(result.points.map((point) => point.label)).toEqual(
      AUTHORED.map((point) => point.label),
    );
    for (const moment of result.moments) {
      expect(moment.stopId).toBeNull();
      expect(moment.role).toBe("skeleton-default");
    }
    const projected = applyHybridComposition(AUTHORED, {
      skeletonTourId: ANCHOR_BOAT,
      feeling: null,
      interests: ["coast"],
      rhythm: "balanced",
      principalStopIds: obligations,
      timeBudget: resolveTimeBudget({ experienceDurationClass: "half-day" }),
    } as never);
    expect(projected.map((point) => point.label)).toEqual(AUTHORED.map((point) => point.label));
  });
});

/* 4 · missing coords produce route-review ---------------------------- */

describe("Pass 3 audit · route certification", () => {
  it("returns route-review with missing-coords for the real un-located boat", () => {
    const composition = composeLivingAtlasDay({
      anchorSignatureId: ANCHOR_BOAT,
      profile: COAST_PROFILE as never,
      density: "balanced",
      rhythm: "balanced",
      timeBudget: resolveTimeBudget({ explicitMinutes: 510 }),
      mustIncludeStopIds: ["arrabida-bay-boat"],
    });
    expect(composition.moments.map((moment) => moment.stopId)).toContain("arrabida-bay-boat");
    expect(REGION_STOP_POOL.find((stop) => stop.id === "arrabida-bay-boat")?.coords).toBeUndefined();

    const plan = planLivingAtlasRoute({
      composition: { moments: composition.moments } as never,
      pool: REGION_STOP_POOL,
    });
    const result = validateLivingAtlasOperations({
      composition,
      routePlan: plan as never,
    });
    expect(result.status).toBe("route-review");
    expect(result.reasons.some((reason) => reason.code === "missing-coords")).toBe(true);
    expect(result.compositionStopIds).toEqual(
      [...composition.moments.map((moment) => moment.stopId)].sort((a, b) => a.localeCompare(b)),
    );
  });
});

/* 5A · boat + Sesimbra really compose together ----------------------- */

describe("Pass 3 audit · boat and Sesimbra coexistence", () => {
  it("selects both real ids together on a truthful full day", () => {
    const composition = composeLivingAtlasDay({
      anchorSignatureId: ANCHOR_BOAT,
      profile: COAST_PROFILE as never,
      density: "balanced",
      rhythm: "balanced",
      timeBudget: resolveTimeBudget({ explicitMinutes: 510 }),
      mustIncludeStopIds: ["arrabida-bay-boat", "sesimbra-village"],
    });
    const ids = composition.moments.map((moment) => moment.stopId);
    expect(ids).toContain("arrabida-bay-boat");
    expect(ids).toContain("sesimbra-village");
    expect(composition.status).not.toBe("tradeoff");
  });
});

/* 5B · generic tile visit is really replaced ------------------------- */

describe("Pass 3 audit · generic skeleton omission", () => {
  it("omits the generic tile factory visit when the painting workshop is chosen", () => {
    const result = hybrid({
      principalStopIds: ["azulejos-painting-workshop"],
      mandatoryOperationalLabels: ["Hotel pickup"],
    });
    expect(result.passthrough).toBe(false);
    const kept = result.moments.map((moment) => moment.stopId);
    expect(kept).toContain("azulejos-painting-workshop");
    expect(kept).not.toContain("azulejos-de-azeitao");
    expect(result.omitted.some((moment) => moment.stopId === "azulejos-de-azeitao")).toBe(true);
    expect(result.points.map((point) => point.label)).not.toContain("Azulejos de Azeitão");
  });
});

/* 5C/5D · schedule-review and real reorder identity ------------------ */

const SCHEDULE_POOL = [
  {
    id: MERCADO_DO_LIVRAMENTO_STOP_ID,
    name: "Mercado do Livramento",
    type: "market",
    region: "arrabida-setubal",
    coords: { lat: 38.5244, lng: -8.8882 },
    durationMin: 45,
    active: true,
  },
  {
    id: "sesimbra-village",
    name: "Sesimbra",
    type: "village",
    region: "arrabida-setubal",
    coords: { lat: 38.4436, lng: -9.1017 },
    durationMin: 45,
    active: true,
  },
] as unknown as OptionalStop[];

function momentOf(stopId: string) {
  return { stopId };
}

function planFor(order: string[]): LivingAtlasRoutePlan {
  return {
    status: "ready",
    orderedMoments: order.map(momentOf),
    legs: [{ estimatedRoadKm: 20 }],
    totalEstimatedRoadKm: 20,
    totalEstimatedDrivingMin: 30,
    locatedMomentCount: order.length,
    totalMomentCount: order.length,
    maxDrivingMin: 180,
    maxTotalKm: 250,
    maxLegKm: 60,
    warnings: [],
    methodology: "verified-coordinates-estimate",
  } as unknown as LivingAtlasRoutePlan;
}

describe("Pass 3 audit · schedule-review is distinct from route-review", () => {
  const composition = {
    status: "complete",
    moments: [momentOf("sesimbra-village"), momentOf(MERCADO_DO_LIVRAMENTO_STOP_ID)],
  };

  it("flags Mercado on a Monday as schedule-review with window-conflict", () => {
    const result = validateLivingAtlasOperations({
      composition,
      routePlan: planFor(["sesimbra-village", MERCADO_DO_LIVRAMENTO_STOP_ID]) as never,
      selectedDate: "2026-08-03", // Monday
    });
    expect(result.status).toBe("schedule-review");
    expect(result.reasons.some((reason) => reason.code === "window-conflict")).toBe(true);
    expect(result.reasons.some((reason) => reason.code === "missing-coords")).toBe(false);
  });

  it("stays valid on an open day with a fully located route", () => {
    const result = validateLivingAtlasOperations({
      composition,
      routePlan: planFor(["sesimbra-village", MERCADO_DO_LIVRAMENTO_STOP_ID]) as never,
      selectedDate: "2026-08-04",
    });
    expect(result.status).toBe("valid");
  });
});

describe("Pass 3 audit · real schedule reorder preserves identity", () => {
  it("moves Mercado first on an open day without changing membership", () => {
    const routePlan = planFor(["sesimbra-village", MERCADO_DO_LIVRAMENTO_STOP_ID]);
    const scheduled = applyLivingAtlasSchedule({
      routePlan,
      pool: SCHEDULE_POOL,
      selectedDate: "2026-08-04",
    });

    expect(scheduled.orderedMoments[0].stopId).toBe(MERCADO_DO_LIVRAMENTO_STOP_ID);
    const before = routePlan.orderedMoments.map((m) => m.stopId).sort();
    const after = scheduled.orderedMoments.map((m) => m.stopId).sort();
    expect(after).toEqual(before);

    const result = validateLivingAtlasOperations({
      composition: {
        status: "complete",
        moments: [momentOf("sesimbra-village"), momentOf(MERCADO_DO_LIVRAMENTO_STOP_ID)],
      },
      routePlan: routePlan as never,
      scheduledPlan: scheduled as never,
      selectedDate: "2026-08-04",
    });
    expect(result.status).not.toBe("invalid");
    expect(result.reasons.some((reason) => reason.code === "schedule-reordered")).toBe(true);
    expect(result.compositionStopIds).toEqual(before);
  });
});

/* 6 · FINAL SAFETY CORRECTION ---------------------------------------- */

const TILE_AUTHORED: ResolvedRoutePoint[] = [
  { index: 0, label: "Hotel pickup", story: "", lat: null, lng: null },
  { index: 1, label: "Azulejos de Azeitão", story: "", lat: null, lng: null },
  { index: 2, label: "Sesimbra", story: "", lat: null, lng: null },
];

describe("Pass 3 final safety · only a COMPLETE composition may project", () => {
  // Both tile variants are mutually exclusive real inventory, so the composer
  // selects one, hard-fails the other and still returns a non-empty set.
  const input = {
    skeletonTourId: "tiles-workshop",
    feeling: null,
    interests: ["heritage"],
    rhythm: "balanced",
    timeBudget: resolveTimeBudget({ explicitMinutes: 510 }),
    principalStopIds: ["azulejos-de-azeitao", "azulejos-painting-workshop"],
  } as never;

  it("never projects a NON-EMPTY impossible composition", () => {
    const result = composeHybridDay(TILE_AUTHORED, input);
    expect(result.composition?.status).toBe("impossible");
    expect(result.composition?.moments.length).toBeGreaterThan(0);
    expect(result.passthrough).toBe(true);
    expect(result.points).toEqual(TILE_AUTHORED);
    expect(applyHybridComposition(TILE_AUTHORED, input)).toEqual(TILE_AUTHORED);
  });
});

describe("Pass 3 final safety · date closure never mutates membership", () => {
  const mercadoInput = (dateExact: string | null) =>
    ({
      skeletonTourId: ANCHOR_BOAT,
      feeling: null,
      interests: ["gastronomy", "coast"],
      rhythm: "balanced",
      timeBudget: resolveTimeBudget({ explicitMinutes: 510 }),
      principalStopIds: [MERCADO_DO_LIVRAMENTO_STOP_ID],
      dateExact,
    }) as never;

  it("returns the authored route untouched when Mercado is closed (Monday)", () => {
    const monday = "2026-08-03";
    const result = composeHybridDay(TILE_AUTHORED, mercadoInput(monday));
    expect(result.composition?.status).toBe("complete");
    expect(result.composition?.moments.map((m) => m.stopId)).toContain(
      MERCADO_DO_LIVRAMENTO_STOP_ID,
    );
    expect(result.passthrough).toBe(true);
    expect(result.points).toEqual(TILE_AUTHORED);
    expect(applyHybridComposition(TILE_AUTHORED, mercadoInput(monday))).toEqual(TILE_AUTHORED);
    // membership identity preserved, nothing silently dropped
    expect(
      result.composition?.moments.some((m) => m.stopId === MERCADO_DO_LIVRAMENTO_STOP_ID),
    ).toBe(true);
  });

  it("open-day control: the same request composes normally on a Tuesday", () => {
    const result = composeHybridDay(TILE_AUTHORED, mercadoInput("2026-08-04"));
    expect(result.composition?.status).toBe("complete");
    expect(result.passthrough).toBe(false);
    expect(result.points.map((p) => p.label)).toContain("Mercado do Livramento");
  });
});
