// Reads the per-tour Bókun readiness row (bokun_categories mirror,
// pricing_mode, banded_pricing_enabled) so the booking UI can decide
// whether to render the new GuestCompositionPicker + live-quote path or
// fall back to the legacy per-pax reserve flow.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  MappedBokunPricingCategory,
  PricingMode,
} from "@/lib/pricing/bokunCategories";

export type TourBokunReadiness = {
  tourId: string;
  bandedPricingEnabled: boolean;
  bokunCategories: MappedBokunPricingCategory[];
  pricingMode: PricingMode | null;
  syncedAt: string | null;
};

export const TOUR_BOKUN_READINESS_KEY = ["tour_bokun_readiness"] as const;

export async function fetchTourBokunReadiness(): Promise<
  Record<string, TourBokunReadiness>
> {
  const { data, error } = await supabase
    .from("tour_price_tiers")
    .select(
      "tour_id, bokun_categories, pricing_mode, banded_pricing_enabled, synced_from_bokun_at",
    );
  if (error) throw error;
  const out: Record<string, TourBokunReadiness> = {};
  for (const row of data ?? []) {
    out[row.tour_id] = {
      tourId: row.tour_id,
      bandedPricingEnabled: !!row.banded_pricing_enabled,
      bokunCategories:
        (row.bokun_categories as MappedBokunPricingCategory[] | null) ?? [],
      pricingMode: (row.pricing_mode as PricingMode | null) ?? null,
      syncedAt: (row.synced_from_bokun_at as string | null) ?? null,
    };
  }
  return out;
}

export function useTourBokunReadiness() {
  return useQuery({
    queryKey: TOUR_BOKUN_READINESS_KEY,
    queryFn: fetchTourBokunReadiness,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}

export function useTourBokunReadinessFor(tourId: string) {
  const q = useTourBokunReadiness();
  return { ...q, readiness: q.data?.[tourId] };
}
