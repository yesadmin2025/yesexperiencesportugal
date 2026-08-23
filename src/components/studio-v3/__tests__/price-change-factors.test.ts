import { describe, expect, it } from "vitest";
import { AGE_BAND_PCT } from "@/data/signatureTourPricing";
import { minorBandRules, resolvePriceChangeFactors } from "../priceChangeFactors";

const TOUR = { id: "no-tiers-test-tour", priceFrom: 200 } as const;

describe("price change factors", () => {
  it("derives minor bands from the pricing truth module, never hardcoded", () => {
    const rules = minorBandRules();
    expect(rules.map((r) => r.band)).toEqual(["infant", "child", "youth"]);
    expect(rules.map((r) => r.pct)).toEqual([
      AGE_BAND_PCT.infant,
      AGE_BAND_PCT.child,
      AGE_BAND_PCT.youth,
    ]);
  });

  it("omits the additions factor when nothing is selected", () => {
    const factors = resolvePriceChangeFactors({ tour: TOUR, selectedAddOns: [] });
    expect(factors.some((f) => f.id === "additions")).toBe(false);
    for (const f of factors) {
      expect(f.text).not.toMatch(/any addition|may vary|prices can change/i);
    }
  });

  it("includes the additions factor with the real labels and unit", () => {
    const factors = resolvePriceChangeFactors({
      tour: TOUR,
      selectedAddOns: [{ label: "Private wine tasting", unit: "per_person" }],
    });
    const addition = factors.find((f) => f.id === "additions");
    expect(addition?.text).toContain("Private wine tasting");
    expect(addition?.text).toContain("per guest");
  });

  it("omits party size when the product has no real tier variation", () => {
    const factors = resolvePriceChangeFactors({ tour: TOUR, selectedAddOns: [] });
    expect(factors.some((f) => f.id === "party_size")).toBe(false);
  });

  it("returns no factors at all when there is no priced product", () => {
    expect(resolvePriceChangeFactors({ tour: null, selectedAddOns: [] })).toEqual([]);
  });

  it("only ever emits known factor ids", () => {
    const factors = resolvePriceChangeFactors({
      tour: TOUR,
      selectedAddOns: [{ label: "Boat hour", unit: "per_group" }],
    });
    for (const f of factors) {
      expect(["party_size", "traveller_ages", "additions"]).toContain(f.id);
    }
  });
});
