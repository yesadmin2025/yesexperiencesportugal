/**
 * Paid-only authorization for the public Travel File (itinerary JSON + PDF).
 *
 * The guest-facing Travel File contains real booking data (guest name, pickup,
 * notes, the designed day and the paid total). It is protected by two things:
 *  1. the opaque, unguessable Stripe checkout session id used as the reference;
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
  /** Non-disclosing: unpaid, unknown or malformed reference. */
  | { kind: "not_found" }
  /** Paid, but the frozen snapshot has not landed yet. */
  | { kind: "not_ready" };

export interface BookingAccessRow {
  status?: unknown;
  booking_details?: unknown;
}

/**
 * Pure resolver — the single decision point. Access is granted ONLY for a
 * paid booking whose frozen snapshot exists and carries a non-empty `frozenAt`.
 */
export function resolvePublicBookingAccess(
  row: BookingAccessRow | null | undefined,
): PublicBookingAccess {
  if (!row || typeof row !== "object") return { kind: "not_found" };
  if (row.status !== "paid") return { kind: "not_found" };

  const details = row.booking_details;
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return { kind: "not_ready" };
  }
  const snapshot = (details as AnyRec).snapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { kind: "not_ready" };
  }
  const frozenAt = (snapshot as AnyRec).frozenAt;
  if (typeof frozenAt !== "string" || frozenAt.trim() === "") {
    return { kind: "not_ready" };
  }
  return { kind: "granted", snapshot: snapshot as AnyRec, frozenAt };
}

/** Stripe checkout session ids are the only accepted public reference. */
export function isValidBookingReference(sessionId: string): boolean {
  return /^cs_[A-Za-z0-9_]{20,255}$/.test(sessionId);
}

/**
 * DB loader: reads the paid booking row by Stripe session id and applies the
 * pure resolver. Never touches `booking_snapshots`.
 */
export async function loadPublicBookingAccess(sessionId: string): Promise<PublicBookingAccess> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("bookings")
    .select("status, booking_details")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  return resolvePublicBookingAccess(data as BookingAccessRow | null);
}

/** Uniform, non-disclosing HTTP response for a denied Travel File request. */
export function publicBookingDenialResponse(access: PublicBookingAccess): Response {
  if (access.kind === "not_ready") {
    return Response.json({ ok: false, error: "not_ready" }, { status: 409 });
  }
  return Response.json({ ok: false, error: "not_found" }, { status: 404 });
}
