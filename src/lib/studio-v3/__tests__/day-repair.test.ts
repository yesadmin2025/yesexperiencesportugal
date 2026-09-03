import { describe, expect, it } from "vitest";

import { describeDayRepair, repairDayToBookable } from "@/lib/studio-v3/dayRepair";

type P = { label: string; durationMinutes: number };

const p = (label: string, durationMinutes: number): P => ({ label, durationMinutes });

const budget = (max: number) => (points: readonly P[]) =>
  points.reduce((sum, s) => sum + s.durationMinutes, 0) <= max;

describe("repairDayToBookable", () => {
  it("returns an already-bookable day untouched", () => {
    const points = [p("A", 60), p("B", 60), p("C", 60)];
    const result = repairDayToBookable({ points, minStops: 3, certify: budget(300) });
    expect(result.certified).toBe(true);
    expect(result.repairs).toHaveLength(0);
    expect(result.points).toEqual(points);
  });

  it("drops the least-contributing removable moment until the day fits", () => {
    const points = [p("Anchor", 180), p("Small", 30), p("Medium", 90)];
    const result = repairDayToBookable({
      points,
      minStops: 2,
      certify: budget(270),
      isRemovable: (s) => s.label !== "Anchor",
    });
    expect(result.certified).toBe(true);
    expect(result.points.map((s) => s.label)).toEqual(["Anchor", "Medium"]);
    expect(result.repairs).toEqual([
      { kind: "removed", label: "Small", cause: "over-budget" },
    ]);
  });

  it("substitutes a moment that is closed on the chosen date", () => {
    const points = [p("Market", 60), p("Winery", 90), p("Viewpoint", 30)];
    const result = repairDayToBookable({
      points,
      minStops: 3,
      certify: budget(300),
      isBlocked: (s) => s.label === "Market",
      substitute: () => p("Coastal walk", 60),
    });
    expect(result.certified).toBe(true);
    expect(result.points.map((s) => s.label)).toEqual(["Coastal walk", "Winery", "Viewpoint"]);
    expect(result.repairs[0]).toMatchObject({
      kind: "substituted",
      replacementLabel: "Coastal walk",
      cause: "blocked",
    });
  });

  it("never crosses the minimum-moment floor and fails closed instead", () => {
    const points = [p("A", 200), p("B", 200), p("C", 200)];
    const result = repairDayToBookable({ points, minStops: 3, certify: budget(300) });
    expect(result.certified).toBe(false);
    expect(result.points).toEqual(points);
    expect(result.repairs).toHaveLength(0);
  });

  it("fails closed rather than showing a half-repaired day", () => {
    const points = [p("A", 100), p("B", 100), p("C", 100), p("D", 100)];
    const result = repairDayToBookable({
      points,
      minStops: 3,
      certify: () => false,
      isRemovable: () => true,
    });
    expect(result.certified).toBe(false);
    expect(result.points).toEqual(points);
  });

  it("does not repair an empty day", () => {
    const result = repairDayToBookable<P>({ points: [], minStops: 3, certify: () => true });
    expect(result.certified).toBe(false);
  });
});

describe("describeDayRepair", () => {
  it("is silent when nothing changed", () => {
    expect(describeDayRepair([])).toBeNull();
  });

  it("names the replacement through the display-label map", () => {
    const line = describeDayRepair(
      [{ kind: "substituted", label: "Quinta X", replacementLabel: "Quinta Y", cause: "blocked" }],
      () => "a family winery",
    );
    expect(line).toBe("We shaped the day around a family winery so it stays comfortable.");
  });

  it("summarises multiple repairs in one calm line", () => {
    const line = describeDayRepair([
      { kind: "removed", label: "A", cause: "over-budget" },
      { kind: "removed", label: "B", cause: "over-budget" },
    ]);
    expect(line).toBe("We reshaped a couple of moments so the day stays comfortable.");
  });
});
