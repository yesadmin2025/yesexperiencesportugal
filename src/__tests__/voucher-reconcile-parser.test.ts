import { describe, expect, it } from "vitest";
import {
  cleanTourTitle,
  classifyMatch,
  collectStripeRefs,
  isConfirmationVoucher,
  titleFromSubject,
  type VoucherBlock,
} from "@/lib/ingestion/voucher-reconcile-parser";

const block = (over: Partial<VoucherBlock> = {}): VoucherBlock => ({
  slot: 0,
  date: null,
  startTime: null,
  tourTitle: null,
  selectedRate: null,
  pickup: null,
  dropoff: null,
  pax: null,
  paxBreakdown: null,
  language: null,
  inclusions: [],
  exclusions: [],
  extras: [],
  notes: null,
  customerName: null,
  customerPhone: null,
  amountCents: null,
  currency: null,
  confirmed: true,
  stripeRefs: [],
  ...over,
});

describe("voucher reconciliation parser", () => {
  it("never accepts a refund or cancellation thread as a voucher", () => {
    expect(isConfirmationVoucher("Re: Your Yes!experiences refund [#3716]", "Your booking is confirmed")).toBe(false);
    expect(isConfirmationVoucher("Re: Your cancellation", "Your booking is confirmed")).toBe(false);
  });

  it("rejects signature lines, links and phone numbers as tour titles", () => {
    expect(cleanTourTitle("> www.yesexperiencesportugal.com")).toBeNull();
    expect(cleanTourTitle("> +351 911 889 992 <+351%20911%20889%20992>")).toBeNull();
    expect(cleanTourTitle("Day")).toBeNull();
    expect(cleanTourTitle("Private Arrábida Premium Wine Day")).toBe("Private Arrábida Premium Wine Day");
  });

  it("reads the tour title from the confirmation subject without the trailing note", () => {
    expect(titleFromSubject("Re: Your Private Arrábida Premium Wine Day | September 12")).toBe(
      "Private Arrábida Premium Wine Day",
    );
    expect(titleFromSubject("Weekly newsletter")).toBeNull();
  });

  it("finds Stripe references in the message text", () => {
    expect(collectStripeRefs("session cs_live_abc123456789 done")).toEqual(["cs_live_abc123456789"]);
  });

  it("matches on the payment reference before anything else", () => {
    const rule = classifyMatch(
      { id: "a", created_at: "", amount_total: 100, amount_paid: 100, preferred_date: null, tour_title: null, stripe_session_id: "cs_live_abc123456789", stripe_payment_intent_id: null },
      block({ stripeRefs: ["cs_live_abc123456789"] }),
      { soleCandidate: false },
    );
    expect(rule).toBe("stripe_ref");
  });

  it("does not match when nothing lines up", () => {
    const rule = classifyMatch(
      { id: "a", created_at: "", amount_total: 39000, amount_paid: 39000, preferred_date: null, tour_title: null, stripe_session_id: "cs_live_x1234567890", stripe_payment_intent_id: null },
      block({ amountCents: 12000, confirmed: true }),
      { soleCandidate: false },
    );
    expect(rule).toBeNull();
  });
});
