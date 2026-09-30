/**
 * Deterministic payment ↔ booking matcher. Pure; never writes.
 *
 * It only proposes. A link is made automatically ONLY by the database when a
 * booking already carries the exact Stripe/voucher reference. Everything this
 * matcher returns is a suggestion or a review item for a person to confirm.
 *
 * Ranking (strongest first):
 *   1. exact reference (booking id, external ref, voucher ref, Stripe session/intent)
 *   2. exact email + exact amount
 *   3. exact email + amount + close date      (folded into 2 with a date bonus)
 *   4. exact email + close date
 *   5. name + amount/date (weak fallback)
 * Phone is never used on its own.
 */
import { derivePaymentState, isPackagePayment, PAYMENT_LABEL, type PaymentState } from "./booking-state";

export type MatchPayment = {
  id: string;
  provider: string;
  provider_payment_id: string | null;
  payment_intent_id: string | null;
  external_reference: string | null;
  payer_name: string | null;
  payer_email: string | null;
  amount: number | null;
  event_at: string | null;
};

export type MatchBooking = {
  id: string;
  status: string | null;
  payment_status: string | null;
  source_channel?: string | null;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  external_booking_ref?: string | null;
  customer_name: string | null;
  customer_email?: string | null;
  amount_total?: number | null;
  amount_paid?: number | null;
  created_at?: string | null;
  preferred_date?: string | null;
  metadata?: unknown;
};

export type MatchTier = "reference" | "email_amount" | "email_date" | "name_fallback";

export type Candidate = {
  booking_id: string;
  score: number;
  tier: MatchTier;
  reasons: string[];
  /** Cancelled/refunded/package rows stay visible but labelled. */
  label: string | null;
  payment_state: PaymentState;
};

export type MatchDecision =
  | { status: "suggested"; booking_id: string; confidence: number; reason: string; candidates: Candidate[] }
  | { status: "needs_review"; booking_id: null; confidence: number; reason: string; candidates: Candidate[] }
  | { status: "unmatched"; booking_id: null; confidence: number; reason: string; candidates: Candidate[] };

const SCORE: Record<MatchTier, number> = { reference: 1, email_amount: 0.85, email_date: 0.6, name_fallback: 0.35 };
export const SUGGEST_THRESHOLD = 0.6;
const CLOSE_DAYS = 3;

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const normName = (s: string | null | undefined) => norm(s).replace(/\s+/g, " ");

function meta(b: MatchBooking): Record<string, unknown> {
  const m = b.metadata;
  return m && typeof m === "object" && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}

/** Stripe sessions a package child points at (its money lives on the parent). */
export function parentSessions(b: MatchBooking): string[] {
  const m = meta(b);
  const one = m["payment_parent_stripe_session_id"];
  const many = m["payment_parent_stripe_sessions"];
  return [...(typeof one === "string" ? [one] : []), ...(Array.isArray(many) ? many.filter((x): x is string => typeof x === "string") : [])];
}

export function parentBookingIds(b: { metadata?: unknown }): string[] {
  const m = b.metadata && typeof b.metadata === "object" && !Array.isArray(b.metadata) ? (b.metadata as Record<string, unknown>) : {};
  const one = m["payment_parent_booking_id"];
  const many = m["payment_parent_booking_ids"];
  return [...(typeof one === "string" ? [one] : []), ...(Array.isArray(many) ? many.filter((x): x is string => typeof x === "string") : [])];
}

function bookingAmounts(b: MatchBooking): number[] {
  return [b.amount_paid, b.amount_total].filter((n): n is number => typeof n === "number" && n > 0);
}

function daysApart(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const d = Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
  return Number.isFinite(d) ? d : null;
}

function labelFor(b: MatchBooking, state: PaymentState): string | null {
  if (state === "cancelled" || state === "refunded") return PAYMENT_LABEL[state];
  if (state === "paid_via_parent" || isPackagePayment(b) || parentSessions(b).length) return "Package / deposit";
  return null;
}

export function scoreCandidate(p: MatchPayment, b: MatchBooking): Candidate | null {
  const reasons: string[] = [];
  const refs = [p.provider_payment_id, p.payment_intent_id, p.external_reference].map(norm).filter(Boolean);
  const bookingRefs = [b.id, b.stripe_session_id, b.stripe_payment_intent_id, b.external_booking_ref, ...parentSessions(b)].map(norm).filter(Boolean);
  let tier: MatchTier | null = null;

  if (refs.some((r) => bookingRefs.includes(r))) {
    tier = "reference";
    reasons.push(parentSessions(b).map(norm).some((s) => refs.includes(s)) ? "Package child points at this payment" : "Exact reference");
  } else {
    const email = norm(p.payer_email);
    const sameEmail = !!email && email === norm(b.customer_email);
    const sameAmount = p.amount != null && p.amount > 0 && bookingAmounts(b).includes(p.amount);
    const closeDate = [b.created_at, b.preferred_date].some((d) => {
      const n = daysApart(p.event_at, d);
      return n !== null && n <= CLOSE_DAYS;
    });
    const sameName = !!normName(p.payer_name) && normName(p.payer_name) === normName(b.customer_name);
    if (sameEmail && sameAmount) {
      tier = "email_amount";
      reasons.push("Same email", "Same amount");
      if (closeDate) reasons.push("Close date");
    } else if (sameEmail && closeDate) {
      tier = "email_date";
      reasons.push("Same email", "Close date");
    } else if (sameName && (sameAmount || closeDate)) {
      tier = "name_fallback";
      reasons.push("Same name", sameAmount ? "Same amount" : "Close date");
    }
  }
  if (!tier) return null;
  const state = derivePaymentState(b);
  let score = SCORE[tier] + (tier === "email_amount" && reasons.includes("Close date") ? 0.05 : 0);
  // Closed bookings stay visible but never outrank an operating one.
  if (state === "cancelled" || state === "refunded") score -= 0.1;
  return { booking_id: b.id, score: Math.round(score * 100) / 100, tier, reasons, label: labelFor(b, state), payment_state: state };
}

export function rankCandidates(p: MatchPayment, bookings: MatchBooking[]): Candidate[] {
  return bookings
    .map((b) => scoreCandidate(p, b))
    .filter((c): c is Candidate => c !== null)
    .sort((a, b) => b.score - a.score || a.booking_id.localeCompare(b.booking_id));
}

export function decideMatch(p: MatchPayment, bookings: MatchBooking[]): MatchDecision {
  const candidates = rankCandidates(p, bookings).slice(0, 5);
  const plausible = candidates.filter((c) => c.score >= SUGGEST_THRESHOLD);
  if (plausible.length === 0) {
    return { status: "unmatched", booking_id: null, confidence: candidates[0]?.score ?? 0, reason: candidates.length ? "Only weak candidates" : "No candidate booking", candidates };
  }
  const top = plausible[0]!;
  const tied = plausible.filter((c) => c.tier === top.tier);
  if (tied.length > 1) {
    return { status: "needs_review", booking_id: null, confidence: top.score, reason: `${tied.length} bookings match equally (${top.reasons.join(", ")})`, candidates };
  }
  return { status: "suggested", booking_id: top.booking_id, confidence: top.score, reason: top.reasons.join(" · "), candidates };
}

/** Sum money once per payment record — repeat webhooks are already folded into one row. */
export function totalPaid(rows: Array<{ id: string; amount: number | null; kind: string }>): number {
  const seen = new Set<string>();
  let sum = 0;
  for (const r of rows) {
    if (seen.has(r.id) || r.kind === "refund") continue;
    seen.add(r.id);
    sum += r.amount ?? 0;
  }
  return sum;
}
