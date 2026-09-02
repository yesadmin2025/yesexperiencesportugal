/**
 * SURGICAL RELEASE FIX — Studio embedded checkout contract.
 *
 * 1. The Stripe Checkout Session for the Studio flow must use the CURRENT
 *    API enum (`"hosted" | "embedded" | "custom"`). The legacy, undocumented
 *    `"embedded_page"` value must never come back.
 * 2. The embedded branch must keep the `return_url` + client-secret handoff
 *    (never `success_url`), and the response must carry `clientSecret`,
 *    `sessionId` and a publishable `pk_...` key.
 * 3. Pricing / date / commercial validation must stay in place.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FN = readFileSync("supabase/functions/create-signature-checkout/index.ts", "utf8");

describe("create-signature-checkout · embedded ui_mode", () => {
  it("never sends the legacy embedded_page enum", () => {
    expect(FN).not.toContain("embedded_page");
  });

  it("sends the current embedded enum on the embedded branch", () => {
    const at = FN.indexOf('if (uiMode === "embedded") {');
    expect(at).toBeGreaterThan(-1);
    const branch = FN.slice(at, at + 400);
    expect(branch).toContain('sessionParams.ui_mode = "embedded";');
    expect(branch).toContain("sessionParams.return_url");
    expect(branch).toContain("{CHECKOUT_SESSION_ID}");
    expect(branch).not.toContain("sessionParams.success_url");
  });

  it("resolves uiMode from the request without widening the enum", () => {
    expect(FN).toContain(
      'const uiMode: "hosted" | "embedded" = body.uiMode === "embedded" ? "embedded" : "hosted";',
    );
  });

  it("returns clientSecret, sessionId and a publishable pk_ key", () => {
    expect(FN).toContain("clientSecret: (session as { client_secret?: string }).client_secret");
    expect(FN).toContain("sessionId: session.id");
    expect(FN).toContain('rawPublishable.startsWith("pk_") ? rawPublishable : ""');
  });

  it("keeps pricing, date and commercial validation intact", () => {
    expect(FN).toContain("resolveTourOperatingRules");
    expect(FN).toContain("isAddOnStructurallyEligible");
    expect(FN).toContain("price_source");
  });
});
