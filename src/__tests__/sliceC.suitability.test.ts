// Slice C — Studio traveller-suitability filter (closure).
//
// Covers:
//  - Type/semantics: unknown-blocker for minors, adult-only backward compat
//  - Registry completeness for every reachable tour and stop
//  - Candidate filter: unknown → suitability_not_ready; unsupported_age distinct
//  - Stop filter: incompatible stop replaced or dropped; no duplicates;
//    invalid outcome caught by validateItineraryAfterReplacement
//  - Identity guard against Signature pricing leakage

import { describe, it, expect, vi } from "vitest";
import {
  checkTravellerSuitability,
  requirementsFromComposition,
  type SuitabilityRecord,
} from "@/lib/pricing/travellerSuitability";
import {
  filterStopsBySuitability,
  validateItineraryAfterReplacement,
} from "@/components/studio-v3/stop-suitability";
import {
  STUDIO_COMMERCIAL_PRODUCT_KEY,
  assertStudioCommercialIdentity,
  isStudioCommercialProductKey,
} from "@/lib/pricing/studioCommercialIdentity";
import { filterStudioCandidatesBySuitability } from "@/lib/pricing/filterSignatureCandidatesForAges";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { REGION_STOP_POOL } from "@/data/regionStopPool";
import {
  STUDIO_TOUR_SUITABILITY,
  getTourSuitability,
} from "@/data/studioTourSuitability";
import { getStopSuitability } from "@/data/studioStopSuitability";
import type { TourBokunReadiness } from "@/hooks/use-tour-bokun-readiness";
import type { MappedBokunPricingCategory } from "@/lib/pricing/bokunCategories";

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

describe("Slice C — unknown-blocker semantics", () => {
  it("missing record + minors → suitability_not_ready", () => {
    const req = requirementsFromComposition({ adults: 2, minorAges: [8] });
    const r = checkTravellerSuitability(undefined, req);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons).toContain("suitability_not_ready");
  });

  it("status='unknown' + minors → suitability_not_ready", () => {
    const rec: SuitabilityRecord = { status: "unknown", infantsAllowed: true };
    const req = requirementsFromComposition({ adults: 2, minorAges: [0] });
    const r = checkTravellerSuitability(rec, req);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons).toEqual(["suitability_not_ready"]);
  });

  it("missing record + ADULT ONLY → ok (backward compat)", () => {
    const req = requirementsFromComposition({ adults: 3, minorAges: [] });
    expect(checkTravellerSuitability(undefined, req).ok).toBe(true);
  });

  it("explicitly-unrestricted + minors → ok", () => {
    const rec: SuitabilityRecord = { status: "explicitly-unrestricted" };
    const req = requirementsFromComposition({ adults: 2, minorAges: [8] });
    expect(checkTravellerSuitability(rec, req).ok).toBe(true);
  });

  it("confirmed with infantsAllowed=false blocks infant with infant_not_allowed", () => {
    const rec: SuitabilityRecord = { status: "confirmed", infantsAllowed: false };
    const req = requirementsFromComposition({ adults: 2, minorAges: [0] });
    const r = checkTravellerSuitability(rec, req);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reasons).toContain("infant_not_allowed");
      expect(r.unsupportedAges).toContain(0);
    }
  });

  it("confirmed with minimumAge flags unsupported_age", () => {
    const rec: SuitabilityRecord = { status: "confirmed", minimumAge: 8 };
    const req = requirementsFromComposition({ adults: 2, minorAges: [5] });
    const r = checkTravellerSuitability(rec, req);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reasons).toContain("unsupported_age");
      expect(r.unsupportedAges).toContain(5);
    }
  });

  it("capacity_exceeded counts infants by default", () => {
    const rec: SuitabilityRecord = { status: "confirmed" };
    const req = requirementsFromComposition({ adults: 3, minorAges: [0] });
    const r = checkTravellerSuitability(rec, req, 3);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons).toContain("capacity_exceeded");
  });

  it("capacityCountsAllTravellers=false excludes infants", () => {
    const rec: SuitabilityRecord = {
      status: "confirmed",
      capacityCountsAllTravellers: false,
    };
    const req = requirementsFromComposition({ adults: 3, minorAges: [0] });
    expect(checkTravellerSuitability(rec, req, 3).ok).toBe(true);
  });
});

