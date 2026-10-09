/**
 * Admin-entered bookings (phone, email, partner or walk-in). One row in
 * `bookings` — the same source of truth as website/partner bookings — then the
 * existing least-busy-free-guide auto-assignment.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signatureTours } from "@/data/signatureTours";
import { isCanonicalPaymentHost } from "@/lib/payments-environment";

const input = z.object({
  tourId: z.string().trim().max(120).optional().nullable(),
  tourTitle: z.string().trim().max(200).optional().nullable(),
  date: z.string().date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  pickup: z.string().trim().min(2).max(300),
  guests: z.number().int().min(1).max(50),
  language: z.string().trim().max(40).optional().nullable(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  channel: z.enum(["DIRECT", "VIATOR", "GETYOURGUIDE", "BOKUN"]),
  reference: z.string().trim().max(120).optional().nullable(),
  amountEuros: z.number().min(0).max(100000),
  paid: z.boolean(),
});

export const createManualBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || isAdmin !== true) throw new Error("Forbidden");

    const tour = data.tourId ? signatureTours.find((t) => t.id === data.tourId) : null;
    const title = tour?.title ?? data.tourTitle ?? null;
    if (!title) throw new Error("Choose a tour or type its name.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        booking_type: "signature",
        source: "ADMIN",
        source_channel: data.channel,
        external_booking_ref: data.reference || null,
        source_tour_id: tour?.id ?? null,
        tour_title: title,
        preferred_date: data.date,
        start_time: data.startTime || null,
        pickup_location: data.pickup,
        guests: data.guests,
        language: data.language || null,
        customer_name: data.name,
        customer_email: data.email.toLowerCase(),
        customer_phone: data.phone || null,
        client_notes: data.notes || null,
        amount_total: Math.round(data.amountEuros * 100),
        currency: "eur",
        status: data.paid ? "paid" : "pending",
        payment_status: data.paid ? "PAID" : null,
        metadata: { created_by: context.userId, created_via: "admin_manual" },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { data: gid, error: autoErr } = await context.supabase.rpc("ops_auto_assign_guide", { _booking_id: row.id });
    if (autoErr) console.error("auto-assign failed", autoErr.message);
    if (gid) { try { const { dispatchGuideAssignmentEmails } = await import("@/lib/guide-notify.server"); await dispatchGuideAssignmentEmails(row.id); } catch (e) { console.error("guide notify failed", e); } }
    return { id: row.id as string, assignedGuideId: (gid as string | null) ?? null };
  });

const linkInput = z.object({ bookingId: z.string().uuid() });

interface StripeCheckoutSession {
  id: string;
  url: string | null;
}

/**
 * Issue a Stripe payment link for an admin-entered booking that is not paid
 * yet. The amount, currency, tour and guest email are read server-side from
 * the booking row — the client only sends the booking id. The session id is
 * stored on the booking immediately, so the existing Stripe webhook finds
 * the row by stripe_session_id and marks it paid when the guest pays.
 *
 * Environment follows the same host rule as the rest of payments: live only
 * on the canonical production hosts, sandbox everywhere else.
 */
export const createBookingPaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => linkInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || isAdmin !== true) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, status, tour_title, preferred_date, guests, customer_email, amount_total, currency, source_tour_id, stripe_session_id",
      )
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!booking) throw new Error("Booking not found.");
    if (booking.status === "paid") throw new Error("This booking is already paid.");
    if (booking.status === "cancelled" || booking.status === "refunded") {
      throw new Error("This booking is no longer active.");
    }
    const amountCents = Number(booking.amount_total ?? 0);
    if (!Number.isFinite(amountCents) || amountCents < 50) {
      throw new Error("Set an amount on the booking before issuing a payment link.");
    }

    const host = getRequestHeader("host") ?? null;
    const isLive = isCanonicalPaymentHost(host);
    const apiKey = isLive ? process.env.STRIPE_LIVE_API_KEY : process.env.STRIPE_SANDBOX_API_KEY;
    if (!apiKey) throw new Error("The payment connection is not configured.");

    const title = (booking.tour_title ?? "Private experience").slice(0, 160);
    const dateLine = booking.preferred_date ? ` · ${booking.preferred_date}` : "";
    const site = "https://yesexperiencesportugal.com";

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("line_items[0][price_data][currency]", (booking.currency ?? "eur").toLowerCase());
    params.set("line_items[0][price_data][product_data][name]", `${title}${dateLine}`.slice(0, 180));
    params.set("line_items[0][price_data][product_data][images][0]", `${site}/og-cover.jpg`);
    params.set("line_items[0][price_data][unit_amount]", String(amountCents));
    params.set("line_items[0][quantity]", "1");
    params.set("adaptive_pricing[enabled]", "false");
    params.set("locale", "auto");
    params.set("submit_type", "book");
    params.set("billing_address_collection", "auto");
    params.set("allow_promotion_codes", "false");
    params.set("consent_collection[terms_of_service]", "required");
    params.set(
      "custom_text[terms_of_service_acceptance][message]",
      "By booking you accept the [YES Experiences Portugal terms](https://yesexperiencesportugal.com/terms) and [privacy policy](https://yesexperiencesportugal.com/privacy).",
    );
    params.set("payment_intent_data[statement_descriptor_suffix]", "YES EXPERIENCES");
    params.set("payment_intent_data[description]", `${title}${dateLine}`.slice(0, 1000));
    if (booking.customer_email) params.set("customer_email", booking.customer_email);
    params.set("success_url", `${site}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${site}/admin/bookings/${booking.id}`);
    params.set("metadata[booking_type]", "signature");
    params.set("metadata[flow]", "admin_manual");
    params.set("metadata[admin_manual]", "1");
    params.set("metadata[tour_id]", booking.source_tour_id ?? "");
    params.set("metadata[guests]", String(booking.guests ?? 1));
    params.set("metadata[date_exact]", booking.preferred_date ?? "");

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        // Retries while the booking is in the same link state reuse one
        // session; issuing again after a link exists creates a fresh one.
        "Idempotency-Key": `yes-admin-paylink-${booking.id}-${booking.stripe_session_id ?? "none"}`,
      },
      body: params,
    });
    if (!response.ok) {
      const raw = await response.text();
      console.error("[admin-payment-link] Stripe rejected session", {
        bookingId: booking.id,
        status: response.status,
        detail: raw.slice(0, 300),
      });
      throw new Error("Stripe could not create the payment link. Try again shortly.");
    }
    const session = (await response.json()) as StripeCheckoutSession;
    if (!session.url) throw new Error("Stripe did not return a payment link.");

    const { error: upErr } = await supabaseAdmin
      .from("bookings")
      .update({ stripe_session_id: session.id })
      .eq("id", booking.id);
    if (upErr) throw new Error(upErr.message);

    return { url: session.url, sessionId: session.id };
  });
