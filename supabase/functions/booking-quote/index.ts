// booking-quote (v3): Server-authoritative live quote for the unified
// instant-checkout contract (see supabase/functions/_shared/bookingQuote.ts).
//
// Consumed by: useBookingQuote (client), create-signature-checkout
// (server-side re-validation before Stripe). Persists a signed snapshot
// into public.booking_quotes so checkout can accept only { quoteToken }.
//
// Formula (enforced here):
//   finalTotalEur = liveBokunBaseSubtotal + serverAddOnSubtotal
//
// No client-supplied prices, no client-decided age bands, no add-on trust.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveAddOnsFromDb } from "../_shared/resolveAddOnsFromDb.ts";
import {
  coerceComposition,
  type TravellerComposition,
} from "../_shared/travellerComposition.ts";
import {
  computePricingRevision,
  type BookingFlow,
  type BookingQuote,
  type BookingQuoteResponse,
  type BookingQuoteUnavailable,
  type BookingQuoteDiagnostics,
} from "../_shared/bookingQuote.ts";
import { signBookingQuoteToken } from "../_shared/bookingQuoteToken.ts";
import {
  buildManualQuote,
  coerceAdultTiers,
  isManualBokunProductId as _isManualBokunProductId,
  MANUAL_BOKUN_PRODUCT_ID,
  manualAvailabilityId,
  manualCommercialMappingId,
} from "../_shared/manualPricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const QUOTE_TTL_SECONDS = 10 * 60;

