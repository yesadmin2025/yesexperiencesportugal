// Studio V3 — Phase 5D: copy-only optional stop refinements (flag-gated).
//
// These tests assert the safe behaviour of `selectOptionalRefinements`
// independently of the feature flag, and verify that with the flag in its
// default-false state the live output of `resolveStudioV3Route` is
// unchanged. The selector is exported separately so we can unit-test it
// without ever flipping the flag in committed code.
//
// Hard rules covered:
//  - same region as the skeleton
//  - same routeCluster as the skeleton
//  - active === true only
//  - signatureTourId / sourceTourIds gating
//  - oneOfGroup collapses to a single winner
//  - slow rhythm caps at 1, others at 2
//  - reduced-mobility excludes stops with difficult-access notes
//  - P17 (Roman heritage / talha) is never surfaced for P6 Évora inputs
//  - final refinements never exceed the existing total cap of 2
//  - flag-off → `resolveStudioV3Route` output is identical to today

import { describe, it, expect } from "vitest";
import { resolveStudioV3Route, selectOptionalRefinements } from "@/components/studio-v3/curation";
import { REGION_STOP_POOL, STUDIO_V3_OPTIONAL_STOPS_ENABLED } from "@/data/regionStopPool";

describe("Studio V3 — Phase 5D flag default", () => {
  it("STUDIO_V3_OPTIONAL_STOPS_ENABLED stays false in committed code", () => {
    expect(STUDIO_V3_OPTIONAL_STOPS_ENABLED).toBe(false);
  });
});

describe("Studio V3 — selectOptionalRefinements eligibility", () => {
  it("returns [] when skeletonTourId is unknown", () => {
    const out = selectOptionalRefinements({
      skeletonTourId: "not-a-real-tour",
      interests: ["heritage"],
      rhythm: "balanced",
      companions: "couple",
      investment: null,
      considerations: [],
      existingRoutePointLabels: [],
    });
    expect(out).toEqual([]);
  });

  it("returns [] when skeletonTourId is null/undefined", () => {
    expect(
      selectOptionalRefinements({
        skeletonTourId: null,
        interests: [],
        rhythm: "balanced",
        companions: "couple",
        investment: null,
        considerations: [],
        existingRoutePointLabels: [],
      }),
    ).toEqual([]);
  });

  it("never returns a stop from a different region", () => {
    const out = selectOptionalRefinements({
      skeletonTourId: "evora-alentejo",
      interests: ["heritage", "wine", "gastronomy"],
      rhythm: "balanced",
      companions: "couple",
      investment: "elevated",
      considerations: [],
      existingRoutePointLabels: [],
    });
    for (const name of out) {
      const stop = REGION_STOP_POOL.find((s) => s.name === name);
      expect(stop).toBeTruthy();
      expect(stop!.region).toBe("alentejo-evora");
    }
  });

  it("never returns a stop from a different routeCluster", () => {
    const out = selectOptionalRefinements({
      skeletonTourId: "evora-alentejo",
      interests: ["heritage", "wine"],
      rhythm: "balanced",
      companions: "couple",
      investment: "elevated",
      considerations: [],
      existingRoutePointLabels: [],
    });
    for (const name of out) {
      const stop = REGION_STOP_POOL.find((s) => s.name === name);
      expect(stop!.routeCluster).toBe("evora-city-classical-wineries");
    }
  });

  it("never returns inactive stops", () => {
    // Sweep every known skeleton to confirm no inactive stop ever leaks.
    const skeletons = [
      "troia-comporta",
      "tomar-coimbra",
      "fatima-nazare-obidos",
      "sintra-cascais",
      "evora-alentejo",
      "arrabida-wine-allinclusive",
      "wild-beaches-picnic",
      "arrabida-boat",
      "tiles-workshop",
      "azeitao-cheese",
    ] as const;
    for (const skeletonTourId of skeletons) {
      const out = selectOptionalRefinements({
        skeletonTourId,
        interests: ["heritage", "wine", "coast", "nature", "gastronomy"],
        rhythm: "balanced",
        companions: "couple",
        investment: "elevated",
        considerations: [],
        existingRoutePointLabels: [],
      });
      for (const name of out) {
        const stop = REGION_STOP_POOL.find((s) => s.name === name);
        expect(stop!.active).toBe(true);
      }
    }
  });
});

describe("Studio V3 — P17 isolation", () => {
  const P17_NAMES = new Set(
    REGION_STOP_POOL.filter((s) => s.signatureTourId === "roman-heritage-talha-wines").map(
      (s) => s.name,
    ),
  );

  it("there is at least one P17 stop seeded (sanity)", () => {
    expect(P17_NAMES.size).toBeGreaterThan(0);
  });

  it("P6 Évora inputs never surface any P17 stop, even when selector is called directly", () => {
    const out = selectOptionalRefinements({
      skeletonTourId: "evora-alentejo",
      interests: ["heritage", "wine", "gastronomy", "local-life"],
      rhythm: "balanced",
      companions: "couple",
      investment: "bespoke",
      considerations: [],
      existingRoutePointLabels: [],
    });
    for (const name of out) {
      expect(P17_NAMES.has(name)).toBe(false);
    }
  });
});

