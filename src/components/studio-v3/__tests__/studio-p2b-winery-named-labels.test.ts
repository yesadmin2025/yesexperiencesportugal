/**
 * Pass 2B hardening regressions.
 *
 * A) Winery presentation must close over REAL named Signature supplier
 *    labels and their verified aliases — not only already-generic fixtures.
 * B) Wine-adjacent NON-winery moments must never be genericised.
 * C) Moment reasons must follow the CURRENT stop identity after reorder /
 *    swap, never the original array position.
 */

import { describe, expect, it } from "vitest";
import {
  buildWineryDisplayLabels,
  isWineryStopLabel,
  studioDisplayLabel,
} from "../studioWineryPresentation";
import { applyGesture, resolveMomentReason } from "../momentAuthorship";

/** Real labels present in the live Signature / blueprint catalogs. */
const NAMED_SUPPLIER_LABELS = [
  "House & Museum José Maria Da Fonseca",
  "José Maria da Fonseca",
  "Quinta do Piloto",
  "Farm Catralvos",
  "Quinta de Catralvos",
  "Bacalhoa Vinhos de Portugal",
  "Quinta da Bacalhôa",
  "Herdade Da Comporta",
  "Joao Portugal Ramos Wines",
  "Enoturismo Cartuxa",
  "Cartuxa",
  "Ervideira",
  "Herdade do Esporao",
  "Herdade do Esporão",
  "Adega Regional de Colares",
  "Adega do Mestre Daniel · XXVI Talhas",
  "Adega de Palmela",
] as const;

/** Wine-adjacent moments that are NOT winery visits. */
const NON_WINERY_LABELS = [
  "Mercado do Livramento",
  "Centro Interpretativo do Vinho de Talha",
  "Long lunch in Azeitão",
  "Comporta",
  "Comporta Beach",
  "Sesimbra harbour walk",
] as const;

describe("winery presentation — real named supplier labels", () => {
  it.each(NAMED_SUPPLIER_LABELS)("classifies %s as a winery", (label) => {
    expect(isWineryStopLabel(label)).toBe(true);
  });

  it.each(NON_WINERY_LABELS)("does NOT classify %s as a winery", (label) => {
    expect(isWineryStopLabel(label)).toBe(false);
  });

  it("never presents an exact supplier name to the traveller", () => {
    for (const label of NAMED_SUPPLIER_LABELS) {
      const map = buildWineryDisplayLabels([{ label }]);
      const shown = studioDisplayLabel(label, map);
      expect(shown).not.toBe(label);
      expect(shown).toMatch(/^A (local|second local|third local|fourth local) winery$/);
    }
  });

  it("keeps non-winery wine-adjacent moments verbatim", () => {
    for (const label of NON_WINERY_LABELS) {
      const map = buildWineryDisplayLabels([{ label }]);
      expect(studioDisplayLabel(label, map)).toBe(label);
    }
  });

  it("numbers distinct wineries positionally over a mixed day", () => {
    const stops = [
      { label: "Mercado do Livramento" },
      { label: "House & Museum José Maria Da Fonseca" },
      { label: "Long lunch in Azeitão" },
      { label: "Farm Catralvos" },
      { label: "Quinta do Piloto" },
    ];
    const map = buildWineryDisplayLabels(stops);
    const shown = stops.map((s) => studioDisplayLabel(s.label, map));
    expect(shown).toEqual([
      "Mercado do Livramento",
      "A local winery",
      "Long lunch in Azeitão",
      "A second local winery",
      "A third local winery",
    ]);
  });

  it("gives the same generic label to aliases of the same supplier", () => {
    const map = buildWineryDisplayLabels([
      { label: "Farm Catralvos" },
      { label: "Quinta de Catralvos" },
    ]);
    expect(studioDisplayLabel("Farm Catralvos", map)).toBe(
      studioDisplayLabel("Quinta de Catralvos", map),
    );
  });
});

describe("moment reason follows current stop identity, not position", () => {
  const signals = { interests: ["wine", "coast"] as const, feeling: "wine-food" as const };

  it("moves with the stop after reorder", () => {
    const stops = [
      { label: "Family winery in Azeitão", story: "" },
      { label: "Praia da Figueirinha", story: "" },
    ];
    const before = stops.map((s) => resolveMomentReason(s.label, signals));
    const after = applyGesture(stops, 0, "later").map((s) => resolveMomentReason(s.label, signals));
    expect(after).toEqual([before[1], before[0]]);
  });

  it("follows the replacement after a swap", () => {
    const stops = [{ label: "Family winery in Azeitão", story: "" }];
    const swapped = applyGesture(stops, 0, "swap", {
      replacement: { label: "Praia da Figueirinha", story: "" },
    });
    expect(resolveMomentReason(swapped[0].label, signals)).toBe(
      resolveMomentReason("Praia da Figueirinha", signals),
    );
    expect(resolveMomentReason(swapped[0].label, signals)).not.toBe(
      resolveMomentReason("Family winery in Azeitão", signals),
    );
  });

  it("returns null rather than filler when nothing truthful applies", () => {
    expect(resolveMomentReason("Family winery in Azeitão", { interests: [], feeling: null })).toBe(
      null,
    );
  });
});
