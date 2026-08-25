import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/stripe-session-status/index.ts"),
  "utf8",
);

describe("stripe-session-status unpaid disclosure contract", () => {
  it("keeps unpaid sessions to minimal non-PII verification fields", () => {
    const guardStart = source.indexOf('if (session.payment_status !== "paid")');
    const paidDetailsStart = source.indexOf("const pi = session.payment_intent");

    expect(guardStart).toBeGreaterThan(-1);
    expect(paidDetailsStart).toBeGreaterThan(guardStart);

    const unpaidBranch = source.slice(guardStart, paidDetailsStart);

    expect(unpaidBranch).toContain("amountTotal: null");
    expect(unpaidBranch).toContain("currency: null");
    expect(unpaidBranch).toContain("customerEmail: null");
    expect(unpaidBranch).toContain("customerName: null");
    expect(unpaidBranch).toContain("receiptUrl: null");
    expect(unpaidBranch).toContain("created: null");
    expect(unpaidBranch).toContain("lineItems: []");
    expect(unpaidBranch).toContain("metadata: {}");

    expect(unpaidBranch).not.toContain("listLineItems");
    expect(unpaidBranch).not.toContain("session.customer_details");
    expect(unpaidBranch).not.toContain("session.customer_email");
    expect(unpaidBranch).not.toContain("session.metadata");
  });
});
