// Lookup real stop coordinates + dwell time by label.
//
// Used by the Studio V3 cinematic map to switch from schematic projection
// to true geographic projection whenever a tour's labels match the
// region-stop catalog. We NEVER invent coords — if no match, we return
// null and the map falls back to its schematic S-curve layout.

import { REGION_STOPS, type RegionStop, type StopKind } from "@/data/regionStops";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface StopGeo {
  lat: number;
  lng: number;
  dwellMin: number;
  kind: StopKind;
}

const INDEX: Array<{ key: string; stop: RegionStop }> = REGION_STOPS.map((s) => ({
  key: norm(s.name),
  stop: s,
}));

/**
 * Find the catalog stop that best matches a free-text label.
 * Strategy: exact normalized match → containment match → first-word match.
 * Returns null when nothing is safe enough — callers must degrade gracefully.
 */
export function lookupStopGeo(label: string): StopGeo | null {
  if (!label) return null;
  const key = norm(label.split(/[—–-]/)[0].split(",")[0]);
  if (!key) return null;
  // 1) exact
  const exact = INDEX.find((e) => e.key === key);
  if (exact) return toGeo(exact.stop);
  // 2) bidirectional containment of ≥4 chars
  const contains = INDEX.find(
    (e) => (key.length >= 4 && e.key.includes(key)) || (e.key.length >= 4 && key.includes(e.key)),
  );
  if (contains) return toGeo(contains.stop);
  // 3) first significant word match
  const firstWord = key.split(" ").find((w) => w.length >= 5);
  if (firstWord) {
    const hit = INDEX.find((e) => e.key.split(" ").some((w) => w === firstWord));
    if (hit) return toGeo(hit.stop);
  }
  return null;
}

function toGeo(s: RegionStop): StopGeo {
  return { lat: s.coords.lat, lng: s.coords.lng, dwellMin: s.dwellMin, kind: s.kind };
}
