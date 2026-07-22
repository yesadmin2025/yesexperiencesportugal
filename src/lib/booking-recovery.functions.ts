import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

const recoveryInput = z.object({
  sessionId: z.string().min(8).max(255),
  resendEmails: z.boolean().default(true),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

type StripeSession = {
  id: string;
  livemode?: boolean;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null } | null;
  payment_intent?:
    | string
    | { id?: string; latest_charge?: string | { receipt_url?: string | null } | null }
    | null;
  metadata?: Record<string, string> | null;
};

/**
 * Admin-only recovery for a paid Checkout Session whose webhook processing was
 * interrupted. It never creates a charge: it reads the authoritative Stripe
 * session, requires payment_status=paid, and upserts by stripe_session_id.
 */
export const recoverPaidBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => recoveryInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const apiKey = process.env.STRIPE_LIVE_API_KEY;
    if (!apiKey?.startsWith("sk_live_")) {
      throw new Error("The live Stripe API key is not configured.");
    }

    const query = new URLSearchParams();
    query.append("expand[]", "payment_intent.latest_charge");
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(data.sessionId)}?${query}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!stripeResponse.ok) {
      const detail = await stripeResponse.text().catch(() => "");
      throw new Error(`Stripe session lookup failed (${stripeResponse.status}): ${detail.slice(0, 220)}`);
    }

    const session = (await stripeResponse.json()) as StripeSession;
    if (session.livemode !== true) throw new Error("This recovery action only accepts live sessions.");
    if (session.payment_status !== "paid") {
      throw new Error(`Payment is not complete (status: ${session.payment_status ?? "unknown"}).`);
    }

    const metadata = session.metadata ?? {};
    const guestsRaw = Number(metadata.guests ?? 1);
    const guests = Number.isFinite(guestsRaw) && guestsRaw > 0 ? Math.floor(guestsRaw) : 1;
    const adultsRaw = Number(metadata.adults ?? guests);
    const adults = Number.isFinite(adultsRaw) && adultsRaw > 0 ? Math.floor(adultsRaw) : guests;
    const minorAges = (metadata.minor_ages ?? "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 17);
    const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
    if (!customerEmail) throw new Error("The paid Stripe session has no customer email.");
    const customerName = session.customer_details?.name ?? null;
    const bookingType: Database["public"]["Enums"]["booking_type"] =
      metadata.booking_type === "signature"
        ? "signature"
        : metadata.booking_type === "tailored"
          ? "tailored"
          : "builder";
    const paymentIntent = session.payment_intent;
    const paymentIntentId =
      typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ?? null;
    const receiptUrl =
      typeof paymentIntent === "object" && paymentIntent
        ? typeof paymentIntent.latest_charge === "object" && paymentIntent.latest_charge
          ? paymentIntent.latest_charge.receipt_url ?? null
          : null
        : null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("bookings")
      .select("id, booking_details")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    const existingDetails =
      existing?.booking_details && typeof existing.booking_details === "object"
        ? (existing.booking_details as Record<string, unknown>)
        : {};
    const bookingRow: Database["public"]["Tables"]["bookings"]["Insert"] = {
      booking_type: bookingType,
      source_tour_id: metadata.tour_id || null,
      customer_email: customerEmail,
      customer_name: customerName,
      customer_phone: session.customer_details?.phone ?? null,
      guests,
      preferred_date: metadata.date_exact || null,
      amount_total: session.amount_total ?? 0,
      currency: (session.currency ?? "eur").toLowerCase(),
      status: "paid",
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      metadata: { ...metadata, stripe_env: "live", recovered_by_admin: true } as Json,
      booking_details: {
        ...existingDetails,
        composition: {
          adults,
          minorAges,
          pricingMode: metadata.pricing_mode ?? "legacy_adults_only",
          perPaxEur: Number(metadata.per_pax_eur ?? 0) || null,
          tourSubtotalEur: Number(metadata.tour_subtotal_eur ?? 0) || null,
          addOnsTotalEur: Number(metadata.add_ons_total_eur ?? 0) || 0,
          priceSource: metadata.price_source ?? null,
        },
      } as Json,
    };

    let bookingId = existing?.id ?? null;
    if (bookingId) {
      const { error } = await supabaseAdmin.from("bookings").update(bookingRow).eq("id", bookingId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("bookings")
        .insert(bookingRow)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      bookingId = inserted.id;
    }

    let emailQueued = false;
    if (data.resendEmails && customerEmail) {
      const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");
      const { TEAM_NOTIFICATION_RECIPIENTS } = await import("@/lib/email/team-recipients");
      const amountFormatted =
        session.amount_total != null
          ? new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: (session.currency ?? "eur").toUpperCase(),
            }).format(session.amount_total / 100)
          : null;
      const templateData = {
        customerName,
        customerEmail,
        tourTitle: metadata.journey_title || metadata.tour_title || metadata.tour_id || null,
        bookingType,
        dateExact: metadata.date_exact || null,
        guests,
        adults,
        minorAges,
        perPaxAdultEur: Number(metadata.per_pax_eur ?? 0) || null,
        amountFormatted,
        bookingRef: session.id,
        receiptUrl,
        bookingStatusUrl: `https://yesexperiencesportugal.com/booking-confirmed?session_id=${encodeURIComponent(session.id)}`,
        pickup: metadata.pickup || null,
      };
      const { data: alreadySent } = await supabaseAdmin
        .from("email_send_log")
        .select("template_name, recipient_email")
        .eq("status", "sent")
        .in("template_name", ["checkout-receipt", "internal-booking"])
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      const wasSent = (templateName: string, recipient: string) =>
        (alreadySent ?? []).some(
          (row) =>
            row.template_name === templateName &&
            row.recipient_email.toLowerCase() === recipient.toLowerCase(),
        );

      const customerResult = wasSent("checkout-receipt", customerEmail)
        ? { ok: true }
        : await sendTransactionalInternal({
            templateName: "checkout-receipt",
            recipientEmail: customerEmail,
            idempotencyKey: `checkout-receipt-${session.id}`,
            templateData,
          });
      const teamResults = await Promise.all(
        TEAM_NOTIFICATION_RECIPIENTS.map((recipient) =>
          wasSent("internal-booking", recipient)
            ? Promise.resolve({ ok: true })
            : sendTransactionalInternal({
                templateName: "internal-booking",
                recipientEmail: recipient,
                idempotencyKey: `internal-booking-${session.id}-${recipient}`,
                templateData,
              }),
        ),
      );
      emailQueued = customerResult.ok && teamResults.every((result) => result.ok);
    }

    return {
      ok: true,
      bookingId,
      created: !existing,
      emailQueued,
      emailBlocked: false,
    };
  });