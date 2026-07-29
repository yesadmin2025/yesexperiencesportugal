/**
 * Studio composition engine (Phase A).
 *
 * Given the traveller's answers (region, rhythm, interests, who, minor ages,
 * budget tier, weekday, month) this composes a full day from the approved
 * regional stop inventory in `src/data/regionStops.ts`.
 *
 * This is deliberately NOT a Signature-clone: it does not read from
 * `signatureTours`, does not pull a template, and never falls back to a
 * canonical tour ordering. Two travellers with materially different
 * answers must get materially different journeys — see the accompanying
 * test suite for the guarantees.
 *
 * Pure function. No I/O, no React, no side effects.
 */

import {
  REGION_STOPS,
  REGION_ORIGIN,
  type RegionKey,
  type RegionStop,
  type StopKind,
} from "@/data/regionStops";
import { REGION_RULES } from "@/data/regionRules";
import {
  COMPOSER_MAX_LEG_KM,
  haversineDriveMinutes,
  haversineKm,
  isPlausibleComposerLeg,
} from "./route-sanity";

// ─── Public input / output ────────────────────────────────────────────────

export type StudioRhythm = "slow" | "balanced" | "full";
export type StudioInterest = "wine" | "coast" | "culture" | "gastronomy" | "wellness" | "hidden";
export type StudioWho = "solo" | "couple" | "family" | "friends";
export type StudioBudgetTier = "essential" | "signature" | "rare";

export interface ComposeInput {
  region: RegionKey;
  rhythm: StudioRhythm;
  interests: StudioInterest[];
  who: StudioWho;
  /** Ages of any minors in the party. Empty = adult-only party. */
  minorAges: number[];
  budgetTier: StudioBudgetTier;
  /** ISO weekday, 1=Mon … 7=Sun. */
  weekday: number;
  /** 1–12. */
  month: number;
}

export interface ComposedStop {
  id: string;
  name: string;
  kind: StopKind;
  coords: { lat: number; lng: number };
  dwellMin: number;
  blurb: string;
  /** Per-stop reason string used by the "Why this fits you" surface. */
  rationale: string;
  /** Straight-line km from the previous stop (0 for the first). */
  legKm: number;
  /** Estimated driving minutes from the previous stop (0 for the first). */
  legDriveMin: number;
}

export interface ComposedJourney {
  region: RegionKey;
  originLabel: string;
  stops: ComposedStop[];
  totals: {
    driveMin: number;
    dwellMin: number;
    dayMin: number;
    /** Longest single hop, km — for eyeballing composition quality. */
    maxHopKm: number;
  };
  warnings: string[];
  /** Ordered snapshot of the ids picked — the stable identity of this journey. */
  stopIdSequence: string[];
}

// ─── Interest → RegionStop.affinity.style mapping ─────────────────────────
// The RegionStop affinity model uses 4 style buckets (coast / heritage /
// wine / table). Interests are the traveller-facing vocabulary and map
// onto that model. "wellness" and "hidden" have no direct style match and
// influence composition through their own scoring hooks below.
const INTEREST_STYLES: Record<
  StudioInterest,
  ReadonlyArray<"coast" | "heritage" | "wine" | "table">
> = {
  wine: ["wine"],
  coast: ["coast"],
  culture: ["heritage"],
  gastronomy: ["table"],
  wellness: [],
  hidden: [],
};

const RHYTHM_ENERGY: Record<StudioRhythm, "slow" | "vivid"> = {
  slow: "slow",
  balanced: "slow", // still leans calm
  full: "vivid",
};

const RHYTHM_STOP_TARGET: Record<StudioRhythm, number> = {
  slow: 3,
  balanced: 4,
  full: 5,
};

// ─── Filtering ────────────────────────────────────────────────────────────

function passesFamilyGate(stop: RegionStop, minorAges: number[]): boolean {
  if (minorAges.length === 0) return true;
  // `childFriendly === false` is an explicit "no kids". Undefined = allow.
  if (stop.childFriendly === false) return false;
  // Wine cellars are treated as adult-focused when very young children are present.
  const youngest = Math.min(...minorAges);
  if (youngest < 8 && (stop.kind === "winery" || stop.kind === "cellar")) return false;
  return true;
}

function passesSeasonGate(stop: RegionStop, month: number): boolean {
  if (!stop.seasonalMonths) return true;
  const { from, to } = stop.seasonalMonths;
  return month >= from && month <= to;
}

function passesWeekdayGate(stop: RegionStop, weekday: number): boolean {
  return !stop.closedDays.includes(weekday);
}