describe("Studio V3 — oneOfGroup collapses to one winner", () => {
  it("Évora wineries (one-of-N) never stack — at most one per group", () => {
    const out = selectOptionalRefinements({
      skeletonTourId: "evora-alentejo",
      interests: ["wine", "gastronomy"],
      rhythm: "balanced",
      companions: "couple",
      investment: "elevated",
      considerations: [],
      existingRoutePointLabels: [],
    });
    const groupHits: Record<string, number> = {};
    for (const name of out) {
      const stop = REGION_STOP_POOL.find((s) => s.name === name);
      if (stop?.oneOfGroup) {
        groupHits[stop.oneOfGroup] = (groupHits[stop.oneOfGroup] ?? 0) + 1;
      }
    }
    for (const count of Object.values(groupHits)) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it("Arrábida beach options (one-of-N) never stack", () => {
    const out = selectOptionalRefinements({
      skeletonTourId: "wild-beaches-picnic",
      interests: ["coast", "nature"],
      rhythm: "balanced",
      companions: "couple",
      investment: "elevated",
      considerations: [],
      existingRoutePointLabels: [],
    });
    const beaches = out.filter((name) => {
      const stop = REGION_STOP_POOL.find((s) => s.name === name);
      return stop?.oneOfGroup === "arrabida-beach-choice";
    });
    expect(beaches.length).toBeLessThanOrEqual(1);
  });
});

describe("Studio V3 — rhythm cap", () => {
  it("slow rhythm returns at most 1 optional stop", () => {
    const out = selectOptionalRefinements({
      skeletonTourId: "evora-alentejo",
      interests: ["wine", "gastronomy", "heritage"],
      rhythm: "slow",
      companions: "couple",
      investment: "elevated",
      considerations: [],
      existingRoutePointLabels: [],
    });
    expect(out.length).toBeLessThanOrEqual(1);
  });

  it("balanced rhythm returns at most 2 optional stops", () => {
    const out = selectOptionalRefinements({
      skeletonTourId: "evora-alentejo",
      interests: ["wine", "gastronomy", "heritage"],
      rhythm: "balanced",
      companions: "couple",
      investment: "elevated",
      considerations: [],
      existingRoutePointLabels: [],
    });
    expect(out.length).toBeLessThanOrEqual(2);
  });
});

describe("Studio V3 — considerations deny", () => {
  it("reduced-mobility excludes stops with difficult-access notes (e.g. caves)", () => {
    // Lapa de Santa Margarida notes flag reduced-mobility unsuitability.
    const out = selectOptionalRefinements({
      skeletonTourId: "arrabida-boat",
      interests: ["nature", "coast", "heritage"],
      rhythm: "balanced",
      companions: "couple",
      investment: "elevated",
      considerations: ["reduced-mobility"],
      existingRoutePointLabels: [],
    });
    expect(out).not.toContain("Lapa de Santa Margarida");
  });
});

describe("Studio V3 — dedupe vs existing route points", () => {
  it("never returns a stop whose name already appears in routePoints", () => {
    const out = selectOptionalRefinements({
      skeletonTourId: "evora-alentejo",
      interests: ["heritage", "wine"],
      rhythm: "balanced",
      companions: "couple",
      investment: "elevated",
      considerations: [],
      existingRoutePointLabels: ["Évora", "Capela dos Ossos"],
    });
    expect(out).not.toContain("Évora");
    expect(out).not.toContain("Capela dos Ossos");
  });
});

describe("Studio V3 — flag-off live behaviour is unchanged", () => {
  it("resolveStudioV3Route refinements are produced solely by the pre-Phase-5D path when flag is false", () => {
    // With STUDIO_V3_OPTIONAL_STOPS_ENABLED === false (committed default),
    // every output of `resolveStudioV3Route` must have refinements that do
    // NOT include any optional pool stop name. We assert this across a
    // representative slice of inputs.
    const ALL_POOL_NAMES = new Set(REGION_STOP_POOL.map((s) => s.name));
    const inputs = [
      {
        feeling: "wine-food" as const,
        companions: "couple" as const,
        rhythm: "balanced" as const,
        interests: ["wine", "gastronomy"] as const,
        pickup: "lisbon" as const,
      },
      {
        feeling: "coastal" as const,
        companions: "family" as const,
        rhythm: "slow" as const,
        interests: ["coast", "nature"] as const,
        pickup: "lisbon" as const,
      },
      {
        feeling: "culture" as const,
        companions: "couple" as const,
        rhythm: "balanced" as const,
        interests: ["heritage", "photography"] as const,
        pickup: "lisbon" as const,
      },
    ];
    expect(STUDIO_V3_OPTIONAL_STOPS_ENABLED).toBe(false);
    for (const i of inputs) {
      const route = resolveStudioV3Route({
        feeling: i.feeling,
        companions: i.companions,
        rhythm: i.rhythm,
        interests: i.interests,
        pickup: i.pickup,
      });
      // total refinements capped at 2 (unchanged contract)
      expect(route.refinements.length).toBeLessThanOrEqual(2);
      // no pool stop name leaked when flag is false
      for (const r of route.refinements) {
        expect(ALL_POOL_NAMES.has(r)).toBe(false);
      }
    }
  });
});
