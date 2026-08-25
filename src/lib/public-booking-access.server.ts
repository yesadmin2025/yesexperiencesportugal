type AnyRecord = Record<string, unknown>;

export type PublicBookingAccessResult =
  | { ok: true; snapshot: AnyRecord }
  | { ok: false; status: 404; error: "not_found" }
  | { ok: false; status: 409; error: "not_ready" };

type BookingLike =
  | {
      status?: unknown;
      booking_details?: unknown;
    }
  | null
  | undefined;

const isRecord = (value: unknown): value is AnyRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * Public Travel File access is deliberately narrower than checkout access.
 * A Stripe session reference is only enough once the booking webhook has
 * confirmed payment and copied the purchase snapshot into the paid booking.
 */
export function resolvePaidFrozenBookingSnapshot(row: BookingLike): PublicBookingAccessResult {
  if (!row || row.status !== "paid") {
    return { ok: false, status: 404, error: "not_found" };
  }

  if (!isRecord(row.booking_details)) {
    return { ok: false, status: 409, error: "not_ready" };
  }

  const snapshot = row.booking_details.snapshot;
  if (!isRecord(snapshot)) {
    return { ok: false, status: 409, error: "not_ready" };
  }

  const frozenAt = snapshot.frozenAt;
  if (typeof frozenAt !== "string" || !frozenAt.trim()) {
    return { ok: false, status: 409, error: "not_ready" };
  }

  return { ok: true, snapshot };
}

export async function loadPaidFrozenBookingSnapshot(
  sessionId: string,
): Promise<PublicBookingAccessResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("status, booking_details")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return resolvePaidFrozenBookingSnapshot(data);
}
