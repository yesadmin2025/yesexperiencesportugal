import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Travel File post-payment security contract", () => {
  it("never serves public itinerary data or PDF from draft booking_snapshots", () => {
    const jsonRoute = source("src/routes/api/public/booking-itinerary-data.ts");
    const pdfRoute = source("src/routes/api/public/booking-itinerary.ts");

    for (const route of [jsonRoute, pdfRoute]) {
      expect(route).toContain("resolvePaidFrozenBookingSnapshot");
      expect(route).not.toContain('.from("booking_snapshots")');
      expect(route).toContain('error: "not_ready"');
      expect(route).toContain('"cache-control": "private, max-age=0, no-store"');
    }
  });

  it("minimizes Stripe session details before payment", () => {
    const stripeStatus = source("supabase/functions/stripe-session-status/index.ts");
    const unpaidGuard = stripeStatus.indexOf('if (session.payment_status !== "paid")');
    const lineItemsFetch = stripeStatus.indexOf("listLineItems");
    const customerFields = stripeStatus.indexOf("customerEmail:");

    expect(unpaidGuard).toBeGreaterThan(-1);
    expect(lineItemsFetch).toBeGreaterThan(unpaidGuard);
    expect(customerFields).toBeGreaterThan(unpaidGuard);
    expect(stripeStatus.slice(unpaidGuard, lineItemsFetch)).toContain("return json(baseStatus)");
  });

  it("unlocks the confirmation Travel File only after payment is paid", () => {
    const confirmed = source("src/routes/booking-confirmed.tsx");

    expect(confirmed).toContain("session_id && paid");
    expect(confirmed).toContain("Your Travel File will unlock here as soon as the payment is confirmed.");
    expect(confirmed).toContain("paid && state.kind === \"ok\" && state.data.receiptUrl");
  });

  it("keeps receipt data, itinerary download, print and JSON-LD behind paid", () => {
    const receipt = source("src/routes/booking-receipt.tsx");

    expect(receipt).toContain('const paid = data?.paymentStatus === "paid"');
    expect(receipt).toContain("paid && data && session_id");
    expect(receipt).toContain("{paid ? (");
    expect(receipt).toContain("{data && !paid ? (");
    expect(receipt).toContain("{data && paid ? (");
  });
});
