/**
 * Logic engine for the Experience Builder.
 * Server-only: pure functions, no React, no fetch. Called from
 * createServerFn handlers.
 *
 * Hard rules:
 *  - max experience hours (from builder_routing_rules)
 *  - max driving hours (sum of segment drive times)
 *  - region grouping (route stays inside one region key)
 *  - stop compatibility (compatible_with hints boost adjacency)
 *  - pace logic (relaxed shrinks count, full grows count)
 *
 * The engine is deterministic given the same input + DB state.
 * No randomness from the AI layer touches route shape.
 */

export type Mood = "slow" | "curious" | "romantic" | "open" | "energetic";
export type Pace = "relaxed" | "balanced" | "full";
export type Who = "couple" | "family" | "friends" | "solo" | "corporate" | "group";
export type Intention =
  | "wine"
  | "gastronomy"
  | "nature"
  | "heritage"
  | "coast"
  | "hidden"
  | "wonder"
  | "wellness";

export interface BuilderInput {
  mood: Mood;
  who: Who;
  intention: Intention;
  // Optional explicit region; otherwise the engine picks the best fit.
  regionKey?: string;
  pace?: Pace;
  // Stops the user has already locked in (keys). Engine keeps them and
  // fills the rest, respecting hard rules.
  pinnedStopKeys?: string[];
  // Stops the user explicitly removed. Never include them.
  excludedStopKeys?: string[];
}

export interface StopRow {
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
  compatible_with: string[];
  weight: number;
  // Real-Viator-data fields (Phase 2 schema)
  canonical_key?: string | null;
  variant_bucket?: string | null;
  variant_label?: string | null;
  source_tour_keys?: string[];
}

/** Co-occurrence pair from builder_compatibility_rules. */
export interface CompatibilityRule {
  stop_a: string; // canonical_key
  stop_b: string; // canonical_key
  cooccurrence_count: number;
}

export interface RegionRow {
  key: string;
  label: string;
  blurb: string | null;
  lat: number;
  lng: number;
}

export interface RoutingRules {
  max_experience_hours: number;
  max_driving_hours: number;
  min_stops: number;
  max_stops: number;
  default_pace: string;
  base_price_per_person_eur: number;
  pace_multiplier_relaxed: number;
  pace_multiplier_balanced: number;
  pace_multiplier_full: number;
  /** Max km between any two consecutive stops in a day. */
  max_km_between_stops: number;
  /** Max total driving km for one day. */
  max_total_km_per_day: number;
}

export interface RoutedStop extends StopRow {
  driveMinutesFromPrev: number;
}

export interface BuilderRoute {
  region: RegionRow;
  pace: Pace;
  stops: RoutedStop[];
  totals: {
    experienceMinutes: number;
    drivingMinutes: number;
    stopMinutes: number;
  };
  pricePerPersonEur: number;
  feasible: boolean;
  warnings: string[];
}

// ---------- math ----------
const KM_PER_DEG_LAT = 111;
const AVG_KMH = 70; // Portuguese highways + N-roads blended
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}
function driveMinutesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  // 1.25x detour factor over haversine to approximate real roads
  const km = haversineKm(a, b) * 1.25;
  return Math.round((km / AVG_KMH) * 60);
}
const _kmPerDegLat = KM_PER_DEG_LAT; // kept for tooling; not exported

