// Studio v2 — invisible intent inference.
//
// Pure, client-safe. Reads behavioural signals from 3 atmospheric scenes
// and derives a TravelerProfile WITHOUT ever asking the traveller to pick
// a region, pace, intent or priority. Aligns with the Studio Bible:
// "guided, not asked — interface disappears, AI orchestrates".
//
// No DB / no network — feeds the existing engine.ts + composeRealItinerary.

import {
  applyIntent,
  applyPace,
  type IntentAtmosphere,
  type PaceV2,
  type PriorityKey,
  type TravelerProfile,
} from "./profile";
import { INTENT_IMAGE } from "./images";

// ─── scene definitions ────────────────────────────────────────────────────
//
// Three cenas, each with two real Portugal fragments that pull the traveller
// in opposite directions on one axis. Fragments map to intent boosts +
// pace nudge + priority weights. No text questions — only photography and
// a one-line whisper.

export interface MoodFragment {
  id: string;
  /** Real Portugal image (reuses curated INTENT_IMAGE assets). */
  image: string;
  alt: string;
  /** Short whisper, Georgia italic, no question framing. */
  whisper: string;
  /** Atmosphere this fragment leans toward. */
  intent: IntentAtmosphere;
  /** Pace nudge: -1 slower, 0 neutral, +1 fuller. */
  paceNudge: -1 | 0 | 1;
  /** Priorities pulled in if this fragment is the dominant signal. */
  priorities: PriorityKey[];
}

export interface MoodScene {
  id: string;
  /** Tiny chapter eyebrow shown above the fragments (no question). */
  eyebrow: string;
  /** 2–6 fragments. Diptych scenes use 2; the FEELING scene uses 6. */
  fragments: MoodFragment[];
}

