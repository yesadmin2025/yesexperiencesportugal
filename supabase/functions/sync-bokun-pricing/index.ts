// Sync Bokun pricingCategories → tour_price_tiers banded tiers.
//
// For each row in tour_bokun_mapping (or a single tourId in the request body):
//  1. Fetch the Bokun activity to read its pricingCategories.
//  2. Probe availability ~14 days ahead to pick up per-slot pricing.
//  3. Classify each pricingCategory into adult | youth | child | infant using
//     title + minAge/maxAge heuristics (with configurable overrides via
//     `bokun_category_aliases` body param).
//  4. Build banded tiers { adult: {1..8}, youth?, child?, infant? } from
//     Bokun's category prices. If Bokun exposes only a single flat price per
//     category we use it for all buckets 1..8; group-size discounts stay
//     handled by admin overrides.
//  5. Upsert into tour_price_tiers with bokun_categories + synced_from_bokun_at.
//     Returns a diff so admin UI can show what changed and require confirm.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/auth.ts";
import { bokunFetch, getActivityAvailabilities } from "../_shared/bokun.ts";
import {
  normaliseBandedTiers,
  type AgeBand,
  type BandedTiers,
  type BandTier,
} from "../_shared/ageBandPricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BokunCategory = {
  id: number;
  title: string;
  minAge?: number;
  maxAge?: number;
  defaultPrice?: number;
  price?: number;
};

type Alias = { pattern: string; band: AgeBand };

const DEFAULT_ALIASES: Alias[] = [
  { pattern: "infant", band: "infant" },
  { pattern: "baby", band: "infant" },
  { pattern: "toddler", band: "infant" },
  { pattern: "child", band: "child" },
  { pattern: "kid", band: "child" },
  { pattern: "junior", band: "child" },
  { pattern: "youth", band: "youth" },
  { pattern: "teen", band: "youth" },
  { pattern: "student", band: "youth" },
  { pattern: "adult", band: "adult" },
  { pattern: "senior", band: "adult" },
];

function classify(cat: BokunCategory, aliases: Alias[]): AgeBand {
  const title = (cat.title ?? "").toLowerCase();
  for (const a of aliases) {
    if (title.includes(a.pattern.toLowerCase())) return a.band;
  }
  // Fall back to age band heuristics.
  const maxAge = typeof cat.maxAge === "number" ? cat.maxAge : undefined;
  const minAge = typeof cat.minAge === "number" ? cat.minAge : undefined;
  if (maxAge !== undefined && maxAge <= 2) return "infant";
  if (maxAge !== undefined && maxAge <= 11) return "child";
  if (maxAge !== undefined && maxAge <= 17) return "youth";
  if (minAge !== undefined && minAge >= 18) return "adult";
  return "adult";
}

function firstNumber(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return null;
}

function extractCategoryPrice(
  cat: Record<string, unknown>,
  slotCatsById: Map<number, Record<string, unknown>>,
): number | null {
  const id = Number(cat.id);
  const slotCat = slotCatsById.get(id) ?? {};
  return firstNumber(
    slotCat.price,
    slotCat.amount,
    (slotCat.pricePerGroup as Record<string, unknown> | undefined)?.amount,
    cat.price,
    cat.amount,
    cat.defaultPrice,
    (cat.pricePerGroup as Record<string, unknown> | undefined)?.amount,
  );
}

function flatTier(eur: number): BandTier {
  const out: BandTier = {};
  for (let i = 1; i <= 8; i++) (out as Record<string, number>)[String(i)] = eur;
  return out;
}

async function fetchActivityRaw(productId: string): Promise<Record<string, unknown> | null> {
  try {
    return (await bokunFetch(
      `/activity.json/${productId}?lang=EN&currency=EUR`,
      "GET",
    )) as Record<string, unknown> | null;
  } catch (e) {
    console.error("activity fetch failed", productId, e instanceof Error ? e.message : e);
    return null;
  }
}

async function pickAvailabilityCats(
  productId: string,
): Promise<Map<number, Record<string, unknown>>> {
  const out = new Map<number, Record<string, unknown>>();
  // Try today + 14 days.
  for (const offset of [1, 7, 14, 30]) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    const iso = d.toISOString().slice(0, 10);
    try {
      const slots = await getActivityAvailabilities(productId, iso);
      const slot = slots.find((s) => Array.isArray(s.pricingCategories) && s.pricingCategories!.length);
      if (slot?.pricingCategories) {
        for (const c of slot.pricingCategories as unknown as Array<Record<string, unknown>>) {
          out.set(Number(c.id), c);
        }
        if (out.size) return out;
      }
    } catch (e) {
      console.warn("availability probe failed", productId, iso, e instanceof Error ? e.message : e);
    }
  }
  return out;
}

