// Itinerary validation thresholds — single source of truth for the
// operational rules that decide whether a composed day earns the
// "YES Approved" badge. Consumed by itinerary-validation.ts (Step 2)
// and addon-insertion.ts (Step 3).
//
// Numbers are cross-referenced with:
//   - REGION_RULES (src/data/regionRules.ts) for regional day envelope
//   - DAY_CAPS + DWELL_MINIMUM_MIN (src/lib/feasibility.ts) for hard caps
//   - Real Viator "full day" quote (≈ 09:00 → 19:00, 600 min)
//
// Any change here must be reflected in the tests in
// src/lib/studio-v3/__tests__/itinerary-thresholds.test.ts.

import type { RegionKey } from "@/data/regionStops";
import { REGION_RULES } from "@/data/regionRules";

/** Hard maximum for total driving in a single day, regardless of region. */
export const MAX_DRIVING_MIN_ABS_GLOBAL = 180;

/** Percentage of the day that may be spent driving. Above this we warn. */
export const PREFERRED_DRIVING_PCT = 0.3;

/** Absolute cap for driving as a fraction of the day. Above this: reject. */
export const MAX_DRIVING_PCT_OF_DAY = 0.4;

/** Cushion added to every drive segment for parking / navigation. */
export const PICKUP_RETURN_BUFFER_MIN = 20;

/**
 * Backtrack tolerance — fraction of total km that may be spent driving
 * against the overall route bearing before the day is flagged as
 * geographically incoherent.
 */
export const BACKTRACK_TOLERANCE_PCT = 0.15;

/** Regional km ceiling for a genuine "one day" experience. */
export const MAX_DAY_KM: Record<RegionKey, number> = {
  arrabida: 260,
  "lisbon-coast": 260,
  alentejo: 340,
  centro: 340,
};

/**
 * Preferred extra driving (round-trip) an add-on may add to the base
 * itinerary. Add-ons at or below this show as normal recommendations.
 */
export const ADDON_PREFERRED_DELTA_MIN = 20;

/**
 * Absolute cap for the extra driving an add-on may add. Between
 * PREFERRED and MAX the add-on shows only when its narrative score
 * clears ADDON_STRONG_NARRATIVE_SCORE and gets a "Small detour" badge.
 */
export const ADDON_MAX_DELTA_MIN = 30;

/** Narrative score required to justify a 20–30 min detour. */
export const ADDON_STRONG_NARRATIVE_SCORE = 0.75;

/** Maximum candidate positions we test per add-on when picking best fit. */
export const ADDON_MAX_INSERTION_PROBES = 5;

/**
 * Resolve the composite thresholds for a region — combines the region
 * rules with the itinerary-wide caps above. Consumed by
 * itinerary-validation.ts.
 */
export interface ResolvedThresholds {
  region: RegionKey;
  maxDrivingMinAbs: number;
  maxHopMin: number;
  maxDayMin: number;
  maxDayKm: number;
  preferredDrivingPct: number;
  maxDrivingPct: number;
  pickupReturnBufferMin: number;
  backtrackTolerancePct: number;
  minStops: number;
  maxStops: number;
}

export function resolveThresholds(region: RegionKey): ResolvedThresholds {
  const rules = REGION_RULES[region];
  return {
    region,
    maxDrivingMinAbs: Math.min(rules.maxDriveMinutes, MAX_DRIVING_MIN_ABS_GLOBAL),
    maxHopMin: rules.maxHopMinutes,
    maxDayMin: rules.dayLengthMinutes.far,
    maxDayKm: MAX_DAY_KM[region],
    preferredDrivingPct: PREFERRED_DRIVING_PCT,
    maxDrivingPct: MAX_DRIVING_PCT_OF_DAY,
    pickupReturnBufferMin: PICKUP_RETURN_BUFFER_MIN,
    backtrackTolerancePct: BACKTRACK_TOLERANCE_PCT,
    minStops: rules.minStops,
    maxStops: rules.maxStops,
  };
}
