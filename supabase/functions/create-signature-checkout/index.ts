// Stripe sandbox checkout for Studio V3 Signature reveal.
// Prices are resolved SERVER-SIDE from public.tour_price_tiers (the same
// source the admin editor writes to). The client cannot influence price.

import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  tourId: string;
  tourTitle: string;
  guests: number;
  stopLabels?: string[];
  pickupLabel?: string;
  dateExact?: string | null;
  journeyTitle?: string | null;
  customerEmail?: string;
  returnUrl: string; // success url (we append session_id)
  cancelUrl: string;
  environment: StripeEnv;
  /** Anchor "from" EUR if no tier data exists. */
  priceFromEur: number;
  /** True when the booking comes from the Tailor flow (stop changes applied). */
  tailored?: boolean;

}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body || typeof body !== "object") return jsonError("Invalid body", 400);
    if (!body.tourId || typeof body.tourId !== "string" || body.tourId.length > 80)
      return jsonError("Invalid tourId", 400);
    if (!body.tourTitle || typeof body.tourTitle !== "string" || body.tourTitle.length > 160)
      return jsonError("Invalid title", 400);
    if (!Number.isInteger(body.guests) || body.guests < 1 || body.guests > 12)
      return jsonError("Guests must be between 1 and 12", 400);
    if (!Number.isFinite(body.priceFromEur) || body.priceFromEur < 50 || body.priceFromEur > 5000)
      return jsonError("Invalid price anchor", 400);
    if (body.environment !== "sandbox" && body.environment !== "live")
      return jsonError("Invalid environment", 400);

    const allowOrigin =
      validateReturnOrigin(body.returnUrl) && validateReturnOrigin(body.cancelUrl);
    if (!allowOrigin) return jsonError("Return URL not allowed", 400);

    // Resolve per-pax EUR server-side from tour_price_tiers.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: tierRow } = await admin
      .from("tour_price_tiers")
      .select("tiers")
      .eq("tour_id", body.tourId)
      .maybeSingle();

    const tier = Math.min(8, Math.max(1, body.guests));
    const tiers = (tierRow?.tiers ?? null) as Record<string, number> | null;
    const real = tiers && typeof tiers[String(tier)] === "number" ? tiers[String(tier)] : null;
    const eurPerPax = real ?? body.priceFromEur;
    const amountInCents = Math.round(eurPerPax * 100) * body.guests;
    if (amountInCents < 5000) return jsonError("Computed amount below minimum", 400);

    const stripe = createStripeClient(body.environment);

    const stopsSummary = (body.stopLabels ?? []).slice(0, 6).join(" · ");
    const description =
      `${body.guests} guest${body.guests > 1 ? "s" : ""}${stopsSummary ? " · " + stopsSummary : ""}`.slice(
        0,
        500,
      );
    const productName = `YES Signature — ${body.tourTitle}`.slice(0, 180);

    const dateLine = body.dateExact ? ` · ${body.dateExact}` : "";
    const pickupLine = body.pickupLabel ? ` · pickup ${body.pickupLabel}` : "";
    const submitMessage = body.tailored
      ? "Your tailored day is reserved the moment payment clears. Our team will confirm the adjusted stops within 2 hours."
      : "Your Signature day is reserved the moment payment clears. You will receive your confirmation by email within minutes.";

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: productName,
              description,
              images: ["https://yesexperiencesportugal.com/og-cover.jpg"],
            },
            unit_amount: Math.round(eurPerPax * 100),
          },
          quantity: body.guests,
        },
      ],
      mode: "payment",
      locale: "auto",
      submit_type: "book",
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      custom_text: {
        submit: { message: submitMessage.slice(0, 1200) },
        terms_of_service_acceptance: {
          message:
            "By booking you accept the [YES Experiences Portugal terms](https://yesexperiencesportugal.com/terms) and [privacy policy](https://yesexperiencesportugal.com/privacy).",
        },
      },
      consent_collection: { terms_of_service: "required" },
      payment_intent_data: {
        statement_descriptor_suffix: "YES EXPERIENCES",
        description: `${productName}${dateLine}${pickupLine}`.slice(0, 1000),
      },
      success_url: `${body.returnUrl}${body.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancelUrl,
      ...(body.customerEmail && { customer_email: body.customerEmail }),
      metadata: {
        booking_type: "signature",
        tour_id: body.tourId,
        guests: String(body.guests),
        per_pax_eur: String(eurPerPax),
        price_source: real != null ? "tier" : "anchor",
        date_exact: body.dateExact ?? "",
        pickup: (body.pickupLabel ?? "").slice(0, 120),
        journey_title: (body.journeyTitle ?? "").slice(0, 160),
        stops: (body.stopLabels ?? []).slice(0, 8).join("|").slice(0, 480),
        tailored: body.tailored ? "1" : "0",
      },

    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-signature-checkout error:", e);
    return jsonError(e instanceof Error ? e.message : "Unknown error", 500);
  }
});

function validateReturnOrigin(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const envAllow = (Deno.env.get("RETURN_URL_ORIGIN") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const staticAllow = new Set<string>([
      "https://yesexperiences.pt",
      "https://www.yesexperiences.pt",
      "https://yesexperiencesportugal.com",
      "https://dreamscape-builder-co.lovable.app",
      ...envAllow,
    ]);
    const origin = u.origin;
    if (staticAllow.has(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+\.lovable\.dev$/.test(origin)) return true;
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
    return false;
  } catch {
    return false;
  }
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
