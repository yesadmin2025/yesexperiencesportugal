// Loads per-tour price tier overrides from the `tour_price_tiers` Supabase
// table. The DB is the source of truth; the code-defined VIATOR_META tiers
// remain as a no-network fallback (used during initial render / SSR and if
// the network call fails). The admin editor at `/admin/pricing` writes here.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VIATOR_META, type PriceTiersEUR } from "@/data/signatureToursViator";

export type TourPriceTiersMap = Record<string, PriceTiersEUR | undefined>;

const VALID_TIER_KEYS = new Set(["1", "2", "3", "4", "5", "6", "7", "8"]);

function normaliseTiers(raw: unknown): PriceTiersEUR {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PriceTiersEUR = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!VALID_TIER_KEYS.has(k)) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n <= 0) continue;
    (out as Record<string, number>)[k] = Math.round(n);
  }
  return out;
}

/** Code-defined defaults — keyed map for fallback merging. */
export function codeTierDefaults(): TourPriceTiersMap {
  const map: TourPriceTiersMap = {};
  for (const [tourId, meta] of Object.entries(VIATOR_META)) {
    if (meta.priceTiersEUR) map[tourId] = meta.priceTiersEUR;
  }
  return map;
}

export async function fetchTourPriceTiers(): Promise<TourPriceTiersMap> {
  const { data, error } = await supabase
    .from("tour_price_tiers")
    .select("tour_id, tiers");
  if (error) throw error;
  const map: TourPriceTiersMap = {};
  for (const row of data ?? []) {
    map[row.tour_id] = normaliseTiers(row.tiers);
  }
  return map;
}

export const TOUR_PRICE_TIERS_QUERY_KEY = ["tour_price_tiers"] as const;

export function useTourPriceTiers() {
  return useQuery({
    queryKey: TOUR_PRICE_TIERS_QUERY_KEY,
    queryFn: fetchTourPriceTiers,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    // Seed with code defaults so the first render matches today's behaviour.
    initialData: codeTierDefaults,
    retry: 1,
  });
}
