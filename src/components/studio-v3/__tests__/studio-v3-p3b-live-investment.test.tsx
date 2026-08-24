// Studio V3 P3B — live investment presentation contract.
//
// These tests lock the *presentation* rules only. No pricing math is
// asserted here beyond "the surface shows exactly what canonical truth
// supplied" — the arithmetic itself is owned by signatureTourPricing /
// useResolvedJourney and covered by their own suites.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { act, fireEvent, render as rtlRender, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignaturePriceCard } from "../SignaturePriceCard";
import { InvestmentDelta, InvestmentLedger, useInvestmentDelta } from "../InvestmentLedger";
import { RunningInvestmentRibbon } from "../RunningInvestmentRibbon";
import { CheckoutSummary } from "../CheckoutSummary";
import { INITIAL_STATE } from "../types";
import { signatureTours } from "@/data/signatureTours";
import { regionBucket } from "@/data/signatureAddOns";
import { resolvePriceChangeFactors } from "../priceChangeFactors";
import { renderHook } from "@testing-library/react";

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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: makeWrapper() });

const src = (rel: string) =>
  readFileSync(resolve(process.cwd(), "src/components/studio-v3", rel), "utf8");

const pricedTour = signatureTours.find((t) => t.priceFrom && t.priceFrom > 0)!;

describe("P3B — RunningInvestmentRibbon truthfulness", () => {
  it("contains no approximate ~€ total and no local party-total math", () => {
    const code = src("RunningInvestmentRibbon.tsx");
    expect(code).not.toMatch(/~€/);
    expect(code).not.toMatch(/priceFromEur\s*\*\s*guests/);
    expect(code).not.toMatch(/toFixed/);
    // No multiplication at all in the ribbon — it only renders supplied numbers.
    expect(code.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/Eur\s*\*\s*/);
  });

  it("shows no numeric total before canonical truth exists", () => {
    render(
      <RunningInvestmentRibbon
        state={{ ...INITIAL_STATE, phase: "who", guests: 4 }}
        totalEur={null}
        adultUnitEur={null}
        guests={4}
      />,
    );
    const line = screen.getByTestId("studio-v3-investment-ribbon-line");
    expect(line.textContent).toBe("Investment takes shape with your day");
    expect(screen.getByTestId("studio-v3-investment-ribbon").dataset.resolved).toBe("false");
  });

  it("renders the canonical supplied total verbatim once resolved", () => {
    render(
      <RunningInvestmentRibbon
        state={{ ...INITIAL_STATE, phase: "storyboard", tourId: pricedTour.id, guests: 4, adults: 4 }}
        totalEur={1234}
        adultUnitEur={309}
        guests={4}
      />,
    );
    const ribbon = screen.getByTestId("studio-v3-investment-ribbon");
    expect(ribbon.dataset.resolved).toBe("true");
    expect(ribbon.dataset.totalEur).toBe("1234");
    expect(screen.getByTestId("studio-v3-investment-ribbon-line").textContent).toContain("€1,234");
  });
});

describe("P3B — live delta", () => {
  it("is null on first render and on same-value rerenders, exact on real change", () => {
    const { result, rerender } = renderHook(({ t }: { t: number | null }) => useInvestmentDelta(t), {
      initialProps: { t: 500 as number | null },
    });
    expect(result.current).toBeNull();
    rerender({ t: 500 });
    expect(result.current).toBeNull();
    act(() => rerender({ t: 620 }));
    expect(result.current).toBe(120);
    act(() => rerender({ t: 540 }));
    expect(result.current).toBe(-80);
    act(() => rerender({ t: null }));
    expect(result.current).toBe(-80); // null side never invents a new delta
  });

  it("auto-clears the delta and cleans its timer on unmount", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender, unmount } = renderHook(
        ({ t }: { t: number | null }) => useInvestmentDelta(t),
        { initialProps: { t: 100 as number | null } },
      );
      act(() => rerender({ t: 300 }));
      expect(result.current).toBe(200);
      act(() => vi.advanceTimersByTime(1800));
      expect(result.current).toBeNull();
      act(() => rerender({ t: 400 }));
      expect(result.current).toBe(100);
      unmount();
      expect(() => vi.advanceTimersByTime(3000)).not.toThrow();
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders nothing when there is no delta", () => {
    const { container } = rtlRender(<InvestmentDelta delta={null} />);
    expect(container.textContent).toBe("");
  });

  it("renders the signed amount when a real delta exists", () => {
    rtlRender(<InvestmentDelta delta={-80} />);
    const el = screen.getByTestId("studio-v3-investment-delta");
    expect(el.textContent).toContain("Updated −€80");
  });
});

