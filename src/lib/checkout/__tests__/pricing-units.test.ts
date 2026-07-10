import { describe, expect, it } from "vitest";

import {
  ADD_ON_CATALOG,
  addOnEurFor,
  addOnEurFromBase,
  type SignatureAddOn,
} from "@/data/signatureAddOns";

// Plan §F — pricing-units.test.ts
// Contract:
//   - per_person  → line total = perUnit × guests
//   - per_group   → line total = perUnit × 1
//   - per_vehicle → line total = perUnit × ceil(guests / vehicleCapacity)
//   - fixed       → line total = perUnit × 1
// Final total (checkout invariant): sum of line items === Σ addOnEurFor(...).amount

const mkAddOn = (
  pricingUnit: SignatureAddOn["pricingUnit"],
  pct = 0.2,
): Pick<SignatureAddOn, "pricePctOfBase" | "pricingUnit"> => ({
  pricePctOfBase: pct,
  pricingUnit,
});

describe("pricing-units contract", () => {
  const baseEur = 400;

  it("per_person line total scales with guests", () => {
    const per = addOnEurFor({ addOn: mkAddOn("per_person"), baseEur, guests: 3 });
    expect(per.perUnit).toBe(addOnEurFromBase(baseEur, 0.2));
    expect(per.amount).toBe(per.perUnit * 3);
    expect(per.unit).toBe("per_person");
    expect(per.unitLabel).toBe("per guest");
  });

  it("per_group line total is flat regardless of guests", () => {
    const p1 = addOnEurFor({ addOn: mkAddOn("per_group"), baseEur, guests: 1 });
    const p8 = addOnEurFor({ addOn: mkAddOn("per_group"), baseEur, guests: 8 });
    expect(p1.amount).toBe(p1.perUnit);
    expect(p8.amount).toBe(p1.amount);
    expect(p8.unitLabel).toBe("per group");
  });

  it("per_vehicle line total scales by ceil(guests / vehicleCapacity)", () => {
    const v = addOnEurFor({
      addOn: mkAddOn("per_vehicle"),
      baseEur,
      guests: 9,
      vehicleCapacity: 4,
    });
    expect(v.amount).toBe(v.perUnit * Math.ceil(9 / 4));
    expect(v.unitLabel).toBe("per vehicle");
  });

  it("fixed line total is flat regardless of guests", () => {
    const f1 = addOnEurFor({ addOn: mkAddOn("fixed"), baseEur, guests: 1 });
    const f8 = addOnEurFor({ addOn: mkAddOn("fixed"), baseEur, guests: 8 });
    expect(f8.amount).toBe(f1.perUnit);
    expect(f8.unitLabel).toBe("flat");
  });

  it("checkout invariant: final total equals Σ line-item amounts", () => {
    // Simulated cart with mixed units.
    const cart: Array<Pick<SignatureAddOn, "pricePctOfBase" | "pricingUnit">> = [
      mkAddOn("per_person", 0.18),
      mkAddOn("per_group", 0.4),
      mkAddOn("per_vehicle", 0.25),
      mkAddOn("fixed", 0.1),
    ];
    const guests = 6;
    const lines = cart.map((a) =>
      addOnEurFor({ addOn: a, baseEur, guests, vehicleCapacity: 4 }),
    );
    const finalTotal = lines.reduce((sum, l) => sum + l.amount, 0);
    // Explicit re-derivation — must match line-item sum exactly.
    const explicit =
      lines[0].perUnit * guests +
      lines[1].perUnit +
      lines[2].perUnit * Math.ceil(guests / 4) +
      lines[3].perUnit;
    expect(finalTotal).toBe(explicit);
  });

  it("every catalog add-on carries a valid pricingUnit", () => {
    const validUnits = new Set(["per_person", "per_group", "per_vehicle", "fixed"]);
    for (const bucket of Object.values(ADD_ON_CATALOG)) {
      for (const addOn of bucket) {
        expect(validUnits.has(addOn.pricingUnit)).toBe(true);
        // Every add-on must produce a positive line-item for a 2-guest party.
        const line = addOnEurFor({ addOn, baseEur, guests: 2 });
        expect(line.amount).toBeGreaterThan(0);
        expect(line.unitLabel.length).toBeGreaterThan(0);
      }
    }
  });
});
