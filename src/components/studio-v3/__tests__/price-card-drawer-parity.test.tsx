// Card + drawer must render identical totals when composition includes minors.
// Regression: card previously did `perPax × headcount` while the drawer used
// `resolveJourneyPricing`, silently overcharging minors on the reveal.

import { describe, it, expect, vi } from "vitest";
import { render as rtlRender, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignaturePriceCard } from "../SignaturePriceCard";
import { signatureTours } from "@/data/signatureTours";
import { resolveJourneyPricing } from "@/data/signatureTourPricing";

vi.mock("@/lib/studio-v3-telemetry", () => ({
  recordStudioV3RevealPremium: vi.fn(),
  recordStudioV3BuilderStep: vi.fn(),
  recordStudioV3RevealAddOns: vi.fn(),
  recordStudioV3CurationDecision: vi.fn(),
  recordStudioV3Phase4Timing: vi.fn(),
  recordStudioV3RevealValidation: vi.fn(),
  emitStudioV3Event: vi.fn(),
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: makeWrapper() });

describe("SignaturePriceCard — age-band parity with drawer", () => {
  const tour = signatureTours.find((t) => t.priceFrom && t.priceFrom > 0)!;

  it("party total uses resolveJourneyPricing when composition includes minors", () => {
    // 2 adults + 1 child (age 8) → child at 50%
    const journey = resolveJourneyPricing(tour, 2, [8], null);
    expect(journey).not.toBeNull();
    const expectedTotal = journey!.totalEur;

    render(
      <SignaturePriceCard
        tour={tour}
        stopCount={tour.stops?.length ?? 0}
        dateExact={null}
        onSecure={() => {}}
        onRefine={() => {}}
        adults={2}
        minorAges={[8]}
        guests={3}
        showAddOns={false}
      />,
    );

    const partyTotal = screen.getByTestId("studio-v3-party-total");
    expect(partyTotal.textContent).toContain(`€${expectedTotal}`);
  });

  it("renders itemised traveller lines with the same labels the drawer uses", () => {
    render(
      <SignaturePriceCard
        tour={tour}
        stopCount={tour.stops?.length ?? 0}
        dateExact={null}
        onSecure={() => {}}
        onRefine={() => {}}
        adults={2}
        minorAges={[8, 1]}
        guests={4}
        showAddOns={false}
      />,
    );
    const lines = screen.getByTestId("studio-v3-journey-lines");
    expect(within(lines).getByText(/Adults/)).toBeInTheDocument();
    expect(within(lines).getByText(/Child \(age 8\)/)).toBeInTheDocument();
    expect(within(lines).getByText(/Infant \(age 1\)/)).toBeInTheDocument();
  });

  it("no itemised lines when composition is adults-only", () => {
    render(
      <SignaturePriceCard
        tour={tour}
        stopCount={tour.stops?.length ?? 0}
        dateExact={null}
        onSecure={() => {}}
        onRefine={() => {}}
        adults={2}
        minorAges={[]}
        guests={2}
        showAddOns={false}
      />,
    );
    expect(screen.queryByTestId("studio-v3-journey-lines")).toBeNull();
  });
});
