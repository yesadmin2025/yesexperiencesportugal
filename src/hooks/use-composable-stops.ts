/**
 * Loads the owner-maintained composable-stop price list and publishes it to
 * the pure runtime authority used by the Studio composer.
 *
 * Public reads are RLS-narrowed to rows that are BOTH active and priced, so a
 * stop the owner has not priced yet can never reach a traveller.
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  setComposableStopAuthority,
  type ComposablePricingUnit,
  type ComposableStopRow,
} from "@/lib/studio-v3/composableStopAuthority";

export const COMPOSABLE_STOPS_QUERY_KEY = ["studio-composable-stops"] as const;

export async function fetchComposableStops(): Promise<ComposableStopRow[]> {
  const { data, error } = await supabase
    .from("studio_composable_stops")
    .select("stop_id, region, price_cents, pricing_unit, min_guests, active, notes");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    stopId: row.stop_id,
    region: row.region,
    priceCents: row.price_cents,
    pricingUnit: row.pricing_unit as ComposablePricingUnit,
    minGuests: row.min_guests,
    active: row.active,
    notes: row.notes,
  }));
}

export function useComposableStops() {
  const query = useQuery({
    queryKey: COMPOSABLE_STOPS_QUERY_KEY,
    queryFn: fetchComposableStops,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) setComposableStopAuthority(query.data);
  }, [query.data]);

  return query;
}