interface QuoteRequest {
  flow: BookingFlow;
  commercialProductKey: string;
  date: string;                 // YYYY-MM-DD
  startTime?: string;
  availabilityId?: string | number;
  travellerComposition: TravellerComposition;
  addOns?: Array<{ id: string; quantity: number }>;
  itineraryRevision?: string;
  itinerarySnapshot?: unknown;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function unavailable(
  flow: BookingFlow,
  commercialProductKey: string,
  reason: BookingQuoteUnavailable["reason"],
  message: string,
  extra?: Partial<BookingQuoteUnavailable>,
): Response {
  const body: BookingQuoteUnavailable = {
    availabilityStatus: "unavailable",
    flow,
    commercialProductKey,
    reason,
    message,
    ...extra,
  };
  return json(200, body satisfies BookingQuoteResponse);
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let input: QuoteRequest;
  try {
    input = (await req.json()) as QuoteRequest;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  if (!input.flow || !input.commercialProductKey || !input.date) {
    return json(400, { error: "flow, commercialProductKey, date are required" });
  }
  if (!["signature", "tailor", "studio"].includes(input.flow)) {
    return json(400, { error: "flow must be signature | tailor | studio" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const signingSecret = Deno.env.get("STUDIO_QUOTE_SIGNING_SECRET");
  if (!signingSecret) {
    return json(500, { error: "STUDIO_QUOTE_SIGNING_SECRET is not configured" });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const composition = coerceComposition(input.travellerComposition);
  const t0 = Date.now();

  const diag: BookingQuoteDiagnostics = {
    tourId: input.commercialProductKey,
    mirrorHadCategories: false,
    autoSyncTriggered: false,
  };
  function logDiag(stage: string, extra?: Record<string, unknown>) {
    console.log(JSON.stringify({
      fn: "booking-quote",
      stage,
      flow: input.flow,
      durationMs: Date.now() - t0,
      pricingMode: "manual",
      ...diag,
      ...extra,
    }));
  }
  function unavailableWithDiag(
    reason: BookingQuoteUnavailable["reason"],
    message: string,
    extra?: Partial<BookingQuoteUnavailable>,
  ): Response {
    diag.durationMs = Date.now() - t0;
    logDiag("unavailable", { reason, message });
    return unavailable(input.flow, input.commercialProductKey, reason, message, {
      diagnostics: diag,
      ...extra,
    });
  }

  // Reject past dates and dates > 18 months out. Every future date is
  // treated as available under the manual (Bókun-free) launch path.
  const todayIso = new Date().toISOString().slice(0, 10);
  if (input.date < todayIso) {
    return unavailableWithDiag("no_slots", "Date is in the past.");
  }
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 18);
  if (input.date > maxDate.toISOString().slice(0, 10)) {
    return unavailableWithDiag("no_slots", "Date is too far in the future.");
  }

  // 1. Load the adult per-pax tiers from tour_price_tiers (Viator data, single source of truth).
  const { data: tierRow, error: tierErr } = await admin
    .from("tour_price_tiers")
    .select("tiers")
    .eq("tour_id", input.commercialProductKey)
    .maybeSingle();
  if (tierErr) {
    return unavailableWithDiag("unknown", `Pricing lookup failed: ${tierErr.message}`);
  }
  const adultTiers = coerceAdultTiers(tierRow?.tiers ?? null);
  if (!adultTiers) {
    return unavailableWithDiag(
      "no_commercial_mapping",
      "No manual pricing tiers configured for this tour.",
    );
  }

  // 2. Build the manual quote.
  const manual = buildManualQuote(composition, adultTiers);
  if ("error" in manual) {
    if (manual.error === "no_adults") {
      return unavailableWithDiag("no_adult_category", "At least one adult is required.");
    }
    return unavailableWithDiag("price_missing", "No adult tier resolves for this party size.");
  }

  const startTime = input.startTime ?? "09:00";
  const availabilityId = manualAvailabilityId(input.date, startTime);
  const commercialMappingId = manualCommercialMappingId(
    input.flow,
    input.commercialProductKey,
  );

  // 3. Server-authoritative add-ons (still DB-driven, safe under manual mode).
  const addOns = await resolveAddOnsFromDb(admin, {
    flow: input.flow,
    commercialProductKey: input.commercialProductKey,
    requested: input.addOns ?? [],
    totalParticipants: manual.guestMix.totalParticipants,
  });
  if (!addOns.ok) {
    return unavailableWithDiag(
      "add_on_invalid",
      `Rejected add-ons: ${(addOns.invalidIds ?? []).join(", ") || "unknown"}`,
    );
  }

  const finalTotalEur =
    Math.round((manual.subtotalEur + addOns.subtotalEur) * 100) / 100;

  const pricingRevision = computePricingRevision({
    commercialProductKey: input.commercialProductKey,
    date: input.date,
    startTime,
    availabilityId,
    adults: composition.adults,
    minorAges: composition.minorAges,
    addOns: (input.addOns ?? []).map((a) => ({ id: a.id, quantity: a.quantity })),
  });

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + QUOTE_TTL_SECONDS;
  const expiresAtIso = new Date(exp * 1000).toISOString();
  const quoteId = crypto.randomUUID();

  const insertRow = {
    quote_id: quoteId,
    flow: input.flow,
    commercial_product_key: input.commercialProductKey,
    commercial_mapping_id: commercialMappingId,
    bokun_product_id: MANUAL_BOKUN_PRODUCT_ID,
    bokun_option_id: null,
    bokun_rate_id: null,
    availability_id: availabilityId,
    date: input.date,
    start_time: startTime,
    traveller_composition: composition as unknown as Record<string, unknown>,
    resolved_guest_mix: {
      adults: manual.guestMix.adults,
      youths: manual.guestMix.youths,
      children: manual.guestMix.children,
      infants: manual.guestMix.infants,
      totalParticipants: manual.guestMix.totalParticipants,
    },
    pricing_revision: pricingRevision,
    itinerary_revision: input.itineraryRevision ?? null,
    itinerary_snapshot: input.itinerarySnapshot ?? null,
    base_pricing: { lines: manual.lines, subtotalEur: manual.subtotalEur },
    add_on_pricing: { lines: addOns.lines, subtotalEur: addOns.subtotalEur },
    final_total_eur: finalTotalEur,
    currency: "EUR",
    quote_token: "",
    expires_at: expiresAtIso,
  };

  const quoteToken = await signBookingQuoteToken(
    {
      v: 3,
      quoteId,
      flow: input.flow,
      commercialProductKey: input.commercialProductKey,
      commercialMappingId,
      bokunProductId: MANUAL_BOKUN_PRODUCT_ID,
      bokunOptionId: undefined,
      bokunRateId: undefined,
      availabilityId,
      date: input.date,
      startTime,
      pricingRevision,
      itineraryRevision: input.itineraryRevision,
      finalTotalEur,
      iat,
      exp,
    },
    signingSecret,
  );
  insertRow.quote_token = quoteToken;

  const { error: insertError } = await admin.from("booking_quotes").insert(insertRow);
  if (insertError) {
    return json(500, { error: `Failed to persist quote: ${insertError.message}` });
  }

  const response: BookingQuote = {
    quoteId,
    quoteToken,
    expiresAt: expiresAtIso,
    flow: input.flow,
    source: "bokun-live",
    commercialProductKey: input.commercialProductKey,
    commercialMappingId,
    productId: MANUAL_BOKUN_PRODUCT_ID,
    optionId: "",
    rateId: undefined,
    availabilityId,
    date: input.date,
    startTime,
    pricingRevision,
    itineraryRevision: input.itineraryRevision,
    travellerComposition: composition,
    resolvedGuestMix: {
      adults: manual.guestMix.adults,
      youths: manual.guestMix.youths,
      children: manual.guestMix.children,
      infants: manual.guestMix.infants,
      totalParticipants: manual.guestMix.totalParticipants,
    },
    basePricing: { lines: manual.lines, subtotalEur: manual.subtotalEur },
    addOnPricing: { lines: addOns.lines, subtotalEur: addOns.subtotalEur },
    finalTotalEur,
    currency: "EUR",
    availabilityStatus: "available",
  };

  logDiag("available", { finalTotalEur, availabilityId, adultUnitEur: manual.adultUnitEur });
  return json(200, response satisfies BookingQuoteResponse);
});

