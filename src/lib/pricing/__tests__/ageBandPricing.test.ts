import { describe, it, expect } from "vitest";
import {
  normaliseBandedTiers,
  resolveBandedPrice,
  coerceGuestMix,
  tierAt,
  supportedBands,
  billableGuests,
} from "@/lib/pricing/ageBandPricing";

describe("normaliseBandedTiers", () => {
  it("wraps legacy flat shape under adult", () => {
    const out = normaliseBandedTiers({ 1: 279, 2: 215, 8: 159 });
    expect(out).toEqual({ adult: { 1: 279, 2: 215, 8: 159 } });
  });

  it("passes through banded shape", () => {
    const out = normaliseBandedTiers({
      adult: { 2: 200 },
      youth: { 2: 150 },
      child: { 2: 100 },
      infant: 0,
    });
    expect(out?.youth).toEqual({ 2: 150 });
    expect(out?.infant).toBe(0);
  });

  it("rejects garbage", () => {
    expect(normaliseBandedTiers(null)).toBeNull();
    expect(normaliseBandedTiers("nope")).toBeNull();
    expect(normaliseBandedTiers([1, 2, 3])).toBeNull();
  });

  it("strips invalid tier keys and non-positive values", () => {
    const out = normaliseBandedTiers({ 1: 279, 9: 999, 2: -5, foo: 100 });
    expect(out).toEqual({ adult: { 1: 279 } });
  });
});

describe("tierAt", () => {
  it("falls back to nearest lower tier", () => {
    expect(tierAt({ 2: 200, 5: 150 }, 3)).toBe(200);
    expect(tierAt({ 2: 200, 5: 150 }, 5)).toBe(150);
    expect(tierAt({ 2: 200, 5: 150 }, 8)).toBe(150);
  });
  it("falls forward if nothing below", () => {
    expect(tierAt({ 4: 180 }, 2)).toBe(180);
  });
  it("returns null when empty", () => {
    expect(tierAt({}, 3)).toBeNull();
  });
});

describe("coerceGuestMix", () => {
  it("maps legacy { guests: n } to adults-only", () => {
    expect(coerceGuestMix({ guests: 4 })).toEqual({
      adults: 4,
      youths: 0,
      children: 0,
      infants: 0,
    });
  });
  it("preserves an explicit mix", () => {
    expect(coerceGuestMix({ adults: 2, youths: 1, children: 1, infants: 1 })).toEqual({
      adults: 2,
      youths: 1,
      children: 1,
      infants: 1,
    });
  });
  it("clamps and rounds", () => {
    expect(coerceGuestMix({ adults: 99, youths: -3 })).toEqual({
      adults: 20,
      youths: 0,
      children: 0,
      infants: 0,
    });
  });
});

describe("resolveBandedPrice", () => {
  const banded = {
    adult: { 1: 279, 2: 215, 4: 189, 8: 159 },
    youth: { 2: 150, 4: 130 },
    child: { 2: 100, 4: 80 },
    infant: 0,
  };

  it("prices an adults-only group using the billableGuests bucket", () => {
    const b = resolveBandedPrice(banded, { adults: 2 });
    expect(b.billableGuests).toBe(2);
    expect(b.lines).toEqual([{ band: "adult", qty: 2, unitEur: 215, subtotalEur: 430 }]);
    expect(b.totalEur).toBe(430);
  });

  it("prices a mixed group at the same bucket for every band", () => {
    // 2 adults + 1 youth + 1 child = bucket 4 for every band
    const b = resolveBandedPrice(banded, { adults: 2, youths: 1, children: 1 });
    expect(b.billableGuests).toBe(4);
    expect(b.lines).toEqual([
      { band: "adult", qty: 2, unitEur: 189, subtotalEur: 378 },
      { band: "youth", qty: 1, unitEur: 130, subtotalEur: 130 },
      { band: "child", qty: 1, unitEur: 80, subtotalEur: 80 },
    ]);
    expect(b.totalEur).toBe(588);
  });

  it("records infants as a free line without changing the bucket", () => {
    const b = resolveBandedPrice(banded, { adults: 2, infants: 1 });
    expect(b.billableGuests).toBe(2);
    const infantLine = b.lines.find((l) => l.band === "infant");
    expect(infantLine).toEqual({ band: "infant", qty: 1, unitEur: 0, subtotalEur: 0 });
    expect(b.totalEur).toBe(430);
  });

  it("silently drops youth/child qty when the tour does not price the band", () => {
    const adultOnly = { adult: { 2: 215 } };
    const b = resolveBandedPrice(adultOnly, { adults: 2, youths: 3, children: 1 });
    // Bucket is 6 (billable), but adult tier only has "2" — falls back to 215.
    expect(b.lines).toEqual([{ band: "adult", qty: 2, unitEur: 215, subtotalEur: 430 }]);
    expect(b.totalEur).toBe(430);
  });

  it("legacy { guests: n } input still works via coerceGuestMix", () => {
    const b = resolveBandedPrice(banded, { guests: 4 });
    expect(b.totalEur).toBe(189 * 4);
  });
});

describe("supportedBands / billableGuests", () => {
  it("lists only bands present in the tier row", () => {
    expect(supportedBands({ adult: { 2: 200 } })).toEqual(["adult"]);
    expect(
      supportedBands({ adult: { 2: 200 }, youth: { 2: 150 }, infant: 0 }),
    ).toEqual(["adult", "youth", "infant"]);
  });
  it("excludes infants from billableGuests", () => {
    expect(billableGuests({ adults: 2, youths: 1, children: 1, infants: 3 })).toBe(4);
  });
});
