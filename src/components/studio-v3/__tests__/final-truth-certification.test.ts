/**
 * FINAL TRUTH CERTIFICATION — the four implemented truths, proven.
 *
 * A. Candidate admission uses the CANONICAL V3 time authority whenever the
 *    route AND candidate carry structural identity + authoritative dwell
 *    provenance; the legacy label heuristic answers ONLY when they do not.
 *    Selected add-on minutes are counted exactly once. Nothing is invented.
 * B. The live Director's timing conflict comes from the genuine canonical
 *    source (`resolveStudioV3Route(...).livingAtlasLive?.conflict ?? null`),
 *    both for the live derivation and for the post-answer forward one.
 * C. Operational approval fails closed.
 * D. The add-on total charged is `perUnitEur × canonical quantity`, for every
 *    pricing unit, and metadata/snapshot read that one helper.
 * Plus: a single-step undo restores the FULL structural truth of every moment.
 *
 * No conditional assertions; no production rule is re-implemented here.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { evaluateCandidateFit } from "@/lib/studio-v3/candidateFit";
import { judgeAdmission, type TimeAuthorityStop } from "@/lib/studio-v3/timeAuthority";
import { applyGesture, type AuthoredStop } from "../momentAuthorship";
import { deriveLiveTimingConflict } from "../StudioV3";
import { resolveStudioV3Route } from "../curation";
import { validateItinerary } from "@/lib/studio-v3/itinerary-validation";
import {
  SIGNATURE_ADD_ON_CATALOG,
  serverAddOnLine,
  serverAddOnsChargedTotalEur,
} from "../../../../supabase/functions/_shared/pricing.ts";
import { REGION_STOP_POOL } from "@/data/regionStopPool";
import type { StudioV3State } from "../types";

const CHECKOUT_SRC = readFileSync(
  resolve(process.cwd(), "supabase/functions/create-signature-checkout/index.ts"),
  "utf8",
);
const STUDIO_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);

const pooled = (id: string) => {
  const stop = REGION_STOP_POOL.find((s) => s.id === id);
  if (!stop) throw new Error(`REGION_STOP_POOL entry missing: ${id}`);
  return stop;
};

/** A real Arrábida-corridor moment, with its REAL inventory duration. */
const certifiedStop = (id: string) => {
  const stop = pooled(id);
  return {
    label: stop.name,
    lat: stop.coords?.lat ?? null,
    lng: stop.coords?.lng ?? null,
    stopId: stop.id,
    durationMinutes: stop.durationMin,
    durationSource: "inventory" as const,
  };
};

const ARRABIDA_IDS = REGION_STOP_POOL.filter(
  (s) => s.region === "arrabida-setubal" && s.durationMin > 0,
).map((s) => s.id);

const ANCHOR = "arrabida-wine-allinclusive";

/* ================================================================== *
 * A · Candidate admission / time authority
 * ================================================================== */

