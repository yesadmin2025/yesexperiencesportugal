// Stripe webhook → records the booking in Supabase.
// One endpoint serves BOTH sandbox and live; both webhook secrets are tried so Stripe
// can post from either mode to the same URL.
//
// Required secrets:
//   STRIPE_LIVE_API_KEY, STRIPE_SANDBOX_API_KEY        (already set)
//   STRIPE_WEBHOOK_SECRET_LIVE                          (whsec_… from live endpoint)
//   STRIPE_WEBHOOK_SECRET_SANDBOX                       (whsec_… from sandbox endpoint)

import Stripe from "https://esm.sh/stripe@22.0.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400, headers: corsHeaders });

  const rawBody = await req.text();

  // Try live first, then sandbox; whichever verifies wins and sets the env.
  const candidates: Array<{ env: StripeEnv; secret: string | undefined }> = [
    { env: "live", secret: Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE") },
    { env: "live", secret: Deno.env.get("STRIPE_WEBHOOK_SECRET") },
    { env: "sandbox", secret: Deno.env.get("STRIPE_WEBHOOK_SECRET_SANDBOX") },
  ];

  let event: Stripe.Event | null = null;
  let stripeEnv: StripeEnv | null = null;
  let lastError = "";
  for (const c of candidates) {
    if (!c.secret) continue;
    try {
      const stripe = createStripeClient(c.env);
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, c.secret);
      stripeEnv = c.env;
      break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const logEvent = async (row: Record<string, unknown>) => {
    try {
      await admin.from("stripe_webhook_events").insert(row);
    } catch (e) {
      console.error("Failed to log webhook event:", e);
    }
  };

  if (!event || !stripeEnv) {
    const diag = candidates
      .map((c, i) => {
        const s = c.secret ?? "";
        const name = [
          "STRIPE_WEBHOOK_SECRET_LIVE",
          "STRIPE_WEBHOOK_SECRET",
          "STRIPE_WEBHOOK_SECRET_SANDBOX",
        ][i];
        return `${name}: ${s ? `present len=${s.length} prefix=${s.slice(0, 8)}` : "missing"}`;
      })
      .join(" | ");
    const sigPrefix = sig.slice(0, 40);
    console.error(
      "Webhook signature verification failed:",
      lastError,
      "| diag:",
      diag,
      "| sig:",
      sigPrefix,
      "| bodyLen:",
      rawBody.length,
    );
    await logEvent({
      verified: false,
      status_code: 400,
      error_message: lastError || "signature verification failed",
      metadata: { diag, sig_prefix: sigPrefix, body_len: rawBody.length },
    });
    return new Response(`Invalid signature: ${lastError}`, { status: 400, headers: corsHeaders });
  }

  const sessionPreview = event.data.object as Stripe.Checkout.Session;
  const baseLog = {
    event_id: event.id,
    event_type: event.type,
    stripe_env: stripeEnv,
    verified: true,
    session_id: sessionPreview?.id ?? null,
    payment_status: sessionPreview?.payment_status ?? null,
    amount_total: sessionPreview?.amount_total ?? null,
    currency: sessionPreview?.currency ?? null,
    customer_email:
      sessionPreview?.customer_details?.email ?? sessionPreview?.customer_email ?? null,
    booking_type: (sessionPreview?.metadata?.booking_type as string) ?? null,
    metadata: sessionPreview?.metadata ?? null,
  };

  // Idempotency: ignore non-checkout events quickly.
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    await logEvent({ ...baseLog, status_code: 200, error_message: "ignored (non-checkout)" });
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    await logEvent({
      ...baseLog,
      status_code: 200,
      error_message: `unpaid: ${session.payment_status}`,
    });
    return new Response(JSON.stringify({ received: true, status: session.payment_status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await logEvent({ ...baseLog, status_code: 200 });

  const meta = (session.metadata ?? {}) as Record<string, string>;
  const bookingType = (meta.booking_type ?? "builder") as "signature" | "builder" | "moment";
  const guests = Math.max(1, Number(meta.guests ?? 1));
  const dateExact = (meta.date_exact ?? "").trim() || null;
  const tourId = meta.tour_id ?? null;
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
  const customerName = session.customer_details?.name ?? null;
  const customerPhone = session.customer_details?.phone ?? null;
  const amountTotal = session.amount_total ?? null;
  const currency = (session.currency ?? "eur").toLowerCase();

  // Upsert booking — unique on stripe_session_id.
  const { data: existing } = await admin
    .from("bookings")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  let bookingId = existing?.id as string | undefined;

  const baseRow = {
    booking_type: bookingType,
    source_tour_id: tourId,
    customer_email: customerEmail,
    customer_name: customerName,
    customer_phone: customerPhone,
    guests,
    preferred_date: dateExact,
    amount_total: amountTotal,
    currency,
    status: "paid",
    stripe_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    metadata: { ...meta, stripe_env: stripeEnv, event_id: event.id },
  } as const;

  if (!bookingId) {
    const { data: ins, error: insErr } = await admin
      .from("bookings")
      .insert(baseRow)
      .select("id")
      .single();
    if (insErr) {
      console.error("Failed to insert booking:", insErr);
      return new Response(`DB insert error: ${insErr.message}`, {
        status: 500,
        headers: corsHeaders,
      });
    }
    bookingId = ins.id as string;
  } else {
    await admin.from("bookings").update(baseRow).eq("id", bookingId);
  }

  // Fire-and-forget: send branded checkout confirmation email with receipt link.
  // Non-blocking so a failure here never breaks Stripe delivery.
  try {
    if (customerEmail) {
      const stripe = createStripeClient(stripeEnv);
      let receiptUrl: string | null = null;
      try {
        const piId = typeof session.payment_intent === "string" ? session.payment_intent : null;
        if (piId) {
          const pi = await stripe.paymentIntents.retrieve(piId, {
            expand: ["latest_charge"],
          });
          const ch = pi.latest_charge;
          if (ch && typeof ch !== "string") {
            receiptUrl = ch.receipt_url ?? null;
          }
        }
      } catch (e) {
        console.warn("receipt_url lookup failed:", e instanceof Error ? e.message : e);
      }

      const amountFormatted =
        amountTotal != null
          ? new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: currency.toUpperCase(),
            }).format(amountTotal / 100)
          : null;

      const siteUrl = Deno.env.get("SITE_URL") ?? "https://yesexperiencesportugal.com";
      const internalSecret = Deno.env.get("EMAIL_INTERNAL_SECRET");

      if (internalSecret) {
        const payload = {
          recipientEmail: customerEmail,
          sessionId: session.id,
          customerName,
          tourTitle: meta.journey_title || meta.tour_title || tourId || null,
          bookingType,
          dateExact,
          guests,
          amountFormatted,
          bookingRef: session.id,
          
          receiptUrl,
          bookingStatusUrl: `${siteUrl}/booking-confirmed?session_id=${encodeURIComponent(session.id)}`,
          pickup: meta.pickup || null,
        };
        const resp = await fetch(`${siteUrl}/api/public/hooks/checkout-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${internalSecret}`,
          },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          console.warn(
            "checkout-email hook non-2xx:",
            resp.status,
            await resp.text().catch(() => ""),
          );
        }
      } else {
        console.warn("EMAIL_INTERNAL_SECRET not configured — skipping receipt email");
      }
    }
  } catch (e) {
    console.error("send checkout email failed:", e instanceof Error ? e.message : e);
  }

  return new Response(JSON.stringify({ ok: true, bookingId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
