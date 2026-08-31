/**
 * BUILD 1 / Pass 2 — TIME AUTHORITY inside `composeLivingAtlasDay()`.
 *
 * These tests prove that TIME, not stop count, governs validity and fill.
 * They never assert a fixed number of moments as a target: any count is an
 * OUTPUT of truthful dwell + internal travel + internal slack.
 */

import { describe, expect, it } from "vitest";

import { REGION_STOP_POOL, type OptionalStop } from "@/data/regionStopPool";
import {
  composeLivingAtlasDay,
  type LivingAtlasCompositionRequest,
} from "../livingAtlasComposer";
import { planLivingAtlasRoute } from "../livingAtlasRoutePlanner";
import { deriveLivingAtlasDimensions } from "../livingAtlasInventory";
import type { LivingAtlasResolvedComposition } from "../livingAtlasAlternatives";
import { resolveTimeBudget } from "@/lib/studio-v3/resolveTimeBudget";
import { projectPlanningTiming } from "@/lib/studio-v3/timingProjection";

/* ------------------------------------------------------------------ *
 * Deterministic fixture pool.
 *
 * Clearly labelled test-only inventory built on the real `OptionalStop`
 * schema. It exists because the verified pool currently carries no `boat`
 * moment; no real activity, partner or itinerary is invented here.
 * ------------------------------------------------------------------ */

const ANCHOR = "arrabida-boat" as const;

function fixtureStop(overrides: Partial<OptionalStop> & Pick<OptionalStop, "id" | "type">): OptionalStop {
  return {
    region: "arrabida-setubal",
    routeCluster: "fixture-cluster",
    name: `Fixture ${overrides.id}`,
    suitsInterests: [],
    suitsRhythm: ["slow", "balanced", "full"],
    durationMin: 30,
    source: "signature-core",
    sourceTourIds: [ANCHOR],
    active: true,
    ...overrides,
  } as OptionalStop;
}

/** Twelve short neutral moments — far more than any legacy count target. */
const SHORT_POOL: OptionalStop[] = Array.from({ length: 12 }, (_, index) =>
  fixtureStop({
    id: `short-${index}`,
    type: "viewpoint",
    durationMin: 20,
    coords: { lat: 38.48 + index * 0.004, lng: -9.0 + index * 0.004 },
    suitsInterests: ["nature", "photography"],
  }),
);

const NEUTRAL_PROFILE = {
  selected: ["nature-landscapes"],
  leads: ["nature-landscapes"],
} as const;

function baseRequest(
  overrides: Partial<LivingAtlasCompositionRequest> = {},
): LivingAtlasCompositionRequest {
  return {
    anchorSignatureId: ANCHOR,
    profile: {
      selected: [...NEUTRAL_PROFILE.selected],
      leads: [...NEUTRAL_PROFILE.leads],
    },
    density: "balanced",
    pool: SHORT_POOL,
    ...overrides,
  } as LivingAtlasCompositionRequest;
}

const HALF = resolveTimeBudget({ explicitMinutes: 240 });
const FULL = resolveTimeBudget({ explicitMinutes: 510 });

describe("Pass 2 — count is non-binding", () => {
  it("admits more moments than the legacy density target when time allows", () => {
    const result = composeLivingAtlasDay(baseRequest({ timeBudget: FULL }));

    // The legacy target survives only as a diagnostic field.
    expect(result.targetMomentCount).toBeLessThan(result.moments.length);
    expect(result.moments.length).toBeGreaterThan(5);
    expect(result.planningTiming.totalMinutes).toBeLessThanOrEqual(
      FULL.availableExperienceMinutes,
    );
  });

  it("ignores the deprecated maxStopMinutes entirely", () => {
    const tight = composeLivingAtlasDay(baseRequest({ timeBudget: FULL, maxStopMinutes: 60 }));
    const loose = composeLivingAtlasDay(baseRequest({ timeBudget: FULL, maxStopMinutes: 9999 }));

    expect(tight.moments.map((moment) => moment.stopId)).toEqual(
      loose.moments.map((moment) => moment.stopId),
    );
    expect(tight.planningTiming).toEqual(loose.planningTiming);
  });
});

