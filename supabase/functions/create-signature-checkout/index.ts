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
import { verifyBookingQuoteToken } from "../_shared/bookingQuoteToken.ts";
import { getActivityAvailabilities } from "../_shared/bokun.ts";
import type { BookingQuote } from "../_shared/bookingQuote.ts";

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

// -------- Launch-spec v3 BookingQuote consume path (Signature / Tailored / Studio) --------
// Verifies signed v3 token, re-reads the persisted quote from booking_quotes,
// enforces expiry + consumed_at, revalidates live Bókun slot capacity, and
// creates a Stripe session with one line item per non-zero base category
// plus one per add-on. finalTotalEur is authoritative and equals
// baseSubtotal + addOnSubtotal from the stored quote.

interface BookingQuoteCreateSessionBody {
  mode: "booking-quote-create-session";
  quoteToken: string;
  environment: StripeEnv;
  returnUrl: string;
  cancelUrl?: string;
  uiMode?: "hosted" | "embedded";
  customerEmail?: string;
  tourTitle?: string;
  pickupLabel?: string;
  journeyTitle?: string;
}

async function handleBookingQuoteCreateSession(body: BookingQuoteCreateSessionBody) {
  const secret = Deno.env.get("STUDIO_QUOTE_SIGNING_SECRET");
  if (!secret) return jsonError("Quote signing secret not configured", 500);
  if (body.environment !== "sandbox" && body.environment !== "live") {
    return jsonError("Invalid environment", 400);
  }
  if (!validateReturnOrigin(body.returnUrl)) return jsonError("Return URL not allowed", 400);
  if (body.cancelUrl && !validateReturnOrigin(body.cancelUrl)) {
    return jsonError("Cancel URL not allowed", 400);
  }

  // 1. Verify HMAC + expiry on the token.
  let tokenPayload;
  try {
    tokenPayload = await verifyBookingQuoteToken(body.quoteToken, secret);
  } catch (e) {
    return jsonError(`quote_stale:${(e as Error).message}`, 400);
  }

  // 2. Re-read the persisted quote — DB is truth.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: stored, error: storedErr } = await admin
    .from("booking_quotes")
    .select("*")
    .eq("quote_id", tokenPayload.quoteId)
    .maybeSingle();
  if (storedErr) return jsonError(`quote_lookup_failed:${storedErr.message}`, 500);
  if (!stored) return jsonError("quote_not_found", 404);

  // Idempotent replay: if this quote already produced a Stripe session, return it.
  // Repeated button-taps must not create a second Bókun reservation or session.
  if (stored.stripe_session_id && stored.state === "checkout-created") {
    return jsonReplayFromStored(stored, body.environment);
  }
  if (stored.consumed_at && stored.state !== "checkout-created") {
    return jsonError("quote_already_consumed", 409);
  }
  if (new Date(stored.expires_at).getTime() < Date.now()) {
    return jsonError("quote_stale:expired", 409);
  }
  if (stored.quote_token !== body.quoteToken) return jsonError("quote_token_mismatch", 400);

  const basePricing = stored.base_pricing as BookingQuote["basePricing"];
  const addOnPricing = stored.add_on_pricing as BookingQuote["addOnPricing"];
  const finalTotalEur = Number(stored.final_total_eur);
  const recomputed =
    Math.round((basePricing.subtotalEur + addOnPricing.subtotalEur) * 100) / 100;
  if (Math.abs(recomputed - finalTotalEur) > 0.01) {
    return jsonError("quote_total_mismatch", 500);
  }
  if (finalTotalEur < 50) return jsonError("Computed amount below minimum", 400);

  const resolvedGuestMix =
    (stored.resolved_guest_mix as { totalParticipants?: number }) ?? {};
  const totalParticipants = resolvedGuestMix.totalParticipants ?? 0;

  // 3. Revalidate live Bókun slot. Category-existence is checked in step 4
  //    below (single source of truth), where the missing-category is reported
  //    as `category_not_ready` — the composition-to-category mapping ran at
  //    quote time, so `unsupported_age` (no mapping at all) surfaces there,
  //    never here.
  let slot: import("../_shared/bokun.ts").AvailabilitySlot | null = null;
  try {
    const slots = await getActivityAvailabilities(stored.bokun_product_id, stored.date);
    slot = slots.find((s) => String(s.id) === String(stored.availability_id)) ?? null;
    if (!slot) return jsonError("slot_unavailable:slot_no_longer_offered", 409);
    if ((slot.availabilityCount ?? 0) < totalParticipants) {
      return jsonError("capacity_exceeded:slot_capacity_lost", 409);
    }
  } catch (e) {
    return jsonError(`bokun_unreachable:${e instanceof Error ? e.message : String(e)}`, 502);
  }

  // 4. Provisional Bókun reserve BEFORE Stripe. If this fails, no session created.
  //    Idempotency: if we already reserved for this quote (paid was interrupted
  //    before checkout-created), reuse it — never create a second reservation.
  let reservationId: string | null = stored.bokun_reservation_id ?? null;
  let reservationConfirmationCode: string | null = null;

  if (!reservationId) {
    // Every selected traveller (including free infants/minors) MUST resolve to
    // a category present on this exact slot — no silent skips, no Adult
    // substitution. Ages that reach here already have a confirmed commercial
    // mapping (unsupported_age is caught at quote time), so a missing slot
    // category is category_not_ready, not unsupported_age.
    const pricingCategoryBookings: Array<{ pricingCategoryId: number; quantity: number }> = [];
    let selectedQuantity = 0;
    for (const line of basePricing.lines) {
      if (line.quantity <= 0) continue;
      selectedQuantity += line.quantity;
      const slotCat = slot.pricingCategories?.find(
        (c) => String(c.id) === line.bokunCategoryId,
      );
      if (!slotCat) {
        return jsonError(`category_not_ready:${line.bokunCategoryId}`, 409);
      }
      pricingCategoryBookings.push({
        pricingCategoryId: Number(slotCat.id),
        quantity: line.quantity,
      });
    }
    if (!pricingCategoryBookings.length) {
      return jsonError("category_not_ready:no_billable_categories", 409);
    }
    // Composition-parity guard: every selected traveller must appear in the
    // Bókun payload — no omissions, no collapsing into fewer lines.
    if (totalParticipants > 0 && selectedQuantity !== totalParticipants) {
      return jsonError(
        `composition_mismatch:selected=${selectedQuantity}_expected=${totalParticipants}`,
        409,
      );
    }

    const [firstName, ...rest] = (body.customerEmail ?? "guest@yesexperiencesportugal.com")
      .split("@")[0]
      .replace(/[^A-Za-z0-9]/g, " ")
      .trim()
      .split(/\s+/);
    try {
      const { reserveActivity } = await import("../_shared/bokun.ts");
      const reserved = await reserveActivity({
        productId: stored.bokun_product_id,
        availabilityId: Number(stored.availability_id),
        startTime: stored.start_time ?? slot.startTime,
        date: stored.date,
        pricingCategoryBookings,
        customer: {
          firstName: firstName || "Guest",
          lastName: rest.join(" ") || "Pending",
          email: body.customerEmail ?? "noreply@yesexperiencesportugal.com",
          language: "EN",
        },
        externalBookingReference: `quote:${stored.quote_id}`,
        notes: `YES provisional reserve · quote ${stored.quote_id}`,
      });
      reservationId = reserved.reservationId;
      reservationConfirmationCode = reserved.confirmationCode ?? null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin
        .from("booking_quotes")
        .update({ state: "failed", last_error: `reservation_failed:${msg}`.slice(0, 500) })
        .eq("quote_id", stored.quote_id);
      return jsonError(`reservation_failed:${msg}`, 502);
    }

    await admin
      .from("booking_quotes")
      .update({
        state: "reserved",
        bokun_reservation_id: reservationId,
        bokun_reservation_status: "reserved",
        reserved_at: new Date().toISOString(),
        bokun_base_subtotal_eur: basePricing.subtotalEur,
        database_addon_subtotal_eur: addOnPricing.subtotalEur,
      })
      .eq("quote_id", stored.quote_id);
  }

  // 5. Stripe line items — one per non-zero base category, one per add-on.
  //    Free lines (e.g. infants) preserved in metadata but omitted from Stripe.
  const flow = stored.flow as Flow;
  const copy = FLOW_COPY[flow];
  const tourTitle = (body.tourTitle ?? stored.commercial_product_key).slice(0, 160);
  const productName = `${copy.label} — ${tourTitle}`.slice(0, 180);

  const paidBaseLines = basePricing.lines.filter((l) => l.unitEur > 0 && l.quantity > 0);
  if (!paidBaseLines.length) return jsonError("no_billable_lines", 400);

  const lineItems: Array<Record<string, unknown>> = paidBaseLines.map((l, idx) => ({
    price_data: {
      currency: "eur",
      product_data: {
        name: `${tourTitle} — ${l.label}`.slice(0, 180),
        ...(idx === 0
          ? { images: ["https://yesexperiencesportugal.com/og-cover.jpg"] }
          : {}),
      },
      unit_amount: Math.round(l.unitEur * 100),
    },
    quantity: l.quantity,
  }));
  for (const a of addOnPricing.lines) {
    if (a.unitEur <= 0 || a.quantity <= 0) continue;
    lineItems.push({
      price_data: {
        currency: "eur",
        product_data: { name: `Add-on — ${a.label}`.slice(0, 180) },
        unit_amount: Math.round(a.unitEur * 100),
      },
      quantity: a.quantity,
    });
  }

  const uiMode: "hosted" | "embedded" = body.uiMode === "embedded" ? "embedded" : "hosted";
  const stripe = createStripeClient(body.environment);
  const submitMessage = copy.submit;

  // Compact category payload the webhook uses to rebuild the Bókun reservation.
  const categoriesJson = JSON.stringify(
    basePricing.lines.map((l) => ({
      c: l.bokunCategoryId,
      q: l.quantity,
      u: Math.round(l.unitEur * 100),
      f: l.isFree ? 1 : 0,
    })),
  ).slice(0, 480);
  const addOnsJson = JSON.stringify(
    addOnPricing.lines.map((a) => ({
      id: a.id,
      q: a.quantity,
      u: Math.round(a.unitEur * 100),
      unit: a.pricingUnit,
    })),
  ).slice(0, 480);

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
      description: `${productName} · ${stored.date}${stored.start_time ? ` ${stored.start_time}` : ""}`.slice(0, 1000),
    },
    ...(body.customerEmail && { customer_email: body.customerEmail }),
    metadata: {
      booking_type: "booking-quote-v3",
      flow,
      quote_id: stored.quote_id,
      commercial_product_key: stored.commercial_product_key,
      commercial_mapping_id: stored.commercial_mapping_id,
      pricing_revision: stored.pricing_revision,
      ...(stored.itinerary_revision
        ? { itinerary_revision: String(stored.itinerary_revision) }
        : {}),
      bokun_product_id: stored.bokun_product_id,
      ...(stored.bokun_option_id ? { bokun_option_id: String(stored.bokun_option_id) } : {}),
      ...(stored.bokun_rate_id ? { bokun_rate_id: String(stored.bokun_rate_id) } : {}),
      bokun_availability_id: String(stored.availability_id),
      bokun_reservation_id: String(reservationId),
      date_exact: stored.date,
      start_time: (stored.start_time ?? "").slice(0, 16),
      total_eur: String(finalTotalEur),
      final_total_eur: String(finalTotalEur),
      base_subtotal_eur: String(basePricing.subtotalEur),
      add_on_subtotal_eur: String(addOnPricing.subtotalEur),
      guests_total: String(totalParticipants),
      pricing_categories_json: categoriesJson,
      add_ons_json: addOnsJson,
      pickup: (body.pickupLabel ?? "").slice(0, 120),
      journey_title: (body.journeyTitle ?? tourTitle).slice(0, 160),
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

  // Deterministic idempotency: quote + reservation → same Stripe session on retry.
  const tokenHash = await sha256Hex(`${body.quoteToken}:${reservationId}`);
  const idempotencyKey = `booking-quote-v3:${tokenHash}`;
  let session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });
  } catch (e) {
    // Stripe failed AFTER we reserved — best-effort release, then surface error.
    const { releaseReservation } = await import("../_shared/bokun.ts");
    await releaseReservation(String(reservationId));
    await admin
      .from("booking_quotes")
      .update({
        state: "failed",
        bokun_reservation_status: "released",
        last_error: `stripe_create_failed:${e instanceof Error ? e.message : String(e)}`.slice(0, 500),
      })
      .eq("quote_id", stored.quote_id);
    return jsonError(`stripe_create_failed:${e instanceof Error ? e.message : String(e)}`, 502);
  }

  // Mark the quote checkout-created + consumed only after Stripe accepts.
  await admin
    .from("booking_quotes")
    .update({
      state: "checkout-created",
      stripe_session_id: session.id,
      checkout_created_at: new Date().toISOString(),
      consumed_at: new Date().toISOString(),
    })
    .eq("quote_id", stored.quote_id);

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
      submitMessage,
      uiMode,
      readiness: {
        slotVerified: true,
        categoriesVerified: true,
        capacityVerified: true,
        addOnsVerified: true,
        provisionalReservationCreated: true,
      },
      reservation: {
        bokunReservationId: reservationId,
        bokunReservationStatus: "reserved",
        confirmationCode: reservationConfirmationCode,
      },
      pricing: {
        baseLines: basePricing.lines,
        baseSubtotalEur: basePricing.subtotalEur,
        addOnLines: addOnPricing.lines,
        addOnSubtotalEur: addOnPricing.subtotalEur,
        finalTotalEur,
      },
      idempotencyKey,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// Idempotent replay path — repeated create-session calls for the same quote
