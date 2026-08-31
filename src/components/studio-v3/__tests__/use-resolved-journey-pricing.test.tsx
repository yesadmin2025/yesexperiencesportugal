import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { signatureTours } from "@/data/signatureTours";
import { INITIAL_STATE } from "../types";
import { useResolvedJourney } from "../useResolvedJourney";

describe("useResolvedJourney pricing", () => {
  it("uses unit-aware add-on party amounts and exposes the effective per-person price", () => {
    const tour = signatureTours.find(
      (candidate) => candidate.priceFrom && candidate.priceFrom > 0,
    )!;
    const guests = 3;
    const perPax = 220;
    const addOnPartyAmount = 75;
    const { result } = renderHook(() =>
      useResolvedJourney(
        {
          ...INITIAL_STATE,
          phase: "storyboard",
          tourId: tour.id,
          guests,
          adults: guests,
          guestsInferred: false,
        },
        [
          {
            id: "group-addon",
            label: "Private addition",
            priceEur: 25,
            durationMinutes: 30,
            pricePctOfBase: 0.1,
            perUnit: addOnPartyAmount,
            amount: addOnPartyAmount,
            unit: "per_group",
            unitLabel: "per group",
          },
        ],
        // PASS 5 — pricing comes only from the approved runtime tier rows.
        { [tour.id]: { 3: perPax } },
      ),
    );

    expect(result.current.totalEur).toBe(perPax * guests + addOnPartyAmount);
    // perPaxEur is the real adult unit price (never a blended
    // total/guests average that matches nothing the traveller pays).
    expect(result.current.perPaxEur).toBe(perPax);
    expect(result.current.adultUnitEur).toBe(result.current.perPaxEur);
  });
});
