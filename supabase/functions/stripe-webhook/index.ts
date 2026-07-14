// Stripe webhook → records the booking in Supabase.
// No external reservation system. Bookings land in `bookings` and email
// notifications fire; ops confirms the booking manually.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyStripeSignature(req: Request, rawBody: string) {
  const secretSandbox = Deno.env.get("STRIPE_WEBHOOK_SECRET_SANDBOX") ?? Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const secretLive = Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE") ?? Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const sig = req.headers.get("stripe-signature") ?? "";
  const stripe = createStripeClient("sandbox");
  for (const secret of [secretSandbox, secretLive].filter(Boolean) as string[]) {
    try {
      const event = await stripe.webhooks.constructEventAsync(rawBody, sig, secret);
      return event;
    } catch (_e) {
      // try next secret
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const raw = await req.text();
  const event = await verifyStripeSignature(req, raw);
  if (!event) return json({ error: "invalid_signature" }, 400);

  if (event.type !== "checkout.session.completed") {
    return json({ ok: true, ignored: event.type });
  }

  const session = (event as { data: { object: Record<string, unknown> } }).data.object;
  const meta = (session.metadata ?? {}) as Record<string, string>;

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "config_missing" }, 500);
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const bookingRow = {
    stripe_session_id: session.id as string,
    customer_name: (session.customer_details as { name?: string } | undefined)?.name ?? null,
    customer_email:
      (session.customer_details as { email?: string } | undefined)?.email ??
      (session.customer_email as string | undefined) ??
      null,
    customer_phone: (session.customer_details as { phone?: string } | undefined)?.phone ?? null,
    guests: meta.guests ? Number(meta.guests) : null,
    preferred_date: meta.date ?? null,
    source_tour_id: meta.tour_id ?? null,
    amount_total: typeof session.amount_total === "number" ? session.amount_total : null,
    currency: (session.currency as string | undefined) ?? "eur",
    status: "paid",
    metadata: meta,
  };

  const { error, data } = await admin
    .from("bookings")
    .upsert(bookingRow, { onConflict: "stripe_session_id" })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[stripe-webhook] booking upsert failed", error);
    return json({ error: "booking_persist_failed", detail: error.message }, 500);
  }

  return json({ ok: true, bookingId: data?.id ?? null });
});
