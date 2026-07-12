// Server-authored live Bókun quote.
//
// This is the single upstream source of price truth used by every visible
// surface (Signature booking form, Tailored, Studio V3 Guest Details,
// Checkout Summary) and by create-signature-checkout right before Stripe.
//
// Contract:
//   INPUT  { internalProductKey, bokunProductId?, bokunOptionId?, bokunRateId?,
//            availabilityId?, date, startTime?, guestMix, selectedAddOns[],
//            signatureRevision? }
//   OUTPUT { source, currency, lines[], addOnLines[], finalTotalEur,
//            pricingPartySize, totalParticipants, availabilityId?,
//            quoteToken (HMAC signed, ~10 min TTL), expiresAt }
//
// The token is opaque to the browser — checkout re-invokes bokun-quote
// server-side to recompute + compare before creating a Stripe session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  getActivityAvailabilities,
  pickSlotUnitPrice,
  bokunFetch,
  extractActivityCategories,
  type AvailabilitySlot,
  type BokunRawCategory,
} from "../_shared/bokun.ts";
import {
  coerceGuestMix,
  billableGuests,
  type GuestMix,
} from "../_shared/ageBandPricing.ts";
import {
  pickCategoryForBand,
  type MappedBokunPricingCategory,
  type PricingMode,
  type PricingPartySizeRule,
} from "../_shared/bokunCategories.ts";
import {
  signBokunQuoteToken,
  type BokunQuoteLine,
  type BokunQuoteAddOn,
  type BokunQuoteSource,
  type BokunQuoteTokenPayload,
} from "../_shared/bokunQuoteToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface QuoteInput {
  internalProductKey: string;
  bokunProductId?: string;
  bokunOptionId?: string;
  bokunRateId?: string;
  availabilityId?: string | number;
  date: string;                 // YYYY-MM-DD
  startTime?: string;
  guestMix: Partial<GuestMix> | { guests?: number };
  selectedAddOns?: Array<{ id: string; quantity: number }>;
  signatureRevision?: string;
}

interface QuoteResponse {
  ok: boolean;
  reason?: string;
  source: BokunQuoteSource;
  currency: "EUR";
  internalProductKey: string;
  bokunProductId: string | null;
  availabilityId: string | null;
  date: string;
  startTime: string | null;
  pricingPartySize: number;
  totalParticipants: number;
  guestMix: GuestMix;
  bokunCategories: MappedBokunPricingCategory[];
  lines: BokunQuoteLine[];
  addOnLines: BokunQuoteAddOn[];
  finalTotalEur: number;
  quoteToken: string | null;
  expiresAt: string | null;
  pricingMode: PricingMode | null;
  warnings: string[];
}

