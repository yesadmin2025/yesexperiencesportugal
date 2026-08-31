/**
 * PASS 2.2 — TIME AUTHORITY certification (canonical projection).
 *
 * Proves that:
 *  - only STRUCTURALLY PROVEN minutes (explicit positive duration + an
 *    authoritative `DwellSource`: `sot-chapter` | `addon-catalog` |
 *    `inventory`, on a stop with a stable structural `stopId`) may decide
 *    composition — label inference never certifies;
 *  - the arithmetic is the CANONICAL V3 planning authority
 *    (`projectPlanningTiming`): dwell + internal travel +
 *    `FIXED_OPERATIONAL_SLACK_MIN` + per-transition slack, conservative
 *    missing-geo travel, pickup→first and last→drop-off excluded;
 *  - the budget authority is `ResolvedTimeBudget.availableExperienceMinutes`;
 *  - aggregate selected add-on minutes are counted exactly once and never
 *    zeroed to force a fit.
 *
 * Fixtures whose durations are invented for the pure authority use explicit
 * `fixture:*` ids. Real candidates come from REGION_STOP_POOL by structural id
 * and use their real `durationMin` — always from the SAME corridor as the
 * route context.
 *
 * No conditional assertions. No production constant is re-implemented here.
 */

import { describe, it, expect } from "vitest";
import { applyExtraMoment, resolveStudioV3Route } from "../curation";
import {
  hasMinuteTruth,
  judgeAdmission,
  judgeRouteTimeFit,
  stopHasMinuteTruth,
  type TimeAuthorityStop,
} from "@/lib/studio-v3/timeAuthority";
import {
  CONSERVATIVE_MISSING_GEO_TRAVEL_MIN,
  FIXED_OPERATIONAL_SLACK_MIN,
  RHYTHM_TIMING_POLICY,
} from "@/lib/studio-v3/timeDomain";
import { resolveTimeBudget } from "@/lib/studio-v3/resolveTimeBudget";
import { REGION_STOP_POOL } from "@/data/regionStopPool";
import { inferKind } from "@/lib/studio/timing";

// Real Arrábida geography — the same coordinates the catalogue uses.
const AZEITAO = { lat: 38.5167, lng: -9.0167 };
const PALMELA = { lat: 38.5686, lng: -8.9014 };
const SETUBAL = { lat: 38.5244, lng: -8.8882 };
const PORTINHO = { lat: 38.4747, lng: -8.9924 };
const SESIMBRA = { lat: 38.4441, lng: -9.101 };

const HALF_DAY = resolveTimeBudget({ experienceDurationClass: "half-day" });
const FULL_DAY = resolveTimeBudget({ experienceDurationClass: "full-day" });

/** FIXTURE helper — an explicitly certified stop for the pure authority. */
const certified = (
  id: string,
  geo: { lat: number; lng: number } | null,
  durationMinutes: number,
  durationSource: TimeAuthorityStop["durationSource"] = "inventory",
): TimeAuthorityStop => ({
  stopId: `fixture:${id}`,
  label: `FIXTURE ${id}`,
  lat: geo?.lat ?? null,
  lng: geo?.lng ?? null,
  durationMinutes,
  durationSource,
});

const pooled = (id: string) => {
  const stop = REGION_STOP_POOL.find((s) => s.id === id);
  if (!stop) throw new Error(`REGION_STOP_POOL entry missing: ${id}`);
  return stop;
};

/** A real Arrábida-corridor candidate, as a certified authority stop. */
const pooledStop = (id: string): TimeAuthorityStop => {
  const stop = pooled(id);
  return {
    stopId: stop.id,
    label: stop.name,
    lat: stop.coords?.lat ?? null,
    lng: stop.coords?.lng ?? null,
    durationMinutes: stop.durationMin,
    durationSource: "inventory",
  };
};

/* ------------------------------------------------------------------ *
 * 1–3 · The provenance boundary
 * ------------------------------------------------------------------ */

