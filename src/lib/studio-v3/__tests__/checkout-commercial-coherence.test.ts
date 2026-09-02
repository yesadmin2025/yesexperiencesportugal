/**
 * LIVE COHERENCE — the authored day, its add-ons and the commercial state
 * must stay in sync all the way into checkout.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { evaluateCandidateFit } from "@/lib/studio-v3/candidateFit";
import {
  resolveCheckoutCommercialState,
} from "@/lib/studio-v3/checkoutCommercialState";
import type { CommercialLedger } from "@/lib/studio-v3/commercialLedger";

const STUDIO = readFileSync("src/components/studio-v3/StudioV3.tsx", "utf8");

const day = {
  stops: [
    { label: "Quinta winery tasting", lat: 38.49, lng: -8.89 },
    { label: "Traditional lunch table", lat: 38.48, lng: -8.9 },
    { label: "Cellar visit", lat: 38.47, lng: -8.87 },
    { label: "Azeitão village", lat: 38.51, lng: -9.01 },
    { label: "Portinho beach", lat: 38.47, lng: -8.98 },
  ],
  region: "Setúbal · Arrábida",
};

const ledgerOf = (
  actions: CommercialLedger["actions"],
  disposition: CommercialLedger["disposition"] = "known-price-action-required",
): CommercialLedger => ({
  anchorTourId: "TOUR-A",
  entries: [],
  actions,
  disposition,
  notes: [],
});

/* 1 — add-on minutes can flip a fitting candidate to non-fitting ---------- */

describe("1 — selected add-on minutes are part of the day", () => {
  const candidate = { label: "Serra viewpoint", lat: 38.46, lng: -9.0, durationMinutes: 60 };

  it("a candidate that fits an empty basket stops fitting once add-ons are chosen", () => {
    const withoutAddOns = evaluateCandidateFit({ ...day, addOnsMinutes: 0 }, candidate);
    const withAddOns = evaluateCandidateFit({ ...day, addOnsMinutes: 300 }, candidate);
    expect(withoutAddOns.fits).toBe(true);
    expect(withAddOns.fits).toBe(false);
    expect(withAddOns.reason).toBe("over-day-budget");
    expect(withAddOns.projectedRemainingMin).toBe(0);
  });
});

/* 2 — the live call sites pass the current add-on minutes ---------------- */

describe("2 — add and swap gates read the current basket", () => {
  it("both call sites share one fit input carrying selectedAddOnMinutes", () => {
    expect(STUDIO).toContain("addOnsMinutes: selectedAddOnMinutes");
    expect(STUDIO).toContain("evaluatePoolFit(\n        fitDayInput,");
    expect(STUDIO).toContain("evaluateCandidateFit(\n                        fitDayInput,");
    
    // Recomputed when route, anchor or basket changes — no stale closure.
    expect(STUDIO).toMatch(
      /\[editedStops, skeletonTour, selectedAddOnMinutes[^\]]*\],/,
    );

    expect(STUDIO).toContain("[dayRemainingMinutes, fitDayInput, swapPool]");
  });
});

/* 3 — route + basket duplicate add-on is one charge ---------------------- */

describe("3 — one add-on, one charge", () => {
  it("suppresses a basket add-on already carried by the authored route", () => {
    const state = resolveCheckoutCommercialState({
      ledger: ledgerOf([
        { actionId: "addon:picnic", priceAction: "signature-addon", quantity: 2 },
      ]),
      liveResolution: "composed",
      selectedAddOnIds: ["picnic", "sunset-sail"],
      authoredLabels: day.stops.map((s) => s.label),
    });
    expect(state.suppressedAddOnIds).toEqual(["picnic"]);
    expect(state.chargeableAddOnIds).toEqual(["sunset-sail"]);
    expect(state.actions.find((a) => a.actionId === "addon:picnic")?.quantity).toBe(1);
    expect(state.blocked).toBe(false);
  });

  it("charges normally when there is no structural ledger", () => {
    const state = resolveCheckoutCommercialState({
      selectedAddOnIds: ["picnic", "picnic"],
      authoredLabels: ["A", "B"],
    });
    expect(state.chargeableAddOnIds).toEqual(["picnic"]);
    expect(state.blocked).toBe(false);
  });

  it("only charges the reconciled add-ons at checkout", () => {
    expect(STUDIO).toContain("resolveCheckoutCommercialState({");
    expect(STUDIO).toContain("const chargeableAddOnIds = new Set(commercial.chargeableAddOnIds);");
    expect(STUDIO).toContain(
      "const chargeableAddOnItems = selectedAddOnItems.filter((i) => chargeableAddOnIds.has(i.id));",
    );
    expect(STUDIO).toContain("chargeableAddOnItems.reduce((sum, i) => sum + partyAmountFor(i), 0)");
  });
});