describe("P3B — investment ledger", () => {
  it("renders journey + enhancements = total from supplied values only", () => {
    rtlRender(
      <InvestmentLedger baseTotalEur={1200} additionsTotalEur={150} totalEur={1350} />,
    );
    const ledger = screen.getByTestId("studio-v3-investment-ledger");
    expect(ledger.dataset.baseEur).toBe("1200");
    expect(ledger.dataset.additionsEur).toBe("150");
    expect(ledger.dataset.totalEur).toBe("1350");
    expect(screen.getByTestId("studio-v3-ledger-journey").textContent).toBe("€1,200");
    expect(screen.getByTestId("studio-v3-ledger-additions").textContent).toBe("+€150");
    expect(screen.getByTestId("studio-v3-ledger-total").textContent).toBe("€1,350");
  });

  it("omits the enhancements line when nothing is added", () => {
    rtlRender(<InvestmentLedger baseTotalEur={800} additionsTotalEur={0} totalEur={800} />);
    expect(screen.queryByTestId("studio-v3-ledger-additions")).toBeNull();
  });

  it("omits itself entirely rather than infer when inputs are incomplete or inconsistent", () => {
    const a = rtlRender(<InvestmentLedger baseTotalEur={null} additionsTotalEur={0} totalEur={900} />);
    expect(a.queryByTestId("studio-v3-investment-ledger")).toBeNull();
    const b = rtlRender(<InvestmentLedger baseTotalEur={800} additionsTotalEur={50} totalEur={999} />);
    expect(b.queryByTestId("studio-v3-investment-ledger")).toBeNull();
  });
});