type SyncOne = {
  tourId: string;
  productId: string;
  ok: boolean;
  before: BandedTiers | null;
  after: BandedTiers | null;
  bokunCategories: Record<AgeBand, { id: number; title: string; minAge?: number; maxAge?: number } | null> | null;
  reason?: string;
};

async function syncOne(
  admin: ReturnType<typeof createClient>,
  tourId: string,
  productId: string,
  aliases: Alias[],
  dryRun: boolean,
): Promise<SyncOne> {
  const activity = await fetchActivityRaw(productId);
  if (!activity) {
    return {
      tourId, productId, ok: false, before: null, after: null,
      bokunCategories: null, reason: "activity fetch failed",
    };
  }

  const rawCats = (activity.pricingCategories ?? []) as BokunCategory[];
  if (!Array.isArray(rawCats) || !rawCats.length) {
    return {
      tourId, productId, ok: false, before: null, after: null,
      bokunCategories: null, reason: "activity has no pricingCategories",
    };
  }

  const slotCats = await pickAvailabilityCats(productId);

  const byBand: Record<AgeBand, { cat: BokunCategory; eur: number | null } | null> = {
    adult: null, youth: null, child: null, infant: null,
  };
  const bokunCategories: SyncOne["bokunCategories"] = {
    adult: null, youth: null, child: null, infant: null,
  };

  for (const cat of rawCats) {
    const band = classify(cat, aliases);
    const eur = extractCategoryPrice(cat as unknown as Record<string, unknown>, slotCats);
    // Prefer the first category we see per band; skip duplicates.
    if (!byBand[band]) {
      byBand[band] = { cat, eur };
      bokunCategories![band] = {
        id: Number(cat.id),
        title: cat.title,
        ...(typeof cat.minAge === "number" ? { minAge: cat.minAge } : {}),
        ...(typeof cat.maxAge === "number" ? { maxAge: cat.maxAge } : {}),
      };
    }
  }

  if (!byBand.adult || byBand.adult.eur == null) {
    return {
      tourId, productId, ok: false, before: null, after: null,
      bokunCategories, reason: "no adult price resolvable from Bokun",
    };
  }

  const tiers: BandedTiers = { adult: flatTier(byBand.adult.eur) };
  if (byBand.youth?.eur != null) tiers.youth = flatTier(byBand.youth.eur);
  if (byBand.child?.eur != null) tiers.child = flatTier(byBand.child.eur);
  if (byBand.infant) tiers.infant = byBand.infant.eur ?? 0;

  const { data: existing } = await admin
    .from("tour_price_tiers")
    .select("tiers")
    .eq("tour_id", tourId)
    .maybeSingle();
  const before = normaliseBandedTiers(existing?.tiers ?? null);

  if (!dryRun) {
    const { error } = await admin
      .from("tour_price_tiers")
      .upsert({
        tour_id: tourId,
        tiers: tiers as unknown as Record<string, unknown>,
        bokun_categories: bokunCategories as unknown as Record<string, unknown>,
        synced_from_bokun_at: new Date().toISOString(),
      });
    if (error) {
      return { tourId, productId, ok: false, before, after: tiers, bokunCategories, reason: error.message };
    }
  }

  return { tourId, productId, ok: true, before, after: tiers, bokunCategories };
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

  let body: {
    tourId?: string;
    dryRun?: boolean;
    aliases?: Array<{ pattern: string; band: AgeBand }>;
  } = {};
  try {
    body = req.method === "POST" ? await req.json() : {};
  } catch {
    body = {};
  }
  const dryRun = body.dryRun === true;
  const aliases = [
    ...(Array.isArray(body.aliases) ? body.aliases : []),
    ...DEFAULT_ALIASES,
  ];

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

  const results: SyncOne[] = [];
  for (const m of mappings) {
    // Run sequentially — Bokun rate-limits and we want deterministic logs.
    const r = await syncOne(admin, m.tour_id, m.bokun_product_id, aliases, dryRun);
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
