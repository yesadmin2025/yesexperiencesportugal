// Contract-parity test — runs the shared fixtures against the browser
// pricing module. A Deno equivalent lives at
// `supabase/functions/_shared/ageBandPricing_parity_test.ts` and imports
// its own fixture mirror; the two must produce byte-equivalent JSON for
// every fixture.

import { describe, it, expect } from "vitest";
import {
  resolveBandedPrice,
  normaliseBandedTiers,
  supportedBands,
} from "@/lib/pricing/ageBandPricing";
import { FIXTURES, FLAT_ADULT_TIERS } from "@/lib/pricing/__fixtures__/priceFixtures";

describe("ageBandPricing browser parity", () => {
  for (const fx of FIXTURES) {
    it(fx.name, () => {
      const got = resolveBandedPrice(fx.tiers, fx.mix);
      expect(JSON.stringify(got)).toBe(JSON.stringify(fx.expected));
    });
  }

  it("normaliseBandedTiers accepts the legacy flat shape", () => {
    const normalised = normaliseBandedTiers(FLAT_ADULT_TIERS);
    expect(normalised).not.toBeNull();
    expect(normalised!.adult["1"]).toBe(279);
    expect(normalised!.adult["4"]).toBe(189);
  });

  it("supportedBands reports declared bands", () => {
    const t = { adult: { 1: 100 }, youth: { 1: 80 }, infant: 0 };
    expect(supportedBands(t as never)).toEqual(["adult", "youth", "infant"]);
  });

  it("rejects garbage input", () => {
    expect(normaliseBandedTiers(null)).toBeNull();
    expect(normaliseBandedTiers(42)).toBeNull();
    expect(normaliseBandedTiers([1, 2, 3])).toBeNull();
  });
});
