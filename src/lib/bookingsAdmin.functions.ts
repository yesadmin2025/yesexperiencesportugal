/**
 * Admin-only booking reads.
 *
 * Display only — nothing here computes or mutates pricing. The detail view
 * renders the frozen purchase snapshot captured at checkout so later edits
 * to tours or pricing tables can never rewrite a past reservation.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

const listInput = z.object({
  search: z.string().max(200).optional(),
  /** "paid" is the operational default: only real, confirmed trips. */
  status: z.enum(["paid", "pending", "cancelled", "refunded", "failed", "all"]).default("paid"),
  limit: z.number().int().min(1).max(200).default(50),
});

const LIST_COLUMNS =
  "id, created_at, booking_type, source_tour_id, customer_name, customer_email, guests, preferred_date, amount_total, currency, status, stripe_session_id, booking_details";

export const listAdminBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("bookings")
      .select(LIST_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.status !== "all") query = query.eq("status", data.status);

    const term = data.search?.trim();
    if (term) {
      const safe = term.replace(/[%,()]/g, " ").trim();
      if (safe) {
        query = query.or(
          [
            `customer_email.ilike.%${safe}%`,
            `customer_name.ilike.%${safe}%`,
            `stripe_session_id.ilike.%${safe}%`,
            `source_tour_id.ilike.%${safe}%`,
          ].join(","),
        );
      }
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { bookings: rows ?? [] };
  });

const detailInput = z.object({ id: z.string().uuid() });

export const getAdminBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => detailInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) return { booking: null, snapshot: null as Json | null };

    // Prefer the snapshot frozen into the booking row; fall back to the
    // checkout-time draft when the webhook froze before this feature shipped.
    const details = (booking.booking_details ?? {}) as Record<string, unknown>;
    let snapshot =
      details.snapshot && typeof details.snapshot === "object"
        ? (details.snapshot as Record<string, unknown>)
        : null;

    if (!snapshot && booking.stripe_session_id) {
      const { data: snapRow } = await supabaseAdmin
        .from("booking_snapshots")
        .select("payload, frozen_at")
        .eq("stripe_session_id", booking.stripe_session_id)
        .maybeSingle();
      if (snapRow?.payload && typeof snapRow.payload === "object") {
        snapshot = {
          ...(snapRow.payload as Record<string, unknown>),
          frozenAt: snapRow.frozen_at ?? null,
        };
      }
    }

    return { booking, snapshot: (snapshot ?? null) as Json | null };
  });
