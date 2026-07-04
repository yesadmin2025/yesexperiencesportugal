/**
 * useRouteLegMinutes — real OSRM-backed drive minutes + distances + travel
 * mode per leg for a Studio V3 reveal route (origin + ordered stops).
 *
 * Improvements:
 *  - Exponential-backoff retry (up to 3 attempts, 400ms base, jitter) so a
 *    transient OSRM blip doesn't kill the whole map.
 *  - `placeholderData` keeps the previous resolved legs on screen while a
 *    new key is being fetched — no flicker when the user edits stops.
 *  - Returns `legDistancesKm` and `legModes` ("driving" | "walking") so
 *    the reveal legend can label each hop honestly. A leg under 400m is
 *    surfaced as "walking" since that's what actually happens on the ground.
 *
 * Cache key is built from rounded coords + ordered stop count so we don't
 * re-fetch on unrelated object-identity changes. Server-side, every pair
 * hits the `builder_route_cache` — this hook layers a fresh in-memory
 * result cache on top for the current tab session.
 */

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStudioV3RouteLegs } from "@/lib/studio-v3/route-legs.functions";

export interface RouteLegStop {
  key: string;
  lat: number;
  lng: number;
}

export type RouteLegMode = "driving" | "walking";

export interface RouteLegsResult {
  legMinutes: number[] | null;
  legDistancesKm: number[] | null;
  legModes: RouteLegMode[] | null;
  isLoading: boolean;
  isError: boolean;
}

export function useRouteLegMinutes(
  stops: ReadonlyArray<RouteLegStop> | null | undefined,
  enabled = true,
): RouteLegsResult {
  const call = useServerFn(getStudioV3RouteLegs);

  const safeStops = useMemo(
    () =>
      (stops ?? []).filter(
        (s): s is RouteLegStop =>
          !!s && Number.isFinite(s.lat) && Number.isFinite(s.lng) && !!s.key,
      ),
    [stops],
  );
  const queryKey = useMemo(
    () => [
      "studio-v3-route-legs",
      safeStops.map((s) => `${s.key}:${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join("|"),
    ],
    [safeStops],
  );

  const isReady = enabled && safeStops.length >= 2;
  const q = useQuery({
    queryKey,
    queryFn: () => call({ data: { stops: safeStops as RouteLegStop[] } }),
    enabled: isReady,
    staleTime: 1000 * 60 * 60, // 1h — legs barely change
    gcTime: 1000 * 60 * 60 * 4,
    retry: 3,
    retryDelay: (attempt) =>
      Math.min(4000, 400 * 2 ** attempt) + Math.round(Math.random() * 120),
    // Keep the previous route visible during a refetch triggered by an edit,
    // so the map/legend don't collapse to loading state mid-interaction.
    placeholderData: keepPreviousData,
  });

  return {
    legMinutes: q.data?.legMinutes ?? null,
    legDistancesKm: q.data?.legDistancesKm ?? null,
    legModes: (q.data?.legModes as RouteLegMode[] | undefined) ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
  };
}
