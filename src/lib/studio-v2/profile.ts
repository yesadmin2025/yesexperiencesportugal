// Studio v2 — Traveler Profile types.
//
// Additive, non-breaking. Coexists with the existing Drift profile.
// Built progressively across the 5-stage guided consultation:
//   1. Travel Intent · 2. Group Profile · 3. Rhythm & Flow
//   4. Experience Priorities · 5. Operational Constraints
//
// Stored as a single normalized object so the engine, the consultation
// rail, and the reveal all read from one source of truth.

export type IntentAtmosphere =
  | "relaxed_scenic"
  | "elegant_cultural"
  | "food_local"
  | "social_celebratory"
  | "romantic_intimate"
  | "coastal_cinematic";

export type PaceV2 = "light" | "balanced" | "rich" | "full";

export type LuxuryTier = "refined" | "elevated" | "ultra";

export type DecisionStyle = "decisive" | "collaborative" | "surprise_me";

export type OccasionV2 =
  | "none"
  | "anniversary"
  | "birthday"
  | "honeymoon"
  | "corporate"
  | "celebration";

export type PriorityKey =
  | "vineyard_lunch"
  | "coastal_scenery"
  | "architecture"
  | "hidden_villages"
  | "photography"
  | "quiet_luxury"
  | "wellness"
  | "boat"
  | "local_gastronomy"
  | "wine_cellar"
  | "heritage";

export type Archetype =
  | "slow_luxury_couple"
  | "celebration_group"
  | "cultural_explorer"
  | "food_led_duo"
  | "family_refined"
  | "corporate_curated"
  | "coastal_romantic"
  | "wine_connoisseur";

export interface GroupProfile {
  adults: number;
  children: number;
  teens: number;
  mobility: "none" | "limited" | "wheelchair";
  occasion: OccasionV2;
  decisionStyle: DecisionStyle;
  luxuryTier: LuxuryTier;
}

export interface OpsConstraints {
  pickup?: string;
  accommodationArea?: string;
  cruiseWindow?: { startISO: string; endISO: string };
  dietary?: string[];
  hardConstraints?: string[];
  accessibility?: string[];
  /** ISO date string (YYYY-MM-DD) — captured in the logistics card. */
  preferredDate?: string;
  /** Free-form tastes/likes chips selected by the traveller. */
  tastes?: string[];
}

export type DurationKey = "half-day" | "full-day" | "multi-day";

export type EnhancementKey =
  | "sunset_boat"
  | "private_chef"
  | "helicopter"
  | "fado_night"
  | "private_cellar"
  | "spa_ritual";

export interface TravelerProfile {
  /** Optional traveller name — personalises the written story. */
  name?: string;
  intent?: IntentAtmosphere;
  pace?: PaceV2;
  /** Bible step: Duration (half-day · full-day · multi-day). */
  duration?: DurationKey;
  /** Multi-day length, only when duration === "multi-day". */
  durationDays?: number;
  // 0–100 normalized signals (derived from intent + priorities)
  socialEnergy: number;
  cultureInterest: number;
  foodInterest: number;
  coastalAffinity: number;
  wellnessAffinity: number;
  driveToleranceMin: number;
  stopDensityTarget: number;
  group?: GroupProfile;
  priorityWeights: Partial<Record<PriorityKey, number>>;
  /** Bible step: Enhancements (sunset boat, private chef, helicopter…). */
  enhancements: EnhancementKey[];
  ops: OpsConstraints;
  archetype?: Archetype;
  confidence: Record<string, number>;
}

export function emptyProfile(): TravelerProfile {
  return {
    socialEnergy: 50,
    cultureInterest: 50,
    foodInterest: 50,
    coastalAffinity: 50,
    wellnessAffinity: 50,
    driveToleranceMin: 50,
    stopDensityTarget: 4,
    priorityWeights: {},
    enhancements: [],
    ops: {},
    confidence: {},
  };
}

// ─── derivations ───────────────────────────────────────────────────────────

const INTENT_SEEDS: Record<IntentAtmosphere, Partial<TravelerProfile>> = {
  relaxed_scenic: {
    pace: "light",
    socialEnergy: 30,
    coastalAffinity: 70,
    cultureInterest: 45,
    foodInterest: 55,
    wellnessAffinity: 65,
    driveToleranceMin: 45,
    stopDensityTarget: 3,
  },
  elegant_cultural: {
    pace: "balanced",
    socialEnergy: 40,
    cultureInterest: 85,
    foodInterest: 65,
    coastalAffinity: 40,
    wellnessAffinity: 35,
    driveToleranceMin: 55,
    stopDensityTarget: 4,
  },
  food_local: {
    pace: "balanced",
    socialEnergy: 55,
    foodInterest: 90,
    cultureInterest: 60,
    coastalAffinity: 45,
    wellnessAffinity: 25,
    driveToleranceMin: 50,
    stopDensityTarget: 4,
  },
  social_celebratory: {
    pace: "rich",
    socialEnergy: 85,
    foodInterest: 75,
    cultureInterest: 50,
    coastalAffinity: 55,
    wellnessAffinity: 25,
    driveToleranceMin: 60,
    stopDensityTarget: 4,
  },
  romantic_intimate: {
    pace: "light",
    socialEnergy: 20,
    foodInterest: 75,
    coastalAffinity: 70,
    cultureInterest: 55,
    wellnessAffinity: 60,
    driveToleranceMin: 45,
    stopDensityTarget: 3,
  },
  coastal_cinematic: {
    pace: "balanced",
    socialEnergy: 35,
    coastalAffinity: 95,
    foodInterest: 60,
    cultureInterest: 40,
    wellnessAffinity: 55,
    driveToleranceMin: 60,
    stopDensityTarget: 4,
  },
};

const PACE_OVERRIDES: Record<
  PaceV2,
  Pick<TravelerProfile, "stopDensityTarget" | "driveToleranceMin">
> = {
  light: { stopDensityTarget: 3, driveToleranceMin: 40 },
  balanced: { stopDensityTarget: 4, driveToleranceMin: 50 },
  rich: { stopDensityTarget: 5, driveToleranceMin: 60 },
  full: { stopDensityTarget: 6, driveToleranceMin: 70 },
};

export function applyIntent(p: TravelerProfile, intent: IntentAtmosphere): TravelerProfile {
  return { ...p, intent, ...INTENT_SEEDS[intent] };
}

export function applyPace(p: TravelerProfile, pace: PaceV2): TravelerProfile {
  return { ...p, pace, ...PACE_OVERRIDES[pace] };
}

/** Derive an archetype label from accumulated signals. Pure, deterministic. */
export function deriveArchetype(p: TravelerProfile): Archetype {
  const g = p.group;
  const wineWeight = (p.priorityWeights.vineyard_lunch ?? 0) + (p.priorityWeights.wine_cellar ?? 0);
  if (g?.occasion === "corporate") return "corporate_curated";
  if (g && g.children + g.teens > 0) return "family_refined";
  if (g?.occasion === "honeymoon" || (g?.adults === 2 && p.intent === "romantic_intimate")) {
    return p.coastalAffinity > 65 ? "coastal_romantic" : "slow_luxury_couple";
  }
  if (g?.occasion === "celebration" || g?.occasion === "birthday" || (g?.adults ?? 0) >= 5) {
    return "celebration_group";
  }
  if (wineWeight >= 120) return "wine_connoisseur";
  if (p.foodInterest >= 80) return "food_led_duo";
  if (p.cultureInterest >= 75) return "cultural_explorer";
  return "slow_luxury_couple";
}