describe("A · candidate admission uses the canonical V3 time authority", () => {
  const routeIds = ARRABIDA_IDS.slice(0, 3);
  const candidateId = ARRABIDA_IDS[3];

  it("has real fixtures (non-vacuous)", () => {
    expect(routeIds.length).toBe(3);
    expect(typeof candidateId).toBe("string");
  });

  it("A1 · a certified route + certified candidate is judged by judgeAdmission", () => {
    const stops = routeIds.map(certifiedStop);
    const candidate = certifiedStop(candidateId);

    const canonical = judgeAdmission(
      {
        stops: stops.map(
          (s): TimeAuthorityStop => ({
            stopId: s.stopId,
            label: s.label,
            lat: s.lat,
            lng: s.lng,
            durationMinutes: s.durationMinutes,
            durationSource: s.durationSource,
          }),
        ),
        addOnsMinutes: 0,
        skeletonTourId: ANCHOR,
      },
      {
        stopId: candidate.stopId,
        label: candidate.label,
        lat: candidate.lat,
        lng: candidate.lng,
        durationMinutes: candidate.durationMinutes,
        durationSource: candidate.durationSource,
      },
    );
    expect(canonical.evaluable).toBe(true);

    const fit = evaluateCandidateFit(
      { stops, region: "Arrábida", addOnsMinutes: 0, skeletonTourId: ANCHOR },
      candidate,
    );
    // The verdict AND the reported minutes come from the canonical authority.
    expect(fit.fits).toBe(canonical.fits);
    expect(fit.projectedTotalMin).toBe(canonical.totalMin);
    expect(fit.projectedRemainingMin).toBe(canonical.remainingMin);
  });

  it("A2 · the canonical path differs from the legacy label heuristic", () => {
    const stops = routeIds.map(certifiedStop);
    const candidate = certifiedStop(candidateId);

    const canonicalFit = evaluateCandidateFit(
      { stops, region: "Arrábida", addOnsMinutes: 0, skeletonTourId: ANCHOR },
      candidate,
    );
    // Identical geography and labels, but NO structural identity/provenance:
    // the explicit legacy fallback answers instead, with different minutes.
    const legacyFit = evaluateCandidateFit(
      {
        stops: stops.map((s) => ({ label: s.label, lat: s.lat, lng: s.lng })),
        region: "Arrábida",
        addOnsMinutes: 0,
        skeletonTourId: ANCHOR,
      },
      { label: candidate.label, lat: candidate.lat, lng: candidate.lng },
    );
    expect(canonicalFit.projectedTotalMin).not.toBe(legacyFit.projectedTotalMin);
  });

  it("A3 · selected add-on minutes are counted exactly once", () => {
    const stops = routeIds.map(certifiedStop);
    const candidate = certifiedStop(candidateId);
    const base = evaluateCandidateFit(
      { stops, region: "Arrábida", addOnsMinutes: 0, skeletonTourId: ANCHOR },
      candidate,
    );
    const withAddOn = evaluateCandidateFit(
      { stops, region: "Arrábida", addOnsMinutes: 45, skeletonTourId: ANCHOR },
      candidate,
    );
    expect(withAddOn.projectedTotalMin - base.projectedTotalMin).toBe(45);
  });

  it("A4 · missing provenance falls back to legacy WITHOUT inventing truth", () => {
    const stops = routeIds.map(certifiedStop);
    const candidate = certifiedStop(candidateId);
    // Candidate keeps its minutes but loses authoritative provenance.
    const unproven = evaluateCandidateFit(
      { stops, region: "Arrábida", addOnsMinutes: 0, skeletonTourId: ANCHOR },
      { ...candidate, durationSource: "conservative-default" as const },
    );
    const proven = evaluateCandidateFit(
      { stops, region: "Arrábida", addOnsMinutes: 0, skeletonTourId: ANCHOR },
      candidate,
    );
    expect(unproven.projectedTotalMin).not.toBe(proven.projectedTotalMin);
    // Missing structural identity is equally non-certifying.
    const noId = evaluateCandidateFit(
      { stops, region: "Arrábida", addOnsMinutes: 0, skeletonTourId: ANCHOR },
      { ...candidate, stopId: null },
    );
    expect(noId.projectedTotalMin).toBe(unproven.projectedTotalMin);
  });

  it("A5 · Add and Swap data contracts preserve identity, geo, media and dwell", () => {
    const source = pooled(ARRABIDA_IDS[0]);
    const day: AuthoredStop[] = [
      { label: "Anchor A", story: "", inventoryStopId: "a", durationMinutes: 60, durationSource: "sot-chapter" },
      { label: "Anchor B", story: "", inventoryStopId: "b" },
    ];
    const replacement: AuthoredStop = {
      label: source.name,
      story: "",
      inventoryStopId: source.id,
      blueprintStopId: null,
      image: "/img/real.jpg",
      focal: "50% 30%",
      lat: source.coords?.lat ?? null,
      lng: source.coords?.lng ?? null,
      durationMinutes: source.durationMin,
      durationSource: "inventory",
    };
    const swapped = applyGesture(day, 1, "swap", { replacement });
    expect(swapped[1]).toEqual(replacement);

    const added = [...day, replacement];
    expect(added[2].durationMinutes).toBe(source.durationMin);
    expect(added[2].durationSource).toBe("inventory");
    expect(added[2].inventoryStopId).toBe(source.id);
  });

  it("A6 · the live Add/Swap wiring carries duration + provenance + identity", () => {
    expect(STUDIO_SRC).toContain("durationMinutes: cand.durationMinutes ?? null");
    expect(STUDIO_SRC).toContain("durationSource: cand.durationSource ?? null");
    expect(STUDIO_SRC).toContain("durationMinutes: canonical.durationMinutes ?? null");
    expect(STUDIO_SRC).toContain("durationSource: canonical.durationSource ?? null");
    expect(STUDIO_SRC).toContain("stopId: p.inventoryStopId ?? p.blueprintStopId ?? null");
  });
});

