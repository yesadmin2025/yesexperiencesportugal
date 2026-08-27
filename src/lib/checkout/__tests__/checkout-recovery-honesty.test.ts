import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const checkoutSummary = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/CheckoutSummary.tsx"),
  "utf8",
);
const leadSheet = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/LeadCaptureSheet.tsx"),
  "utf8",
);
const confirmed = readFileSync(
  resolve(process.cwd(), "src/routes/booking-confirmed.tsx"),
  "utf8",
);

describe("checkout recovery and confirmation honesty", () => {
  it("keeps a failed embedded checkout on the reviewed summary with retry", () => {
    expect(checkoutSummary).toContain('data-testid="studio-v3-checkout-summary-error"');
    expect(checkoutSummary).toContain("Try secure checkout again");
    expect(checkoutSummary).toContain("wasSubmittingRef");
    expect(checkoutSummary).toContain("reserveAttempted && !clientSecret");
  });

  it("does not convert checkout-session creation failure into a booking lead", () => {
    expect(leadSheet).toContain('state.phase === "checkoutSummary"');
    expect(leadSheet).toContain("isCheckoutRecovery");
    expect(leadSheet).toContain("toast.dismiss()");
    expect(leadSheet).toContain("Your details are still here");
    expect(leadSheet).toContain("if (!open || isCheckoutRecovery) return null");
  });

  it("shows success language and styling only for verified paid sessions", () => {
    expect(confirmed).toContain(
      'const paid = state.kind === "ok" && state.data.paymentStatus === "paid";',
    );
    expect(confirmed).toMatch(/paid\s*\?\s*"bg-\[color:var\(--teal\)\]/);
    expect(confirmed).toContain("Confirmation link required");
    expect(confirmed).toContain("Your payment has not been confirmed yet.");
    expect(confirmed).not.toContain("your booking is safe");
  });

  it("keeps itinerary, receipt and post-booking promises behind the paid gate", () => {
    expect(confirmed).toContain("{session_id && paid ? (");
    expect(confirmed).toContain(
      '{state.kind === "ok" && paid && state.data.receiptUrl ? (',
    );
    expect(confirmed).toMatch(/\{paid \? \(\s*<ul/);
    expect(confirmed).toContain('data-testid="booking-status-unverified-help"');
  });
});