describe("Pass 2 — rhythm is time shape, not stop count", () => {
  it("keeps the budget identical while slow spends more minutes per moment", () => {
    const slow = composeLivingAtlasDay(
      baseRequest({ timeBudget: FULL, rhythm: "slow", density: "slow" }),
    );
    const full = composeLivingAtlasDay(
      baseRequest({ timeBudget: FULL, rhythm: "full", density: "rich" }),
    );

    expect(slow.planningTiming.budget.availableExperienceMinutes).toBe(
      full.planningTiming.budget.availableExperienceMinutes,
    );

    const slowPerMoment = slow.planningTiming.dwellMinutes / Math.max(1, slow.moments.length);
    const fullPerMoment = full.planningTiming.dwellMinutes / Math.max(1, full.moments.length);
    expect(slowPerMoment).toBeGreaterThan(fullPerMoment);
  });
});

describe("Pass 2 — half day with competing required experiences", () => {
  const richPool: OptionalStop[] = [
    fixtureStop({
      id: "fixture-workshop",
      type: "workshop",
      durationMin: 90,
      coords: { lat: 38.51, lng: -9.01 },
      suitsInterests: ["heritage", "local-life"],
    }),
    fixtureStop({
      id: "fixture-boat",
      type: "boat",
      durationMin: 120,
      coords: { lat: 38.44, lng: -9.1 },
      suitsInterests: ["coast", "nature"],
    }),
    fixtureStop({
      id: "fixture-winery",
      type: "winery",
      durationMin: 90,
      coords: { lat: 38.53, lng: -8.99 },
      suitsInterests: ["wine", "gastronomy"],
    }),
  ];

  const request = baseRequest({
    pool: richPool,
    timeBudget: HALF,
    requiredTypes: ["workshop", "boat", "winery"],
    profile: {
      selected: ["hands-on-traditions", "atlantic-coast", "wine-table"],
      leads: ["hands-on-traditions"],
    },
  });

  it("returns a truthful tradeoff instead of overfilling or silently dropping", () => {
    const result = composeLivingAtlasDay(request);

    expect(result.status).toBe("tradeoff");
    expect(result.conflict).not.toBeNull();
    expect(result.planningTiming.totalMinutes).toBeLessThanOrEqual(HALF.maxMinutes);

    const conflict = result.conflict!;
    expect(conflict.unfittedRequests.length).toBeGreaterThan(0);
    for (const unfitted of conflict.unfittedRequests) {
      expect(unfitted.candidateStopIds.length).toBeGreaterThan(0);
      expect(unfitted.minimumExtraMinutesNeeded).toBeGreaterThan(0);
    }

    // Nothing is dropped from the record: every requested dimension is
    // classified, and blocked types stay visible for compatibility.
    expect(conflict.requestedDimensions).toHaveLength(3);
    expect(result.missingRequiredTypes.length).toBeGreaterThan(0);

    const options = conflict.options.map((option) => option.option);
    expect(options.length).toBeGreaterThan(0);
    expect(options).not.toContain("shorten-dwell");
    expect(
      options.includes("extend-duration") || options.includes("choose-between-anchors"),
    ).toBe(true);
  });
});

describe("Pass 2 — more minutes, not a bigger count target", () => {
  it("expands the composition from half day to full day", () => {
    const half = composeLivingAtlasDay(baseRequest({ timeBudget: HALF }));
    const full = composeLivingAtlasDay(baseRequest({ timeBudget: FULL }));

    expect(full.moments.length).toBeGreaterThan(half.moments.length);
    expect(full.planningTiming.totalMinutes).toBeGreaterThan(half.planningTiming.totalMinutes);
    expect(half.targetMomentCount).toBe(full.targetMomentCount);
  });
});

describe("Pass 2 — determinism and truthful totals", () => {
  it("returns a deep-equal composition for an identical request", () => {
    const a = composeLivingAtlasDay(baseRequest({ timeBudget: FULL, rhythm: "balanced" }));
    const b = composeLivingAtlasDay(baseRequest({ timeBudget: FULL, rhythm: "balanced" }));
    expect(a).toEqual(b);
  });

  it("keeps totalMinutes equal to dwell + internal travel + internal slack", () => {
    const result = composeLivingAtlasDay(baseRequest({ timeBudget: FULL }));
    const timing = result.planningTiming;

    expect(timing.totalMinutes).toBe(
      timing.dwellMinutes + timing.internalTravelMinutes + timing.slackMinutes,
    );
    // Meal minutes are part of dwell, never added a second time.
    expect(timing.mealMinutes).toBeLessThanOrEqual(timing.dwellMinutes);
    // Legacy dwell subtotal keeps its old meaning and is not the truthful total.
    expect(result.totalDurationMin).toBeLessThanOrEqual(timing.totalMinutes);
  });
});

