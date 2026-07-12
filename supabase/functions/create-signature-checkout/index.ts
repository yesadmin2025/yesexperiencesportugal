// Stripe sandbox checkout for Studio V3 Signature reveal.
// Prices are resolved SERVER-SIDE. Legacy Signature/Tailor paths read
// public.tour_price_tiers; Studio V3 uses the server commercial catalogue
// via mode: "quote" / "create-session" (see resolveQuote.ts).

import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { getActivity } from "../_shared/bokun.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  validateAndNormaliseSnapshot,
  canonicalJson,
  type RawQuoteSnapshot,
  type NormalisedSnapshot,
} from "../_shared/quoteSnapshotSchema.ts";
import { resolveQuote } from "../_shared/resolveQuote.ts";
import { signQuoteToken, verifyQuoteToken, sha256Hex } from "../_shared/quoteToken.ts";
import { revalidateBokunQuote } from "../_shared/bokunQuoteRevalidate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const QUOTE_TTL_SECONDS = 600; // 10 minutes

async function handleStudioQuote(snapshotRaw: RawQuoteSnapshot) {
  const snapshot = validateAndNormaliseSnapshot(snapshotRaw);
  const resolved = resolveQuote(snapshot);
  const snapshotHash = await sha256Hex(canonicalJson(snapshot));
  const revision = snapshotHash.slice(0, 16);
  const secret = Deno.env.get("STUDIO_QUOTE_SIGNING_SECRET");
  if (!secret) return jsonError("Quote signing secret not configured", 500);
  const now = Math.floor(Date.now() / 1000);
  const inclusionIds = resolved.inclusions.map((i) => i.id);
  const token = await signQuoteToken(
    {
      v: 1,
      revision,
      snapshotHash,
      commercialProductKey: resolved.pricing.commercialProductKey,
      guests: resolved.pricing.guests,
      unitEur: resolved.pricing.unitEur,
      totalEur: resolved.pricing.totalEur,
      currency: "EUR",
      routeStatus: resolved.routeStatus,
      availabilityStatus: resolved.availabilityStatus,
      snapshot: {
        signatureId: snapshot.signatureId,
        commercialProductKey: snapshot.commercialProductKey,
        title: snapshot.title,
        destinationRegion: snapshot.destinationRegion,
        pickupCity: snapshot.pickupCity,
        date: snapshot.date,
        startTime: snapshot.startTime,
        language: snapshot.language,
        guests: snapshot.guests,
        routeStatus: snapshot.routeStatus,
        routeStops: snapshot.routeStops,
        selectedAddOns: snapshot.selectedAddOns,
        inclusionIds,
      },
      pricing: {
        unitEur: resolved.pricing.unitEur,
        baseSubtotalEur: resolved.pricing.baseSubtotalEur,
        addOnLineItems: resolved.addOns.map((a) => ({
          id: a.id,
          label: a.label,
          unitEur: a.unitEur,
          quantity: a.quantity,
          lineSubtotalEur: a.lineSubtotalEur,
        })),
        totalEur: resolved.pricing.totalEur,
        currency: "EUR",
      },
      iat: now,
      exp: now + QUOTE_TTL_SECONDS,
    },
    secret,
  );
  return new Response(
    JSON.stringify({
      quoteToken: token,
      revision,
      snapshotHash,
      expiresAt: new Date((now + QUOTE_TTL_SECONDS) * 1000).toISOString(),
      pricing: resolved.pricing,
      addOns: resolved.addOns,
      inclusions: resolved.inclusions,
      routeStatus: resolved.routeStatus,
      availabilityStatus: resolved.availabilityStatus,
      itinerary: {
        title: snapshot.title,
        destinationRegion: snapshot.destinationRegion,
        pickupCity: snapshot.pickupCity,
        date: snapshot.date,
        startTime: snapshot.startTime,
        language: snapshot.language,
        guests: snapshot.guests,
        routeStops: snapshot.routeStops,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

interface StudioCreateSessionBody {
  mode: "create-session";
  quoteToken: string;
  currentRevision: string;
  /** Optional — server ignores it for pricing/metadata; token is authoritative. */
  snapshot?: RawQuoteSnapshot;
  environment: StripeEnv;
  returnUrl: string;
  cancelUrl?: string;
  uiMode?: "hosted" | "embedded";
  customerEmail?: string;
  guestDetails?: Record<string, unknown>;
}

async function handleStudioCreateSession(body: StudioCreateSessionBody) {
  const secret = Deno.env.get("STUDIO_QUOTE_SIGNING_SECRET");
  if (!secret) return jsonError("Quote signing secret not configured", 500);
  if (body.environment !== "sandbox" && body.environment !== "live") {
    return jsonError("Invalid environment", 400);
  }
  if (!validateReturnOrigin(body.returnUrl)) return jsonError("Return URL not allowed", 400);

  let payload;
  try {
    payload = await verifyQuoteToken(body.quoteToken, secret);
  } catch (e) {
    return jsonError(`Quote token invalid: ${(e as Error).message}`, 400);
  }
  if (body.currentRevision !== payload.revision) {
    return jsonError("Quote is stale — please refresh", 409);
  }
  if (payload.routeStatus === "unavailable" || payload.availabilityStatus === "unavailable") {
    return jsonError("This journey is unavailable", 409);
  }
  if (payload.totalEur < 50) return jsonError("Computed amount below minimum", 400);

  // Snapshot + pricing are read STRICTLY from the signed token.
  // Client-sent snapshot / amountEur / add-ons are ignored here.
  const snap = payload.snapshot;
  const pricing = payload.pricing;

  const stripe = createStripeClient(body.environment);
  const uiMode: "hosted" | "embedded" = body.uiMode === "embedded" ? "embedded" : "hosted";

  const productName = `YES Studio — ${snap.title}`.slice(0, 180);
  const stopLabelsCompact = snap.routeStops.map((s) => s.label).slice(0, 8).join(" · ").slice(0, 480);
  const inclusionIdsCompact = snap.inclusionIds.join(",").slice(0, 480);
  const addOnIdsCompact = pricing.addOnLineItems.map((a) => a.id).join(",").slice(0, 200);

  const pendingReviewNote =
    "Your request is received after payment and remains subject to final route and availability confirmation.";
  const description = [
    `${snap.guests} guest${snap.guests > 1 ? "s" : ""} · ${snap.destinationRegion}`,
    `Date ${snap.date} · ${snap.startTime}`,
    `Stops: ${stopLabelsCompact}`,
    pendingReviewNote,
  ]
    .join(" · ")
    .slice(0, 500);

  const lineItems: Array<Record<string, unknown>> = [
    {
      price_data: {
        currency: "eur",
        product_data: {
          name: productName,
          description,
          images: ["https://yesexperiencesportugal.com/og-cover.jpg"],
        },
        unit_amount: Math.round(pricing.unitEur * 100),
      },
      quantity: snap.guests,
    },
    ...pricing.addOnLineItems.map((a) => ({
      price_data: {
        currency: "eur",
        product_data: { name: `Add-on — ${a.label}`.slice(0, 180) },
        unit_amount: Math.round(a.unitEur * 100),
      },
      quantity: a.quantity,
    })),
  ];

  const sessionParams: Record<string, unknown> = {
    line_items: lineItems,
    mode: "payment",
    locale: "auto",
    submit_type: "book",
    billing_address_collection: "auto",
    phone_number_collection: { enabled: true },
    allow_promotion_codes: true,
    custom_text: {
      submit: { message: pendingReviewNote },
      terms_of_service_acceptance: {
        message:
          "By booking you accept the [YES Experiences Portugal terms](https://yesexperiencesportugal.com/terms) and [privacy policy](https://yesexperiencesportugal.com/privacy).",
      },
    },
    consent_collection: { terms_of_service: "required" },
    payment_intent_data: {
      statement_descriptor_suffix: "YES EXPERIENCES",
      description: `${productName} · ${snap.date}`.slice(0, 1000),
    },
    ...(body.customerEmail && { customer_email: body.customerEmail }),
    metadata: {
      booking_type: "studio-v3",
      flow: "studio",
      commercial_product_key: payload.commercialProductKey,
      signature_id: snap.signatureId,
      revision: payload.revision,
      snapshot_hash: payload.snapshotHash,
      guests: String(snap.guests),
      per_pax_eur: String(pricing.unitEur),
      total_eur: String(pricing.totalEur),
      date: snap.date,
      start_time: snap.startTime,
      language: snap.language,
      pickup_city: snap.pickupCity.slice(0, 80),
      destination_region: snap.destinationRegion.slice(0, 80),
      route_status: payload.routeStatus,
      availability_status: payload.availabilityStatus,
      stop_ids: snap.routeStops.map((s) => s.id).join(",").slice(0, 480),
      stop_labels: stopLabelsCompact,
      add_on_ids: addOnIdsCompact,
      inclusion_ids: inclusionIdsCompact,
      ui_mode: uiMode,
      ...(body.guestDetails?.bokunAvailabilityId
        ? { bokun_availability_id: String(body.guestDetails.bokunAvailabilityId) }
        : {}),
    },
  };

  if (uiMode === "embedded") {
    sessionParams.ui_mode = "embedded_page";
    sessionParams.return_url = `${body.returnUrl}${body.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
  } else {
    sessionParams.success_url = `${body.returnUrl}${body.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
    if (body.cancelUrl) sessionParams.cancel_url = body.cancelUrl;
  }

  // Deterministic idempotency key — repeated calls with same quote token
  // return the same Stripe session id (Stripe handles the dedupe server-side).
  const tokenHash = await sha256Hex(body.quoteToken);
  const idempotencyKey = `studio-v3:${tokenHash}`;
  const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });

  const rawPublishable =
    body.environment === "live"
      ? (Deno.env.get("STRIPE_LIVE_PUBLISHABLE_KEY") ?? "")
      : (Deno.env.get("STRIPE_SANDBOX_PUBLISHABLE_KEY") ?? "");
  const publishableKey = rawPublishable.startsWith("pk_") ? rawPublishable : "";

  return new Response(
    JSON.stringify({
      url: (session as { url?: string }).url ?? null,
      clientSecret: (session as { client_secret?: string }).client_secret ?? null,
      sessionId: session.id,
      publishableKey,
      uiMode,
      pricing,
      routeStatus: payload.routeStatus,
      availabilityStatus: payload.availabilityStatus,
      idempotencyKey,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// -------- Bókun-authoritative Signature/Tailored checkout (Phase B) --------

interface BokunCreateSessionBody {
  mode: "bokun-signature-create-session";
  quoteToken: string;
  currentRevision: string;
  environment: StripeEnv;
  returnUrl: string;
  cancelUrl?: string;
  uiMode?: "hosted" | "embedded";
  customerEmail?: string;
  guestDetails?: Record<string, unknown>;
  tourTitle?: string;
  pickupLabel?: string;
  journeyTitle?: string;
  tailored?: boolean;
  includedItems?: string[];
}

async function handleBokunSignatureCreateSession(body: BokunCreateSessionBody) {
  const secret = Deno.env.get("STUDIO_QUOTE_SIGNING_SECRET");
  if (!secret) return jsonError("Quote signing secret not configured", 500);
  if (body.environment !== "sandbox" && body.environment !== "live") {
    return jsonError("Invalid environment", 400);
  }
  if (!validateReturnOrigin(body.returnUrl)) return jsonError("Return URL not allowed", 400);

  // 1. Verify signature + expiry + revalidate live Bókun.
  const revalidated = await revalidateBokunQuote(body.quoteToken, secret);
  if (!revalidated.ok || !revalidated.payload || !revalidated.slot) {
    return jsonError(`quote_stale:${revalidated.reason ?? "unknown"}`, 409);
  }
  const payload = revalidated.payload;
  if (body.currentRevision !== payload.revision) {
    return jsonError("Quote is stale — please refresh", 409);
  }
  if (revalidated.finalTotalEur < 50) return jsonError("Computed amount below minimum", 400);

  const flow: Flow = body.tailored ? "tailor" : "signature";
  const copy = FLOW_COPY[flow];
  const uiMode: "hosted" | "embedded" = body.uiMode === "embedded" ? "embedded" : "hosted";
  const tourTitle = (body.tourTitle ?? payload.internalProductKey).slice(0, 160);
  const productName = `${copy.label} — ${tourTitle}${flow === "tailor" ? " (tailored)" : ""}`.slice(0, 180);

  // 2. One Stripe line item per non-zero paid category. Free lines (infants)
  //    skipped from Stripe but preserved in metadata for the webhook.
  const paidLines = revalidated.lines.filter((l) => l.unitEur > 0 && l.quantity > 0);
  if (!paidLines.length) return jsonError("No billable line items", 400);

  const lineItems = paidLines.map((l) => {
    const label = `${tourTitle} — ${l.label} × ${l.quantity}`.slice(0, 180);
    return {
      price_data: {
        currency: "eur",
        product_data: {
          name: label,
          ...(l === paidLines[0]
            ? { images: ["https://yesexperiencesportugal.com/og-cover.jpg"] }
            : {}),
        },
        unit_amount: Math.round(l.unitEur * 100),
      },
      quantity: l.quantity,
    };
  });

  // 3. Compact metadata for webhook to rebuild exact reservation call.
  //    Stripe limits each value to 500 chars; keep this comfortably under.
  const categoriesJson = JSON.stringify(
    revalidated.lines.map((l) => ({
      c: l.bokunCategoryId,
      q: l.quantity,
      b: l.uiBand,
      u: Math.round(l.unitEur * 100),
    })),
  ).slice(0, 480);

  const stripe = createStripeClient(body.environment);
  const submitMessage = copy.submit;
  const pendingReviewNote = flow === "tailor" ? copy.submit : "Instant confirmation by email.";

  const sessionParams: Record<string, unknown> = {
    line_items: lineItems,
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
      description: `${productName} · ${payload.date}${payload.startTime ? ` ${payload.startTime}` : ""}`.slice(0, 1000),
    },
    ...(body.customerEmail && { customer_email: body.customerEmail }),
    metadata: {
      booking_type: "signature",
      flow,
      pricing_model: "bokun-banded",
      tour_id: payload.internalProductKey,
      guests: String(payload.totalParticipants),
      adults: String(payload.guestMix.adults),
      youths: String(payload.guestMix.youths),
      children: String(payload.guestMix.children),
      infants: String(payload.guestMix.infants),
      total_eur: String(revalidated.finalTotalEur),
      quote_revision: payload.revision,
      quote_source: payload.source,
      pricing_categories_json: categoriesJson,
      bokun_product_id: payload.bokunProductId,
      ...(payload.bokunOptionId ? { bokun_option_id: payload.bokunOptionId } : {}),
      ...(payload.bokunRateId ? { bokun_rate_id: payload.bokunRateId } : {}),
      bokun_availability_id: String(payload.availabilityId ?? ""),
      start_time: (payload.startTime ?? "").slice(0, 16),
      date_exact: payload.date,
      pickup: (body.pickupLabel ?? "").slice(0, 120),
      journey_title: (body.journeyTitle ?? tourTitle).slice(0, 160),
      tailored: body.tailored ? "1" : "0",
      ui_mode: uiMode,
    },
  };

  if (uiMode === "embedded") {
    sessionParams.ui_mode = "embedded_page";
    sessionParams.return_url = `${body.returnUrl}${body.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
  } else {
    sessionParams.success_url = `${body.returnUrl}${body.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
    if (body.cancelUrl) sessionParams.cancel_url = body.cancelUrl;
  }

  const tokenHash = await sha256Hex(body.quoteToken);
  const idempotencyKey = `bokun-signature:${tokenHash}`;
  const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });

  const rawPublishable =
    body.environment === "live"
      ? (Deno.env.get("STRIPE_LIVE_PUBLISHABLE_KEY") ?? "")
      : (Deno.env.get("STRIPE_SANDBOX_PUBLISHABLE_KEY") ?? "");
  const publishableKey = rawPublishable.startsWith("pk_") ? rawPublishable : "";

  return new Response(
    JSON.stringify({
      url: (session as { url?: string }).url ?? null,
      clientSecret: (session as { client_secret?: string }).client_secret ?? null,
      sessionId: session.id,
      publishableKey,
      flow,
      productName,
      submitMessage: pendingReviewNote,
      uiMode,
      pricing: {
        lines: revalidated.lines,
        finalTotalEur: revalidated.finalTotalEur,
        source: payload.source,
      },
      idempotencyKey,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

interface Body {
  tourId: string;
  tourTitle: string;
  guests: number;
  stopLabels?: string[];
  /** Real included items from VIATOR_META[tourId].included — used as the
   *  truthful fallback when Bókun returns no inclusions. Client-owned so
   *  the edge fn stays decoupled from src/ data files. */
  includedItems?: string[];
  pickupLabel?: string;
  dateExact?: string | null;
  journeyTitle?: string | null;
  customerEmail?: string;
  returnUrl: string; // success url (we append session_id)
  cancelUrl?: string;
  environment: StripeEnv;
  /** Anchor "from" EUR if no tier data exists. */
  priceFromEur: number;
  /** True when the booking comes from the Tailor flow (stop changes applied). */
  tailored?: boolean;
  /** Which surface initiated checkout. Drives copy in Stripe Checkout. */
  flow?: "studio" | "signature" | "tailor";
  /** Stripe Checkout UI mode. Defaults to "hosted" (full-page redirect). */
  uiMode?: "hosted" | "embedded";
  /** Forwarded from FinalDetailsDialog — used to lock the Bókun slot the customer chose. */
  guestDetails?: {
    bokunAvailabilityId?: number | string | null;
    startTime?: string | null;
    [key: string]: unknown;
  };
  /** Optional reveal add-ons chosen by the traveller. Priced flat per booking. */
  addOns?: Array<{
    id: string;
    label: string;
    priceEur: number;
    durationMinutes?: number;
  }>;
}


type Flow = "studio" | "signature" | "tailor";

const VALID_FLOWS: Flow[] = ["studio", "signature", "tailor"];

function resolveFlow(body: Body): Flow {
  if (body.flow === "studio" || body.flow === "signature" || body.flow === "tailor")
    return body.flow;
  return body.tailored ? "tailor" : "signature";
}

/**
 * Validate `flow` against `tailored`. Returns an error message or null.
 * - Unknown flow values are rejected.
 * - `tailor` requires `tailored === true`.
 * - `studio` / `signature` require `tailored !== true`.
 */
function validateFlow(body: Body): string | null {
  if (body.flow !== undefined) {
    if (typeof body.flow !== "string" || !VALID_FLOWS.includes(body.flow as Flow)) {
      return `Invalid flow: must be one of ${VALID_FLOWS.join(", ")}`;
    }
    if (body.flow === "tailor" && body.tailored !== true) {
      return "Flow mismatch: 'tailor' requires tailored=true";
    }
    if ((body.flow === "studio" || body.flow === "signature") && body.tailored === true) {
      return `Flow mismatch: '${body.flow}' cannot be used with tailored=true`;
    }
  }
  return null;
}

const FLOW_COPY: Record<Flow, { label: string; eyebrow: string; submit: string }> = {
  studio: {
    label: "YES Studio",
    eyebrow: "Built moment by moment",
    submit: "Instant confirmation by email.",
  },
  signature: {
    label: "YES Signature",
    eyebrow: "Reserved as designed",
    submit: "Instant confirmation by email.",
  },
  tailor: {
    label: "YES Tailored",
    eyebrow: "Tailored stops applied",
    submit: "We'll confirm the adjusted stops by email within 2 hours.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = (await req.json()) as Body & {
      mode?: "quote" | "create-session";
      snapshot?: RawQuoteSnapshot;
      quoteToken?: string;
      currentRevision?: string;
    };
    if (!body || typeof body !== "object") return jsonError("Invalid body", 400);

    // Studio V3 authoritative-quote paths.
    if (body.mode === "quote") {
      if (!body.snapshot) return jsonError("Missing snapshot", 400);
      return await handleStudioQuote(body.snapshot);
    }
    if (body.mode === "create-session") {
      if (!body.quoteToken || !body.currentRevision) {
        return jsonError("Missing quote fields", 400);
      }
      return await handleStudioCreateSession(body as unknown as StudioCreateSessionBody);
    }

    // Legacy Signature/Tailor path below.
    if (!body.tourId || typeof body.tourId !== "string" || body.tourId.length > 80)
      return jsonError("Invalid tourId", 400);

    // §7 — Studio V3 commercial keys MUST use the authoritative quote path.
    // Block any attempt to reach the legacy tier-based checkout under a
    // Studio V3 commercial identity.
    if (body.tourId === "studio-v3-private-full-day") {
      return jsonError("studio_quote_required", 409);
    }

    if (!body.tourTitle || typeof body.tourTitle !== "string" || body.tourTitle.length > 160)
      return jsonError("Invalid title", 400);
    if (!Number.isInteger(body.guests) || body.guests < 1 || body.guests > 12)
      return jsonError("Guests must be between 1 and 12", 400);
    if (!Number.isFinite(body.priceFromEur) || body.priceFromEur < 50 || body.priceFromEur > 5000)
      return jsonError("Invalid price anchor", 400);
    if (body.environment !== "sandbox" && body.environment !== "live")
      return jsonError("Invalid environment", 400);

    const flowError = validateFlow(body);
    if (flowError) return jsonError(flowError, 400);

    const uiMode: "hosted" | "embedded" = body.uiMode === "embedded" ? "embedded" : "hosted";

    const allowOrigin =
      validateReturnOrigin(body.returnUrl) &&
      (uiMode === "embedded" || (body.cancelUrl ? validateReturnOrigin(body.cancelUrl) : true));
    if (!allowOrigin) return jsonError("Return URL not allowed", 400);

    // Resolve per-pax EUR server-side from tour_price_tiers.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const [{ data: tierRow }, { data: bokunRow }] = await Promise.all([
      admin.from("tour_price_tiers").select("tiers").eq("tour_id", body.tourId).maybeSingle(),
      admin
        .from("tour_bokun_mapping")
        .select("bokun_product_id")
        .eq("tour_id", body.tourId)
        .maybeSingle(),
    ]);
    const bokunMapped = Boolean(bokunRow?.bokun_product_id);

    const tier = Math.min(8, Math.max(1, body.guests));
    const tiers = (tierRow?.tiers ?? null) as Record<string, number> | null;
    const real = tiers && typeof tiers[String(tier)] === "number" ? tiers[String(tier)] : null;
    const eurPerPax = real ?? body.priceFromEur;
    const amountInCents = Math.round(eurPerPax * 100) * body.guests;
    if (amountInCents < 5000) return jsonError("Computed amount below minimum", 400);

    const stripe = createStripeClient(body.environment);

    const flow = resolveFlow(body);
    const copy = FLOW_COPY[flow];

    // Ground the Stripe line item in real Bokun product data when we have a mapping.
    // This avoids inventing inclusions/descriptions: title and any "includes" line
    // come straight from the operator's Bokun product. Client-passed stopLabels are
    // intentionally NOT shown in the line-item description for tailored bookings —
    // those are pending operator review and could mislead the customer.
    const bokunProductId = bokunRow?.bokun_product_id ?? null;
    const bokunActivity = bokunProductId ? await getActivity(bokunProductId) : null;

    const isTailored = flow === "tailor";
    const realTitle = bokunActivity?.title?.trim() || body.tourTitle;
    const productName = `${copy.label} — ${realTitle}${isTailored ? " (tailored)" : ""}`.slice(
      0,
      180,
    );

    // Build a truthful description. Priority:
    //   1. Bókun inclusions (operator source of truth)
    //   2. Real VIATOR_META.included forwarded by the client
    //   3. Nothing — never invent marketing prose in the fallback.
    const guestsLine = `${body.guests} guest${body.guests > 1 ? "s" : ""}`;
    const durationLine = bokunActivity?.durationText
      ? `Duration ${bokunActivity.durationText}`
      : null;
    const bokunInclusions =
      bokunActivity && bokunActivity.inclusions.length > 0 ? bokunActivity.inclusions : null;
    const clientIncluded =
      Array.isArray(body.includedItems) && body.includedItems.length > 0
        ? body.includedItems.filter((s) => typeof s === "string" && s.trim().length > 0)
        : null;
    const inclusionSource = bokunInclusions ?? clientIncluded ?? null;
    const includesLine = inclusionSource
      ? `Includes: ${inclusionSource.slice(0, 4).join(", ")}`
      : null;
    const tailoredNote = isTailored
      ? "Tailored adjustments confirmed by our team within 2 hours after payment."
      : null;

    const description = [
      guestsLine + " · Hotel pickup included",
      durationLine,
      includesLine,
      tailoredNote,
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 500);

    const dateLine = body.dateExact ? ` · ${body.dateExact}` : "";
    const pickupLine = body.pickupLabel ? ` · pickup ${body.pickupLabel}` : "";
    const submitMessage = copy.submit;

    // Validate + cap reveal add-ons. Price is flat per booking (matches the
    // reveal price card). Client-declared euros are trusted as an anchor but
    // clamped to [0..1000] per item and 6 items max so a tampered client
    // can't stuff arbitrary charges into the Stripe session.
    const rawAddOns = Array.isArray(body.addOns) ? body.addOns : [];
    const validatedAddOns = rawAddOns
      .filter(
        (a) =>
          a &&
          typeof a === "object" &&
          typeof a.id === "string" &&
          a.id.length > 0 &&
          a.id.length <= 64 &&
          typeof a.label === "string" &&
          a.label.length > 0 &&
          Number.isFinite(a.priceEur) &&
          a.priceEur >= 0 &&
          a.priceEur <= 1000,
      )
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        label: a.label.slice(0, 120),
        priceEur: Math.round(a.priceEur),
        durationMinutes: Number.isFinite(a.durationMinutes)
          ? Math.max(0, Math.min(480, Math.round(a.durationMinutes as number)))
          : 0,
      }));

    const addOnLineItems = validatedAddOns
      .filter((a) => a.priceEur > 0)
      .map((a) => ({
        price_data: {
          currency: "eur",
          product_data: { name: `Add-on — ${a.label}`.slice(0, 180) },
          unit_amount: a.priceEur * 100,
        },
        quantity: body.guests,
      }));

    const sessionParams: Record<string, unknown> = {
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
        ...addOnLineItems,
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
      ...(body.customerEmail && { customer_email: body.customerEmail }),
      metadata: {
        booking_type: "signature",
        flow,
        tour_id: body.tourId,
        guests: String(body.guests),
        per_pax_eur: String(eurPerPax),
        price_source: real != null ? "tier" : "anchor",
        date_exact: body.dateExact ?? "",
        pickup: (body.pickupLabel ?? "").slice(0, 120),
        hotel_pickup_included: "1",
        ...(bokunActivity?.title ? { bokun_title: bokunActivity.title.slice(0, 160) } : {}),
        journey_title: (body.journeyTitle ?? "").slice(0, 160),
        stops: (body.stopLabels ?? []).slice(0, 8).join("|").slice(0, 480),
        tailored: body.tailored ? "1" : "0",
        add_ons: JSON.stringify(
          validatedAddOns.map((a) => ({ id: a.id, label: a.label, priceEur: a.priceEur })),
        ).slice(0, 480),
        add_ons_total_eur: String(
          validatedAddOns.reduce((s, a) => s + a.priceEur, 0),
        ),

        ui_mode: uiMode,
        ...(body.guestDetails?.bokunAvailabilityId
          ? { bokun_availability_id: String(body.guestDetails.bokunAvailabilityId) }
          : {}),
        ...(body.guestDetails?.startTime
          ? { start_time: String(body.guestDetails.startTime).slice(0, 16) }
          : {}),
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
    // Defensive: NEVER echo a secret key back to the client. If the env var
    // was misconfigured with an sk_… value, drop it and log a warning.
    const publishableKey = rawPublishable.startsWith("pk_") ? rawPublishable : "";
    if (rawPublishable && !rawPublishable.startsWith("pk_")) {
      console.error(
        `[create-signature-checkout] Refusing to return non-publishable key for env=${body.environment}. ` +
          `Set STRIPE_${body.environment === "live" ? "LIVE" : "SANDBOX"}_PUBLISHABLE_KEY to a pk_… value.`,
      );
    }

    return new Response(
      JSON.stringify({
        url: (session as { url?: string }).url ?? null,
        clientSecret: (session as { client_secret?: string }).client_secret ?? null,
        sessionId: session.id,
        publishableKey,
        bokunMapped,
        flow,
        productName,
        lineItemDescription: description,
        submitMessage,
        uiMode,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
      "https://www.yesexperiencesportugal.com",
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
