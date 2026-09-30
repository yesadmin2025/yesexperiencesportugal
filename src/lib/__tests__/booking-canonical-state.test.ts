import { describe, expect, it } from "vitest";
import { derivePaymentState, deriveCompleteness, type StateInput } from "@/lib/ops/booking-state";
import { canonicalize, canonicalizeAll, guideMismatches, type RawBooking } from "@/lib/ops/booking-read-model";

/** Every status/payment_status/channel combination observed in the Phase 0 audit. */
const OBSERVED: Array<[StateInput, string]> = [
  [{ status: "paid", payment_status: "PAID", source_channel: "WEBSITE", stripe_session_id: "cs" }, "paid"],
  [{ status: "paid", payment_status: "PAID", source_channel: "VIATOR", external_booking_ref: "BR" }, "paid"],
  [{ status: "paid", payment_status: null, source_channel: null, stripe_session_id: "cs" }, "paid"],
  [{ status: "paid", payment_status: null, source_channel: null }, "unknown"],
  [{ status: "cancelled", payment_status: "PAID", source_channel: "VIATOR" }, "cancelled"],
  [{ status: "cancelled", payment_status: "PAID", source_channel: "WEBSITE" }, "cancelled"],
  [{ status: "refunded", payment_status: "REFUNDED", source_channel: "WEBSITE" }, "refunded"],
  [{ status: "paid", payment_status: "PARTIAL", source_channel: "DIRECT" }, "partially_paid"],
  [{ status: "paid", payment_status: "PARTIAL", source_channel: "DIRECT", metadata: { payment_parent_booking_id: "x" } }, "partially_paid"],
  [{ status: "paid", payment_status: "PAID_VIA_PARENT", source_channel: "DIRECT" }, "paid_via_parent"],
  [{ status: "refunded", payment_status: null, source_channel: null }, "refunded"],
  [{ status: "paid", payment_status: "PAID", source_channel: null }, "paid"],
  [{ status: "refunded", payment_status: "PENDING_PAYMENT", source_channel: null }, "refunded"],
  [{ status: "refunded", payment_status: "PAID", source_channel: "WEBSITE" }, "refunded"],
  [{ status: "pending", payment_status: "PENDING_PAYMENT", source_channel: "DIRECT" }, "awaiting_payment"],
];

describe("derivePaymentState", () => {
  it.each(OBSERVED)("%j → %s", (row, expected) => expect(derivePaymentState(row)).toBe(expected));
});

const full = { preferred_date: "2026-10-02", tour_title: "Sintra", source_tour_id: null, pickup_location: "Hotel", customer_name: "Ana" };

describe("deriveCompleteness", () => {
  it("complete", () => expect(deriveCompleteness(full).state).toBe("complete"));
  it("lists every missing field", () =>
    expect(deriveCompleteness({ preferred_date: null, tour_title: " ", source_tour_id: null, pickup_location: null, customer_name: null }).missing)
      .toEqual(["date", "tour", "pickup", "guest"]));
  it("tour code alone counts as a tour", () => expect(deriveCompleteness({ ...full, tour_title: null, source_tour_id: "p1" }).state).toBe("complete"));
  it("package payments are not incomplete bookings", () =>
    expect(deriveCompleteness({ ...full, preferred_date: null, metadata: { financial_parent: true } }).state).toBe("package_payment"));
});

const row = (id: string, mirror: string | null): RawBooking => ({
  id, status: "paid", payment_status: "PAID", customer_name: "A", tour_title: "T", source_tour_id: null,
  preferred_date: "2026-10-02", pickup_location: "H", assigned_guide_id: mirror,
});

describe("guide assignment consistency", () => {
  it("guide comes only from the active assignment", () => {
    const c = canonicalize(row("b1", "g-old"), { booking_id: "b1", guide_id: "g-new", status: "assigned" });
    expect(c.assigned_guide_id).toBe("g-new");
    expect(c.legacy_guide_id).toBe("g-old");
  });
  it("mirror without assignment is never shown as the guide", () => {
    const c = canonicalize(row("b2", "g1"), null);
    expect(c.assigned_guide_id).toBeNull();
    expect(c.legacy_guide_id).toBe("g1");
  });
  it("guideMismatches lists exactly the flagged legacy rows", () => {
    const rows = canonicalizeAll([row("a", "g1"), row("b", "g2"), row("c", null)], [{ booking_id: "a", guide_id: "g1", status: "confirmed" }]);
    expect(rows[0]!.assignment_status).toBe("confirmed");
    expect(rows[0]!.legacy_guide_id).toBeNull();
    expect(guideMismatches(rows)).toEqual(["b"]);
  });
});
