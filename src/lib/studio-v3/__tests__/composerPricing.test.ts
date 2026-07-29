import { describe, it, expect } from "vitest";
import { priceComposedJourney, resolveComposerAnchorTour } from "../composerPricing";

describe("composerPricing (Phase D adapter — no UI wiring)", () => {
  it("resolves an anchor tour for every mapped (region, tier)", () => {
    expect(resolveComposerAnchorTour("lisbon-coast", "essential")?.id).toBe("tiles-workshop");
    expect(resolveComposerAnchorTour("lisbon-coast", "signature")?.id).toBe("sintra-cascais");
    expect(resolveComposerAnchorTour("arrabida", "rare")?.id).toBe("arrabida-wine-allinclusive");
    expect(resolveComposerAnchorTour("alentejo", "signature")?.id).toBe("troia-comporta");
  });

  it("returns null when no anchor exists (never invents)", () => {
    expect(resolveComposerAnchorTour("centro", "rare")).toBeNull();
  });

  it("prices a 2-adult journey — perPax + total match Signature engine", () => {
    const priced = priceComposedJourney({
      region: "lisbon-coast",
      budgetTier: "signature",
      adults: 2,
      minorAges: [],
    });
    expect(priced).not.toBeNull();
    expect(priced!.anchorTourId).toBe("sintra-cascais");
    expect(priced!.headcount).toBe(2);
    expect(priced!.perPax.eurPerPax).toBeGreaterThan(0);
    // Total = perPax × 2 (both adults, 100% band).
    expect(priced!.journey.totalEur).toBe(priced!.perPax.eurPerPax * 2);
  });

  it("applies age bands for mixed parties (child = 50%)", () => {
    const priced = priceComposedJourney({
      region: "arrabida",
      budgetTier: "rare",
      adults: 2,
      minorAges: [7],
    });
    expect(priced).not.toBeNull();
    expect(priced!.headcount).toBe(3);
    const adultUnit = priced!.perPax.eurPerPax;
    const expectedChildUnit = Math.round(adultUnit * 0.5);
    expect(priced!.journey.totalEur).toBe(adultUnit * 2 + expectedChildUnit);
  });

  it("returns null for adults < 1", () => {
    expect(
      priceComposedJourney({
        region: "lisbon-coast",
        budgetTier: "signature",
        adults: 0,
        minorAges: [],
      }),
    ).toBeNull();
  });

  it("returns null for out-of-band minor ages (caller must reject checkout)", () => {
    expect(
      priceComposedJourney({
        region: "lisbon-coast",
        budgetTier: "signature",
        adults: 2,
        minorAges: [-1],
      }),
    ).toBeNull();
  });

  it("returns null when the (region, tier) mapping is missing", () => {
    expect(
      priceComposedJourney({
        region: "centro",
        budgetTier: "rare",
        adults: 2,
        minorAges: [],
      }),
    ).toBeNull();
  });
});
