/**
 * Itinerary view helpers — pure functions shared by the online itinerary
 * page (`/itinerary`), its map and its unit tests.
 *
 * Content policy: nothing here invents a stop, a coordinate or a time. Stop
 * labels come from the frozen booking snapshot; coordinates come from the
 * curated `stopGeo` gazetteer only. A label we cannot place stays in the
 * written list and is simply absent from the map.
 */

import { lookupStop } from "@/data/stopGeo";

export interface ItineraryViewStop {
  /** 1-based position as printed in the list, the PDF and the emails. */
  order: number;
  label: string;
  note?: string | null;
}

export interface ItineraryGeoStop extends ItineraryViewStop {
  lat: number;
  lng: number;
}

/** Lowercase, accent-stripped, whitespace-collapsed — "Tróia" → "troia". */
export function foldForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable DOM id / hash fragment for a stop, used by deep links. */
export function stopAnchorId(order: number): string {
  return `stop-${order}`;
}

/** Parses `#stop-3` (any casing) into the stop order, or null. */
export function parseStopAnchor(hash: string | null | undefined): number | null {
  if (!hash) return null;
  const m = /^#?stop-(\d{1,3})$/i.exec(hash.trim());
  if (!m) return null;
  const order = Number(m[1]);
  return Number.isFinite(order) && order > 0 ? order : null;
}

/**
 * Accent- and case-insensitive filter over stop names and their notes.
 * An empty query returns every stop, in order.
 */
export function filterItineraryStops<T extends ItineraryViewStop>(stops: T[], query: string): T[] {
  const q = foldForSearch(query);
  if (!q) return stops;
  return stops.filter((stop) => {
    const haystack = foldForSearch(`${stop.label} ${stop.note ?? ""}`);
    return haystack.includes(q);
  });
}

/**
 * Resolves snapshot stops to real coordinates via the curated gazetteer.
 * Order is preserved and the printed number is carried through, so pin 3
 * is always stop 3 — even when stop 2 could not be placed.
 */
export function resolveItineraryGeoStops<T extends ItineraryViewStop>(stops: T[]): ItineraryGeoStop[] {
  const out: ItineraryGeoStop[] = [];
  const seen = new Set<string>();
  for (const stop of stops) {
    const hit = lookupStop(stop.label);
    if (!hit) continue;
    const key = `${hit.lat.toFixed(4)},${hit.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...stop, lat: hit.lat, lng: hit.lng });
  }
  return out;
}

/** Stop numbers present in the list but absent from the map. */
export function unmappedStops<T extends ItineraryViewStop>(
  stops: T[],
  geoStops: ItineraryGeoStop[],
): T[] {
  const placed = new Set(geoStops.map((s) => s.order));
  return stops.filter((s) => !placed.has(s.order));
}

/**
 * True when a routed Signature payload describes exactly the same places,
 * in the same order, as the snapshot stops we placed on the map. Only then
 * may we draw its real driving legs — otherwise the geometry would belong
 * to a different day.
 */
export function routeMatchesStops(
  routeLabels: readonly string[],
  geoStops: readonly ItineraryGeoStop[],
): boolean {
  if (routeLabels.length < 2 || routeLabels.length !== geoStops.length) return false;
  return routeLabels.every((label, i) => foldForSearch(label) === foldForSearch(geoStops[i].label));
}

/** Plain-language description of the route, for screen readers. */
export function describeRoute(geoStops: readonly ItineraryGeoStop[]): string {
  if (geoStops.length === 0) return "Map of your day. No stop could be placed on the map.";
  const names = geoStops.map((s) => `${s.order}. ${s.label}`).join(", then ");
  return `Map of your day, in order: ${names}.`;
}
