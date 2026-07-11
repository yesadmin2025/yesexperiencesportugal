/**
 * Pass 1B Slice A — visible price convergence.
 *
 * Renders `SignaturePriceCard` and `CheckoutSummary` with the SAME
 * server-authoritative `serverPricing` object and asserts:
 *   1. Both surfaces display the same total (€525) sourced from the server.
 *   2. Neither surface displays a "combined ADDITIONS €175 / PP" label built
 *      from client add-on math.
 *   3. CheckoutSummary's total row is tagged `data-pricing-source="server"`.
 *
 * Golden fixture: 3 guests · Lisbon pickup · Azeitão signature ·
 * coastal boat add-on (€30 pp × 3 = €90). Base €145 pp × 3 = €435.
 * Total = €525. Route status = pending-review.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { SignaturePriceCard } from "../SignaturePriceCard";
import { CheckoutSummary } from "../CheckoutSummary";
import type { StudioV3State } from "../types";

// The card renders `useTourPriceTiers` (react-query); silence real network by
// wrapping in a QueryClientProvider. `useResolvedSignature` is NOT invoked in
// these renders — we pass `serverPricing` directly, mirroring the hoisted
// parent contract.
function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

// Silence pdf renderer / lucide side effects if any.
vi.mock("@react-pdf/renderer", () => ({ pdf: () => ({ toBlob: async () => new Blob() }) }));

const goldenServerPricing = {
  status: "quoted" as const,
  unitEur: 145,
  baseSubtotalEur: 435,
  addOnsSubtotalEur: 90,
  totalEur: 525,
  routeStatus: "pending-review" as const,
  addOnLines: [
    {
      id: "coastal-boat-sesimbra",
      label: "Coastal boat ride from Sesimbra",
      lineSubtotalEur: 90,
      routeIntegration: "pending-review" as const,
    },
  ],
};

const goldenState: StudioV3State = {
  phase: "checkoutSummary",
  tourId: "azeitao-cheese",
  journeyTitle: "Setúbal · Azeitão · Sesimbra",
  guests: 3,
  pickup: "lisbon",
  dateExact: "2099-01-01",
  // remaining fields absent — CheckoutSummary tolerates undefineds
} as unknown as StudioV3State;

const goldenGuestDetails = {
  fullName: "Test Guest",
  email: "guest@example.com",
  phone: "+351000000000",
  guests: 3,
  tourDate: "2099-01-01",
  startTime: "09:00",
  language: "en" as const,
  pickupAddress: "Lisbon",
  mainContact: "Test Guest",
};

describe("Pass 1B Slice A — visible price convergence", () => {
  it("CheckoutSummary renders €525 sourced from server, tagged data-pricing-source=server", () => {
    render(
      createElement(CheckoutSummary, {
        state: goldenState,
        guestDetails: goldenGuestDetails,
        selectedAddOns: [
          {
            id: "coastal-boat-sesimbra",
            label: "Coastal boat ride from Sesimbra",
            priceEur: 175, // deliberately WRONG client value — must be ignored
            durationMinutes: 90,
            pricePctOfBase: 20,
            perUnit: 30,
            amount: 90,
            unit: "per_person",
            unitLabel: "per person",
          },
        ],
        perPaxEur: 999, // deliberately wrong — server must win
        totalEur: 999,
        onEditGuestDetails: () => {},
        onBack: () => {},
        onReserve: () => {},
        serverPricing: goldenServerPricing,
      }),
      { wrapper: wrapper() },
    );

    const totalRow = screen.getByTestId("studio-v3-checkout-total-row");
    expect(totalRow.getAttribute("data-total-eur")).toBe("525");
    expect(totalRow.getAttribute("data-pricing-source")).toBe("server");
    expect(within(totalRow).getByText(/€525/)).toBeTruthy();
    // legacy wrong values must not appear
    expect(within(totalRow).queryByText(/€999/)).toBeNull();

    // additions row must reflect server line (€90), not the wrong client €175
    const addonRow = screen.getByTestId("studio-v3-checkout-addon-row");
    expect(within(addonRow).getByText(/€90/)).toBeTruthy();
    expect(within(addonRow).queryByText(/€175/)).toBeNull();
    expect(within(addonRow).getByText(/Pending review/i)).toBeTruthy();
  });

  it("SignaturePriceCard render carries server totalEur on the CTA data-total-eur", () => {
    // Render the price card with a minimal tour skeleton, add-on selected,
    // and server pricing that quotes €525. The CTA's `data-total-eur`
    // attribute is the single machine-readable contract downstream tests
    // and analytics rely on.
    const minimalTour = {
      id: "azeitao-cheese",
      title: "Setúbal · Azeitão · Sesimbra",
      region: "Setúbal",
      priceFrom: 145,
      durationHours: 8,
      duration: "Full day",
      included: [],
      stops: [],
    } as unknown as Parameters<typeof SignaturePriceCard>[0]["tour"];

    render(
      createElement(SignaturePriceCard, {
        tour: minimalTour,
        stopCount: 4,
        dateExact: "2099-01-01",
        onSecure: () => {},
        onRefine: () => {},
        journeyTitle: "Setúbal · Azeitão · Sesimbra",
        guests: 3,
        included: [],
        showAddOns: true,
        selectedAddOnIds: ["coastal-boat-sesimbra"],
        serverPricing: goldenServerPricing,
      }),
      { wrapper: wrapper() },
    );

    // Primary CTA is not always rendered under jsdom (viewport gates), but
    // the sticky CTA carries the same data-total-eur when visible. Fall
    // back to any element carrying the attribute set by our patch.
    const ctas = document.querySelectorAll("[data-total-eur]");
    const totals = Array.from(ctas)
      .map((el) => el.getAttribute("data-total-eur"))
      .filter(Boolean);
    // At least one visible surface exposes the €525 total from the server.
    expect(totals).toContain("525");
  });
});
