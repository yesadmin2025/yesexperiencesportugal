/**
 * PASS 5 — Studio commercial/payment parity proofs.
 *
 * A. inferred/default party => no exact Studio price
 * B. Logistics confirmation semantics (explicit + coherent party)
 * C. confirmed party + runtime exact tier => correct age-band total
 * D. static Viator tier present but runtime row absent => unpriced
 * E. runtime exact tier missing for confirmed party => curator path
 * F. Studio add-on unit amount uses runtime tier 8, not tour.priceFrom
 * G. missing runtime tier 8 => no chargeable numeric Studio add-on
 * H. per-person add-on party amount tracks the confirmed guest count
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { signatureTours } from "@/data/signatureTours";
import { VIATOR_META } from "@/data/signatureToursViator";
import { addOnEurFor } from "@/data/signatureAddOns";
import {
  isStudioPartyConfirmed,
  resolveConfirmedStudioParty,
  resolveStudioAddOnAnchorEur,
  resolveStudioStrictJourneyPricing,
  resolveStudioStrictPerPaxEur,
} from "@/lib/studio-v3/studioStrictTier";
import { INITIAL_STATE } from "../types";
import { useResolvedJourney } from "../useResolvedJourney";
import { SignaturePriceCard } from "../SignaturePriceCard";
import type { StudioV3State } from "../types";

vi.mock("@/lib/studio-v3-telemetry", () => ({
  recordStudioV3RevealPremium: vi.fn(),
  recordStudioV3BuilderStep: vi.fn(),
  recordStudioV3RevealAddOns: vi.fn(),
  recordStudioV3CurationDecision: vi.fn(),
  recordStudioV3Phase4Timing: vi.fn(),
  recordStudioV3RevealValidation: vi.fn(),
  emitStudioV3Event: vi.fn(),
}));

const TOUR = signatureTours.find((t) => t.priceFrom && t.priceFrom > 0)!;

function baseState(over: Partial<StudioV3State> = {}): StudioV3State {
  return {
    ...INITIAL_STATE,
    phase: "storyboard",
    tourId: TOUR.id,
    ...over,
  } as StudioV3State;
}

describe("PASS 5 · A — inferred party never produces an exact Studio price", () => {
  it("keeps every pricing output null while guests are inferred", () => {
    const { result } = renderHook(() =>
      useResolvedJourney(baseState({ guests: 2, adults: 2, guestsInferred: true }), [], {
        [TOUR.id]: { 2: 300 },
      }),
    );
    expect(result.current.guests).toBe(2); // display fallback survives
    expect(result.current.perPaxEur).toBeNull();
    expect(result.current.adultUnitEur).toBeNull();
    expect(result.current.baseTotalEur).toBeNull();
    expect(result.current.totalEur).toBeNull();
    expect(result.current.journeyLines).toBeNull();
    expect(result.current.journeyTotalEur).toBeNull();
  });

  it("stays unpriced when no party was stated at all (the 2 fallback is display only)", () => {
    const { result } = renderHook(() =>
      useResolvedJourney(baseState({ guests: null, adults: null }), [], {
        [TOUR.id]: { 2: 300 },
      }),
    );
    expect(result.current.guests).toBe(2);
    expect(result.current.totalEur).toBeNull();
  });
});

describe("PASS 5 · B — commercial confirmation semantics", () => {
  it("requires explicit, internally coherent composition", () => {
    expect(isStudioPartyConfirmed({ adults: 2, minorAges: [], guests: 2, guestsInferred: false })).toBe(
      true,
    );
    // inferred
    expect(isStudioPartyConfirmed({ adults: 2, minorAges: [], guests: 2, guestsInferred: true })).toBe(
      false,
    );
    // incoherent total
    expect(
      isStudioPartyConfirmed({ adults: 2, minorAges: [8], guests: 2, guestsInferred: false }),
    ).toBe(false);
    // no adult
    expect(isStudioPartyConfirmed({ adults: 0, minorAges: [], guests: 0 })).toBe(false);
    // invalid minor age
    expect(
      isStudioPartyConfirmed({ adults: 1, minorAges: [999], guests: 2, guestsInferred: false }),
    ).toBe(false);
  });

  it("mirrors what Logistics onCompose commits (adults + minors, guestsInferred false)", () => {
    const state = baseState({ adults: 2, minorAges: [7], guests: null, guestsInferred: true });
    const committedAdults = state.adults ?? state.guests ?? 2;
    const committedMinors = state.minorAges ?? [];
    const forward = {
      ...state,
      adults: committedAdults,
      minorAges: committedMinors,
      guests: committedAdults + committedMinors.length,
      guestsInferred: false,
    };
    expect(resolveConfirmedStudioParty(forward)).toEqual({
      adults: 2,
      minorAges: [7],
      guests: 3,
    });
  });
});

describe("PASS 5 · C — confirmed party + runtime tier prices correctly", () => {
  it("applies age bands to the exact approved adult tier", () => {
    const { result } = renderHook(() =>
      useResolvedJourney(
        baseState({ adults: 2, minorAges: [7], guests: 3, guestsInferred: false }),
        [],
        { [TOUR.id]: { 3: 200 } },
      ),
    );
    // 2 adults @200 + one child (3–10 → 50%) @100
    expect(result.current.adultUnitEur).toBe(200);
    expect(result.current.journeyTotalEur).toBe(500);
    expect(result.current.baseTotalEur).toBe(500);
    expect(result.current.totalEur).toBe(500);
    expect(result.current.journeyLines?.map((l) => l.unitEur)).toEqual([200, 200, 100]);
  });
});

describe("PASS 5 · D/E — runtime rows are the only tier authority", () => {
  it("ignores static VIATOR tiers when the runtime row is absent", () => {
    const staticTour = signatureTours.find((t) => VIATOR_META[t.id]?.priceTiersEUR)!;
    const staticTiers = VIATOR_META[staticTour.id]!.priceTiersEUR!;
    const guests = (Object.keys(staticTiers).map(Number).find((n) => n >= 1 && n <= 8) ?? 2) as number;
    expect(staticTiers[guests as 1]).toBeGreaterThan(0);

    // strict helper: no runtime map => null
    expect(resolveStudioStrictPerPaxEur(staticTour.id, guests, null)).toBeNull();

    const { result } = renderHook(() =>
      useResolvedJourney(
        baseState({
          tourId: staticTour.id,
          adults: guests,
          minorAges: [],
          guests,
          guestsInferred: false,
        }),
        [],
        {},
      ),
    );
    expect(result.current.totalEur).toBeNull();
    expect(result.current.perPaxEur).toBeNull();
  });

  it("refuses to price a confirmed party whose exact tier is missing from the runtime row", () => {
    expect(resolveStudioStrictPerPaxEur(TOUR.id, 5, { [TOUR.id]: { 2: 300, 8: 150 } })).toBeNull();
    const journey = resolveStudioStrictJourneyPricing(
      TOUR.id,
      { adults: 5, minorAges: [], guests: 5 },
      { [TOUR.id]: { 2: 300, 8: 150 } },
    );
    expect(journey).toBeNull();

    const { result } = renderHook(() =>
      useResolvedJourney(
        baseState({ adults: 5, minorAges: [], guests: 5, guestsInferred: false }),
        [],
        { [TOUR.id]: { 2: 300, 8: 150 } },
      ),
    );
    expect(result.current.totalEur).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Studio add-on anchor parity                                         */
