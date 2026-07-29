// Add-on insertion calculator — decides *where* an add-on stop should
// slot into a base itinerary and whether adding it keeps the day within
// the "YES Approved" envelope.
//
// The module is pure: no network, no React. Real per-leg driving numbers
// come from getStudioV3RouteLegs at the caller. To evaluate candidate
// insertion positions without a routing round-trip, we estimate the
// *delta* of the two replaced legs using the ratio of straight-line
// (haversine) distances against the base leg — i.e. we assume the same
// "wiggliness" as the road we already know. This is intentionally
// conservative: if the estimate says the add-on is over budget, it stays
// off the recommendation list. When the traveller *accepts* an add-on,
// the caller re-fetches real legs and re-runs validateItinerary().
//
// Consumed by:
//   - SmartRecommendation / SignaturePriceCard (dimming toggles)
//   - The reveal telemetry (why an add-on was hidden)
//
// Rules mirror the plan §C (full-route add-on insertion calculation).

import type { RegionKey } from "@/data/regionStops";
import {
  ADDON_MAX_DELTA_MIN,
  ADDON_MAX_INSERTION_PROBES,
  ADDON_PREFERRED_DELTA_MIN,
  ADDON_STRONG_NARRATIVE_SCORE,
  resolveThresholds,
  type ResolvedThresholds,
} from "./itinerary-thresholds";
import {
  validateItinerary,
  type ValidatedItinerary,
  type ValidationStop,
} from "./itinerary-validation";

export type InsertionFitBadge = "preferred" | "small_detour" | "over_budget" | "unfit";

export interface InsertionCandidate {
  /** 0-based index; the addon is inserted BEFORE this position. */
  index: number;
  /** Extra driving minutes vs the base itinerary. */
  deltaMinutes: number;
  /** Extra km vs the base itinerary. */
  deltaKm: number;
  /** Simulated per-leg minutes if the addon were inserted here. */
  simulatedLegMinutes: number[];
  /** Simulated per-leg km if the addon were inserted here. */
  simulatedLegDistancesKm: number[];
  /** Full validation of the simulated day. */
  validation: ValidatedItinerary;
  /** True when validation.status is "approved" or "review". */
  keepsApproval: boolean;
}

export interface InsertionResult {
  status: "recommended" | "detour" | "hidden";
  badge: InsertionFitBadge;
  reason: string;
  best: InsertionCandidate | null;
  probed: InsertionCandidate[];
  thresholds: ResolvedThresholds;
}

export interface AddonInsertionInput {
  region: RegionKey;
  /** Base itinerary the traveller is looking at, in order. */
  baseStops: ReadonlyArray<ValidationStop>;
  /** Real per-leg minutes for the base itinerary (length = stops-1). */
  baseLegMinutes: ReadonlyArray<number>;
  /** Real per-leg km for the base itinerary (length = stops-1). */
  baseLegDistancesKm: ReadonlyArray<number>;
  /** The add-on stop we're testing. Must carry coords for estimation. */
  addonStop: ValidationStop;
  /**
   * Narrative fit score in [0,1]. When the best candidate falls in the
   * "small detour" band (PREFERRED_DELTA < Δ ≤ MAX_DELTA), we only
   * recommend it when narrativeScore ≥ ADDON_STRONG_NARRATIVE_SCORE.
   */
  narrativeScore?: number;
  thresholdsOverride?: ResolvedThresholds;
}

const EARTH_KM = 6371;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Estimate a road leg (minutes, km) between two coord points by scaling
 * the straight-line distance against a reference base leg's known
 * road:crow ratio. Falls back to a conservative 1.25× / 60 km/h when no
 * reference is available.
 */
function estimateLegFromReference(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  ref?: {
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    km: number;
    min: number;
  },
): { km: number; min: number } {
  const crow = haversineKm(from, to);
  if (ref) {
    const refCrow = haversineKm(ref.from, ref.to);
    const roadRatio = refCrow > 0.1 ? ref.km / refCrow : 1.25;
    const speedKmh = ref.min > 0 ? (ref.km / ref.min) * 60 : 60;
    const km = crow * roadRatio;
    const min = speedKmh > 0 ? (km / speedKmh) * 60 : (km / 60) * 60;
    return { km, min };
  }
  const km = crow * 1.25;
  return { km, min: (km / 60) * 60 };
}

