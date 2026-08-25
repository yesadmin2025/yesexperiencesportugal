import { createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id") ?? "";
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      return json({ error: "Invalid session_id" }, 400);
    }
    const env = sessionId.startsWith("cs_live_") ? "live" : "sandbox";
    const stripe = createStripeClient(env);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge"],
    });

    // Guardrail: before payment is confirmed, disclose nothing about the
    // buyer or the purchase. Only the minimal verification fields the
    // confirmation page needs to decide what to render.
    if (session.payment_status !== "paid") {
      return json({
        status: session.status,
        paymentStatus: session.payment_status,
        environment: env,
        amountTotal: null,
        currency: null,
        customerEmail: null,
        customerName: null,
        receiptUrl: null,
        created: null,
        lineItems: [],
        metadata: {},
      });
    }

    // deno-lint-ignore no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pi = session.payment_intent as any;
    // deno-lint-ignore no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const charge = pi && typeof pi === "object" ? (pi.latest_charge as any) : null;
    const receiptUrl = charge && typeof charge === "object" ? (charge.receipt_url ?? null) : null;

    // Line items + a whitelisted slice of metadata power the printable
    // receipt page. No PII beyond what the buyer already submitted.
    let lineItems: Array<{ description: string; quantity: number; amountEur: number }> = [];
    try {
      const li = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 25 });
      // deno-lint-ignore no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lineItems = (li.data as any[]).map((i) => ({
        description: String(i.description ?? ""),
        quantity: Number(i.quantity ?? 1),
        amountEur: Number(i.amount_total ?? 0) / 100,
      }));
    } catch (_e) {
      lineItems = [];
    }

    const md = (session.metadata ?? {}) as Record<string, string>;
    const pick = [
      "booking_type",
      "flow",
      "tour_id",
      "journey_title",
      "guests",
      "adults",
      "minor_ages",
      "per_pax_eur",
      "tour_subtotal_eur",
      "add_ons",
      "add_ons_total_eur",
      "date_exact",
      "start_time",
      "pickup",
      "stops",
      "tailored",
    ];
    const meta: Record<string, string> = {};
    for (const k of pick) if (md[k]) meta[k] = md[k];

    return json({
      lineItems,
      metadata: meta,
      created: session.created ?? null,
      status: session.status, // open | complete | expired
      paymentStatus: session.payment_status, // paid | unpaid | no_payment_required
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
      customerName: session.customer_details?.name ?? null,
      receiptUrl,
      environment: env,
    });

  } catch (e) {
    console.error("stripe-session-status error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
