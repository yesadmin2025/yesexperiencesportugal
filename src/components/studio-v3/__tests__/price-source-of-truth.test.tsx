// Validates the public contract that pricing in the Studio V3 reveal
// is sourced from the real Signature catalogue (`signatureTours.priceFrom`)
// and that add-on selections update the per-pp total deterministically.
//
// No invented numbers: the rendered base price MUST equal the price
// declared in `src/data/signatureTours.ts` for that tour id.

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render as rtlRender, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignaturePriceCard } from "../SignaturePriceCard";
import { signatureTours } from "@/data/signatureTours";
import { ADD_ON_CATALOG, addOnEurFromBase, regionBucket } from "@/data/signatureAddOns";

vi.mock("@/lib/studio-v3-telemetry", () => ({
  recordStudioV3RevealPremium: vi.fn(),
  recordStudioV3BuilderStep: vi.fn(),
  recordStudioV3RevealAddOns: vi.fn(),
  recordStudioV3CurationDecision: vi.fn(),
  recordStudioV3Phase4Timing: vi.fn(),
  recordStudioV3RevealValidation: vi.fn(),
  emitStudioV3Event: vi.fn(),
}));

// SignaturePriceCard uses useTourPriceTiers (TanStack Query) — every render
// needs a fresh QueryClientProvider.
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: makeWrapper() });

describe("Studio V3 price card — source-of-truth pricing", () => {
  // Source-of-truth contract: the tour's catalogue `priceFrom` is the
  // immutable anchor and MUST be exposed via `data-eur` /
  // `data-base-price-eur`. The visible per-pp number may be tier-aware
  // (Viator per-guest rates) — that's a legitimate refinement of the
  // anchor, not a violation. We assert the anchor here and let
  // tier-aware tests cover the display.
  it.each(signatureTours.filter((t) => t.priceFrom && t.priceFrom > 0))(
    "$id: exposes catalogue priceFrom (€$priceFrom) as the source-of-truth anchor",
    (tour) => {
      render(
        <SignaturePriceCard
          tour={tour}
          stopCount={tour.stops?.length ?? 0}
          dateExact={null}
          onSecure={() => {}}
          onRefine={() => {}}
          showAddOns={false}
        />,
      );

      const card = screen.getByTestId("studio-v3-price-card");
      expect(card.getAttribute("data-tour-id")).toBe(tour.id);
      expect(card.getAttribute("data-price-source")).toBe("signature");
      expect(card.getAttribute("data-base-price-eur")).toBe(String(tour.priceFrom));

      const base = screen.getByTestId("studio-v3-base-price");
      expect(base.getAttribute("data-eur")).toBe(String(tour.priceFrom));
    },
  );

  it("party total = displayed per-pax × guests when guests ≥ 2", () => {
    const tour = signatureTours.find((t) => t.priceFrom && t.priceFrom > 0)!;
    render(
      <SignaturePriceCard
        tour={tour}
        stopCount={tour.stops?.length ?? 0}
        dateExact={null}
        onSecure={() => {}}
        onRefine={() => {}}
        guests={3}
        showAddOns={false}
      />,
    );
    // The party-total line reflects the *displayed* per-pax rate (which
    // is tier-aware when Viator tiers exist). Read it back from the DOM
    // instead of pinning to the anchor priceFrom.
    const base = screen.getByTestId("studio-v3-base-price");
    const perPax = Number(base.getAttribute("data-per-pax-eur"));
    expect(Number.isFinite(perPax) && perPax > 0).toBe(true);
    const partyTotal = screen.getByTestId("studio-v3-party-total");
    expect(partyTotal.textContent).toContain(`€${perPax * 3}`);
  });

  it("selecting add-ons updates per-pp total by the catalogue % of base", async () => {
    // Pick a Lisbon/Arrábida tour with a long enough duration to expose add-ons.
    const tour = signatureTours.find(
      (t) =>
        t.priceFrom &&
        t.priceFrom > 0 &&
        regionBucket(t.region) === "lisbon-arrabida" &&
        t.id !== "wild-beaches-picnic",
    )!;
    render(
      <SignaturePriceCard
        tour={tour}
        stopCount={5}
        dateExact={null}
        onSecure={() => {}}
        onRefine={() => {}}
        // legacy/admin path that exercises add-on totals
        showAddOns={true}
      />,
    );

    const fieldset = screen.getByTestId("studio-v3-add-ons");
    const buttons = within(fieldset).getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);

    // Click the first available add-on chip
    const firstBtn = buttons[0]!;
    const addonId = firstBtn.getAttribute("data-addon-id")!;
    const addon = ADD_ON_CATALOG["lisbon-arrabida"].find((a) => a.id === addonId)!;
    const expectedDelta = addOnEurFromBase(tour.priceFrom!, addon.pricePctOfBase);

    fireEvent.click(firstBtn);

    const total = screen.getByTestId("studio-v3-add-ons-total");
    expect(total.textContent).toContain(`€${tour.priceFrom! + expectedDelta}`);
  });
});
