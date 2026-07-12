// Shared Bókun → tour_price_tiers mirror sync.
//
// Extracted from supabase/functions/sync-bokun-pricing/index.ts so it can also
// be invoked internally by booking-quote when the mirror is missing (auto-heal).

import type { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  bokunFetch,
  detectPricingMode,
  extractActivityCategories,
  getActivityAvailabilities,
  pickSlotUnitPrice,
  type BokunRawCategory,
} from "./bokun.ts";
import {
  normaliseBandedTiers,
  type AgeBand,
  type BandedTiers,
  type BandTier,
} from "./ageBandPricing.ts";
import {
  mergeCategoryMappings,
  pickCategoryForBand,
  type MappedBokunPricingCategory,
  type PricingMode,
} from "./bokunCategories.ts";

export interface SyncOneResult {
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

export async function syncOneBokunPricing(
  admin: ReturnType<typeof createClient>,
  tourId: string,
  productId: string,
  dryRun: boolean,
): Promise<SyncOneResult> {
  const warnings: string[] = [];

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

  const merged = mergeCategoryMappings(
    rawCats.map((c) => ({ id: c.id, title: c.title, minAge: c.minAge, maxAge: c.maxAge })),
    existingCats,
  );

  const { slotCatPricesByDate, firstSeenCatPrice } = await probePricing(productId);
  const pricingMode: PricingMode = detectPricingMode(slotCatPricesByDate);

  const bands: AgeBand[] = ["adult", "youth", "child", "infant"];
  const syncedTiers: BandedTiers = { adult: {} };
  let hasAdult = false;
  for (const band of bands) {
    const mapping = pickCategoryForBand(merged, band);
    if (!mapping) continue;
    let unit = firstSeenCatPrice.get(mapping.bokunCategoryId);
    if (unit == null) {
      const activityCat = rawCats.find((c) => String(c.id) === mapping.bokunCategoryId);
      const fromActivity = pickSlotUnitPrice(undefined, activityCat);
      if (fromActivity != null) unit = fromActivity;
    }
    if (unit == null) {
      if (mapping.uiBand === "infant") {
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
