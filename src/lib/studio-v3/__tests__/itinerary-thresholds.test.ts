import { describe, it, expect } from "vitest";
import {
  ADD_ON_CATALOG,
  addOnEurFor,
  addOnEurFromBase,
  type SignatureAddOn,
} from "@/data/signatureAddOns";
import {
  MAX_DRIVING_MIN_ABS_GLOBAL,
  MAX_DRIVING_PCT_OF_DAY,
  PREFERRED_DRIVING_PCT,
  ADDON_PREFERRED_DELTA_MIN,
  ADDON_MAX_DELTA_MIN,
  resolveThresholds,
} from "@/lib/studio-v3/itinerary-thresholds";

describe("itinerary thresholds", () => {
  it("driving caps are internally consistent", () => {
    expect(PREFERRED_DRIVING_PCT).toBeLessThan(MAX_DRIVING_PCT_OF_DAY);
    expect(MAX_DRIVING_PCT_OF_DAY).toBeLessThanOrEqual(0.5);
    expect(MAX_DRIVING_MIN_ABS_GLOBAL).toBeGreaterThanOrEqual(150);
    expect(ADDON_PREFERRED_DELTA_MIN).toBeLessThan(ADDON_MAX_DELTA_MIN);
  });

  it("resolveThresholds returns region-specific caps for every region", () => {
    for (const region of ["arrabida", "lisbon-coast", "alentejo", "centro"] as const) {
      const t = resolveThresholds(region);
      expect(t.maxDrivingMinAbs).toBeGreaterThan(0);
      expect(t.maxDrivingMinAbs).toBeLessThanOrEqual(MAX_DRIVING_MIN_ABS_GLOBAL);
      expect(t.maxDayMin).toBeGreaterThanOrEqual(6 * 60);
      expect(t.maxDayKm).toBeGreaterThan(0);
      expect(t.minStops).toBeLessThanOrEqual(t.maxStops);
    }
  });
});

describe("addOnEurFor — unit-aware pricing", () => {
  const base = 300;
  const addOn = (
    unit: SignatureAddOn["pricingUnit"],
  ): Pick<SignatureAddOn, "pricePctOfBase" | "pricingUnit"> => ({
    pricePctOfBase: 0.2,
    pricingUnit: unit,
  });

  it("per_person multiplies by guest count", () => {
    const r = addOnEurFor({ addOn: addOn("per_person"), baseEur: base, guests: 3 });
    expect(r.perUnit).toBe(addOnEurFromBase(base, 0.2));
    expect(r.amount).toBe(r.perUnit * 3);
    expect(r.unit).toBe("per_person");
    expect(r.unitLabel).toBe("per guest");
  });

  it("per_group is flat regardless of guests", () => {
    const r1 = addOnEurFor({ addOn: addOn("per_group"), baseEur: base, guests: 1 });
    const r6 = addOnEurFor({ addOn: addOn("per_group"), baseEur: base, guests: 6 });
    expect(r1.amount).toBe(r6.amount);
    expect(r6.unit).toBe("per_group");
  });

  it("per_vehicle rounds up by vehicle capacity", () => {
    const r = addOnEurFor({
      addOn: addOn("per_vehicle"),
      baseEur: base,
      guests: 5,
      vehicleCapacity: 4,
    });
    // 5 guests / 4 seats = 2 vehicles
    expect(r.amount).toBe(r.perUnit * 2);
    expect(r.unit).toBe("per_vehicle");
  });

  it("fixed is flat, independent of party size", () => {
    const r = addOnEurFor({ addOn: addOn("fixed"), baseEur: base, guests: 8 });
    expect(r.amount).toBe(r.perUnit);
    expect(r.unit).toBe("fixed");
  });

  it("guest count is floored to a minimum of 1", () => {
    const r = addOnEurFor({ addOn: addOn("per_person"), baseEur: base, guests: 0 });
    expect(r.amount).toBe(r.perUnit);
  });
});

describe("add-on catalog — pricing contract", () => {
  const allAddOns = Object.values(ADD_ON_CATALOG).flat();

  it("every add-on declares a pricingUnit", () => {
    for (const a of allAddOns) {
      expect(a.pricingUnit, `add-on ${a.id} missing pricingUnit`).toBeDefined();
      expect(["per_person", "per_group", "per_vehicle", "fixed"]).toContain(a.pricingUnit);
    }
  });

  it("every add-on price is a positive fraction of base", () => {
    for (const a of allAddOns) {
      expect(a.pricePctOfBase).toBeGreaterThan(0);
      expect(a.pricePctOfBase).toBeLessThan(1);
    }
  });
});
