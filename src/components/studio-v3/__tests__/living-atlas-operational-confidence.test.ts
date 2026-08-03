import { describe, expect, it } from "vitest";

import {
  deriveLivingAtlasPaceSummary,
  livingAtlasOperationalConditions,
} from "../livingAtlasOperationalConfidence";

describe("Living Atlas operational confidence", () => {
  it("marks a boat as verified while exposing supplier and sea dependencies", () => {
    expect(livingAtlasOperationalConditions("boat").map((condition) => condition.id)).toEqual([
      "verified-structure",
      "supplier-confirmation",
      "sea-conditions",
    ]);
  });

  it("maps opening schedules and outdoor access without inventing availability", () => {
    expect(livingAtlasOperationalConditions("market").map((condition) => condition.id)).toEqual([
      "verified-structure",
      "opening-hours",
    ]);
    expect(livingAtlasOperationalConditions("nature").map((condition) => condition.id)).toEqual([
      "verified-structure",
      "weather-access",
    ]);
  });

  it("requires supplier confirmation for hosted experiences", () => {
    for (const type of ["winery", "workshop", "studio", "table"] as const) {
      expect(livingAtlasOperationalConditions(type).map((condition) => condition.id)).toContain(
        "supplier-confirmation",
      );
    }
  });

  it("reports a spacious visible plan when stops and transfers leave real headroom", () => {
    const summary = deriveLivingAtlasPaceSummary({
      density: "balanced",
      stopMinutes: 240,
      transferMinutes: 60,
      routeStatus: "ready",
    });

    expect(summary).toMatchObject({
      status: "open",
      label: "Room to breathe",
      visiblePlanningMinutes: 300,
      stopBudgetMinutes: 390,
    });
  });

  it("reports a full day near the selected rhythm tolerance", () => {
    const summary = deriveLivingAtlasPaceSummary({
      density: "balanced",
      stopMinutes: 405,
      transferMinutes: 185,
      routeStatus: "ready",
    });

    expect(summary.status).toBe("full");
    expect(summary.stopLoadRatio).toBeGreaterThan(1);
    expect(summary.transferLoadRatio).toBeGreaterThan(1);
  });

  it("never disguises an over-budget or unlocated route as a comfortable day", () => {
    expect(
      deriveLivingAtlasPaceSummary({
        density: "rich",
        stopMinutes: 300,
        transferMinutes: 200,
        routeStatus: "over-budget",
      }).status,
    ).toBe("review");

    expect(
      deriveLivingAtlasPaceSummary({
        density: "slow",
        stopMinutes: 180,
        transferMinutes: 0,
        routeStatus: "unavailable",
      }),
    ).toMatchObject({ status: "partial", transferLoadRatio: null });
  });
});
