/**
 * Canonical booking read model. The one place that turns a raw bookings row
 * (+ its active tour_assignments row) into what admin screens display.
 *
 * - Guide comes ONLY from the active assignment. `bookings.assigned_guide_id`
 *   is a compatibility mirror; if it disagrees it is surfaced as
 *   `legacyGuideId` so the office can repair it, never shown as the guide.
 * - Payment and completeness are derived (see booking-state.ts).
 * - Display fallbacks read nested snapshot fields but never write them.
 */
import {
  derivePaymentState,
  deriveCompleteness,
  PAYMENT_LABEL,
  completenessLabel,
  type PaymentState,
  type Completeness,
} from "./booking-state";

export type ActiveAssignment = {
  booking_id: string;
  guide_id: string;
  status: string;
  id?: string;
};

export type RawBooking = {
  id: string;
  status: string | null;
  payment_status: string | null;
  source?: string | null;
  source_channel?: string | null;
  stripe_session_id?: string | null;
  external_booking_ref?: string | null;
  customer_name: string | null;
  customer_email?: string | null;
  tour_title: string | null;
  source_tour_id: string | null;
  preferred_date: string | null;
  pickup_location: string | null;
  assigned_guide_id?: string | null;
  metadata?: unknown;
  booking_details?: unknown;
};

export type CanonicalFields = {
  guide_id: string | null;
  assignment_status: string | null;
  legacy_guide_id: string | null;
  payment_state: PaymentState;
  payment_label: string;
  completeness: Completeness;
  completeness_label: string;
};

export function canonicalize<T extends RawBooking>(
  row: T,
  assignment: ActiveAssignment | null | undefined,
): T & CanonicalFields {
  const guideId = assignment?.guide_id ?? null;
  const mirror = row.assigned_guide_id ?? null;
  const payment = derivePaymentState(row);
  const completeness = deriveCompleteness(row);
  return {
    ...row,
    // Existing UI reads assigned_guide_id; it now always means the assignment.
    assigned_guide_id: guideId,
    guide_id: guideId,
    assignment_status: assignment?.status ?? null,
    legacy_guide_id: mirror && mirror !== guideId ? mirror : null,
    payment_state: payment,
    payment_label: PAYMENT_LABEL[payment],
    completeness,
    completeness_label: completenessLabel(completeness),
  };
}

export function canonicalizeAll<T extends RawBooking>(
  rows: T[],
  assignments: ActiveAssignment[],
): Array<T & CanonicalFields> {
  const byBooking = new Map(assignments.map((a) => [a.booking_id, a]));
  return rows.map((r) => canonicalize(r, byBooking.get(r.id)));
}

/** Rows where admin would show a guide the Guide App cannot see. Must be empty. */
export function guideMismatches(rows: Array<CanonicalFields & { id: string }>): string[] {
  return rows.filter((r) => r.guide_id === null && r.legacy_guide_id !== null).map((r) => r.id);
}
