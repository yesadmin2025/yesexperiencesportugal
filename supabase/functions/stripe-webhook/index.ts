// Stripe webhook → records the booking in Supabase, attempts Bokun push for Signatures.
// One endpoint serves BOTH sandbox and live; both webhook secrets are tried so Stripe
// can post from either mode to the same URL.
//
// Required secrets:
//   STRIPE_LIVE_API_KEY, STRIPE_SANDBOX_API_KEY        (already set)
//   STRIPE_WEBHOOK_SECRET_LIVE                          (whsec_… from live endpoint)
//   STRIPE_WEBHOOK_SECRET_SANDBOX                       (whsec_… from sandbox endpoint)
//   BOKUN_ACCESS_KEY, BOKUN_SECRET_KEY                  (already set)

import Stripe from "https://esm.sh/stripe@22.0.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";
import {
  getActivityAvailabilities,
  reserveAndConfirm,
  type AvailabilitySlot,
} from "../_shared/bokun.ts";

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

  if (!event || !stripeEnv) {
    console.error("Webhook signature verification failed:", lastError);
    return new Response(`Invalid signature: ${lastError}`, { status: 400, headers: corsHeaders });
  }

  // Idempotency: ignore non-checkout events quickly.
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return new Response(JSON.stringify({ received: true, status: session.payment_status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

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
    .select("id, bokun_status")
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

  // Only Signature bookings push to Bokun. Builder/Moments are Stripe-only by design.
  if (bookingType !== "signature" || !tourId) {
    return new Response(JSON.stringify({ ok: true, bookingId, bokun: "skipped" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Avoid double-push if a previous attempt already succeeded.
  if (existing?.bokun_status === "confirmed") {
    return new Response(JSON.stringify({ ok: true, bookingId, bokun: "already_confirmed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Attempt Bokun push (non-blocking for Stripe — we always 200 after recording).
  let bokunResult: {
    status: string;
    booking_id?: string;
    confirmation?: string;
    error?: string;
  } = { status: "skipped" };

  try {
    const { data: mapping } = await admin
      .from("tour_bokun_mapping")
      .select("bokun_product_id")
      .eq("tour_id", tourId)
      .maybeSingle();

    if (!mapping?.bokun_product_id) {
      bokunResult = { status: "needs_review", error: "No Bokun mapping for this tour" };
    } else if (!dateExact) {
      bokunResult = { status: "needs_review", error: "Customer did not select an exact date" };
    } else {
      const slots = (await getActivityAvailabilities(
        mapping.bokun_product_id,
        dateExact,
      )) as AvailabilitySlot[];
      const usable = slots.filter((s) => (s.availabilityCount ?? 1) >= guests);

      // If the customer picked a specific slot in FinalDetailsDialog, lock to it.
      const lockedId = Number(meta.bokun_availability_id ?? 0);
      const lockedSlot =
        lockedId > 0 ? usable.find((s) => Number(s.id) === lockedId) ?? null : null;

      let chosen: AvailabilitySlot | null = lockedSlot;
      let ambiguousReason: string | null = null;

      if (!chosen) {
        if (usable.length === 0) {
          ambiguousReason = `No Bokun availability on ${dateExact} for ${guests} guests`;
        } else if (usable.length === 1) {
          chosen = usable[0];
        } else {
          ambiguousReason = `Multiple Bokun slots on ${dateExact} (${usable.length}) — pick one manually`;
        }
      }

      if (!chosen) {
        bokunResult = { status: "needs_review", error: ambiguousReason ?? "No slot resolved" };
      } else {
        const slot = chosen;
        const cat = slot.pricingCategories?.[0];
        if (!cat) {
          bokunResult = {
            status: "needs_review",
            error: "Bokun slot has no pricing category",
          };
        } else {
          const [firstName, ...rest] = (customerName ?? "Guest Guest").split(" ");
          const lastName = rest.join(" ") || "—";
          const isTailored = meta.tailored === "1";
          const stopsLine = meta.stops ? ` · Stops: ${meta.stops.replace(/\|/g, ", ")}` : "";
          const tailorPrefix = isTailored ? "[TAILORED — operator to verify stop changes] " : "";
          const r = await reserveAndConfirm({
            productId: mapping.bokun_product_id,
            availabilityId: slot.id,
            startTime: slot.startTime,
            date: slot.date,
            guests,
            pricingCategoryId: cat.id,
            customer: {
              firstName,
              lastName,
              email: customerEmail ?? "noreply@yesexperiencesportugal.com",
              phoneNumber: customerPhone ?? undefined,
              language: "EN",
            },
            externalBookingReference: session.id,
            notes:
              `${tailorPrefix}YES booking · ${meta.pickup ?? ""} · ${meta.journey_title ?? ""}${stopsLine}`.slice(
                0,
                500,
              ),
          });
          bokunResult = {
            // Tailored bookings always land in needs_review so the operator
            // reconciles the stop changes against the base Bokun product.
            status: isTailored ? "needs_review" : "confirmed",
            booking_id: r.bookingId,
            confirmation: r.confirmationCode,
            error: isTailored ? "Tailored itinerary — verify stop changes in Bokun" : undefined,
          };
        }

      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Bokun push failed:", msg);
    bokunResult = { status: "failed", error: msg };
  }

  await admin
    .from("bookings")
    .update({
      bokun_status: bokunResult.status,
      bokun_booking_id: bokunResult.booking_id ?? null,
      bokun_confirmation_code: bokunResult.confirmation ?? null,
      bokun_error: bokunResult.error ?? null,
      bokun_last_attempt_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  return new Response(JSON.stringify({ ok: true, bookingId, bokun: bokunResult }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
