// Studio V3 — client-safe timing utilities.
//
// Real-day arithmetic for the timeline + add-on guard: per-stop dwell time,
// drive-minutes between consecutive stops (haversine fallback when an OSRM
// leg is not available), and a day summary against the regional rhythm
// budget defined in `regionRules.ts`.
//
// All inputs come from the resolved Signature itself — we never invent
// stops, durations, or drive numbers. Defaults are conservative averages
// drawn from the operation's own scheduling sheet.

import { REGION_RULES } from "@/data/regionRules";
import type { RegionKey, StopKind } from "@/data/regionStops";

/** Average dwell time (minutes) per stop kind. Conservative — leans short. */
const DWELL_BY_KIND: Record<StopKind, number> = {
  winery: 90,
  cellar: 75,
  table: 75,
  market: 45,
  beach: 60,
  viewpoint: 25,
  workshop: 90,
  heritage: 60,
  village: 40,
} as Record<StopKind, number>;

const DEFAULT_DWELL = 60;

export interface TimingStop {
  /** Lowercased keyword used to infer the kind when explicit kind is absent. */
  label: string;
  kind?: StopKind | null;
  lat?: number | null;
  lng?: number | null;
  /** Optional override — when the supplier has a concrete minutes value. */
  durationMinutes?: number | null;
}

/** Infer the stop kind from a label when the data layer didn't tag one. */
export function inferKind(label: string): StopKind | null {
  const l = label.toLowerCase();
  if (/winer|quinta|vineyard|adega/.test(l)) return "winery";
  if (/cellar|talha|amphora/.test(l)) return "cellar";
  if (/lunch|table|restaurant|tasca|petisco/.test(l)) return "table";
  if (/market|mercado/.test(l)) return "market";
  if (/beach|cove|portinho|galapinhos|comporta/.test(l)) return "beach";
  if (/viewpoint|miradouro|cape|cabo|cliff/.test(l)) return "viewpoint";
  if (/workshop|atelier|azulejo|tile|cheese|hands-on/.test(l)) return "workshop";
  if (/convent|monastery|chapel|castle|palace|roman|ruin|heritage/.test(l))
    return "heritage";
  if (/village|town|aldeia|óbidos|obidos|sintra/.test(l)) return "village";
  return null;
}

/** Minutes a traveller spends at a stop. */
export function stopDurationMinutes(stop: TimingStop): number {
  if (typeof stop.durationMinutes === "number" && stop.durationMinutes > 0) {
    return stop.durationMinutes;
  }
  const kind = stop.kind ?? inferKind(stop.label);
  return (kind && DWELL_BY_KIND[kind]) || DEFAULT_DWELL;
}

/** Short human label for a stop kind — used in timeline chips. */
export function kindLabel(kind: StopKind | null): string {
  if (!kind) return "stop";
  switch (kind) {
    case "winery":
      return "tasting";
    case "cellar":
      return "cellar";
    case "table":
      return "table";
    case "market":
      return "market";
    case "beach":
      return "beach";
    case "viewpoint":
      return "viewpoint";
    case "workshop":
      return "workshop";
    case "heritage":
      return "heritage";
    case "village":
      return "village";
    default:
      return "stop";
  }
}

/** Haversine drive minutes at 55 km/h — same fallback as OSRM cache miss. */
export function haversineDriveMinutes(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(h));
  // Add 12% overhead vs. straight-line for real-world road sinuosity.
  return Math.max(1, Math.round(((km * 1.12) / 55) * 60));
}

/** Format minutes as a compact human chip ("≈ 90 min" / "≈ 2h 15m"). */
export function formatMinutes(min: number): string {
  if (min < 60) return `≈ ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `≈ ${h}h` : `≈ ${h}h ${m}m`;
}

export interface DaySummary {
  /** Total dwell time across all stops. */
  experienceMin: number;
  /** Sum of drive legs between stops. */
  driveMin: number;
  /** experienceMin + driveMin. */
  totalMin: number;
  /** Whether the day exceeds the region's `far` day-length budget. */
  overBudget: boolean;
  /** Whether the cumulative drive exceeds the region's max drive minutes. */
  overDrive: boolean;
  /** Remaining minutes inside the regional far-budget (≥ 0). */
  remainingMin: number;
}

/** Map free-text region strings to a known RegionKey for budget lookup. */
export function regionKeyFor(region: string | null | undefined): RegionKey {
  const r = (region ?? "").toLowerCase();
  if (r.includes("arrábida") || r.includes("arrabida") || r.includes("setúbal") || r.includes("setubal"))
    return "arrabida";
  if (r.includes("alentejo") || r.includes("évora") || r.includes("evora")) return "alentejo";
  if (
    r.includes("centro") ||
    r.includes("coimbra") ||
    r.includes("nazaré") ||
    r.includes("nazare") ||
    r.includes("óbidos") ||
    r.includes("obidos") ||
    r.includes("fátima") ||
    r.includes("fatima")
  )
    return "centro";
  return "lisbon-coast";
}

/**
 * Summarize a day's stops + drives against the regional rhythm budget.
 * `drivesMin` is a parallel array to gaps between `stops` (length N-1).
 */
export function summarizeDay(opts: {
  stops: TimingStop[];
  drivesMin?: ReadonlyArray<number>;
  region?: string | null;
  /** Extra minutes from selected add-ons that should count against the budget. */
  addOnsMin?: number;
}): DaySummary {
  const dwell = opts.stops.reduce((sum, s) => sum + stopDurationMinutes(s), 0);
  const drives =
    opts.drivesMin && opts.drivesMin.length > 0
      ? opts.drivesMin.reduce((a, b) => a + b, 0)
      : (() => {
          let d = 0;
          for (let i = 1; i < opts.stops.length; i++) {
            const a = opts.stops[i - 1];
            const b = opts.stops[i];
            if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) continue;
            d += haversineDriveMinutes(
              { lat: a.lat, lng: a.lng },
              { lat: b.lat, lng: b.lng },
            );
          }
          return d;
        })();
  const addOnsMin = opts.addOnsMin ?? 0;
  const experienceMin = dwell + addOnsMin;
  const totalMin = experienceMin + drives;
  const rk = regionKeyFor(opts.region);
  const rules = REGION_RULES[rk];
  const dayCap = rules?.dayLengthMinutes.far ?? 9 * 60;
  const driveCap = rules?.maxDriveMinutes ?? 150;
  return {
    experienceMin,
    driveMin: drives,
    totalMin,
    overBudget: totalMin > dayCap,
    overDrive: drives > driveCap,
    remainingMin: Math.max(0, dayCap - totalMin),
  };
}
