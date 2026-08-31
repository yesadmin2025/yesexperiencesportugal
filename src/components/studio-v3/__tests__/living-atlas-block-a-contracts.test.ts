/**
 * BUILD 1 / Pass 4 — BLOCK A contracts.
 *
 * Proves the live Living Atlas architecture:
 *  - RAW Signature skeleton is the only composer input (no pre-composer date,
 *    mobility or legacy membership shaping),
 *  - the public route is either the safe composed day or the RAW authored
 *    skeleton, and `routePoints` is always a strict prefix slice of it,
 *  - an unresolved composition is never certified,
 *  - mobility / unverified connector signals reach the ONE validator,
 *  - Monday Mercado stays in the day and becomes a schedule review,
 *  - verified Sado ferry minutes stay internal transit and are added on top.
 */
import { describe, expect, it, vi } from "vitest";

import {
  buildUncertifiedLivingAtlasBlock,
  resolveLivingAtlasCompositionResolution,
  type LivingAtlasCompositionResolutionInput,
  resolveStudioV3CurationAuthority,
  resolveStudioV3Route,
} from "../curation";
import { composeHybridDay } from "../studioHybridComposition";
import { validateLivingAtlasOperations } from "../livingAtlasOperationalConfidence";
import { MERCADO_DO_LIVRAMENTO_STOP_ID } from "../dateGuards";
import { signatureTours } from "@/data/signatureTours";

const BASE = {
  feeling: "wine-food" as const,
  companions: "couple" as const,
  rhythm: "balanced" as const,
  interests: ["gastronomy", "coast"] as const,
  pickup: "lisbon" as const,
};

function resolve(overrides: Record<string, unknown> = {}) {
  return resolveStudioV3Route({
    ...BASE,
    interests: [...BASE.interests],
    ...overrides,
  } as Parameters<typeof resolveStudioV3Route>[0]);
}

import { projectAuthoredAnchorStops } from "../authoredAnchorProjection";

function authoredLabels(tourId: string): string[] {
  const tour = signatureTours.find((candidate) => candidate.id === tourId);
  if (!tour) throw new Error(`missing anchor ${tourId}`);
  // P0-A: the authored fallback is the PROJECTED anchor (surplus alternative
  // pool candidates removed) — the raw candidate list is never sellable.
  return projectAuthoredAnchorStops(tourId, tour.stops).points.map((stop) => stop.label);
}

const ARRABIDA = "arrabida-wine-allinclusive";
const TROIA = "troia-comporta";
const MONDAY = "2026-08-03";
const TUESDAY = "2026-08-04";

describe("Block A · one live membership authority", () => {
  it("does not execute the legacy authority for a Living Atlas anchor", () => {
    const legacy = vi.fn(() => ({ legacy: true }));
    const authority = resolveStudioV3CurationAuthority(ARRABIDA, legacy);
    expect(authority.path).toBe("living-atlas");
    expect(authority.legacy).toBeNull();
    expect(legacy).not.toHaveBeenCalled();
  });

  it("sends the RAW Signature skeleton to the composer, unshaped", () => {
    const resolved = resolve({ preferTourId: ARRABIDA, dateExact: TUESDAY });
    const live = resolved.livingAtlasLive;
    expect(live).not.toBeNull();
    expect(live!.anchorTourId).toBe(ARRABIDA);

    // The composer, fed the raw skeleton, reproduces exactly the live membership.
    const raw = authoredLabels(ARRABIDA).map((label, index) => ({
      index,
      label,
      story: "",
      lat: null,
      lng: null,
    }));
    const direct = composeHybridDay(raw, {
      skeletonTourId: ARRABIDA,
      feeling: BASE.feeling,
      interests: [...BASE.interests],
      rhythm: BASE.rhythm,
      wineIntent: true,
      dateExact: TUESDAY,
    });
    expect(direct.composition?.moments.map((m) => m.stopId).sort()).toEqual(
      [...live!.compositionStopIds].sort(),
    );
  });

  it("never lets a Monday closure or a mobility concern shape membership pre-composer", () => {
    const open = resolve({ preferTourId: ARRABIDA, dateExact: TUESDAY });
    const monday = resolve({ preferTourId: ARRABIDA, dateExact: MONDAY });
    const mobility = resolve({
      preferTourId: ARRABIDA,
      dateExact: TUESDAY,
      considerations: ["reduced-mobility"],
    });

    const ids = (r: typeof open) => [...(r.livingAtlasLive?.compositionStopIds ?? [])].sort();
    expect(ids(monday)).toEqual(ids(open));
    expect(ids(mobility)).toEqual(ids(open));
    expect(ids(open)).toContain(MERCADO_DO_LIVRAMENTO_STOP_ID);
  });
});

