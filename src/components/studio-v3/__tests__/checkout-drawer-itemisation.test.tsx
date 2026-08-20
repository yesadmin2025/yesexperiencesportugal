// Drawer contract: total reflects age-band pricing + unit-aware add-ons,
// and itemises adults/minors so the guest sees exactly what's charged.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  BrandedCheckoutDrawer,
  summarizeJourneyLines,
  type CheckoutSummary,
  type CheckoutJourneyLine,
} from "@/components/checkout/BrandedCheckoutDrawer";

// Stripe wrappers are not exercised here — the drawer renders the summary
// even when clientSecret is null (skeleton path). Silence loadStripe.
vi.mock("@stripe/stripe-js/pure", () => ({ loadStripe: () => Promise.resolve(null) }));
vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckoutProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  EmbeddedCheckout: () => <div data-testid="stripe-embedded" />,
}));
vi.mock("@/components/ui/CredentialStrip", () => ({
  CredentialStrip: () => <div />,
}));

function baseSummary(overrides: Partial<CheckoutSummary> = {}): CheckoutSummary {
  return {
    tourTitle: "Test Tour",
    guests: 2,
    ...overrides,
  };
}

describe("summarizeJourneyLines", () => {
  it("groups adults and lists minors individually with age", () => {
    const lines: CheckoutJourneyLine[] = [
      { kind: "adult", band: "adult", age: null, unitEur: 200, qty: 1 },
      { kind: "adult", band: "adult", age: null, unitEur: 200, qty: 1 },
      { kind: "minor", band: "child", age: 8, unitEur: 100, qty: 1 },
      { kind: "minor", band: "infant", age: 1, unitEur: 0, qty: 1 },
    ];
    const rows = summarizeJourneyLines(lines);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ label: "Adults", qty: 2, unitEur: 200, subtotalEur: 400 });
    expect(rows[1]).toMatchObject({ label: "Child (age 8)", qty: 1, subtotalEur: 100 });
    expect(rows[2]).toMatchObject({ label: "Infant (age 1)", qty: 1, subtotalEur: 0 });
  });
});

describe("BrandedCheckoutDrawer summary", () => {
  it("renders per-band traveller rows and derives total from journey lines", () => {
    const summary = baseSummary({
      guests: 3,
      adults: 2,
      minorAges: [8],
      pricePerPaxEur: 200,
      journeyLines: [
        { kind: "adult", band: "adult", age: null, unitEur: 200, qty: 1 },
        { kind: "adult", band: "adult", age: null, unitEur: 200, qty: 1 },
        { kind: "minor", band: "child", age: 8, unitEur: 100, qty: 1 },
      ],
      journeyTotalEur: 500,
    });
    render(
      <BrandedCheckoutDrawer
        open
        onOpenChange={() => {}}
        clientSecret={null}
        publishableKey={null}
        summary={summary}
      />,
    );
    const lines = screen.getByTestId("checkout-drawer-journey-lines");
    expect(within(lines).getByText(/Adults/)).toBeInTheDocument();
    expect(within(lines).getByText(/Child \(age 8\)/)).toBeInTheDocument();
    // Total = 500 (adults 200×2 + child 100). Not 600 (200×3 without banding).
    const total = screen.getByTestId("checkout-drawer-total");
    expect(within(total).getByText("€500")).toBeInTheDocument();
  });

  it("adds unit-aware add-on party total to the journey total", () => {
    const summary = baseSummary({
      guests: 3,
      adults: 2,
      minorAges: [8],
      pricePerPaxEur: 200,
      journeyLines: [
        { kind: "adult", band: "adult", age: null, unitEur: 200, qty: 1 },
        { kind: "adult", band: "adult", age: null, unitEur: 200, qty: 1 },
        { kind: "minor", band: "child", age: 8, unitEur: 100, qty: 1 },
      ],
      journeyTotalEur: 500,
      addOns: [
        {
          id: "wine",
          label: "Wine flight",
          priceEur: 40,
          durationMinutes: 30,
          perUnit: 40,
          amount: 120, // 40 × 3 guests (per_person)
          unit: "per_person",
          unitLabel: "per guest",
        },
      ],
      addOnsPartyTotalEur: 120,
    });
    render(
      <BrandedCheckoutDrawer
        open
        onOpenChange={() => {}}
        clientSecret={null}
        publishableKey={null}
        summary={summary}
      />,
    );
    const total = screen.getByTestId("checkout-drawer-total");
    // 500 (journey) + 120 (party add-on total) = 620.
    expect(within(total).getByText("€620")).toBeInTheDocument();
  });

  it("falls back to pricePerPaxEur × guests when no journey lines (adults-only)", () => {
    const summary = baseSummary({
      guests: 2,
      pricePerPaxEur: 180,
    });
    render(
      <BrandedCheckoutDrawer
        open
        onOpenChange={() => {}}
        clientSecret={null}
        publishableKey={null}
        summary={summary}
      />,
    );
    const total = screen.getByTestId("checkout-drawer-total");
    expect(within(total).getByText("€360")).toBeInTheDocument();
  });
});
