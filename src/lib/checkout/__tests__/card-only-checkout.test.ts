import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Card-only checkout contract.
 *
 * Studio V3 (and every Signature surface that shares the same session
 * factory) pins the Stripe session to the card payment method type, so
 * non-card rails (Klarna, MB Way/Multibanco, SEPA/bank debits, PayPal…)
 * cannot be presented, and hides Stripe Link via wallet_options.
 *
 * Scope note: Apple Pay / Google Pay are card wallets that Stripe Checkout
 * may still surface depending on account/browser/device context. This
 * contract does NOT claim they are disabled.
 */

const edgeFn = readFileSync(
  resolve(process.cwd(), "supabase/functions/create-signature-checkout/index.ts"),
  "utf8",
);

const checkoutSummary = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/CheckoutSummary.tsx"),
  "utf8",
);

describe("card-only checkout", () => {
  it("pins the Stripe session to card payments", () => {
    expect(edgeFn).toContain('payment_method_types: ["card"]');
  });

  it("explicitly hides Stripe Link on the session", () => {
    expect(edgeFn).toMatch(/wallet_options:\s*\{\s*link:\s*\{\s*display:\s*"never"\s*\}\s*\}/);
  });

  it("never enables a non-card rail server-side", () => {
    // Comments may name the rails we deliberately exclude; only executable
    // code is scanned.
    const code = edgeFn
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
      .toLowerCase();
    for (const rail of [
      "klarna",
      "paypal",
      "mb_way",
      "multibanco",
      "sepa_debit",
      "bacs_debit",
      "afterpay",
      "affirm",
      "customer_balance",
    ]) {
      expect(code).not.toContain(rail);
    }
  });

  it("does not render a payment-method selector in the Studio checkout UI", () => {
    for (const token of ["PayPal", "MB Way", "Bank transfer", "Cash", "payment method tab"]) {
      expect(checkoutSummary).not.toContain(token);
    }
  });

  it("lets Stripe redirect completion with the real Checkout Session id", () => {
    // Embedded Checkout defaults redirect_on_completion to `always`. The
    // server-authored return_url carries Stripe's template variable, so Stripe
    // substitutes the real session id before booking-confirmed verifies it.
    expect(edgeFn).toContain("session_id={CHECKOUT_SESSION_ID}");
    expect(edgeFn).not.toContain('redirect_on_completion: "never"');
    expect(checkoutSummary).not.toContain("onComplete:");
    expect(checkoutSummary).not.toContain("onPaymentComplete?.(");
  });
});
