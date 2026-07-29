// Itinerary validation — the "YES Approved" state machine.
//
// Given an ordered list of stops for one region + real per-leg driving
// data (from useRouteLegMinutes / getStudioV3RouteLegs), decide whether
// the composed day earns the YES Approved badge, needs light review, or
// must be rejected as un-operationable.
//
// This module is *pure*: no React, no fetch, no clock. All operational
// numbers come from itinerary-thresholds.ts so behaviour is testable and
// can be tuned in one place. Called from:
//   - StudioV3 reveal (to render <ApprovalBadge />)
//   - addon-insertion.ts (Step 3) to test "does adding X keep us green?"
//
// Contract:
//   - `incomplete` → not enough data to judge (missing stops or legs)
//   - `approved`   → all hard operational rules pass; day is bookable
//   - `review`     → soft rules tripped; a nudge is offered (auto-remedy)
//   - `reject`     → at least one hard rule failed; day is not bookable

import type { RegionKey } from "@/data/regionStops";
import { DWELL_MINIMUM_MIN, type StopCategory } from "@/lib/feasibility";
import { resolveThresholds, type ResolvedThresholds } from "./itinerary-thresholds";

export type ValidationStatus = "approved" | "review" | "reject" | "incomplete";

export type ValidationSeverity = "hard" | "soft";

export type ValidationCode =
  | "not_enough_stops"
  | "too_many_stops"
  | "day_too_long"
  | "day_too_short"
  | "driving_over_absolute_cap"
  | "driving_over_percent_cap"
  | "driving_over_preferred_pct"
  | "hop_too_long"
  | "dwell_too_short"
  | "day_km_over_cap"
  | "backtrack_incoherent"
  | "missing_leg_data";

export interface ValidationFailure {
  code: ValidationCode;
  severity: ValidationSeverity;
  message: string;
  /** Optional stop index the failure attaches to (for UI badges). */
  stopIndex?: number;
}

export interface ValidationSuggestion {
  /** Machine-readable so the reveal UI can offer a one-tap auto-fix. */
  action: "drop_stop" | "reorder_stops" | "extend_day" | "shorten_day" | "swap_stop";
  stopIndex?: number;
  message: string;
}

export interface ValidationMetrics {
  stopCount: number;
  totalMinutes: number;
  drivingMinutes: number;
  dwellMinutes: number;
  drivingPct: number;
  longestHopMin: number;
  totalKm: number;
}

export interface ValidatedItinerary {
  status: ValidationStatus;
  metrics: ValidationMetrics;
  failures: ValidationFailure[];
  suggestions: ValidationSuggestion[];
  thresholds: ResolvedThresholds;
}

export interface ValidationStop {
  /** Stable key for suggestions / UI badges. */
  key: string;
  label: string;
  /** Feasibility category — drives dwell minimum. */
  category: StopCategory;
  /** Optional dwell override (minutes). Falls back to DWELL_MINIMUM_MIN. */
  dwellMinutesOverride?: number;
  /** Optional coords — enable geographic-coherence checks. */
  coords?: { lat: number; lng: number };
}

export interface ValidateItineraryInput {
  region: RegionKey;
  stops: ReadonlyArray<ValidationStop>;
  /** Per-leg driving minutes; length must be `stops.length - 1`. */
  legMinutes?: ReadonlyArray<number> | null;
  /** Per-leg road distance in km; length must be `stops.length - 1`. */
  legDistancesKm?: ReadonlyArray<number> | null;
  /** Override thresholds — mainly for tests. */
  thresholdsOverride?: ResolvedThresholds;
}

const dwellOf = (s: ValidationStop): number =>
  s.dwellMinutesOverride ?? DWELL_MINIMUM_MIN[s.category] ?? 45;

/**
 * Very lightweight backtrack heuristic: measures how much of the total
 * km is spent moving against the origin→destination bearing. Purely
 * geometric — we don't need the road, only the shape of the trip.
 */