describe("Block A · raw authored fallback and strict slice", () => {
  it("falls back to the RAW authored skeleton, with no legacy shaping", () => {
    const resolved = resolve({ preferTourId: ARRABIDA, dateExact: TUESDAY });
    expect(resolved.livingAtlasLive?.liveResolution).toBe("authored-fallback");
    expect(resolved.composedRoutePoints.map((p) => p.label)).toEqual(authoredLabels(ARRABIDA));
  });

  it("keeps routePoints a strict prefix slice for every live outcome", () => {
    for (const args of [
      { preferTourId: ARRABIDA, dateExact: TUESDAY },
      { preferTourId: ARRABIDA, dateExact: MONDAY },
      { preferTourId: TROIA, dateExact: TUESDAY },
    ]) {
      const resolved = resolve(args);
      expect(resolved.livingAtlasLive).not.toBeNull();
      expect(resolved.routePoints.map((p) => p.label)).toEqual(
        resolved.composedRoutePoints.slice(0, resolved.routePoints.length).map((p) => p.label),
      );
      expect(resolved.composedRoutePoints.map((p) => p.index)).toEqual(
        resolved.composedRoutePoints.map((_, i) => i),
      );
    }
  });
});

describe("Block A · structural resolution gate", () => {
  it("certifies a complete day", () => {
    const complete = resolve({ preferTourId: ARRABIDA, dateExact: TUESDAY }).livingAtlasLive!;
    expect(complete.compositionResolution).toBe("complete");
    expect(complete.routePlan).not.toBeNull();
    expect(complete.validation).not.toBeNull();
    expect(complete.identity).not.toBeNull();

  });

  it("certifies the production gate for every composition status", () => {
    const moment = { stopId: "azeitao-village" };
    const cases: Array<
      [string, LivingAtlasCompositionResolutionInput, ReturnType<typeof resolveLivingAtlasCompositionResolution>]
    > = [
      ["complete + moments", { status: "complete", moments: [moment] }, "complete"],
      ["complete + zero moments", { status: "complete", moments: [] }, "unresolved"],
      ["tradeoff", { status: "tradeoff", moments: [moment] }, "unresolved"],
      ["partial", { status: "partial", moments: [moment] }, "unresolved"],
      ["impossible", { status: "impossible", moments: [moment] }, "unresolved"],
      ["invalid", { status: "invalid", moments: [moment] }, "unresolved"],
      ["null", null, "unresolved"],
    ];
    for (const [name, composition, expected] of cases) {
      expect(resolveLivingAtlasCompositionResolution(composition), name).toBe(expected);
    }
  });

  it("never certifies a deterministic unresolved composition", () => {
    const composition = null;
    const compositionResolution = resolveLivingAtlasCompositionResolution(composition);
    expect(compositionResolution).toBe("unresolved");

    const unresolved = buildUncertifiedLivingAtlasBlock({
      anchorTourId: ARRABIDA,
      composition,
      conflict: null,
      passthroughReason: "thin-profile",
      compositionResolution,
      fallbackReason: "passthrough",
      compositionStopIds: [],
      planningTiming: null,
      approximateDurationClass: null,
      internalTransitMinutes: 0,
      totalPlannedMinutesIncludingInternalTransit: null,
      internalIssues: [],
    });
    expect(unresolved.identity).toBeNull();
    expect(unresolved.routePlan).toBeNull();
    expect(unresolved.scheduledStopIds).toEqual([]);
    expect(unresolved.validation).toBeNull();
    expect(unresolved.commercialLedger).toBeNull();
    expect(unresolved.commercialDisposition).toBeNull();
    expect(unresolved.liveResolution).toBe("authored-fallback");
  });
});

