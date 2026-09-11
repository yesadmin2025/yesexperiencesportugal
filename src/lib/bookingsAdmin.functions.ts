/**
 * Admin-only booking reads and operational actions.
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

const cancelInput = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

type StripeRefund = { id: string; status?: string | null };

/**
 * Cancels a paid booking and refunds its full captured amount. Stripe's
 * idempotency key and the booking status guard make repeat submissions safe.
 */
export const cancelAndRefundBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cancelInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, status, stripe_session_id, stripe_payment_intent_id, customer_email, customer_name, preferred_date, amount_total, currency, source_tour_id, booking_details, metadata")
      .eq("id", data.id)
      .maybeSingle();
    if (bookingError) throw new Error(bookingError.message);
    if (!booking) throw new Error("Booking not found.");
    if (booking.status === "refunded" || booking.status === "cancelled") {
      return { ok: true, status: booking.status, alreadyProcessed: true };
    }
    if (booking.status !== "paid") throw new Error("Only paid bookings can be cancelled and refunded.");
    if (!booking.stripe_payment_intent_id || !booking.stripe_session_id) {
      throw new Error("This booking has no refundable payment reference.");
    }

    const isLive = booking.stripe_session_id.startsWith("cs_live_");
    const apiKey = isLive
      ? process.env['STRIPE_LIVE_API_KEY']
      : process.env['STRIPE_SANDBOX_API_KEY'];
    if (!apiKey) throw new Error("The payment connection is not configured.");

    const refundBody = new URLSearchParams({ payment_intent: booking.stripe_payment_intent_id });
    const refundResponse = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `yes-booking-refund-${booking.id}`,
      },
      body: refundBody,
    });
    if (!refundResponse.ok) {
      const detail = await refundResponse.text().catch(() => "");
      console.error("[booking-refund] Stripe rejected refund", {
        bookingId: booking.id,
        status: refundResponse.status,
        detail: detail.slice(0, 300),
      });
      throw new Error("The refund could not be submitted. No booking details were changed.");
    }
    const refund = (await refundResponse.json()) as StripeRefund;
    const previousMetadata =
      booking.metadata && typeof booking.metadata === "object" && !Array.isArray(booking.metadata)
        ? booking.metadata
        : {};
    const updatedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "refunded",
        metadata: {
          ...previousMetadata,
          refund_id: refund.id,
          refund_status: refund.status ?? "submitted",
          cancellation_reason: data.reason || null,
          cancelled_at: updatedAt,
          cancelled_by: context.userId,
        },
      })
      .eq("id", booking.id)
      .eq("status", "paid");
    if (updateError) throw new Error("The refund succeeded, but the dashboard update failed. Contact support with the booking reference.");

    const details =
      booking.booking_details && typeof booking.booking_details === "object" && !Array.isArray(booking.booking_details)
        ? (booking.booking_details as Record<string, unknown>)
        : {};
    const snapshot = details.snapshot && typeof details.snapshot === "object"
      ? (details.snapshot as Record<string, unknown>)
      : {};
    const amountFormatted = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: String(booking.currency || "EUR").toUpperCase(),
    }).format((booking.amount_total || 0) / 100);
    if (booking.customer_email) {
      const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");
      const templateData = {
        customerName: booking.customer_name,
        experienceName: snapshot.experienceName ?? booking.source_tour_id,
        dateExact: booking.preferred_date,
        amountFormatted,
        bookingRef: booking.stripe_session_id,
        refundStatus: refund.status ?? "submitted",
      };
      await sendTransactionalInternal({
        templateName: "booking-cancelled",
        recipientEmail: booking.customer_email,
        idempotencyKey: `booking-cancelled-${booking.id}`,
        templateData,
      });
      const { TEAM_NOTIFICATION_RECIPIENTS } = await import("@/lib/email/team-recipients");
      await Promise.all(
        TEAM_NOTIFICATION_RECIPIENTS.map((recipientEmail) =>
          sendTransactionalInternal({
            templateName: "booking-cancelled",
            recipientEmail,
            idempotencyKey: `booking-cancelled-team-${booking.id}-${recipientEmail}`,
            templateData,
          }),
        ),
      );
    }

    return { ok: true, status: "refunded" as const, refundStatus: refund.status ?? "submitted" };
  });

/**
 * Calendar read: every reservation with a chosen date inside a month window.
 *
 * Used by the admin availability calendar so the owner can see which dates
 * are already committed (and to which Signature / moments) before pricing.
 * Read-only, admin-gated, no pricing logic.
 */
const calendarInput = z.object({
  /** Inclusive ISO yyyy-mm-dd window start. */
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Inclusive ISO yyyy-mm-dd window end. */
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const listAdminBookingCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => calendarInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, preferred_date, source_tour_id, booking_type, guests, customer_name, customer_email, status, booking_details",
      )
      .in("status", ["paid", "pending"])
      .gte("preferred_date", data.from)
      .lte("preferred_date", data.to)
      .order("preferred_date", { ascending: true })
      .limit(500);

    if (error) throw new Error(error.message);
    return { bookings: rows ?? [] };
  });
