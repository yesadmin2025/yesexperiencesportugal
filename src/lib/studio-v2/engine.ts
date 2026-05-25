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
import { REGION_STOPS, type RegionKey, type RegionStop } from "@/data/regionStops";
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

export interface DesignResult {
  profile: TravelerProfile;
  archetype: Archetype;
  region: RegionKey;
  day: ComposedDay;
  score: MatchScore;
  variants: { lighter: ComposedDay; richer: ComposedDay };
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

  return {
    profile,
    archetype,
    region,
    day,
    score: scoreDay(day, profile),
    variants: { lighter, richer },
  };
}

// Exposed so tests / debug surfaces can see what cap each region enforces.
export function regionCaps(region: RegionKey) {
  return REGION_RULES[region];
}
