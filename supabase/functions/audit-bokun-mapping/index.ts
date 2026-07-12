// Admin: complete Bókun mapping audit for every public Signature tour.
//
// Iterates the CANONICAL registry (never `tour_bokun_mapping` rows) so a
// missing product mapping surfaces as an explicit `missing-product` result
// instead of being silently omitted. Read-only — writes nothing. Safe to run
// on production.
//
// Returns per-tour:
//   {
//     tourId, isPublic, title, publicStatus, reason,
//     productId, optionId, rateId, currency,
//     categories: MappedBokunPricingCategory[],   // from the mirror
//     mirror: { hasCats, catCount, syncedAt, pricingMode, banded },
//     mappingState:
//       'complete' | 'missing-product' | 'missing-option' |
//       'missing-rate' | 'missing-categories' | 'ambiguous' | 'disabled',
//     warnings: string[]
//   }
//
// Does NOT call Bókun. It compares the canonical registry with what's stored
// in Supabase — the actual Bókun sync happens in `sync-all-bokun-pricing`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/auth.ts";
import {
  SIGNATURE_REGISTRY,
  type SignatureRegistryEntry,
} from "../_shared/signatureRegistry.ts";
import type {
  MappedBokunPricingCategory,
  PricingMode,
} from "../_shared/bokunCategories.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MappingState =
  | "complete"
  | "missing-product"
  | "missing-option"
  | "missing-rate"
  | "missing-categories"
  | "ambiguous"
  | "disabled";

interface AuditRow {
  tourId: string;
  title: string;
  publicStatus: SignatureRegistryEntry["status"];
  isPublic: boolean;
  reason?: string;
  productId: string | null;
  productTitle: string | null;
  optionId: string | null;
  rateId: string | null;
  currency: string | null;
  categories: MappedBokunPricingCategory[];
  mirror: {
    hasCats: boolean;
    catCount: number;
    confirmedCount: number;
    suggestedCount: number;
    unmappedCount: number;
    syncedAt: string | null;
    pricingMode: PricingMode | null;
    bandedPricingEnabled: boolean;
  };
  mappingState: MappingState;
  warnings: string[];
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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const registryIds = SIGNATURE_REGISTRY.map((t) => t.id);

  const [mappings, options, tiers] = await Promise.all([
    admin
      .from("tour_bokun_mapping")
      .select("tour_id, bokun_product_id, bokun_title, currency")
      .in("tour_id", registryIds),
    admin
      .from("tour_bokun_option_mapping")
      .select("tour_id, bokun_product_id, bokun_option_id, bokun_rate_id")
      .in("tour_id", registryIds),
    admin
      .from("tour_price_tiers")
      .select(
        "tour_id, bokun_categories, pricing_mode, banded_pricing_enabled, synced_from_bokun_at",
      )
      .in("tour_id", registryIds),
  ]);

  const mapByTour = new Map<
    string,
    { productId: string; title: string | null; currency: string | null }
  >();
  for (const m of mappings.data ?? []) {
    mapByTour.set(m.tour_id, {
      productId: String(m.bokun_product_id),
      title: (m.bokun_title as string | null) ?? null,
      currency: (m.currency as string | null) ?? null,
    });
  }

  const optionByTour = new Map<
    string,
    { productId: string | null; optionId: string | null; rateId: string | null }
  >();
  for (const o of options.data ?? []) {
    optionByTour.set(o.tour_id, {
      productId: (o.bokun_product_id as string | null) ?? null,
      optionId: (o.bokun_option_id as string | null) ?? null,
      rateId: (o.bokun_rate_id as string | null) ?? null,
    });
  }