describe("Pass 2 — real inventory protections", () => {
  it("keeps real Arrábida workshop moments region- and cluster-compatible (workshop only — no boat in the real pool)", () => {
    const result = composeLivingAtlasDay({
      anchorSignatureId: "arrabida-wine-allinclusive",
      profile: { selected: ["atlantic-coast", "nature-landscapes"], leads: ["atlantic-coast"] },
      density: "balanced",
      // Real verified Arrábida inventory: a hands-on workshop is requested as
      // an explicit activity obligation, never as an invented moment.
      requiredTypes: ["workshop"],
      pool: REGION_STOP_POOL,
      timeBudget: FULL,
    });

    expect(result.moments.length).toBeGreaterThan(0);
    expect(result.moments.some((moment) => moment.type === "workshop")).toBe(true);
    for (const moment of result.moments) {
      expect(moment.region).toBe("arrabida-setubal");
      expect(moment.sourceTourIds.length).toBeGreaterThan(0);
    }
    expect(result.routeOrderReady).toBe(false);
  });

  // PASS-3 GATES NOW CLOSED — the real `boat-arrabida` inventory moment (150
  // min, Tailor structural truth) and explicit `participatory` capabilities
  // exist, so both cases are proven against real inventory.
  it("composes the real Arrábida hands-on workshop + real boat sibling hybrid", () => {
    const result = composeLivingAtlasDay({
      anchorSignatureId: "arrabida-boat",
      profile: {
        selected: ["hands-on-traditions", "atlantic-coast"],
        leads: ["hands-on-traditions", "atlantic-coast"],
      },
      density: "balanced",
      requiredTypes: ["workshop", "boat"],
      pool: REGION_STOP_POOL,
      timeBudget: FULL,
    });

    const boat = result.moments.find((moment) => moment.type === "boat");
    expect(boat?.stopId).toBe("arrabida-bay-boat");
    expect(boat?.durationMin).toBe(150);
    expect(result.moments.some((moment) => moment.type === "workshop")).toBe(true);
    for (const moment of result.moments) expect(moment.region).toBe("arrabida-setubal");
  });

  it("derives `hands-on-traditions` semantically from verified participatory capability", () => {
    const cheese = REGION_STOP_POOL.find(
      (stop) => stop.id === "quinta-velha-cheese-workshop",
    );
    expect(cheese?.capabilities).toContain("participatory");
    expect(
      deriveLivingAtlasDimensions({
        label: cheese!.name,
        intentionTags: cheese!.suitsInterests,
        capabilities: cheese!.capabilities ?? [],
      }),
    ).toContain("hands-on-traditions");
  });



  it("keeps the real 600-minute evora-alentejo skeleton budget exact", () => {
    const budget = resolveTimeBudget({ skeletonTourId: "evora-alentejo" });
    expect(budget.availableExperienceMinutes).toBe(600);

    const result = composeLivingAtlasDay({
      anchorSignatureId: "evora-alentejo",
      profile: { selected: ["history-heritage"], leads: ["history-heritage"] },
      density: "balanced",
      pool: REGION_STOP_POOL,
      // No explicit traveller budget: the canonical skeleton is the authority.
    });

    expect(result.planningTiming.budget.source).toBe("signature-skeleton-truth");
    // Exact canonical minutes — never rounded to a class target.
    expect(result.planningTiming.budget.availableExperienceMinutes).toBe(600);
  });
});