function backtrackFraction(
  stops: ReadonlyArray<ValidationStop>,
  legDistancesKm: ReadonlyArray<number> | null | undefined,
): number {
  if (!legDistancesKm || stops.length < 3) return 0;
  const withCoords = stops.every((s) => s.coords);
  if (!withCoords) return 0;
  const origin = stops[0].coords!;
  const dest = stops[stops.length - 1].coords!;
  const bx = dest.lng - origin.lng;
  const by = dest.lat - origin.lat;
  const bLen = Math.hypot(bx, by);
  if (bLen === 0) return 0;
  let backKm = 0;
  let totalKm = 0;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1].coords!;
    const b = stops[i].coords!;
    const vx = b.lng - a.lng;
    const vy = b.lat - a.lat;
    const dot = (vx * bx + vy * by) / bLen;
    const legKm = legDistancesKm[i - 1] ?? 0;
    totalKm += legKm;
    if (dot < 0) backKm += legKm;
  }
  return totalKm > 0 ? backKm / totalKm : 0;
}

export function validateItinerary(input: ValidateItineraryInput): ValidatedItinerary {
  const thresholds = input.thresholdsOverride ?? resolveThresholds(input.region);
  const stops = input.stops;

  const failures: ValidationFailure[] = [];
  const suggestions: ValidationSuggestion[] = [];

  // ── Incomplete short-circuit ─────────────────────────────────────
  if (stops.length < thresholds.minStops) {
    return {
      status: "incomplete",
      metrics: emptyMetrics(stops.length),
      failures: [
        {
          code: "not_enough_stops",
          severity: "hard",
          message: `A composed day needs at least ${thresholds.minStops} stops.`,
        },
      ],
      suggestions: [],
      thresholds,
    };
  }

  const expectedLegs = stops.length - 1;
  const haveLegs = Array.isArray(input.legMinutes) && input.legMinutes.length === expectedLegs;
  if (!haveLegs) {
    return {
      status: "incomplete",
      metrics: {
        ...emptyMetrics(stops.length),
        dwellMinutes: stops.reduce((acc, s) => acc + dwellOf(s), 0),
      },
      failures: [
        {
          code: "missing_leg_data",
          severity: "hard",
          message: "Waiting for road data to score the day.",
        },
      ],
      suggestions: [],
      thresholds,
    };
  }

  const legMinutes = input.legMinutes as ReadonlyArray<number>;
  const legDistancesKm = input.legDistancesKm ?? null;

  // ── Metrics ──────────────────────────────────────────────────────
  const dwellMinutes = stops.reduce((acc, s) => acc + dwellOf(s), 0);
  const drivingMinutes = legMinutes.reduce((acc, m) => acc + m, 0);
  const totalMinutes = dwellMinutes + drivingMinutes + thresholds.pickupReturnBufferMin;
  const drivingPct = totalMinutes > 0 ? drivingMinutes / totalMinutes : 0;
  const longestHopMin = legMinutes.reduce((acc, m) => Math.max(acc, m), 0);
  const totalKm = legDistancesKm ? legDistancesKm.reduce((a, b) => a + b, 0) : 0;

  const metrics: ValidationMetrics = {
    stopCount: stops.length,
    totalMinutes,
    drivingMinutes,
    dwellMinutes,
    drivingPct,
    longestHopMin,
    totalKm,
  };

  // ── Hard rules ───────────────────────────────────────────────────
  if (stops.length > thresholds.maxStops) {
    failures.push({
      code: "too_many_stops",
      severity: "hard",
      message: `That's ${stops.length} stops — keep it to ${thresholds.maxStops} for an unhurried day.`,
    });
    suggestions.push({
      action: "drop_stop",
      message: `Drop one stop to bring the day back under ${thresholds.maxStops}.`,
    });
  }

  if (totalMinutes > thresholds.maxDayMin) {
    failures.push({
      code: "day_too_long",
      severity: "hard",
      message: `The day runs about ${minutesToHumanHours(totalMinutes)} — over the ${minutesToHumanHours(thresholds.maxDayMin)} envelope.`,
    });
    suggestions.push({
      action: "shorten_day",
      message: "Drop the longest stop or a distant one to tighten the day.",
    });
  }

  if (drivingMinutes > thresholds.maxDrivingMinAbs) {
    failures.push({
      code: "driving_over_absolute_cap",
      severity: "hard",
      message: `Driving totals ${minutesToHumanHours(drivingMinutes)} — over the ${minutesToHumanHours(thresholds.maxDrivingMinAbs)} cap.`,
    });
  }

  if (drivingPct > thresholds.maxDrivingPct) {
    failures.push({
      code: "driving_over_percent_cap",
      severity: "hard",
      message: `Driving is ${Math.round(drivingPct * 100)}% of the day — max ${Math.round(thresholds.maxDrivingPct * 100)}%.`,
    });
  }

  for (let i = 0; i < legMinutes.length; i++) {
    if (legMinutes[i] > thresholds.maxHopMin) {
      failures.push({
        code: "hop_too_long",
        severity: "hard",
        message: `The hop into ${stops[i + 1].label} runs ${legMinutes[i]} min — over the ${thresholds.maxHopMin} min single-hop cap.`,
        stopIndex: i + 1,
      });
      suggestions.push({
        action: "reorder_stops",
        stopIndex: i + 1,
        message: `Reorder or swap ${stops[i + 1].label} — that leg is too long.`,
      });
    }
  }

  for (let i = 0; i < stops.length; i++) {
    const dwell = dwellOf(stops[i]);
    const minDwell = DWELL_MINIMUM_MIN[stops[i].category] ?? 30;
    if (dwell < minDwell) {
      failures.push({
        code: "dwell_too_short",
        severity: "hard",
        message: `${stops[i].label} needs at least ${minDwell} min on the ground.`,
        stopIndex: i,
      });
    }
  }

  if (totalKm > thresholds.maxDayKm) {
    failures.push({
      code: "day_km_over_cap",
      severity: "hard",
      message: `Total distance is ${Math.round(totalKm)} km — over the ${thresholds.maxDayKm} km ceiling for a single day.`,
    });
  }

  const back = backtrackFraction(stops, legDistancesKm);
  if (back > thresholds.backtrackTolerancePct) {
    failures.push({
      code: "backtrack_incoherent",
      severity: "hard",
      message: `The route doubles back too much — ${Math.round(back * 100)}% of the drive runs against the day's direction.`,
    });
    suggestions.push({
      action: "reorder_stops",
      message: "Reorder the stops so the day flows in one direction.",
    });
  }

  // ── Soft rules (trigger "review", not "reject") ──────────────────
  if (drivingPct > thresholds.preferredDrivingPct && drivingPct <= thresholds.maxDrivingPct) {
    failures.push({
      code: "driving_over_preferred_pct",
      severity: "soft",
      message: `Driving is ${Math.round(drivingPct * 100)}% of the day — ideal is under ${Math.round(thresholds.preferredDrivingPct * 100)}%.`,
    });
  }

  if (totalMinutes < thresholds.maxDayMin * 0.55) {
    failures.push({
      code: "day_too_short",
      severity: "soft",
      message: "The day feels light — there's room for one more moment if you'd like.",
    });
    suggestions.push({
      action: "extend_day",
      message: "Add a sunset viewpoint or short workshop to round out the day.",
    });
  }

  // ── State machine ────────────────────────────────────────────────
  const hasHard = failures.some((f) => f.severity === "hard");
  const hasSoft = failures.some((f) => f.severity === "soft");
  const status: ValidationStatus = hasHard ? "reject" : hasSoft ? "review" : "approved";

  return { status, metrics, failures, suggestions, thresholds };
}

function emptyMetrics(stopCount: number): ValidationMetrics {
  return {
    stopCount,
    totalMinutes: 0,
    drivingMinutes: 0,
    dwellMinutes: 0,
    drivingPct: 0,
    longestHopMin: 0,
    totalKm: 0,
  };
}

function minutesToHumanHours(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
