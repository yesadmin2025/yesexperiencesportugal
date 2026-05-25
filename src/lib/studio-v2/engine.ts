// Studio v2 — Recommendation engine.
//
// Wraps the existing Drift `composer.ts` (region pool + feasibility rules)
// with priority-weighted scoring and a transparent match score. Additive:
// the legacy Drift flow is untouched and keeps using composer directly.

import {
  composeDay,
  pickRegion,
  type ComposedDay,
  type ComposedStop,
  type ComposerProfile,
  type ConfidenceMap,
} from "@/lib/drift/composer";
import { REGION_STOPS, REGION_ORIGIN, type RegionKey, type RegionStop } from "@/data/regionStops";
import type { RoutedStopUI } from "@/components/builder/types";
import { REGION_RULES } from "@/data/regionRules";
import {
  deriveArchetype,
  type Archetype,
  type PriorityKey,
  type TravelerProfile,
} from "./profile";

// ─── priority → composer style/energy mapping ─────────────────────────────

const PRIORITY_TO_STYLE: Record<PriorityKey, ComposerProfile["style"] | undefined> = {
  vineyard_lunch:   "wine",
  wine_cellar:      "wine",
  coastal_scenery:  "coast",
  hidden_villages:  "heritage",
  architecture:     "heritage",
  heritage:         "heritage",
  local_gastronomy: "table",
  photography:      undefined,
  quiet_luxury:     undefined,
  wellness:         undefined,
  boat:             "coast",
};

function dominantStyle(p: TravelerProfile): ComposerProfile["style"] | undefined {
  const tally: Record<string, number> = {};
  for (const [k, w] of Object.entries(p.priorityWeights)) {
    const style = PRIORITY_TO_STYLE[k as PriorityKey];
    if (style) tally[style] = (tally[style] ?? 0) + (w ?? 0);
  }
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  return (sorted[0]?.[0] as ComposerProfile["style"]) ?? undefined;
}

function intentToEnergy(p: TravelerProfile): ComposerProfile["energy"] {
  if (p.pace === "rich" || p.pace === "full") return "vivid";
  return "slow";
}

function groupToCompanions(p: TravelerProfile): ComposerProfile["companions"] {
  const g = p.group;
  if (!g) return undefined;
  if (g.occasion === "corporate") return "group";
  if (g.children + g.teens > 0) return "family";
  if (g.adults === 1) return "solo";
  if (g.adults === 2) return "couple";
  return "group";
}

export function toComposerProfile(p: TravelerProfile): ComposerProfile {
  return {
    pickup: undefined, // ops.pickup is freeform; region picker handles routing
    radius: p.driveToleranceMin >= 60 ? "far" : "near",
    energy: intentToEnergy(p),
    style: dominantStyle(p),
    social: (p.group?.adults ?? 2) <= 2 ? "intimate" : "shared",
    companions: groupToCompanions(p),
  };
}

function buildConfidenceMap(p: TravelerProfile): ConfidenceMap {
  const map: ConfidenceMap = { ...p.confidence };
  const style = dominantStyle(p);
  if (style) map[`style:${style}`] = Math.max(map[`style:${style}`] ?? 0, 0.85);
  const energy = intentToEnergy(p);
  map[`energy:${energy}`] = Math.max(map[`energy:${energy}`] ?? 0, 0.7);
  return map;
}

// ─── archetype → tonal register for composer ──────────────────────────────

function archetypeRegister(a: Archetype): "intimate" | "expansive" | "playful" | "ritual" {
  switch (a) {
    case "slow_luxury_couple":
    case "coastal_romantic":   return "intimate";
    case "celebration_group":  return "playful";
    case "wine_connoisseur":   return "ritual";
    case "food_led_duo":       return "ritual";
    case "cultural_explorer":  return "expansive";
    case "family_refined":     return "playful";
    case "corporate_curated":  return "expansive";
  }
}

function intensityFromPace(p: TravelerProfile): number {
  switch (p.pace) {
    case "light":    return 1.8;
    case "balanced": return 3.0;
    case "rich":     return 3.8;
    case "full":     return 4.5;
    default:         return 3.0;
  }
}

// ─── match score ──────────────────────────────────────────────────────────

export interface MatchScore {
  total: number;        // 0–100
  fit: number;          // priorities vs picked stops
  pacing: number;       // day budget usage vs target density
  logistics: number;    // drive budget vs tolerance
}

function fitScore(stops: ComposedStop[], p: TravelerProfile): number {
  if (stops.length === 0) return 0;
  const totalWeight = Object.values(p.priorityWeights).reduce((a, b) => a + (b ?? 0), 0) || 1;
  let matched = 0;
  for (const { stop } of stops) {
    for (const [k, w] of Object.entries(p.priorityWeights)) {
      if (stopMatchesPriority(stop, k as PriorityKey)) {
        matched += (w ?? 0);
      }
    }
  }
  return Math.min(100, Math.round((matched / totalWeight) * 60));
}

