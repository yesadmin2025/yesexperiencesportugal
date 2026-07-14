/**
 * Studio V3 — real driving leg minutes + distances + travel mode for the
 * reveal map. Server-only thin wrapper around `resolveLegs` from
 * studio-v2 routing.
 *
 * Returns three parallel arrays with `stops.length - 1` entries:
 *   - `legMinutes`     driving minutes per leg
 *   - `legDistancesKm` road distance per leg (haversine when OSRM misses)
 *   - `legModes`       "walking" for legs < 0.4km, else "driving"
 *
 * OSRM outages fall back to haversine gracefully — never throws.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ptSchema = z.object({
  key: z.string().trim().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const inputSchema = z.object({
  stops: z.array(ptSchema).min(2).max(12),
});

export type RouteLegMode = "driving" | "walking";

export interface RouteLegMinutes {
  legMinutes: number[];
  legDistancesKm: number[];
  legModes: RouteLegMode[];
  provider: "osrm" | "haversine" | "mixed";
}

const WALKING_THRESHOLD_KM = 0.4;
const WALKING_KMH = 4.8;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const getStudioV3RouteLegs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<RouteLegMinutes> => {
    const { resolveLegs } = await import("@/lib/studio-v2/routing.server");
    try {
      const legs = await resolveLegs(data.stops);
      const legMinutes: number[] = [];
      const legDistancesKm: number[] = [];
      const legModes: RouteLegMode[] = [];
      for (const l of legs) {
        const km = Number(l.distance_km) || 0;
        legDistancesKm.push(+km.toFixed(2));
        if (km <= WALKING_THRESHOLD_KM) {
          legModes.push("walking");
          legMinutes.push(Math.max(1, Math.round((km / WALKING_KMH) * 60)));
        } else {
          legModes.push("driving");
          legMinutes.push(l.drive_minutes);
        }
      }
      const providers = new Set(legs.map((l) => l.provider));
      const provider: RouteLegMinutes["provider"] =
        providers.size === 1
          ? (providers.values().next().value as string) === "osrm"
            ? "osrm"
            : "haversine"
          : "mixed";
      return { legMinutes, legDistancesKm, legModes, provider };
    } catch {
      const legMinutes: number[] = [];
      const legDistancesKm: number[] = [];
      const legModes: RouteLegMode[] = [];
      for (let i = 1; i < data.stops.length; i++) {
        const km = haversineKm(data.stops[i - 1], data.stops[i]);
        legDistancesKm.push(+km.toFixed(2));
        if (km <= WALKING_THRESHOLD_KM) {
          legModes.push("walking");
          legMinutes.push(Math.max(1, Math.round((km / WALKING_KMH) * 60)));
        } else {
          legModes.push("driving");
          legMinutes.push(Math.max(1, Math.round(((km * 1.12) / 55) * 60)));
        }
      }
      return { legMinutes, legDistancesKm, legModes, provider: "haversine" };
    }
  });