// ---------- region picker ----------
// New region keys (post-Phase 2): arrabida-setubal, troia-comporta,
// sintra-cascais, evora-alentejo, centro-tomar-coimbra,
// centro-fatima-nazare-obidos. Legacy keys kept for backwards-compat scoring.
const INTENTION_REGION_BIAS: Record<Intention, Record<string, number>> = {
  wine: {
    "evora-alentejo": 4,
    "arrabida-setubal": 3,
    "troia-comporta": 2,
    "sintra-cascais": 1,
  },
  gastronomy: {
    "arrabida-setubal": 3,
    "troia-comporta": 3,
    "evora-alentejo": 3,
    "sintra-cascais": 2,
  },
  nature: {
    "arrabida-setubal": 3,
    "troia-comporta": 3,
    "centro-fatima-nazare-obidos": 2,
    "sintra-cascais": 2,
  },
  heritage: {
    "centro-tomar-coimbra": 4,
    "evora-alentejo": 3,
    "sintra-cascais": 3,
    "centro-fatima-nazare-obidos": 3,
  },
  coast: {
    "troia-comporta": 4,
    "sintra-cascais": 3,
    "arrabida-setubal": 3,
    "centro-fatima-nazare-obidos": 2,
  },
  hidden: {
    "troia-comporta": 3,
    "evora-alentejo": 3,
    "arrabida-setubal": 2,
    "centro-tomar-coimbra": 2,
  },
  wonder: {
    "sintra-cascais": 4,
    "centro-fatima-nazare-obidos": 3,
    "centro-tomar-coimbra": 2,
    "arrabida-setubal": 2,
  },
  wellness: {
    "troia-comporta": 3,
    "arrabida-setubal": 3,
    "evora-alentejo": 2,
    "sintra-cascais": 2,
  },
};

