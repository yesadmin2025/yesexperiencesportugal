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

    // deno-lint-ignore no-explicit-any
    const pi = session.payment_intent as any;
    // deno-lint-ignore no-explicit-any
    const charge = pi && typeof pi === "object" ? (pi.latest_charge as any) : null;
    const receiptUrl = charge && typeof charge === "object" ? (charge.receipt_url ?? null) : null;

    return json({
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
