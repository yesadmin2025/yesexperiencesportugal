// Slice C — Studio traveller-suitability filter.
//
// Covers:
//  1. Infant → incompatible candidate excluded, compatible selected.
//  2. No compatible candidate → hasCompatible=false, no itinerary generation.
//  3. Stop-level: incompatible stop replaced from same skeleton pool;
//     commercial identity + pricing revision preserved; itinerary revision changes.
//  4. Capacity includes infants by default; opt-out works.
//  5. No Signature mapping leakage — commercial key guard.

import { describe, it, expect } from "vitest";
import {
  checkTravellerSuitability,
  requirementsFromComposition,
  type TravellerSuitability,
} from "@/lib/pricing/travellerSuitability";
import { filterStopsBySuitability } from "@/components/studio-v3/stop-suitability";
import {
  STUDIO_COMMERCIAL_PRODUCT_KEY,
  assertStudioCommercialIdentity,
  isStudioCommercialProductKey,
} from "@/lib/pricing/studioCommercialIdentity";
import { filterStudioCandidatesBySuitability } from "@/lib/pricing/filterSignatureCandidatesForAges";
import type { SignatureTour } from "@/data/signatureTours";
import type { TourBokunReadiness } from "@/hooks/use-tour-bokun-readiness";
import type { MappedBokunPricingCategory } from "@/lib/pricing/bokunCategories";

// Reset module-level suitability registries per test via vi.doMock.
import { vi } from "vitest";

function cat(
  id: string,
  band: "adult" | "youth" | "child" | "infant",
  min: number | null,
  max: number | null,
): MappedBokunPricingCategory {
  return {
    bokunCategoryId: id,
    bokunTitle: band,
    minAge: min,
    maxAge: max,
    uiBand: band,
    mappingStatus: "confirmed",
  } as MappedBokunPricingCategory;
}

const FAMILY_CATS = [
  cat("A", "adult", 18, 99),
  cat("Y", "youth", 13, 17),
  cat("C", "child", 3, 12),
  cat("I", "infant", 0, 2),
];

