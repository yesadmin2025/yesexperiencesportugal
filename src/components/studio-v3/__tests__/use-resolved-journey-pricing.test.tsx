import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { signatureTours } from "@/data/signatureTours";
import { INITIAL_STATE } from "../types";
import { useResolvedJourney } from "../useResolvedJourney";

describe("useResolvedJourney pricing", () => {
  it("uses unit-aware add-on party amounts and exposes the effective per-person price", () => {
    const tour = signatureTours.find((candidate) => candidate.priceFrom && candidate.priceFrom > 0)!;
    const guests = 3;
    const addOnPartyAmount = 75;
    const { result } = renderHook(() =>
      useResolvedJourney(
        {
          ...INITIAL_STATE,
          phase: "storyboard",
          tourId: tour.id,
          guests,
          adults: guests,
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
        null,
      ),
    );

    const expectedBase = tour.priceFrom! * guests;
    expect(result.current.totalEur).toBe(expectedBase + addOnPartyAmount);
    expect(result.current.perPaxEur).toBe(
      Math.round((expectedBase + addOnPartyAmount) / guests),
    );
  });
});