function hasValidCoords(stop: RegionStop): boolean {
  const { lat, lng } = stop.coords;
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 0.0001 && Math.abs(lng) > 0.0001
  );
}

// ─── Scoring ──────────────────────────────────────────────────────────────

interface ScoreBreakdown {
  interest: number;
  rhythm: number;
  who: number;
  budget: number;
  priorityTiebreak: number;
  total: number;
  matchedInterests: StudioInterest[];
}

function scoreStop(stop: RegionStop, input: ComposeInput): ScoreBreakdown {
  const matchedInterests: StudioInterest[] = [];
  let interest = 0;

  for (const it of input.interests) {
    const styles = INTEREST_STYLES[it];
    if (styles.length > 0 && styles.some((s) => stop.affinity.style?.includes(s))) {
      interest += 6;
      matchedInterests.push(it);
    }
    // "hidden" rewards low-priority (less-visited) stops.
    if (it === "hidden") {
      interest += Math.max(0, (7 - stop.priority) * 0.8);
    }
    // "wellness" rewards slow-energy, intimate stops.
    if (it === "wellness") {
      if (stop.affinity.energy?.includes("slow")) interest += 1.5;
      if (stop.affinity.social?.includes("intimate")) interest += 1.2;
    }
  }

  const targetEnergy = RHYTHM_ENERGY[input.rhythm];
  const rhythm = stop.affinity.energy?.includes(targetEnergy) ? 3 : 0;

  // RegionStop companions vocabulary uses "group" for what the traveller-facing
  // Studio calls "friends"; map before matching.
  const companion = input.who === "friends" ? "group" : input.who;
  const who = stop.affinity.companions?.includes(companion) ? 2 : 0;

  // Budget: no `tier` field on RegionStop, so proxy via editorial `priority`.
  // Higher-priority (marquee) stops fit "signature"/"rare" better; lower-
  // priority (quieter) stops fit "essential" better.
  let budget = 0;
  if (input.budgetTier === "rare" && stop.priority >= 8) budget = 2;
  else if (input.budgetTier === "signature" && stop.priority >= 7) budget = 1.5;
  else if (input.budgetTier === "essential" && stop.priority <= 7) budget = 1;

  const priorityTiebreak = stop.priority * 0.6;

  return {
    interest,
    rhythm,
    who,
    budget,
    priorityTiebreak,
    total: interest + rhythm + who + budget + priorityTiebreak,
    matchedInterests,
  };
}

// ─── Rationale ────────────────────────────────────────────────────────────

function buildRationale(input: ComposeInput, breakdown: ScoreBreakdown, stop: RegionStop): string {
  const parts: string[] = [];
  if (breakdown.matchedInterests.length > 0) {
    const label = breakdown.matchedInterests[0];
    parts.push(`Picked for your ${label} focus`);
  } else {
    parts.push(`A ${stop.kind} that fits the day's shape`);
  }
  if (breakdown.rhythm > 0) parts.push(`${input.rhythm} rhythm`);
  if (breakdown.who > 0) parts.push(`suits ${input.who} travel`);
  return parts.join(" · ");
}

// ─── Assembly ─────────────────────────────────────────────────────────────

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

/** Simulate a full day (drive + dwell + return to origin). */
function simulateDay(
  stops: RegionStop[],
  origin: { lat: number; lng: number },
): { drive: number; dwell: number; maxHopKm: number } {
  let drive = 0;
  let dwell = 0;
  let maxHopKm = 0;
  let prev: { lat: number; lng: number } = { lat: origin.lat, lng: origin.lng };
  for (const s of stops) {
    const km = haversineKm(prev, s.coords);
    if (km > maxHopKm) maxHopKm = km;
    drive += haversineDriveMinutes(km);
    dwell += s.dwellMin;
    prev = s.coords;
  }
  if (stops.length > 0) drive += haversineDriveMinutes(haversineKm(prev, origin));
  return { drive, dwell, maxHopKm };
}

