/**
 * Vouchers & Payments grouping. Tabs are by PAYMENT only; booking
 * completeness is a separate status (see booking-state.ts). There is no
 * mixed "Paid, details missing" bucket any more.
 */
import { derivePaymentState, deriveCompleteness, isPackagePayment, type PaymentState } from "./booking-state";

export { isPackagePayment };

export type ReconRow = {
  id: string;
  status: string;
  payment_status: string | null;
  source_channel: string | null;
  stripe_session_id: string | null;
  external_booking_ref: string | null;
  customer_name: string | null;
  tour_title: string | null;
  source_tour_id: string | null;
  preferred_date: string | null;
  pickup_location: string | null;
  review_required: boolean | null;
  metadata?: unknown;
};

export type ReconBucket = "paid" | "partly_paid" | "awaiting" | "unclear" | "closed";

export const RECON_TABS: Array<{ id: ReconBucket; label: string; hint: string }> = [
  { id: "paid", label: "Paid", hint: "Paid in full, or paid as part of a package." },
  { id: "partly_paid", label: "Partly paid", hint: "A deposit or instalment is on record; a balance may be due." },
  { id: "awaiting", label: "Awaiting payment", hint: "No payment received yet." },
  { id: "unclear", label: "Payment unclear", hint: "No payment or partner reference on record — check manually." },
  { id: "closed", label: "Cancelled & refunded", hint: "No longer operating." },
];

const BUCKET: Record<PaymentState, ReconBucket> = {
  paid: "paid",
  paid_via_parent: "paid",
  partially_paid: "partly_paid",
  awaiting_payment: "awaiting",
  unknown: "unclear",
  refunded: "closed",
  cancelled: "closed",
};

export function classifyBooking(row: ReconRow): ReconBucket {
  return BUCKET[derivePaymentState(row)];
}

export function missingDetails(row: ReconRow): string[] {
  return deriveCompleteness(row).missing.map((m) => (m === "guest" ? "guest name" : m));
}

/** How the booking is paid, in plain words. Null = no evidence of payment. */
export function paymentEvidence(row: ReconRow): string | null {
  const state = derivePaymentState(row);
  if (state === "paid_via_parent") return "Paid through its package";
  if (row.stripe_session_id && (state === "paid" || state === "partially_paid")) return "Website payment (Stripe)";
  const ch = row.source_channel ?? "";
  if (["VIATOR", "GETYOURGUIDE", "BOKUN"].includes(ch) && row.external_booking_ref) {
    return `Partner voucher · ${ch === "GETYOURGUIDE" ? "GetYourGuide" : ch.charAt(0) + ch.slice(1).toLowerCase()}`;
  }
  if (state === "paid" || state === "partially_paid") return "Marked paid";
  return null;
}

export function groupBookings<T extends ReconRow>(rows: T[]): Record<ReconBucket, T[]> {
  const out: Record<ReconBucket, T[]> = { paid: [], partly_paid: [], awaiting: [], unclear: [], closed: [] };
  for (const row of rows) {
    if (row.status === "failed") continue;
    // Unfinished website checkouts are not bookings yet.
    if (row.status === "pending" && (!row.source_channel || row.source_channel === "WEBSITE") && !row.external_booking_ref) continue;
    out[classifyBooking(row)].push(row);
  }
  return out;
}