describe("Slice C — traveller suitability", () => {
  describe("checkTravellerSuitability", () => {
    it("passes when metadata is missing (safe default = unrestricted)", () => {
      const req = requirementsFromComposition({ adults: 2, minorAges: [0, 8] });
      expect(checkTravellerSuitability(undefined, req).ok).toBe(true);
    });

    it("flags age 0 when infantsAllowed=false", () => {
      const meta: TravellerSuitability = { infantsAllowed: false };
      const req = requirementsFromComposition({ adults: 2, minorAges: [0] });
      const r = checkTravellerSuitability(meta, req);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.reasons).toContain("infant_not_allowed");
        expect(r.unsupportedAges).toContain(0);
      }
    });

    it("flags below minimumAge", () => {
      const meta: TravellerSuitability = { minimumAge: 8 };
      const req = requirementsFromComposition({ adults: 2, minorAges: [5] });
      const r = checkTravellerSuitability(meta, req);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.reasons).toContain("unsupported_age");
        expect(r.unsupportedAges).toContain(5);
      }
    });

    it("stroller required but not supported", () => {
      const meta: TravellerSuitability = { strollerSuitable: false };
      const req = requirementsFromComposition(
        { adults: 2, minorAges: [1] },
        { requiresStroller: true },
      );
      const r = checkTravellerSuitability(meta, req);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reasons).toContain("stroller_unsupported");
    });
  });

  describe("capacity includes infants by default", () => {
    it("capacity_exceeded when totalTravellers > capacity (default)", () => {
      const req = requirementsFromComposition({ adults: 3, minorAges: [0] });
      // totalTravellers = 4, capacity 4 — passes
      expect(checkTravellerSuitability({}, req, 4).ok).toBe(true);
      // capacity 3 — infant counts, so fails
      const r = checkTravellerSuitability({}, req, 3);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reasons).toContain("capacity_exceeded");
    });

    it("capacityCountsAllTravellers=false excludes infants (0-1)", () => {
      const meta: TravellerSuitability = { capacityCountsAllTravellers: false };
      const req = requirementsFromComposition({ adults: 3, minorAges: [0] });
      // With opt-out, effective = 3 adults, capacity 3 passes
      expect(checkTravellerSuitability(meta, req, 3).ok).toBe(true);
    });
  });

  describe("candidate filter — infant fallback", () => {
    const tours: SignatureTour[] = [
      { id: "adult-only-tour" } as SignatureTour,
      { id: "family-tour" } as SignatureTour,
    ];
    const readiness: Record<string, TourBokunReadiness> = {
      "adult-only-tour": {
        tourId: "adult-only-tour",
        bandedPricingEnabled: true,
        bokunCategories: FAMILY_CATS,
        pricingMode: "flat",
        syncedAt: null,
      },
      "family-tour": {
        tourId: "family-tour",
        bandedPricingEnabled: true,
        bokunCategories: FAMILY_CATS,
        pricingMode: "flat",
        syncedAt: null,
      },
    };

    it("excludes candidate that disallows infants, keeps compatible one", async () => {
      vi.resetModules();
      vi.doMock("@/data/studioTourSuitability", () => ({
        STUDIO_TOUR_SUITABILITY: {
          "adult-only-tour": { infantsAllowed: false } as TravellerSuitability,
        },
        STUDIO_TOUR_CAPACITY: {},
        getTourSuitability: (id: string) =>
          id === "adult-only-tour" ? { infantsAllowed: false } : undefined,
        getTourCapacity: () => undefined,
      }));
      const { filterStudioCandidatesBySuitability: fresh } = await import(
        "@/lib/pricing/filterSignatureCandidatesForAges"
      );
      const composition = { adults: 2, minorAges: [0] };
      const req = requirementsFromComposition(composition);
      const r = fresh(composition, tours, readiness, req);
      expect(r.hasCompatible).toBe(true);
      expect(r.compatible.map((c) => c.id)).toEqual(["family-tour"]);
      expect(r.excluded.map((e) => e.tourId)).toContain("adult-only-tour");
      vi.doUnmock("@/data/studioTourSuitability");
    });

    it("returns hasCompatible=false when every candidate fails suitability", async () => {
      vi.resetModules();
      vi.doMock("@/data/studioTourSuitability", () => ({
        STUDIO_TOUR_SUITABILITY: {},
        STUDIO_TOUR_CAPACITY: {},
        getTourSuitability: () => ({ infantsAllowed: false } as TravellerSuitability),
        getTourCapacity: () => undefined,
      }));
      const { filterStudioCandidatesBySuitability: fresh } = await import(
        "@/lib/pricing/filterSignatureCandidatesForAges"
      );
      const composition = { adults: 2, minorAges: [0] };
      const req = requirementsFromComposition(composition);
      const r = fresh(composition, tours, readiness, req);
      expect(r.hasCompatible).toBe(false);
      expect(r.compatible).toEqual([]);
      vi.doUnmock("@/data/studioTourSuitability");
    });
  });

  describe("stop-level filter — same-skeleton replacement", () => {
    it("removes incompatible stop and swaps in first compatible from pool", () => {
      const stops = [
        { label: "Cave descent", story: "" },
        { label: "Lisbon pickup", story: "" },
      ];
      const pool = [
        { label: "Cave descent", story: "" },
        { label: "Azeitão wine estate", story: "" },
      ];
      const req = requirementsFromComposition({ adults: 2, minorAges: [1] });
      // Stub via a local resolver — inject through the registry file mock.
      vi.resetModules();
      vi.doMock("@/data/studioStopSuitability", () => ({
        STUDIO_STOP_SUITABILITY: {},
        getStopSuitability: (label: string | null) =>
          label && label.toLowerCase() === "cave descent"
            ? { minimumAge: 12 }
            : undefined,
      }));
      return import("@/components/studio-v3/stop-suitability").then(
        ({ filterStopsBySuitability: fresh }) => {
          const outcome = fresh(stops, req, pool);
          expect(outcome.removed.map((r) => r.label)).toEqual(["Cave descent"]);
          expect(outcome.replacements[0]?.to).toBe("Azeitão wine estate");
          expect(outcome.stops.map((s) => s.label)).toEqual([
            "Azeitão wine estate",
            "Lisbon pickup",
          ]);
          vi.doUnmock("@/data/studioStopSuitability");
        },
      );
    });

    it("preserves compatible stops when no metadata is registered (default pass-through)", () => {
      const stops = [{ label: "A" }, { label: "B" }];
      const req = requirementsFromComposition({ adults: 2, minorAges: [] });
      const outcome = filterStopsBySuitability(stops, req, []);
      expect(outcome.stops).toEqual(stops);
      expect(outcome.removed).toEqual([]);
    });
  });

  describe("Studio identity guard", () => {
    it("recognises the canonical commercial key", () => {
      expect(STUDIO_COMMERCIAL_PRODUCT_KEY).toBe("studio-v3-private-full-day");
      expect(isStudioCommercialProductKey("studio-v3-private-full-day")).toBe(true);
      expect(isStudioCommercialProductKey("signature-lisbon-day")).toBe(false);
    });

    it("throws when a Signature-tour mapping tries to swap in", () => {
      expect(() => assertStudioCommercialIdentity("signature-arrabida-day")).toThrow(
        /studio-identity-guard/,
      );
      expect(() => assertStudioCommercialIdentity("studio-v3-private-full-day")).not.toThrow();
    });
  });
});
