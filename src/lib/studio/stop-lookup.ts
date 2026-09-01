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
 * Find the catalog stop that matches a free-text label.
 *
 * GEO AUTHORITY RULE: only EXACT normalized identity, or a full-phrase
 * containment where the shorter side is a complete catalog/label phrase, may
 * resolve a coordinate. Token-level ("first significant word") matching was
 * removed: it is not an authority, and it previously resolved
 * "Parque Natural da Arrábida" onto the Costa Vicentina and a Sado ferry
 * boarding point onto Mercado do Livramento — silently corrupting drive
 * times, route legs and the door-to-door budget.
 *
 * Returns null when nothing is provably the same place. Callers MUST degrade
 * (reject the candidate, fall back to structural inventory coordinates)
 * rather than plot a guess.
 */
export function lookupStopGeo(label: string): StopGeo | null {
  if (!label) return null;
  const key = norm(label.split(/[—–-]/)[0].split(",")[0]);
  if (!key) return null;
  // 1) exact structural identity
  const exact = INDEX.find((e) => e.key === key);
  if (exact) return toGeo(exact.stop);
  // 2) whole-phrase containment on word boundaries, longest catalog key wins.
  //    A catalog name must appear in full inside the label (or vice versa) —
  //    never a partial word, never a single shared token.
  const contained = INDEX.filter(
    (e) => e.key.length >= 6 && (containsPhrase(key, e.key) || containsPhrase(e.key, key)),
  ).sort((a, b) => b.key.length - a.key.length);
  if (contained.length) return toGeo(contained[0].stop);
  return null;
}

/** True when `needle` occurs in `haystack` as a complete word sequence. */
function containsPhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const at = haystack.indexOf(needle);
  if (at < 0) return false;
  const before = at === 0 ? " " : haystack[at - 1];
  const afterIdx = at + needle.length;
  const after = afterIdx >= haystack.length ? " " : haystack[afterIdx];
  return before === " " && after === " ";
}

function toGeo(s: RegionStop): StopGeo {
  return { lat: s.coords.lat, lng: s.coords.lng, dwellMin: s.dwellMin, kind: s.kind };
}
