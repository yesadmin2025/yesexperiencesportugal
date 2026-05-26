/**
 * Studio v2 — itinerary composition (server-only helpers).
 *
 * Pure scoring + routing logic over rows fetched from `builder_stops`.
 * No Supabase imports here — the server fn loads rows once and passes them
 * in, so this file stays trivially testable.
 *
 * GUARDRAILS:
 *   - Only real stops from `builder_stops` (with `source_tour_keys` proof).
 *   - Never invents stops, blurbs, durations, or coordinates.
 *   - Respects `builder_routing_rules` caps when provided.
 */

import type { TravelerProfile, PriorityKey } from "./profile";

export interface DbStop {
  key: string;
  region_key: string;
  label: string;
  blurb: string | null;
  tag: string | null;
  lat: number;
  lng: number;
  duration_minutes: number;
  mood_tags: string[];
  pace_tags: string[];
  intention_tags: string[];
  who_tags: string[];
  weight: number;
  source_tour_keys: string[];
}

export interface RoutingCaps {
  minStops: number;
  maxStops: number;
  maxKmBetweenStops: number;
  maxTotalKmPerDay: number;
  maxDrivingHours: number;
  maxExperienceHours: number;
}

export const DEFAULT_CAPS: RoutingCaps = {
  minStops: 3,
  maxStops: 6,
  maxKmBetweenStops: 60,
  maxTotalKmPerDay: 250,
  maxDrivingHours: 3,
  maxExperienceHours: 8,
};

/** Engine region key → list of builder_stops region_keys that satisfy it. */
const REGION_MAP: Record<string, string[]> = {
  arrabida:        ["arrabida-setubal", "troia-comporta"],
  "lisbon-coast":  ["lisbon", "sintra-cascais"],
  alentejo:        ["alentejo", "evora-alentejo"],
  centro:          ["centro-tomar-coimbra", "centro-fatima-nazare-obidos"],
};

export function dbRegionsFor(engineRegion: string): string[] {
  return REGION_MAP[engineRegion] ?? [engineRegion];
}

/** Map studio intent → intention_tags we look for. Hardcoded but conservative;
 * no fabrication — tags come from the actual DB taxonomy. */
const INTENT_TAGS: Record<string, string[]> = {
  relaxed_scenic:     ["scenic", "nature", "viewpoint"],
  elegant_cultural:   ["cultural", "heritage", "art"],
  food_local:         ["food", "wine", "tasting", "gastronomy"],
  social_celebratory: ["celebration", "social", "tasting"],
  romantic_intimate:  ["romantic", "intimate", "sunset"],
  coastal_cinematic:  ["coastal", "beach", "viewpoint", "scenic"],
};

const PRIORITY_TO_MOOD: Record<PriorityKey | string, string[]> = {
  food:     ["food", "wine", "gastronomy", "tasting"],
  culture:  ["cultural", "heritage", "art"],
  coastal:  ["coastal", "beach", "sea"],
  wellness: ["wellness", "nature", "calm"],
  social:   ["social", "celebration"],
};

const PACE_TAG: Record<string, string> = {
  light:    "slow",
  balanced: "balanced",
  rich:     "rich",
  full:     "full",
};

function tagOverlap(a: readonly string[] | null, b: readonly string[]): number {
  if (!a || a.length === 0) return 0;
  let n = 0;
  for (const t of b) if (a.includes(t)) n++;
  return n;
}

/** Score a stop against a traveller profile (higher = better fit). */
export function scoreStop(stop: DbStop, profile: TravelerProfile): number {
  let s = stop.weight ?? 50;

  // Intent — high weight (this is the atmosphere the traveller chose).
  if (profile.intent) {
    const wanted = INTENT_TAGS[profile.intent] ?? [];
    s += tagOverlap(stop.intention_tags, wanted) * 22;
    s += tagOverlap(stop.mood_tags,      wanted) * 8;
  }

  // Priority weights — pull route toward what they care about.
  for (const [key, weight] of Object.entries(profile.priorityWeights ?? {})) {
    if (!weight) continue;
    const moods = PRIORITY_TO_MOOD[key] ?? [];
    s += tagOverlap(stop.mood_tags, moods) * (10 * Math.max(0, Math.min(1, weight)));
  }

  // Pace — small alignment bonus.
  const pTag = profile.pace ? PACE_TAG[profile.pace] : undefined;
  if (pTag && stop.pace_tags?.includes(pTag)) s += 6;

  // Group fit (couples / family / friends).
  const g = profile.group;
  if (g) {
    if (g.children > 0 && stop.who_tags?.includes("family")) s += 8;
    if (g.adults === 2 && g.children === 0 && stop.who_tags?.includes("couples")) s += 6;
    if (g.adults >= 4 && stop.who_tags?.includes("friends")) s += 4;
  }

  return s;
}