function stopMatchesPriority(stop: RegionStop, key: PriorityKey): boolean {
  switch (key) {
    case "vineyard_lunch":   return stop.kind === "winery" || stop.kind === "cellar";
    case "wine_cellar":      return stop.kind === "cellar" || stop.kind === "winery";
    case "coastal_scenery":  return stop.kind === "beach" || stop.kind === "viewpoint" || (stop.affinity.style?.includes("coast") ?? false);
    case "hidden_villages":  return stop.kind === "village";
    case "architecture":
    case "heritage":         return stop.kind === "heritage";
    case "local_gastronomy": return stop.kind === "table" || stop.kind === "market" || stop.kind === "workshop";
    case "photography":      return stop.kind === "viewpoint" || stop.kind === "village" || stop.kind === "beach";
    case "quiet_luxury":     return (stop.affinity.social?.includes("intimate") ?? false);
    case "wellness":         return stop.affinity.energy?.includes("slow") ?? false;
    case "boat":             return stop.kind === "beach";
  }
}

function pacingScore(day: ComposedDay, p: TravelerProfile): number {
  const targetStops = p.stopDensityTarget;
  const got = day.stops.length;
  const delta = Math.abs(got - targetStops);
  return Math.max(0, 100 - delta * 20);
}

function logisticsScore(day: ComposedDay, p: TravelerProfile): number {
  if (day.stops.length === 0) return 0;
  const maxHop = Math.max(...day.stops.map((s) => s.driveFromPrev));
  if (maxHop <= p.driveToleranceMin) return 100;
  return Math.max(0, 100 - (maxHop - p.driveToleranceMin) * 3);
}

export function scoreDay(day: ComposedDay, p: TravelerProfile): MatchScore {
  const fit = fitScore(day.stops, p);
  const pacing = pacingScore(day, p);
  const logistics = logisticsScore(day, p);
  // weighted: fit 0.55, pacing 0.2, logistics 0.25 — then scale fit floor.
  const total = Math.round(fit * 0.55 + pacing * 0.2 + logistics * 0.25 + 25);
  return { total: Math.min(100, total), fit, pacing, logistics };
}

// ─── public API ───────────────────────────────────────────────────────────

export interface UpsellSuggestion {
  stop: RegionStop;
  reason: string;
  priorityKey: PriorityKey;
}

export interface DesignResult {
  profile: TravelerProfile;
  archetype: Archetype;
  region: RegionKey;
  day: ComposedDay;
  score: MatchScore;
  variants: { lighter: ComposedDay; richer: ComposedDay };
  upsells: UpsellSuggestion[];
}

export function designExperience(input: TravelerProfile): DesignResult {
  const archetype = input.archetype ?? deriveArchetype(input);
  const profile: TravelerProfile = { ...input, archetype };

  const composer = toComposerProfile(profile);
  const region = pickRegion(composer);
  const confidence = buildConfidenceMap(profile);
  const tonalRegister = archetypeRegister(archetype);
  const intensityPreference = intensityFromPace(profile);

  const day = composeDay(composer, region, {
    confidence,
    tonalRegister,
    intensityPreference,
  });

  // Lighter: cap to (target - 1), tonal pulled to intimate.
  const lighter = composeDay(composer, region, {
    confidence,
    tonalRegister: "intimate",
    intensityPreference: Math.max(1.5, intensityPreference - 1.2),
  });
  // Richer: push intensity, allow vivid register.
  const richer = composeDay(composer, region, {
    confidence,
    tonalRegister: tonalRegister === "intimate" ? "ritual" : "playful",
    intensityPreference: Math.min(5, intensityPreference + 1.2),
  });

  const upsells = computeUpsells(day, region, profile);

  return {
    profile,
    archetype,
    region,
    day,
    score: scoreDay(day, profile),
    variants: { lighter, richer },
    upsells,
  };
}

// ─── upsells ──────────────────────────────────────────────────────────────

const PRIORITY_LABEL: Record<PriorityKey, string> = {
  vineyard_lunch:   "vineyard lunch",
  wine_cellar:      "wine cellar",
  coastal_scenery:  "coastal scenery",
  hidden_villages:  "hidden village",
  architecture:     "architecture",
  heritage:         "heritage",
  local_gastronomy: "local gastronomy",
  photography:      "photography",
  quiet_luxury:     "quiet luxury",
  wellness:         "wellness",
  boat:             "coastal boat",
};

