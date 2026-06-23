/**
 * useRouteLegMinutes — fetch real OSRM-backed drive minutes for a
 * Studio V3 reveal route (origin + ordered stops). Falls back silently
 * to whatever the caller already had (haversine at the SignatureMap
 * level) when the server is unreachable or while loading.
 *
 * Cache key is built from rounded coords + stop count so the query
 * never re-fetches just because object identity changed.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStudioV3RouteLegs } from "@/lib/studio-v3/route-legs.functions";

export interface RouteLegStop {
  key: string;
  lat: number;
  lng: number;
}

export function useRouteLegMinutes(
  stops: ReadonlyArray<RouteLegStop> | null | undefined,
  enabled = true,
): { legMinutes: number[] | null; isLoading: boolean } {
  const call = useServerFn(getStudioV3RouteLegs);

  // Stable, rounded cache key — five-decimal coords (~1m) match the OSRM cache.
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
    retry: 1,
  });

  return {
    legMinutes: q.data?.legMinutes ?? null,
    isLoading: q.isLoading,
  };
}
