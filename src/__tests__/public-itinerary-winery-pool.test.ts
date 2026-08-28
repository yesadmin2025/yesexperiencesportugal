import { describe, it, expect } from "vitest";
import {
  projectPublicSotItinerary,
  sanitizePublicMapStopLabels,
  wineryPoolCandidateLabels,
  GENERIC_WINERY_PIN_LABEL,
} from "@/lib/publicItineraryProjection";
import { getSot } from "@/data/signatureToursSourceOfTruth";

const NAMED = [
  "José Maria da Fonseca",
  "Quinta do Piloto",
  "Adega Cooperativa de Palmela",
  "Bacalhôa",
  "Farm Catralvos",
];

const CONFIRM_RE = /confirm|availability|pending|subject to/i;

describe("public Signature itinerary — unresolved winery pools", () => {
  const tourId = "arrabida-wine-allinclusive";

  it("collapses the winery pool into one generic chapter matching poolPick.min", () => {
    const sot = getSot(tourId)!;
    const min = sot.poolPick!.wineries!.min;
    const projected = projectPublicSotItinerary(tourId)!;
    const pool = projected.filter((c) => c.isPoolSummary);
    expect(pool).toHaveLength(1);
    expect(min).toBe(2);
    expect(pool[0]!.label).toBe("Two local winery visits");
    expect(pool[0]!.description).toBe(
      "Two local winery visits are included within your private route.",
    );
    expect(pool[0]!.optional).toBe(false);
    expect(pool[0]!.isDefault).toBe(true);
    expect(pool[0]!.description).not.toMatch(CONFIRM_RE);
  });

  it("never exposes a named candidate supplier in the public projection", () => {
    const text = JSON.stringify(projectPublicSotItinerary(tourId));
    for (const n of NAMED) expect(text).not.toContain(n);
  });

  it("keeps every named candidate unchanged in internal SoT", () => {
    const labels = getSot(tourId)!.itinerary.map((c) => c.label);
    for (const n of NAMED) expect(labels).toContain(n);
    expect(wineryPoolCandidateLabels(tourId).sort()).toEqual([...NAMED].sort());
  });

  it("preserves non-winery chapters and their order around the collapsed pool", () => {
    const projected = projectPublicSotItinerary(tourId)!;
    expect(projected.map((c) => c.label)).toEqual([
      "Lisbon",
      "Sesimbra",
      "Parque Natural da Arrábida",
      "Two local winery visits",
      "Mercado do Livramento",
      "Azeitão",
      "Azulejos de Azeitão",
      "Cristo Rei",
      "Castelo de Sesimbra",
    ]);
  });

  it("public JSON-LD projection (non-optional chapters) follows the same truth", () => {
    const stops = projectPublicSotItinerary(tourId)!
      .filter((c) => !c.optional)
      .map((c) => ({ label: c.label, story: c.description }));
    const text = JSON.stringify(stops);
    for (const n of NAMED) expect(text).not.toContain(n);
    expect(stops.some((s) => s.label === "Two local winery visits")).toBe(true);
  });

  it("public map labels are genericised while geo identity is preserved", () => {
    const input = [
      { label: "Mercado do Livramento", lat: 38.52, lng: -8.89 },
      { label: "Quinta do Piloto", lat: 38.57, lng: -8.9 },
    ];
    const out = sanitizePublicMapStopLabels(tourId, input);
    expect(out[0]!.label).toBe("Mercado do Livramento");
    expect(out[1]!.label).toBe(GENERIC_WINERY_PIN_LABEL);
    expect(out[1]!.lat).toBe(38.57);
    expect(out[1]!.lng).toBe(-8.9);
  });

  it("one-winery pools use the singular generic form", () => {
    const projected = projectPublicSotItinerary("tiles-workshop")!;
    const pool = projected.filter((c) => c.isPoolSummary);
    expect(pool).toHaveLength(1);
    expect(pool[0]!.label).toMatch(/^One local winery visit$/);
    expect(JSON.stringify(projected)).not.toContain("José Maria da Fonseca");
  });

  it("keeps a guaranteed named winery experience named (non-pool)", () => {
    const projected = projectPublicSotItinerary("sintra-cascais")!;
    const colares = projected.find((c) => c.label === "Adega Regional de Colares");
    expect(colares).toBeDefined();
    expect(colares!.stopType).toBe("conditional");
    // Non-winery alternative pools (palaces) keep their candidate behaviour.
    expect(projected.some((c) => c.label === "Quinta da Regaleira")).toBe(true);
  });
});
