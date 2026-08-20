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

  // Internal health diagnostics run entirely inside this deployed function.
  // This avoids the old false-negative where the app server and this function
  // held different snapshots of STRIPE_WEBHOOK_SECRET_LIVE.
  if (req.headers.get("x-yes-internal-action") === "healthcheck") {
    const internalSecret = Deno.env.get("EMAIL_INTERNAL_SECRET") ?? "";
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!internalSecret || bearer !== internalSecret) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    let requestedEnv: StripeEnv = "live";
    try {
      const body = (await req.json()) as { environment?: string };
      requestedEnv = body.environment === "sandbox" ? "sandbox" : "live";
    } catch {
      // Default to live when the internal caller sends no body.
    }

    const secretName =
      requestedEnv === "sandbox" ? "STRIPE_WEBHOOK_SECRET_SANDBOX" : "STRIPE_WEBHOOK_SECRET_LIVE";
    const secret = Deno.env.get(secretName);
    if (!secret || !secret.startsWith("whsec_")) {
      return Response.json(
        {
          ok: false,
          reason: `${secretName} is missing or invalid in the deployed webhook.`,
          secretPresent: Boolean(secret),
          secretPrefixOk: Boolean(secret?.startsWith("whsec_")),
          validStatus: null,
          invalidStatus: null,
        },
        { status: 200, headers: corsHeaders },
      );
    }

    const stripe = createStripeClient(requestedEnv);
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      id: `evt_healthcheck_${timestamp}`,
      object: "event",
      type: "ping.selftest",
      livemode: requestedEnv === "live",
      created: timestamp,
      data: { object: { id: "healthcheck" } },
    });
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${payload}`));
    const digest = Array.from(new Uint8Array(signed))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    let validAccepted = false;
    let forgedRejected = false;
    try {
      await stripe.webhooks.constructEventAsync(payload, `t=${timestamp},v1=${digest}`, secret);
      validAccepted = true;
    } catch {
      validAccepted = false;
    }
    try {
      await stripe.webhooks.constructEventAsync(
        payload,
        `t=${timestamp},v1=${"0".repeat(64)}`,
        secret,
      );
    } catch {
      forgedRejected = true;
    }

    const ok = validAccepted && forgedRejected;
    return Response.json(
      {
        ok,
        reason: ok
          ? `${requestedEnv === "live" ? "Live" : "Sandbox"} signature accepted and forged signature rejected inside the deployed webhook.`
          : "The deployed webhook could not verify its own signing configuration.",
        secretPresent: true,
        secretPrefixOk: true,
        validStatus: validAccepted ? 200 : 400,
        invalidStatus: forgedRejected ? 400 : 200,
      },
      { status: 200, headers: corsHeaders },
    );
  }

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
    const stripe = createStripeClient(c.env);
    // Try classic webhook payload format first.
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, c.secret);
      stripeEnv = c.env;
      break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      // Fallback: v2 "event notification" (thin event) format. Fetch the full event
      // from Stripe so downstream code keeps its existing Event shape.
      if (lastError.includes("parseEventNotificationAsync")) {
        try {
          const parseFn = (
            stripe.webhooks as unknown as {
              parseEventNotificationAsync?: (
                body: string,
                sig: string,
                secret: string,
              ) => Promise<{ id: string; type: string }>;
            }
          ).parseEventNotificationAsync;
          if (typeof parseFn === "function") {
            const thin = await parseFn.call(stripe.webhooks, rawBody, sig, c.secret);
            const full = await stripe.events.retrieve(thin.id);
            event = full as unknown as Stripe.Event;
            stripeEnv = c.env;
            break;
          }
        } catch (e2) {
          lastError = e2 instanceof Error ? e2.message : String(e2);
        }
      }
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

  // Parse composition from metadata written by create-signature-checkout.
  // Persisted into booking_details jsonb so confirmation emails and
  // operator ops can render adult/youth/child/infant split.
  const adultsMeta = Number(meta.adults ?? guests);
  const adults = Number.isFinite(adultsMeta) && adultsMeta >= 1 ? Math.floor(adultsMeta) : guests;
  const minorAges = (meta.minor_ages ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 17);
  const composition = {
    adults,
    minorAges,
    pricingMode: meta.pricing_mode ?? "legacy_adults_only",
    perPaxEur: Number(meta.per_pax_eur ?? 0) || null,
    tourSubtotalEur: Number(meta.tour_subtotal_eur ?? 0) || null,
    addOnsTotalEur: Number(meta.add_ons_total_eur ?? 0) || 0,
    priceSource: meta.price_source ?? null,
  };

  // Upsert booking — unique on stripe_session_id.
  const { data: existing } = await admin
    .from("bookings")
    .select("id, booking_details")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  let bookingId = existing?.id as string | undefined;

  const existingDetails =
    existing?.booking_details && typeof existing.booking_details === "object"
      ? (existing.booking_details as Record<string, unknown>)
      : {};

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
    booking_details: { ...existingDetails, composition },
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

  // ── Freeze the purchase snapshot ────────────────────────────────
  // Copies the draft written at checkout-create into the booking row so
  // later edits to tours/pricing data can never rewrite a past booking.
  // Idempotent: an already-frozen snapshot is never overwritten.

  let snapshot: Record<string, unknown> | null =
    existingDetails && typeof existingDetails.snapshot === "object" && existingDetails.snapshot
      ? (existingDetails.snapshot as Record<string, unknown>)
      : null;
  try {
    if (!snapshot) {
      const { data: snapRow } = await admin
        .from("booking_snapshots")
        .select("payload, frozen_at")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      if (snapRow?.payload && typeof snapRow.payload === "object") {
        snapshot = {
          ...(snapRow.payload as Record<string, unknown>),
          frozenAt: (snapRow.frozen_at as string | null) ?? new Date().toISOString(),
          amountPaidCents: amountTotal,
          currency,
        };
        await admin
          .from("bookings")
          .update({ booking_details: { ...existingDetails, composition, snapshot } })
          .eq("id", bookingId);
        if (!snapRow.frozen_at) {
          await admin
            .from("booking_snapshots")
            .update({ frozen_at: new Date().toISOString() })
            .eq("stripe_session_id", session.id);
        }
      }
    }
  } catch (e) {
    console.warn("snapshot freeze failed:", e instanceof Error ? e.message : e);
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
          // Composition + per-adult rate so the receipt renders the
          // Adults · Youth · Child · Infant breakdown with subtotals.
          adults: composition.adults,
          minorAges: composition.minorAges,
          perPaxAdultEur: composition.perPaxEur,
          amountFormatted,
          bookingRef: session.id,

          receiptUrl,
          bookingStatusUrl: `${siteUrl}/booking-confirmed?session_id=${encodeURIComponent(session.id)}`,
          pickup: (snapshot?.pickup as string | undefined) || meta.pickup || null,
          startTime: (snapshot?.startTime as string | undefined) ?? null,
          language: (snapshot?.language as string | undefined) ?? null,
          customerPhone: (snapshot?.customerPhone as string | undefined) ?? customerPhone ?? null,
          // Full designed day, frozen at checkout — so both the guest receipt
          // and the internal alert carry every stop, not just the title.
          itinerary: Array.isArray(snapshot?.itinerary) ? snapshot?.itinerary : [],
          includedItems: Array.isArray(snapshot?.includedItems) ? snapshot?.includedItems : [],
          // Admin-only extras (used by the internal team template).
          bookingId,
          adminUrl: `${siteUrl}/admin/bookings/${bookingId}`,
          experienceName:
            (snapshot?.experienceName as string | undefined) ||
            meta.journey_title ||
            meta.tour_title ||
            tourId ||
            null,
          durationLabel: (snapshot?.durationLabel as string | undefined) ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          addOnLabels: Array.isArray((snapshot as any)?.addOns)
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((snapshot as any).addOns as Array<{ label?: string; priceEur?: number }>)
                .map((a) =>
                  a?.label ? `${a.label}${a.priceEur ? ` · €${a.priceEur} pp` : ""}` : "",
                )
                .filter(Boolean)
            : [],
          removedOptions: Array.isArray(snapshot?.removedOptions)
            ? (snapshot?.removedOptions as string[])
            : [],
          customerNotes: Array.isArray(snapshot?.notes) ? (snapshot?.notes as string[]) : [],
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