export function composeStudioJourney(input: ComposeInput): ComposedJourney {
  const warnings: string[] = [];
  const rules = REGION_RULES[input.region];
  const origin = REGION_ORIGIN[input.region];
  const overheadMin = 60; // pickup + dropoff overhead

  const dayBudget =
    input.rhythm === "slow" ? rules.dayLengthMinutes.near : rules.dayLengthMinutes.far;

  // 1. Pool → filter.
  const pool = REGION_STOPS.filter((s) => s.region === input.region)
    .filter(hasValidCoords)
    .filter((s) => passesWeekdayGate(s, input.weekday))
    .filter((s) => passesSeasonGate(s, input.month))
    .filter((s) => passesFamilyGate(s, input.minorAges));

  if (pool.length === 0) {
    return {
      region: input.region,
      originLabel: origin.label,
      stops: [],
      totals: { driveMin: 0, dwellMin: 0, dayMin: 0, maxHopKm: 0 },
      warnings: ["No stops available in this region for the given day."],
      stopIdSequence: [],
    };
  }

  // 2. Score & sort.
  const scored = pool
    .map((stop) => ({ stop, breakdown: scoreStop(stop, input) }))
    .sort((a, b) => b.breakdown.total - a.breakdown.total);

  // 3. Greedy assembly with diversity penalty & operational caps.
  const kindUsed: Partial<Record<StopKind, number>> = {};
  const picked: Array<{ stop: RegionStop; breakdown: ScoreBreakdown }> = [];
  const targetStops = Math.min(RHYTHM_STOP_TARGET[input.rhythm], rules.maxStops);

  const remaining = [...scored];
  while (picked.length < targetStops && remaining.length > 0) {
    // Re-rank remaining by score minus diversity penalty for kinds already used.
    remaining.sort((a, b) => {
      const penA = (kindUsed[a.stop.kind] ?? 0) * 4;
      const penB = (kindUsed[b.stop.kind] ?? 0) * 4;
      return b.breakdown.total - penB - (a.breakdown.total - penA);
    });

    let chosenIdx = -1;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const cap = rules.kindCaps[cand.stop.kind];
      if (cap !== undefined && (kindUsed[cand.stop.kind] ?? 0) >= cap) continue;

      // Tentative sim in time-of-day order.
      const tentative = [...picked.map((p) => p.stop), cand.stop].sort(
        (a, b) => preferredSlot(a) - preferredSlot(b),
      );

      // Leg-sanity guard: reject if any leg would exceed the composer ceiling.
      let legOk = true;
      let prev: { lat: number; lng: number } = { lat: origin.lat, lng: origin.lng };
      for (const s of tentative) {
        if (!isPlausibleComposerLeg(prev, s.coords)) {
          legOk = false;
          break;
        }
        prev = s.coords;
      }
      if (!legOk) continue;

      const sim = simulateDay(tentative, origin);
      if (sim.drive > rules.maxDriveMinutes) continue;
      if (sim.drive + sim.dwell + overheadMin > dayBudget) continue;

      chosenIdx = i;
      break;
    }

    if (chosenIdx === -1) break;
    const [chosen] = remaining.splice(chosenIdx, 1);
    picked.push(chosen);
    kindUsed[chosen.stop.kind] = (kindUsed[chosen.stop.kind] ?? 0) + 1;
  }

  // 4. Final ordering by time-of-day (stable on ties).
  picked.sort((a, b) => preferredSlot(a.stop) - preferredSlot(b.stop));

  // 5. Warnings.
  if (picked.length < rules.minStops) {
    warnings.push(
      `Only ${picked.length} stops fit — consider relaxing the day or picking another region.`,
    );
  }

  // 6. Build per-stop output with legs.
  const sim = simulateDay(
    picked.map((p) => p.stop),
    origin,
  );
  const composed: ComposedStop[] = [];
  let prev: { lat: number; lng: number } = origin;
  for (const { stop, breakdown } of picked) {
    const km = haversineKm(prev, stop.coords);
    composed.push({
      id: stop.id,
      name: stop.name,
      kind: stop.kind,
      coords: stop.coords,
      dwellMin: stop.dwellMin,
      blurb: stop.blurb,
      rationale: buildRationale(input, breakdown, stop),
      legKm: +km.toFixed(2),
      legDriveMin: haversineDriveMinutes(km),
    });
    prev = stop.coords;
  }

  if (sim.maxHopKm > COMPOSER_MAX_LEG_KM) {
    warnings.push(
      `Longest hop is ${sim.maxHopKm.toFixed(1)} km — above the ${COMPOSER_MAX_LEG_KM} km composer ceiling.`,
    );
  }

  return {
    region: input.region,
    originLabel: origin.label,
    stops: composed,
    totals: {
      driveMin: sim.drive,
      dwellMin: sim.dwell,
      dayMin: sim.drive + sim.dwell + overheadMin,
      maxHopKm: +sim.maxHopKm.toFixed(2),
    },
    warnings,
    stopIdSequence: composed.map((s) => s.id),
  };
}
