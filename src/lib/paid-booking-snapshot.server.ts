type AnyRec = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRec {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Resolve the guest-facing Travel File source of truth.
 *
 * Public itinerary surfaces must never read the draft `booking_snapshots` row
 * directly. They only become available after Stripe has produced a paid
 * booking and the webhook has copied a frozen snapshot into
 * `bookings.booking_details.snapshot`.
 *
 * Returns null for missing, unpaid, missing-snapshot and unfrozen states so
 * callers do not leak which part of the payment lifecycle a reference is in.
 */
export async function resolvePaidFrozenBookingSnapshot(
  sessionId: string,
): Promise<AnyRec | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("booking_details")
    .eq("stripe_session_id", sessionId)
    .eq("status", "paid")
    .maybeSingle();

  if (error) {
    console.error("paid booking snapshot lookup failed:", error.message);
    throw new Error("booking_snapshot_lookup_failed");
  }

  if (!data || !isRecord(data.booking_details)) return null;

  const snapshot = data.booking_details.snapshot;
  if (!isRecord(snapshot)) return null;

  const frozenAt = snapshot.frozenAt;
  if (typeof frozenAt !== "string" || !frozenAt.trim()) return null;

  return snapshot;
}
