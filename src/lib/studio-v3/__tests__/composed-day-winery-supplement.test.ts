/**
 * COMPOSED-DAY COMMERCIAL PARITY.
 *
 * A bespoke Studio day may hold more wineries than the Signature skeleton
 * includes. That extra is the same commercial action Tailor already sells, so
 * it must be priced by the same approved table on both sides:
 *
 *   client  → tailorRules(tourId).wineries.supplementEur
 *   server  → serverTailorSupplementsEur (same constant, same ceiling)
 *
 * These tests prove the client never invents a price, never exceeds the
 * approved entitlement, and folds the supplement into the adult per-pax
 * BEFORE age bands — exactly as `tailorFinalPerPax` does server-side.
 */
import { describe, expect, it } from "vitest";

import {
  studioComposedSupplementPerPaxEur,
  studioExtraWineryCount,
} from "@/components/studio-v3/studioWineryPresentation";
import { resolveStudioStrictJourneyPricing } from "@/lib/studio-v3/studioStrictTier";
import { tailorRules } from "@/data/tailorRules";
import { TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR } from "@/config/pricing";

const TOUR = "arrabida-wine-allinclusive";

/** Real winery labels drawn from the Arrábida wine catalogue. */
const W1 = "Quinta de Catralvos";
const W2 = "Casa Ermelinda Freitas";
const W3 = "Adega de Palmela";
const W4 = "Quinta do Piloto";
const NON_WINERY = "Cabo Espichel";

const TIERS = { [TOUR]: { 1: 400, 2: 300, 3: 260, 4: 240, 5: 220, 6: 210, 7: 205, 8: 200 } };

describe("composed-day extra-winery count", () => {
  it("charges nothing while the day stays inside the Signature baseline", () => {
    const included = tailorRules(TOUR).wineries?.included ?? 0;
    expect(included).toBeGreaterThan(0);
    expect(studioExtraWineryCount(TOUR, [W1, W2, NON_WINERY])).toBe(0);
    expect(studioComposedSupplementPerPaxEur(TOUR, [W1, W2, NON_WINERY])).toBe(0);
  });

  it("clamps the count to the approved entitlement instead of scaling forever", () => {
    const rules = tailorRules(TOUR).wineries!;
    const maxExtra = rules.max - rules.included;
    const supplement = studioComposedSupplementPerPaxEur(TOUR, [W1, W2, W3, W4, W4, W3]);
    expect(supplement).toBe(maxExtra * TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR);
  });

  it("never invents a supplement for a Signature with no winery entitlement", () => {
    expect(studioComposedSupplementPerPaxEur("sintra-cascais", [W1, W2, W3, W4])).toBe(0);
    expect(studioComposedSupplementPerPaxEur(null, [W1, W2, W3])).toBe(0);
  });
});

describe("supplement folds into the adult per-pax before age bands", () => {
  const party = { adults: 2, minorAges: [], guests: 2 } as const;

  it("leaves the baseline day untouched", () => {
    const priced = resolveStudioStrictJourneyPricing(TOUR, party, TIERS, 0);
    expect(priced?.perPaxAdultEur).toBe(300);
    expect(priced?.totalEur).toBe(600);
  });

  it("adds the approved supplement per person, mirroring tailorFinalPerPax", () => {
    const supplement = studioComposedSupplementPerPaxEur(TOUR, [W1, W2, W3]);
    expect(supplement).toBe(TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR);
    const priced = resolveStudioStrictJourneyPricing(TOUR, party, TIERS, supplement);
    expect(priced?.perPaxAdultEur).toBe(300 + TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR);
    expect(priced?.totalEur).toBe(2 * (300 + TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR));
  });

  it("discounts minors off the supplemented adult unit, not the bare tier", () => {
    const supplement = TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR;
    const priced = resolveStudioStrictJourneyPricing(
      TOUR,
      { adults: 2, minorAges: [8], guests: 3 },
      TIERS,
      supplement,
    );
    const adultUnit = 260 + supplement; // 3-pax tier
    expect(priced?.perPaxAdultEur).toBe(adultUnit);
    const minorLine = priced!.lines.find((l) => l.kind === "minor")!;
    expect(minorLine.unitEur).toBeLessThan(adultUnit);
    expect(priced?.totalEur).toBe(2 * adultUnit + minorLine.unitEur);
  });

  it("still fails closed when the approved runtime tier is missing", () => {
    expect(resolveStudioStrictJourneyPricing(TOUR, party, null, 20)).toBeNull();
  });
});
