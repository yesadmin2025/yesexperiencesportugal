/**
 * FINAL CLOSURE — A (canonical geo authority) + C (supplier/media privacy).
 *
 * These two seams were the audit's route-truth and privacy blockers:
 *   A) token-level ("first significant word") fuzzy matching acted as a geo
 *      authority and resolved places onto unrelated coordinates;
 *   C) a moment's photograph carried the raw supplier label in `alt`, so the
 *      generic visible label leaked through image metadata.
 */

import { describe, expect, it } from "vitest";

import { lookupStopGeo } from "@/lib/studio/stop-lookup";
import { lookupStop } from "@/data/stopGeo";
import { publicMomentAltText } from "@/components/studio-v3/studioWineryPresentation";

const approxKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (b.lng - a.lng) * Math.cos(midLat) * 111.32;
  const dy = (b.lat - a.lat) * 110.57;
  return Math.sqrt(dx * dx + dy * dy);
};

describe("A · fuzzy token matching is no longer a geo authority", () => {
  it("never resolves a label from a single shared word", () => {
    // "Parque Natural da Arrábida" previously landed on Costa Vicentina via
    // first-word matching. It must now resolve honestly or not at all.
    const hit = lookupStopGeo("Parque Natural da Arrábida");
    if (hit) {
      // If it resolves, it must resolve INSIDE the Arrábida massif.
      expect(approxKm(hit, { lat: 38.4833, lng: -8.9833 })).toBeLessThan(20);
    }
  });

  it("never resolves an unrelated place that merely shares a token", () => {
    expect(lookupStopGeo("Marina reception desk")).toBeNull();
    expect(lookupStopGeo("Castelo de Somewhere Unknown")).toBeNull();
  });
});

describe("A · canonical coordinates cover the audited inventory gaps", () => {
  const cases: Array<[string, { lat: number; lng: number }]> = [
    ["Park and National Palace of Pena", { lat: 38.7876, lng: -9.3904 }],
    ["Templo Romano de Évora", { lat: 38.5729, lng: -7.9075 }],
    ["Capela dos Ossos", { lat: 38.5698, lng: -7.9083 }],
    ["Castelo de Sesimbra", { lat: 38.4478, lng: -9.1075 }],
    ["Tile painting workshop, Sesimbra", { lat: 38.4438, lng: -9.1013 }],
    ["Marina de Tróia", { lat: 38.4936, lng: -8.9041 }],
    ["Mercado do Livramento", { lat: 38.5249, lng: -8.892 }],
    ["Azulejos de Azeitão", { lat: 38.5166, lng: -9.0104 }],
    ["Parque Natural da Arrábida", { lat: 38.4833, lng: -8.9833 }],
  ];

  for (const [label, expected] of cases) {
    it(`${label} has a verified coordinate`, () => {
      const hit = lookupStop(label);
      expect(hit).not.toBeNull();
      expect(approxKm(hit!, expected)).toBeLessThan(5);
    });
  }

  it("a Sado ferry connector resolves to the boarding point, not the market", () => {
    const hit = lookupStop("Baia de Setubal — Sado ferry crossing");
    expect(hit).not.toBeNull();
    // Setúbal ferry terminal, NOT Mercado do Livramento (~0.6 km inland).
    expect(approxKm(hit!, { lat: 38.5202, lng: -8.8942 })).toBeLessThan(1);
    expect(hit!.label.toLowerCase()).toContain("ferry");
  });
});

describe("C · image metadata never leaks a supplier identity", () => {
  it("replaces a winery label with a generic alt", () => {
    for (const supplier of [
      "House & Museum José Maria Da Fonseca",
      "José Maria da Fonseca",
      "Quinta de Catralvos",
      "Adega de Palmela",
    ]) {
      const alt = publicMomentAltText(supplier);
      expect(alt.toLowerCase()).not.toContain("fonseca");
      expect(alt.toLowerCase()).not.toContain("catralvos");
      expect(alt.toLowerCase()).not.toContain("palmela");
      expect(alt).toBe("A local winery in the Portuguese countryside.");
    }
  });

  it("keeps truthful names for non-supplier moments", () => {
    expect(publicMomentAltText("Mercado do Livramento")).toBe("Mercado do Livramento");
    expect(publicMomentAltText("Capela dos Ossos")).toBe("Capela dos Ossos");
  });
});
