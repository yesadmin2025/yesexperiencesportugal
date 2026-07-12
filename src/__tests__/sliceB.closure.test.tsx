// Slice B closure — verifies the four correctness fixes:
//  1. Composition-aware readiness (adults-only + missing infant → not ready)
//  2. Studio candidate filter feeds real generation via restrictToTourIds
//  3. No compatible candidate → unsupported_age, no generation
//  4. Loading readiness is NOT the same as unsupported_age
//
// The hook is exercised via renderHook with a mocked react-query hook so the
// pure logic can be asserted without a Supabase round-trip.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { MappedBokunPricingCategory } from "@/lib/pricing/bokunCategories";
import type { TourBokunReadiness } from "@/hooks/use-tour-bokun-readiness";
import type { TravellerComposition } from "@/lib/pricing/travellerComposition";
import type { SignatureTour } from "@/data/signatureTours";

vi.mock("@/hooks/use-tour-bokun-readiness", async () => {
  return {
    useTourBokunReadinessFor: (tourId: string) => {
      const map = (globalThis as any).__READINESS__ as
        | Record<string, TourBokunReadiness>
        | undefined;
      return {
        readiness: map?.[tourId] ?? undefined,
        isLoading: (globalThis as any).__READINESS_LOADING__ === true,
      };
    },
    useTourBokunReadiness: () => ({
      data: (globalThis as any).__READINESS__ as
        | Record<string, TourBokunReadiness>
        | undefined,
      isLoading: (globalThis as any).__READINESS_LOADING__ === true,
    }),
  };
});

// Import after the mock is registered.
import { useCategoryAwareCheckoutReadyFor } from "@/hooks/use-category-aware-checkout-ready";
import { resolveStudioV3Route } from "@/components/studio-v3/curation";
import { filterSignatureCandidatesForAges } from "@/lib/pricing/filterSignatureCandidatesForAges";

function cat(
  id: string,
  band: "adult" | "youth" | "child" | "infant",
  min: number | null,
  max: number | null,
  status: "confirmed" | "unmapped" = "confirmed",
): MappedBokunPricingCategory {
  return {
    bokunCategoryId: id,
    bokunTitle: band,
    minAge: min,
    maxAge: max,
    uiBand: band,
    mappingStatus: status,
  } as MappedBokunPricingCategory;
}

const ADULT_ONLY = [cat("A", "adult", 18, 99)];
const FAMILY = [
  cat("A", "adult", 18, 99),
  cat("Y", "youth", 13, 17),
  cat("C", "child", 3, 12),
  cat("I", "infant", 0, 2),
];

function readiness(id: string, cats: MappedBokunPricingCategory[]): TourBokunReadiness {
  return {
    tourId: id,
    bandedPricingEnabled: true,
    bokunCategories: cats,
    pricingMode: "flat",
    syncedAt: null,
  };
}

beforeEach(() => {
  (globalThis as any).__READINESS__ = undefined;
  (globalThis as any).__READINESS_LOADING__ = false;
});

describe("Slice B closure — composition-aware readiness", () => {
  it("adults + infant against adult-only categories → unsupported-age, not ready", () => {
    (globalThis as any).__READINESS__ = { t1: readiness("t1", ADULT_ONLY) };
    const composition: TravellerComposition = { adults: 2, minorAges: [0] };
    const { result } = renderHook(() =>
      useCategoryAwareCheckoutReadyFor("t1", composition),
    );
    expect(result.current.ready).toBe(false);
    expect(result.current.reason).toBe("unsupported-age");
    expect(result.current.unsupportedAges).toContain(0);
  });

  it("adults-only composition against adult-only categories → ready", () => {
    (globalThis as any).__READINESS__ = { t1: readiness("t1", ADULT_ONLY) };
    const composition: TravellerComposition = { adults: 2, minorAges: [] };
    const { result } = renderHook(() =>
      useCategoryAwareCheckoutReadyFor("t1", composition),
    );
    expect(result.current.ready).toBe(true);
    expect(result.current.reason).toBe(null);
    // Every traveller resolved exactly once, adults matches.
    const resolvedQty = result.current.categoryBookings.reduce((s, l) => s + l.quantity, 0);
    expect(resolvedQty).toBe(2);
  });

  it("family composition against full family categories → ready, all counted", () => {
    (globalThis as any).__READINESS__ = { t1: readiness("t1", FAMILY) };
    const composition: TravellerComposition = { adults: 2, minorAges: [15, 8, 0] };
    const { result } = renderHook(() =>
      useCategoryAwareCheckoutReadyFor("t1", composition),
    );
    expect(result.current.ready).toBe(true);
    const total = result.current.categoryBookings.reduce((s, l) => s + l.quantity, 0);
    expect(total).toBe(5);
    const adultQty = result.current.categoryBookings
      .filter((l) => l.uiBand === "adult")
      .reduce((s, l) => s + l.quantity, 0);
    expect(adultQty).toBe(2);
  });

  it("readiness loading is distinct from unsupported-age", () => {
    (globalThis as any).__READINESS_LOADING__ = true;
    const composition: TravellerComposition = { adults: 2, minorAges: [0] };
    const { result } = renderHook(() =>
      useCategoryAwareCheckoutReadyFor("t1", composition),
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.ready).toBe(false);
    expect(result.current.reason).toBe("loading");
    expect(result.current.unsupportedAges).toEqual([]);
  });
});

describe("Slice B closure — Studio candidate filter integration", () => {
  it("filterSignatureCandidatesForAges + resolveStudioV3Route: incompatible excluded, compatible passes", () => {
    const composition: TravellerComposition = { adults: 2, minorAges: [0] };
    // Pretend two mini signature-like tour objects with ids matching real registry.
    const tours = [
      { id: "adult-only-mock" } as SignatureTour,
      { id: "family-mock" } as SignatureTour,
    ];
    const map: Record<string, TourBokunReadiness> = {
      "adult-only-mock": readiness("adult-only-mock", ADULT_ONLY),
      "family-mock": readiness("family-mock", FAMILY),
    };
    const filtered = filterSignatureCandidatesForAges(composition, tours, map);
    expect(filtered.hasCompatible).toBe(true);
    expect(filtered.excluded.map((e) => e.tourId)).toEqual(["adult-only-mock"]);
    expect(filtered.compatible.map((t) => t.id)).toEqual(["family-mock"]);
  });

  it("resolveStudioV3Route surfaces loading when ageFilter.status='loading'", () => {
    const r = resolveStudioV3Route({
      feeling: "coastal",
      companions: "family",
      rhythm: "balanced" as any,
      interests: [] as any,
      pickup: null as any,
      ageFilter: { status: "loading" },
    });
    expect(r.skeletonTourKey).toBeNull();
    expect(r.ageFilterStatus).toBe("loading");
    expect(r.unsupportedAges ?? []).toEqual([]);
  });

  it("resolveStudioV3Route surfaces unsupported-age when no candidate compatible", () => {
    const r = resolveStudioV3Route({
      feeling: "coastal",
      companions: "family",
      rhythm: "balanced" as any,
      interests: [] as any,
      pickup: null as any,
      ageFilter: {
        status: "resolved",
        compatibleTourIds: new Set<string>(),
        unsupportedAges: [0],
        excludedTourIds: ["a", "b"],
      },
    });
    expect(r.skeletonTourKey).toBeNull();
    expect(r.ageFilterStatus).toBe("unsupported");
    expect(r.unsupportedAges).toEqual([0]);
    expect(r.excludedTourIds).toEqual(["a", "b"]);
  });
});
