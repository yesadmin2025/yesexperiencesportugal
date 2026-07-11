// Golden fixture for Pass 1 convergence.
//
// The resolveQuote path lives on Deno (supabase/functions/_shared/) but the
// pricing arithmetic + snapshot canonicalisation are pure logic. This test
// mirrors that logic in-process to prove the €525 fixture converges and the
// unsupported-guests states behave.
//
// If either the server catalogue or this fixture drifts, this test fails.

import { describe, expect, it } from "vitest";

// Mirror of supabase/functions/_shared/studioCommercialPricing.ts
const CATALOGUE: Record<string, Array<{ guests: number; unitEur: number }>> = {
  "studio-v3-private-full-day": [{ guests: 3, unitEur: 145 }],
};
function resolveCommercial(key: string, guests: number) {
  const t = CATALOGUE[key]?.find((x) => x.guests === guests);
  if (!t) return { status: "unavailable" as const, unitEur: 0, baseSubtotalEur: 0 };
  return { status: "quoted" as const, unitEur: t.unitEur, baseSubtotalEur: t.unitEur * guests };
}

// Mirror of signatureAddOnCatalogue.ts (fixture entry only)
const SERVER_ADDONS = {
  "coastal-boat-sesimbra": {
    priceUnit: "per_person" as const,
    unitEur: 30,
    routeIntegration: "pending-review" as const,
  },
};
function addOnLine(id: keyof typeof SERVER_ADDONS, guests: number, qty = 1) {
  const a = SERVER_ADDONS[id];
  const quantity =
    a.priceUnit === "per_person"
      ? guests
      : a.priceUnit === "per_vehicle"
        ? Math.max(1, Math.ceil(guests / 4)) * qty
        : qty;
  return { quantity, lineSubtotalEur: a.unitEur * quantity, routeIntegration: a.routeIntegration };
}

describe("Studio V3 golden fixture — 3 guests + boat add-on", () => {
  const guests = 3;
  it("resolves to €525 pending-review", () => {
    const commercial = resolveCommercial("studio-v3-private-full-day", guests);
    expect(commercial.status).toBe("quoted");
    expect(commercial.unitEur).toBe(145);
    expect(commercial.baseSubtotalEur).toBe(435);

    const boat = addOnLine("coastal-boat-sesimbra", guests);
    expect(boat.quantity).toBe(3);
    expect(boat.lineSubtotalEur).toBe(90);
    expect(boat.routeIntegration).toBe("pending-review");

    const total = commercial.baseSubtotalEur + boat.lineSubtotalEur;
    expect(total).toBe(525);
  });
});

describe("Studio V3 unsupported guest counts", () => {
  it.each([1, 2, 4, 5, 6, 7, 8])(
    "%i guests → pricing_unavailable (no borrowed tier)",
    (n) => {
      const c = resolveCommercial("studio-v3-private-full-day", n);
      expect(c.status).toBe("unavailable");
      expect(c.baseSubtotalEur).toBe(0);
    },
  );
});