function probeCandidate(
  input: AddonInsertionInput,
  index: number,
  thresholds: ResolvedThresholds,
): InsertionCandidate | null {
  const { baseStops, baseLegMinutes, baseLegDistancesKm, addonStop } = input;
  if (!addonStop.coords) return null;
  // Insert BEFORE `index`. Valid positions are 1 .. baseStops.length - 1
  // (never before the pickup, never after the drop-off).
  if (index < 1 || index > baseStops.length - 1) return null;

  const from = baseStops[index - 1].coords;
  const to = baseStops[index].coords;
  if (!from || !to) return null;

  const originalLegMin = baseLegMinutes[index - 1] ?? 0;
  const originalLegKm = baseLegDistancesKm[index - 1] ?? 0;
  const ref = {
    from,
    to,
    km: originalLegKm,
    min: originalLegMin,
  };
  const legIn = estimateLegFromReference(from, addonStop.coords, ref);
  const legOut = estimateLegFromReference(addonStop.coords, to, ref);

  const simulatedLegMinutes = [...baseLegMinutes];
  const simulatedLegDistancesKm = [...baseLegDistancesKm];
  simulatedLegMinutes.splice(index - 1, 1, legIn.min, legOut.min);
  simulatedLegDistancesKm.splice(index - 1, 1, legIn.km, legOut.km);

  const simulatedStops: ValidationStop[] = [
    ...baseStops.slice(0, index),
    addonStop,
    ...baseStops.slice(index),
  ];

  const validation = validateItinerary({
    region: input.region,
    stops: simulatedStops,
    legMinutes: simulatedLegMinutes,
    legDistancesKm: simulatedLegDistancesKm,
    thresholdsOverride: thresholds,
  });

  const deltaMinutes = legIn.min + legOut.min - originalLegMin;
  const deltaKm = legIn.km + legOut.km - originalLegKm;

  return {
    index,
    deltaMinutes,
    deltaKm,
    simulatedLegMinutes,
    simulatedLegDistancesKm,
    validation,
    keepsApproval: validation.status === "approved" || validation.status === "review",
  };
}

/**
 * Enumerate all valid insertion positions, probe up to N of them, and
 * return the best fit (smallest positive delta that keeps approval).
 */
export function planAddonInsertion(input: AddonInsertionInput): InsertionResult {
  const thresholds = input.thresholdsOverride ?? resolveThresholds(input.region);

  if (!input.addonStop.coords || input.baseStops.length < 2) {
    return {
      status: "hidden",
      badge: "unfit",
      reason: "Not enough geography to place this add-on.",
      best: null,
      probed: [],
      thresholds,
    };
  }
  if (
    input.baseLegMinutes.length !== input.baseStops.length - 1 ||
    input.baseLegDistancesKm.length !== input.baseStops.length - 1
  ) {
    return {
      status: "hidden",
      badge: "unfit",
      reason: "Waiting for road data before scoring this add-on.",
      best: null,
      probed: [],
      thresholds,
    };
  }

  const positions: number[] = [];
  for (let i = 1; i <= input.baseStops.length - 1; i++) positions.push(i);

  // Order probes by the base leg's straight-line proximity to the add-on
  // — the most promising slots first — then cap.
  const addonCoords = input.addonStop.coords;
  const ranked = positions
    .map((i) => {
      const a = input.baseStops[i - 1].coords!;
      const b = input.baseStops[i].coords!;
      const midDist = (haversineKm(a, addonCoords) + haversineKm(addonCoords, b)) / 2;
      return { i, midDist };
    })
    .sort((x, y) => x.midDist - y.midDist)
    .slice(0, ADDON_MAX_INSERTION_PROBES)
    .map((r) => r.i);

  const probed: InsertionCandidate[] = [];
  for (const i of ranked) {
    const cand = probeCandidate(input, i, thresholds);
    if (cand) probed.push(cand);
  }

  const viable = probed
    .filter((c) => c.keepsApproval)
    .sort((a, b) => a.deltaMinutes - b.deltaMinutes);

  const best = viable[0] ?? null;
  if (!best) {
    return {
      status: "hidden",
      badge: "over_budget",
      reason: "Adding this stop would push the day past the daily envelope.",
      best: null,
      probed,
      thresholds,
    };
  }

  const narrativeScore = input.narrativeScore ?? 0;

  if (best.deltaMinutes <= ADDON_PREFERRED_DELTA_MIN) {
    return {
      status: "recommended",
      badge: "preferred",
      reason: `Adds ${Math.round(best.deltaMinutes)} min — fits the day.`,
      best,
      probed,
      thresholds,
    };
  }

  if (best.deltaMinutes <= ADDON_MAX_DELTA_MIN) {
    if (narrativeScore >= ADDON_STRONG_NARRATIVE_SCORE) {
      return {
        status: "detour",
        badge: "small_detour",
        reason: `Small detour — adds about ${Math.round(best.deltaMinutes)} min for a moment worth it.`,
        best,
        probed,
        thresholds,
      };
    }
    return {
      status: "hidden",
      badge: "small_detour",
      reason: `Adds ${Math.round(best.deltaMinutes)} min for a moment that isn't quite worth the detour.`,
      best,
      probed,
      thresholds,
    };
  }

  return {
    status: "hidden",
    badge: "over_budget",
    reason: `Adds ${Math.round(best.deltaMinutes)} min — over the ${ADDON_MAX_DELTA_MIN} min detour cap.`,
    best,
    probed,
    thresholds,
  };
}
