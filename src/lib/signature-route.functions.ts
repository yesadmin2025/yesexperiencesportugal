/**
 * Signature tour route resolver — server fn.
 *
 * Given a signature tour id, resolves the ordered stops to real lat/lng
 * (via curated stopGeo lookup) and calls the existing OSRM routing layer
 * to return per-leg driving distance / minutes / encoded polyline.
 *
 * Public read-only endpoint, safe for SSR/prerender. Cached inside
 * `builder_route_cache` via `resolveLegs`.
 *
 * Content policy: this fn returns only geography (label + coords) and
 * real routing metrics. It never attaches invented operational notes
 * (arrival windows, transit claims, on-site duration). Stops must
 * mirror the matching Viator source page.
 */

import { createServerFn } from "@tanstack/react-start";
import { findTour } from "@/data/signatureTours";
import { lookupStop } from "@/data/stopGeo";

export interface SignatureRouteStop {
  label: string;
  lat: number;
  lng: number;
}

export interface SignatureRouteLeg {
  fromLabel: string;
  toLabel: string;
  distanceKm: number;
  driveMinutes: number;
  polyline: string;
  provider: string;
}

export interface SignatureRoutePayload {
  stops: SignatureRouteStop[];
  legs: SignatureRouteLeg[];
}

export const getSignatureTourRoute = createServerFn({ method: "GET" })
  .inputValidator((input: { tourId: string }) => {
    if (!input || typeof input.tourId !== "string" || input.tourId.length > 128) {
      throw new Error("invalid tourId");
    }
    return input;
  })
  .handler(async ({ data }): Promise<SignatureRoutePayload> => {
    const tour = findTour(data.tourId);
    if (!tour) return { stops: [], legs: [] };

    const seen = new Set<string>();
    const stops: SignatureRouteStop[] = [];
    for (const s of tour.stops ?? []) {
      const hit = lookupStop(s.label);
      if (!hit) continue;
      const key = `${hit.lat.toFixed(4)},${hit.lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      stops.push({ label: s.label, lat: hit.lat, lng: hit.lng });
    }

    if (stops.length < 2) return { stops, legs: [] };

    // Dynamic import — routing.server.ts must not ship to client bundle.
    const { resolveLegs } = await import("@/lib/studio-v2/routing.server");
    const legsRaw = await resolveLegs(
      stops.map((s, i) => ({ key: `${data.tourId}:${i}`, lat: s.lat, lng: s.lng })),
    );

    const legs: SignatureRouteLeg[] = legsRaw.map((l, i) => ({
      fromLabel: stops[i].label,
      toLabel: stops[i + 1].label,
      distanceKm: l.distance_km,
      driveMinutes: l.drive_minutes,
      polyline: l.polyline,
      provider: l.provider,
    }));

    return { stops, legs };
  });
