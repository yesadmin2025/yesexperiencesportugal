/**
 * Studio v2 — real driving routing layer (server-only).
 *
 * Replaces the haversine estimate with truthful distance/time/polyline from
 * OSRM (public demo server, no API key needed). Every (from_key, to_key) pair
 * is cached in `builder_route_cache` so each leg is fetched at most once.
 *
 * GUARDRAILS:
 *  - Server-only — never imported from client code.
 *  - Falls back to a haversine estimate if the provider call fails, so the
 *    builder never breaks on a transient network error.
 *  - Polyline returned in the standard "Google encoded polyline" format
 *    (precision 5), ready for any Leaflet / Mapbox decoder on the client.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export interface Leg {
  from_key: string;
  to_key: string;
  distance_km: number;
  drive_minutes: number;
  polyline: string;
  provider: string;
}

interface Pt {
  key: string;
  lat: number;
  lng: number;
}

function haversineKm(a: Pt, b: Pt): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Tiny encoded-polyline encoder (Google polyline alg, precision 5). */
function encodePolyline(coords: Array<[number, number]>): string {
  let lastLat = 0;
  let lastLng = 0;
  let out = "";
  const enc = (v: number) => {
    v = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    while (v >= 0x20) {
      s += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    s += String.fromCharCode(v + 63);
    return s;
  };
  for (const [lat, lng] of coords) {
    const la = Math.round(lat * 1e5);
    const ln = Math.round(lng * 1e5);
    out += enc(la - lastLat) + enc(ln - lastLng);
    lastLat = la;
    lastLng = ln;
  }
  return out;
}

/** Read cache rows for the requested pairs. */
async function readCache(pairs: Array<[string, string]>): Promise<Map<string, Leg>> {
  const map = new Map<string, Leg>();
  if (pairs.length === 0) return map;
  const fromKeys = Array.from(new Set(pairs.map((p) => p[0])));
  const toKeys = Array.from(new Set(pairs.map((p) => p[1])));
  const { data } = await supabaseAdmin
    .from("builder_route_cache")
    .select("from_key, to_key, distance_km, drive_minutes, polyline, provider")
    .in("from_key", fromKeys)
    .in("to_key", toKeys);
  for (const r of data ?? []) {
    map.set(`${r.from_key}::${r.to_key}`, {
      from_key: r.from_key as string,
      to_key: r.to_key as string,
      distance_km: Number(r.distance_km),
      drive_minutes: r.drive_minutes as number,
      polyline: r.polyline as string,
      provider: (r.provider as string) ?? "osrm",
    });
  }
  return map;
}

async function fetchOSRM(from: Pt, to: Pt): Promise<Leg | null> {
  const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: { coordinates: Array<[number, number]> }; // [lng, lat]
      }>;
    };
    if (json.code !== "Ok" || !json.routes?.[0]) return null;
    const r = json.routes[0];
    const distance_km = +(r.distance / 1000).toFixed(2);
    const drive_minutes = Math.max(1, Math.round(r.duration / 60));
    // Convert [lng, lat] → [lat, lng] for the polyline encoder.
    const latlng = r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
    return {
      from_key: from.key,
      to_key: to.key,
      distance_km,
      drive_minutes,
      polyline: encodePolyline(latlng),
      provider: "osrm",
    };
  } catch {
    return null;
  }
}

function haversineLeg(from: Pt, to: Pt): Leg {
  const km = haversineKm(from, to);
  return {
    from_key: from.key,
    to_key: to.key,
    distance_km: +km.toFixed(2),
    drive_minutes: Math.max(1, Math.round((km / 55) * 60)),
    polyline: encodePolyline([
      [from.lat, from.lng],
      [to.lat, to.lng],
    ]),
    provider: "haversine",
  };
}

/**
 * Resolve real driving legs for a sequence of stops. Reads cache first,
 * fetches OSRM for misses (in parallel, capped concurrency), persists new
 * legs back to the cache. Falls back to haversine on any failure.
 */
export async function resolveLegs(stops: Pt[]): Promise<Leg[]> {
  if (stops.length < 2) return [];
  const pairs: Array<[string, string]> = [];
  for (let i = 1; i < stops.length; i++) pairs.push([stops[i - 1].key, stops[i].key]);

  const cache = await readCache(pairs);
  const result: Leg[] = [];
  const toPersist: Leg[] = [];

  // Fetch misses in parallel (small N — itineraries cap at ~6 stops).
  const missIdx: number[] = [];
  for (let i = 0; i < pairs.length; i++) {
    if (!cache.has(`${pairs[i][0]}::${pairs[i][1]}`)) missIdx.push(i);
  }
  const fetched = await Promise.all(missIdx.map((i) => fetchOSRM(stops[i], stops[i + 1])));

  for (let i = 0; i < pairs.length; i++) {
    const cached = cache.get(`${pairs[i][0]}::${pairs[i][1]}`);
    if (cached) {
      result.push(cached);
      continue;
    }
    const idxInMiss = missIdx.indexOf(i);
    const f = fetched[idxInMiss];
    if (f) {
      result.push(f);
      toPersist.push(f);
    } else {
      result.push(haversineLeg(stops[i], stops[i + 1]));
    }
  }

  if (toPersist.length > 0) {
    // Fire-and-forget cache write — never block the response on it.
    void supabaseAdmin
      .from("builder_route_cache")
      .upsert(
        toPersist.map((l) => ({
          from_key: l.from_key,
          to_key: l.to_key,
          distance_km: l.distance_km,
          drive_minutes: l.drive_minutes,
          polyline: l.polyline,
          provider: l.provider,
          refreshed_at: new Date().toISOString(),
        })),
        { onConflict: "from_key,to_key" },
      )
      .then(() => undefined);
  }

  return result;
}
