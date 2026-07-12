// Sync Bókun catalogue → tour_price_tiers mirror.
//
// Phase A semantics:
//   • Writes ONLY synced_tiers, bokun_categories, pricing_mode, synced_from_bokun_at.
//   • NEVER touches override_tiers / override_metadata.
//   • Preserves confirmed category mappings (mergeCategoryMappings).
//   • Detects pricing_mode by probing multiple dates and comparing per-slot prices.
//   • Returns a rich dry-run diff so /admin/pricing can render category-level review.
//
// Runtime precedence at the checkout is set elsewhere (bokun-quote → override → sync mirror).
// This function is intentionally the *only* writer of the mirror.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/auth.ts";
import {
  bokunFetch,
  detectPricingMode,
  extractActivityCategories,
  getActivityAvailabilities,
  pickSlotUnitPrice,
  type BokunRawCategory,
} from "../_shared/bokun.ts";
import {
  normaliseBandedTiers,
  type AgeBand,
  type BandedTiers,
  type BandTier,
} from "../_shared/ageBandPricing.ts";
import {
  mergeCategoryMappings,
  pickCategoryForBand,
  type MappedBokunPricingCategory,
  type PricingMode,
} from "../_shared/bokunCategories.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncOneResult {
  tourId: string;
  productId: string;
  ok: boolean;
  reason?: string;

  before: {
    syncedTiers: BandedTiers | null;
    overrideTiers: BandedTiers | null;
    bokunCategories: MappedBokunPricingCategory[] | null;
    pricingMode: PricingMode | null;
    syncedAt: string | null;
  } | null;

  after: {
    syncedTiers: BandedTiers | null;
    bokunCategories: MappedBokunPricingCategory[];
    pricingMode: PricingMode;
  } | null;

  warnings: string[];
}

function flatBandTier(eur: number): BandTier {
  const out: BandTier = {};
  for (let i = 1; i <= 8; i++) (out as Record<string, number>)[String(i)] = eur;
  return out;
}

async function probePricing(productId: string): Promise<{
  slotCatPricesByDate: Array<{ dateISO: string; slotUnitPrices: Array<Map<string, number>> }>;
  firstSeenCatPrice: Map<string, number>;
}> {
  const slotCatPricesByDate: Array<{ dateISO: string; slotUnitPrices: Array<Map<string, number>> }> = [];
  const firstSeenCatPrice = new Map<string, number>();
  for (const offset of [1, 7, 14, 30]) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    const iso = d.toISOString().slice(0, 10);
    try {
      const slots = await getActivityAvailabilities(productId, iso);
      const perSlot: Array<Map<string, number>> = [];
      for (const slot of slots) {
        const map = new Map<string, number>();
        for (const raw of slot.pricingCategories ?? []) {
          const catRec = raw as unknown as Record<string, unknown>;
          const price = pickSlotUnitPrice(catRec, undefined);
          if (price != null) {
            const id = String(raw.id);
            map.set(id, price);
            if (!firstSeenCatPrice.has(id)) firstSeenCatPrice.set(id, price);
          }
        }
        if (map.size) perSlot.push(map);
      }
      if (perSlot.length) slotCatPricesByDate.push({ dateISO: iso, slotUnitPrices: perSlot });
    } catch (e) {
      console.warn("availability probe failed", productId, iso, e instanceof Error ? e.message : e);
    }
  }
  return { slotCatPricesByDate, firstSeenCatPrice };
}

