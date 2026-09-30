/**
 * Vouchers & Payments matching — one pure rule set so every screen agrees.
 *
 * Each booking lands in exactly one bucket. Money truth comes only from the
 * booking row (Stripe session / payment_status / partner channel); nothing is
 * inferred or invented.
 */
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
};

export type ReconBucket = "matched" | "missing_details" | "no_payment" | "review" | "refunded";

export const RECON_TABS: Array<{ id: ReconBucket; label: string; hint: string }> = [
  { id: "missing_details", label: "Paid, details missing", hint: "Payment received, but the tour record is incomplete." },
  { id: "no_payment", label: "No payment found", hint: "A booking or voucher with no payment or partner reference on record." },
  { id: "review", label: "To review", hint: "Flagged for a manual check." },
  { id: "matched", label: "Matched", hint: "Payment or partner voucher linked to a complete tour." },
  { id: "refunded", label: "Cancelled & refunded", hint: "No longer operating." },
];

const PARTNERS = new Set(["VIATOR", "GETYOURGUIDE", "BOKUN"]);

export function missingDetails(row: ReconRow): string[] {
  return [
    !row.preferred_date && "date",
    !(row.tour_title || row.source_tour_id) && "tour",
    !row.pickup_location && "pickup",
    !row.customer_name && "guest name",
  ].filter(Boolean) as string[];
}

/** How the booking is paid, in plain words. Null = no evidence of payment. */
export function paymentEvidence(row: ReconRow): string | null {
  if (row.stripe_session_id && (row.status === "paid" || row.payment_status === "PAID")) return "Website payment (Stripe)";
  if (row.source_channel && PARTNERS.has(row.source_channel) && row.external_booking_ref) {
    return `Partner voucher · ${row.source_channel === "GETYOURGUIDE" ? "GetYourGuide" : row.source_channel.charAt(0) + row.source_channel.slice(1).toLowerCase()}`;
  }
  if (row.payment_status === "PAID") return "Marked paid";
  return null;
}

export function classifyBooking(row: ReconRow): ReconBucket {
  if (row.status === "cancelled" || row.status === "refunded" || row.payment_status === "REFUNDED") return "refunded";
  if (row.review_required) return "review";
  if (!paymentEvidence(row)) return "no_payment";
  if (missingDetails(row).length) return "missing_details";
  return "matched";
}

export function groupBookings<T extends ReconRow>(rows: T[]): Record<ReconBucket, T[]> {
  const out: Record<ReconBucket, T[]> = { matched: [], missing_details: [], no_payment: [], review: [], refunded: [] };
  for (const row of rows) {
    if (row.status === "failed") continue;
    // Unfinished website checkouts are not bookings yet.
    if (row.status === "pending" && (!row.source_channel || row.source_channel === "WEBSITE") && !row.external_booking_ref) continue;
    out[classifyBooking(row)].push(row);
  }
  return out;
}