describe("P3B — price card surface", () => {
  it("keeps the canonical resolved total as the displayed investment, with a matching ledger", () => {
    render(
      <SignaturePriceCard
        variant="refine"
        tour={pricedTour}
        stopCount={pricedTour.stops?.length ?? 0}
        dateExact={null}
        onSecure={() => {}}
        onRefine={() => {}}
        guests={2}
        resolvedPerPaxEur={pricedTour.priceFrom!}
        resolvedTotalEur={pricedTour.priceFrom! * 2 + 90}
        resolvedBaseTotalEur={pricedTour.priceFrom! * 2}
        resolvedAddOnsTotalEur={90}
        showAddOns={false}
      />,
    );
    const final = screen.getByTestId("studio-v3-final-total");
    expect(Number(final.getAttribute("data-final-eur"))).toBe(pricedTour.priceFrom! * 2 + 90);
    expect(final).toHaveTextContent("Your day, resolved");
    const ledger = screen.getByTestId("studio-v3-investment-ledger");
    expect(Number(ledger.dataset.baseEur) + Number(ledger.dataset.additionsEur)).toBe(
      Number(ledger.dataset.totalEur),
    );
    // Adult unit stays visible and unblended.
    expect(screen.getByTestId("studio-v3-base-price").getAttribute("data-per-pax-eur")).toBe(
      String(pricedTour.priceFrom),
    );
  });

  it("renders only the factors the canonical module returns", () => {
    render(
      <SignaturePriceCard
        variant="refine"
        tour={pricedTour}
        stopCount={pricedTour.stops?.length ?? 0}
        dateExact={null}
        onSecure={() => {}}
        onRefine={() => {}}
        guests={2}
        resolvedPerPaxEur={pricedTour.priceFrom!}
        resolvedTotalEur={pricedTour.priceFrom! * 2}
        resolvedBaseTotalEur={pricedTour.priceFrom! * 2}
        resolvedAddOnsTotalEur={0}
        showAddOns={false}
      />,
    );
    const expected = resolvePriceChangeFactors({ tour: pricedTour, selectedAddOns: [] });
    const node = screen.queryByTestId("studio-v3-investment-factors");
    if (expected.length === 0) {
      expect(node).toBeNull();
      return;
    }
    expect(node!.dataset.factorCount).toBe(String(expected.length));
    fireEvent.click(within(node!).getByRole("button"));
    for (const f of expected) {
      expect(node!.querySelector(`[data-factor-id="${f.id}"]`)).not.toBeNull();
    }
    // Never a date/season factor — the canonical module does not prove one.
    expect(node!.textContent).not.toMatch(/season|date/i);
  });

  it("keeps add-on selection, cap and unit-aware amounts unchanged", () => {
    const tour = signatureTours.find(
      (c) =>
        c.priceFrom &&
        c.priceFrom > 0 &&
        regionBucket(c.region) === "lisbon-arrabida" &&
        c.id !== "wild-beaches-picnic",
    )!;
    const summaries: Array<{ ids: string[]; partyTotalEur: number }> = [];
    function Harness() {
      const [ids, setIds] = useState<string[]>([]);
      return (
        <SignaturePriceCard
          variant="refine"
          tour={tour}
          stopCount={5}
          dateExact={null}
          onSecure={() => {}}
          onRefine={() => {}}
          guests={2}
          selectedAddOnIds={ids}
          onAddOnsChange={(s) => {
            summaries.push({ ids: [...s.ids], partyTotalEur: s.partyTotalEur });
            setIds(s.ids);
          }}
          showAddOns
        />
      );
    }
    render(<Harness />);
    const fieldset = screen.getByTestId("studio-v3-add-ons");
    const buttons = within(fieldset).getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);

    fireEvent.click(buttons[0]);
    expect(buttons[0].getAttribute("aria-pressed")).toBe("true");
    const last = summaries[summaries.length - 1];
    expect(last.ids).toHaveLength(1);
    expect(last.partyTotalEur).toBeGreaterThan(0);

    // Cap: never more than three concurrent selections.
    for (const b of buttons) fireEvent.click(b);
    const pressed = within(fieldset)
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed.length).toBeLessThanOrEqual(3);
  });

  it("uses no box-shadow or hover-lift in the new investment / addition surfaces", () => {
    const code = src("SignaturePriceCard.tsx");
    const ledgerCode = src("InvestmentLedger.tsx");
    // Add-on rows + investment block are hairline surfaces.
    expect(code).toMatch(/addon-chip[\s\S]{0,1200}boxShadow: "none"/);
    expect(code).not.toMatch(/addon-chip[^"]*hover:-translate/);
    expect(ledgerCode).not.toMatch(/boxShadow/);
    expect(ledgerCode).not.toMatch(/hover:-translate/);
  });

  it("introduces no hard-coded hex colours in the changed investment files", () => {
    for (const f of ["InvestmentLedger.tsx", "RunningInvestmentRibbon.tsx"]) {
      expect(src(f)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});

describe("P3B — checkout summary parity", () => {
  it("renders the exact supplied total and add-on amounts without recomputation", () => {
    render(
      <CheckoutSummary
        state={{ ...INITIAL_STATE, tourId: pricedTour.id, dateExact: "2026-09-10" }}
        guestDetails={{
          fullName: "Ana Silva",
          email: "ana@example.com",
          phone: "+351900000000",
          guests: 2,
          adults: 2,
          minorAges: [],
          pickupAddress: "Lisbon",
          language: "en",
          mainContact: "Ana Silva",
          tourDate: "2026-09-10",
        }}
        selectedAddOns={[
          {
            id: "addon-x",
            label: "Private tasting",
            priceEur: 40,
            durationMinutes: 45,
            pricePctOfBase: 0.1,
            perUnit: 40,
            amount: 80,
            unit: "per_person",
            unitLabel: "per guest",
          },
        ]}
        perPaxEur={300}
        totalEur={680}
        adults={2}
        minorAges={[]}
        onEditGuestDetails={() => {}}
        onBack={() => {}}
        onReserve={() => {}}
      />,
    );
    expect(screen.getByTestId("studio-v3-checkout-summary-total").textContent).toContain("€680");
    const line = screen.getByTestId("studio-v3-add-on-line");
    expect(line.getAttribute("data-amount-eur")).toBe("80");
    expect(line.getAttribute("data-per-unit-eur")).toBe("40");
    expect(screen.getByTestId("studio-v3-checkout-summary-reserve")).toBeTruthy();
  });
});
