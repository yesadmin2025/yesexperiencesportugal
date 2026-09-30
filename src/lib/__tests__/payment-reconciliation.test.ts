import { describe, expect, it } from "vitest";
import { classifyBooking, groupBookings, missingDetails, type ReconRow } from "@/lib/ops/payment-reconciliation";

const base: ReconRow = { id: "1", status: "paid", payment_status: "PAID", source_channel: "WEBSITE", stripe_session_id: "cs_1", external_booking_ref: null, customer_name: "Ana", tour_title: "Sintra", source_tour_id: null, preferred_date: "2026-10-02", pickup_location: "Hotel", review_required: false };

describe("payment reconciliation (payment-only tabs)", () => {
  it("puts paid bookings in Paid regardless of details", () => {
    expect(classifyBooking(base)).toBe("paid");
    expect(classifyBooking({ ...base, pickup_location: null })).toBe("paid");
    expect(missingDetails({ ...base, pickup_location: null })).toEqual(["pickup"]);
  });
  it("treats partner vouchers with a reference as paid", () =>
    expect(classifyBooking({ ...base, stripe_session_id: null, payment_status: null, status: "pending", source_channel: "VIATOR", external_booking_ref: "BR-1" })).toBe("paid"));
  it("pending direct bookings await payment", () =>
    expect(classifyBooking({ ...base, stripe_session_id: null, payment_status: null, source_channel: "DIRECT", status: "pending" })).toBe("awaiting"));
  it("puts cancellations aside and skips unfinished checkouts", () => {
    const g = groupBookings([{ ...base, status: "refunded" }, { ...base, id: "2", status: "pending", payment_status: null }]);
    expect(g.closed).toHaveLength(1);
    expect(Object.values(g).flat()).toHaveLength(1);
  });
});