/** Haversine distance in km between two lat/lng. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Convert km to estimated drive minutes (assumes ~55 km/h rural Portuguese roads). */
export function driveMinutes(km: number): number {
  return Math.round((km / 55) * 60);
}

export interface ComposedItinerary {
  stops: Array<{
    key: string;
    region_key: string;
    label: string;
    blurb: string | null;
    tag: string | null;
    lat: number;
    lng: number;
    duration_minutes: number;
    driveMinutesFromPrev: number;
    source_tour_keys: string[];
    score: number;
  }>;
  totalDriveMin: number;
  totalExperienceMin: number;
  totalKm: number;
  feasible: boolean;
  warnings: string[];
}

/**
 * Compose an itinerary from a pool of real DB stops, respecting routing caps.
 *
 * Algorithm:
 *   1. Score every candidate against the profile.
 *   2. Pick the highest-scoring stop as the seed.
 *   3. Greedily add the next best stop balancing score and proximity
 *      (penalise distance to keep the day driveable).
 *   4. Stop when targetCount reached, or when adding the next stop would
 *      violate routing caps.
 *   5. Order final list by nearest-neighbour from the seed for a sensible
 *      driving sequence.
 */
export function composeItinerary(
  pool: DbStop[],
  profile: TravelerProfile,
  targetCount: number,
  caps: RoutingCaps = DEFAULT_CAPS,
): ComposedItinerary {
  const warnings: string[] = [];
  if (pool.length === 0) {
    return {
      stops: [],
      totalDriveMin: 0,
      totalExperienceMin: 0,
      totalKm: 0,
      feasible: false,
      warnings: ["No active stops available for this region yet."],
    };
  }

  const scored = pool
    .map((s) => ({ stop: s, score: scoreStop(s, profile) }))
    .sort((a, b) => b.score - a.score);

  const want = Math.max(caps.minStops, Math.min(caps.maxStops, targetCount));
  const chosen: typeof scored = [];
  chosen.push(scored[0]);

  while (chosen.length < want && chosen.length < scored.length) {
    const last = chosen[chosen.length - 1].stop;
    // Re-rank remaining candidates: score minus distance penalty.
    const remaining = scored.filter((c) => !chosen.includes(c));
    if (remaining.length === 0) break;
    const ranked = remaining
      .map((c) => {
        const d = haversineKm(last, c.stop);
        const penalty = d > caps.maxKmBetweenStops ? 9999 : d * 0.6;
        return { ...c, adjusted: c.score - penalty };
      })
      .sort((a, b) => b.adjusted - a.adjusted);
    const next = ranked[0];
    if (!next || next.adjusted <= -1000) break;
    chosen.push({ stop: next.stop, score: next.score });
  }

  // Nearest-neighbour ordering from first chosen for sensible driving order.
  const ordered: typeof chosen = [chosen[0]];
  const remain = chosen.slice(1);
  while (remain.length) {
    const last = ordered[ordered.length - 1].stop;
    remain.sort((a, b) => haversineKm(last, a.stop) - haversineKm(last, b.stop));
    ordered.push(remain.shift()!);
  }

  let totalKm = 0;
  let totalDriveMin = 0;
  let totalExperienceMin = 0;
  const stops = ordered.map((c, i) => {
    const drive = i === 0 ? 0 : driveMinutes(haversineKm(ordered[i - 1].stop, c.stop));
    if (i > 0) totalKm += haversineKm(ordered[i - 1].stop, c.stop);
    totalDriveMin += drive;
    totalExperienceMin += c.stop.duration_minutes ?? 60;
    return {
      key: c.stop.key,
      region_key: c.stop.region_key,
      label: c.stop.label,
      blurb: c.stop.blurb,
      tag: c.stop.tag,
      lat: c.stop.lat,
      lng: c.stop.lng,
      duration_minutes: c.stop.duration_minutes ?? 60,
      driveMinutesFromPrev: drive,
      source_tour_keys: c.stop.source_tour_keys ?? [],
      score: Math.round(c.score),
    };
  });

  // Feasibility checks (advisory only — UI shows warnings, doesn't block).
  let feasible = true;
  if (totalKm > caps.maxTotalKmPerDay) {
    feasible = false;
    warnings.push(`Total ${Math.round(totalKm)} km exceeds daily cap (${caps.maxTotalKmPerDay} km).`);
  }
  if (totalDriveMin / 60 > caps.maxDrivingHours) {
    feasible = false;
    warnings.push(`Driving time ${Math.round(totalDriveMin / 60)} h exceeds cap (${caps.maxDrivingHours} h).`);
  }
  if (totalExperienceMin / 60 > caps.maxExperienceHours) {
    warnings.push(`Stops add up to ${Math.round(totalExperienceMin / 60)} h — consider trimming for a comfortable day.`);
  }

  return { stops, totalDriveMin, totalExperienceMin, totalKm, feasible, warnings };
}