function computeUpsells(
  day: ComposedDay,
  region: RegionKey,
  profile: TravelerProfile,
): UpsellSuggestion[] {
  const inDay = new Set(day.stops.map((s) => s.stop.id));
  const regionStops = REGION_STOPS.filter((s) => s.region === region && !inDay.has(s.id));

  // Priorities ranked by weight, "must" first.
  const ranked = Object.entries(profile.priorityWeights)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([k]) => k as PriorityKey);

  const seen = new Set<string>();
  const out: UpsellSuggestion[] = [];

  for (const key of ranked) {
    if (out.length >= 2) break;
    const matches = regionStops
      .filter((s) => !seen.has(s.id) && stopMatchesPriority(s, key))
      .sort((a, b) => b.priority - a.priority);
    const pick = matches[0];
    if (!pick) continue;
    seen.add(pick.id);
    out.push({
      stop: pick,
      priorityKey: key,
      reason: `Adds a ${PRIORITY_LABEL[key]} moment that fits this day.`,
    });
  }

  return out;
}

// Exposed so tests / debug surfaces can see what cap each region enforces.
export function regionCaps(region: RegionKey) {
  return REGION_RULES[region];
}

// ─── live preview (used by Studio v2 cinematic refine) ───────────────────
//
// Runs the composer against whatever partial profile we have so the map and
// the insight strip can react after every meaningful choice. Safe to call
// every render — pure & cheap.

export interface JourneyPreview {
  region: RegionKey;
  regionCenter: { lat: number; lng: number };
  stops: RoutedStopUI[];
  density: number;
  driveBudgetMin: number;
}

function regionLabelShort(r: RegionKey): string {
  switch (r) {
    case "arrabida":     return "Arrábida";
    case "lisbon-coast": return "Sintra & the Atlantic edge";
    case "alentejo":     return "Alentejo";
    case "centro":       return "Centro";
  }
}

export function previewJourney(profile: TravelerProfile): JourneyPreview {
  const composer = toComposerProfile(profile);
  const region = pickRegion(composer);
  const day = composeDay(composer, region, {
    confidence: buildConfidenceMap(profile),
    intensityPreference: intensityFromPaceSafe(profile),
  });
  const target = profile.stopDensityTarget || 4;
  const trimmed = day.stops.slice(0, Math.max(2, Math.min(target, day.stops.length)));

  const stops: RoutedStopUI[] = trimmed.map((s, i) => ({
    key: s.stop.id,
    region_key: region,
    label: s.stop.name,
    blurb: s.stop.blurb ?? null,
    tag: s.stop.kind,
    lat: s.stop.coords.lat,
    lng: s.stop.coords.lng,
    duration_minutes: s.stop.dwellMin,
    driveMinutesFromPrev: i === 0 ? 0 : s.driveFromPrev,
  }));

  return {
    region,
    regionCenter: { lat: REGION_ORIGIN[region].lat, lng: REGION_ORIGIN[region].lng },
    stops,
    density: stops.length,
    driveBudgetMin: stops.reduce((a, s) => a + s.driveMinutesFromPrev, 0),
  };
}

function intensityFromPaceSafe(p: TravelerProfile): number {
  return intensityFromPace(p);
}

// ─── insight phrasing — concise, operational, no poetry ──────────────────

export type InsightReason =
  | "intent" | "pace" | "priority" | "group" | "ops" | "none";

export function previewInsight(
  profile: TravelerProfile,
  preview: JourneyPreview,
  reason: InsightReason,
): string {
  const region = regionLabelShort(preview.region);
  const paceWord =
    profile.pace === "light"    ? "spacious" :
    profile.pace === "rich"     ? "fuller" :
    profile.pace === "full"     ? "intensive" :
                                  "balanced";
  const stops = preview.density;
  const drive = preview.driveBudgetMin;

  switch (reason) {
    case "intent":
      return `Shaping a ${paceWord} ${atmosphereWord(profile)} route across ${region}.`;
    case "pace":
      return `Rhythm set: ${stops} stops, about ${drive} min driving.`;
    case "priority": {
      const last = lastPriorityLabel(profile);
      return last
        ? `${last} added — pulling the route toward ${region}.`
        : `Priorities recalibrated. ${stops} stops across ${region}.`;
    }
    case "group": {
      const g = profile.group;
      const n = g ? g.adults + g.teens + g.children : 2;
      return `Calibrating comfort for ${n} guest${n === 1 ? "" : "s"}.`;
    }
    case "ops":
      return `Logistics noted. Concierge will confirm timings.`;
    default:
      return `${stops} stops in ${region}, ${drive} min on the road.`;
  }
}

function atmosphereWord(p: TravelerProfile): string {
  switch (p.intent) {
    case "relaxed_scenic":     return "scenic";
    case "elegant_cultural":   return "cultural";
    case "food_local":         return "gastronomic";
    case "social_celebratory": return "celebratory";
    case "romantic_intimate":  return "intimate";
    case "coastal_cinematic":  return "Atlantic coastal";
    default:                   return "considered";
  }
}

function lastPriorityLabel(p: TravelerProfile): string | null {
  const entries = Object.entries(p.priorityWeights);
  if (!entries.length) return null;
  // Highest weight wins; if tied, lexical last for determinism.
  const top = [...entries].sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
  const key = top[0] as PriorityKey;
  return PRIORITY_LABEL[key] ?? null;
}
