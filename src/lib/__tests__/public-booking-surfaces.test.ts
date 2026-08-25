import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("paid-only Travel File surfaces", () => {
  it("serves both public itinerary routes through the paid frozen booking guard", () => {
    const jsonRoute = read("../../routes/api/public/booking-itinerary-data.ts");
    const pdfRoute = read("../../routes/api/public/booking-itinerary.ts");

    for (const source of [jsonRoute, pdfRoute]) {
      expect(source).toContain("loadPaidFrozenBookingSnapshot(sessionId)");
      expect(source).not.toContain('.from("booking_snapshots")');
    }
  });

  it("shows the confirmation Travel File card only after verified payment", () => {
    const confirmation = read("../../routes/booking-confirmed.tsx");

    expect(confirmation).toContain("{session_id && paid ? (");
    expect(confirmation).toContain("Your Travel File will appear here as soon as payment is confirmed.");
  });

  it("keeps printable receipt details and actions behind the paid state", () => {
    const receipt = read("../../routes/booking-receipt.tsx");

    expect(receipt).toContain('const paid = data?.paymentStatus === "paid";');
    expect(receipt).toContain("data && paid && session_id");
    expect(receipt).toContain("{data && paid ? (");
  });
});
