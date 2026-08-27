/**
 * Regression: the SAME included lunch may never earn two credits.
 *
 * Arrábida Wine includes lunch. Removing it is a flat −€15 pp credit and is
 * explicitly NOT a principal-stop removal, so it must never also trigger the
 * universal −5% ladder — client-side or server-side.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tailorAdjustedPerPax, tailorFinalPerPax } from "@/config/pricing";
import {
  TAILOR_DEDICATED_LUNCH_STOP_ID,
  dedicatedLunchStopId,
  lunchRemovalEur,
  principalRemovalCount,
} from "@/data/tailorRules";
import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";
import {
  TAILOR_DEDICATED_LUNCH_STOP_ID as SERVER_LUNCH_STOP_ID,
  serverPrincipalRemovalCount,
} from "../../../supabase/functions/_shared/pricing";

const WINE = "arrabida-wine-allinclusive";
const LUNCH = "lunch-azeitao";
const BASE = 135;

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const CHECKOUT_FN = read("supabase/functions/create-signature-checkout/index.ts");
const TAILOR_ROUTE = read("src/routes/tours_.$tourId.tailor.tsx");

describe("dedicated lunch stop is not a principal removal", () => {
  it("points at the real core lunch stop in the blueprint", () => {
    expect(dedicatedLunchStopId(WINE)).toBe(LUNCH);
    const core = TAILOR_BLUEPRINTS[WINE]?.core ?? [];
    expect(core.some((s) => s.id === LUNCH && s.category === "lunch")).toBe(true);
  });

  it("excludes the lunch stop from the −5% ladder count", () => {
    expect(principalRemovalCount(WINE, [LUNCH])).toBe(0);
    expect(principalRemovalCount(WINE, [LUNCH, "azeitao-tiles"])).toBe(1);
    expect(principalRemovalCount(WINE, ["azeitao-tiles", "arrabida-park"])).toBe(2);
  });

  it("still counts lunch stops on Signatures without the dedicated credit", () => {
    // Lunch is excluded from the price on these — removing the stop is an
    // ordinary principal removal and stays worth −5%.
    expect(dedicatedLunchStopId("azeitao-cheese")).toBeNull();
    expect(principalRemovalCount("azeitao-cheese", [LUNCH])).toBe(1);
  });

  it("charges exactly one credit when only the lunch is removed", () => {
    const principals = principalRemovalCount(WINE, [LUNCH]);
    const credit = lunchRemovalEur(WINE, true);
    expect(credit).toBe(15);
    const final = tailorFinalPerPax(BASE, principals, 0, credit);
    expect(final).toBe(BASE - 15);
    // Proof of no double credit: the −5% ladder never engaged.
    expect(tailorAdjustedPerPax(BASE, principals)).toBe(BASE);
  });

  it("still honours a real second removal alongside the lunch credit", () => {
    const principals = principalRemovalCount(WINE, [LUNCH, "azeitao-tiles"]);
    expect(principals).toBe(1);
    const final = tailorFinalPerPax(BASE, principals, 0, lunchRemovalEur(WINE, true));
    expect(final).toBe(tailorAdjustedPerPax(BASE, 1) - 15);
  });
});

describe("server mirrors the same exclusion", () => {
  it("keeps the dedicated lunch stop table in parity", () => {
    expect(SERVER_LUNCH_STOP_ID).toEqual(TAILOR_DEDICATED_LUNCH_STOP_ID);
  });

  it("drops the lunch stop from the server-derived ladder count", () => {
    expect(serverPrincipalRemovalCount(WINE, [LUNCH])).toBe(0);
    expect(serverPrincipalRemovalCount(WINE, [LUNCH, "azeitao-tiles"])).toBe(1);
    expect(serverPrincipalRemovalCount("azeitao-cheese", [LUNCH])).toBe(1);
  });

  it("re-derives the ladder in the edge function and never trusts a higher claim", () => {
    expect(CHECKOUT_FN).toContain("serverPrincipalRemovalCount(body.tourId, skippedCoreStopIds)");
    expect(CHECKOUT_FN).toContain("Math.min(claimedPrincipals, derivedPrincipals)");
    // Stale/tampered clients that omit ids lose one removal instead of
    // double-crediting the lunch.
    expect(CHECKOUT_FN).toContain("Math.max(0, claimedPrincipals - 1)");
  });
});

describe("Tailor route wiring", () => {
  it("counts principals through the exclusion helper", () => {
    expect(TAILOR_ROUTE).toContain("principalRemovalCount(tour.id, skippedCore)");
    expect(TAILOR_ROUTE).not.toMatch(/blueprint \? skippedCore\.size : skipped\.size/);
  });

  it("keeps the stop and the dedicated action as one decision", () => {
    expect(TAILOR_ROUTE).toContain("if (id === dedicatedLunchStopId(tour.id)) setLunchRemoved");
    expect(TAILOR_ROUTE).toContain("toggleIncludedLunch()");
  });

  it("sends stable skipped stop ids to the server", () => {
    expect(TAILOR_ROUTE).toContain("skippedCoreStopIds:");
  });
});
