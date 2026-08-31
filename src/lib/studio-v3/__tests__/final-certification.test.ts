/**
 * FINAL CERTIFICATION — candidate fit, cumulative add-on budget and
 * commercial ledger parity.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { evaluateCandidateFit, evaluatePoolFit, fitByLabel } from "@/lib/studio-v3/candidateFit";
import { resolveAddOnBudget } from "@/lib/studio-v3/addOnBudget";
import {
  buildCommercialLedger,
  reconcileLedgerWithCheckoutAddOns,
  type CommercialLedger,
} from "@/lib/studio-v3/commercialLedger";

const STUDIO = readFileSync("src/components/studio-v3/StudioV3.tsx", "utf8");
const PRICE_CARD = readFileSync("src/components/studio-v3/SignaturePriceCard.tsx", "utf8");

/* ------------------------------------------------------------------ */

describe("1 — candidate fit is per candidate, never pool-wide", () => {
  const fullDay = {
    stops: [
      { label: "Quinta winery tasting", lat: 38.49, lng: -8.89 },
      { label: "Traditional lunch table", lat: 38.48, lng: -8.9 },
      { label: "Cellar visit", lat: 38.47, lng: -8.87 },
      { label: "Azeitão village", lat: 38.51, lng: -9.01 },
      { label: "Portinho beach", lat: 38.47, lng: -8.98 },
      { label: "Arrábida viewpoint", lat: 38.46, lng: -9.0 },
    ],
    region: "Setúbal · Arrábida",
  };

  it("accepts a short moment and refuses a long one in the same day", () => {
    const short = evaluateCandidateFit(fullDay, {
      label: "Serra viewpoint",
      lat: 38.46,
      lng: -9.0,
      durationMinutes: 20,
    });
    const long = evaluateCandidateFit(fullDay, {
      label: "Second winery estate",
      lat: 38.44,
      lng: -8.8,
      durationMinutes: 240,
    });
    expect(long.fits).toBe(false);
    expect(long.reason).toBe("over-day-budget");
    // The two verdicts must differ — that is the whole point of per-candidate fit.
    expect(short.fits).not.toBe(long.fits);
  });

  it("refuses a candidate from another region", () => {
    const result = evaluateCandidateFit(
      { stops: [{ label: "Cellar visit" }], region: "Setúbal · Arrábida" },
      { label: "Douro terrace", durationMinutes: 30, region: "Douro" },
    );
    expect(result.fits).toBe(false);
    expect(result.reason).toBe("region-mismatch");
  });

  it("fails closed on an unnamed candidate", () => {
    const result = evaluateCandidateFit({ stops: [], region: null }, { label: "   " });
    expect(result.fits).toBe(false);
    expect(result.reason).toBe("unknown-candidate");
  });

  it("evaluates a swap at its real position, not as an append", () => {
    const swap = evaluateCandidateFit(
      fullDay,
      { label: "Quiet cove", lat: 38.45, lng: -8.99, durationMinutes: 30 },
      { replaceAt: 0 },
    );
    const append = evaluateCandidateFit(fullDay, {
      label: "Quiet cove",
      lat: 38.45,
      lng: -8.99,
      durationMinutes: 30,
    });
    expect(swap.projectedTotalMin).toBeLessThan(append.projectedTotalMin);
  });

  it("is deterministic and label-keyed across a pool", () => {
    const pool = [
      { label: "Serra viewpoint", durationMinutes: 20 },
      { label: "Second winery estate", durationMinutes: 240 },
    ];
    const a = fitByLabel(evaluatePoolFit(fullDay, pool));
    const b = fitByLabel(evaluatePoolFit(fullDay, pool));
    expect(a).toEqual(b);
    expect(Object.keys(a)).toEqual(["Serra viewpoint", "Second winery estate"]);
  });

  it("is wired live: the add pool and the swap gate both use it", () => {
    expect(STUDIO).toContain("evaluatePoolFit(");
    expect(STUDIO).toContain("addablePool.slice(0, 6)");
    expect(STUDIO).toContain("poolSize: addablePool.length");
    expect(STUDIO).toContain("{ replaceAt: i }");
    expect(STUDIO).toContain("if (!swapFit.fits) return;");
  });
});