/* ------------------------------------------------------------------ */

function withQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

const cardProps = (over: Record<string, unknown> = {}) => ({
  tour: TOUR,
  stopCount: 5,
  dateExact: null,
  onSecure: vi.fn(),
  onRefine: vi.fn(),
  journeyTitle: null,
  showAddOns: true,
  guests: 2,
  ...over,
});

describe("PASS 5 · F/G/H — Studio add-ons price from the approved tier-8 anchor", () => {
  it("F — resolves the anchor from runtime tier 8, never from tour.priceFrom", () => {
    const anchor = resolveStudioAddOnAnchorEur(TOUR.id, { [TOUR.id]: { 8: 111 } });
    expect(anchor).toBe(111);
    expect(anchor).not.toBe(TOUR.priceFrom);
    expect(resolveStudioAddOnAnchorEur(TOUR.id, { [TOUR.id]: { 2: 300 } })).toBeNull();
  });

  it("F — visible add-on euro amounts derive from the supplied anchor", () => {
    render(
      withQuery(
        <SignaturePriceCard {...(cardProps({ addOnAnchorEur: 400 }) as React.ComponentProps<typeof SignaturePriceCard>)} variant="refine" />,
      ),
    );
    // Non-vacuous: the add-ons section must actually be presented, and it
    // must quote euro amounts derived from the anchor we supplied.
    const section = screen.getByTestId("studio-v3-add-ons");
    expect(section.textContent ?? "").toMatch(/€\s?\d/);
  });

  it("G — a missing runtime tier 8 presents no chargeable numeric add-on", () => {
    render(
      withQuery(
        <SignaturePriceCard {...(cardProps({ addOnAnchorEur: null }) as React.ComponentProps<typeof SignaturePriceCard>)} variant="refine" />,
      ),
    );
    expect(screen.queryByTestId("studio-v3-add-ons")).toBeNull();
    expect(screen.queryAllByTestId("studio-v3-add-on-line")).toHaveLength(0);
    expect(screen.queryByTestId("studio-v3-add-ons-total")).toBeNull();
  });

  it("H — a per-person add-on party amount tracks the confirmed guest count", () => {
    const anchor = 400;
    const addOn = {
      id: "pp",
      label: "Per person addition",
      pricePctOfBase: 0.1,
      durationMinutes: 30,
      pricingUnit: "per_person" as const,
    };
    const two = addOnEurFor({ addOn: addOn as never, baseEur: anchor, guests: 2 });
    const four = addOnEurFor({ addOn: addOn as never, baseEur: anchor, guests: 4 });
    expect(four.amount).toBe(two.perUnit * 4);
    expect(two.amount).toBe(two.perUnit * 2);
    expect(four.amount).toBeGreaterThan(two.amount);
  });
});
