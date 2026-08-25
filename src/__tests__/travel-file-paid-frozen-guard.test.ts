import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractPaidFrozenBookingSnapshot } from "@/lib/paid-booking-snapshot.server";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("Travel File paid + frozen security gate", () => {
  const frozenSnapshot = {
    frozenAt: "2026-08-25T18:00:00.000Z",
    experienceName: "A private day in Portugal",
    customerName: "Guest",
    pricing: { totalEur: 458 },
  };

  it("rejects missing and malformed booking rows", () => {
    expect(extractPaidFrozenBookingSnapshot(null)).toBeNull();
    expect(extractPaidFrozenBookingSnapshot({})).toBeNull();
    expect(extractPaidFrozenBookingSnapshot({ status: "paid" })).toBeNull();
    expect(
      extractPaidFrozenBookingSnapshot({ status: "paid", booking_details: { snapshot: null } }),
    ).toBeNull();
  });

  it("rejects unpaid bookings even if a frozen-looking snapshot exists", () => {
    expect(
      extractPaidFrozenBookingSnapshot({
        status: "pending",
        booking_details: { snapshot: frozenSnapshot },
      }),
    ).toBeNull();
  });

  it("rejects paid bookings until the snapshot is frozen", () => {
    expect(
      extractPaidFrozenBookingSnapshot({
        status: "paid",
        booking_details: { snapshot: { ...frozenSnapshot, frozenAt: null } },
      }),
    ).toBeNull();
    expect(
      extractPaidFrozenBookingSnapshot({
        status: "paid",
        booking_details: { snapshot: { ...frozenSnapshot, frozenAt: "   " } },
      }),
    ).toBeNull();
  });

  it("returns the exact frozen snapshot only for a paid booking", () => {
    const row = {
      status: "paid",
      booking_details: { snapshot: frozenSnapshot },
    };
    expect(extractPaidFrozenBookingSnapshot(row)).toBe(frozenSnapshot);
  });
});

describe("Travel File public surface guardrails", () => {
  it("JSON and PDF itinerary endpoints resolve only the paid frozen booking snapshot", () => {
    for (const path of [
      "src/routes/api/public/booking-itinerary-data.ts",
      "src/routes/api/public/booking-itinerary.ts",
    ]) {
      const text = source(path);
      expect(text).toContain("resolvePaidFrozenBookingSnapshot");
      expect(text).not.toContain('.from("booking_snapshots")');
    }
  });

  it("Stripe session status redacts customer and receipt details while unpaid", () => {
    const text = source("supabase/functions/stripe-session-status/index.ts");
    expect(text).toContain('const paid = session.payment_status === "paid"');
    expect(text).toContain("if (!paid)");
    expect(text).toContain("customerEmail: null");
    expect(text).toContain("customerName: null");
    expect(text).toContain("receiptUrl: null");
    expect(text).toContain("lineItems: []");
    expect(text).toContain("metadata: {}");
  });

  it("confirmation and printable receipt unlock guest-facing documents only after paid", () => {
    const confirmation = source("src/routes/booking-confirmed.tsx");
    expect(confirmation).toContain("{paid ? (");
    expect(confirmation).toContain('state.kind === "ok" && paid && state.data.receiptUrl');

    const receipt = source("src/routes/booking-receipt.tsx");
    expect(receipt).toContain('const paid = data?.paymentStatus === "paid"');
    expect(receipt).toContain("data && paid && session_id");
    expect(receipt).toContain("{paid && session_id ? (");
    expect(receipt).toContain("{data && !paid ? (");
  });
});
