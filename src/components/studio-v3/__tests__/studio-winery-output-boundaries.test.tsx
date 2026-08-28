/**
 * Customer-output winery privacy audit.
 *
 * A named supplier is an operational assignment candidate, never customer
 * truth. These regressions use REAL named labels from the Signature catalog
 * and Tailor blueprints and prove none of them can reach a customer-visible
 * surface: unified Your Day timeline, checkout summary stops, the standalone
 * FinalRevealStory narrative, and the Signature Story email snapshot.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UnifiedYourDayRoute } from "../UnifiedYourDayRoute";
import { FinalRevealStory } from "../FinalRevealStory";
import { buildSignatureStorySnapshot, buildJourneyRevision } from "../signatureStorySnapshot";
import { buildWineryDisplayLabels, studioDisplayLabel } from "../studioWineryPresentation";
import type { StudioV3State } from "../types";

/** Actual supplier labels present in the catalog / blueprints. */
const NAMED_SUPPLIERS = [
  "House & Museum José Maria Da Fonseca",
  "Quinta do Piloto",
  "Farm Catralvos",
  "Bacalhoa Vinhos de Portugal",
  "Herdade Da Comporta",
  "Adega Cartuxa",
  "Ervideira",
  "Mestre Daniel",
] as const;

/** Wine-adjacent moments that are NOT winery suppliers. */
const NON_WINERY = [
  "Mercado do Livramento",
  "A long lunch by the water",
  "Centro Interpretativo do Vinho de Talha",
  "Azeitão village",
] as const;

const expectNoSupplierLeak = (text: string) => {
  for (const name of NAMED_SUPPLIERS) {
    expect(text).not.toContain(name);
  }
};

const baseState = (stops: ReadonlyArray<{ label: string; story: string }>): StudioV3State =>
  ({
    phase: "storyboard",
    tourId: "arrabida-setubal-azeitao",
    destinationIntent: "arrabida-setubal-azeitao",
    feeling: "wine-food",
    interests: [],
    rhythm: null,
    refinement: null,
    pickup: "lisbon",
    guests: 2,
    dateExact: "2026-09-12",
    editedRoutePoints: stops.map((s) => ({ ...s })),
  }) as unknown as StudioV3State;

describe("winery presentation — customer output boundaries", () => {
  it("maps every real named supplier to a generic label, preserving count and order", () => {
    const labels = buildWineryDisplayLabels(NAMED_SUPPLIERS.map((label) => ({ label })));
    const mapped = NAMED_SUPPLIERS.map((l) => studioDisplayLabel(l, labels));
    expect(mapped).toHaveLength(NAMED_SUPPLIERS.length);
    expectNoSupplierLeak(mapped.join(" | "));
    for (const m of mapped) expect(m).toMatch(/local winery/i);
  });

  it("leaves non-winery wine moments untouched", () => {
    const labels = buildWineryDisplayLabels(NON_WINERY.map((label) => ({ label })));
    for (const l of NON_WINERY) expect(studioDisplayLabel(l, labels)).toBe(l);
  });

  it("unified Your Day timeline shows no supplier name", () => {
    const moments = NAMED_SUPPLIERS.map((label, i) => {
      const labels = buildWineryDisplayLabels(NAMED_SUPPLIERS.map((l) => ({ label: l })));
      return {
        label: studioDisplayLabel(label, labels),
        story: null,
        // one missing coordinate → timeline mode, same moments and order
        lat: i === 0 ? null : 38.5,
        lng: i === 0 ? null : -9.0,
      };
    });
    const { container } = render(<UnifiedYourDayRoute moments={moments} mapSlot={<div />} />);
    expect(container.getAttribute("data-route-mode") ?? "").not.toBe("map");
    expectNoSupplierLeak(container.textContent ?? "");
  });

  it("standalone FinalRevealStory narrative sanitises labels and story text", () => {
    const stops = [
      {
        label: "House & Museum José Maria Da Fonseca",
        story: "A cellar tour at House & Museum José Maria Da Fonseca, then Moscatel.",
      },
      { label: "Quinta do Piloto", story: "Tasting at Quinta do Piloto." },
      { label: "Mercado do Livramento", story: "The fish market at its loudest." },
    ];
    render(
      <FinalRevealStory
        variant="standalone"
        state={baseState(stops)}
        selectedAddOns={[]}
        perPaxEur={280}
        totalEur={560}
        onContinue={() => {}}
        onSaveSignature={() => {}}
        onBack={() => {}}
      />,
    );
    const text = document.body.textContent ?? "";
    expectNoSupplierLeak(text);
    expect(text).toContain("Mercado do Livramento");
  });

  it("Signature Story email snapshot keeps route order/count but no supplier names", () => {
    const stops = [
      {
        label: "House & Museum José Maria Da Fonseca",
        story: "Barrel room at House & Museum José Maria Da Fonseca.",
      },
      { label: "Quinta do Piloto", story: "Moscatel at Quinta do Piloto." },
      { label: "Mercado do Livramento", story: "Market morning." },
    ];
    const state = baseState(stops);
    const snap = buildSignatureStorySnapshot(state);
    expect(snap.chapters).toHaveLength(stops.length);
    expect(snap.chapters[2].title).toBe("Mercado do Livramento");
    const text = snap.chapters.map((c) => `${c.title} ${c.body}`).join(" ");
    expectNoSupplierLeak(text);
    expect(snap.chapters[0].title).toMatch(/local winery/i);

    // Idempotency unaffected: the revision hashes canonical identity.
    expect(buildJourneyRevision(state)).toBe(buildJourneyRevision(state));
  });

  it("checkout summary stop labels are genericised while order is preserved", async () => {
    const { CheckoutSummary } = await import("../CheckoutSummary");
    const stops = [
      { label: "House & Museum José Maria Da Fonseca", story: "" },
      { label: "Mercado do Livramento", story: "" },
      { label: "Quinta do Piloto", story: "" },
    ];
    render(
      <CheckoutSummary
        state={baseState(stops)}
        guestDetails={{ guests: 2 } as never}
        selectedAddOns={[]}
        perPaxEur={280}
        totalEur={560}
        onEditGuestDetails={() => {}}
        onBack={() => {}}
        onReserve={() => {}}
      />,
    );
    const list = screen.getByTestId("studio-v3-checkout-summary-stops");
    const items = [...list.querySelectorAll("li")].map((li) => li.textContent ?? "");
    expect(items).toHaveLength(3);
    expect(items[1]).toContain("Mercado do Livramento");
    expectNoSupplierLeak(items.join(" "));
  });
});
