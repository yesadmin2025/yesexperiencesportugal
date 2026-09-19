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
type StripePaymentIntent = {
  amount_received?: number;
  latest_charge?: {
    amount_refunded?: number;
    refunded?: boolean;
  } | string | null;
};
type StripeErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

const isFullyRefunded = (paymentIntent: StripePaymentIntent) => {
  const charge = typeof paymentIntent.latest_charge === "object" ? paymentIntent.latest_charge : null;
  const amountReceived = paymentIntent.amount_received ?? 0;
  const amountRefunded = charge?.amount_refunded ?? 0;
  return charge?.refunded === true || (amountReceived > 0 && amountRefunded >= amountReceived);
};

const readStripeError = async (response: Response) => {
  const raw = await response.text().catch(() => "");
  try {
    const payload = JSON.parse(raw) as StripeErrorPayload;
    return {
      code: payload.error?.code ?? "",
      message: payload.error?.message ?? raw,
      raw,
    };
  } catch {
    return { code: "", message: raw, raw };
  }
};

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

    const paymentIntentUrl = new URL(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(booking.stripe_payment_intent_id)}`,
    );
    paymentIntentUrl.searchParams.append("expand[]", "latest_charge");
    const paymentIntentResponse = await fetch(paymentIntentUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!paymentIntentResponse.ok) {
      const stripeError = await readStripeError(paymentIntentResponse);
      console.error("[booking-refund] Could not inspect payment", {
        bookingId: booking.id,
        status: paymentIntentResponse.status,
        code: stripeError.code,
        detail: stripeError.raw.slice(0, 300),
      });
      throw new Error("The payment could not be verified with Stripe. No booking details were changed. Try again shortly.");
    }
    let paymentIntent = (await paymentIntentResponse.json()) as StripePaymentIntent;
    let refund: StripeRefund;
    let alreadyRefunded = isFullyRefunded(paymentIntent);

    const refundBody = new URLSearchParams({ payment_intent: booking.stripe_payment_intent_id });
    const refundResponse = alreadyRefunded ? null : await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `yes-booking-refund-${booking.id}`,
      },
      body: refundBody,
    });
    if (refundResponse && !refundResponse.ok) {
      const stripeError = await readStripeError(refundResponse);
      console.error("[booking-refund] Stripe rejected refund", {
        bookingId: booking.id,
        status: refundResponse.status,
        code: stripeError.code,
        detail: stripeError.raw.slice(0, 300),
      });

      const mayAlreadyBeRefunded =
        stripeError.code === "charge_already_refunded" ||
        /amount\s*=\s*0|already refunded|nothing (?:left )?to refund/i.test(stripeError.message);
      if (mayAlreadyBeRefunded) {
        const refreshedResponse = await fetch(paymentIntentUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (refreshedResponse.ok) {
          paymentIntent = (await refreshedResponse.json()) as StripePaymentIntent;
          alreadyRefunded = isFullyRefunded(paymentIntent);
        }
      }
      if (!alreadyRefunded) {
        if (
          stripeError.code === "balance_insufficient" ||
          /insufficient funds|insufficient.*balance/i.test(stripeError.message)
        ) {
          throw new Error(
            "Stripe does not currently have enough available balance for this refund. Add funds or wait for the balance to become available, then try again. The booking remains paid.",
          );
        }
        throw new Error(`Stripe could not submit the refund${stripeError.code ? ` (${stripeError.code})` : ""}. The booking remains paid.`);
      }
    }
    refund = alreadyRefunded
      ? { id: booking.stripe_payment_intent_id, status: "succeeded" }
      : (await (refundResponse as Response).json()) as StripeRefund;
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
          refund_reconciled: alreadyRefunded,
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

    return {
      ok: true,
      status: "refunded" as const,
      refundStatus: refund.status ?? "submitted",
      alreadyProcessed: alreadyRefunded,
    };
  });

/* eslint-enable @typescript-eslint/no-explicit-any */

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const editInput = z.object({
  id: z.string().uuid(),
  customerName: z.string().trim().min(1).max(120).optional(),
  customerPhone: z.string().trim().max(40).nullable().optional(),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

/**
 * Operational edit of one reservation. Only fields the team may legitimately
 * correct after purchase: guest name/phone, trip date, internal notes.
 * Amounts, status and Stripe references are never touched here — money moves
 * only through cancelAndRefundBooking. Every edit is audited in metadata.
 */
export const updateAdminBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => editInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error: readError } = await supabaseAdmin
      .from("bookings")
      .select("id, status, customer_name, customer_phone, preferred_date, notes, metadata, booking_details")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!booking) throw new Error("Booking not found.");

    const patch: {
      customer_name?: string;
      customer_phone?: string | null;
      preferred_date?: string | null;
      notes?: string | null;
      metadata?: Json;
    } = {};
    const changes: Record<string, { from: string | null; to: string | null }> = {};
    const apply = (key: "customer_name" | "customer_phone" | "preferred_date" | "notes", to: unknown) => {
      const from = (booking as Record<string, unknown>)[key];
      if (to !== from) {
        (patch as Record<string, unknown>)[key] = to;
        changes[key] = {
          from: from == null ? null : String(from),
          to: to == null ? null : String(to),
        };
      }
    };
    if (data.customerName !== undefined) apply("customer_name", data.customerName);
    if (data.customerPhone !== undefined) apply("customer_phone", data.customerPhone || null);
    if (data.preferredDate !== undefined) apply("preferred_date", data.preferredDate);
    if (data.notes !== undefined) apply("notes", data.notes || null);

    if (Object.keys(patch).length === 0) return { ok: true, changed: false };

    const previousMetadata =
      booking.metadata && typeof booking.metadata === "object" && !Array.isArray(booking.metadata)
        ? (booking.metadata as Record<string, unknown>)
        : {};
    const priorEdits = Array.isArray(previousMetadata["booking_edits"])
      ? (previousMetadata["booking_edits"] as Json[])
      : [];
    patch["metadata"] = ({
      ...previousMetadata,
      booking_edits: [
        ...priorEdits,
        { at: new Date().toISOString(), by: context.userId, changes },
      ],
    }) as Json;

    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update(patch)
      .eq("id", booking.id);
    if (updateError) throw new Error(updateError.message);
    return { ok: true, changed: true, changes };
  });

const notifyInput = z.object({
  id: z.string().uuid(),
  message: z.string().trim().min(10).max(2000),
});

/**
 * Sends the guest a branded update email about their reservation. Content is
 * written by the operator; booking facts (experience, date, reference) come
 * from the stored record, never from the message text. Uses the pre-rendered
 * path of the internal mail pipeline, so suppression, unsubscribe and the
 * send log all apply as with any other transactional email.
 */
export const notifyBookingCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => notifyInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("id, customer_email, customer_name, preferred_date, source_tour_id, stripe_session_id, booking_details")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Booking not found.");
    if (!booking.customer_email) throw new Error("This booking has no guest email.");

    const details =
      booking.booking_details && typeof booking.booking_details === "object" && !Array.isArray(booking.booking_details)
        ? (booking.booking_details as Record<string, unknown>)
        : {};
    const snapshot = details.snapshot && typeof details.snapshot === "object"
      ? (details.snapshot as Record<string, unknown>)
      : {};
    const experienceName =
      (typeof snapshot["experienceName"] === "string" && (snapshot["experienceName"] as string)) ||
      booking.source_tour_id ||
      "Your experience";
    const guestName = booking.customer_name || "there";
    const dateLine = booking.preferred_date ?? "date to confirm";

    const messageHtml = escapeHtml(data.message).replace(/\n/g, "<br />");
    const subject = `Update about your booking — ${experienceName}`;
    const html = [
      `<div style="font-family:Arial,sans-serif;color:#2E2E2E;max-width:560px">`,
      `<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#295B61">YES Experiences Portugal</p>`,
      `<h1 style="font-family:Newsreader,serif;font-size:22px;font-weight:normal">A note about your day with us</h1>`,
      `<p>Hello ${escapeHtml(guestName)},</p>`,
      `<p style="line-height:1.6">${messageHtml}</p>`,
      `<div style="margin:20px 0;padding:14px 16px;background:#F4EFE7;border-left:3px solid #C9A96A;font-size:14px">`,
      `<strong>${escapeHtml(experienceName)}</strong><br />Date: ${escapeHtml(dateLine)}<br />Reference: ${escapeHtml(booking.stripe_session_id ?? booking.id)}`,
      `</div>`,
      `<p style="font-size:13px;color:#6b6b6b">Reply to this email and it reaches our team directly.</p>`,
      `</div>`,
    ].join("");
    const text = [
      `Hello ${guestName},`,
      "",
      data.message,
      "",
      `${experienceName} — Date: ${dateLine} — Reference: ${booking.stripe_session_id ?? booking.id}`,
      "",
      "Reply to this email and it reaches our team directly.",
    ].join("\n");

    const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");
    // Same message to the same booking sends once; a new message gets a new key.
    let hash = 0;
    for (let i = 0; i < data.message.length; i++) {
      hash = (hash * 31 + data.message.charCodeAt(i)) >>> 0;
    }
    const result = await sendTransactionalInternal({
      templateName: "booking-operator-message",
      recipientEmail: booking.customer_email,
      idempotencyKey: `booking-notify-${booking.id}-${hash.toString(36)}`,
      rendered: { subject, html, text },
    });
    return { ok: result.ok };
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
