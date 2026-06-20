import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BuilderCheckoutBody {
  // amountInCents is no longer accepted from the client. Price is computed
  // server-side from builder_routing_rules to prevent price manipulation.
  guests: number;
  regionLabel: string;
  stopLabels: string[];
  pace: string;
  /** Optional bounded "Add to your day" element keys (concierge-confirmed). */
  elements?: string[];
  customerEmail?: string;
  returnUrl: string;
  environment: StripeEnv;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = (await req.json()) as BuilderCheckoutBody;

    if (!body || typeof body !== "object") return jsonError("Invalid body", 400);
    if (!Number.isInteger(body.guests) || body.guests < 1 || body.guests > 12)
      return jsonError("Guests must be between 1 and 12", 400);
    if (!body.regionLabel || typeof body.regionLabel !== "string" || body.regionLabel.length > 80)
      return jsonError("Invalid region", 400);
    if (
      !Array.isArray(body.stopLabels) ||
      body.stopLabels.length === 0 ||
      body.stopLabels.length > 10
    )
      return jsonError("Invalid stops", 400);
    // Validate returnUrl origin against an allowlist to prevent open-redirect
    // post-checkout. Allow yesexperiences.pt, lovable.app domains, and an
    // optional RETURN_URL_ORIGIN env override (comma-separated).
    if (!body.returnUrl || typeof body.returnUrl !== "string")
      return jsonError("Invalid return URL", 400);
    let returnOrigin: string;
    try {
      const u = new URL(body.returnUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:")
        return jsonError("Invalid return URL", 400);
      returnOrigin = u.origin;
    } catch {
      return jsonError("Invalid return URL", 400);
    }
    const envAllow = (Deno.env.get("RETURN_URL_ORIGIN") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const staticAllow = new Set<string>([
      "https://yesexperiences.pt",
      "https://www.yesexperiences.pt",
      "https://dreamscape-builder-co.lovable.app",
      ...envAllow,
    ]);
    const isLovableHost =
      /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(returnOrigin) ||
      /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(returnOrigin) ||
      /^https:\/\/[a-z0-9-]+\.lovable\.dev$/.test(returnOrigin);
    const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(returnOrigin);
    if (!staticAllow.has(returnOrigin) && !isLovableHost && !isLocalhost)
      return jsonError("Return URL not allowed", 400);
    if (body.environment !== "sandbox" && body.environment !== "live")
      return jsonError("Invalid environment", 400);
    if (!["relaxed", "balanced", "full"].includes(body.pace)) return jsonError("Invalid pace", 400);

    const elements = Array.isArray(body.elements)
      ? body.elements.filter((e) => typeof e === "string" && e.length <= 40).slice(0, 10)
      : [];

    // Authoritative server-side pricing from builder_routing_rules.
    // Mirrors src/server/builderEngine.server.ts price formula:
    //   base * paceMult * (1 + (stops - min_stops) * 0.08)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: rules, error: rulesErr } = await admin
      .from("builder_routing_rules")
      .select(
        "base_price_per_person_eur,pace_multiplier_relaxed,pace_multiplier_balanced,pace_multiplier_full,min_stops",
      )
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (rulesErr) {
      console.error("Failed to load routing rules", rulesErr);
      return jsonError("Pricing unavailable", 500);
    }
    const base = rules?.base_price_per_person_eur ?? 180;
    const minStops = rules?.min_stops ?? 3;
    const paceMult =
      body.pace === "relaxed"
        ? Number(rules?.pace_multiplier_relaxed ?? 0.85)
        : body.pace === "full"
          ? Number(rules?.pace_multiplier_full ?? 1.2)
          : Number(rules?.pace_multiplier_balanced ?? 1);
    const stopFactor = 1 + Math.max(0, body.stopLabels.length - minStops) * 0.08;
    const pricePerPersonEur = Math.round(base * paceMult * stopFactor);
    const amountInCents = pricePerPersonEur * body.guests * 100;
    if (amountInCents < 5000) return jsonError("Computed amount below minimum", 400);

    const stripe = createStripeClient(body.environment);

    const stopsSummary = body.stopLabels.slice(0, 6).join(" · ");
    const elementsSummary = elements.length > 0 ? ` · concierge: ${elements.join(", ")}` : "";
    const productName = `Private experience — ${body.regionLabel}`;
    const description =
      `${body.guests} guest${body.guests > 1 ? "s" : ""} · ${body.pace} pace · ${stopsSummary}${elementsSummary}`.slice(
        0,
        500,
      );

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: productName,
              description,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: body.returnUrl,
      ...(body.customerEmail && { customer_email: body.customerEmail }),
      metadata: {
        booking_type: "builder",
        region: body.regionLabel,
        guests: String(body.guests),
        pace: body.pace,
        stops: body.stopLabels.slice(0, 8).join("|").slice(0, 480),
        ...(elements.length > 0 && { elements: elements.join("|").slice(0, 200) }),
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-builder-checkout error:", e);
    return jsonError(e instanceof Error ? e.message : "Unknown error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
