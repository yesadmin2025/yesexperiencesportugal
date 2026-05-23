// Drift composer — turns a Drift profile + region into a feasible day
// assembled from the regional stops pool, respecting operational rules.
//
// Pure TS, no I/O. Drive times are estimated via haversine × detour factor
// (matches the heuristic used elsewhere in the builder). Swap in a real
// matrix API later behind the same interface without changing callers.

import {
  REGION_STOPS,
  REGION_ORIGIN,
  type RegionKey,
  type RegionStop,
  type StopKind,
} from "@/data/regionStops";
import { REGION_RULES } from "@/data/regionRules";

// Mirrors src/components/builder/v3/StudioDrift.tsx DriftProfile (subset we need).
export interface ComposerProfile {
  pickup?: "lisbon" | "centro" | "alentejo";
  radius?: "near" | "far" | "anywhere";
  energy?: "slow" | "vivid";
  style?: "coast" | "heritage" | "wine" | "table";
  social?: "intimate" | "shared";
  companions?: "solo" | "couple" | "family" | "group";
}

export interface ComposedStop {
  stop: RegionStop;
  /** Drive time from previous stop (or origin if first), minutes. */
  driveFromPrev: number;
}

export interface ComposedDay {
  region: RegionKey;
  originLabel: string;
  stops: ComposedStop[];
  totals: { driveMin: number; dwellMin: number; dayMin: number };
  warnings: string[];
  /** Anchor tour id for the "continue with a local" CTA, picked from the
   *  highest-priority stop that declares an anchor. */
  anchorTourId?: string;
}

// ─── geometry ─────────────────────────────────────────────────────────────

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough drive minutes: 65 km/h average × 1.25 detour, +5 min buffer. */
function driveMin(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const km = haversineKm(a, b) * 1.25;
  return Math.round((km / 65) * 60 + 5);
}

// ─── filters ──────────────────────────────────────────────────────────────

function isOpenOnDay(stop: RegionStop, weekday: number): boolean {
  return !stop.closedDays.includes(weekday);
}

function isInSeason(stop: RegionStop, month: number): boolean {
  if (!stop.seasonalMonths) return true;
  const { from, to } = stop.seasonalMonths;
  return month >= from && month <= to;
}

// ─── scoring ──────────────────────────────────────────────────────────────

/** Phase 2: optional confidence map. Keys are `${dimension}:${value}`,
 *  values in [0,1]. When supplied, affinity bonuses are scaled by the
 *  confidence of the matching dimension instead of treated as binary. */
export type ConfidenceMap = Record<string, number>;

function dimWeight(
  conf: ConfidenceMap | undefined,
  dim: string,
  value: string | undefined,
): number {
  if (!value) return 0;
  if (!conf) return 1;
  return Math.max(conf[`${dim}:${value}`] ?? 0, 1);
}

function affinityScore(
  stop: RegionStop,
  p: ComposerProfile,
  conf?: ConfidenceMap,
): number {
  let score = 0;
  const a = stop.affinity;
  if (p.style && a.style?.includes(p.style)) {
    score += 6 * dimWeight(conf, "style", p.style);
  }
  if (p.energy && a.energy?.includes(p.energy)) {
    score += 3 * dimWeight(conf, "energy", p.energy);
  }
  if (p.social && a.social?.includes(p.social)) {
    score += 2 * dimWeight(conf, "social", p.social);
  }
  if (p.companions && a.companions?.includes(p.companions)) {
    score += 2 * dimWeight(conf, "companions", p.companions);
  }
  // Soft inference: if confidence map says style/energy X is likely (>0.5)
  // even when the explicit profile field is unset, still nudge matches.
  if (conf && !p.style) {
    for (const s of a.style ?? []) {
      const c = conf[`style:${s}`] ?? 0;
      if (c >= 0.5) score += 6 * c * 0.7;
    }
  }
  if (conf && !p.energy) {
    for (const e of a.energy ?? []) {
      const c = conf[`energy:${e}`] ?? 0;
      if (c >= 0.5) score += 3 * c * 0.7;
    }
  }
  score += stop.priority * 0.6;
  return score;
}

const TIME_ORDER: Record<NonNullable<RegionStop["timeOfDay"][number]>, number> = {
  morning: 0,
  midday: 1,
  afternoon: 2,
  sunset: 3,
};

function preferredSlot(stop: RegionStop): number {
  if (stop.timeOfDay.length === 0) return 2;
  return Math.min(...stop.timeOfDay.map((t) => TIME_ORDER[t]));
}

// ─── pick region from profile ─────────────────────────────────────────────

export function pickRegion(p: ComposerProfile): RegionKey {
  if (p.pickup === "centro") return "centro";
  if (p.pickup === "alentejo") return "alentejo";
  // Lisbon pickups split between Arrábida and the coast based on style.
  if (p.style === "heritage" || p.style === "coast") {
    // Sintra/Cascais if heritage or coast + slow; Arrábida if coast + vivid.
    if (p.style === "heritage") return "lisbon-coast";
    if (p.energy === "vivid") return "arrabida";
    return "lisbon-coast";
  }
  return "arrabida";
}

