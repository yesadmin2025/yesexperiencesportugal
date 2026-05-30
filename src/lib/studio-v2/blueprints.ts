/**
 * Studio v2 — Signature blueprints (internal anchoring).
 *
 * Each blueprint maps a (region + intent/style) signal to ONE real Signature
 * tour. The client never sees the Signature title, id or marketing copy —
 * the reveal keeps its private "Your day" framing. We only use the blueprint
 * to:
 *   1. Filter the `builder_stops` pool to real stops that belong to that
 *      Signature tour (via `source_tour_keys`), so the day is composed of
 *      verified stops from ONE real tour in the SAME region (Tailored rule).
 *   2. Surface concrete logistics in the reveal — duration range and
 *      "from €/guest" base price — pulled from the real Signature.
 *
 * GUARDRAILS:
 *   - Never invent a tour. Every blueprint must point to an existing
 *     `source_tour_keys` value present in `builder_stops`.
 *   - Never leak the Signature title in client copy.
 *   - Tailored rule: stops stay inside ONE Signature; we never stitch
 *     stops from different tours into the same day.
 */

import type { TravelerProfile } from "./profile";

export type EngineRegion = "arrabida" | "lisbon-coast" | "alentejo" | "centro";

export interface StudioBlueprint {
  /** Internal-only id. Never rendered. */
  id: string;
  /** Engine region (matches `composeRealItinerary` region). */
  region: EngineRegion;
  /** Source-tour keys that identify this Signature in `builder_stops`. */
  sourceTourKeys: string[];
  /** Intents this blueprint best fits (priority order). */
  matchIntents: string[];
  /** Composer style hints this blueprint covers. */
  matchStyles: Array<"wine" | "coast" | "heritage" | "table">;
  /** Real Signature base price per guest, EUR. From the live Signature page. */
  pricePerGuestFrom: number;
  /** Real Signature duration range, hours. */
  durationHours: [number, number];
  /** Plain pickup hint for the reveal logistics strip. */
  pickupNote: string;
  /** Internal score boost when this blueprint matches — used to break ties. */
  weight: number;
}

