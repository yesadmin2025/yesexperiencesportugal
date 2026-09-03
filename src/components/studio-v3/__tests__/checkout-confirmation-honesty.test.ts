import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const bookingConfirmed = readFileSync(
  resolve(process.cwd(), "src/routes/booking-confirmed.tsx"),
  "utf8",
);

const studio = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);

const checkoutSummary = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/CheckoutSummary.tsx"),
  "utf8",
);

describe("checkout confirmation honesty and recovery", () => {
  it("keeps the confirmation route neutral until Stripe verifies a paid session", () => {
    expect(bookingConfirmed).toContain("Booking status — YES experiences Portugal");
    expect(bookingConfirmed).toContain(
      'const paid = state.kind === "ok" && state.data.paymentStatus === "paid";',
    );
    expect(bookingConfirmed).toContain("Confirmation link required");
    expect(bookingConfirmed).toContain('data-testid="booking-status-unverified-help"');
    expect(bookingConfirmed).toContain("No booking confirmation shown");
  });

  it("gates paid-only itinerary, receipts and next steps behind verified payment", () => {
    expect(bookingConfirmed).toContain("{session_id && paid ? (");
    expect(bookingConfirmed).toContain('state.kind === "ok" && paid && state.data.receiptUrl');
    expect(bookingConfirmed).toContain("{paid ? (");
  });

  it("does not turn a temporary Stripe failure into a private enquiry", () => {
    const failureStart = studio.indexOf('console.error("Stripe checkout failed", e);');
    expect(failureStart).toBeGreaterThan(-1);
    const failureBlock = studio.slice(failureStart, failureStart + 500);

    expect(failureBlock).toContain("Secure checkout couldn't open");
    expect(failureBlock).toContain("setClientSecret(null)");
    expect(failureBlock).not.toContain('openLeadSheet("book")');
  });

  it("keeps the existing checkout surface available as an explicit retry", () => {
    expect(checkoutSummary).toContain('data-testid="studio-v3-checkout-summary-error"');
    expect(checkoutSummary).toContain('data-testid="studio-v3-checkout-summary-reserve"');
    expect(checkoutSummary).toContain("Try secure checkout again");
    expect(checkoutSummary).toContain("onClick={handleReserve}");
    expect(checkoutSummary).toContain("stripeSurfaceRef.current?.scrollIntoView");
  });
});
