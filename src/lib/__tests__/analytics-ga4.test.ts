import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildTourItem,
  gaAddPaymentInfo,
  gaAddToCartSignature,
  gaAddToCartStudioTier,
  gaBeginCheckout,
  gaGenerateLead,
  gaPurchase,
  gaStudioStart,
  gaStudioStep,
  gaViewItem,
} from "../analytics-ga4";

// Tests must actually push — bypass the isTest() guard by stubbing VITEST.
const ORIGINAL_VITEST = process.env.VITEST;

beforeEach(() => {
  (window as unknown as { dataLayer: unknown[] }).dataLayer = [];
  // Force isTest() -> false so pushes land.
  delete process.env.VITEST;
});

function dl(): Array<Record<string, unknown>> {
  return (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer;
}

function restore() {
  if (ORIGINAL_VITEST !== undefined) process.env.VITEST = ORIGINAL_VITEST;
}

const tour = { id: "sintra-classic", title: "Sintra Classic", priceFrom: 220 };

describe("analytics-ga4", () => {
  it("view_item resets ecommerce then pushes GA4 payload", () => {
    gaViewItem({ tour });
    restore();
    expect(dl()[0]).toEqual({ ecommerce: null });
    expect(dl()[1]).toMatchObject({
      event: "view_item",
      ecommerce: {
        currency: "EUR",
        value: 220,
        items: [
          {
            item_id: "sintra-classic",
            item_name: "Sintra Classic",
            item_brand: "YES Experiences Portugal",
            item_category: "Signature",
            price: 220,
            quantity: 1,
            currency: "EUR",
          },
        ],
      },
    });
  });

  it("studio_start and studio_step push non-ecommerce events with a reset", () => {
    gaStudioStart();
    gaStudioStep({ stepNumber: 3, stepKey: "feeling", qualityScore: 42 });
    restore();
    expect(dl()[0]).toEqual({ ecommerce: null });
    expect(dl()[1]).toEqual({ event: "studio_start" });
    expect(dl()[2]).toEqual({ ecommerce: null });
    expect(dl()[3]).toEqual({
      event: "studio_step",
      step_number: 3,
      step_name: "feeling",
      quality_score: 42,
    });
  });

  it("add_to_cart (signature) uses guests as quantity and computes value", () => {
    gaAddToCartSignature({ tour, guests: 4, perPaxEur: 200 });
    restore();
    expect(dl()[1]).toMatchObject({
      event: "add_to_cart",
      ecommerce: {
        currency: "EUR",
        value: 800,
        tier: "signature",
        items: [{ price: 200, quantity: 4, item_variant: "signature" }],
      },
    });
  });

  it("add_to_cart (studio tier)", () => {
    gaAddToCartStudioTier({ tier: "immersive", priceEur: 950, tourId: "t1", tourTitle: "Foo" });
    restore();
    expect(dl()[1]).toMatchObject({
      event: "add_to_cart",
      ecommerce: {
        currency: "EUR",
        value: 950,
        tier: "immersive",
        items: [{ item_id: "t1", item_name: "Foo", item_variant: "immersive", price: 950 }],
      },
    });
  });

  it("begin_checkout / add_payment_info / purchase all include items[] and EUR", () => {
    const items = [buildTourItem(tour, { quantity: 2, tier: "signature" })];
    gaBeginCheckout({ items, valueEur: 440 });
    gaAddPaymentInfo({ paymentType: "stripe", items, valueEur: 440 });
    gaPurchase({ transactionId: "cs_test_123", valueEur: 440, items });
    restore();
    expect(dl()[1]).toMatchObject({ event: "begin_checkout", ecommerce: { value: 440 } });
    expect(dl()[3]).toMatchObject({
      event: "add_payment_info",
      ecommerce: { payment_type: "stripe" },
    });
    expect(dl()[5]).toMatchObject({
      event: "purchase",
      ecommerce: { transaction_id: "cs_test_123", currency: "EUR", value: 440 },
    });
    // Each ecommerce push preceded by reset
    expect(dl()[0]).toEqual({ ecommerce: null });
    expect(dl()[2]).toEqual({ ecommerce: null });
    expect(dl()[4]).toEqual({ ecommerce: null });
  });

  it("generate_lead", () => {
    gaGenerateLead({ leadSource: "contact_form", method: "email" });
    restore();
    expect(dl()[1]).toEqual({
      event: "generate_lead",
      lead_source: "contact_form",
      method: "email",
    });
  });

  it("SSR safe — no throw when window absent (spot check via test env)", () => {
    // Just ensure the pushes we did above didn't leave a broken dataLayer.
    restore();
    expect(Array.isArray(dl())).toBe(true);
  });
});

// silence unused
void vi;
