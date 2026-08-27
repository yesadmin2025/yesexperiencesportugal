import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Dynamic payment methods contract.
 *
 * The shared Signature/Studio/Tailor checkout session factory must NOT pin
 * payment methods in code. Stripe decides eligibility from the Dashboard
 * payment method configuration (Apple Pay, Google Pay, Klarna, Multibanco,
 * MB Way, Revolut Pay, SEPA, PayPal…), filtered by currency, amount, locale
 * and device. Pinning `payment_method_types` or hiding Link removed those
 * rails site-wide, which is the regression this test locks out.
 */

const CHECKOUT_FNS = [
  "supabase/functions/create-signature-checkout/index.ts",
  "supabase/functions/create-builder-checkout/index.ts",
];

const sources = CHECKOUT_FNS.map((p) => ({
  path: p,
  code: readFileSync(resolve(process.cwd(), p), "utf8"),
}));

const executable = (code: string) =>
  code
    .split("\n")
    .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
    .join("\n");

describe("dynamic payment methods", () => {
  it.each(sources)("$path does not pin payment_method_types", ({ code }) => {
    expect(executable(code)).not.toMatch(/payment_method_types\s*:/);
  });

  it.each(sources)("$path does not force-hide Stripe Link", ({ code }) => {
    expect(executable(code)).not.toMatch(/wallet_options\s*:/);
  });

  it.each(sources)("$path does not hardcode individual rails", ({ code }) => {
    const lower = executable(code).toLowerCase();
    for (const rail of ["klarna", "mb_way", "multibanco", "sepa_debit", "revolut_pay", "paypal"]) {
      expect(lower).not.toContain(rail);
    }
  });

  it("keeps the signature session in one-off payment mode", () => {
    expect(sources[0].code).toContain('mode: "payment"');
  });

  it("keeps Stripe session-id return continuity", () => {
    expect(sources[0].code).toContain("session_id={CHECKOUT_SESSION_ID}");
    expect(sources[0].code).not.toContain('redirect_on_completion: "never"');
  });

  it("keeps server-authoritative pricing (no client amount trusted)", () => {
    // The builder function computes price from routing rules, never from body.
    expect(sources[1].code).toContain("amountInCents is no longer accepted from the client");
    // The signature function derives line items from server-side band pricing.
    expect(sources[0].code).toContain("unit_amount: Math.round(");
  });

  it("no site checkout entry point requests a restricted payment method set", () => {
    const callers = [
      "src/components/studio-v3/StudioV3.tsx",
      "src/components/studio-v3/LivingAtlasBookingStep.tsx",
      "src/components/SimpleBookingForm.tsx",
      "src/routes/tours_.$tourId.tailor.tsx",
    ];
    for (const file of callers) {
      const code = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(code).toContain('invoke("create-signature-checkout"');
      expect(code).not.toMatch(/payment_method_types/);
      expect(code).not.toMatch(/wallet_options/);
      // No client-side card-restricted Elements integration.
      expect(code).not.toMatch(/CardElement|CardNumberElement/);
    }
  });

  it("does not imply card-only in traveller-facing checkout copy", () => {
    const ui = readFileSync(
      resolve(process.cwd(), "src/components/studio-v3/CheckoutSummary.tsx"),
      "utf8",
    );
    for (const token of ["Pay by card", "Card only", "card only"]) {
      expect(ui).not.toContain(token);
    }
    expect(ui).toContain("Secure checkout");
  });
});