describe("PASS 2.2 · provenance boundary", () => {
  it("1 — label inference alone NEVER certifies a stop, even when inferKind succeeds", () => {
    expect(inferKind("Quinta de Azeitão winery")).toBe("winery");
    expect(inferKind("Long lunch table")).toBe("table");

    const inferredOnly: TimeAuthorityStop[] = [
      { stopId: "fixture:winery", label: "Quinta de Azeitão winery", ...AZEITAO },
      { stopId: "fixture:table", label: "Long lunch table", ...SETUBAL },
    ];
    expect(stopHasMinuteTruth(inferredOnly[0])).toBe(false);
    expect(stopHasMinuteTruth(inferredOnly[1])).toBe(false);
    expect(hasMinuteTruth(inferredOnly)).toBe(false);
    expect(judgeRouteTimeFit({ stops: inferredOnly, budget: FULL_DAY }).verdict).toBe(
      "not-evaluable",
    );
  });

  it("2 — authoritative provenance + a stable structural stopId IS evaluable", () => {
    for (const source of ["inventory", "sot-chapter", "addon-catalog"] as const) {
      expect(stopHasMinuteTruth(certified("stop", AZEITAO, 60, source))).toBe(true);
    }
    // A certified duration without structural identity is still not truth.
    expect(
      stopHasMinuteTruth({
        stopId: "",
        label: "no identity",
        ...AZEITAO,
        durationMinutes: 60,
        durationSource: "inventory",
      }),
    ).toBe(false);

    const verdict = judgeRouteTimeFit({
      stops: [certified("a", AZEITAO, 60), certified("b", SETUBAL, 45)],
      budget: FULL_DAY,
      rhythm: "balanced",
    });
    expect(verdict.evaluable).toBe(true);
    expect(verdict.experienceMin).toBe(105 * RHYTHM_TIMING_POLICY.balanced.dwellMultiplier);
  });

  it("3 — kind-table / conservative-default / absent provenance is NOT minute truth", () => {
    expect(stopHasMinuteTruth(certified("stop", AZEITAO, 90, "kind-table"))).toBe(false);
    expect(stopHasMinuteTruth(certified("stop", AZEITAO, 90, "conservative-default"))).toBe(false);
    expect(
      stopHasMinuteTruth({
        stopId: "fixture:stop",
        label: "FIXTURE stop",
        ...AZEITAO,
        durationMinutes: 90,
      }),
    ).toBe(false);
    expect(
      judgeRouteTimeFit({
        stops: [certified("stop", AZEITAO, 90, "kind-table")],
        budget: FULL_DAY,
      }).verdict,
    ).toBe("not-evaluable");
  });

  it("3b — a first-pass (verified:false) dwell can never be promoted to certified truth", () => {
    const unverifiedDwellMin = 75;
    expect(
      stopHasMinuteTruth(certified("unverified", PALMELA, unverifiedDwellMin, "conservative-default")),
    ).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * 4 · Legacy data stays on the explicit count fallback
 * ------------------------------------------------------------------ */

describe("PASS 2.2 · legacy Signature route data", () => {
  const route = resolveStudioV3Route({
    feeling: "wine-food",
    companions: "couple",
    rhythm: "balanced",
    interests: ["wine"],
    pickup: "lisbon",
    destinationIntent: "arrabida-setubal-azeitao",
  });

  it("4a — real resolved route points carry no structural identity or dwell, so they are not-evaluable", () => {
    // Mirror of the production `existingTimeStops` adapter: never fabricate
    // positional ids — absent structural identity stays empty.
    const stops: TimeAuthorityStop[] = route.composedRoutePoints.map((p) => ({
      stopId: (p as { stopId?: string | null }).stopId ?? "",
      label: p.label,
      lat: p.lat,
      lng: p.lng,
    }));
    expect(stops.length).toBeGreaterThan(0);
    expect(stops.every((s) => s.stopId === "")).toBe(true);
    expect(hasMinuteTruth(stops)).toBe(false);
    expect(judgeRouteTimeFit({ stops, budget: FULL_DAY }).verdict).toBe("not-evaluable");
  });

  it("4c — authoritative duration/provenance WITHOUT a genuine stopId still cannot certify", () => {
    // Regression: positional/label identity must never be enough — even a
    // legacy-shaped carrier with a real authoritative duration stays
    // non-evaluable when structural identity is absent.
    const legacyWithDwell: TimeAuthorityStop[] = route.composedRoutePoints.map((p) => ({
      stopId: "",
      label: p.label,
      lat: p.lat,
      lng: p.lng,
      durationMinutes: 90,
      durationSource: "inventory",
    }));
    expect(legacyWithDwell.length).toBeGreaterThan(0);
    expect(legacyWithDwell.every((s) => stopHasMinuteTruth(s) === false)).toBe(true);
    expect(hasMinuteTruth(legacyWithDwell)).toBe(false);
    expect(judgeRouteTimeFit({ stops: legacyWithDwell, budget: FULL_DAY }).verdict).toBe(
      "not-evaluable",
    );
  });

  it("4b — the caller's explicit count fallback stays stable and never crashes", () => {
    const before = route.composedRoutePoints;
    const atCeiling = applyExtraMoment(before, {
      skeletonTourId: route.skeletonTourKey ?? "",
      interests: ["wine"],
      rhythm: "balanced",
      companions: "couple",
      investment: null,
      considerations: [],
      wineIntent: true,
      maxPoints: before.length, // ceiling already reached
      region: route.routeAreaLabel,
    });
    expect(atCeiling.map((p) => p.label)).toEqual(before.map((p) => p.label));
    expect(atCeiling.every((p, i) => p.index === i)).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * 5–7 · The canonical projection is the arithmetic
 * ------------------------------------------------------------------ */

describe("PASS 2.2 · canonical projection is the arithmetic", () => {
  it("5 — the total includes fixed operational slack AND per-transition slack, not just dwell", () => {
    const stops = [
      certified("a", AZEITAO, 60),
      certified("b", SETUBAL, 60),
      certified("c", PORTINHO, 60),
    ];
    const rhythm = "balanced" as const;
    const verdict = judgeRouteTimeFit({ stops, budget: FULL_DAY, rhythm });
    const transitions = stops.length - 1;
    expect(verdict.slackMin).toBe(
      FIXED_OPERATIONAL_SLACK_MIN + transitions * RHYTHM_TIMING_POLICY[rhythm].perTransitionSlackMin,
    );
    expect(verdict.driveMin).toBeGreaterThan(0);
    expect(verdict.totalMin).toBe(verdict.experienceMin + verdict.driveMin + verdict.slackMin);
    expect(verdict.totalMin).toBeGreaterThan(verdict.experienceMin);
  });

  it("6 — missing coordinates use the conservative missing-geo travel, never 0", () => {
    const noGeo = judgeRouteTimeFit({
      stops: [certified("a", null, 60), certified("b", null, 60)],
      budget: FULL_DAY,
      rhythm: "balanced",
    });
    expect(noGeo.driveMin).toBe(CONSERVATIVE_MISSING_GEO_TRAVEL_MIN);
  });

  it("7 — pickup→first and last→drop-off are excluded: a single moment has zero travel", () => {
    const single = judgeRouteTimeFit({
      stops: [certified("only", AZEITAO, 90)],
      budget: FULL_DAY,
      rhythm: "balanced",
    });
    expect(single.driveMin).toBe(0);
    expect(single.slackMin).toBe(FIXED_OPERATIONAL_SLACK_MIN);
    expect(single.totalMin).toBe(90 + FIXED_OPERATIONAL_SLACK_MIN);
  });
});

/* ------------------------------------------------------------------ *
 * 8–9 · Minutes, not count, decide a whole route
 * ------------------------------------------------------------------ */

describe("PASS 2.2 · minutes, not count, decide a whole route", () => {
  it("8 — more points than a legacy count ceiling is accepted when canonical minutes fit", () => {
    const stops = [
      certified("1", AZEITAO, 40),
      certified("2", PALMELA, 35),
      certified("3", SETUBAL, 40),
      certified("4", PORTINHO, 40),
      certified("5", SESIMBRA, 35),
      certified("6", AZEITAO, 30),
    ];
    const legacyCountCeiling = 4;
    expect(stops.length).toBeGreaterThan(legacyCountCeiling);

    const verdict = judgeRouteTimeFit({ stops, budget: FULL_DAY, rhythm: "balanced" });
    expect(verdict.evaluable).toBe(true);
    expect(verdict.fits).toBe(true);
    expect(verdict.budgetMin).toBe(FULL_DAY.availableExperienceMinutes);
  });

  it("9 — fewer points but over the canonical budget is rejected", () => {
    const stops = [certified("long-1", AZEITAO, 240), certified("long-2", SESIMBRA, 240)];
    const verdict = judgeRouteTimeFit({ stops, budget: HALF_DAY, rhythm: "balanced" });
    expect(verdict.evaluable).toBe(true);
    expect(verdict.fits).toBe(false);
    expect(verdict.verdict).toBe("over-day-budget");
    expect(verdict.budgetMin).toBe(HALF_DAY.availableExperienceMinutes);
    expect(verdict.totalMin).toBeGreaterThan(HALF_DAY.availableExperienceMinutes);
  });
});

/* ------------------------------------------------------------------ *
 * 10–12 · Candidate admission (same corridor only)
 * ------------------------------------------------------------------ */

describe("PASS 2.2 · candidate admission", () => {
  // Real Arrábida-corridor context, from the pool itself.
  const existing = [
    pooledStop("jose-maria-da-fonseca"),
    pooledStop("azeitao-village"),
    pooledStop("portinho-da-arrabida"),
    pooledStop("castelo-de-sesimbra"),
  ];

  it("10 — a real same-corridor pool candidate is admitted past the count ceiling", () => {
    const candidate = pooledStop("mercado-do-livramento");
    expect(pooled("mercado-do-livramento").routeCluster).toBe("arrabida-azeitao-sesimbra");
    for (const stop of existing) {
      expect(pooled(stop.stopId).routeCluster).toBe("arrabida-azeitao-sesimbra");
    }
    const legacyCountCeiling = existing.length; // already reached

    const verdict = judgeAdmission(
      { stops: existing, budget: FULL_DAY, rhythm: "balanced" },
      candidate,
    );
    expect(existing.length).toBe(legacyCountCeiling);
    expect(verdict.evaluable).toBe(true);
    expect(verdict.fits).toBe(true);
  });

  it("11 — an over-budget candidate is rejected even below the count ceiling", () => {
    const two = existing.slice(0, 2);
    const verdict = judgeAdmission(
      { stops: two, budget: HALF_DAY, rhythm: "balanced" },
      certified("very-long-moment", PALMELA, 300),
    );
    expect(two.length).toBeLessThan(4);
    expect(verdict.evaluable).toBe(true);
    expect(verdict.fits).toBe(false);
    expect(verdict.verdict).toBe("over-day-budget");
  });

  it("12 — selected add-on minutes count exactly once and can flip fit → not-fit", () => {
    const candidate = pooledStop("quinta-velha-cheese-workshop");
    const base = judgeAdmission(
      { stops: existing, budget: FULL_DAY, rhythm: "balanced", addOnsMinutes: 0 },
      candidate,
    );
    const addOnMinutes = 90;
    const withAddOn = judgeAdmission(
      { stops: existing, budget: FULL_DAY, rhythm: "balanced", addOnsMinutes: addOnMinutes },
      candidate,
    );

    // Exact delta — the add-on is never silently zeroed, never double counted,
    // and never given fabricated travel or slack.
    expect(withAddOn.experienceMin - base.experienceMin).toBe(addOnMinutes);
    expect(withAddOn.totalMin - base.totalMin).toBe(addOnMinutes);
    expect(withAddOn.driveMin).toBe(base.driveMin);
    expect(withAddOn.slackMin).toBe(base.slackMin);

    // And it is decisive: at a budget that exactly accommodates the day
    // without the add-on, the same day with the add-on no longer fits.
    const tight = resolveTimeBudget({ explicitMinutes: base.totalMin });
    expect(
      judgeAdmission(
        { stops: existing, budget: tight, rhythm: "balanced", addOnsMinutes: 0 },
        candidate,
      ).fits,
    ).toBe(true);
    expect(
      judgeAdmission(
        { stops: existing, budget: tight, rhythm: "balanced", addOnsMinutes: addOnMinutes },
        candidate,
      ).fits,
    ).toBe(false);
  });
});
