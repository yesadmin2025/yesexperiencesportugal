/**
 * BUILD 1 / Pass 1 — foundation tests.
 *
 * These cover the INERT time modules only. They assert that the foundation is
 * truthful and deterministic; they do not assert any traveller-visible
 * behaviour, because Pass 1 changes none.
 */

import { describe, expect, it } from "vitest";

import { INITIAL_STATE } from "@/components/studio-v3/types";
import {
  DURATION_ENVELOPES,
  LEGACY_NEUTRAL_DEFAULT_MINUTES,
  RHYTHM_TIMING_POLICY,
  TRAVELLER_DURATION_CLASSES,
  type TimingConflict,
} from "@/lib/studio-v3/timeDomain";
import { classifyMinutes, resolveTimeBudget } from "@/lib/studio-v3/resolveTimeBudget";
import {
  describeRequestedDimensions,
  describeUnfittedRequest,
  projectPlanningTiming,
  validateTiming,
  type TimingMomentInput,
} from "@/lib/studio-v3/timingProjection";

const BUDGET_FULL_DAY = resolveTimeBudget({ experienceDurationClass: "full-day" });

function moment(overrides: Partial<TimingMomentInput> & { stopId: string }): TimingMomentInput {
  return { sourceTourIds: [], ...overrides };
}

describe("timeDomain", () => {
  it("keeps the traveller-facing class list free of the internal extended class", () => {
    expect(TRAVELLER_DURATION_CLASSES).toEqual(["half-day", "medium", "full-day"]);
    expect(Object.keys(DURATION_ENVELOPES)).toContain("extended");
  });

  it("encodes rhythm as depth only — no rhythm entry carries a stop count", () => {
    for (const policy of Object.values(RHYTHM_TIMING_POLICY)) {
      expect(Object.keys(policy).sort()).toEqual(["dwellMultiplier", "perTransitionSlackMin"]);
    }
  });
});

describe("resolveTimeBudget", () => {
  it("A. explicit traveller choice wins over a long skeleton", () => {
    const budget = resolveTimeBudget({
      experienceDurationClass: "half-day",
      skeletonTourId: "sintra-cascais",
      skeletonDurationMinutes: 570,
    });
    expect(budget.source).toBe("explicit-traveller-choice");
    expect(budget.availableExperienceMinutes).toBe(DURATION_ENVELOPES["half-day"].targetMinutes);
  });

  it("B. uses the skeleton's EXACT canonical minutes, never a rounded class target", () => {
    const budget = resolveTimeBudget({
      skeletonTourId: "verified-long-day",
      skeletonDurationMinutes: 570,
    });
    expect(budget.source).toBe("signature-skeleton-truth");
    expect(budget.availableExperienceMinutes).toBe(570);
    expect(budget.durationClass).toBe("extended");
    // The envelope must CONTAIN the truthful value.
    expect(budget.minMinutes).toBeLessThanOrEqual(570);
    expect(budget.maxMinutes).toBeGreaterThanOrEqual(570);
  });

  it("B. represents a real 600-minute catalogue day without truncation", () => {
    const budget = resolveTimeBudget({ skeletonDurationMinutes: 600 });
    expect(budget.availableExperienceMinutes).toBe(600);
    expect(budget.maxMinutes).toBeGreaterThanOrEqual(600);
  });

  it("C. falls back to the neutral one-day default with no choice and no skeleton", () => {
    const budget = resolveTimeBudget({});
    expect(budget.source).toBe("legacy-neutral-default");
    expect(budget.availableExperienceMinutes).toBe(LEGACY_NEUTRAL_DEFAULT_MINUTES);
  });

  it("never infers day length from rhythm: every rhythm yields the same budget", () => {
    // The resolver has no rhythm parameter at all — this asserts the shape.
    const base = resolveTimeBudget({ experienceDurationClass: "medium" });
    for (const _rhythm of Object.keys(RHYTHM_TIMING_POLICY)) {
      expect(resolveTimeBudget({ experienceDurationClass: "medium" })).toEqual(base);
    }
  });

  it("classifies minutes without rewriting them", () => {
    expect(classifyMinutes(240)).toBe("half-day");
    expect(classifyMinutes(360)).toBe("medium");
    expect(classifyMinutes(510)).toBe("full-day");
    expect(classifyMinutes(600)).toBe("extended");
  });
});

