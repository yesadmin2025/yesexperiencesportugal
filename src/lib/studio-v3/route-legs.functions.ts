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
 * The client closes Studio reveal routes door-to-door by appending the
 * pickup/drop-off origin as the final point. The schema therefore allows one
 * extra waypoint for that explicit return leg.
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
  stops: z.array(ptSchema).min(2).max(13),
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

/**
 * Sanity guard for day-tour legs.
 *
 * When OSRM returns a leg distance that is > 3× the straight-line
 * haversine between the two stops, we treat the OSRM reading as
 * corrupt/stale (bad geocode, wrong-side-of-country routing, cached row
 * against a superseded coord) and fall back to a haversine-driven
 * estimate for THAT leg. This prevented the observed
 * "Sintra → Park of Pena · 155 min · 187.8 km" ghost leg from ever
 * reaching the reveal.
 *
 * We do NOT hide the leg — a day-tour still needs a distance to render —
 * but the number is now geographically defensible.
 */
const OSRM_SANITY_FACTOR = 3;
/** Hard ceiling for any single leg in a day tour. Portugal N–S is ~600 km;
 *  a single day-tour leg over 250 km is almost certainly a bug. */
const MAX_SINGLE_LEG_KM = 250;

function haversineDriveMinutes(km: number): number {
  return Math.max(1, Math.round(((km * 1.12) / 55) * 60));
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
      let sanityFallbacks = 0;
      for (let i = 0; i < legs.length; i++) {
        const l = legs[i];
        const a = data.stops[i];
        const b = data.stops[i + 1];
        const hav = haversineKm(a, b);
        let km = Number(l.distance_km) || 0;
        let driveMin = l.drive_minutes;

        // Defense-in-depth: if OSRM reported an implausible leg, drop it and
        // rely on haversine. Both conditions are conservative — legitimate
        // road detours rarely exceed 2×, let alone 3× haversine.
        const looksWrong = km > MAX_SINGLE_LEG_KM || (hav > 0.2 && km > hav * OSRM_SANITY_FACTOR);
        if (looksWrong) {
          km = hav;
          driveMin = haversineDriveMinutes(hav);
          sanityFallbacks += 1;

          console.warn("[studio-v3 route-legs] sanity fallback", {
            osrmKm: Number(l.distance_km),
            haversineKm: +hav.toFixed(2),
            a,
            b,
          });
        }

        legDistancesKm.push(+km.toFixed(2));
        if (km <= WALKING_THRESHOLD_KM) {
          legModes.push("walking");
          legMinutes.push(Math.max(1, Math.round((km / WALKING_KMH) * 60)));
        } else {
          legModes.push("driving");
          legMinutes.push(driveMin);
        }
      }
      const providers = new Set(legs.map((l) => l.provider));
      const provider: RouteLegMinutes["provider"] =
        sanityFallbacks > 0
          ? "mixed"
          : providers.size === 1
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
          legMinutes.push(haversineDriveMinutes(km));
        }
      }
      return { legMinutes, legDistancesKm, legModes, provider: "haversine" };
    }
  });