export const BLUEPRINTS: StudioBlueprint[] = [
  // ─── Arrábida / Setúbal ────────────────────────────────────────────────
  {
    id: "bp-arrabida-wine",
    region: "arrabida",
    sourceTourKeys: ["southern-lisbon-wine", "setubal-wine"],
    matchIntents: ["food_local", "elegant_cultural", "romantic_intimate"],
    matchStyles: ["wine", "table"],
    pricePerGuestFrom: 138,
    durationHours: [7, 9],
    pickupNote: "Hotel pickup in Lisbon",
    weight: 90,
  },
  {
    id: "bp-arrabida-coastal-boat",
    region: "arrabida",
    sourceTourKeys: ["arrabida-sesimbra"],
    matchIntents: ["coastal_cinematic", "relaxed_scenic"],
    matchStyles: ["coast"],
    pricePerGuestFrom: 159,
    durationHours: [8, 9],
    pickupNote: "Hotel pickup in Lisbon",
    weight: 85,
  },
  {
    id: "bp-arrabida-wild-beaches",
    region: "arrabida",
    sourceTourKeys: ["wild-beaches-picnic"],
    matchIntents: ["coastal_cinematic", "relaxed_scenic", "romantic_intimate"],
    matchStyles: ["coast"],
    pricePerGuestFrom: 190,
    durationHours: [6, 8],
    pickupNote: "Hotel pickup in Lisbon",
    weight: 80,
  },
  {
    id: "bp-arrabida-azeitao-craft",
    region: "arrabida",
    sourceTourKeys: ["azeitao-cheese"],
    matchIntents: ["elegant_cultural", "food_local"],
    matchStyles: ["heritage", "table"],
    pricePerGuestFrom: 145,
    durationHours: [7, 9],
    pickupNote: "Hotel pickup in Lisbon",
    weight: 75,
  },

  // ─── Tróia / Comporta ──────────────────────────────────────────────────
  {
    id: "bp-troia-comporta",
    region: "arrabida", // engine region covers troia-comporta DB region
    sourceTourKeys: ["troia-comporta"],
    matchIntents: ["coastal_cinematic", "relaxed_scenic", "romantic_intimate"],
    matchStyles: ["coast"],
    pricePerGuestFrom: 195,
    durationHours: [8, 10],
    pickupNote: "Hotel pickup in Lisbon · ferry crossing included",
    weight: 70,
  },

  // ─── Lisbon coast (Sintra / Cascais) ───────────────────────────────────
  {
    id: "bp-sintra-cascais",
    region: "lisbon-coast",
    sourceTourKeys: ["sintra-cascais-hidden"],
    matchIntents: ["elegant_cultural", "relaxed_scenic", "romantic_intimate"],
    matchStyles: ["heritage", "coast"],
    pricePerGuestFrom: 165,
    durationHours: [7, 9],
    pickupNote: "Hotel pickup in Lisbon",
    weight: 85,
  },

  // ─── Alentejo ──────────────────────────────────────────────────────────
  {
    id: "bp-evora-alentejo",
    region: "alentejo",
    sourceTourKeys: ["setubal-wine"], // current evora-alentejo stops carry this key
    matchIntents: ["elegant_cultural", "food_local"],
    matchStyles: ["wine", "heritage"],
    pricePerGuestFrom: 210,
    durationHours: [9, 11],
    pickupNote: "Hotel pickup in Lisbon · long day",
    weight: 70,
  },

  // ─── Centro (Tomar / Coimbra) ──────────────────────────────────────────
  {
    id: "bp-centro-tomar-coimbra",
    region: "centro",
    sourceTourKeys: ["tomar-coimbra"],
    matchIntents: ["elegant_cultural"],
    matchStyles: ["heritage"],
    pricePerGuestFrom: 220,
    durationHours: [10, 12],
    pickupNote: "Hotel pickup in Lisbon · long day",
    weight: 65,
  },
  {
    id: "bp-centro-fatima-nazare-obidos",
    region: "centro",
    sourceTourKeys: ["fatima-nazare-obidos"],
    matchIntents: ["elegant_cultural", "relaxed_scenic"],
    matchStyles: ["heritage", "coast"],
    pricePerGuestFrom: 195,
    durationHours: [9, 11],
    pickupNote: "Hotel pickup in Lisbon · long day",
    weight: 60,
  },
];

/** Pick the best-fitting blueprint for this profile + region.
 *  Returns null if no blueprint matches — caller should fall back to the
 *  pool-based composer (existing behaviour). */
export function pickBlueprint(
  profile: Pick<TravelerProfile, "intent" | "priorityWeights">,
  region: EngineRegion,
): StudioBlueprint | null {
  const candidates = BLUEPRINTS.filter((b) => b.region === region);
  if (candidates.length === 0) return null;

  const intent = profile.intent ?? "";
  const weights = profile.priorityWeights ?? {};

  // Derive a coarse "style affinity" map from priorityWeights.
  const styleScore: Record<string, number> = { wine: 0, coast: 0, heritage: 0, table: 0 };
  for (const [k, w] of Object.entries(weights)) {
    const weight = w ?? 0;
    if (k === "vineyard_lunch" || k === "wine_cellar") styleScore.wine += weight;
    if (k === "coastal_scenery" || k === "boat") styleScore.coast += weight;
    if (k === "heritage" || k === "architecture" || k === "hidden_villages") styleScore.heritage += weight;
    if (k === "local_gastronomy") styleScore.table += weight;
  }

  let best: { bp: StudioBlueprint; score: number } | null = null;
  for (const bp of candidates) {
    let score = bp.weight; // base
    if (bp.matchIntents.includes(intent)) score += 60;
    for (const s of bp.matchStyles) score += styleScore[s] ?? 0;
    if (!best || score > best.score) best = { bp, score };
  }
  return best?.bp ?? null;
}
