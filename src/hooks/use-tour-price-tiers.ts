// Loads per-tour price tier overrides from the `tour_price_tiers` Supabase
// table. The DB is the source of truth; the code-defined VIATOR_META tiers
// remain as a no-network fallback (used during initial render / SSR and if
// the network call fails). The admin editor at `/admin/pricing` writes here.
//
// Accepts BOTH stored shapes:
//   - legacy flat  { "1": 279, ..., "8": 159 }               (adults only)
//   - banded       { adult:{...}, youth?, child?, infant? }   (age bands)
// Consumers get:
//   - `data` as the LEGACY adult-only map so every existing caller keeps
//     working unchanged.
//   - `useTourBandedTiers()` for new age-band-aware surfaces.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VIATOR_META, type PriceTiersEUR } from "@/data/signatureToursViator";
import {
  normaliseBandedTiers,
  type BandedTiers,
} from "@/lib/pricing/ageBandPricing";

export type TourPriceTiersMap = Record<string, PriceTiersEUR | undefined>;
export type TourBandedTiersMap = Record<string, BandedTiers | undefined>;

function toRow(raw: unknown): { adult: PriceTiersEUR; banded: BandedTiers } {
  const banded = normaliseBandedTiers(raw) ?? { adult: {} };
  return { adult: banded.adult as PriceTiersEUR, banded };
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
  const { data, error } = await supabase.from("tour_price_tiers").select("tour_id, tiers");
  if (error) throw error;
  const map: TourPriceTiersMap = {};
  for (const row of data ?? []) {
    map[row.tour_id] = toRow(row.tiers).adult;
  }
  return map;
}

/** New: banded fetcher for age-band-aware surfaces. */
export async function fetchTourBandedTiers(): Promise<TourBandedTiersMap> {
  const { data, error } = await supabase.from("tour_price_tiers").select("tour_id, tiers");
  if (error) throw error;
  const map: TourBandedTiersMap = {};
  for (const row of data ?? []) {
    map[row.tour_id] = toRow(row.tiers).banded;
  }
  return map;
}

export const TOUR_PRICE_TIERS_QUERY_KEY = ["tour_price_tiers"] as const;
export const TOUR_BANDED_TIERS_QUERY_KEY = ["tour_price_tiers", "banded"] as const;

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

export function useTourBandedTiers() {
  return useQuery({
    queryKey: TOUR_BANDED_TIERS_QUERY_KEY,
    queryFn: fetchTourBandedTiers,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}