async function syncOne(
  admin: ReturnType<typeof createClient>,
  tourId: string,
  productId: string,
  dryRun: boolean,
): Promise<SyncOneResult> {
  const warnings: string[] = [];

  // 1. Activity + raw categories
  let activity: unknown;
  try {
    activity = await bokunFetch(`/activity.json/${productId}?lang=EN&currency=EUR`, "GET");
  } catch (e) {
    return {
      tourId, productId, ok: false, before: null, after: null, warnings,
      reason: `activity fetch failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  const rawCats: BokunRawCategory[] = extractActivityCategories(activity);
  if (!rawCats.length) {
    return {
      tourId, productId, ok: false, before: null, after: null, warnings,
      reason: "activity has no pricingCategories",
    };
  }

  // 2. Load existing row so confirmed mappings + overrides survive.
  const { data: existing } = await admin
    .from("tour_price_tiers")
    .select("synced_tiers, override_tiers, tiers, bokun_categories, pricing_mode, synced_from_bokun_at")
    .eq("tour_id", tourId)
    .maybeSingle();

  const existingCats = (existing?.bokun_categories ?? null) as MappedBokunPricingCategory[] | null;
  const before = existing
    ? {
        syncedTiers: normaliseBandedTiers(existing.synced_tiers ?? existing.tiers ?? null),
        overrideTiers: normaliseBandedTiers(existing.override_tiers ?? null),
        bokunCategories: existingCats,
        pricingMode: (existing.pricing_mode as PricingMode | null) ?? null,
        syncedAt: (existing.synced_from_bokun_at as string | null) ?? null,
      }
    : null;

  // 3. Merge category mappings (preserve confirmed).
  const merged = mergeCategoryMappings(
    rawCats.map((c) => ({ id: c.id, title: c.title, minAge: c.minAge, maxAge: c.maxAge })),
    existingCats,
  );

  // 4. Probe pricing across representative dates.
  const { slotCatPricesByDate, firstSeenCatPrice } = await probePricing(productId);
  const pricingMode: PricingMode = detectPricingMode(slotCatPricesByDate);

  // 5. Build synced_tiers per band using the FIRST resolvable slot price.
  //    For date/slot-dependent products the mirror is a preview only —
  //    checkout must use bokun-quote for the real total.
  const bands: AgeBand[] = ["adult", "youth", "child", "infant"];
  const syncedTiers: BandedTiers = { adult: {} };
  let hasAdult = false;
  for (const band of bands) {
    const mapping = pickCategoryForBand(merged, band);
    if (!mapping) continue;
    // Prefer slot-observed price; fall back to category-level default on the activity.
    let unit = firstSeenCatPrice.get(mapping.bokunCategoryId);
    if (unit == null) {
      const activityCat = rawCats.find((c) => String(c.id) === mapping.bokunCategoryId);
      const fromActivity = pickSlotUnitPrice(undefined, activityCat);
      if (fromActivity != null) unit = fromActivity;
    }
    if (unit == null) {
      if (mapping.uiBand === "infant") {
        // Infants may be free & unpriced by Bókun — treat as €0.
        syncedTiers.infant = 0;
      } else {
        warnings.push(`No resolvable price for band ${band} (Bókun category ${mapping.bokunCategoryId})`);
      }
      continue;
    }
    if (band === "infant") {
      syncedTiers.infant = unit;
    } else if (band === "adult") {
      syncedTiers.adult = flatBandTier(unit);
      hasAdult = true;
    } else {
      syncedTiers[band] = flatBandTier(unit);
    }
  }

  if (!hasAdult) {
    return {
      tourId, productId, ok: false, before, after: null,
      reason: "no adult price resolvable from Bókun",
      warnings,
    };
  }

  const suggestedCount = merged.filter((c) => c.mappingStatus === "suggested").length;
  const unmappedCount = merged.filter((c) => c.mappingStatus === "unmapped").length;
  if (suggestedCount) warnings.push(`${suggestedCount} category(ies) awaiting admin confirmation`);
  if (unmappedCount) warnings.push(`${unmappedCount} category(ies) unmapped — booking will be rejected`);
  if (pricingMode === "date-dependent" || pricingMode === "slot-dependent") {
    warnings.push(`pricing_mode=${pricingMode} — mirror is preview only; checkout must call bokun-quote`);
  }

  if (!dryRun) {
    const { error } = await admin
      .from("tour_price_tiers")
      .upsert({
        tour_id: tourId,
        // Legacy `tiers` column stays in sync with synced_tiers for BC —
        // Phase C UI toggles per-tour to switch consumers to synced/override.
        tiers: syncedTiers as unknown as Record<string, unknown>,
        synced_tiers: syncedTiers as unknown as Record<string, unknown>,
        bokun_categories: merged as unknown as Record<string, unknown>,
        pricing_mode: pricingMode,
        synced_from_bokun_at: new Date().toISOString(),
      });
    if (error) {
      return {
        tourId, productId, ok: false, before, after: null, warnings,
        reason: `upsert failed: ${error.message}`,
      };
    }
  }

  return {
    tourId, productId, ok: true, before,
    after: { syncedTiers, bokunCategories: merged, pricingMode },
    warnings,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return new Response(JSON.stringify({ error: authz.error ?? "Unauthorized" }), {
      status: authz.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { tourId?: string; dryRun?: boolean } = {};
  try {
    body = req.method === "POST" ? await req.json() : {};
  } catch { body = {}; }
  const dryRun = body.dryRun === true;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let mappings: Array<{ tour_id: string; bokun_product_id: string }> = [];
  if (body.tourId) {
    const { data, error } = await admin
      .from("tour_bokun_mapping")
      .select("tour_id, bokun_product_id")
      .eq("tour_id", body.tourId)
      .maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!data) {
      return new Response(JSON.stringify({ error: `no bokun mapping for ${body.tourId}` }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    mappings = [data];
  } else {
    const { data, error } = await admin
      .from("tour_bokun_mapping")
      .select("tour_id, bokun_product_id");
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    mappings = data ?? [];
  }

  const results: SyncOneResult[] = [];
  for (const m of mappings) {
    // Sequential — Bókun rate-limits and we want deterministic logs.
    const r = await syncOne(admin, m.tour_id, m.bokun_product_id, dryRun);
    results.push(r);
  }

  return new Response(
    JSON.stringify({
      dryRun,
      count: results.length,
      okCount: results.filter((r) => r.ok).length,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