export const MOOD_SCENES: MoodScene[] = [
  {
    id: "scene-table-vs-view",
    eyebrow: "First instinct",
    fragments: [
      {
        id: "long-table",
        image: INTENT_IMAGE.food_local.src,
        alt: INTENT_IMAGE.food_local.alt,
        whisper: "A long table, slow afternoon.",
        intent: "food_local",
        paceNudge: 0,
        priorities: ["vineyard_lunch", "local_gastronomy", "wine_cellar"],
      },
      {
        id: "open-horizon",
        image: INTENT_IMAGE.relaxed_scenic.src,
        alt: INTENT_IMAGE.relaxed_scenic.alt,
        whisper: "An empty road, an open horizon.",
        intent: "relaxed_scenic",
        paceNudge: -1,
        priorities: ["coastal_scenery", "photography", "quiet_luxury"],
      },
    ],
  },
  {
    id: "scene-coast-vs-stone",
    eyebrow: "Pull",
    fragments: [
      {
        id: "atlantic-edge",
        image: INTENT_IMAGE.coastal_cinematic.src,
        alt: INTENT_IMAGE.coastal_cinematic.alt,
        whisper: "Atlantic light, salt on the air.",
        intent: "coastal_cinematic",
        paceNudge: 0,
        priorities: ["coastal_scenery", "boat", "photography"],
      },
      {
        id: "quiet-stone",
        image: INTENT_IMAGE.elegant_cultural.src,
        alt: INTENT_IMAGE.elegant_cultural.alt,
        whisper: "Stone, shadow, quiet rooms.",
        intent: "elegant_cultural",
        paceNudge: 0,
        priorities: ["heritage", "architecture", "hidden_villages"],
      },
    ],
  },
  {
    id: "scene-two-vs-many",
    eyebrow: "Tone",
    fragments: [
      {
        id: "two-at-dusk",
        image: INTENT_IMAGE.romantic_intimate.src,
        alt: INTENT_IMAGE.romantic_intimate.alt,
        whisper: "Two, the coast, dusk.",
        intent: "romantic_intimate",
        paceNudge: -1,
        priorities: ["quiet_luxury", "wellness", "coastal_scenery"],
      },
      {
        id: "raised-glasses",
        image: INTENT_IMAGE.social_celebratory.src,
        alt: INTENT_IMAGE.social_celebratory.alt,
        whisper: "A day that lifts the occasion.",
        intent: "social_celebratory",
        paceNudge: 1,
        priorities: ["vineyard_lunch", "local_gastronomy", "boat"],
      },
    ],
  },
  // Adaptive clarifier — only shown when confidence after scenes I–III is low.
  // Targets the pace/rhythm axis (morning vs evening), the one most often
  // ambiguous after atmosphere-only signals.
  {
    id: "scene-pace-clarify",
    eyebrow: "Rhythm",
    fragments: [
      {
        id: "morning-light",
        image: INTENT_IMAGE.relaxed_scenic.src,
        alt: "A shuttered Portuguese window catching first morning light.",
        whisper: "Slow morning, the day still ahead.",
        intent: "relaxed_scenic",
        paceNudge: -1,
        priorities: ["quiet_luxury", "coastal_scenery"],
      },
      {
        id: "late-shadow",
        image: INTENT_IMAGE.coastal_cinematic.src,
        alt: "Long warm shadows on Portuguese tile at the end of the afternoon.",
        whisper: "Long shadows, the evening unhurried.",
        intent: "coastal_cinematic",
        paceNudge: 1,
        priorities: ["vineyard_lunch", "photography"],
      },
    ],
  },
  // Phase 1 FEELING — 6 emotion cards. Earliest signal, before the diptychs.
  // No place names. Pure atmosphere.
  {
    id: "scene-feeling",
    eyebrow: "Feeling",
    fragments: [
      {
        id: "feeling-slow-romantic",
        image: INTENT_IMAGE.romantic_intimate.src,
        alt: INTENT_IMAGE.romantic_intimate.alt,
        whisper: "Slow & romantic",
        intent: "romantic_intimate",
        paceNudge: -1,
        priorities: ["quiet_luxury", "wellness", "coastal_scenery"],
      },
      {
        id: "feeling-wild-coast",
        image: INTENT_IMAGE.coastal_cinematic.src,
        alt: INTENT_IMAGE.coastal_cinematic.alt,
        whisper: "Wild coast",
        intent: "coastal_cinematic",
        paceNudge: 0,
        priorities: ["coastal_scenery", "boat", "photography"],
      },
      {
        id: "feeling-hidden",
        image: INTENT_IMAGE.elegant_cultural.src,
        alt: INTENT_IMAGE.elegant_cultural.alt,
        whisper: "Hidden Portugal",
        intent: "elegant_cultural",
        paceNudge: -1,
        priorities: ["hidden_villages", "heritage", "architecture"],
      },
      {
        id: "feeling-celebration",
        image: INTENT_IMAGE.social_celebratory.src,
        alt: INTENT_IMAGE.social_celebratory.alt,
        whisper: "Celebration",
        intent: "social_celebratory",
        paceNudge: 1,
        priorities: ["vineyard_lunch", "local_gastronomy", "boat"],
      },
      {
        id: "feeling-food-wine",
        image: INTENT_IMAGE.food_local.src,
        alt: INTENT_IMAGE.food_local.alt,
        whisper: "Soulful food & wine",
        intent: "food_local",
        paceNudge: 0,
        priorities: ["vineyard_lunch", "local_gastronomy", "wine_cellar"],
      },
      {
        id: "feeling-peaceful",
        image: INTENT_IMAGE.relaxed_scenic.src,
        alt: INTENT_IMAGE.relaxed_scenic.alt,
        whisper: "Peaceful escape",
        intent: "relaxed_scenic",
        paceNudge: -1,
        priorities: ["quiet_luxury", "coastal_scenery", "wellness"],
      },
    ],
  },
  // Phase 2 RHYTHM — the second half of the WHO & RHYTHM beat. Four
  // tempo cards, each nudges pace + light intent. WHO sets pax directly
  // and does not need an entry here.
  {
    id: "scene-who-rhythm",
    eyebrow: "Rhythm",
    fragments: [
      {
        id: "rhythm-slow",
        image: INTENT_IMAGE.romantic_intimate.src,
        alt: INTENT_IMAGE.romantic_intimate.alt,
        whisper: "Slow",
        intent: "romantic_intimate",
        paceNudge: -1,
        priorities: ["quiet_luxury", "wellness"],
      },
      {
        id: "rhythm-relaxed",
        image: INTENT_IMAGE.relaxed_scenic.src,
        alt: INTENT_IMAGE.relaxed_scenic.alt,
        whisper: "Relaxed",
        intent: "relaxed_scenic",
        paceNudge: -1,
        priorities: ["coastal_scenery", "quiet_luxury"],
      },
      {
        id: "rhythm-discovery",
        image: INTENT_IMAGE.elegant_cultural.src,
        alt: INTENT_IMAGE.elegant_cultural.alt,
        whisper: "Discovery",
        intent: "elegant_cultural",
        paceNudge: 0,
        priorities: ["heritage", "architecture", "hidden_villages"],
      },
      {
        id: "rhythm-adventurous",
        image: INTENT_IMAGE.coastal_cinematic.src,
        alt: INTENT_IMAGE.coastal_cinematic.alt,
        whisper: "Adventurous",
        intent: "coastal_cinematic",
        paceNudge: 1,
        priorities: ["coastal_scenery", "boat", "photography"],
      },
    ],
  },
];

