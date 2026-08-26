import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Card-only checkout contract.
 *
 * Studio V3 (and every Signature surface that shares the same session
 * factory) must present exactly ONE payment rail: card. This test locks the
 * server-side pin so no dashboard change or future edit can silently
 * reintroduce Klarna, MB Way, bank debits, Link or any other wallet.
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
      expect(edgeFn.toLowerCase()).not.toContain(rail);
    }
  });

  it("does not render a payment-method selector in the Studio checkout UI", () => {
    for (const token of ["PayPal", "MB Way", "Bank transfer", "Cash", "payment method tab"]) {
      expect(checkoutSummary).not.toContain(token);
    }
  });

  it("only reports success from the Stripe embedded onComplete callback", () => {
    // No fabricated success path: onPaymentComplete is reachable solely from
    // the provider callback.
    const completions = checkoutSummary.match(/onPaymentComplete\?\.\(/g) ?? [];
    expect(completions).toHaveLength(1);
    expect(checkoutSummary).toContain("onComplete: () => {");
  });
});