export function pickRegion(input: BuilderInput, regions: RegionRow[]): RegionRow {
  if (input.regionKey) {
    const found = regions.find((r) => r.key === input.regionKey);
    if (found) return found;
  }
  const bias = INTENTION_REGION_BIAS[input.intention] ?? {};
  let best = regions[0];
  let bestScore = -1;
  for (const r of regions) {
    const score = bias[r.key] ?? 0;
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}

// ---------- pace -> stop count + variant bucket ----------
export function paceToTargetStops(pace: Pace, rules: RoutingRules) {
  const min = rules.min_stops;
  const max = rules.max_stops;
  if (pace === "relaxed") return Math.max(min, Math.min(max, min + 1)); // 4
  if (pace === "full") return Math.min(max, max); // 6
  return Math.max(min, Math.min(max, min + 2)); // 5
}

/**
 * Pace → preferred variant bucket, with fallback order so we always find
 * *some* variant of a canonical stop even when the preferred bucket isn't
 * seeded for it.
 *   relaxed → deep first (long, immersive visits)
 *   balanced → medium first (standard tour pacing)
 *   full → short first (more stops, shorter dwells)
 */
export function paceToVariantPreference(pace: Pace): string[] {
  if (pace === "relaxed") return ["deep", "extended", "medium", "short"];
  if (pace === "full") return ["short", "medium", "deep", "extended"];
  return ["medium", "short", "deep", "extended"];
}

// ---------- scoring ----------
// New whos (corporate, group) are scored as "friends" until DB tags catch up.
function whoForScoring(who: Who): Who {
  if (who === "corporate" || who === "group") return "friends";
  return who;
}
function scoreStop(stop: StopRow, input: BuilderInput): number {
  let s = stop.weight;
  if (stop.mood_tags.includes(input.mood)) s += 30;
  if (stop.who_tags.includes(whoForScoring(input.who))) s += 20;
  if (stop.intention_tags.includes(input.intention)) s += 35;
  if (input.pace && stop.pace_tags.includes(input.pace)) s += 10;
  return s;
}

/**
 * Pick the best variant of each canonical stop given the requested pace.
 * Reduces a list of variants (multiple rows sharing canonical_key) down to
 * one row per canonical_key, choosing the bucket that best matches the pace
 * preference and falling back through the list when needed.
 */
export function selectVariantsForPace(stops: StopRow[], pace: Pace): StopRow[] {
  const preference = paceToVariantPreference(pace);
  const byCanonical = new Map<string, StopRow[]>();
  for (const s of stops) {
    const k = s.canonical_key ?? s.key;
    const arr = byCanonical.get(k);
    if (arr) arr.push(s);
    else byCanonical.set(k, [s]);
  }
  const out: StopRow[] = [];
  for (const variants of byCanonical.values()) {
    if (variants.length === 1) {
      out.push(variants[0]);
      continue;
    }
    let picked: StopRow | undefined;
    for (const bucket of preference) {
      picked = variants.find((v) => v.variant_bucket === bucket);
      if (picked) break;
    }
    out.push(picked ?? variants[0]);
  }
  return out;
}

/**
 * Build a co-occurrence map keyed by canonical_key for O(1) adjacency
 * scoring. Symmetric: rule (a,b,n) means both a→b and b→a get +n.
 */
export function buildCompatibilityIndex(
  rules: CompatibilityRule[],
): Map<string, Map<string, number>> {
  const idx = new Map<string, Map<string, number>>();
  const bump = (a: string, b: string, n: number) => {
    let inner = idx.get(a);
    if (!inner) {
      inner = new Map();
      idx.set(a, inner);
    }
    inner.set(b, (inner.get(b) ?? 0) + n);
  };
  for (const r of rules) {
    bump(r.stop_a, r.stop_b, r.cooccurrence_count);
    bump(r.stop_b, r.stop_a, r.cooccurrence_count);
  }
  return idx;
}

function canonicalOf(s: StopRow): string {
  return s.canonical_key ?? s.key;
}

function compatibilityBoost(
  candidate: StopRow,
  chosen: StopRow[],
  index: Map<string, Map<string, number>>,
): number {
  if (chosen.length === 0) return 0;
  const cKey = canonicalOf(candidate);
  const inner = index.get(cKey);
  if (!inner) return 0;
  let boost = 0;
  for (const c of chosen) {
    const n = inner.get(canonicalOf(c));
    if (n) boost += Math.min(40, n * 12); // capped per pair
  }
  return boost;
}

// ---------- nearest-neighbor ordering ----------
function orderByNearestNeighbor(start: { lat: number; lng: number }, stops: StopRow[]): StopRow[] {
  if (stops.length <= 1) return stops.slice();
  const remaining = stops.slice();
  const ordered: StopRow[] = [];
  let cursor = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(cursor, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cursor = next;
  }
  return ordered;
}

// ---------- main: generate ----------
export function generateRoute(
  input: BuilderInput,
  regions: RegionRow[],
  allStops: StopRow[],
  rules: RoutingRules,
  compatibilityRules: CompatibilityRule[] = [],
): BuilderRoute {
  const region = pickRegion(input, regions);
  const pace: Pace = input.pace ?? (rules.default_pace as Pace) ?? "balanced";

  const excluded = new Set(input.excludedStopKeys ?? []);
  const pinnedKeys = new Set(input.pinnedStopKeys ?? []);

  // 1. Region pool, then exclude.
  const regionPool = allStops
    .filter((s) => s.region_key === region.key)
    .filter((s) => !excluded.has(s.key));

  // 2. Pinned stops bypass variant selection — they're explicit user choices.
  const pinned = regionPool.filter((s) => pinnedKeys.has(s.key));
  const pinnedCanonicals = new Set(pinned.map((p) => canonicalOf(p)));

  // 3. Reduce remaining variants to one row per canonical_key, picking the
  //    bucket that matches the requested pace. Drop any canonical_key
  //    already covered by a pinned stop so we don't duplicate places.
  const reducible = regionPool.filter(
    (s) => !pinnedKeys.has(s.key) && !pinnedCanonicals.has(canonicalOf(s)),
  );
  const reduced = selectVariantsForPace(reducible, pace);

  // 4. Build compatibility index (canonical-keyed) once.
  const compatIndex = buildCompatibilityIndex(compatibilityRules);

  // 5. Base score (mood/who/intention/pace) computed once per candidate.
  const scored = reduced
    .map((s) => ({ s, base: scoreStop(s, input) }))
    .sort((a, b) => b.base - a.base);

  // 6. Hard-rule filling with compatibility-aware selection.
  const target = paceToTargetStops(pace, rules);
  const maxExpMin = rules.max_experience_hours * 60;
  const maxDriveMin = rules.max_driving_hours * 60;

  const chosen: StopRow[] = [...pinned];
  const trySequence = (seq: StopRow[]) => {
    const ordered = orderByNearestNeighbor(region, seq);
    let drive = 0;
    let stay = 0;
    let cursor: { lat: number; lng: number } = region;
    for (const s of ordered) {
      drive += driveMinutesBetween(cursor, s);
      stay += s.duration_minutes;
      cursor = s;
    }
    return { ordered, drive, stay, total: drive + stay };
  };

  // Greedy: at each step, re-rank remaining candidates by
  // base score + compatibility boost vs already-chosen, then pick the best
  // one that still fits within hard limits.
  const remaining = scored.slice();
  while (chosen.length < target && remaining.length) {
    let bestIdx = -1;
    let bestComposite = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const composite = cand.base + compatibilityBoost(cand.s, chosen, compatIndex);
      if (composite > bestComposite) {
        bestComposite = composite;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    const cand = remaining.splice(bestIdx, 1)[0];
    const trial = [...chosen, cand.s];
    const t = trySequence(trial);
    if (t.total <= maxExpMin && t.drive <= maxDriveMin) {
      chosen.push(cand.s);
    }
  }

  // 7. Floor: ensure min_stops; if pinned/excluded made it too small, pad
  //    with best-fit ignoring intention tags last (still respecting variant
  //    reduction so we never repeat a canonical place).
  if (chosen.length < rules.min_stops) {
    const chosenCanonicals = new Set(chosen.map(canonicalOf));
    const fallback = reduced
      .filter((s) => !chosen.includes(s) && !chosenCanonicals.has(canonicalOf(s)))
      .sort((a, b) => b.weight - a.weight);
    for (const s of fallback) {
      if (chosen.length >= rules.min_stops) break;
      const t = trySequence([...chosen, s]);
      if (t.total <= maxExpMin && t.drive <= maxDriveMin) {
        chosen.push(s);
      } else {
        break;
      }
    }
  }

  // 8. Final ordering and totals.
  const finalSeq = trySequence(chosen);
  let prev: { lat: number; lng: number } = region;
  const routedStops: RoutedStop[] = finalSeq.ordered.map((s) => {
    const d = driveMinutesBetween(prev, s);
    prev = s;
    return { ...s, driveMinutesFromPrev: d };
  });

  // 9. Price.
  const paceMult =
    pace === "relaxed"
      ? rules.pace_multiplier_relaxed
      : pace === "full"
        ? rules.pace_multiplier_full
        : rules.pace_multiplier_balanced;
  const stopFactor = 1 + (routedStops.length - rules.min_stops) * 0.08;
  const pricePerPersonEur = Math.round(rules.base_price_per_person_eur * paceMult * stopFactor);

  const warnings: string[] = [];
  if (routedStops.length < rules.min_stops) warnings.push("Fewer stops than ideal for this pace.");
  if (finalSeq.drive > maxDriveMin) warnings.push("Driving time exceeds the comfortable maximum.");

  return {
    region,
    pace,
    stops: routedStops,
    totals: {
      drivingMinutes: finalSeq.drive,
      stopMinutes: finalSeq.stay,
      experienceMinutes: finalSeq.total,
    },
    pricePerPersonEur,
    feasible:
      finalSeq.total <= maxExpMin &&
      finalSeq.drive <= maxDriveMin &&
      routedStops.length >= rules.min_stops,
    warnings,
  };
}

// ---------- deterministic narrative fallback ----------
export function fallbackNarrative(route: BuilderRoute, input: BuilderInput): string {
  const moodWord =
    input.mood === "slow"
      ? "unhurried"
      : input.mood === "romantic"
        ? "intimate"
        : input.mood === "curious"
          ? "curious"
          : input.mood === "open"
            ? "wide-open"
            : "energetic";
  const intentionWord =
    input.intention === "wine"
      ? "wine"
      : input.intention === "gastronomy"
        ? "long, generous lunches"
        : input.intention === "nature"
          ? "nature"
          : input.intention === "heritage"
            ? "old stone and story"
            : input.intention === "coast"
              ? "the coast"
              : input.intention === "hidden"
                ? "the quiet, lesser-known corners"
                : input.intention === "wonder"
                  ? "places that make you stop and look"
                  : "ease and silence";
  const placeList = route.stops.slice(0, 3).map((s) => s.label).join(", ");
  return `An ${moodWord} day across ${route.region.label} — built around ${intentionWord}. You'll move through ${placeList}${route.stops.length > 3 ? ", and a few more" : ""}, at a ${route.pace} rhythm.`;
}

// ---------- multi-day add-stop validation ----------

export interface DayState {
  /** Ordered stops currently in the day (already chosen by the user). */
  stopKeys: string[];
}

export interface StopEligibility {
  key: string;
  eligible: boolean;
  reason?: string;
  kmFromLastStop: number;
  driveMinutesFromLastStop: number;
  projectedTotalKm: number;
  projectedExperienceMinutes: number;
}

/**
 * Compute eligibility of every candidate stop for being appended to the
 * current day, given the routing rules. A stop is eligible when:
 *  - in the same region as the day
 *  - not already in the day
 *  - within max_km_between_stops of the last stop (or region center if empty)
 *  - adding it keeps total km <= max_total_km_per_day
 *  - adding it keeps experience minutes <= max_experience_hours * 60
 *  - adding it keeps driving minutes <= max_driving_hours * 60
 */
export function computeDayEligibility(
  day: DayState,
  regionKey: string,
  region: { lat: number; lng: number },
  allStops: StopRow[],
  rules: RoutingRules,
): StopEligibility[] {
  const inDay = new Set(day.stopKeys);
  const dayStops = day.stopKeys
    .map((k) => allStops.find((s) => s.key === k))
    .filter((s): s is StopRow => Boolean(s));

  // Current totals
  let currentDriveMin = 0;
  let currentDriveKm = 0;
  let currentStayMin = 0;
  let cursor: { lat: number; lng: number } = region;
  for (const s of dayStops) {
    const km = haversineKm(cursor, s) * 1.25;
    currentDriveKm += km;
    currentDriveMin += Math.round((km / AVG_KMH) * 60);
    currentStayMin += s.duration_minutes;
    cursor = s;
  }
  const last = cursor;

  const maxExpMin = rules.max_experience_hours * 60;
  const maxDriveMin = rules.max_driving_hours * 60;

  return allStops
    .filter((s) => s.region_key === regionKey)
    .map((s) => {
      const km = haversineKm(last, s) * 1.25;
      const driveMin = Math.round((km / AVG_KMH) * 60);
      const projectedKm = currentDriveKm + km;
      const projectedExp = currentDriveMin + driveMin + currentStayMin + s.duration_minutes;
      const projectedDrive = currentDriveMin + driveMin;

      let reason: string | undefined;
      let eligible = true;
      if (inDay.has(s.key)) {
        eligible = false;
        reason = "already in this day";
      } else if (km > rules.max_km_between_stops) {
        eligible = false;
        reason = `${Math.round(km)} km from last stop — over ${rules.max_km_between_stops} km limit`;
      } else if (projectedKm > rules.max_total_km_per_day) {
        eligible = false;
        reason = `would push the day past ${rules.max_total_km_per_day} km of driving`;
      } else if (projectedExp > maxExpMin) {
        eligible = false;
        reason = `would exceed ${rules.max_experience_hours}h of experience time`;
      } else if (projectedDrive > maxDriveMin) {
        eligible = false;
        reason = `would exceed ${rules.max_driving_hours}h of driving`;
      }
      return {
        key: s.key,
        eligible,
        reason,
        kmFromLastStop: Math.round(km * 10) / 10,
        driveMinutesFromLastStop: driveMin,
        projectedTotalKm: Math.round(projectedKm * 10) / 10,
        projectedExperienceMinutes: projectedExp,
      };
    });
}

/**
 * Build a feasible BuilderRoute from an arbitrary, user-chosen ordered list
 * of stop keys. Used by the multi-day live builder where the user — not the
 * engine — picks the stops. Computes drive times, totals, price, feasibility.
 */
export function buildRouteFromStopKeys(
  stopKeys: string[],
  regionKey: string,
  pace: Pace,
  regions: RegionRow[],
  allStops: StopRow[],
  rules: RoutingRules,
): BuilderRoute {
  const region =
    regions.find((r) => r.key === regionKey) ?? regions[0];
  const stopsInOrder = stopKeys
    .map((k) => allStops.find((s) => s.key === k))
    .filter((s): s is StopRow => Boolean(s));

  let drive = 0;
  let driveKm = 0;
  let stay = 0;
  let prev: { lat: number; lng: number } = region;
  const routedStops: RoutedStop[] = stopsInOrder.map((s) => {
    const km = haversineKm(prev, s) * 1.25;
    const d = Math.round((km / AVG_KMH) * 60);
    drive += d;
    driveKm += km;
    stay += s.duration_minutes;
    prev = s;
    return { ...s, driveMinutesFromPrev: d };
  });

  const paceMult =
    pace === "relaxed"
      ? rules.pace_multiplier_relaxed
      : pace === "full"
        ? rules.pace_multiplier_full
        : rules.pace_multiplier_balanced;
  const stopFactor = Math.max(1, 1 + (routedStops.length - rules.min_stops) * 0.08);
  const pricePerPersonEur = Math.round(rules.base_price_per_person_eur * paceMult * stopFactor);

  const maxExpMin = rules.max_experience_hours * 60;
  const maxDriveMin = rules.max_driving_hours * 60;

  const warnings: string[] = [];
  // Per-segment radius check (catches infeasible reorders)
  let cursor: { lat: number; lng: number } = region;
  for (let i = 0; i < stopsInOrder.length; i++) {
    const s = stopsInOrder[i];
    const segKm = haversineKm(cursor, s) * 1.25;
    if (segKm > rules.max_km_between_stops) {
      const fromLabel = i === 0 ? region.label : stopsInOrder[i - 1].label;
      warnings.push(
        `${s.label} is ${Math.round(segKm)} km from ${fromLabel} — over the ${rules.max_km_between_stops} km radius. Try reordering or removing it.`,
      );
    }
    cursor = s;
  }
  if (routedStops.length < rules.min_stops) warnings.push("Fewer stops than ideal for this pace.");
  if (drive > maxDriveMin) {
    warnings.push(
      `Driving time is ${Math.round(drive / 60 * 10) / 10}h — over the ${rules.max_driving_hours}h daily comfort limit. Remove a stop or split into another day.`,
    );
  }
  if (drive + stay > maxExpMin) {
    warnings.push(
      `This day runs ${Math.round((drive + stay) / 60 * 10) / 10}h — over the ${rules.max_experience_hours}h limit. Try a lighter pace or fewer stops.`,
    );
  }
  if (driveKm > rules.max_total_km_per_day) {
    warnings.push(
      `Day driving distance is ${Math.round(driveKm)} km — over the ${rules.max_total_km_per_day} km daily limit.`,
    );
  }

  return {
    region,
    pace,
    stops: routedStops,
    totals: {
      drivingMinutes: drive,
      stopMinutes: stay,
      experienceMinutes: drive + stay,
    },
    pricePerPersonEur,
    feasible:
      drive + stay <= maxExpMin &&
      drive <= maxDriveMin &&
      driveKm <= rules.max_total_km_per_day &&
      routedStops.length >= 1 &&
      warnings.length === 0,
    warnings,
  };
}
