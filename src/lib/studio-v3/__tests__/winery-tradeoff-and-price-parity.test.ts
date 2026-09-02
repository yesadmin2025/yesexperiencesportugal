/**
 * P0-1 / P0-2 — 4th-winery trade-off and one composed-supplement authority.
 *
 * P0-1: the server sells the 4th winery ONLY when the payload proves, with
 * stable structural ids from its own whitelist, that a real moment was traded
 * away. Booleans, euro amounts, invented ids and duplicates prove nothing.
 *
 * P0-2: the composed supplement is counted from STRUCTURAL identity, never
 * from the generic public labels, and one value feeds Your Day, the Guest
 * Details quote, the local Checkout Summary and the Stripe payload count.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  serverExtraWineriesAllowed,
  serverTailorSupplementsEur,
  serverWineryTradeOffCount,
  TAILOR_WINERY_ENTITLEMENT,
} from "../../../../supabase/functions/_shared/pricing";
import {
  studioComposedSupplementFromMoments,
  studioExtraWineryCountFromMoments,
  studioStructuralWineryCount,
  studioTradedBlueprintStopIds,
} from "@/components/studio-v3/studioWineryPresentation";
import { resolveStudioStrictJourneyPricing } from "@/lib/studio-v3/studioStrictTier";
import { tailorRules } from "@/data/tailorRules";
import { TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR } from "@/config/pricing";

const TOUR = "arrabida-wine-allinclusive";
const TIERS = { [TOUR]: { 1: 400, 2: 300, 3: 260, 4: 240, 5: 220, 6: 210, 7: 205, 8: 200 } };

const winery = (id: string, label: string) => ({ label, blueprintStopId: id });

const CORE = [
  { label: "Mercado do Livramento", blueprintStopId: "livramento" },
  { label: "Parque Natural da Arrábida", blueprintStopId: "arrabida-park" },
  { label: "Azulejos de Azeitão tile factory", blueprintStopId: "azeitao-tiles" },
  { label: "Long lunch in Azeitão", blueprintStopId: "lunch-azeitao" },
];

describe("server mirrors the approved winery entitlement", () => {
  it("matches the client rules table exactly", () => {
    const client = tailorRules(TOUR).wineries!;
    const server = TAILOR_WINERY_ENTITLEMENT[TOUR]!;
    expect(server.included).toBe(client.included);
    expect(server.max).toBe(client.max);
    expect(server.requiresRemovalFrom).toBe(client.requiresRemovalFrom);
  });
});

describe("P0-1 server-enforced 4th-winery trade-off", () => {
  it("prices the 3rd winery with no trade-off required", () => {
    expect(serverExtraWineriesAllowed(TOUR, 1, undefined)).toBe(1);
  });

  it("REFUSES the 4th winery when nothing was traded away", () => {
    expect(serverExtraWineriesAllowed(TOUR, 2, undefined)).toBeNull();
    expect(serverExtraWineriesAllowed(TOUR, 2, [])).toBeNull();
  });

  it("refuses invented ids and duplicate ids as evidence", () => {
    expect(serverExtraWineriesAllowed(TOUR, 2, ["made-up-stop"])).toBeNull();
    expect(serverWineryTradeOffCount(TOUR, ["livramento", "livramento"])).toBe(1);
    expect(serverWineryTradeOffCount(TOUR, ["nope", "also-nope"])).toBe(0);
  });

  it("allows the 4th winery on proven structural evidence", () => {
    expect(serverExtraWineriesAllowed(TOUR, 2, ["azeitao-tiles"])).toBe(2);
    // Trade-off evidence does NOT have to earn the −5% principal credit.
    expect(serverExtraWineriesAllowed(TOUR, 2, ["arrabida-park"])).toBe(2);
  });

  it("clamps a tampered count to the approved entitlement", () => {
    expect(serverExtraWineriesAllowed(TOUR, 99, ["livramento"])).toBe(2);
    expect(serverTailorSupplementsEur(TOUR, false, 99)).toBe(
      2 * TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR,
    );
  });
});

describe("P0-2 structural commercial identity", () => {
  it("counts distinct wineries by structural id, not by generic public label", () => {
    const generic = [
      winery("jmf", "A local winery"),
      winery("bacalhoa", "A second local winery"),
      winery("catralvos", "A third local winery"),
    ];
    expect(studioStructuralWineryCount(generic)).toBe(3);
    expect(studioExtraWineryCountFromMoments(TOUR, generic)).toBe(1);
    expect(studioComposedSupplementFromMoments(TOUR, generic)).toBe(
      TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR,
    );
  });

  it("charges nothing inside the included baseline", () => {
    const day = [...CORE, winery("jmf", "A local winery"), winery("bacalhoa", "A second local winery")];
    expect(studioComposedSupplementFromMoments(TOUR, day)).toBe(0);
    expect(studioTradedBlueprintStopIds(TOUR, day)).toEqual([]);
  });

  it("reports the traded blueprint moments when a 4th winery is composed", () => {
    const day = [
      CORE[0]!,
      CORE[1]!,
      winery("jmf", "A local winery"),
      winery("bacalhoa", "A second local winery"),
      winery("catralvos", "A third local winery"),
      winery("piloto", "A fourth local winery"),
    ];
    expect(studioExtraWineryCountFromMoments(TOUR, day)).toBe(2);
    const traded = studioTradedBlueprintStopIds(TOUR, day);
    expect(traded.length).toBeGreaterThan(0);
    // Every id must be accepted by the independent server whitelist.
    expect(serverWineryTradeOffCount(TOUR, traded)).toBeGreaterThanOrEqual(1);
    expect(serverExtraWineriesAllowed(TOUR, 2, traded)).toBe(2);
  });
});

describe("P0-2 local totals equal server arithmetic (2 adults)", () => {
  const party = { adults: 2, minorAges: [], guests: 2 } as const;
  const serverTotal = (extra: number) => {
    const supplement = serverTailorSupplementsEur(TOUR, false, extra);
    return 2 * (300 + supplement);
  };

  it("baseline / 2 wineries", () => {
    const day = [...CORE, winery("jmf", "A local winery"), winery("bacalhoa", "A second local winery")];
    const supplement = studioComposedSupplementFromMoments(TOUR, day);
    const priced = resolveStudioStrictJourneyPricing(TOUR, party, TIERS, supplement);
    expect(priced?.totalEur).toBe(serverTotal(0));
  });

  it("3 wineries", () => {
    const day = [
      ...CORE,
      winery("jmf", "A local winery"),
      winery("bacalhoa", "A second local winery"),
      winery("catralvos", "A third local winery"),
    ];
    const supplement = studioComposedSupplementFromMoments(TOUR, day);
    const priced = resolveStudioStrictJourneyPricing(TOUR, party, TIERS, supplement);
    expect(priced?.totalEur).toBe(serverTotal(1));
  });

  it("4 wineries with a proven trade-off", () => {
    const day = [
      CORE[0]!,
      CORE[1]!,
      winery("jmf", "A local winery"),
      winery("bacalhoa", "A second local winery"),
      winery("catralvos", "A third local winery"),
      winery("piloto", "A fourth local winery"),
    ];
    const supplement = studioComposedSupplementFromMoments(TOUR, day);
    const extra = studioExtraWineryCountFromMoments(TOUR, day);
    const traded = studioTradedBlueprintStopIds(TOUR, day);
    expect(serverExtraWineriesAllowed(TOUR, extra, traded)).toBe(extra);
    const priced = resolveStudioStrictJourneyPricing(TOUR, party, TIERS, supplement);
    expect(priced?.totalEur).toBe(serverTotal(extra));
  });
});


describe("P0-1/P0-2 the client never prices this action", () => {
  const CHECKOUT_FN = readFileSync("supabase/functions/create-signature-checkout/index.ts", "utf8");
  const STUDIO = readFileSync("src/components/studio-v3/StudioV3.tsx", "utf8");
  const JOURNEY = readFileSync("src/components/studio-v3/useResolvedJourney.ts", "utf8");

  it("sends a COUNT and structural ids only - no euro amount for the supplement", () => {
    expect(STUDIO).toContain("tailorExtraWineries: composedExtraWineries");
    expect(STUDIO).toContain("tradedStopIds,");
    expect(STUDIO).not.toMatch(/tailorSupplementEur|composedSupplementEur:/);
  });

  it("re-derives the euro supplement server-side from its own approved table", () => {
    expect(CHECKOUT_FN).toContain("serverExtraWineriesAllowed(");
    expect(CHECKOUT_FN).toContain("serverTailorSupplementsEur(");
    const gateAt = CHECKOUT_FN.indexOf("serverExtraWineriesAllowed(");
    const sessionAt = CHECKOUT_FN.indexOf("checkout.sessions.create");
    expect(gateAt).toBeGreaterThan(-1);
    expect(sessionAt).toBeGreaterThan(gateAt);
  });

  it("ignores any euro value a tampered payload might carry", () => {
    const claimed = 99999;
    expect(serverTailorSupplementsEur(TOUR, false, 1)).toBe(TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR);
    expect(serverTailorSupplementsEur(TOUR, false, 1)).not.toBe(claimed);
  });

  it("feeds Your Day, the Guest Details quote, the Checkout Summary and Stripe from one authority", () => {
    expect(JOURNEY).toContain("studioComposedSupplementFromMoments(");
    expect(JOURNEY).toContain("composedSupplementPerPaxEur: composedSupplementPerPax");
    expect(STUDIO).toContain("resolvedJourney.composedSupplementPerPaxEur");
    expect(STUDIO).toContain("studioComposedSupplementFromMoments(");
    expect(STUDIO).toContain("studioExtraWineryCountFromMoments(tour.id, checkoutStops)");
    expect(STUDIO).not.toMatch(/studioComposedSupplementPerPaxEur\(/);
  });
});
