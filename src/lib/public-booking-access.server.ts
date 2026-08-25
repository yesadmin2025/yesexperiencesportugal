/**
 * Paid-only authorization for the public Travel File (itinerary JSON + PDF).
 *
 * The guest-facing Travel File contains real booking data (guest name, pickup,
 * notes, the designed day and the paid total). It is protected by two things:
 *  1. the opaque Stripe checkout session id used as the reference;
 *  2. this authorization: the booking must be PAID and its snapshot FROZEN.
 *
 * The authoritative post-payment source is `bookings.booking_details.snapshot`,
 * which `stripe-webhook` freezes at payment time. The `booking_snapshots`
 * draft table is deliberately NOT read here — a pre-payment draft must never
 * be served to the public.
 */

export type AnyRec = Record<string, unknown>;

export type PublicBookingAccess =
  | { kind: "granted"; snapshot: AnyRec; frozenAt: string }
  /** Non-disclosing: unknown, unpaid, malformed, or not frozen yet. */
  | { kind: "denied" };

export interface BookingAccessRow {
  status?: unknown;
  booking_details?: unknown;
}

/**
 * Pure resolver — the single decision point. Access is granted ONLY for a
 * paid booking whose frozen snapshot exists and carries a non-empty `frozenAt`.
 * Every other lifecycle state collapses to the same opaque denial.
 */
export function resolvePublicBookingAccess(
  row: BookingAccessRow | null | undefined,
): PublicBookingAccess {
  if (!row || typeof row !== "object") return { kind: "denied" };
  if (row.status !== "paid") return { kind: "denied" };

  const details = row.booking_details;
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return { kind: "denied" };
  }
  const snapshot = (details as AnyRec).snapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { kind: "denied" };
  }
  const frozenAt = (snapshot as AnyRec).frozenAt;
  if (typeof frozenAt !== "string" || frozenAt.trim() === "") {
    return { kind: "denied" };
  }
  return { kind: "granted", snapshot: snapshot as AnyRec, frozenAt };
}

/** Stripe checkout session ids are the only accepted public reference. */
export function isValidBookingReference(sessionId: string): boolean {
  return /^cs_[A-Za-z0-9_]{20,255}$/.test(sessionId);
}

/**
 * DB loader: reads the authoritative booking row by Stripe session id and
 * applies the pure resolver. Never touches `booking_snapshots`.
 */
export async function loadPublicBookingAccess(sessionId: string): Promise<PublicBookingAccess> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("status, booking_details")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("public booking access lookup failed", { code: error.code });
    throw new Error("public_booking_access_lookup_failed");
  }

  return resolvePublicBookingAccess(data as BookingAccessRow | null);
}

/**
 * Uniform non-disclosing response for every denied valid booking reference.
 * Unknown, unpaid, paid-but-unfrozen and malformed booking rows are
 * intentionally indistinguishable to public callers.
 */
export function publicBookingDenialResponse(_access: PublicBookingAccess): Response {
  return Response.json({ ok: false, error: "not_found" }, { status: 404 });
}