describe("Block A · Monday Mercado truth", () => {
  const monday = resolve({ preferTourId: ARRABIDA, dateExact: MONDAY }).livingAtlasLive!;

  it("keeps Mercado in a complete composition and only refuses the public projection", () => {
    expect(monday.compositionResolution).toBe("complete");
    expect(monday.passthroughReason).toBe("date-closure");
    expect(monday.compositionStopIds).toContain(MERCADO_DO_LIVRAMENTO_STOP_ID);
    expect(monday.liveResolution).toBe("authored-fallback");
    expect(
      resolve({ preferTourId: ARRABIDA, dateExact: MONDAY }).composedRoutePoints.map(
        (p) => p.label,
      ),
    ).toEqual(authoredLabels(ARRABIDA));
  });

  it("still validates the complete frozen set and reports the window conflict", () => {
    expect(monday.validation).not.toBeNull();
    expect(monday.validation!.compositionStopIds).toContain(MERCADO_DO_LIVRAMENTO_STOP_ID);
    expect(monday.validation!.reasons.map((r) => r.code)).toContain("window-conflict");
  });

  it("returns schedule-review for a fully located Monday fixture", () => {
    const moments = [{ stopId: MERCADO_DO_LIVRAMENTO_STOP_ID }, { stopId: "azeitao-village" }];
    const plan = {
      status: "ready" as const,
      orderedMoments: moments,
      locatedMomentCount: 2,
      totalMomentCount: 2,
      totalEstimatedRoadKm: 20,
      totalEstimatedDrivingMin: 30,
      maxTotalKm: 250,
      maxDrivingMin: 180,
      maxLegKm: 60,
      legs: [{ estimatedRoadKm: 20 }],
    };
    const result = validateLivingAtlasOperations({
      composition: { status: "complete", moments },
      routePlan: plan,
      scheduledPlan: plan,
      selectedDate: MONDAY,
    });
    expect(result.status).toBe("schedule-review");
    expect(result.reasons.map((r) => r.code)).toContain("window-conflict");
    expect(result.compositionStopIds).toContain(MERCADO_DO_LIVRAMENTO_STOP_ID);
  });
});

describe("Block A · review signals flow through the single validator", () => {
  it("turns an unproven mobility concern into route-review without touching membership", () => {
    const withConcern = resolve({
      preferTourId: ARRABIDA,
      dateExact: TUESDAY,
      considerations: ["reduced-mobility"],
    }).livingAtlasLive!;
    expect(withConcern.internalIssues.map((i) => i.code)).toContain("mobility-unproven");
    expect(withConcern.validation!.status).toBe("route-review");
    expect(withConcern.validation!.reasons.map((r) => r.code)).toContain("mobility-review");
  });

  it("maps an unverified connector to a route-review reason", () => {
    const moments = [{ stopId: "azeitao-village" }];
    const plan = {
      status: "ready" as const,
      orderedMoments: moments,
      locatedMomentCount: 1,
      totalMomentCount: 1,
      totalEstimatedRoadKm: 5,
      totalEstimatedDrivingMin: 10,
      maxTotalKm: 250,
      maxDrivingMin: 180,
      maxLegKm: 60,
      legs: [],
    };
    const result = validateLivingAtlasOperations({
      composition: { status: "complete", moments },
      routePlan: plan,
      selectedDate: TUESDAY,
      preValidationIssues: [
        { code: "connector-unverified", detail: "no verified duration" },
      ],
    });
    expect(result.status).toBe("route-review");
    expect(result.reasons.map((r) => r.code)).toEqual(["connector-unverified"]);
    expect(result.compositionStopIds).toEqual(["azeitao-village"]);
  });
});

describe("Block A · verified Sado internal transit", () => {
  it("withholds the verified 30 minutes and reports a truthful inclusive total", () => {
    const live = resolve({ preferTourId: TROIA, dateExact: TUESDAY }).livingAtlasLive!;
    expect(live.internalTransitMinutes).toBe(30);
    expect(live.planningTiming).not.toBeNull();
    expect(live.totalPlannedMinutesIncludingInternalTransit).toBe(
      live.planningTiming!.totalMinutes + 30,
    );
    // Transit is never an experience moment.
    expect(live.compositionStopIds).not.toContain("sado-ferry");
  });
});
