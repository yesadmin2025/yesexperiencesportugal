// Studio V3 — route containment regression tests.
//
// Hard contract (see mem://constraints/studio-v3-no-invented-stops):
//   Studio V3 must never output a stop that is not present in the
//   resolved Signature tour's own `stops` array.
//
// These tests exhaustively walk a large slice of the input space
// (feeling × companions × rhythm × pickup × interests) and assert:
//
//   1. Every routePoint returned by resolveStudioV3Route() exists in
//      the resolved skeleton tour's stops (matched by label).
//   2. Every moment returned by curateJourney() exists in the chosen
//      primary tour's stops.
//   3. No moment is marked `borrowed: true` (cross-tour borrowing is
//      forbidden under route containment).
//   4. The fallback path (missing answers) returns zero routePoints
//      and a null skeletonTourKey — never invents a route.

import { describe, it, expect } from "vitest";
import {
  curateJourney,
  resolveStudioV3Route,
  SKELETON_TO_CLUSTER,
} from "@/components/studio-v3/curation";
import {
  type Companions,
  type Feeling,
  type Interest,
  type Pickup,
  type Rhythm,
} from "@/components/studio-v3/types";
import { findTour, signatureTours } from "@/data/signatureTours";
import { REGION_STOP_POOL } from "@/data/regionStopPool";

const FEELINGS: Feeling[] = [
  "coastal",
  "wine-food",
  "hidden",
  "romance",
  "family",
  "culture",
  "adventure",
  "slow-luxury",
];

const COMPANIONS: Companions[] = [
  "solo",
  "couple",
  "family",
  "friends",
  "celebration",
  "proposal",
  "corporate",
];

const RHYTHMS: Rhythm[] = ["slow", "balanced", "full", "immersive"];

const PICKUPS: Pickup[] = [
  "lisbon",
  "lisbon-airport",
  "lisbon-cruise",
  "cascais-estoril",
  "sintra",
  "sesimbra-setubal-arrabida",
  "comporta-troia",
  "other",
];

const INTEREST_SETS: ReadonlyArray<ReadonlyArray<Interest>> = [
  [],
  ["wine"],
  ["gastronomy"],
  ["coast", "nature"],
  ["heritage", "photography"],
  ["wellness", "local-life"],
  ["wine", "gastronomy", "coast", "heritage"], // worst case: all-domain
];

/** Normalize a label so trivial whitespace/case diffs don't fail equality. */
function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Build a Set of every real stop label that exists across the entire catalog. */
const CATALOG_STOP_LABELS = new Set<string>(
  signatureTours.flatMap((t) => t.stops.map((s) => norm(s.label))),
);

describe("Studio V3 — resolveStudioV3Route route containment", () => {
  it("never returns a route point whose label is absent from the resolved Signature tour", () => {
    const violations: Array<{
      input: Record<string, unknown>;
      skeletonTourKey: string | null;
      offendingLabel: string;
    }> = [];

    for (const feeling of FEELINGS) {
      for (const companions of COMPANIONS) {
        for (const rhythm of RHYTHMS) {
          for (const pickup of PICKUPS) {
            for (const interests of INTEREST_SETS) {
              const route = resolveStudioV3Route({
                feeling,
                companions,
                rhythm,
                interests,
                pickup,
              });

              // Fallback case: nothing to validate beyond emptiness.
              if (!route.skeletonTourKey) {
                if (route.routePoints.length !== 0) {
                  violations.push({
                    input: { feeling, companions, rhythm, pickup, interests },
                    skeletonTourKey: null,
                    offendingLabel: `<unexpected routePoints when no skeleton>`,
                  });
                }
                continue;
              }

              const tour = findTour(route.skeletonTourKey);
              expect(
                tour,
                `skeletonTourKey "${route.skeletonTourKey}" must exist in the Signature catalog`,
              ).toBeDefined();

              const tourLabels = new Set(
                tour!.stops.map((s) => norm(s.label)),
              );

              for (const point of route.routePoints) {
                if (!tourLabels.has(norm(point.label))) {
                  violations.push({
                    input: { feeling, companions, rhythm, pickup, interests },
                    skeletonTourKey: route.skeletonTourKey,
                    offendingLabel: point.label,
                  });
                }
              }
            }
          }
        }
      }
    }

    expect(
      violations,
      `Studio V3 produced invented route points (not present in the resolved Signature tour's stops):\n${JSON.stringify(
        violations.slice(0, 5),
        null,
        2,
      )}${violations.length > 5 ? `\n…and ${violations.length - 5} more` : ""}`,
    ).toEqual([]);
  });

  it("every route point label exists somewhere in the Signature catalog (sanity)", () => {
    for (const feeling of FEELINGS) {
      for (const companions of COMPANIONS) {
        for (const rhythm of RHYTHMS) {
          const route = resolveStudioV3Route({
            feeling,
            companions,
            rhythm,
            interests: [],
            pickup: "lisbon",
          });
          for (const point of route.routePoints) {
            expect(
              CATALOG_STOP_LABELS.has(norm(point.label)),
              `route point "${point.label}" must exist in the Signature catalog`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it("never exposes the internal skeleton title on customer-facing fields", () => {
    const route = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine", "gastronomy"],
      pickup: "lisbon",
    });
    expect(route.skeletonTitleInternal).toBeTruthy();
    // Customer-facing fields must not contain the raw Signature title.
    expect(route.journeyTitle).not.toContain(route.skeletonTitleInternal!);
    expect(route.suggestedRouteLabel).not.toContain(route.skeletonTitleInternal!);
    expect(route.routeAreaLabel).not.toContain(route.skeletonTitleInternal!);
  });

  it("fallback (missing core answers) returns zero routePoints and null skeleton", () => {
    const fallback = resolveStudioV3Route({
      feeling: null,
      companions: null,
      rhythm: null,
      interests: [],
      pickup: null,
    });
    expect(fallback.routePoints).toEqual([]);
    expect(fallback.skeletonTourKey).toBeNull();
    expect(fallback.confidence).toBe("needs-human-refinement");
  });
});

describe("Studio V3 — curateJourney route containment", () => {
  it("every moment belongs to the chosen primary tour and is never borrowed", () => {
    const violations: string[] = [];

    for (const feeling of FEELINGS) {
      for (const companions of COMPANIONS) {
        for (const rhythm of RHYTHMS) {
          for (const interests of INTEREST_SETS) {
            for (const pickup of PICKUPS) {
              const journey = curateJourney(feeling, companions, rhythm, {
                interests,
                pickup,
              });
              const primaryLabels = new Set(
                journey.tour.stops.map((s) => norm(s.label)),
              );

              for (const m of journey.moments) {
                if (!primaryLabels.has(norm(m.label))) {
                  violations.push(
                    `[${feeling}/${companions}/${rhythm}/${pickup}] moment "${m.label}" is not a stop of primary tour "${journey.tour.id}"`,
                  );
                }
                if (m.borrowed) {
                  violations.push(
                    `[${feeling}/${companions}/${rhythm}/${pickup}] moment "${m.label}" is marked borrowed — cross-tour borrowing is forbidden`,
                  );
                }
                if (m.fromTourId !== journey.tour.id) {
                  violations.push(
                    `[${feeling}/${companions}/${rhythm}/${pickup}] moment "${m.label}" came from "${m.fromTourId}" but primary is "${journey.tour.id}"`,
                  );
                }
              }
            }
          }
        }
      }
    }

    expect(violations.slice(0, 10)).toEqual([]);
  });
});
