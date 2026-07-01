// Disposable: creates a live €1 Stripe Checkout session for webhook verification.
// Delete after webhook signature + Bókun push are confirmed.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
    });
  const key =
    Deno.env.get("STRIPE_RESTRICTED_API_KEY") ?? Deno.env.get("STRIPE_LIVE_API_KEY") ?? "";
  if (!key.startsWith("rk_live_") && !key.startsWith("sk_live_"))
    return new Response(JSON.stringify({ error: "no live key" }), { status: 500 });

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set(
    "success_url",
    "https://www.yesexperiencesportugal.com/booking-confirmed?session_id={CHECKOUT_SESSION_ID}",
  );
  form.set("cancel_url", "https://www.yesexperiencesportugal.com/");
  form.set("line_items[0][price_data][currency]", "eur");
  form.set("line_items[0][price_data][unit_amount]", "100");
  form.set(
    "line_items[0][price_data][product_data][name]",
    "YES Signature — Arrábida Wine (live webhook test)",
  );
  form.set("line_items[0][quantity]", "1");
  form.set("metadata[tour_id]", "arrabida-wine-allinclusive");
  form.set("metadata[guests]", "1");
  form.set("metadata[flow_kind]", "signature");
  form.set("metadata[test_purpose]", "webhook_verification");
  form.set("metadata[per_pax_eur]", "1");
  form.set("payment_intent_data[metadata][tour_id]", "arrabida-wine-allinclusive");
  form.set("payment_intent_data[metadata][flow_kind]", "signature");

  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(key + ":")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const json = await r.json();
  return new Response(JSON.stringify({ id: json.id, url: json.url, error: json.error }), {
    status: r.ok ? 200 : 400,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