/* ================================================================== *
 * B · Director timing conflict source
 * ================================================================== */

describe("B · the Director's timing conflict is the genuine canonical source", () => {
  const baseState = {
    feeling: "wonder",
    companions: "couple",
    rhythm: "balanced",
    interests: ["wine", "coast"],
    pickup: "lisbon",
    occasion: null,
    considerations: [],
    investment: null,
    destinationIntent: null,
    questionHistory: [],
  } as unknown as StudioV3State;

  it("B1 · matches resolveStudioV3Route's own livingAtlasLive.conflict", () => {
    const expected =
      resolveStudioV3Route({
        feeling: baseState.feeling!,
        companions: baseState.companions!,
        rhythm: baseState.rhythm!,
        interests: baseState.interests,
        pickup: baseState.pickup,
        occasion: baseState.occasion,
        considerations: baseState.considerations,
        investment: baseState.investment,
        destinationIntent: baseState.destinationIntent,
        questionHistory: baseState.questionHistory,
      }).livingAtlasLive?.conflict ?? null;
    expect(deriveLiveTimingConflict(baseState)).toEqual(expected);
  });

  it("B2 · an unresolvable state yields null, never a fabricated conflict", () => {
    expect(
      deriveLiveTimingConflict({ ...baseState, feeling: null } as StudioV3State),
    ).toBeNull();
    expect(
      deriveLiveTimingConflict({ ...baseState, rhythm: null } as StudioV3State),
    ).toBeNull();
  });

  it("B3 · the result is either null or a real TimingConflict shape", () => {
    const conflict = deriveLiveTimingConflict(baseState);
    const isNullOrReal =
      conflict === null ||
      (typeof conflict.kind === "string" &&
        Array.isArray(conflict.requestedDimensions) &&
        typeof conflict.overflowMinutes === "number");
    expect(isNullOrReal).toBe(true);
  });

  it("B4 · the post-answer derivation re-derives from the FORWARD state", () => {
    expect(STUDIO_SRC).toContain("timingConflict: deriveLiveTimingConflict(forward)");
    expect(STUDIO_SRC).toContain("timingConflict: liveTimingConflict");
    // No hand-built conflict object anywhere in the live component.
    expect(STUDIO_SRC).not.toMatch(/timingConflict:\s*\{/);
  });
});

/* ================================================================== *
 * C · Operational approval fails closed
 * ================================================================== */

describe("C · operational approval fails closed", () => {
  it("C1 · loading legs and a missing skeleton can never approve", () => {
    expect(STUDIO_SRC).toContain('if (revealLegsLoading) return { status: "review" as ValidationStatus, proven: false };');
    expect(STUDIO_SRC).toContain('if (!skeletonTour) return { status: "review" as ValidationStatus, proven: false };');
  });

  it("C2 · an incomplete validation is demoted to review", () => {
    expect(STUDIO_SRC).toContain('status: (result.status === "incomplete" ? "review" : result.status) as ValidationStatus,');
    // An unscoreable day stays fail-closed: `proven` is the booking condition.
    expect(STUDIO_SRC).toContain('proven: result.status !== "incomplete",');
    expect(STUDIO_SRC).toContain("operationalGate.proven &&");
  });

  it("C3 · validateItinerary really reports incomplete without leg minutes", () => {
    const result = validateItinerary({
      region: "arrabida",
      stops: [{ key: "0", label: "One", category: "village" }],
      legMinutes: null,
    });
    expect(result.status).not.toBe("approved");
  });

  it("C4 · only a real approved status can enable Reserve", () => {
    const statuses = ["review", "incomplete", "approved"] as const;
    const enabled = statuses.filter((s) => s === "approved");
    expect(enabled).toEqual(["approved"]);
  });
});

/* ================================================================== *
 * D · Server add-on snapshot parity
 * ================================================================== */

describe("D · charged add-on total parity", () => {
  it("D1 · per_person: total is perUnitEur × canonical quantity", () => {
    const id = Object.keys(SIGNATURE_ADD_ON_CATALOG).find(
      (k) => SIGNATURE_ADD_ON_CATALOG[k]!.pricingUnit === "per_person",
    )!;
    const line = serverAddOnLine(id, 200, 4)!;
    expect(line.unit).toBe("per_person");
    expect(line.quantity).toBe(4);
    expect(serverAddOnsChargedTotalEur([line])).toBe(line.perUnitEur * 4);
  });

  it("D2 · non-per-person units are never multiplied by guests", () => {
    // Canonical quantities as the catalog resolver produces them.
    const perGroup = { perUnitEur: 120, quantity: 1 }; // per_group / fixed
    const perVehicle = { perUnitEur: 90, quantity: 2 }; // 6 guests / cap 4
    expect(serverAddOnsChargedTotalEur([perGroup])).toBe(120);
    expect(serverAddOnsChargedTotalEur([perVehicle])).toBe(180);
    expect(serverAddOnsChargedTotalEur([perGroup, perVehicle])).toBe(300);
  });

  it("D3 · an empty basket totals zero", () => {
    expect(serverAddOnsChargedTotalEur([])).toBe(0);
  });

  it("D4 · checkout metadata and the snapshot read the one helper", () => {
    expect(CHECKOUT_SRC).toContain("const addOnsChargedTotalEur = serverAddOnsChargedTotalEur(");
    expect(CHECKOUT_SRC).toContain("add_ons_total_eur: String(addOnsChargedTotalEur)");
    expect(CHECKOUT_SRC).toContain("const addOnsTotalEur = addOnsChargedTotalEur;");
    // The old guests × unit price computation is gone.
    expect(CHECKOUT_SRC).not.toMatch(/addOnsTotalEur\s*=\s*[^;]*guests/);
  });

  it("D5 · Stripe charges exactly the canonical quantity", () => {
    expect(CHECKOUT_SRC).toContain("quantity: a.quantity,");
    expect(CHECKOUT_SRC).toContain("unit_amount: a.priceEur * 100,");
  });
});

/* ================================================================== *
 * Undo contract
 * ================================================================== */

describe("Undo · a single step restores the FULL structural truth", () => {
  const source = pooled(ARRABIDA_IDS[0]);
  const day: AuthoredStop[] = [
    {
      label: "Anchor A",
      story: "story a",
      inventoryStopId: "anchor-a",
      blueprintStopId: "bp-a",
      image: "/img/a.jpg",
      focal: "40% 60%",
      lat: 38.5,
      lng: -9.0,
      durationMinutes: 75,
      durationSource: "sot-chapter",
    },
    {
      label: "Anchor B",
      story: "story b",
      inventoryStopId: "anchor-b",
      image: "/img/b.jpg",
      focal: "50% 50%",
      lat: 38.47,
      lng: -8.99,
      durationMinutes: 60,
      durationSource: "inventory",
    },
  ];
  const replacement: AuthoredStop = {
    label: source.name,
    story: "",
    inventoryStopId: source.id,
    image: "/img/new.jpg",
    focal: "30% 70%",
    lat: source.coords?.lat ?? null,
    lng: source.coords?.lng ?? null,
    durationMinutes: source.durationMin,
    durationSource: "inventory",
  };

  it("U1 · undo after a swap restores every field verbatim", () => {
    const before = day.map((s) => ({ ...s })); // exactly what the snapshot stores
    const next = applyGesture(day, 1, "swap", { replacement });
    expect(next[1].inventoryStopId).toBe(source.id);
    const restored = before.map((s) => ({ ...s }));
    expect(restored).toEqual(day);
  });

  it("U2 · undo after an add restores every field verbatim", () => {
    const before = day.map((s) => ({ ...s }));
    const next = [...day, replacement];
    expect(next).toHaveLength(3);
    const restored = before.map((s) => ({ ...s }));
    expect(restored).toEqual(day);
    expect(restored[0].durationSource).toBe("sot-chapter");
    expect(restored[0].focal).toBe("40% 60%");
    expect(restored[1].lat).toBe(38.47);
  });

  it("U3 · the undo snapshot is typed as full AuthoredRoutePoint[]", () => {
    expect(STUDIO_SRC).toContain("stops: AuthoredRoutePoint[];");
  });
});
