/**
 * Canonical derived booking states. Pure; never writes. The original
 * `status` / `payment_status` columns stay untouched — these helpers read
 * them and return one explicit answer so every admin screen agrees.
 *
 * Payment and booking completeness are deliberately separate questions.
 */

export type PaymentState =
  | "paid"
  | "partially_paid"
  | "paid_via_parent"
  | "refunded"
  | "cancelled"
  | "awaiting_payment"
  | "unknown";

export type StateInput = {
  status: string | null;
  payment_status: string | null;
  source_channel?: string | null;
  stripe_session_id?: string | null;
  external_booking_ref?: string | null;
  metadata?: unknown;
};

const PARTNERS = new Set(["VIATOR", "GETYOURGUIDE", "BOKUN"]);

function meta(row: { metadata?: unknown }): Record<string, unknown> {
  const m = row.metadata;
  return m && typeof m === "object" && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}

export function derivePaymentState(row: StateInput): PaymentState {
  const status = (row.status ?? "").toLowerCase();
  const ps = (row.payment_status ?? "").toUpperCase();
  if (status === "refunded" || ps === "REFUNDED") return "refunded";
  if (status === "cancelled") return "cancelled";
  if (ps === "PAID_VIA_PARENT" || (meta(row)["payment_parent_booking_id"] && ps !== "PARTIAL")) return "paid_via_parent";
  if (ps === "PARTIAL") return "partially_paid";
  if (ps === "PAID") return "paid";
  if (ps === "PENDING_PAYMENT") return "awaiting_payment";
  // Blank payment_status: fall back to evidence already on the row.
  if (!ps) {
    if (status === "paid" && row.stripe_session_id) return "paid";
    const channel = (row.source_channel ?? "").toUpperCase();
    if (PARTNERS.has(channel) && row.external_booking_ref) return "paid";
    if (status === "pending") return "awaiting_payment";
  }
  return "unknown";
}

export const PAYMENT_LABEL: Record<PaymentState, string> = {
  paid: "Paid",
  partially_paid: "Partly paid",
  paid_via_parent: "Paid in package",
  refunded: "Refunded",
  cancelled: "Cancelled",
  awaiting_payment: "Awaiting payment",
  unknown: "Payment unclear",
};

export type MissingField = "date" | "tour" | "pickup" | "guest";

export type CompletenessInput = {
  preferred_date: string | null;
  tour_title: string | null;
  source_tour_id: string | null;
  pickup_location: string | null;
  customer_name: string | null;
  metadata?: unknown;
};

export type Completeness =
  | { state: "complete"; missing: [] }
  | { state: "package_payment"; missing: [] }
  | { state: "incomplete"; missing: MissingField[] };

const blank = (v: string | null | undefined) => !v || !v.trim();

/** A deposit/instalment row for a package: its tours live on their own rows. */
export function isPackagePayment(row: { metadata?: unknown }): boolean {
  const m = meta(row);
  return m["financial_parent"] === true || m["financial_installment"] === true;
}

export function deriveCompleteness(row: CompletenessInput): Completeness {
  if (isPackagePayment(row)) return { state: "package_payment", missing: [] };
  const missing: MissingField[] = [];
  if (!row.preferred_date) missing.push("date");
  if (blank(row.tour_title) && blank(row.source_tour_id)) missing.push("tour");
  if (blank(row.pickup_location)) missing.push("pickup");
  if (blank(row.customer_name)) missing.push("guest");
  return missing.length ? { state: "incomplete", missing } : { state: "complete", missing: [] };
}

export function completenessLabel(c: Completeness): string {
  if (c.state === "complete") return "Details complete";
  if (c.state === "package_payment") return "Package payment";
  return `Missing ${c.missing.map((m) => (m === "guest" ? "guest name" : m)).join(", ")}`;
}
