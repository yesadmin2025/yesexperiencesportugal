import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { toComposableDisplayLines } from "@/components/studio-v3/useResolvedJourney";
import { ComposableLineItems } from "@/components/studio-v3/ComposableLineItems";
import { ChargeSummaryLine } from "@/components/checkout/ChargeSummaryLine";
import {
  composableStopLineFromRow,
  type ComposableStopRow,
} from "@/lib/studio-v3/composableStopAuthority";

// Representative composition: 2 adults, adult unit €203 (base + supplement),
// one owner-priced composed moment at €20 per person.
const row: ComposableStopRow = {
  stopId: "livramento-market",
  region: "arrabida",
  priceCents: 2000,
  pricingUnit: "per_person",
  minGuests: 1,
  active: true,
  notes: null,
  durationMinutes: 60,
  openFrom: "09:00",
  openTo: "18:00",
  fixedStartTimes: [],
  durationOptionsMinutes: [],
  quantityOptions: [],
};

describe("Studio price truth — composed moments itemised identically", () => {
  const guests = 2;
  const journeyTotalEur = 406;
  const line = composableStopLineFromRow(row, guests)!;
  const display = toComposableDisplayLines([line], [
    { label: "Livramento market tasting", inventoryStopId: "livramento-market" },
  ]);
  const composableEur = display.reduce((s, l) => s + l.totalEur, 0);
  const checkoutTotal = Math.round(journeyTotalEur + composableEur);

  it("the composed moment carries quantity and amount", () => {
    expect(line.quantity).toBe(2);
    expect(display[0]).toMatchObject({ label: "Livramento market tasting", unitEur: 20, totalEur: 40 });
  });

  it("summary itemises the same amount the checkout total includes", () => {
    render(<ComposableLineItems lines={display} />);
    const li = screen.getByTestId("studio-v3-composable-line");
    expect(li.getAttribute("data-amount-eur")).toBe("40");
    expect(li.textContent).toContain("× 2");
    expect(journeyTotalEur + Number(li.getAttribute("data-amount-eur"))).toBe(checkoutTotal);
  });

  it("guest-details quote shows the same total and an explicit line", () => {
    render(
      <ChargeSummaryLine
        quote={{
          totalEur: checkoutTotal,
          perPaxAdultEur: 203,
          hasMinors: false,
          adults: 2,
          journeySubtotalEur: journeyTotalEur,
          addOnsEur: 0,
          adjustments: [{ label: "Livramento market tasting (€20 × 2)", amountEur: 40 }],
        }}
      />,
    );
    expect(screen.getByTestId("charge-summary-line").getAttribute("data-total-eur")).toBe(
      String(checkoutTotal),
    );
    fireEvent.click(screen.getByTestId("charge-summary-toggle"));
    expect(document.body.textContent).toContain("Livramento market tasting (€20 × 2)");
  });
});