describe("Pass 2 audit — conflict headroom is obligation-only", () => {
  /**
   * One required obligation cannot fit, while short discretionary filler
   * still can. The reported minimum must describe the obligation against the
   * protected (steps 1–4) composition, never against the post-filler set.
   */
  const OBLIGATION_POOL: OptionalStop[] = [
    fixtureStop({
      id: "obligation-boat",
      type: "boat",
      durationMin: 210,
      coords: { lat: 38.44, lng: -9.1 },
      suitsInterests: ["coast", "nature"],
    }),
    fixtureStop({
      id: "obligation-winery",
      type: "winery",
      durationMin: 120,
      coords: { lat: 38.53, lng: -8.99 },
      suitsInterests: ["wine", "gastronomy"],
    }),
  ];

  const FILLER: OptionalStop[] = Array.from({ length: 3 }, (_, index) =>
    fixtureStop({
      id: `tiny-filler-${index}`,
      type: "viewpoint",
      durationMin: 15,
      coords: { lat: 38.5 + index * 0.003, lng: -9.0 + index * 0.003 },
      // Deliberately covers NO requested dimension, so it can only ever be
      // admitted by step 5 discretionary filling.
      suitsInterests: ["photography"],
    }),
  );

  function conflictFor(pool: OptionalStop[]) {
    return composeLivingAtlasDay(
      baseRequest({
        pool,
        timeBudget: HALF,
        requiredTypes: ["winery", "boat"],
        profile: {
          selected: ["wine-table", "atlantic-coast"],
          leads: ["wine-table"],
        },
      }),
    );
  }

  it("is unchanged by later discretionary filler", () => {
    const withoutFiller = conflictFor([...OBLIGATION_POOL]);
    const withFiller = conflictFor([...OBLIGATION_POOL, ...FILLER]);

    expect(withoutFiller.status).toBe("tradeoff");
    expect(withFiller.status).toBe("tradeoff");
    // Filler really did fit — otherwise the test would prove nothing.
    expect(withFiller.moments.length).toBeGreaterThan(withoutFiller.moments.length);

    const blockedWithout = withoutFiller.conflict!.unfittedRequests;
    const blockedWith = withFiller.conflict!.unfittedRequests;
    expect(blockedWith.map((entry) => entry.minimumExtraMinutesNeeded)).toEqual(
      blockedWithout.map((entry) => entry.minimumExtraMinutesNeeded),
    );

    // Deterministic frozen value: the boat obligation needed exactly 88 extra
    // minutes AT ITS FAILURE POINT, before any filler existed. Filler admitted
    // afterwards must never change this number.
    expect(blockedWithout.map((entry) => entry.minimumExtraMinutesNeeded)).toEqual([88, 88]);
    expect(blockedWith.map((entry) => entry.minimumExtraMinutesNeeded)).toEqual([88, 88]);

    // The reported minimum is the truthful obligation-only headroom, > 0
    // because the blocker genuinely exceeded the envelope.
    for (const entry of blockedWith) {
      expect(entry.minimumExtraMinutesNeeded).toBeGreaterThan(0);
    }
  });
});

describe("Pass 2 — structural failure versus time tradeoff", () => {
  it("keeps a nonexistent mustInclude structurally impossible", () => {
    const result = composeLivingAtlasDay(
      baseRequest({ timeBudget: FULL, mustIncludeStopIds: ["does-not-exist"] }),
    );
    expect(result.status).toBe("impossible");
  });

  it("turns a real but unfittable obligation into a tradeoff", () => {
    const pool = [
      fixtureStop({ id: "huge-anchor", type: "boat", durationMin: 400, coords: { lat: 38.4, lng: -9.2 } }),
      fixtureStop({ id: "filler", type: "viewpoint", durationMin: 20, coords: { lat: 38.41, lng: -9.19 } }),
    ];
    const result = composeLivingAtlasDay(
      baseRequest({ pool, timeBudget: HALF, mustIncludeStopIds: ["huge-anchor"] }),
    );

    expect(result.status).toBe("tradeoff");
    expect(result.conflict?.unfittedRequests.length).toBeGreaterThan(0);
  });
});

describe("Pass 2 — routing constant centralization regression", () => {
  it("returns the same estimated driving minutes as before the refactor", () => {
    const routePool: OptionalStop[] = [
      fixtureStop({ id: "a", type: "viewpoint", coords: { lat: 38.5, lng: -9.0 } }),
      fixtureStop({ id: "b", type: "viewpoint", coords: { lat: 38.6, lng: -9.0 } }),
      fixtureStop({ id: "c", type: "viewpoint", coords: { lat: 38.7, lng: -9.0 } }),
    ];
    const composition: LivingAtlasResolvedComposition = {
      status: "complete",
      anchorSignatureId: ANCHOR,
      moments: routePool.map((stop) => ({
        stopId: stop.id,
        slotId: stop.id,
        replacedStopId: null,
        originalLabel: null,
        label: stop.name,
        type: stop.type,
        durationMin: stop.durationMin,
        region: stop.region,
        routeCluster: stop.routeCluster ?? null,
        sourceTourIds: [ANCHOR],
        dimensions: [],
        score: 1,
        reasons: [],
      })),
      totalDurationMin: 90,
      targetMomentCount: 3,
      planningTiming: projectPlanningTiming({
        moments: [],
        budget: resolveTimeBudget({}),
        rhythm: "balanced",
      }),
      conflict: null,
      missingDimensions: [],
      missingRequiredTypes: [],
      rejected: [],
      routeOrderReady: false,
      appliedReplacements: {},
      ignoredReplacements: [],
    } as LivingAtlasResolvedComposition;

    const route = planLivingAtlasRoute({ composition, pool: routePool });
    // Unchanged methodology: 11.12 km × 1.24 ÷ 44 km/h ≈ 19 min per leg.
    expect(route.legs.map((leg) => leg.estimatedDrivingMin)).toEqual([19, 19]);
  });
});