describe("projectPlanningTiming", () => {
  const twoStops: TimingMomentInput[] = [
    moment({ stopId: "a", sotDurationMinutes: 90, coords: { lat: 38.52, lng: -9.0 } }),
    moment({ stopId: "b", inventoryDurationMinutes: 60, coords: { lat: 38.6, lng: -9.1 } }),
  ];

  it("is deterministic for identical input", () => {
    const first = projectPlanningTiming({ moments: twoStops, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    const second = projectPlanningTiming({ moments: twoStops, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    expect(first).toEqual(second);
  });

  it("keeps the accounting identity: total = dwell + travel + slack", () => {
    const timing = projectPlanningTiming({ moments: twoStops, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    expect(timing.totalMinutes).toBe(
      timing.dwellMinutes + timing.internalTravelMinutes + timing.slackMinutes,
    );
  });

  it("excludes pickup→first and last→drop-off by construction", () => {
    const timing = projectPlanningTiming({ moments: twoStops, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    expect(timing.excluded).toEqual({ pickupToFirst: true, lastToDropoff: true });
    // Only one internal leg exists for two moments; the last moment has none.
    expect(timing.perMoment[1]!.travelToNextMinutes).toBeNull();
    expect(timing.perMoment.filter((m) => m.travelToNextMinutes !== null)).toHaveLength(1);
  });

  it("counts internal travel between consecutive moments", () => {
    const timing = projectPlanningTiming({ moments: twoStops, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    expect(timing.internalTravelMinutes).toBeGreaterThan(0);
    expect(timing.perMoment[0]!.travelSource).toBe("geo-estimate");
  });

  it("prefers canonical travel truth and halves slack so padding is not double counted", () => {
    const moments: TimingMomentInput[] = [
      moment({ ...twoStops[0]!, sotTravelToNextMinutes: 35 }),
      twoStops[1]!,
    ];
    const timing = projectPlanningTiming({ moments, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    expect(timing.perMoment[0]!.travelSource).toBe("sot-travel-to-next");
    expect(timing.perMoment[0]!.travelToNextMinutes).toBe(35);
    expect(timing.perMoment[0]!.transitionSlackMinutes).toBe(
      Math.round(RHYTHM_TIMING_POLICY.balanced.perTransitionSlackMin * 0.5),
    );
  });

  it("uses a conservative fallback when a leg has no geo on either side", () => {
    const moments: TimingMomentInput[] = [
      moment({ stopId: "a", sotDurationMinutes: 60 }),
      moment({ stopId: "b", sotDurationMinutes: 60 }),
    ];
    const timing = projectPlanningTiming({ moments, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    expect(timing.perMoment[0]!.travelSource).toBe("conservative-missing-geo");
    expect(timing.perMoment[0]!.travelToNextMinutes).toBe(25);
  });

  it("resolves dwell through the truth hierarchy", () => {
    const moments: TimingMomentInput[] = [
      moment({ stopId: "sot", sotDurationMinutes: 95, addOnDurationMinutes: 30 }),
      moment({ stopId: "addon", addOnDurationMinutes: 45, inventoryDurationMinutes: 20 }),
      moment({ stopId: "inv", inventoryDurationMinutes: 50 }),
      moment({ stopId: "kind", kind: "winery" }),
      moment({ stopId: "none" }),
    ];
    const timing = projectPlanningTiming({ moments, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    expect(timing.perMoment.map((m) => m.dwellSource)).toEqual([
      "sot-chapter",
      "addon-catalog",
      "inventory",
      "kind-table",
      "conservative-default",
    ]);
    expect(timing.perMoment[4]!.dwellMinutes).toBe(60);
  });

  it("counts a real meal inside dwell and never as a second addend", () => {
    const moments: TimingMomentInput[] = [
      moment({ stopId: "lunch", sotDurationMinutes: 75, kind: "table", isMeal: true }),
      moment({ stopId: "b", sotDurationMinutes: 60 }),
    ];
    const timing = projectPlanningTiming({ moments, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    expect(timing.mealMinutes).toBe(75);
    expect(timing.dwellMinutes).toBe(135);
    expect(timing.totalMinutes).toBe(
      timing.dwellMinutes + timing.internalTravelMinutes + timing.slackMinutes,
    );
  });

  it("never fabricates a meal when no meal moment exists, under any rhythm", () => {
    const moments: TimingMomentInput[] = [moment({ stopId: "a", sotDurationMinutes: 60 })];
    for (const rhythm of ["slow", "balanced", "full", "immersive"] as const) {
      const timing = projectPlanningTiming({ moments, budget: BUDGET_FULL_DAY, rhythm });
      expect(timing.mealMinutes).toBe(0);
      expect(timing.perMoment.every((m) => m.isMeal === false)).toBe(true);
    }
  });

  it("rhythm changes depth, never the budget", () => {
    const slow = projectPlanningTiming({ moments: twoStops, budget: BUDGET_FULL_DAY, rhythm: "slow" });
    const full = projectPlanningTiming({ moments: twoStops, budget: BUDGET_FULL_DAY, rhythm: "full" });
    expect(slow.dwellMinutes).toBeGreaterThan(full.dwellMinutes);
    expect(slow.budget.availableExperienceMinutes).toBe(full.budget.availableExperienceMinutes);
  });

  it("respects an explicit truthful dwell minimum under a dense rhythm", () => {
    const moments: TimingMomentInput[] = [
      moment({ stopId: "a", sotDurationMinutes: 90, minimumDwellMinutes: 85 }),
    ];
    const timing = projectPlanningTiming({ moments, budget: BUDGET_FULL_DAY, rhythm: "full" });
    expect(timing.perMoment[0]!.dwellMinutes).toBeGreaterThanOrEqual(85);
    expect(timing.perMoment[0]!.baseDwellMinutes).toBe(90);
  });

  it("preserves stable commercial identity through projection", () => {
    const moments: TimingMomentInput[] = [
      moment({
        stopId: "quinta-x",
        sourceTourIds: ["arrabida-wine"],
        commercialId: "addon-tasting-premium",
        sotDurationMinutes: 90,
      }),
    ];
    const timing = projectPlanningTiming({ moments, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    expect(timing.perMoment[0]!.identity).toEqual({
      stopId: "quinta-x",
      sourceTourIds: ["arrabida-wine"],
      commercialId: "addon-tasting-premium",
    });
  });
});

describe("validateTiming", () => {
  const moments: TimingMomentInput[] = [
    moment({ stopId: "a", sotDurationMinutes: 90, coords: { lat: 38.52, lng: -9.0 } }),
    moment({ stopId: "b", sotDurationMinutes: 90, coords: { lat: 38.6, lng: -9.1 } }),
    moment({ stopId: "c", sotDurationMinutes: 90, coords: { lat: 38.7, lng: -9.2 } }),
  ];

  it("recomputes with routed minutes without reordering or dropping moments", () => {
    const planning = projectPlanningTiming({ moments, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    const { timing } = validateTiming(planning, [40, 50], "balanced");
    expect(timing.stage).toBe("validated");
    expect(timing.perMoment.map((m) => m.identity.stopId)).toEqual(["a", "b", "c"]);
    expect(timing.internalTravelMinutes).toBe(90);
    expect(timing.perMoment[0]!.travelSource).toBe("routed-osrm");
  });

  it("keeps planning values for missing routed legs", () => {
    const planning = projectPlanningTiming({ moments, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    const { timing } = validateTiming(planning, [null, 50], "balanced");
    expect(timing.perMoment[0]!.travelSource).toBe("geo-estimate");
    expect(timing.perMoment[1]!.travelSource).toBe("routed-osrm");
  });

  it("reports a structured routed overflow instead of silently trimming", () => {
    const planning = projectPlanningTiming({ moments, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    const { timing, conflict } = validateTiming(planning, [200, 200], "balanced");
    expect(conflict).not.toBeNull();
    expect(conflict!.kind).toBe("routed-overflow");
    expect(conflict!.stage).toBe("validated");
    expect(conflict!.overflowMinutes).toBeGreaterThan(0);
    expect(timing.perMoment).toHaveLength(3);
  });

  it("returns no conflict when routed timing still fits", () => {
    const planning = projectPlanningTiming({ moments, budget: BUDGET_FULL_DAY, rhythm: "balanced" });
    expect(validateTiming(planning, [30, 30], "balanced").conflict).toBeNull();
  });
});

describe("conflict schema helpers", () => {
  it("never drops a requested dimension", () => {
    const described = describeRequestedDimensions({
      requestedDimensions: ["wine-table", "faith-reflection", "atlantic-coast"],
      coverageByStopId: { "quinta-x": ["wine-table"], "cape-y": ["atlantic-coast"] },
    });
    expect(described).toHaveLength(3);
    expect(described.map((d) => d.status)).toEqual(["represented", "unfitted", "represented"]);
    expect(described[0]!.representedByStopIds).toEqual(["quinta-x"]);
  });

  it("reports the cheapest truthful admission cost for an unfitted dimension", () => {
    const unfitted = describeUnfittedRequest({
      dimension: "faith-reflection",
      candidates: [
        { stopId: "sanctuary-far", totalCostMinutes: 140 },
        { stopId: "chapel-near", totalCostMinutes: 65 },
      ],
    });
    expect(unfitted.minimumExtraMinutesNeeded).toBe(65);
    expect(unfitted.candidateStopIds).toEqual(["chapel-near", "sanctuary-far"]);
  });
});

describe("state additivity", () => {
  it("adds experienceDurationClass as null without changing any other default", () => {
    expect(INITIAL_STATE.experienceDurationClass).toBeNull();
    expect(INITIAL_STATE.rhythm).toBeNull();
  });
});

describe("explicit traveller duration choice", () => {
  it("resolves Half Day to a 240-minute experience budget", () => {
    const budget = resolveTimeBudget({ experienceDurationClass: "half-day" });
    expect(budget.source).toBe("explicit-traveller-choice");
    expect(budget.durationClass).toBe("half-day");
    expect(budget.availableExperienceMinutes).toBe(240);
  });

  it("resolves Medium to a 360-minute experience budget", () => {
    const budget = resolveTimeBudget({ experienceDurationClass: "medium" });
    expect(budget.source).toBe("explicit-traveller-choice");
    expect(budget.durationClass).toBe("medium");
    expect(budget.availableExperienceMinutes).toBe(360);
  });

  it("resolves Full Day to a 510-minute experience budget", () => {
    const budget = resolveTimeBudget({ experienceDurationClass: "full-day" });
    expect(budget.source).toBe("explicit-traveller-choice");
    expect(budget.durationClass).toBe("full-day");
    expect(budget.availableExperienceMinutes).toBe(510);
  });

  it("gives the same moment set more room under Full than under Half (acceptance-E groundwork)", () => {
    const neutral: TimingMomentInput[] = [
      moment({ stopId: "a", sotDurationMinutes: 60, coords: { lat: 38.52, lng: -9.0 } }),
      moment({ stopId: "b", sotDurationMinutes: 60, coords: { lat: 38.6, lng: -9.1 } }),
    ];
    const half = projectPlanningTiming({
      moments: neutral,
      budget: resolveTimeBudget({ experienceDurationClass: "half-day" }),
      rhythm: "balanced",
    });
    const full = projectPlanningTiming({
      moments: neutral,
      budget: resolveTimeBudget({ experienceDurationClass: "full-day" }),
      rhythm: "balanced",
    });

    expect(half.budget.availableExperienceMinutes).toBe(240);
    expect(full.budget.availableExperienceMinutes).toBe(510);
    // Same moments, same rhythm: consumption is identical, only headroom grows.
    expect(full.totalMinutes).toBe(half.totalMinutes);
    expect(full.remainingMinutes - half.remainingMinutes).toBe(510 - 240);
    expect(full.remainingMinutes).toBeGreaterThan(half.remainingMinutes);
  });
});

describe("TimingConflict schema readiness", () => {
  it("carries every requested dimension, an admission cost, and truthful options only", () => {
    const conflict: TimingConflict = {
      kind: "time-overflow",
      stage: "planning",
      requestedDimensions: [
        { dimension: "wine-table", status: "represented", representedByStopIds: ["quinta-x"] },
        { dimension: "faith-reflection", status: "unfitted", representedByStopIds: [] },
        { dimension: "atlantic-coast", status: "represented", representedByStopIds: ["cape-y"] },
      ],
      unfittedRequests: [
        {
          dimension: "faith-reflection",
          minimumExtraMinutesNeeded: 65,
          candidateStopIds: ["chapel-near", "sanctuary-far"],
        },
      ],
      overflowMinutes: 40,
      options: [
        { option: "extend-duration", toClass: "extended", extraMinutesGained: 60 },
        {
          option: "swap-moment",
          dropStopId: "quinta-x",
          forStopId: "chapel-near",
          minutesRecovered: 90,
          dimensionCost: "wine-table",
        },
        { option: "choose-between-anchors", anchorStopIds: ["quinta-x", "chapel-near"] },
      ],
    };

    expect(conflict.requestedDimensions).toHaveLength(3);
    expect(conflict.requestedDimensions.filter((d) => d.status === "unfitted")).toHaveLength(1);
    expect(conflict.unfittedRequests[0]!.minimumExtraMinutesNeeded).toBe(65);
    expect(conflict.options.map((o) => o.option)).toEqual([
      "extend-duration",
      "swap-moment",
      "choose-between-anchors",
    ]);
    // Dwell is truthful operational time; it is never silently compressed.
    expect(conflict.options.some((o) => (o as { option: string }).option === "shorten-dwell")).toBe(
      false,
    );
  });
});
