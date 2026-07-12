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
import {
  getActivityAvailabilities,
  pickSlotUnitPrice,
  bokunFetch,
  extractActivityCategories,
  type AvailabilitySlot,
  type BokunRawCategory,
} from "../_shared/bokun.ts";
import type { MappedBokunPricingCategory } from "../_shared/bokunCategories.ts";
import { resolveCommercialMapping } from "../_shared/resolveCommercialMapping.ts";
import { resolveAddOnsFromDb } from "../_shared/resolveAddOnsFromDb.ts";
import {
  coerceComposition,
  resolveComposition,
  type TravellerComposition,
} from "../_shared/travellerComposition.ts";
import {
  computePricingRevision,
  type BookingFlow,
  type BookingQuote,
  type BookingQuoteBaseLine,
  type BookingQuoteResponse,
  type BookingQuoteUnavailable,
  type BookingQuoteDiagnostics,
} from "../_shared/bookingQuote.ts";
import { signBookingQuoteToken } from "../_shared/bookingQuoteToken.ts";
import { syncOneBokunPricing } from "../_shared/syncBokunPricing.ts";

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

  // 1. Resolve commercial mapping (Studio isolated from Signature by helper).
  const mappingResult = await resolveCommercialMapping(admin, input.flow, input.commercialProductKey);
  if (!mappingResult.ok) {
    return unavailable(input.flow, input.commercialProductKey, mappingResult.error.reason, mappingResult.error.message);
  }
  const mapping = mappingResult.mapping;

  // 2. Load the Bókun category mirror (age ranges live here).
  //    Auto-heal: if empty, trigger a live sync for this product and re-read once.
  async function loadMirror() {
    const { data } = await admin
      .from("tour_price_tiers")
      .select("bokun_categories")
      .eq("tour_id", input.commercialProductKey)
      .maybeSingle();
    return (data?.bokun_categories ?? []) as MappedBokunPricingCategory[];
  }

  let bokunCategories = await loadMirror();
  if (!bokunCategories.length) {
    console.log(`[booking-quote] mirror empty for ${input.commercialProductKey}; auto-syncing product ${mapping.bokunProductId}`);
    try {
      const syncResult = await syncOneBokunPricing(
        admin,
        input.commercialProductKey,
        String(mapping.bokunProductId),
        false,
      );
      if (!syncResult.ok) {
        return unavailable(input.flow, input.commercialProductKey, "no_commercial_mapping",
          `Auto-sync failed: ${syncResult.reason ?? "unknown"}`);
      }
      bokunCategories = await loadMirror();
    } catch (e) {
      return unavailable(input.flow, input.commercialProductKey, "no_commercial_mapping",
        `Auto-sync error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (!bokunCategories.length) {
    return unavailable(input.flow, input.commercialProductKey, "no_commercial_mapping",
      "No Bókun pricing categories mirrored for this product after auto-sync.");
  }

  // 3. Resolve traveller composition → confirmed Bókun categories.
  const resolved = resolveComposition(composition, bokunCategories);
  if (resolved.unresolvedAges.includes(-1)) {
    return unavailable(input.flow, input.commercialProductKey, "no_adult_category",
      "This product has no adult pricing category configured.");
  }
  if (resolved.unresolvedAges.length) {
    return unavailable(input.flow, input.commercialProductKey, "age_unsupported",
      `Ages not accepted by this product: ${resolved.unresolvedAges.join(", ")}`,
      { unresolvedAges: resolved.unresolvedAges });
  }

  // 4. Availability revalidation against Bókun.
  let slots: AvailabilitySlot[] = [];
  try {
    slots = await getActivityAvailabilities(mapping.bokunProductId, input.date);
  } catch (e) {
    return unavailable(input.flow, input.commercialProductKey, "bokun_unreachable",
      `Bókun availability fetch failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!slots.length) {
    return unavailable(input.flow, input.commercialProductKey, "no_slots",
      "No slots available on the requested date.");
  }

  const usable = slots.filter((s) => (s.availabilityCount ?? 0) >= resolved.totalParticipants);
  let slot: AvailabilitySlot | null = null;
  if (input.availabilityId) {
    const wanted = String(input.availabilityId);
    slot = usable.find((s) => String(s.id) === wanted) ?? null;
    if (!slot) {
      return unavailable(input.flow, input.commercialProductKey, "slot_capacity_lost",
        `Slot ${wanted} no longer has capacity for ${resolved.totalParticipants} participants.`);
    }
  } else if (input.startTime) {
    slot = usable.find((s) => s.startTime === input.startTime) ?? null;
  } else if (usable.length === 1) {
    slot = usable[0];
  }
  if (!slot) {
    return unavailable(input.flow, input.commercialProductKey, "slot_unavailable",
      "Requested slot is unavailable.");
  }

  // 5. Category price defaults from the activity (some slots omit infant prices).
  let activityCats: BokunRawCategory[] = [];
  try {
    const activity = await bokunFetch(
      `/activity.json/${mapping.bokunProductId}?lang=EN&currency=EUR`,
      "GET",
    );
    activityCats = extractActivityCategories(activity);
  } catch {
    /* non-fatal — slot prices win when present */
  }

  const slotCatById = new Map<string, Record<string, unknown>>();
  for (const c of slot.pricingCategories ?? []) {
    slotCatById.set(String(c.id), c as unknown as Record<string, unknown>);
  }

  // 6. Build base pricing lines from resolvedComposition + Bókun unit prices.
  const baseLines: BookingQuoteBaseLine[] = [];
  for (const entry of resolved.categoryQuantities) {
    const { category, quantity, ages } = entry;
    const slotCat = slotCatById.get(category.bokunCategoryId);
    const activityCat = activityCats.find((c) => String(c.id) === category.bokunCategoryId);
    let unit = pickSlotUnitPrice(slotCat, activityCat);
    if (unit == null) {
      if (category.uiBand === "infant" && category.normallyFree) unit = 0;
      else {
        return unavailable(input.flow, input.commercialProductKey, "price_missing",
          `No live unit price for category ${category.bokunTitle} (${category.bokunCategoryId}).`);
      }
    }
    const subtotal = Math.round(unit * quantity * 100) / 100;
    baseLines.push({
      bokunCategoryId: category.bokunCategoryId,
      label: category.bokunTitle,
      minAge: typeof category.minAge === "number" ? category.minAge : undefined,
      maxAge: typeof category.maxAge === "number" ? category.maxAge : undefined,
      ages: ages.length ? ages : undefined,
      quantity,
      unitEur: unit,
      subtotalEur: subtotal,
      isFree: unit === 0 ? true : undefined,
    });
  }
  if (!baseLines.length) {
    return unavailable(input.flow, input.commercialProductKey, "no_adult_category",
      "No billable travellers resolved.");
  }
  const baseSubtotal = Math.round(baseLines.reduce((s, l) => s + l.subtotalEur, 0) * 100) / 100;

  // 7. Server-authoritative add-ons.
  const addOns = await resolveAddOnsFromDb(admin, {
    flow: input.flow,
    commercialProductKey: input.commercialProductKey,
    requested: input.addOns ?? [],
    totalParticipants: resolved.totalParticipants,
  });
  if (!addOns.ok) {
    return unavailable(input.flow, input.commercialProductKey, "add_on_invalid",
      `Rejected add-ons: ${(addOns.invalidIds ?? []).join(", ") || "unknown"}`);
  }

  const finalTotalEur = Math.round((baseSubtotal + addOns.subtotalEur) * 100) / 100;

  // 8. Compute pricingRevision + persist quote snapshot.
  const pricingRevision = computePricingRevision({
    commercialProductKey: input.commercialProductKey,
    date: input.date,
    startTime: slot.startTime,
    availabilityId: String(slot.id),
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
    commercial_mapping_id: mapping.commercialMappingId,
    bokun_product_id: mapping.bokunProductId,
    bokun_option_id: mapping.bokunOptionId,
    bokun_rate_id: mapping.bokunRateId,
    availability_id: String(slot.id),
    date: input.date,
    start_time: slot.startTime,
    traveller_composition: composition as unknown as Record<string, unknown>,
    resolved_guest_mix: {
      adults: resolved.guestMix.adults,
      youths: resolved.guestMix.youths,
      children: resolved.guestMix.children,
      infants: resolved.guestMix.infants,
      totalParticipants: resolved.totalParticipants,
    },
    pricing_revision: pricingRevision,
    itinerary_revision: input.itineraryRevision ?? null,
    itinerary_snapshot: input.itinerarySnapshot ?? null,
    base_pricing: { lines: baseLines, subtotalEur: baseSubtotal },
    add_on_pricing: { lines: addOns.lines, subtotalEur: addOns.subtotalEur },
    final_total_eur: finalTotalEur,
    currency: "EUR",
    quote_token: "",           // filled after we sign
    expires_at: expiresAtIso,
  };

  // Sign the token bound to the quote id + pricing revision.
  const quoteToken = await signBookingQuoteToken(
    {
      v: 3,
      quoteId,
      flow: input.flow,
      commercialProductKey: input.commercialProductKey,
      commercialMappingId: mapping.commercialMappingId,
      bokunProductId: mapping.bokunProductId,
      bokunOptionId: mapping.bokunOptionId ?? undefined,
      bokunRateId: mapping.bokunRateId ?? undefined,
      availabilityId: String(slot.id),
      date: input.date,
      startTime: slot.startTime,
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
    commercialMappingId: mapping.commercialMappingId,
    productId: mapping.bokunProductId,
    optionId: mapping.bokunOptionId ?? "",
    rateId: mapping.bokunRateId ?? undefined,
    availabilityId: String(slot.id),
    date: input.date,
    startTime: slot.startTime,
    pricingRevision,
    itineraryRevision: input.itineraryRevision,
    travellerComposition: composition,
    resolvedGuestMix: {
      adults: resolved.guestMix.adults,
      youths: resolved.guestMix.youths,
      children: resolved.guestMix.children,
      infants: resolved.guestMix.infants,
      totalParticipants: resolved.totalParticipants,
    },
    basePricing: { lines: baseLines, subtotalEur: baseSubtotal },
    addOnPricing: { lines: addOns.lines, subtotalEur: addOns.subtotalEur },
    finalTotalEur,
    currency: "EUR",
    availabilityStatus: "available",
  };

  return json(200, response satisfies BookingQuoteResponse);
});