// after a session was already created return the stored session id without
// re-hitting Stripe or Bókun.
async function jsonReplayFromStored(
  stored: Record<string, unknown>,
  environment: StripeEnv,
): Promise<Response> {
  const rawPublishable =
    environment === "live"
      ? (Deno.env.get("STRIPE_LIVE_PUBLISHABLE_KEY") ?? "")
      : (Deno.env.get("STRIPE_SANDBOX_PUBLISHABLE_KEY") ?? "");
  const publishableKey = rawPublishable.startsWith("pk_") ? rawPublishable : "";
  return new Response(
    JSON.stringify({
      sessionId: stored.stripe_session_id,
      url: null,
      clientSecret: null,
      publishableKey,
      flow: stored.flow,
      idempotent: true,
      reservation: {
        bokunReservationId: stored.bokun_reservation_id,
        bokunReservationStatus: stored.bokun_reservation_status,
      },
      pricing: {
        finalTotalEur: Number(stored.final_total_eur),
      },
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
      mode?:
        | "quote"
        | "create-session"
        | "bokun-signature-create-session"
        | "booking-quote-create-session";
      snapshot?: RawQuoteSnapshot;
      quoteToken?: string;
      currentRevision?: string;
    };
    if (!body || typeof body !== "object") return jsonError("Invalid body", 400);

    // Launch-spec v3 unified BookingQuote path (Signature / Tailored / Studio).
    if (body.mode === "booking-quote-create-session") {
      if (!body.quoteToken) return jsonError("Missing quoteToken", 400);
      return await handleBookingQuoteCreateSession(
        body as unknown as BookingQuoteCreateSessionBody,
      );
    }
    // Studio V3 authoritative-quote paths (legacy — kept for existing callers).
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
    // Phase B: Bókun-authoritative Signature/Tailored checkout via signed quote.
    if (body.mode === "bokun-signature-create-session") {
      if (!body.quoteToken || !body.currentRevision) {
        return jsonError("Missing quote fields", 400);
      }
      return await handleBokunSignatureCreateSession(body as unknown as BokunCreateSessionBody);
    }

    // Legacy Signature/Tailor path below.
    if (!body.tourId || typeof body.tourId !== "string" || body.tourId.length > 80)
      return jsonError("Invalid tourId", 400);

    // §7 — Studio V3 commercial keys MUST use the authoritative quote path.
    // Block any attempt to reach the legacy tier-based checkout under a
    // Studio V3 commercial identity.
    // §7 — Studio V3 commercial keys MUST use the authoritative quote path.
    // Block any attempt to reach the legacy tier-based checkout under a
    // Studio V3 commercial identity.
    if (
      body.tourId === "studio-v3-private-full-day" ||
      body.tourId === "studio-v3-half-day" ||
      body.tourId === "studio-v3-multi-day"
    ) {
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