// ─── signals ──────────────────────────────────────────────────────────────

export interface SceneSignal {
  sceneId: string;
  /** Fragment the traveller tapped (strongest signal). */
  tappedFragmentId: string;
  /** How long they lingered before advancing, ms. */
  lingerMs: number;
}

// ─── inference ────────────────────────────────────────────────────────────

/**
 * Build a TravelerProfile from accumulated scene signals + logistics.
 * Pure, deterministic, no network. Inferred fields:
 *   - intent (atmosphere) — dominant from tapped fragments, tap-weighted
 *   - pace — derived from pace nudges + linger averages
 *   - priorities — accumulated from chosen fragments
 *   - confidence — how strongly the dominant intent won
 */
export function inferProfile(
  signals: SceneSignal[],
  logistics: { pax: number; pickup: string },
): {
  profile: TravelerProfile;
  confidence: number;
  topIntent: IntentAtmosphere;
} {
  // tap weight 1.5; linger >2s adds +0.5
  const intentScore: Record<IntentAtmosphere, number> = {
    relaxed_scenic: 0,
    elegant_cultural: 0,
    food_local: 0,
    social_celebratory: 0,
    romantic_intimate: 0,
    coastal_cinematic: 0,
  };
  const priorityWeights: Partial<Record<PriorityKey, number>> = {};
  let paceSum = 0;
  let paceCount = 0;

  for (const sig of signals) {
    const scene = MOOD_SCENES.find((s) => s.id === sig.sceneId);
    if (!scene) continue;
    const frag = scene.fragments.find((f) => f.id === sig.tappedFragmentId);
    if (!frag) continue;
    const lingerBonus = sig.lingerMs > 2000 ? 0.5 : 0;
    intentScore[frag.intent] += 1.5 + lingerBonus;
    paceSum += frag.paceNudge;
    paceCount += 1;
    for (const p of frag.priorities) {
      priorityWeights[p] = (priorityWeights[p] ?? 0) + 50;
    }
  }

  // Pick winning intent (deterministic order on ties).
  const sortedIntents = (Object.keys(intentScore) as IntentAtmosphere[]).sort(
    (a, b) => intentScore[b] - intentScore[a],
  );
  const topIntent = sortedIntents[0];
  const total = Object.values(intentScore).reduce((a, b) => a + b, 0) || 1;
  const confidence = intentScore[topIntent] / total;

  // Derive pace from average nudge + traveller lingering.
  const avgNudge = paceCount > 0 ? paceSum / paceCount : 0;
  const pace: PaceV2 = avgNudge <= -0.5 ? "light" : avgNudge >= 0.5 ? "rich" : "balanced";

  // Seed profile from inferred intent, then overlay pace + priorities + group + pickup.
  let profile: TravelerProfile = {
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
  profile = applyIntent(profile, topIntent);
  profile = applyPace(profile, pace);
  profile.priorityWeights = priorityWeights;
  profile.group = {
    adults: Math.max(1, logistics.pax),
    children: 0,
    teens: 0,
    mobility: "none",
    occasion: "none",
    decisionStyle: "collaborative",
    luxuryTier: "elevated",
  };
  profile.ops = { pickup: logistics.pickup };

  return { profile, confidence, topIntent };
}

// ─── conviction line ──────────────────────────────────────────────────────
//
// Template, slot-based — never AI-generated marketing copy. Reads what the
// engine inferred and shows the traveller that the Studio "read" them.

const INTENT_NOUN: Record<IntentAtmosphere, string> = {
  relaxed_scenic: "open horizons and slow light",
  elegant_cultural: "stone, shadow and quiet rooms",
  food_local: "long tables and unhurried tasting",
  social_celebratory: "a day that lifts the occasion",
  romantic_intimate: "two, the coast, dusk",
  coastal_cinematic: "Atlantic edges and slow gold",
};

const PACE_WORD: Record<PaceV2, string> = {
  light: "spacious",
  balanced: "balanced",
  rich: "fuller",
  full: "intensive",
};

export function convictionLine(
  topIntent: IntentAtmosphere,
  pace: PaceV2,
  pickup: string,
  pax: number,
): { lead: string; body: string } {
  const noun = INTENT_NOUN[topIntent];
  const paceWord = PACE_WORD[pace];
  const guests = pax === 1 ? "one guest" : `${pax} guests`;
  return {
    lead: `You're pulled toward ${noun}.`,
    body: `Designing a ${paceWord} day for ${guests}, leaving from ${pickup}.`,
  };
}

// ─── conviction script — layered, references actual choices ───────────────
//
// Goes beyond a single line: shows the traveller exactly which fragments
// they chose vs rejected, then synthesises and announces the design move.
// All copy is template-based, never AI-generated.

/** Short, evocative shorthand for each fragment, used in "noticed" lines. */
const FRAGMENT_SHORTHAND: Record<string, string> = {
  "long-table": "the long table",
  "open-horizon": "the open road",
  "atlantic-edge": "Atlantic light",
  "quiet-stone": "stone and shadow",
  "two-at-dusk": "dusk, for two",
  "raised-glasses": "a day that lifts",
  "morning-light": "a slow morning",
  "late-shadow": "long afternoon shadows",
};

/** Region/element anchor per dominant atmosphere — grounded, never invented. */
const INTENT_ANCHOR: Record<IntentAtmosphere, string> = {
  relaxed_scenic: "open coastal roads and slow afternoon light",
  elegant_cultural: "stone villages and quiet interiors",
  food_local: "long tables and unhurried tasting",
  social_celebratory: "a rhythm that lifts the occasion",
  romantic_intimate: "golden-hour coast and intimate corners",
  coastal_cinematic: "Atlantic edges at the hour the light turns gold",
};

export interface ConvictionScript {
  /** One per scene: "Toward X — past Y." Renders as poetic noticed lines. */
  noticed: string[];
  /** Synthesis line — what the engine read overall. */
  reading: string;
  /** Decision line — where/how the day will be designed. */
  decision: string;
}

export function convictionScript(
  signals: SceneSignal[],
  topIntent: IntentAtmosphere,
  pace: PaceV2,
  pickup: string,
  pax: number,
): ConvictionScript {
  const noticed: string[] = [];
  for (const sig of signals) {
    const scene = MOOD_SCENES.find((s) => s.id === sig.sceneId);
    if (!scene) continue;
    const chosen = scene.fragments.find((f) => f.id === sig.tappedFragmentId);
    const rejected = scene.fragments.find((f) => f.id !== sig.tappedFragmentId);
    if (!chosen || !rejected) continue;
    const cShort = FRAGMENT_SHORTHAND[chosen.id] ?? chosen.whisper;
    const rShort = FRAGMENT_SHORTHAND[rejected.id] ?? rejected.whisper;
    noticed.push(`Toward ${cShort} — past ${rShort}.`);
  }

  const reading = `Your story leans toward ${INTENT_NOUN[topIntent]}, at a ${PACE_WORD[pace]} rhythm.`;

  const anchor = INTENT_ANCHOR[topIntent];
  const guests = pax === 1 ? "one guest" : `${pax} guests`;
  const decision = `Designing the day around ${anchor}, leaving from ${pickup}, for ${guests}.`;

  return { noticed, reading, decision };
}

// ─── pickup cities ────────────────────────────────────────────────────────
// Curated list of operational pickup origins. Never freeform — autocomplete
// only over these, so routing stays feasible.

export const PICKUP_CITIES = [
  "Lisboa",
  "Cascais",
  "Sintra",
  "Estoril",
  "Setúbal",
  "Comporta",
  "Évora",
  "Porto",
] as const;
export type PickupCity = (typeof PICKUP_CITIES)[number];
