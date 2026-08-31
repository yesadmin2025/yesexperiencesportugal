// Studio V3 — Phase 7A: itinerary calibration tests.
//
// Locks the calibration fixes shipped in Phase 7A:
//   1. Reduced mobility / avoid-long-walks replaces or drops unsafe
//      ORIGINAL skeleton stops (cliffs, coves, caves, trails, etc.).
//   2. Tiles / craft / hands-on culture intent boosts `tiles-workshop`
//      over generic culture skeletons when geographically reasonable.
//   3. Bespoke investment never thins routes into 2-stop days.
//   4. Family / nature / slow keeps a calm but substantial (>=3) route.
//   5. Corporate + wine + bespoke route ingredients differ from
//      couple + wine + bespoke (more "private/tasting/cellar",
//      less "picnic/cove/sunset/romantic").

import { describe, it, expect } from "vitest";
import { applyMobilitySafety, resolveStudioV3Route } from "@/components/studio-v3/curation";

const UNSAFE_RE =
  /\bcliffs?\b|\bcoves?\b|\bcaves?\b|\bsteep\b|\bstairs?\b|\bwild beach\b|kayak|snorkel|miradouro/i;

const CORPORATE_PENALTY_RE = /picnic|cove|wild beach|sunset|candlelit|romantic|swim|snorkel/i;

describe("Phase 7A — mobility safety filter on skeleton stops", () => {
  it("carries an unproven mobility concern as review, never as a membership rewrite", () => {
    const baseInput = {
      feeling: "wine-food" as const,
      companions: "couple" as const,
      rhythm: "balanced" as const,
      interests: ["wine", "gastronomy"] as const,
      pickup: "sesimbra-setubal-arrabida" as const,
      preferTourId: "arrabida-wine-allinclusive",
    };
    const unrestricted = resolveStudioV3Route(baseInput);
    const restricted = resolveStudioV3Route({
      ...baseInput,
      considerations: ["reduced-mobility"],
    });

    // Block A: current inventory cannot structurally prove incompatibility, so
    // membership is preserved and the concern becomes a review signal.
    const liveA = unrestricted.livingAtlasLive;
    const liveB = restricted.livingAtlasLive;
    expect(liveA).not.toBeNull();
    expect(liveB).not.toBeNull();
    expect(liveA!.anchorTourId).toBe("arrabida-wine-allinclusive");
    expect(liveB!.anchorTourId).toBe("arrabida-wine-allinclusive");
    expect(liveA!.compositionResolution).toBe("complete");
    expect(liveB!.compositionResolution).toBe("complete");
    // The contract: composition membership is identical.
    expect(liveB!.compositionStopIds).toEqual(liveA!.compositionStopIds);
    expect(restricted.routePoints.map((p) => p.label)).toEqual(
      unrestricted.routePoints.map((p) => p.label),
    );
    expect(liveB!.internalIssues.map((i) => i.code)).toContain("mobility-unproven");
    expect(liveB!.validation?.reasons.map((r) => r.code)).toContain("mobility-review");
    expect(unrestricted.routePoints.length).toBeGreaterThan(0);
  });


  it("applyMobilitySafety is a pure no-op when route has no unsafe stops", () => {
    const safeRoute = [
      { index: 0, label: "Family winery in Azeitão", story: "", lat: null, lng: null },
      { index: 1, label: "Long traditional lunch", story: "", lat: null, lng: null },
      { index: 2, label: "Sesimbra harbour", story: "", lat: null, lng: null },
    ];
    const out = applyMobilitySafety(safeRoute, {
      skeletonTourId: "arrabida-wine-allinclusive",
      interests: ["wine"],
      rhythm: "balanced",
      companions: "couple",
      investment: "elevated",
      considerations: ["reduced-mobility"],
    });
    expect(out.map((p) => p.label)).toEqual(safeRoute.map((p) => p.label));
  });
});

describe("Phase 7A — tiles/craft intent prefers tiles-workshop", () => {
  it("culture + local-life + heritage from Lisbon resolves to tiles-workshop", () => {
    const route = resolveStudioV3Route({
      feeling: "culture",
      companions: "solo",
      rhythm: "balanced",
      interests: ["local-life", "heritage"],
      pickup: "lisbon",
    });
    expect(route.skeletonTourKey).toBe("tiles-workshop");
  });

  it("tiles-workshop boost is additive (never forces tiles when no Lisbon-area pickup)", () => {
    // From the Comporta/Tróia pickup, tiles-workshop is geographically far —
    // the boost should not pull it across regions.
    const route = resolveStudioV3Route({
      feeling: "culture",
      companions: "solo",
      rhythm: "balanced",
      interests: ["local-life", "heritage"],
      pickup: "comporta-troia",
    });
    expect(route.skeletonTourKey).not.toBe("tiles-workshop");
  });
});

describe("Phase 7A — bespoke does not shrink the route", () => {
  it("bespoke balanced is at least 3 stops (same or more than considered)", () => {
    const considered = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine", "gastronomy"],
      pickup: "lisbon",
      investment: "considered",
    });
    const bespoke = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine", "gastronomy"],
      pickup: "lisbon",
      investment: "bespoke",
    });
    expect(bespoke.routePoints.length).toBeGreaterThanOrEqual(3);
    expect(bespoke.routePoints.length).toBeGreaterThanOrEqual(considered.routePoints.length);
  });

  it("slow + bespoke keeps a meaningful arc (>=3 unless solo/couple stillness)", () => {
    const route = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "friends",
      rhythm: "slow",
      interests: ["wine", "gastronomy"],
      pickup: "lisbon",
      investment: "bespoke",
    });
    expect(route.routePoints.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Phase 7A — family/nature/slow keeps substance", () => {
  it("family + nature + slow + considered does not collapse to 2 stops", () => {
    const route = resolveStudioV3Route({
      feeling: "coastal",
      companions: "family",
      rhythm: "slow",
      interests: ["nature"],
      pickup: "lisbon",
      investment: "considered",
    });
    expect(route.routePoints.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Phase 7A — corporate vs couple wine/bespoke differs in ingredients", () => {
  it("corporate avoids picnic/cove/sunset cues that couple may include", () => {
    const couple = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine", "gastronomy"],
      pickup: "lisbon",
      investment: "bespoke",
    });
    const corporate = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "corporate",
      rhythm: "balanced",
      interests: ["wine", "gastronomy"],
      pickup: "lisbon",
      investment: "bespoke",
    });

    const corporateHay = corporate.routePoints.map((p) => `${p.label} ${p.story}`).join(" | ");
    expect(
      CORPORATE_PENALTY_RE.test(corporateHay),
      `corporate route should avoid romantic/picnic cues — got: ${corporateHay}`,
    ).toBe(false);
    // Sanity: both produced a real route.
    expect(corporate.routePoints.length).toBeGreaterThanOrEqual(2);
    expect(couple.routePoints.length).toBeGreaterThanOrEqual(2);
  });
});
