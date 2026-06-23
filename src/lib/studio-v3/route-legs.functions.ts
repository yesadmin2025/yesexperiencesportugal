/**
 * Studio V3 — real driving leg minutes for the reveal map.
 *
 * Server-only thin wrapper around `resolveLegs` from studio-v2 routing.
 * Takes the ordered route (origin first, then each stop) as a list of
 * keyed coordinates and returns the parallel array of drive minutes,
 * one entry per leg between consecutive points.
 *
 * Always returns the same number of legs as `stops.length - 1`. Falls
 * back to a haversine estimate if OSRM is unreachable; never throws.
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

export interface RouteLegMinutes {
  /** `drive_minutes` per leg, parallel to `stops` with length `stops.length - 1`. */
  legMinutes: number[];
  /** `osrm` when at least one leg came from OSRM, else `haversine`. */
  provider: "osrm" | "haversine" | "mixed";
}

export const getStudioV3RouteLegs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<RouteLegMinutes> => {
    const { resolveLegs } = await import("@/lib/studio-v2/routing.server");
    try {
      const legs = await resolveLegs(data.stops);
      const legMinutes = legs.map((l) => l.drive_minutes);
      const providers = new Set(legs.map((l) => l.provider));
      const provider: RouteLegMinutes["provider"] =
        providers.size === 1
          ? ((providers.values().next().value as string) === "osrm" ? "osrm" : "haversine")
          : "mixed";
      return { legMinutes, provider };
    } catch {
      // Last-resort haversine fallback so the UI never breaks.
      const legMinutes: number[] = [];
      for (let i = 1; i < data.stops.length; i++) {
        const a = data.stops[i - 1];
        const b = data.stops[i];
        const R = 6371;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const h =
          Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        const km = 2 * R * Math.asin(Math.sqrt(h));
        legMinutes.push(Math.max(1, Math.round(((km * 1.12) / 55) * 60)));
      }
      return { legMinutes, provider: "haversine" };
    }
  });