describe("Slice C — registry completeness", () => {
  it("every Signature tour has a non-unknown suitability record", () => {
    const missing: string[] = [];
    const unknowns: string[] = [];
    for (const tour of signatureTours) {
      const rec = getTourSuitability(tour.id);
      if (!rec) missing.push(tour.id);
      else if (rec.status === "unknown") unknowns.push(tour.id);
    }
    expect({ missing, unknowns }).toEqual({ missing: [], unknowns: [] });
  });

  it("every reachable Studio stop label has a non-unknown suitability record", () => {
    const labels = new Set<string>();
    // Extract labels from signatureTours[*].stops[*].label
    for (const t of signatureTours) {
      for (const s of t.stops ?? []) labels.add(s.label);
    }
    for (const s of REGION_STOP_POOL) labels.add(s.name);

    const missing: string[] = [];
    const unknowns: string[] = [];
    for (const label of labels) {
      const rec = getStopSuitability(label);
      if (!rec) missing.push(label);
      else if (rec.status === "unknown") unknowns.push(label);
    }
    expect({ missing, unknowns }).toEqual({ missing: [], unknowns: [] });
  });

  it("STUDIO_TOUR_SUITABILITY has zero unknown records", () => {
    const unknowns = Object.entries(STUDIO_TOUR_SUITABILITY)
      .filter(([, v]) => v.status === "unknown")
      .map(([k]) => k);
    expect(unknowns).toEqual([]);
  });
});

describe("Slice C — candidate filter unknown vs unsupported", () => {
  const tours: SignatureTour[] = [
    { id: "tour-x-unknown" } as SignatureTour,
    { id: "tour-y-open" } as SignatureTour,
  ];
  const readiness: Record<string, TourBokunReadiness> = {
    "tour-x-unknown": {
      tourId: "tour-x-unknown",
      bandedPricingEnabled: true,
      bokunCategories: FAMILY_CATS,
      pricingMode: "flat",
      syncedAt: null,
    },
    "tour-y-open": {
      tourId: "tour-y-open",
      bandedPricingEnabled: true,
      bokunCategories: FAMILY_CATS,
      pricingMode: "flat",
      syncedAt: null,
    },
  };

  it("unknown candidate + minor → excluded as suitability_not_ready; open candidate kept", async () => {
    vi.resetModules();
    vi.doMock("@/data/studioTourSuitability", () => ({
      STUDIO_TOUR_SUITABILITY: {},
      STUDIO_TOUR_CAPACITY: {},
      getTourSuitability: (id: string) =>
        id === "tour-x-unknown"
          ? ({ status: "unknown" } as SuitabilityRecord)
          : id === "tour-y-open"
          ? ({ status: "explicitly-unrestricted" } as SuitabilityRecord)
          : undefined,
      getTourCapacity: () => undefined,
    }));
    const { filterStudioCandidatesBySuitability: fresh } = await import(
      "@/lib/pricing/filterSignatureCandidatesForAges"
    );
    const composition = { adults: 2, minorAges: [8] };
    const req = requirementsFromComposition(composition);
    const r = fresh(composition, tours, readiness, req);
    expect(r.hasCompatible).toBe(true);
    expect(r.compatible.map((c) => c.id)).toEqual(["tour-y-open"]);
    const x = r.excluded.find((e) => e.tourId === "tour-x-unknown");
    expect(x?.reasons).toContain("suitability_not_ready");
    vi.doUnmock("@/data/studioTourSuitability");
  });

  it("ADULT-only backward compat: unknown candidate remains compatible", async () => {
    vi.resetModules();
    vi.doMock("@/data/studioTourSuitability", () => ({
      STUDIO_TOUR_SUITABILITY: {},
      STUDIO_TOUR_CAPACITY: {},
      getTourSuitability: () => ({ status: "unknown" } as SuitabilityRecord),
      getTourCapacity: () => undefined,
    }));
    const { filterStudioCandidatesBySuitability: fresh } = await import(
      "@/lib/pricing/filterSignatureCandidatesForAges"
    );
    const composition = { adults: 3, minorAges: [] };
    const req = requirementsFromComposition(composition);
    const r = fresh(composition, tours, readiness, req);
    expect(r.hasCompatible).toBe(true);
    expect(r.compatible.length).toBe(2);
    vi.doUnmock("@/data/studioTourSuitability");
  });

  it("firstBlockingReason surfaces unsupported_age above suitability_not_ready", async () => {
    vi.resetModules();
    vi.doMock("@/data/studioTourSuitability", () => ({
      STUDIO_TOUR_SUITABILITY: {},
      STUDIO_TOUR_CAPACITY: {},
      getTourSuitability: (id: string) =>
        id === "tour-x-unknown"
          ? ({ status: "unknown" } as SuitabilityRecord)
          : ({ status: "confirmed", minimumAge: 18 } as SuitabilityRecord),
      getTourCapacity: () => undefined,
    }));
    const { filterStudioCandidatesBySuitability: fresh } = await import(
      "@/lib/pricing/filterSignatureCandidatesForAges"
    );
    const composition = { adults: 2, minorAges: [8] };
    const req = requirementsFromComposition(composition);
    const r = fresh(composition, tours, readiness, req);
    expect(r.hasCompatible).toBe(false);
    expect(r.firstBlockingReason).toBe("unsupported_age");
    vi.doUnmock("@/data/studioTourSuitability");
  });
});

