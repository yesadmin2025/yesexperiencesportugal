import { describe, it, expect } from "vitest";
import {
  ageBand,
  AGE_BAND_PCT,
  resolveJourneyPricing,
} from "@/data/signatureTourPricing";

const TOUR = { id: "test", priceFrom: 200 } as const;

describe("age bands (owner-approved 2026-07-14)", () => {
  it("classifies ages", () => {
    expect(ageBand(0)).toBe("infant");
    expect(ageBand(2)).toBe("infant");
    expect(ageBand(3)).toBe("child");
    expect(ageBand(10)).toBe("child");
    expect(ageBand(11)).toBe("youth");
    expect(ageBand(17)).toBe("youth");
    expect(ageBand(18)).toBe("adult");
    expect(ageBand(65)).toBe("adult");
  });

  it("locks band percentages", () => {
    expect(AGE_BAND_PCT.adult).toBe(1);
    expect(AGE_BAND_PCT.youth).toBe(0.75);
    expect(AGE_BAND_PCT.child).toBe(0.5);
    expect(AGE_BAND_PCT.infant).toBe(0);
  });
});

describe("resolveJourneyPricing", () => {
  it("prices 2 adults with no minors as full adult tier", () => {
    const j = resolveJourneyPricing(TOUR, 2, []);
    expect(j).not.toBeNull();
    expect(j!.headcount).toBe(2);
    expect(j!.lines).toHaveLength(2);
    expect(j!.lines.every((l) => l.kind === "adult" && l.unitEur === j!.perPaxAdultEur)).toBe(true);
    expect(j!.totalEur).toBe(j!.perPaxAdultEur * 2);
  });

  it("applies band % per minor, never falls back to adult price", () => {
    const j = resolveJourneyPricing(TOUR, 2, [1, 6, 14]);
    expect(j).not.toBeNull();
    const adult = j!.perPaxAdultEur;
    const lines = j!.lines;
    expect(lines).toHaveLength(5);
    // 2 adults + infant(0) + child(50%) + youth(75%)
    const kinds = lines.map((l) => l.band);
    expect(kinds).toEqual(["adult", "adult", "infant", "child", "youth"]);
    expect(lines[2].unitEur).toBe(0);
    expect(lines[3].unitEur).toBe(Math.round(adult * 0.5));
    expect(lines[4].unitEur).toBe(Math.round(adult * 0.75));
    expect(j!.totalEur).toBe(lines.reduce((s, l) => s + l.unitEur, 0));
  });

  it("tier lookup uses TOTAL headcount incl. infants (owner rule)", () => {
    const solo = resolveJourneyPricing(TOUR, 1, []);
    const withInfant = resolveJourneyPricing(TOUR, 1, [1]);
    expect(solo).not.toBeNull();
    expect(withInfant).not.toBeNull();
    // Both resolve against different tiers (1 vs 2) — no VIATOR override for
    // 'test' so both fall back to the same anchor. Adult unit stays equal.
    expect(withInfant!.perPaxAdultEur).toBe(solo!.perPaxAdultEur);
    // Infant is free even though it pushes tier lookup.
    expect(withInfant!.totalEur).toBe(withInfant!.perPaxAdultEur);
    expect(withInfant!.headcount).toBe(2);
  });

  it("rejects invalid inputs — no silent adult fallback for bad ages", () => {
    expect(resolveJourneyPricing(TOUR, 0, [])).toBeNull();
    expect(resolveJourneyPricing(TOUR, 2, [-1])).toBeNull();
    expect(resolveJourneyPricing(TOUR, 2, [999])).toBeNull();
    expect(resolveJourneyPricing(null, 2, [])).toBeNull();
  });
});
