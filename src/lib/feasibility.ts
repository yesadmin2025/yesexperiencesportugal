/**
 * Shared time-feasibility rules for Tailor + Builder.
 *
 * One source of truth for "does this day make sense?" — dwell minimums,
 * driving caps, and the soft rules that make Portuguese day-tours work
 * (boat trips eat half the day, max 3 wineries with lunch in between,
 * Sintra queues, etc.).
 *
 * Used by:
 *   - /tours/$tourId/tailor   — to warn when the user packs too much
 *   - studio-v2 itinerary     — to refuse silly compositions
 *
 * Stop categories are detected from a short tag list ("winery", "lunch",
 * "boat"…) so the same engine works for Tailor blueprints AND Builder
 * pool stops without coupling either side to the other's schema.
 */

export type StopCategory =
  | "winery"
  | "lunch"
  | "boat"
  | "monument" // palace, monastery, convent — interior visit with queues
  | "viewpoint" // cristo rei, miradouro, cabo — short stop, no ticket
  | "market"
  | "beach"
  | "picnic"
  | "village" // azeitão, óbidos, sintra vila — slow walk
  | "workshop" // tile painting, cheese making
  | "drive-by"; // pass-by only, e.g. ponte 25 de abril

/** Minimum minutes each category needs to be a real, unhurried stop. */
export const DWELL_MINIMUM_MIN: Record<StopCategory, number> = {
  winery: 90,
  lunch: 75,
  boat: 150, // shortest Arrábida boat is ~2h plus boarding
  monument: 60,
  viewpoint: 20,
  market: 30,
  beach: 90,
  picnic: 90,
  village: 45,
  workshop: 75,
  "drive-by": 0,
};

/** Day envelope and hard caps. Mirror builder_routing_rules defaults. */
export const DAY_CAPS = {
  /** 09:00 → 19:00 — what Viator quotes as a "full day". */
  envelopeMinutes: 600,
  maxDrivingMinutes: 180,
  maxExperienceMinutes: 480,
  /** Cushion added to every drive segment for parking, finding the door, etc. */
  driveBufferMinutes: 10,
  minStops: 3,
  maxStops: 6,
} as const;

export interface FeasibilityStop {
  /** Stable id for warnings — e.g. blueprint stop key or builder_stops.key. */
  id: string;
  label: string;
  category: StopCategory;
  /** Override dwell when the operator confirms shorter/longer than the
   *  category default (e.g. a quick tasting flight at 60 min). */
  dwellMinutesOverride?: number;
  /** Real driving minutes from the previous stop (OSRM where available;
   *  haversine fallback). The first stop is `0`. */
  drivingFromPrevMinutes?: number;
}

export interface DayPlan {
  stops: FeasibilityStop[];
}

export interface FeasibilityResult {
  feasible: boolean;
  totalMinutes: number;
  experienceMinutes: number;
  drivingMinutes: number;
  warnings: string[];
}

const dwellOf = (s: FeasibilityStop): number =>
  s.dwellMinutesOverride ?? DWELL_MINIMUM_MIN[s.category];

/**
 * Score a candidate day and return warnings to surface in the UI.
 * `feasible: false` does NOT mean we block the user — Tailor lets them
 * proceed with warnings; Builder downgrades the composition score.
 */
export function evaluateDay(plan: DayPlan): FeasibilityResult {
  const warnings: string[] = [];
  let experienceMinutes = 0;
  let drivingMinutes = 0;

  for (const s of plan.stops) {
    experienceMinutes += dwellOf(s);
    if (s.drivingFromPrevMinutes && s.drivingFromPrevMinutes > 0) {
      drivingMinutes += s.drivingFromPrevMinutes + DAY_CAPS.driveBufferMinutes;
    }
  }
  const totalMinutes = experienceMinutes + drivingMinutes;

  let feasible = true;

  if (plan.stops.length < DAY_CAPS.minStops) {
    warnings.push(`A full day usually has at least ${DAY_CAPS.minStops} stops.`);
  }
  if (plan.stops.length > DAY_CAPS.maxStops) {
    feasible = false;
    warnings.push(
      `That's ${plan.stops.length} stops — comfortable days top out at ${DAY_CAPS.maxStops}.`,
    );
  }
  if (drivingMinutes > DAY_CAPS.maxDrivingMinutes) {
    feasible = false;
    warnings.push(
      `Driving time is about ${Math.round(drivingMinutes / 60)}h — over the ${Math.round(
        DAY_CAPS.maxDrivingMinutes / 60,
      )}h cap for a single day.`,
    );
  }
  if (experienceMinutes > DAY_CAPS.maxExperienceMinutes) {
    feasible = false;
    warnings.push(
      `Stops add up to about ${Math.round(experienceMinutes / 60)}h on the ground — trim one to keep the day unhurried.`,
    );
  }
  if (totalMinutes > DAY_CAPS.envelopeMinutes) {
    feasible = false;
    warnings.push(`This day runs past the 10-hour envelope — something has to give.`);
  }

  // ── Boat rule ───────────────────────────────────────────────
  const boats = plan.stops.filter((s) => s.category === "boat");
  if (boats.length > 0) {
    const longOthers = plan.stops.filter(
      (s) => s.category !== "boat" && isLongStop(s.category),
    );
    if (longOthers.length > 1) {
      feasible = false;
      warnings.push(
        `A boat trip already takes 2–3 hours — pair it with at most one other long stop (winery, lunch or monument).`,
      );
    }
    if (plan.stops.length > 4) {
      feasible = false;
      warnings.push(
        `With the boat included, keep the day to 4 stops maximum so nothing feels rushed.`,
      );
    }
  }

  // ── Wine rule ───────────────────────────────────────────────
  const wineries = plan.stops.filter((s) => s.category === "winery");
  if (wineries.length > 3) {
    feasible = false;
    warnings.push(`Three wineries is the safe maximum — palate fatigue past that point.`);
  }
  if (wineries.length >= 2) {
    const hasLunch = plan.stops.some((s) => s.category === "lunch");
    if (!hasLunch) {
      warnings.push(`Add lunch between the wineries — tasting on an empty stomach is rough.`);
    }
  }

  // ── Sintra rule ─────────────────────────────────────────────
  const monuments = plan.stops.filter((s) => s.category === "monument");
  if (monuments.length > 2) {
    feasible = false;
    warnings.push(
      `Two monument interiors per day is the limit — queues and dwell times stack up quickly.`,
    );
  }

  return { feasible, totalMinutes, experienceMinutes, drivingMinutes, warnings };
}

function isLongStop(c: StopCategory): boolean {
  return c === "winery" || c === "lunch" || c === "monument" || c === "workshop";
}

/** Convenience: dwell minutes for an array of categories — used by the
 *  Tailor "Day timing" strip when we don't have real drive segments yet. */
export function estimateExperienceMinutes(stops: FeasibilityStop[]): number {
  return stops.reduce((acc, s) => acc + dwellOf(s), 0);
}