describe("Slice C — stop-level replacement and validity", () => {
  it("unknown stop + minor → removed, swapped from same-skeleton pool", async () => {
    vi.resetModules();
    vi.doMock("@/data/studioStopSuitability", () => ({
      STUDIO_STOP_SUITABILITY: {},
      getStopSuitability: (label: string | null) => {
        if (!label) return undefined;
        const key = label.toLowerCase();
        if (key === "cave descent") return { status: "unknown" } as SuitabilityRecord;
        return { status: "explicitly-unrestricted" } as SuitabilityRecord;
      },
    }));
    const { filterStopsBySuitability: fresh } = await import(
      "@/components/studio-v3/stop-suitability"
    );
    const stops = [
      { label: "Cave descent", story: "" },
      { label: "Lisbon pickup", story: "" },
    ];
    const pool = [
      { label: "Cave descent", story: "" },
      { label: "Azeitão wine estate", story: "" },
    ];
    const req = requirementsFromComposition({ adults: 2, minorAges: [8] });
    const outcome = fresh(stops, req, pool);
    expect(outcome.removed.map((r) => r.label)).toEqual(["Cave descent"]);
    expect(outcome.replacements[0]?.to).toBe("Azeitão wine estate");
    expect(outcome.stops.map((s) => s.label)).toEqual([
      "Azeitão wine estate",
      "Lisbon pickup",
    ]);
    vi.doUnmock("@/data/studioStopSuitability");
  });

  it("no duplicate replacements — only-alt pool + two incompatible stops", async () => {
    vi.resetModules();
    vi.doMock("@/data/studioStopSuitability", () => ({
      STUDIO_STOP_SUITABILITY: {},
      getStopSuitability: (label: string | null) => {
        if (!label) return undefined;
        const l = label.toLowerCase();
        if (l === "cave a" || l === "cave b")
          return { status: "confirmed", infantsAllowed: false } as SuitabilityRecord;
        return { status: "explicitly-unrestricted" } as SuitabilityRecord;
      },
    }));
    const { filterStopsBySuitability: fresh } = await import(
      "@/components/studio-v3/stop-suitability"
    );
    const stops = [{ label: "Cave A" }, { label: "Cave B" }, { label: "Town" }];
    const pool = [{ label: "Village" }];
    const req = requirementsFromComposition({ adults: 2, minorAges: [0] });
    const outcome = fresh(stops, req, pool);
    // Cave A → swapped for Village; Cave B → dropped (pool exhausted)
    expect(outcome.replacements.map((r) => r.to)).toEqual(["Village"]);
    expect(outcome.dropped.map((d) => d.label)).toEqual(["Cave B"]);
    // No duplicate labels in output.
    const labels = outcome.stops.map((s) => s.label.toLowerCase());
    expect(new Set(labels).size).toBe(labels.length);
    vi.doUnmock("@/data/studioStopSuitability");
  });

  it("all stops incompatible → validity 'empty'; caller gate blocks quote", async () => {
    vi.resetModules();
    vi.doMock("@/data/studioStopSuitability", () => ({
      STUDIO_STOP_SUITABILITY: {},
      getStopSuitability: () =>
        ({ status: "confirmed", infantsAllowed: false } as SuitabilityRecord),
    }));
    const { filterStopsBySuitability: fresh, validateItineraryAfterReplacement: freshValidate } =
      await import("@/components/studio-v3/stop-suitability");
    const stops = [{ label: "A" }, { label: "B" }];
    const req = requirementsFromComposition({ adults: 2, minorAges: [0] });
    const outcome = fresh(stops, req, []);
    expect(outcome.stops.length).toBe(0);
    expect(freshValidate(outcome, req)).toBe("empty");
    vi.doUnmock("@/data/studioStopSuitability");
  });

  it("validateItineraryAfterReplacement returns null when itinerary is healthy", () => {
    const outcome = {
      stops: [{ label: "Sintra" }, { label: "Cascais" }],
      removed: [],
      replacements: [],
      dropped: [],
    };
    const req = requirementsFromComposition({ adults: 2, minorAges: [8] });
    expect(validateItineraryAfterReplacement(outcome, req)).toBeNull();
  });

  it("adult-only backward-compat flow: unknown stops keep the itinerary", async () => {
    vi.resetModules();
    vi.doMock("@/data/studioStopSuitability", () => ({
      STUDIO_STOP_SUITABILITY: {},
      getStopSuitability: () => undefined, // treated as unknown at runtime
    }));
    const { filterStopsBySuitability: fresh } = await import(
      "@/components/studio-v3/stop-suitability"
    );
    const stops = [{ label: "Mystery A" }, { label: "Mystery B" }];
    const req = requirementsFromComposition({ adults: 3, minorAges: [] });
    const outcome = fresh(stops, req, []);
    expect(outcome.stops.map((s) => s.label)).toEqual(["Mystery A", "Mystery B"]);
    expect(outcome.removed).toEqual([]);
    vi.doUnmock("@/data/studioStopSuitability");
  });
});

describe("Slice C — Studio identity guard (Signature pricing leakage)", () => {
  it("recognises the canonical commercial key", () => {
    expect(STUDIO_COMMERCIAL_PRODUCT_KEY).toBe("studio-v3-private-full-day");
    expect(isStudioCommercialProductKey("studio-v3-private-full-day")).toBe(true);
    expect(isStudioCommercialProductKey("signature-arrabida-wine")).toBe(false);
  });

  it("throws when a Signature-tour mapping tries to swap in", () => {
    expect(() => assertStudioCommercialIdentity("arrabida-wine-allinclusive")).toThrow(
      /studio-identity-guard/,
    );
    expect(() => assertStudioCommercialIdentity("studio-v3-private-full-day")).not.toThrow();
  });
});
