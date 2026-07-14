// Test webhook simulator — stripped of external reservation coupling.
// Records a synthetic booking row so ops emails/rendering can be tested.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405, headers: corsHeaders });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response("config_missing", { status: 500, headers: corsHeaders });
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const body = (await req.json().catch(() => ({}))) as {
    tourId?: string;
    email?: string;
    date?: string;
    guests?: number;
    amountEur?: number;
  };
  const { data, error } = await admin
    .from("bookings")
    .insert({
      stripe_session_id: `test_${Date.now()}`,
      customer_name: "Test Guest",
      customer_email: body.email ?? "test@example.com",
      customer_phone: null,
      guests: body.guests ?? 2,
      preferred_date: body.date ?? new Date().toISOString().slice(0, 10),
      source_tour_id: body.tourId ?? "arrabida-wine-allinclusive",
      amount_total: Math.round((body.amountEur ?? 300) * 100),
      currency: "eur",
      status: "paid",
      metadata: { simulated: "true" },
    })
    .select("id")
    .maybeSingle();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, bookingId: data?.id ?? null }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