/* 4 — route edits rebuild the commercial state --------------------------- */

describe("4 — no stale commercial state after a route edit", () => {
  it("the composition key changes with the authored route and the basket", () => {
    const base = {
      ledger: ledgerOf([]),
      liveResolution: "composed" as const,
      selectedAddOnIds: ["picnic"],
      authoredLabels: ["A", "B", "C"],
    };
    const edited = { ...base, authoredLabels: ["A", "C"] };
    const rebasket = { ...base, selectedAddOnIds: ["picnic", "sunset-sail"] };
    const a = resolveCheckoutCommercialState(base).compositionKey;
    expect(resolveCheckoutCommercialState(edited).compositionKey).not.toBe(a);
    expect(resolveCheckoutCommercialState(rebasket).compositionKey).not.toBe(a);
    // Deterministic for identical input.
    expect(resolveCheckoutCommercialState(base).compositionKey).toBe(a);
  });

  it("checkout re-derives the ledger from the current state, not a closure", () => {
    expect(STUDIO).toContain("const checkoutResolved = resolveStudioRouteFromState(currentState);");
    expect(STUDIO).toContain("const liveAuthority = rebuildLiveCommercialAuthority({");
    // PASS 1A: the rebuilt ledger is the ONLY source; the earlier resolution
    // is never a fallback for a route that cannot be certified.
    expect(STUDIO).toContain("ledger: liveAuthority.ledger,");
    expect(STUDIO).not.toContain("checkoutResolved.livingAtlasLive?.commercialLedger");

    expect(STUDIO).toContain("authoredLabels: checkoutStops.map((s) => s.label),");
  });
});

/* 5 — unresolved attribution fails closed -------------------------------- */

describe("5 — fail closed before payment", () => {
  it("blocks a composed day whose commercial disposition is unresolved", () => {
    const state = resolveCheckoutCommercialState({
      ledger: ledgerOf([], "commercial-unresolved"),
      liveResolution: "composed",
      selectedAddOnIds: [],
      authoredLabels: ["A", "B"],
    });
    expect(state.blocked).toBe(true);
    expect(state.blockReason).toBe("commercial-unresolved");
  });

  it("blocks an action no approved pricing authority can price", () => {
    const state = resolveCheckoutCommercialState({
      ledger: ledgerOf([
        { actionId: "tailor:mystery", priceAction: "requires-confirmation", quantity: 1 },
      ]),
      liveResolution: "authored-fallback",
      selectedAddOnIds: [],
      authoredLabels: ["A", "B"],
    });
    expect(state.blocked).toBe(true);
    expect(state.blockReason).toBe("unknown-price-action");
  });

  it("blocks an empty composition", () => {
    expect(resolveCheckoutCommercialState({ authoredLabels: [] }).blockReason).toBe(
      "composition-empty",
    );
  });

  it("the live checkout aborts to the curator path when blocked", () => {
    expect(STUDIO).toContain("if (commercial.blocked) {");
    expect(STUDIO).toMatch(/if \(commercial\.blocked\) \{[\s\S]{0,200}returnToPreflight\(/);
  });

  it("never returns a euro amount", () => {
    const state = resolveCheckoutCommercialState({
      ledger: ledgerOf([{ actionId: "addon:picnic", priceAction: "signature-addon", quantity: 1 }]),
      selectedAddOnIds: ["picnic"],
      authoredLabels: ["A", "B"],
    });
    expect(JSON.stringify(state)).not.toMatch(/eur/i);
  });
});

/* 6 — checkout composition is the approved authored route ---------------- */

describe("6 — checkout carries the exact approved composition", () => {
  it("stop labels come from the authoritative route and stay sanitised", () => {
    expect(STUDIO).toContain("resolveAuthoritativeRouteStops({");
    expect(STUDIO).toContain("editedRoutePoints: currentState.editedRoutePoints ?? null,");
    expect(STUDIO).toContain("resolved: checkoutResolved,");
    // Supplier privacy guard must remain on the checkout labels.
    expect(STUDIO).toContain("const checkoutWineryLabels = buildWineryDisplayLabels(checkoutStops)");
    expect(STUDIO).toContain("studioDisplayLabel(s.label, checkoutWineryLabels)");
    expect(STUDIO).toContain("itinerary: stopLabels.map((label) => ({ label })),");
  });
});
