// Lean Signature checkout — internal-DB pricing + Stripe. No external
// availability/reservation. Server re-computes the quote from the tour +
// tiers so client-declared totals cannot be tampered with.

import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  computeInternalQuote,
  type TravellerComposition,
  type PriceTiers,
} from "../_shared/internalQuote.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message, code: message, retryable: status >= 500 }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ALLOWED_RETURN_ORIGINS = [
  "yesexperiences.pt",
  "yesexperiencesportugal.com",
  "yesexperiencesportugal.lovable.app",
  "localhost",
  "127.0.0.1",
];

function validReturnOrigin(url: string): boolean {
  try {
    const u = new URL(url);
    return ALLOWED_RETURN_ORIGINS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

interface CreateSessionBody {
  tourId: string;
  tourTitle: string;
  priceFromEur: number;
  date: string;
  startTime?: string | null;
  composition: TravellerComposition;
  addOns?: Array<{ id: string; label: string; quantity: number; unitEur: number }>;
  environment: StripeEnv;
  returnUrl: string;
  cancelUrl?: string;
  uiMode?: "hosted" | "embedded";
  customerEmail?: string;
  pickupLabel?: string | null;
  region?: string | null;
}

async function loadTiers(tourId: string): Promise<PriceTiers | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await client
      .from("tour_price_tiers")
      .select("tiers")
      .eq("tour_id", tourId)
      .maybeSingle();
    const raw = (data as { tiers?: unknown } | null)?.tiers;
    if (raw && typeof raw === "object") return raw as PriceTiers;
    return null;
  } catch (e) {
    console.warn("[create-signature-checkout] tier lookup failed", e);
    return null;
  }
}

async function handleCreateSession(body: CreateSessionBody): Promise<Response> {
  if (!body.tourId || typeof body.tourId !== "string") return jsonError("tour_id_required");
  if (!body.tourTitle || typeof body.tourTitle !== "string") return jsonError("tour_title_required");
  if (typeof body.priceFromEur !== "number" || body.priceFromEur <= 0) return jsonError("price_from_required");
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return jsonError("date_invalid");
  if (!body.composition || typeof body.composition !== "object") return jsonError("composition_required");
  if (body.environment !== "sandbox" && body.environment !== "live") return jsonError("environment_invalid");
  if (!body.returnUrl || !validReturnOrigin(body.returnUrl)) return jsonError("return_url_not_allowed");

  const tiers = await loadTiers(body.tourId);
  const quote = computeInternalQuote({
    tiers,
    priceFromEur: body.priceFromEur,
    composition: body.composition,
    addOns: body.addOns,
  });

  if (quote.billableGuests <= 0) return jsonError("no_billable_guests");
  if (quote.finalTotalEur < 50) return jsonError("amount_below_minimum");

  const uiMode: "hosted" | "embedded" = body.uiMode === "embedded" ? "embedded" : "hosted";
  const paidLines = quote.lines.filter((l) => l.unitEur > 0 && l.quantity > 0);
  const productName = `YES — ${body.tourTitle}`.slice(0, 180);
  const summaryLine = [
    `${quote.totalGuests} guest${quote.totalGuests > 1 ? "s" : ""}`,
    body.region ?? undefined,
    `Date ${body.date}${body.startTime ? ` · ${body.startTime}` : ""}`,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 500);

  const lineItems: Array<Record<string, unknown>> = [
    ...paidLines.map((l, i) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: `${productName} — ${l.label} × ${l.quantity}`.slice(0, 180),
          ...(i === 0 ? { description: summaryLine } : {}),
          ...(i === 0 ? { images: ["https://yesexperiencesportugal.com/og-cover.jpg"] } : {}),
        },
        unit_amount: Math.round(l.unitEur * 100),
      },
      quantity: l.quantity,
    })),
    ...quote.addOnLines
      .filter((a) => a.unitEur > 0)
      .map((a) => ({
        price_data: {
          currency: "eur",
          product_data: { name: `Add-on — ${a.label}`.slice(0, 180) },
          unit_amount: Math.round(a.unitEur * 100),
        },
        quantity: a.quantity,
      })),
  ];

  if (!lineItems.length) return jsonError("no_billable_lines");

  const stripe = createStripeClient(body.environment);
  const sessionParams: Record<string, unknown> = {
    line_items: lineItems,
    mode: "payment",
    locale: "auto",
    submit_type: "book",
    billing_address_collection: "auto",
    phone_number_collection: { enabled: true },
    allow_promotion_codes: true,
    custom_text: {
      submit: { message: "Instant confirmation by email." },
      terms_of_service_acceptance: {
        message:
          "By booking you accept the [YES Experiences Portugal terms](https://yesexperiencesportugal.com/terms) and [privacy policy](https://yesexperiencesportugal.com/privacy).",
      },
    },
    consent_collection: { terms_of_service: "required" },
    payment_intent_data: {
      statement_descriptor_suffix: "YES EXPERIENCES",
      description: `${productName} · ${body.date}`.slice(0, 1000),
    },
    ...(body.customerEmail && { customer_email: body.customerEmail }),
    metadata: {
      booking_type: "signature",
      flow: "signature",
      pricing_model: "internal-tiers",
      tour_id: body.tourId,
      tour_title: body.tourTitle.slice(0, 160),
      guests: String(quote.totalGuests),
      adults: String(body.composition.adults),
      minor_ages: (body.composition.minorAges ?? []).join(",").slice(0, 120),
      per_pax_adult_eur: String(quote.perPaxAdultEur),
      total_eur: String(quote.finalTotalEur),
      date: body.date,
      start_time: (body.startTime ?? "").slice(0, 16),
      region: (body.region ?? "").slice(0, 80),
      pickup: (body.pickupLabel ?? "").slice(0, 120),
      ui_mode: uiMode,
      lines_json: JSON.stringify(
        quote.lines.map((l) => ({ b: l.band, q: l.quantity, u: Math.round(l.unitEur * 100) })),
      ).slice(0, 480),
      addons_json: JSON.stringify(
        quote.addOnLines.map((a) => ({ id: a.id, q: a.quantity, u: Math.round(a.unitEur * 100) })),
      ).slice(0, 480),
    },
  };

  if (uiMode === "embedded") {
    sessionParams.ui_mode = "embedded_page";
    sessionParams.return_url = `${body.returnUrl}${body.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
  } else {
    sessionParams.success_url = `${body.returnUrl}${body.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
    if (body.cancelUrl) sessionParams.cancel_url = body.cancelUrl;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  const rawPublishable =
    body.environment === "live"
      ? (Deno.env.get("STRIPE_LIVE_PUBLISHABLE_KEY") ?? "")
      : (Deno.env.get("STRIPE_SANDBOX_PUBLISHABLE_KEY") ?? "");
  const publishableKey = rawPublishable.startsWith("pk_") ? rawPublishable : "";

  return jsonOk({
    url: (session as { url?: string }).url ?? null,
    clientSecret: (session as { client_secret?: string }).client_secret ?? null,
    sessionId: session.id,
    publishableKey,
    uiMode,
    quote,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("method_not_allowed", 405);
  let body: CreateSessionBody;
  try {
    body = (await req.json()) as CreateSessionBody;
  } catch {
    return jsonError("invalid_json", 400);
  }
  try {
    return await handleCreateSession(body);
  } catch (e) {
    console.error("[create-signature-checkout] failed", e);
    return jsonError((e as Error).message ?? "internal_error", 500);
  }
});
