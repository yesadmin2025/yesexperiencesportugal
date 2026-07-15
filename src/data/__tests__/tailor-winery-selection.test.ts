/**
 * Tailor winery selection — verification scenarios from the brief.
 *
 * These tests exercise the shared `evaluateDay` engine that the Tailor
 * route uses to decide whether adding a winery is feasible. UI-level
 * toggles are covered by component tests; here we lock the ENGINE:
 *
 *   1. Two wineries plus market → feasible.
 *   2. Three wineries after removing a viewpoint → feasible.
 *   3. Four wineries after removing market and another optional → feasible.
 *   4. Five wineries rejected (over palate cap).
 *   5. Fourth winery surfaces the "safe maximum" warning at exactly 4.
 *   6. Wineries without lunch surface the "add lunch" advisory.
 *   7. Blueprint schema exposes `pickMin/pickMax` (not `pickCount`) so
 *      the UI can allow duration-driven selection up to four.
 */
import { describe, expect, it } from "vitest";
import { evaluateDay, type FeasibilityStop } from "@/lib/feasibility";
import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";

const winery = (id: string): FeasibilityStop => ({
  id,
  label: id,
  category: "winery",
  dwellMinutesOverride: 75,
  drivingFromPrevMinutes: 20,
});
const market = (): FeasibilityStop => ({
  id: "livramento",
  label: "Mercado do Livramento",
  category: "market",
  dwellMinutesOverride: 30,
  drivingFromPrevMinutes: 15,
});
const lunch = (): FeasibilityStop => ({
  id: "lunch-azeitao",
  label: "Lunch",
  category: "lunch",
  dwellMinutesOverride: 75,
  drivingFromPrevMinutes: 10,
});
const viewpoint = (): FeasibilityStop => ({
  id: "cristo-rei",
  label: "Cristo Rei",
  category: "viewpoint",
  dwellMinutesOverride: 30,
  drivingFromPrevMinutes: 15,
});

describe("Tailor winery selection — evaluateDay", () => {
  it("1 · Two wineries + market + lunch is feasible", () => {
    const r = evaluateDay({ stops: [market(), winery("a"), lunch(), winery("b")] });
    expect(r.feasible).toBe(true);
  });

  it("2 · Three wineries after removing a viewpoint is feasible", () => {
    const r = evaluateDay({
      stops: [market(), winery("a"), lunch(), winery("b"), winery("c")],
    });
    expect(r.feasible).toBe(true);
  });

  it("3 · Four wineries after removing market and another optional is feasible", () => {
    const r = evaluateDay({
      stops: [winery("a"), winery("b"), lunch(), winery("c"), winery("d")],
    });
    expect(r.feasible).toBe(true);
  });

  it("4 · Five wineries is rejected as over the palate cap", () => {
    const r = evaluateDay({
      stops: [winery("a"), winery("b"), lunch(), winery("c"), winery("d"), winery("e")],
    });
    expect(r.feasible).toBe(false);
    expect(r.warnings.some((w) => /Four wineries is the safe maximum/i.test(w))).toBe(true);
  });

  it("5 · Exactly four wineries surfaces the palate warning without blocking", () => {
    const r = evaluateDay({
      stops: [winery("a"), winery("b"), lunch(), winery("c"), winery("d")],
    });
    expect(r.feasible).toBe(true);
    expect(r.warnings.some((w) => /Four wineries is a full wine day/i.test(w))).toBe(true);
  });

  it("6 · Two wineries without lunch triggers the lunch advisory", () => {
    const r = evaluateDay({ stops: [market(), winery("a"), winery("b"), viewpoint()] });
    expect(r.warnings.some((w) => /Add lunch between the wineries/i.test(w))).toBe(true);
  });
});

describe("Tailor blueprints — pickMin/pickMax schema", () => {
  it("every wine-forward blueprint exposes pickMin ≤ pickMax and pickMax ≤ 4", () => {
    for (const bp of Object.values(TAILOR_BLUEPRINTS)) {
      const ch = bp.choice;
      if (!ch) continue;
      const isWineChoice = ch.options.every((o) => o.category === "winery");
      expect(ch.pickMin, `${bp.tourId}: pickMin`).toBeGreaterThan(0);
      expect(ch.pickMin, `${bp.tourId}: pickMin ≤ pickMax`).toBeLessThanOrEqual(ch.pickMax);
      if (isWineChoice) {
        expect(ch.pickMax, `${bp.tourId}: winery pickMax capped at 4`).toBeLessThanOrEqual(4);
      }
    }
  });
});
