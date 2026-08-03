import { describe, expect, it } from "vitest";

import { MERCADO_DO_LIVRAMENTO_STOP_ID } from "../dateGuards";
import {
  deriveLivingAtlasMomentOperationalStatus,
  deriveLivingAtlasPaceSummary,
  livingAtlasOperationalConditions,
} from "../livingAtlasOperationalConfidence";

describe("Living Atlas operational confidence", () => {
  it("marks a boat as verified while exposing supplier and sea dependencies", () => {
    const conditions = livingAtlasOperationalConditions("boat");

    expect(conditions.map((condition) => condition.id)).toEqual([
      "verified-structure",
      "supplier-confirmation",
      "sea-conditions",
    ]);
    expect(conditions.map((condition) => condition.status)).toEqual([
      "confirmed",
      "pending",
      "pending",
    ]);
    expect(deriveLivingAtlasMomentOperationalStatus("boat")).toBe("pending");
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
    expect(
      livingAtlasOperationalConditions("nature").find(
        (condition) => condition.id === "weather-access",
      )?.status,
    ).toBe("pending");
  });

  it("marks Mercado do Livramento unavailable on Monday and pending on another day", () => {
    const monday = livingAtlasOperationalConditions("market", {
      selectedDate: "2026-08-03",
      stopId: MERCADO_DO_LIVRAMENTO_STOP_ID,
    });
    const tuesday = livingAtlasOperationalConditions("market", {
      selectedDate: "2026-08-04",
      stopId: MERCADO_DO_LIVRAMENTO_STOP_ID,
    });

    expect(monday.find((condition) => condition.id === "opening-hours")).toMatchObject({
      status: "unavailable",
    });
    expect(
      deriveLivingAtlasMomentOperationalStatus("market", {
        selectedDate: "2026-08-03",
        stopId: MERCADO_DO_LIVRAMENTO_STOP_ID,
      }),
    ).toBe("unavailable");
    expect(tuesday.find((condition) => condition.id === "opening-hours")).toMatchObject({
      status: "pending",
    });
  });

  it("requires explicit evidence before a real-world dependency becomes confirmed", () => {
    const pending = livingAtlasOperationalConditions("winery");
    const confirmed = livingAtlasOperationalConditions("winery", {
      evidence: { "supplier-confirmation": "confirmed" },
    });

    expect(pending.find((condition) => condition.id === "supplier-confirmation")?.status).toBe(
      "pending",
    );
    expect(confirmed.find((condition) => condition.id === "supplier-confirmation")?.status).toBe(
      "confirmed",
    );
    expect(
      deriveLivingAtlasMomentOperationalStatus("winery", {
        evidence: { "supplier-confirmation": "confirmed" },
      }),
    ).toBe("confirmed");
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