function ageRange(cat: MappedBokunPricingCategory): string | undefined {
  const hasMin = typeof cat.minAge === "number";
  const hasMax = typeof cat.maxAge === "number";
  if (hasMin && hasMax) return `${cat.minAge}–${cat.maxAge}`;
  if (hasMin) return `${cat.minAge}+`;
  if (hasMax) return `≤${cat.maxAge}`;
  return undefined;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let input: QuoteInput;
  try {
    input = (await req.json()) as QuoteInput;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  if (!input.internalProductKey || !input.date) {
    return json(400, { error: "internalProductKey and date are required" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const signingSecret = Deno.env.get("STUDIO_QUOTE_SIGNING_SECRET");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Resolve the (product, option, rate) commercial mapping.
  const { data: optMapping } = await admin
    .from("tour_bokun_option_mapping")
    .select("bokun_product_id, bokun_option_id, bokun_rate_id, pricing_party_size_rule")
    .eq("tour_id", input.internalProductKey)
    .maybeSingle();

  const { data: legacyMapping } = await admin
    .from("tour_bokun_mapping")
    .select("bokun_product_id")
    .eq("tour_id", input.internalProductKey)
    .maybeSingle();

  const bokunProductId =
    input.bokunProductId ??
    (optMapping?.bokun_product_id as string | undefined) ??
    (legacyMapping?.bokun_product_id as string | undefined) ??
    null;

  const partySizeRule: PricingPartySizeRule =
    ((optMapping?.pricing_party_size_rule as PricingPartySizeRule | null) ??
      "billable_participants");

  const guestMix = coerceGuestMix(input.guestMix);
  const totalParticipants =
    guestMix.adults + guestMix.youths + guestMix.children + guestMix.infants;
  const pricingPartySize =
    partySizeRule === "all_participants" ? totalParticipants : billableGuests(guestMix);

  const warnings: string[] = [];

  // Empty-response builder — used for all early-exit / pending-review paths.
  const emptyResp = (source: BokunQuoteSource, reason?: string): QuoteResponse => ({
    ok: false,
    reason,
    source,
    currency: "EUR",
    internalProductKey: input.internalProductKey,
    bokunProductId,
    availabilityId: null,
    date: input.date,
    startTime: input.startTime ?? null,
    pricingPartySize,
    totalParticipants,
    guestMix,
    bokunCategories: [],
    lines: [],
    addOnLines: [],
    finalTotalEur: 0,
    quoteToken: null,
    expiresAt: null,
    pricingMode: null,
    warnings,
  });

  if (!bokunProductId) {
    warnings.push("No Bókun mapping — Studio/Signature product pending review");
    return json(200, emptyResp("pending-review", "no_bokun_mapping"));
  }

  // 2. Load the mirror row (categories + override + pricing_mode).
  const { data: mirror } = await admin
    .from("tour_price_tiers")
    .select("bokun_categories, pricing_mode, override_tiers, banded_pricing_enabled")
    .eq("tour_id", input.internalProductKey)
    .maybeSingle();

  const bokunCategories = (mirror?.bokun_categories ?? []) as MappedBokunPricingCategory[];
  const pricingMode = (mirror?.pricing_mode as PricingMode | null) ?? null;

  // 3. Revalidate the exact slot on Bókun for the requested date.
  let slots: AvailabilitySlot[] = [];
  try {
    slots = await getActivityAvailabilities(bokunProductId, input.date);
  } catch (e) {
    return json(200, emptyResp("pending-review", `availability fetch failed: ${e instanceof Error ? e.message : String(e)}`));
  }

  const usable = slots.filter((s) => (s.availabilityCount ?? 0) >= totalParticipants);
  let slot: AvailabilitySlot | null = null;

  if (input.availabilityId) {
    const wanted = String(input.availabilityId);
    slot = usable.find((s) => String(s.id) === wanted) ?? null;
    if (!slot) {
      warnings.push(`selected slot ${wanted} unavailable for ${totalParticipants} participants`);
      return json(200, emptyResp("pending-review", "slot_unavailable"));
    }
  } else if (input.startTime) {
    slot = usable.find((s) => s.startTime === input.startTime) ?? null;
  } else if (usable.length === 1) {
    slot = usable[0];
  }

  if (!slot) {
    warnings.push("no unique slot resolved — pass availabilityId or startTime");
    return json(200, emptyResp("pending-review", "no_slot_resolved"));
  }

  // 4. Also fetch activity for category-default fallbacks (some tenants omit
  //    per-slot prices for infants etc.).
  let activityCats: BokunRawCategory[] = [];
  try {
    const activity = await bokunFetch(
      `/activity.json/${bokunProductId}?lang=EN&currency=EUR`, "GET",
    );
    activityCats = extractActivityCategories(activity);
  } catch { /* non-fatal */ }

  // 5. Build one line per requested band, verifying the Bókun category
  //    actually exists on THIS slot. Missing required category → pending-review.
  const bandQty: Record<"adult" | "youth" | "child" | "infant", number> = {
    adult: guestMix.adults,
    youth: guestMix.youths,
    child: guestMix.children,
    infant: guestMix.infants,
  };

  const slotCatById = new Map<string, Record<string, unknown>>();
  for (const c of slot.pricingCategories ?? []) slotCatById.set(String(c.id), c as unknown as Record<string, unknown>);

  const lines: BokunQuoteLine[] = [];
  for (const band of ["adult", "youth", "child", "infant"] as const) {
    const qty = bandQty[band];
    if (qty <= 0) continue;
    const mapping = pickCategoryForBand(bokunCategories, band);
    if (!mapping || mapping.mappingStatus === "unmapped") {
      warnings.push(`No confirmed Bókun category for ${band}`);
      return json(200, emptyResp("pending-review", `unmapped_${band}`));
    }
    const slotCat = slotCatById.get(mapping.bokunCategoryId);
    if (!slotCat) {
      // Infants sometimes absent on a slot but valid via activity default.
      if (band !== "infant") {
        warnings.push(`Slot missing category ${mapping.bokunCategoryId} for ${band}`);
        return json(200, emptyResp("pending-review", `slot_missing_${band}`));
      }
    }
    const activityCat = activityCats.find((c) => String(c.id) === mapping.bokunCategoryId);
    let unit = pickSlotUnitPrice(slotCat, activityCat);
    if (unit == null) {
      if (band === "infant" && mapping.normallyFree) unit = 0;
      else {
        warnings.push(`No price resolvable for band ${band}`);
        return json(200, emptyResp("pending-review", `no_price_${band}`));
      }
    }
    lines.push({
      uiBand: band,
      bokunCategoryId: mapping.bokunCategoryId,
      label: mapping.bokunTitle,
      ageRange: ageRange(mapping),
      quantity: qty,
      unitEur: unit,
      subtotalEur: Math.round(unit * qty * 100) / 100,
      countsTowardCapacity: mapping.countsTowardCapacity,
    });
  }

  if (!lines.length) {
    return json(200, emptyResp("pending-review", "no_billable_guests"));
  }

  // 6. Add-ons: Phase A treats these as pass-through with zero cost unless
  //    Bókun exposes them on the slot. Phase B wires the approved external
  //    add-on catalogue (signatureAddOnCatalogue.ts) into this step.
  const addOnLines: BokunQuoteAddOn[] = (input.selectedAddOns ?? [])
    .filter((a) => a.quantity > 0)
    .map((a) => ({
      id: a.id, label: a.id, quantity: a.quantity,
      unitEur: 0, subtotalEur: 0, source: "external-server" as const,
    }));

  const finalTotalEur =
    Math.round(
      (lines.reduce((s, l) => s + l.subtotalEur, 0) +
        addOnLines.reduce((s, l) => s + l.subtotalEur, 0)) * 100,
    ) / 100;

  // 7. Source classification — override takes precedence over live only when
  //    admin has an active override_tiers row. Even then, capacity/slot come
  //    from Bókun. Studio pending-review path never signs a token.
  const overrideActive =
    !!mirror?.override_tiers && Object.keys(mirror.override_tiers).length > 0;
  const source: BokunQuoteSource = overrideActive
    ? "bokun-with-approved-override"
    : "bokun-live";

  // 8. Sign the token (10-min TTL).
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 10 * 60;
  const payload: BokunQuoteTokenPayload = {
    v: 2,
    source,
    currency: "EUR",
    internalProductKey: input.internalProductKey,
    bokunProductId,
    ...(input.bokunOptionId || optMapping?.bokun_option_id
      ? { bokunOptionId: String(input.bokunOptionId ?? optMapping?.bokun_option_id) }
      : {}),
    ...(input.bokunRateId || optMapping?.bokun_rate_id
      ? { bokunRateId: String(input.bokunRateId ?? optMapping?.bokun_rate_id) }
      : {}),
    availabilityId: String(slot.id),
    date: slot.date,
    startTime: slot.startTime,
    guestMix,
    pricingPartySize,
    totalParticipants,
    lines, addOnLines, finalTotalEur,
    revision: input.signatureRevision ?? "r0",
    iat, exp,
  };

  const quoteToken = signingSecret
    ? await signBokunQuoteToken(payload, signingSecret)
    : null;
  if (!signingSecret) warnings.push("STUDIO_QUOTE_SIGNING_SECRET not set — quote token skipped");

  const resp: QuoteResponse = {
    ok: true,
    source,
    currency: "EUR",
    internalProductKey: input.internalProductKey,
    bokunProductId,
    availabilityId: String(slot.id),
    date: slot.date,
    startTime: slot.startTime,
    pricingPartySize,
    totalParticipants,
    guestMix,
    bokunCategories,
    lines, addOnLines, finalTotalEur,
    quoteToken,
    expiresAt: new Date(exp * 1000).toISOString(),
    pricingMode,
    warnings,
  };

  return json(200, resp);
});
