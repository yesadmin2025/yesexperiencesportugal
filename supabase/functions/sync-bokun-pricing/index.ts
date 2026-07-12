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
import { syncOneBokunPricing, type SyncOneResult } from "../_shared/syncBokunPricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
