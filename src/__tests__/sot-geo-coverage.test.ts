import { describe, expect, it } from "vitest";
import { signatureTours } from "@/data/signatureTours";
import { SIGNATURE_SOURCE_OF_TRUTH } from "@/data/signatureToursSourceOfTruth";
import { lookupStop } from "@/data/stopGeo";
import { resolveSignatureMapStops } from "@/lib/signature-map-stops";

/**
 * Every Source-of-Truth itinerary label must resolve to a real coordinate,
 * so every Signature map renders its full route without runtime geocoding.
 * A new SoT stop without coordinates must fail here, loudly.
 */
describe("SoT geo coverage", () => {
  it("every SoT chapter label has curated coordinates", () => {
    const missing: string[] = [];
    for (const [tourId, sot] of Object.entries(SIGNATURE_SOURCE_OF_TRUTH)) {
      for (const c of sot?.itinerary ?? []) {
        if (!lookupStop(c.label)) missing.push(`${tourId}: ${c.label}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every Signature resolves at least 2 map stops from the SoT", () => {
    for (const tour of signatureTours) {
      const stops = resolveSignatureMapStops(tour);
      expect(stops.length, `${tour.id} map stops`).toBeGreaterThanOrEqual(2);
    }
  });

  it("map stops exclude pass-by chapters and keep SoT order", () => {
    for (const tour of signatureTours) {
      const sot = SIGNATURE_SOURCE_OF_TRUTH[tour.id];
      if (!sot) continue;
      const expected = sot.itinerary
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((c) => c.stopType !== "pass-by")
        .map((c) => c.label);
      const got = resolveSignatureMapStops(tour).map((s) => s.label);
      // Same relative order, de-duplication aside.
      let cursor = -1;
      for (const label of got) {
        const idx = expected.indexOf(label);
        expect(idx, `${tour.id}: ${label} not a SoT non-pass-by stop`).toBeGreaterThan(-1);
        expect(idx).toBeGreaterThan(cursor);
        cursor = idx;
      }
    }
  });
});
