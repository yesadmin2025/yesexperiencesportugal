// Validates the public contract that pricing in the Studio V3 reveal
// is sourced from the real Signature catalogue (`signatureTours.priceFrom`)
// and that add-on selections update the per-pp total deterministically.
//
// No invented numbers: the rendered base price MUST equal the price
// declared in `src/data/signatureTours.ts` for that tour id.

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SignaturePriceCard } from "../SignaturePriceCard";
import { signatureTours } from "@/data/signatureTours";
import { ADD_ON_CATALOG, addOnEurFromBase, regionBucket } from "@/data/signatureAddOns";

vi.mock("@/lib/studio-v3-telemetry", () => ({
  recordStudioV3RevealPremium: vi.fn(),
  recordStudioV3BuilderStep: vi.fn(),
}));

describe("Studio V3 price card — source-of-truth pricing", () => {
  it.each(signatureTours.filter((t) => t.priceFrom && t.priceFrom > 0))(
    "renders €%s/pp from catalogue for %s",
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
      expect(base.textContent).toContain(`€${tour.priceFrom}`);
    },
  );

  it("party total = base × guests when guests ≥ 2", () => {
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
    const partyTotal = screen.getByTestId("studio-v3-party-total");
    expect(partyTotal.textContent).toContain(`€${tour.priceFrom * 3}`);
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