/* ------------------------------------------------------------------ */

describe("2 — the add-on time budget is cumulative", () => {
  const pool = [
    { id: "a", durationMinutes: 45, fitsBudget: true },
    { id: "b", durationMinutes: 45, fitsBudget: true },
    { id: "c", durationMinutes: 45, fitsBudget: true },
  ];

  it("each add-on fits alone but not once the budget is spent", () => {
    const empty = resolveAddOnBudget({ pool, selectedIds: [], remainingMinutes: 60 });
    expect(empty.fitsById).toEqual({ a: true, b: true, c: true });

    const after = resolveAddOnBudget({ pool, selectedIds: ["a"], remainingMinutes: 60 });
    expect(after.selectedMinutes).toBe(45);
    expect(after.freeMinutes).toBe(15);
    expect(after.fitsById.b).toBe(false);
    expect(after.fitsById.c).toBe(false);
    // A chosen add-on is never silently withdrawn.
    expect(after.fitsById.a).toBe(true);
  });

  it("respects the catalogue veto and unknown remaining time", () => {
    const vetoed = resolveAddOnBudget({
      pool: [{ id: "x", durationMinutes: 10, fitsBudget: false }],
      selectedIds: [],
      remainingMinutes: 600,
    });
    expect(vetoed.fitsById.x).toBe(false);

    const unknown = resolveAddOnBudget({ pool, selectedIds: [], remainingMinutes: null });
    expect(unknown.freeMinutes).toBeNull();
    expect(unknown.fitsById.a).toBe(true);
  });

  it("is wired live into the price card", () => {
    expect(PRICE_CARD).toContain("resolveAddOnBudget({");
    expect(PRICE_CARD).toContain("const fitsBudgetById = addOnBudget.fitsById;");
    expect(PRICE_CARD).toContain("const freeMinutes = addOnBudget.freeMinutes;");
  });
});

/* ------------------------------------------------------------------ */

describe("3 — commercial ledger parity with the checkout basket", () => {
  const ledger = (actions: CommercialLedger["actions"]): CommercialLedger => ({
    anchorTourId: "TOUR-A",
    entries: [],
    actions,
    disposition: "known-price-action-required",
    notes: [],
  });

  it("collapses a repeated add-on action to a single charge", () => {
    const parity = reconcileLedgerWithCheckoutAddOns(
      ledger([{ actionId: "addon:picnic", priceAction: "signature-addon", quantity: 3 }]),
      [],
    );
    expect(parity.actions[0].quantity).toBe(1);
    expect(parity.notes).toContain("addon-quantity-collapsed:addon:picnic:3");
  });

  it("never double-counts an add-on that is both in the route and the basket", () => {
    const parity = reconcileLedgerWithCheckoutAddOns(
      ledger([{ actionId: "addon:picnic", priceAction: "signature-addon", quantity: 1 }]),
      ["picnic", "picnic", "sunset-sail"],
    );
    expect(parity.duplicateAddOnIds).toEqual(["picnic"]);
    expect(parity.unattributedAddOnIds).toEqual(["sunset-sail"]);
    expect(parity.actions.filter((a) => a.actionId === "addon:picnic")).toHaveLength(1);
  });

  it("leaves non add-on actions untouched and sorted", () => {
    const parity = reconcileLedgerWithCheckoutAddOns(
      ledger([
        { actionId: "tailor:extra-winery", priceAction: "extra-winery", quantity: 2 },
        { actionId: "addon:picnic", priceAction: "signature-addon", quantity: 2 },
      ]),
      [],
    );
    expect(parity.actions.map((a) => `${a.actionId}:${a.quantity}`)).toEqual([
      "addon:picnic:1",
      "tailor:extra-winery:2",
    ]);
  });

  it("still fails closed on an unknown anchor", () => {
    const built = buildCommercialLedger({ anchorTourId: "NOT-A-TOUR", kept: [] });
    expect(built.disposition).toBe("commercial-unresolved");
    const parity = reconcileLedgerWithCheckoutAddOns(built, ["picnic"]);
    expect(parity.actions).toEqual([]);
    expect(parity.unattributedAddOnIds).toEqual(["picnic"]);
  });
});
