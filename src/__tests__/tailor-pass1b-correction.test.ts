/**
 * Pass 1B correction — Tailor correctness & privacy contracts.
 *
 * Source-contract regressions covering:
 *  - no named winery estate ever reaches a public Tailor output path
 *  - generic winery visits never trigger a manual-confirmation gate
 *  - unpriced winery optionals are not offered on other Signatures
 *  - the winery counter has real bounds
 *  - FinalDetails values are never overwritten with stale defaults
 *  - truthful intro copy
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";
import { tailorRules, winerySupplementEur, canSelectWineries } from "@/data/tailorRules";

const src = readFileSync("src/routes/tours_.$tourId.tailor.tsx", "utf8");

const ESTATES = [
  "José Maria da Fonseca",
  "Bacalhôa",
  "Catralvos",
  "Piloto",
  "Palmela",
  "Cartuxa",
  "Esporão",
  "Herdade da Comporta",
  "Mestre Daniel",
];

describe("Tailor never leaks a winery supplier name", () => {
  it("does not hardcode any estate name in the route", () => {
    for (const name of ESTATES) {
      expect(src).not.toContain(name);
    }
  });

  it("uses generic winery vocabulary for customer feedback", () => {
    expect(src).toContain("const wineryLabel = (index: number) => `Winery visit ${index}`");
    expect(src).toMatch(/Winery visit added/);
    expect(src).not.toContain("supplier will confirm timing");
    // The toast for a winery never interpolates the internal label.
    expect(src).not.toMatch(/Adding \$\{option\.label\} adds about \$\{added\} min to your day\.\$\{/);
  });

  it("builds display labels from the current selection, genericised", () => {
    expect(src).toMatch(/const publicSelectionLabels = useMemo<string\[\]>/);
    expect(src).toMatch(/const stopLabels = \[\.\.\.publicSelectionLabels\];/);
    expect(src).toMatch(/removedOptions: \[\s*\.\.\.skippedPublicLabels,/);
    expect(src).toMatch(/skippedCoreStops: skippedPublicLabels,/);
  });

  it("keeps stable stop ids for server pricing", () => {
    expect(src).toMatch(/skippedCoreStopIds: blueprint/);
    expect(src).toMatch(/principalsRemoved,/);
  });
});

describe("Tailor manual-confirmation gate", () => {
  it("is driven only by the absence of an approved price", () => {
    expect(src).toContain(
      "const requiresManualConfirmation = wineExtension.extra > 0 && !rules.wineries;",
    );
    expect(src).not.toContain("hasManualSupplier");
  });
});

describe("Tailor Enhance offers nothing unpriced", () => {
  it("suppresses winery-category optionals", () => {
    expect(src).toMatch(/const publicOptional = useMemo\(/);
    expect(src).toMatch(/\(blueprint\?\.optional \?\? \[\]\)\.filter\(\(o\) => o\.category !== "winery"\)/);
    expect(src).toContain("{publicOptional.map((o) => {");
  });

  it("Sintra's optional Colares winery is not a public enhancement", () => {
    const sintra = TAILOR_BLUEPRINTS["sintra-lisboa-wine"];
    if (!sintra) return;
    const wineryOptionals = sintra.optional.filter((o) => o.category === "winery");
    expect(wineryOptionals.length).toBeGreaterThan(0);
    // No approved ladder → nothing to sell.
    expect(tailorRules("sintra-lisboa-wine").wineries).toBeUndefined();
  });

  it("Tiles and Évora have no extra winery ladder", () => {
    expect(tailorRules("tiles-workshop").wineries).toBeUndefined();
    expect(tailorRules("evora-alentejo").wineries).toBeUndefined();
    expect(winerySupplementEur("tiles-workshop", 4)).toBe(0);
    expect(winerySupplementEur("evora-alentejo", 4)).toBe(0);
  });
});

describe("Arrábida winery counter bounds", () => {
  const id = "arrabida-wine-allinclusive";

  it("starts at the included baseline and is capped at the max", () => {
    const w = tailorRules(id).wineries!;
    expect(w.included).toBe(2);
    expect(w.max).toBe(4);
  });

  it("prices the 3rd and 4th visit at the approved supplements", () => {
    expect(winerySupplementEur(id, 3)).toBe(20);
    expect(winerySupplementEur(id, 4)).toBe(40);
  });

  it("still requires a removed stop for the 4th visit", () => {
    expect(canSelectWineries(id, 4, 0).allowed).toBe(false);
    expect(canSelectWineries(id, 4, 1).allowed).toBe(true);
  });

  it("disables the controls at the bounds instead of toasting", () => {
    expect(src).toContain("const wineryMin = rules.wineries?.included ?? 0;");
    expect(src).toContain("const wineryMax = rules.wineries?.max ?? 0;");
    expect(src).toContain("disabled={!canRemoveWineryVisit}");
    expect(src).toContain("disabled={!canAddWineryVisit}");
  });
});

describe("Tailor preserves Final Details verbatim", () => {
  it("never overwrites operational fields with stale local defaults", () => {
    expect(src).not.toMatch(/accessibility: \[\.\.\.accessibility\]/);
    expect(src).not.toMatch(/^\s*notes,$/m);
    expect(src).not.toMatch(/const \[accessibility\]/);
    expect(src).not.toMatch(/const \[notes\]/);
    // Only Tailor-specific additions may follow the spread.
    const block = src.slice(src.indexOf("guestDetails: {"), src.indexOf("guestDetails: {") + 420);
    expect(block).toContain("...details,");
    expect(block).toContain("pace,");
    expect(block).toContain("skippedCoreStops: skippedPublicLabels,");
  });

  it("seeds a preferred start time into Final Details", () => {
    expect(src).toContain("startTime: pickup,");
  });
});

describe("Tailor intro copy is truthful", () => {
  it("does not claim the route order is fixed", () => {
    expect(src).not.toContain("route order");
    expect(src).toContain(
      "Keep the character of this Signature, then shape a few moments and the rhythm.",
    );
  });
});