  const tierByTour = new Map<
    string,
    {
      categories: MappedBokunPricingCategory[];
      pricingMode: PricingMode | null;
      banded: boolean;
      syncedAt: string | null;
    }
  >();
  for (const t of tiers.data ?? []) {
    tierByTour.set(t.tour_id, {
      categories:
        (t.bokun_categories as MappedBokunPricingCategory[] | null) ?? [],
      pricingMode: (t.pricing_mode as PricingMode | null) ?? null,
      banded: !!t.banded_pricing_enabled,
      syncedAt: (t.synced_from_bokun_at as string | null) ?? null,
    });
  }

  const rows: AuditRow[] = SIGNATURE_REGISTRY.map((entry) => {
    const mapping = mapByTour.get(entry.id) ?? null;
    const option = optionByTour.get(entry.id) ?? null;
    const tier = tierByTour.get(entry.id) ?? null;

    const cats = tier?.categories ?? [];
    const confirmedCount = cats.filter((c) => c.mappingStatus === "confirmed").length;
    const suggestedCount = cats.filter((c) => c.mappingStatus === "suggested").length;
    const unmappedCount = cats.filter((c) => c.mappingStatus === "unmapped").length;

    const warnings: string[] = [];
    let mappingState: MappingState;

    if (entry.status !== "public") {
      mappingState = "disabled";
      if (entry.reason) warnings.push(entry.reason);
    } else if (!mapping) {
      mappingState = "missing-product";
      warnings.push("No row in tour_bokun_mapping");
    } else if (cats.length === 0) {
      mappingState = "missing-categories";
      warnings.push("No mirror row in tour_price_tiers or empty bokun_categories — run sync-all-bokun-pricing");
    } else if (unmappedCount > 0) {
      mappingState = "ambiguous";
      warnings.push(`${unmappedCount} unmapped Bókun category(ies) — booking will be rejected until classified`);
    } else if (option && !option.optionId) {
      mappingState = "missing-option";
      warnings.push("Option-level mapping row exists but bokun_option_id is null");
    } else if (option && option.optionId && !option.rateId) {
      mappingState = "missing-rate";
      warnings.push("Option mapped but rate id absent — rate-specific categories may not resolve");
    } else if (confirmedCount === 0) {
      mappingState = "missing-categories";
      warnings.push(`${suggestedCount} suggested category(ies) awaiting admin confirmation`);
    } else {
      mappingState = "complete";
      if (suggestedCount > 0) {
        warnings.push(`${suggestedCount} suggested category(ies) still awaiting confirmation (adult already confirmed)`);
      }
    }

    return {
      tourId: entry.id,
      title: entry.title,
      publicStatus: entry.status,
      isPublic: entry.status === "public",
      ...(entry.reason ? { reason: entry.reason } : {}),
      productId: mapping?.productId ?? null,
      productTitle: mapping?.title ?? null,
      optionId: option?.optionId ?? null,
      rateId: option?.rateId ?? null,
      currency: mapping?.currency ?? null,
      categories: cats,
      mirror: {
        hasCats: cats.length > 0,
        catCount: cats.length,
        confirmedCount,
        suggestedCount,
        unmappedCount,
        syncedAt: tier?.syncedAt ?? null,
        pricingMode: tier?.pricingMode ?? null,
        bandedPricingEnabled: tier?.banded ?? false,
      },
      mappingState,
      warnings,
    };
  });

  const summary = {
    total: rows.length,
    public: rows.filter((r) => r.isPublic).length,
    byState: rows.reduce<Record<MappingState, number>>((acc, r) => {
      acc[r.mappingState] = (acc[r.mappingState] ?? 0) + 1;
      return acc;
    }, {} as Record<MappingState, number>),
    unmappedTourIds: rows.filter((r) => r.mappingState === "missing-product").map((r) => r.tourId),
    disabledTourIds: rows.filter((r) => r.mappingState === "disabled").map((r) => r.tourId),
    launchBlockingTourIds: rows
      .filter(
        (r) =>
          r.isPublic &&
          (r.mappingState === "missing-product" ||
            r.mappingState === "missing-categories" ||
            r.mappingState === "ambiguous"),
      )
      .map((r) => r.tourId),
  };

  return new Response(
    JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
