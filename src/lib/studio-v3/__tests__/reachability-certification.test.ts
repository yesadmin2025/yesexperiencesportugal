/**
 * BUILD 0 — reachability certification.
 *
 * Every one of the twelve commercial directions must have a proven route to
 * top-1, or an explicit precision fork plus a resolving signal. A direction
 * that cannot be reached is a dead product, not a UI detail.
 */

import { describe, expect, it } from "vitest";
import {
  DOMINATION_SHARE_THRESHOLD,
  enumerateStates,
  reachesDirection,
  runReachabilityReport,
  simulateState,
  type ReachabilityState,
} from "@/lib/studio-v3/reachabilitySimulator";
import { LIVING_ATLAS_SIGNATURE_IDS } from "@/components/studio-v3/livingAtlasTaxonomy";
import {
  sequentialEmittableRefinements,
  sequentialQuestionTree,
} from "@/lib/studio-v3/publicRefinementPaths";

function state(partial: Partial<ReachabilityState>): ReachabilityState {
  return {
    feeling: null,
    interests: [],
    destinationIntent: "no-preference",
    refinement: null,
    ...partial,
  };
}

describe("reachability simulator", () => {
  const report = runReachabilityReport();

  it("is deterministic across runs", () => {
    const second = runReachabilityReport();
    expect(second.directions.map((d) => d.top1Count)).toEqual(
      report.directions.map((d) => d.top1Count),
    );
    expect(second.evaluatedStates).toBe(report.evaluatedStates);
  });

  it("sweeps a non-trivial bounded state matrix", () => {
    expect(enumerateStates().length).toBeGreaterThan(1000);
    expect(report.decidedStates).toBeGreaterThan(0);
  });

  it("leaves no commercial direction dead", () => {
    expect(report.deadDirections).toEqual([]);
    for (const direction of report.directions) {
      expect(direction.top1Count).toBeGreaterThan(0);
    }
  });

  it("lets no single direction dominate the outcome space", () => {
    expect(report.dominatingDirections).toEqual([]);
    for (const direction of report.directions) {
      expect(direction.top1Share).toBeLessThanOrEqual(DOMINATION_SHARE_THRESHOLD);
    }
  });

  it("keeps every direction present in top-3 rankings", () => {
    for (const direction of report.directions) {
      expect(direction.top3Count).toBeGreaterThan(0);
    }
  });
});

describe("certified routes for all twelve directions", () => {
  const CERTIFIED: Array<[string, ReachabilityState, (typeof LIVING_ATLAS_SIGNATURE_IDS)[number]]> = [
    [
      "A1 tile/craft path reaches the tiles workshop",
      state({ feeling: "hands-on", interests: ["hands-on"], refinement: "hands-paint-tile" }),
      "tiles-workshop",
    ],
    [
      "A2 cheese/craft + table path reaches Azeitão cheese",
      state({
        feeling: "hands-on",
        interests: ["hands-on", "gastronomy"],
        refinement: "hands-make-cheese",
      }),
      "azeitao-cheese",
    ],
    [
      "B faith + sanctuary reaches Fátima/Nazaré/Óbidos",
      state({ feeling: "faith", interests: ["faith"], refinement: "faith-sanctuary-time" }),
      "fatima-nazare-obidos",
    ],
    [
      "C faith/history + Templar reaches Tomar/Coimbra",
      state({
        feeling: "culture",
        interests: ["heritage", "faith"],
        refinement: "faith-templar-heritage",
      }),
      "tomar-coimbra",
    ],
    [
      "D wine + local + clay talha reaches Roman heritage Alentejo",
      state({
        feeling: "wine-food",
        interests: ["wine", "local-life"],
        refinement: "wine-clay-talha",
      }),
      "roman-heritage-alentejo",
    ],
    [
      "E monumental Alentejo path reaches Évora",
      state({
        feeling: "culture",
        interests: ["heritage", "wine"],
        refinement: "wine-monumental-estates",
      }),
      "evora-alentejo",
    ],
    [
      "F coast + nature + remote reaches the southwest Vicentine coast",
      state({
        feeling: "coastal",
        interests: ["coast", "nature"],
        refinement: "coast-remote-southwest",
      }),
      "southwest-vicentine-coast",
    ],
    [
      "G palace/royal/Atlantic heritage reaches Sintra/Cascais",
      state({
        feeling: "culture",
        interests: ["heritage", "photography"],
        refinement: "photo-landmarks",
      }),
      "sintra-cascais",
    ],
    [
      "H1 rice fields and river villages reach Tróia/Comporta",
      state({
        feeling: "hidden",
        interests: ["local-life", "coast"],
        refinement: "local-river-and-rice",
      }),
      "troia-comporta",
    ],
    [
      "H2 coast from the water reaches the Arrábida boat day",
      state({
        feeling: "coastal",
        interests: ["coast", "gastronomy"],
        refinement: "coast-from-the-water",
      }),
      "arrabida-boat",
    ],
    [
      "H3 wild beach path reaches the wild beaches picnic",
      state({
        feeling: "coastal",
        interests: ["coast", "gastronomy"],
        refinement: "coast-wild-beaches",
      }),
      "wild-beaches-picnic",
    ],
    [
      "H4 cellar depth reaches the Arrábida all-inclusive wine day",
      state({ feeling: "wine-food", interests: ["wine"], refinement: "wine-cellar-depth" }),
      "arrabida-wine-allinclusive",
    ],
  ];

  it.each(CERTIFIED)("%s", (_name, travellerState, expected) => {
    // 1. The base answers must make an adaptive question eligible at all.
    const base = {
      feeling: travellerState.feeling,
      interests: travellerState.interests,
      destinationIntent: travellerState.destinationIntent,
    };
    // The SEQUENTIAL director tree is the certification authority.
    const tree = sequentialQuestionTree(base);
    expect(tree.paths.length).toBeGreaterThan(0);

    // 2. A question the director actually asked at that step must contain the
    //    exact claimed refinement — a static mapping entry is not proof.
    expect(travellerState.refinement).not.toBeNull();
    expect(sequentialEmittableRefinements(base)).toContain(travellerState.refinement);
    const path = tree.paths.find((entry) => entry.refinement === travellerState.refinement);
    expect(path).toBeTruthy();
    expect(path!.steps[path!.steps.length - 1].offeredChoiceKeys).toContain(
      travellerState.refinement,
    );

    // 3. Selecting it yields the claimed direction.
    const outcome = simulateState(travellerState);
    expect(outcome.publiclyReachable).toBe(true);
    expect(outcome.status).toBe("clear");
    expect(outcome.top1).toBe(expected);
  });

  it("every simulated state in the matrix is publicly reachable", () => {
    const unreachable = enumerateStates().filter((candidate) => {
      const outcome = simulateState(candidate);
      return !outcome.publiclyReachable;
    });
    expect(unreachable).toEqual([]);
  });

  it("I. covers all twelve directions with a certified route", () => {
    expect(new Set(CERTIFIED.map(([, , id]) => id)).size).toBe(12);
    for (const signatureId of LIVING_ATLAS_SIGNATURE_IDS) {
      expect(CERTIFIED.some(([, , id]) => id === signatureId)).toBe(true);
    }
  });

  it("every explicit destination intent also resolves its own product", () => {
    const explicit: Array<[ReachabilityState["destinationIntent"], string]> = [
      ["lisbon-sintra-cascais", "sintra-cascais"],
      ["alentejo-evora-wine", "evora-alentejo"],
      ["alentejo-roman-talha", "roman-heritage-alentejo"],
      ["vicentine-coast", "southwest-vicentine-coast"],
      ["comporta-troia", "troia-comporta"],
      ["spiritual-coast", "fatima-nazare-obidos"],
      ["central-portugal", "tomar-coimbra"],
    ];
    for (const [destinationIntent, expected] of explicit) {
      const outcome = simulateState(
        state({ feeling: "culture", interests: ["heritage"], destinationIntent }),
      );
      expect(outcome.top1).toBe(expected);
    }
  });
});

