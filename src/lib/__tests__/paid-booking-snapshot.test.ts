import { describe, expect, it } from "vitest";

import { extractPaidFrozenBookingSnapshot } from "../paid-booking-snapshot.server";

describe("paid frozen booking snapshot gate", () => {
  it("rejects missing and unpaid bookings", () => {
    expect(extractPaidFrozenBookingSnapshot(null)).toBeNull();
    expect(
      extractPaidFrozenBookingSnapshot({
        status: "pending",
        booking_details: {
          snapshot: { frozenAt: "2026-08-25T17:00:00.000Z", experienceName: "Hidden coast" },
        },
      }),
    ).toBeNull();
  });

  it("rejects paid bookings without a snapshot", () => {
    expect(extractPaidFrozenBookingSnapshot({ status: "paid", booking_details: {} })).toBeNull();
  });

  it("rejects paid bookings whose snapshot is not frozen", () => {
    expect(
      extractPaidFrozenBookingSnapshot({
        status: "paid",
        booking_details: { snapshot: { experienceName: "Hidden coast" } },
      }),
    ).toBeNull();

    expect(
      extractPaidFrozenBookingSnapshot({
        status: "paid",
        booking_details: {
          snapshot: { frozenAt: "   ", experienceName: "Hidden coast" },
        },
      }),
    ).toBeNull();
  });

  it("returns only a paid frozen snapshot", () => {
    const snapshot = {
      frozenAt: "2026-08-25T17:00:00.000Z",
      experienceName: "Hidden coast",
      pricing: { totalEur: 458 },
    };

    expect(
      extractPaidFrozenBookingSnapshot({
        status: "paid",
        booking_details: { snapshot },
      }),
    ).toBe(snapshot);
  });
});
