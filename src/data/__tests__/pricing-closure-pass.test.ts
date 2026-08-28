/**
 * FINAL PRICING CLOSURE PASS regressions.
 *
 * Covers the four proven defects closed in this pass:
 *   1. Fail-closed principal removal (no stable ids => 0 credit)
 *   2. `needs-owner-review` earns no money
 *   3. Server-authoritative add-on identity (label + duration + price)
 *   4. No Tailor post-payment "within 2 hours" / pending-review copy
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  SIGNATURE_ADD_ON_CATALOG,
  TAILOR_PRINCIPAL_ELIGIBLE_STOP_IDS,
  serverAddOnLine,
  serverPrincipalRemovalCount,
} from "../../../supabase/functions/_shared/pricing.ts";
import {
  TAILOR_CORE_STOP_PRICING,
  classEarnsPrincipalCredit,
  classifyTailorCoreStop,
} from "../tailorStopPricing";
import { principalEligibleStopIds } from "../tailorRules";

const CHECKOUT_SRC = readFileSync(
  resolve(process.cwd(), "supabase/functions/create-signature-checkout/index.ts"),
  "utf8",
);

const WINE = "arrabida-wine-allinclusive";

describe("1. fail-closed principal removal", () => {
  it("counts nothing when no stable skipped ids are supplied", () => {
    expect(serverPrincipalRemovalCount(WINE, [])).toBe(0);
  });

  it("checkout never uses claimed principalsRemoved as price authority", () => {
    // The derived count is 0 unless stable ids are present.
    expect(CHECKOUT_SRC).toMatch(
      /skippedCoreStopIds && skippedCoreStopIds\.length > 0\s*\?\s*Math\.min\(8, serverPrincipalRemovalCount/,
    );
    expect(CHECKOUT_SRC).toMatch(/:\s*0;/);
    // Claimed value survives only as an upper bound.
    expect(CHECKOUT_SRC).toContain(
      "Math.min(claimedPrincipals, derivedPrincipals)",
    );
  });

  it("ignores invented ids", () => {
    expect(serverPrincipalRemovalCount(WINE, ["not-a-stop", "also-fake"])).toBe(0);
  });

  it("counts duplicate ids once", () => {
    expect(serverPrincipalRemovalCount(WINE, ["livramento", "livramento"])).toBe(1);
  });

  it("still credits explicitly classified principal ids", () => {
    expect(serverPrincipalRemovalCount(WINE, ["livramento", "azeitao-tiles"])).toBe(2);
  });

  it("never credits the dedicated Arrábida lunch through the ladder", () => {
    expect(serverPrincipalRemovalCount(WINE, ["lunch-azeitao"])).toBe(0);
    expect(TAILOR_PRINCIPAL_ELIGIBLE_STOP_IDS[WINE]).not.toContain("lunch-azeitao");
  });
});

describe("2. needs-owner-review earns no money", () => {
  it("classEarnsPrincipalCredit is true only for principal", () => {
    expect(classEarnsPrincipalCredit("principal")).toBe(true);
    for (const cls of ["descriptive", "locked", "dedicated-credit", "needs-owner-review"] as const) {
      expect(classEarnsPrincipalCredit(cls)).toBe(false);
    }
  });

  it("server whitelist contains only explicitly classified principal stops", () => {
    for (const [tourId, ids] of Object.entries(TAILOR_PRINCIPAL_ELIGIBLE_STOP_IDS)) {
      for (const id of ids) {
        const explicit = TAILOR_CORE_STOP_PRICING[tourId]?.[id]?.pricing;
        expect(explicit, `${tourId}/${id}`).toBe("principal");
        expect(classifyTailorCoreStop(tourId, id)).toBe("principal");
      }
    }
  });

  it("client and server eligibility stay in parity", () => {
    for (const tourId of Object.keys(TAILOR_PRINCIPAL_ELIGIBLE_STOP_IDS)) {
      const client = [...principalEligibleStopIds(tourId)].sort();
      const server = [...(TAILOR_PRINCIPAL_ELIGIBLE_STOP_IDS[tourId] ?? [])].sort();
      expect(client, tourId).toEqual(server);
    }
  });

  it("an unreviewed stop earns no reduction", () => {
    // sesimbra-village is needs-owner-review on wild-beaches-picnic.
    expect(classifyTailorCoreStop("wild-beaches-picnic", "sesimbra-village")).toBe(
      "needs-owner-review",
    );
    expect(serverPrincipalRemovalCount("wild-beaches-picnic", ["sesimbra-village"])).toBe(0);
  });
});

describe("3. server-authoritative add-on identity", () => {
  it("owns label, duration and price per approved id", () => {
    const line = serverAddOnLine("azeitao-cheese", 200, 2);
    expect(line).not.toBeNull();
    expect(line!.label).toBe(SIGNATURE_ADD_ON_CATALOG["azeitao-cheese"]!.label);
    expect(line!.durationMinutes).toBe(
      SIGNATURE_ADD_ON_CATALOG["azeitao-cheese"]!.durationMinutes,
    );
    expect(line!.perUnitEur).toBeGreaterThan(0);
  });

  it("a cheap id cannot be paired with a premium label or duration", () => {
    const cheap = serverAddOnLine("roman-ruins-trail", 200, 2)!; // 12%, 45min
    const premium = SIGNATURE_ADD_ON_CATALOG["sintra-detour"]!; // 20%, 120min
    expect(cheap.label).not.toBe(premium.label);
    expect(cheap.durationMinutes).not.toBe(premium.durationMinutes);
    // Checkout derives all three from the catalog line, never from the payload.
    expect(CHECKOUT_SRC).toContain("label: line.label");
    expect(CHECKOUT_SRC).toContain("durationMinutes: line.durationMinutes");
    // The raw payload label/duration are never read.
    expect(CHECKOUT_SRC).not.toContain("a.label.slice(0, 120)");
    expect(CHECKOUT_SRC).not.toContain("Math.round(a.durationMinutes");
  });

  it("rejects unknown ids safely", () => {
    expect(serverAddOnLine("not-an-add-on", 200, 2)).toBeNull();
  });
});

describe("4. Tailor instant-confirmation copy", () => {
  it("has no post-payment pending/review language", () => {
    for (const phrase of [
      "within 2 hours",
      "pending operator review",
      "confirmed by our team",
      "operator review",
    ]) {
      expect(CHECKOUT_SRC.toLowerCase()).not.toContain(phrase.toLowerCase());
    }
  });

  it("uses instant confirmation for the Tailor flow", () => {
    expect(CHECKOUT_SRC).toContain('submit: "Instant confirmation by email."');
    expect(CHECKOUT_SRC).toContain(
      'const tailoredNote = isTailored ? "Instant confirmation by email." : null;',
    );
  });
});