describe("J. negative selection", () => {
  it("faith + sanctuary never produces an Arrábida wine day", () => {
    const outcome = simulateState(
      state({ feeling: "faith", interests: ["faith"], refinement: "faith-sanctuary-time" }),
    );
    expect(outcome.top1).not.toBe("arrabida-wine-allinclusive");
    expect(outcome.forkCandidates).not.toContain("arrabida-wine-allinclusive");
  });

  it("hands-on + from-the-water never produces Sintra", () => {
    // Deterministic default question for a hands-on traveller is the hands
    // question, so only its own options are certifiable here.
    const handsBase = {
      feeling: "hands-on" as const,
      interests: ["hands-on", "coast"] as const,
      destinationIntent: "no-preference" as const,
    };
    const handsOffered = sequentialEmittableRefinements(handsBase);
    for (const refinement of ["hands-paint-tile", "hands-make-cheese"] as const) {
      expect(handsOffered).toContain(refinement);
      const outcome = simulateState(
        state({ feeling: "hands-on", interests: ["hands-on", "coast"], refinement }),
      );
      expect(outcome.top1).not.toBe("sintra-cascais");
    }

    // "From the water" is reachable from a coastal base; it must not resolve
    // Sintra either.
    const coastBase = {
      feeling: "coastal" as const,
      interests: ["coast", "gastronomy"] as const,
      destinationIntent: "no-preference" as const,
    };
    expect(sequentialEmittableRefinements(coastBase)).toContain("coast-from-the-water");
    const waterOutcome = simulateState(
      state({
        feeling: "coastal",
        interests: ["coast", "gastronomy"],
        refinement: "coast-from-the-water",
      }),
    );
    expect(waterOutcome.top1).not.toBe("sintra-cascais");
  });


  it("remote wild coast never produces Sintra/Cascais by proximity or order", () => {
    const outcome = simulateState(
      state({
        feeling: "coastal",
        interests: ["coast", "nature"],
        refinement: "coast-remote-southwest",
      }),
    );
    expect(outcome.top1).toBe("southwest-vicentine-coast");
    expect(outcome.forkCandidates).not.toContain("sintra-cascais");
  });

  it("a hands-on craft day is never resolved as a palace day anywhere in the matrix", () => {
    const offenders = enumerateStates()
      .filter(
        (candidate) =>
          candidate.feeling === "hands-on" &&
          (candidate.refinement === "hands-paint-tile" ||
            candidate.refinement === "hands-make-cheese"),
      )
      .map(simulateState)
      .filter((outcome) => outcome.top1 === "sintra-cascais");
    expect(offenders).toEqual([]);
  });

  it("reachesDirection agrees with the simulator", () => {
    const travellerState = state({
      feeling: "faith",
      interests: ["faith"],
      refinement: "faith-sanctuary-time",
    });
    expect(reachesDirection(travellerState, "fatima-nazare-obidos").top1).toBe(true);
    expect(reachesDirection(travellerState, "arrabida-wine-allinclusive").top1).toBe(false);
  });
});
