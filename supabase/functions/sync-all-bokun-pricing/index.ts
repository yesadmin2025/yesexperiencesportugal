// Admin: run `syncOneBokunPricing` for every public Signature tour derived
// from the CANONICAL registry (not from `tour_bokun_mapping` rows).
//
// Reuses `_shared/syncBokunPricing.ts` and the existing Bókun auth/http
// helpers — this is NOT a second Bókun integration.
//
// For each registry entry we return an enriched result including explicit
// counts (categoryCount, confirmedCount, suggestedCount, unsupportedCount,
// unmappedCount) so the admin panel and the launch completion report can
// render a per-tour status without recomputing.
//
// Tours missing a `tour_bokun_mapping` row are reported explicitly with
// `ok: false, reason: "missing-product"`. `southwest-vicentine-coast` is the
// canonical example — it appears in the report instead of being dropped.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/auth.ts";
import { syncOneBokunPricing, type SyncOneResult } from "../_shared/syncBokunPricing.ts";
import {
  SIGNATURE_REGISTRY,
  type SignatureRegistryEntry,
} from "../_shared/signatureRegistry.ts";
import type { MappedBokunPricingCategory } from "../_shared/bokunCategories.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichedResult {
  tourId: string;
  title: string;
  publicStatus: SignatureRegistryEntry["status"];
  ok: boolean;
  reason?: string;
  productId: string | null;
  optionId: string | null;
  rateId: string | null;
  warnings: string[];
  categoryCount: number;
  confirmedCount: number;
  suggestedCount: number;
  unsupportedCount: number;
  unmappedCount: number;
  categories: MappedBokunPricingCategory[];
}

function enrich(
  entry: SignatureRegistryEntry,
  optionRow: { optionId: string | null; rateId: string | null } | null,
  raw: SyncOneResult | null,
  overrideReason?: string,
): EnrichedResult {
  const cats: MappedBokunPricingCategory[] = raw?.after?.bokunCategories ?? raw?.before?.bokunCategories ?? [];
  return {
    tourId: entry.id,
    title: entry.title,
    publicStatus: entry.status,
    ok: !!raw?.ok,
    ...(overrideReason || raw?.reason ? { reason: overrideReason ?? raw?.reason ?? "" } : {}),
    productId: raw?.productId ?? null,
    optionId: optionRow?.optionId ?? null,
    rateId: optionRow?.rateId ?? null,
    warnings: raw?.warnings ?? [],
    categoryCount: cats.length,
    confirmedCount: cats.filter((c) => c.mappingStatus === "confirmed").length,
    suggestedCount: cats.filter((c) => c.mappingStatus === "suggested").length,
    // `unsupported` isn't a bokunCategories.ts status today (only confirmed |
    // suggested | unmapped) — but we surface a slot for the launch contract
    // so downstream consumers don't crash when the status is later added.
    unsupportedCount: cats.filter((c) => (c.mappingStatus as string) === "unsupported").length,
    unmappedCount: cats.filter((c) => c.mappingStatus === "unmapped").length,
    categories: cats,
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

  let body: { dryRun?: boolean; only?: string[] } = {};
  try {
    body = req.method === "POST" ? await req.json() : {};
  } catch {
    body = {};
  }
  const dryRun = body.dryRun === true;
  const filter = Array.isArray(body.only) && body.only.length ? new Set(body.only) : null;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const registryIds = SIGNATURE_REGISTRY.map((t) => t.id);
  const [mappingsRes, optionsRes] = await Promise.all([
    admin
      .from("tour_bokun_mapping")
      .select("tour_id, bokun_product_id")
      .in("tour_id", registryIds),
    admin
      .from("tour_bokun_option_mapping")
      .select("tour_id, bokun_option_id, bokun_rate_id")
      .in("tour_id", registryIds),
  ]);

  const mapByTour = new Map<string, string>();
  for (const m of mappingsRes.data ?? []) mapByTour.set(m.tour_id, String(m.bokun_product_id));

  const optByTour = new Map<
    string,
    { optionId: string | null; rateId: string | null }
  >();
  for (const o of optionsRes.data ?? []) {
    optByTour.set(o.tour_id, {
      optionId: (o.bokun_option_id as string | null) ?? null,
      rateId: (o.bokun_rate_id as string | null) ?? null,
    });
  }

  const results: EnrichedResult[] = [];
  for (const entry of SIGNATURE_REGISTRY) {
    if (filter && !filter.has(entry.id)) continue;

    if (entry.status !== "public") {
      results.push(enrich(entry, null, null, `not public (${entry.status})`));
      continue;
    }

    const productId = mapByTour.get(entry.id);
    const optionRow = optByTour.get(entry.id) ?? null;
    if (!productId) {
      results.push(enrich(entry, optionRow, null, "missing-product: no row in tour_bokun_mapping"));
      continue;
    }

    // Sequential — Bókun rate-limits + we want deterministic logs.
    const raw = await syncOneBokunPricing(admin, entry.id, productId, dryRun);
    results.push(enrich(entry, optionRow, raw));
  }

  const summary = {
    total: results.length,
    okCount: results.filter((r) => r.ok).length,
    missingProduct: results.filter((r) => r.reason?.startsWith("missing-product")).length,
    disabled: results.filter((r) => r.publicStatus !== "public").length,
    launchBlocking: results
      .filter((r) => r.publicStatus === "public" && !r.ok)
      .map((r) => ({ tourId: r.tourId, reason: r.reason ?? "unknown" })),
  };

  return new Response(
    JSON.stringify({ dryRun, generatedAt: new Date().toISOString(), summary, results }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
