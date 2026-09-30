/** Phase 2 fixtures — local only, never touch real data. */
import { describe, expect, it } from "vitest";
import { decideMatch, rankCandidates, totalPaid, type MatchBooking, type MatchPayment } from "@/lib/ops/payment-matcher";

const pay = (o: Partial<MatchPayment> = {}): MatchPayment => ({
  id: "p1", provider: "stripe", provider_payment_id: null, payment_intent_id: null, external_reference: null,
  payer_name: "Ana Silva", payer_email: "ana@example.com", amount: 69000, event_at: "2036-05-01T10:00:00Z", ...o,
});
const bk = (o: Partial<MatchBooking> = {}): MatchBooking => ({
  id: "b1", status: "paid", payment_status: "PAID", source_channel: "WEBSITE", customer_name: "Ana Silva",
  customer_email: "ana@example.com", amount_total: 69000, amount_paid: 69000, created_at: "2036-05-01T09:59:00Z",
  preferred_date: "2036-05-12", ...o,
});

describe("payment matcher", () => {
  it("1. exact Stripe reference → suggested at full confidence", () => {
    const d = decideMatch(pay({ provider_payment_id: "cs_live_1", payer_email: null }), [bk({ stripe_session_id: "cs_live_1" }), bk({ id: "b2", customer_email: "x@y.z" })]);
    expect(d.status).toBe("suggested");
    expect(d.booking_id).toBe("b1");
    expect(d.confidence).toBe(1);
  });

  it("2. exact email + exact amount on one booking → suggested", () => {
    const d = decideMatch(pay(), [bk(), bk({ id: "b2", customer_email: "other@example.com" })]);
    expect(d.status).toBe("suggested");
    expect(d.booking_id).toBe("b1");
  });

  it("3. same email + same amount on two bookings → needs_review, nothing picked", () => {
    const d = decideMatch(pay(), [bk(), bk({ id: "b2" })]);
    expect(d.status).toBe("needs_review");
    expect(d.booking_id).toBeNull();
    expect(d.candidates.map((c) => c.booking_id).sort()).toEqual(["b1", "b2"]);
  });

  it("4. voucher without reference but clear email/date/amount → suggested", () => {
    const d = decideMatch(pay({ provider: "voucher_email" }), [bk({ source_channel: "VIATOR", external_booking_ref: null })]);
    expect(d.status).toBe("suggested");
    expect(d.reason).toContain("Close date");
  });

  it("5. package/deposit child pointing at the payment is found and labelled", () => {
    const child = bk({ id: "child", payment_status: "PAID_VIA_PARENT", source_channel: "DIRECT", customer_email: null, amount_total: 0, amount_paid: 0, metadata: { payment_parent_booking_id: "parent", payment_parent_stripe_session_id: "cs_live_P" } });
    const [c] = rankCandidates(pay({ provider_payment_id: "cs_live_P", payer_email: null }), [child]);
    expect(c?.tier).toBe("reference");
    expect(c?.label).toBe("Package / deposit");
  });

  it("6. refunded booking stays visible, labelled, and never outranks a live one", () => {
    const refunded = bk({ id: "r", status: "refunded", payment_status: "REFUNDED" });
    const ranked = rankCandidates(pay(), [refunded, bk({ id: "live" })]);
    expect(ranked[0]?.booking_id).toBe("live");
    expect(ranked[1]?.label).toBe("Refunded");
    expect(decideMatch(pay(), [refunded]).candidates[0]?.label).toBe("Refunded");
  });

  it("7. repeat webhook deliveries are one payment — counted once", () => {
    expect(totalPaid([{ id: "p1", amount: 69000, kind: "payment" }, { id: "p1", amount: 69000, kind: "payment" }])).toBe(69000);
  });

  it("never matches on phone alone and treats name-only as weak", () => {
    const d = decideMatch(pay({ payer_email: null, amount: 1 }), [bk({ customer_email: null, created_at: "2030-01-01", preferred_date: null })]);
    expect(d.status).toBe("unmatched");
    const weak = decideMatch(pay({ payer_email: null }), [bk({ customer_email: null })]);
    expect(weak.status).toBe("unmatched");
    expect(weak.reason).toBe("Only weak candidates");
  });
});
