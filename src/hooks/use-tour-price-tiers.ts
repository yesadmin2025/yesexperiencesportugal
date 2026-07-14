// Loads per-tour price tier overrides from `tour_price_tiers.tiers`.
// Simplified back to legacy adult-only shape. Age-band pricing is derived
// from the adult per-pax value + fixed multipliers in ageBands.ts.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VIATOR_META, type PriceTiersEUR } from "@/data/signatureToursViator";

export type TourPriceTiersMap = Record<string, PriceTiersEUR | undefined>;

/** Code-defined defaults — keyed map for fallback merging. */
export function codeTierDefaults(): TourPriceTiersMap {
  const map: TourPriceTiersMap = {};
  for (const [tourId, meta] of Object.entries(VIATOR_META)) {
    if (meta.priceTiersEUR) map[tourId] = meta.priceTiersEUR;
  }
  return map;
}

export async function fetchTourPriceTiers(): Promise<TourPriceTiersMap> {
  const { data, error } = await supabase.from("tour_price_tiers").select("tour_id, tiers");
  if (error) throw error;
  const map: TourPriceTiersMap = {};
  for (const row of data ?? []) {
    const raw = (row as { tiers?: unknown }).tiers;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      // Accept both { "1": 279, ... } and { adult: { "1": 279, ... }, ... } shapes.
      const maybeBanded = (raw as { adult?: PriceTiersEUR }).adult;
      map[(row as { tour_id: string }).tour_id] =
        maybeBanded && typeof maybeBanded === "object"
          ? maybeBanded
          : (raw as PriceTiersEUR);
    }
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
    initialData: codeTierDefaults,
    retry: 1,
  });
}
