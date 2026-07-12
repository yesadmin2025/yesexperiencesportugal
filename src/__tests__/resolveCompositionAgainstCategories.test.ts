// Slice B — strict category resolution + Studio candidate fallback.

import { describe, expect, it } from "vitest";
import type { MappedBokunPricingCategory } from "@/lib/pricing/bokunCategories";
import {
  filterStudioCandidatesByAges,
  resolveCompositionAgainstCategories,
  hasMinors,
} from "@/lib/pricing/travellerComposition";

const cat = (
  id: string,
  band: MappedBokunPricingCategory["uiBand"],
  minAge: number | undefined,
  maxAge: number | undefined,
  status: MappedBokunPricingCategory["mappingStatus"] = "confirmed",
): MappedBokunPricingCategory => ({
  bokunCategoryId: id,
  bokunTitle: `${band} ${minAge ?? "-"}-${maxAge ?? "-"}`,
  minAge,
  maxAge,
  uiBand: band,
  countsTowardCapacity: true,
  normallyFree: band === "infant",
  mappingStatus: status,
});

describe("resolveCompositionAgainstCategories", () => {
  it("mixed family: 2 adults + [15,8,0] resolves to A/Y/C/I with total 5", () => {
    const cats = [
      cat("A", "adult", 18, 99),
      cat("Y", "youth", 13, 17),
      cat("C", "child", 3, 12),
      cat("I", "infant", 0, 2),
    ];
    const r = resolveCompositionAgainstCategories(
      { adults: 2, minorAges: [15, 8, 0] },
      cats,
    );
    expect(r.unsupportedAges).toEqual([]);
    expect(r.resolvedGuestMix).toEqual({
      adults: 2, youths: 1, children: 1, infants: 1, totalParticipants: 5,
    });
    const byId = Object.fromEntries(r.categoryBookings.map((b) => [b.bokunCategoryId, b.quantity]));
    expect(byId).toEqual({ A: 2, Y: 1, C: 1, I: 1 });
  });

  it("no infant category: age 0 → unsupported_age, no Adult fallback, no bookings for infant", () => {
    const cats = [cat("A", "adult", 18, 99), cat("C", "child", 3, 17)];
    const r = resolveCompositionAgainstCategories(
      { adults: 2, minorAges: [0] },
      cats,
    );
    expect(r.unsupportedAges).toContain(0);
    expect(r.categoryBookings.find((b) => b.bokunCategoryId === "A")?.quantity).toBe(2);
    expect(r.categoryBookings.some((b) => b.bokunCategoryId === "C" && b.quantity > 0 && b.label.startsWith("child") && b.minAge === 3)).toBe(false);
  });

  it("ambiguous overlapping ranges block resolution with unsupported_age", () => {
    const cats = [
      cat("A", "adult", 18, 99),
      cat("C1", "child", 3, 12),
      cat("C2", "child", 8, 15), // overlaps age 8
    ];
    const r = resolveCompositionAgainstCategories(
      { adults: 1, minorAges: [8] },
      cats,
    );
    expect(r.unsupportedAges).toContain(8);
  });

  it("ignores non-confirmed categories entirely", () => {
    const cats = [
      cat("A", "adult", 18, 99),
      cat("Csug", "child", 3, 12, "suggested"), // must NOT resolve age 8
    ];
    const r = resolveCompositionAgainstCategories(
      { adults: 1, minorAges: [8] },
      cats,
    );
    expect(r.unsupportedAges).toContain(8);
  });
});

describe("filterStudioCandidatesByAges", () => {
  const A = cat("A", "adult", 18, 99);
  const candA = { key: "A", categories: [A, cat("C", "child", 3, 17)] };
  const candB = { key: "B", categories: [A, cat("C", "child", 3, 17), cat("I", "infant", 0, 2)] };

  it("excludes candidate that cannot support age 0, keeps compatible one", () => {
    const r = filterStudioCandidatesByAges(
      { adults: 2, minorAges: [0] },
      [candA, candB],
    );
    expect(r.compatible.map((c) => c.key)).toEqual(["B"]);
    expect(r.excluded[0]).toMatchObject({ key: "A", unsupportedAges: [0] });
  });

  it("returns empty compatible list when no candidate supports every age", () => {
    const r = filterStudioCandidatesByAges(
      { adults: 1, minorAges: [0] },
      [candA],
    );
    expect(r.compatible).toEqual([]);
  });
});

describe("hasMinors", () => {
  it("true when minorAges non-empty", () => {
    expect(hasMinors({ adults: 2, minorAges: [10] })).toBe(true);
    expect(hasMinors({ adults: 2, minorAges: [] })).toBe(false);
  });
});
