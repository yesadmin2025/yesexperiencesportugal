/**
 * Regression guardrail for the shared Signature map-stop resolver.
 *
 * The client map (`SignatureRouteMap`) and the server route fn both consume
 * `resolveSignatureMapStops`. If ordering, coordinates or chapter filtering
 * ever drift, pins and drawn legs silently disagree — so lock the contract.
 */
import { describe, expect, it } from "vitest";
import { signatureTours } from "@/data/signatureTours";
import { sotItinerary } from "@/data/signatureToursSourceOfTruth";
import { lookupStop } from "@/data/stopGeo";
import { resolveSignatureMapStops } from "@/lib/signature-map-stops";

const PT_BOUNDS = { minLat: 36.8, maxLat: 42.2, minLng: -9.6, maxLng: -6.1 };

describe("signature map-stop resolver", () => {
  it("resolves at least two mappable stops for every signature", () => {
    for (const tour of signatureTours) {
      const stops = resolveSignatureMapStops(tour);
      expect(stops.length, `${tour.id} has too few map stops`).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps SoT itinerary order and drops pass-by chapters", () => {
    for (const tour of signatureTours) {
      const sot = sotItinerary(tour.id);
      if (!sot?.length) continue;

      const expected = sot
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((c) => c.stopType !== "pass-by")
        .map((c) => c.label)
        .filter((label) => lookupStop(label));

      const resolved = resolveSignatureMapStops(tour).map((s) => s.label);

      // Resolved labels are the SoT labels, in SoT order, minus coordinate dupes.
      expect(expected.join(" → ")).toContain(resolved[0]);
      let cursor = -1;
      for (const label of resolved) {
        const next = expected.indexOf(label, cursor + 1);
        expect(next, `${tour.id}: "${label}" out of SoT order`).toBeGreaterThan(cursor);
        cursor = next;
      }

      const passBy = sot.filter((c) => c.stopType === "pass-by").map((c) => c.label);
      for (const label of passBy) {
        expect(resolved, `${tour.id}: pass-by "${label}" leaked onto the map`).not.toContain(label);
      }
    }
  });

  it("returns unique coordinates inside mainland Portugal", () => {
    for (const tour of signatureTours) {
      const stops = resolveSignatureMapStops(tour);
      const keys = stops.map((s) => `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`);
      expect(new Set(keys).size, `${tour.id} repeats a pin coordinate`).toBe(keys.length);

      for (const stop of stops) {
        expect(Number.isFinite(stop.lat) && Number.isFinite(stop.lng)).toBe(true);
        expect(stop.lat, `${tour.id}: ${stop.label} lat out of PT bounds`).toBeGreaterThan(
          PT_BOUNDS.minLat,
        );
        expect(stop.lat).toBeLessThan(PT_BOUNDS.maxLat);
        expect(stop.lng, `${tour.id}: ${stop.label} lng out of PT bounds`).toBeGreaterThan(
          PT_BOUNDS.minLng,
        );
        expect(stop.lng).toBeLessThan(PT_BOUNDS.maxLng);
        expect(stop.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("is deterministic across repeated calls", () => {
    for (const tour of signatureTours) {
      expect(resolveSignatureMapStops(tour)).toEqual(resolveSignatureMapStops(tour));
    }
  });
});
