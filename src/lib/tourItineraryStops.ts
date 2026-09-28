/**
 * Single source of truth for the PUBLIC itinerary stop list of a Signature
 * experience — the same ordered list the tour page renders under
 * "Your day, stop by stop", and the same list the photo admin offers when
 * assigning an uploaded photo to a stop.
 *
 * Truth order (unchanged from the tour page's original inline logic):
 *   1. Viator-verified Source of Truth itinerary (pass-bys excluded)
 *   2. Tailor blueprint, projected to editorial chapters
 *   3. Raw Viator stops (pass-bys excluded)
 *   4. Internal tour.stops — last resort
 *
 * Pure. No invented stops, no invented copy.
 */

import { findTour, type SignatureTour } from "@/data/signatureTours";
import { getViatorMeta, type ViatorMeta } from "@/data/signatureToursViator";
import { toEditorialChapters } from "@/lib/tailor-chapters";
import { projectPublicSotItinerary } from "@/lib/publicItineraryProjection";
import { lookupStop } from "@/data/stopGeo";
import { resolveStopCoord } from "@/data/stopCoords";

export type PublicItineraryStop = {
  label: string;
  story?: string;
  optional?: boolean;
  /** Verified time spent at the stop, when the Source of Truth states it. */
  durationMinutes?: number | null;
};

export function publicItineraryStops(
  tour: SignatureTour,
  meta?: ViatorMeta,
): PublicItineraryStop[] {
  const sot = projectPublicSotItinerary(tour.id) ?? [];
  const fromSot = sot
    .filter((c) => c.stopType !== "pass-by")
    .map((c) => ({
      label: c.label,
      story: c.description,
      optional: c.optional,
      durationMinutes: c.durationMinutes,
    }));
  if (fromSot.length > 0) return fromSot;

  const fromBlueprint = toEditorialChapters(tour.id);
  if (fromBlueprint && fromBlueprint.length > 0) {
    return fromBlueprint.map((c) => ({
      label: c.label,
      story: c.story,
      optional: c.optional,
    }));
  }

  const viator = meta?.stops?.filter((s) => !s.passBy) ?? [];
  if (viator.length > 0) return viator.map((s) => ({ label: s.name, story: s.desc }));

  return (tour.stops ?? []).map((s) => ({ label: s.label, story: s.story }));
}

/** Convenience for surfaces that only hold a tour id (the photo admin). */
export function publicItineraryStopsById(tourId: string): PublicItineraryStop[] {
  const tour = findTour(tourId);
  if (!tour) return [];
  return publicItineraryStops(tour, getViatorMeta(tourId));
}

/* ── Geography for the editorial route glance ───────────────────── */

export type RouteGlancePoint = {
  label: string;
  lat: number;
  lng: number;
  /** Schematic viewBox coordinates when the curated lookup has them. */
  x?: number;
  y?: number;
};

/**
 * Resolve the itinerary stops to real coordinates for the schematic route
 * map. A stop with no verified coordinate is simply dropped — the map never
 * guesses a location.
 */
export function routeGlancePoints(stops: PublicItineraryStop[]): RouteGlancePoint[] {
  const out: RouteGlancePoint[] = [];
  const seen = new Set<string>();
  for (const s of stops) {
    const geo = lookupStop(s.label);
    if (!geo) continue;
    const key = `${geo.lat.toFixed(4)},${geo.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const schematic = resolveStopCoord(s.label);
    out.push({
      label: s.label,
      lat: geo.lat,
      lng: geo.lng,
      ...(schematic ? { x: schematic.x, y: schematic.y } : {}),
    });
  }
  return out;
}