// ─── core compose ─────────────────────────────────────────────────────────

export interface ComposeOptions {
  /** ISO weekday of the trip (1=Mon … 7=Sun). Defaults to a non-Monday weekday so
   *  market-closed-Monday doesn't silently drop everything in previews. */
  weekday?: number;
  /** Month of the trip (1–12) for seasonal stops. Defaults to current month. */
  month?: number;
}

export function composeDay(
  profile: ComposerProfile,
  region: RegionKey,
  opts: ComposeOptions = {},
): ComposedDay {
  const weekday = opts.weekday ?? (() => {
    const w = new Date().getDay(); // 0=Sun
    return w === 0 ? 7 : w;
  })();
  const month = opts.month ?? new Date().getMonth() + 1;

  const rules = REGION_RULES[region];
  const origin = REGION_ORIGIN[region];
  const dayBudget =
    profile.radius === "near" ? rules.dayLengthMinutes.near : rules.dayLengthMinutes.far;

  const warnings: string[] = [];

  // 1. Filter pool by operational rules.
  const candidates = REGION_STOPS
    .filter((s) => s.region === region)
    .filter((s) => isOpenOnDay(s, weekday))
    .filter((s) => isInSeason(s, month));

  // 2. Score & sort by affinity.
  const scored = candidates
    .map((stop) => ({ stop, score: affinityScore(stop, profile) }))
    .sort((a, b) => b.score - a.score);

  // 3. Greedy assemble with caps + drive/dwell budgets, then order by time of day.
  const kindUsed: Partial<Record<StopKind, number>> = {};
  const picked: RegionStop[] = [];
  let totalDrive = 0;
  let totalDwell = 0;
  // Conservative pickup + drop-off overhead.
  const overheadMin = 60;

  for (const { stop } of scored) {
    if (picked.length >= rules.maxStops) break;
    const cap = rules.kindCaps[stop.kind];
    const used = kindUsed[stop.kind] ?? 0;
    if (cap !== undefined && used >= cap) continue;

    // Tentative ordering for fit check: insert and order by time-of-day.
    const tentative = [...picked, stop].sort(
      (a, b) => preferredSlot(a) - preferredSlot(b),
    );
    const fit = simulateDay(tentative, origin);
    if (fit.maxHop > rules.maxHopMinutes) continue;
    if (fit.drive > rules.maxDriveMinutes) continue;
    if (fit.drive + fit.dwell + overheadMin > dayBudget) continue;

    picked.push(stop);
    kindUsed[stop.kind] = used + 1;
    totalDrive = fit.drive;
    totalDwell = fit.dwell;
  }

  // 4. Final ordering by time of day (stable on ties).
  picked.sort((a, b) => preferredSlot(a) - preferredSlot(b));
  const fit = simulateDay(picked, origin);
  totalDrive = fit.drive;
  totalDwell = fit.dwell;

  // 5. Warnings.
  if (picked.length < rules.minStops) {
    warnings.push(
      `Apenas ${picked.length} paragens cabem — talvez estender o dia ou trocar de região.`,
    );
  }
  if (fit.drive + fit.dwell + overheadMin > dayBudget * 0.95) {
    warnings.push("Dia cheio — sem margem para imprevistos.");
  }

  // 6. Build per-stop drive-from-prev.
  const composed: ComposedStop[] = [];
  let prev: { lat: number; lng: number } = origin;
  for (const stop of picked) {
    const d = driveMin(prev, stop.coords);
    composed.push({ stop, driveFromPrev: d });
    prev = stop.coords;
  }

  // 7. Pick anchor tour from the highest-priority anchored stop.
  const anchor = [...picked]
    .filter((s) => s.anchorTourId)
    .sort((a, b) => b.priority - a.priority)[0];

  return {
    region,
    originLabel: origin.label,
    stops: composed,
    totals: {
      driveMin: totalDrive,
      dwellMin: totalDwell,
      dayMin: totalDrive + totalDwell + overheadMin,
    },
    warnings,
    anchorTourId: anchor?.anchorTourId,
  };
}

function simulateDay(
  stops: RegionStop[],
  origin: { lat: number; lng: number },
): { drive: number; dwell: number; maxHop: number } {
  let drive = 0;
  let dwell = 0;
  let maxHop = 0;
  let prev = origin;
  for (const s of stops) {
    const hop = driveMin(prev, s.coords);
    drive += hop;
    if (hop > maxHop) maxHop = hop;
    dwell += s.dwellMin;
    prev = s.coords;
  }
  // Return drive to origin (rough)
  if (stops.length > 0) {
    drive += driveMin(prev, origin);
  }
  return { drive, dwell, maxHop };
}
