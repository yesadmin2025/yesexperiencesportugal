/**
 * FINAL CLOSURE — focused proofs for the YOUR DAY culmination contract.
 *
 * These assert the exact closures: the final CTA string, the removal
 * authority, the add authority, canvas → YOUR DAY media continuity and the
 * absence of rhythm stop-count theatre in the live Studio surface.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CTA_MAKE_IT_REAL } from "@/content/signature-day-copy";
import {
  canOfferAdditionalMoment,
  resolveMomentOptionality,
} from "@/lib/studio-v3/momentOptionality";
import { resolveYourDayVisuals } from "@/lib/studio-v3/yourDayCanvasContinuity";
import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";
import type { LivingCanvasModel } from "@/lib/studio-v3/livingCanvasModel";

const STUDIO_SOURCE = readFileSync("src/components/studio-v3/StudioV3.tsx", "utf8");

const blueprint = Object.values(
  TAILOR_BLUEPRINTS as unknown as Record<string, (typeof TAILOR_BLUEPRINTS)[number]>,
)[0];

describe("B — the final primary action is Make it real", () => {
  it("uses the canonical CTA string and the existing guest-details path", () => {
    expect(CTA_MAKE_IT_REAL).toBe("Make it real");
    expect(STUDIO_SOURCE).toContain("{CTA_MAKE_IT_REAL}");
    expect(STUDIO_SOURCE).not.toContain("Continue to guest details");
  });
});

describe("C — Reserve fails closed on unresolved operational state", () => {
  it("gates the primary action on validation + approval", () => {
    expect(STUDIO_SOURCE).toContain("disabled={!canReserve}");
    expect(STUDIO_SOURCE).toContain("operationalGate.proven &&");
    expect(STUDIO_SOURCE).toContain('approvalStatus === "reject"');
    expect(STUDIO_SOURCE).toContain("studio-v3-reserve-review-path");
  });
});

describe("D — Canvas media identities are reused by YOUR DAY", () => {
  const model = {
    stage: "shaped",
    backdrop: { id: "media:backdrop", src: "/a.jpg", alt: "a", source: "stop" },
    threads: [],
    geography: { kind: "none" },
    moments: [
      {
        id: "m0",
        label: "Quinta do Vale",
        story: "",
        hasCoordinates: true,
        image: { id: "media:stop:vale", src: "/vale.jpg", alt: "vale", source: "stop" },
      },
    ],
    showsRealMoments: true,
    fingerprint: "x",
  } as unknown as LivingCanvasModel;

  it("matches by label and never substitutes another stop's photo", () => {
    const visuals = resolveYourDayVisuals(model, ["Quinta do Vale", "Cabo Espichel"]);
    expect(visuals.backdrop?.id).toBe("media:backdrop");
    expect(visuals.byLabel.get("quinta do vale")?.id).toBe("media:stop:vale");
    expect(visuals.byLabel.has("cabo espichel")).toBe(false);
  });

  it("is wired into the live surface", () => {
    expect(STUDIO_SOURCE).toContain("canvasModel={livingCanvas}");
    expect(STUDIO_SOURCE).toContain("studio-v3-your-day-hero-media");
  });
});

describe("E/F — no count or rhythm authority over route membership", () => {
  it("removes maxMoments, isRouteComplete and rhythmDots from the live Studio", () => {
    expect(STUDIO_SOURCE).not.toContain("maxMoments");
    expect(STUDIO_SOURCE).not.toContain("isRouteComplete");
    expect(STUDIO_SOURCE).not.toContain("rhythmDots");
  });

  it("offers one more moment only from proven timing + validation truth", () => {
    expect(
      canOfferAdditionalMoment({ poolSize: 3, remainingMinutes: 90, validationStatus: "approved" }),
    ).toBe(true);
    // Fail closed: unresolved timing, exhausted day, review state, empty pool.
    expect(
      canOfferAdditionalMoment({ poolSize: 3, remainingMinutes: null, validationStatus: "approved" }),
    ).toBe(false);
    expect(
      canOfferAdditionalMoment({ poolSize: 3, remainingMinutes: 0, validationStatus: "approved" }),
    ).toBe(false);
    expect(
      canOfferAdditionalMoment({ poolSize: 3, remainingMinutes: 90, validationStatus: "review" }),
    ).toBe(false);
    expect(
      canOfferAdditionalMoment({ poolSize: 0, remainingMinutes: 90, validationStatus: "approved" }),
    ).toBe(false);
  });
});

describe("G — remove is impossible for a non-optional moment", () => {
  const coreLabels = blueprint.core.map((stop) => stop.label);
  const optionalLabels = blueprint.optional.map((stop) => stop.label);
  const labels = [...coreLabels, ...optionalLabels];

  it("protects anchor-price core moments however long the day is", () => {
    const result = resolveMomentOptionality({ tourId: blueprint.tourId, labels, minStops: 2 });
    for (const label of coreLabels) {
      expect(result.find((r) => r.label === label)?.removable).toBe(false);
    }
  });

  it("allows genuine optional extensions", () => {
    if (optionalLabels.length === 0) return;
    const result = resolveMomentOptionality({ tourId: blueprint.tourId, labels, minStops: 2 });
    expect(result.find((r) => r.label === optionalLabels[0])?.removable).toBe(true);
  });

  it("fails closed when optionality cannot be proven", () => {
    const result = resolveMomentOptionality({ tourId: null, labels, minStops: 2 });
    expect(result.every((r) => r.removable === false)).toBe(true);
    expect(result.every((r) => r.reason === "unproven")).toBe(true);
  });

  it("never lets the day fall below the route floor", () => {
    const one = optionalLabels.length > 0 ? [optionalLabels[0]] : [labels[0]];
    const result = resolveMomentOptionality({ tourId: blueprint.tourId, labels: one, minStops: 2 });
    expect(result[0].removable).toBe(false);
  });

  it("is the authority the live remove affordance consults", () => {
    expect(STUDIO_SOURCE).toContain("if (!momentOptionality[i]?.removable) return;");
    expect(STUDIO_SOURCE).toContain("removable={momentOptionality[i]?.removable ?? false}");
  });
});

describe("§8 — the Canvas never jumps to a fake route", () => {
  it("only composes once the traveller reaches a composed phase", () => {
    expect(STUDIO_SOURCE).toContain("COMPOSITION_READY_PHASES");
    expect(STUDIO_SOURCE).toContain("if (!COMPOSITION_READY_PHASES.has(state.phase)) return null;");
  });
});
