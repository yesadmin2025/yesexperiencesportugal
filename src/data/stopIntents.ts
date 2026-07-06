// Studio V3 — stop-level intent tags.
//
// Every stop across the Signature catalog is tagged with the guest-facing
// intents it genuinely delivers. This is the truth model for the
// "Why this journey" matching in `curation.scoreTourFit`.
//
// A tour's intent profile is derived by aggregating its stops. That means
// the Évora day is truthfully a wine day (many wine-tagged stops), the
// Arrábida tile factory carries craft + heritage + culture, and the
// Southwest Vicentine Coast tour has zero wine-tagged stops — so a guest
// asking for wine + nature never lands on it.
//
// Rules:
//   - Tags describe what the stop actually offers, not marketing copy.
//   - Multi-tag is expected and correct (a market with Moscatel gets
//     gastronomy + local-life + wine).
//   - Do NOT invent stops — only tags for stops that already exist in
//     `signatureTours.ts` may be listed here. Extra keys are ignored.

import type { SignatureTour } from "@/data/signatureTours";

/** Canonical stop-level intents. Broader than the guest-facing `Interest`
 *  union because a single stop can carry cultural/spiritual/craft nuance
 *  the coarser guest labels don't expose. */
export type StopIntent =
  | "wine"
  | "gastronomy"
  | "heritage"
  | "culture"
  | "nature"
  | "coast"
  | "romance"
  | "hidden"
  | "adventure"
  | "local-life"
  | "craft"
  | "family"
  | "slow-luxury"
  | "spiritual"
  | "view";

/** Map every guest-facing Interest onto the stop intents that count as
 *  evidence for it. `heritage` folds in `culture`, `photography` reads
 *  view stops, `wellness` reads slow-luxury, `local-life` reads craft. */
export const INTEREST_TO_STOP_INTENTS: Record<string, StopIntent[]> = {
  wine: ["wine"],
  gastronomy: ["gastronomy"],
  nature: ["nature"],
  coast: ["coast"],
  heritage: ["heritage", "culture"],
  photography: ["view"],
  wellness: ["slow-luxury"],
  "local-life": ["local-life", "craft"],
};

/** `${tourId}` → `${stopLabel}` → intents. Labels must match the `label`
 *  field on the corresponding stop in `signatureTours.ts`. */
export const TOUR_STOP_INTENTS: Record<string, Record<string, StopIntent[]>> = {
  "arrabida-wine-allinclusive": {
    "Mercado do Livramento": ["gastronomy", "local-life", "wine"],
    "Santuário Nacional de Cristo Rei": ["view", "spiritual"],
    "Parque Natural da Arrabida": ["nature", "coast", "view"],
    "Azulejos de Azeitao": ["craft", "heritage", "culture"],
    "House & Museum José Maria Da Fonseca": ["wine", "heritage"],
    "Quinta do Piloto": ["wine"],
    "Farm Catralvos": ["wine", "local-life"],
    "Adega Coop. de Palmela, C.R.L.": ["wine", "heritage"],
    "Bacalhoa Vinhos de Portugal": ["wine", "culture"],
    "Azeitao — long traditional lunch": ["gastronomy", "wine", "slow-luxury"],
    "Castelo de Sesimbra": ["heritage", "view", "coast"],
  },
  "wild-beaches-picnic": {
    "Mercado do Livramento": ["gastronomy", "local-life", "wine"],
    "Parque Natural da Arrabida": ["nature", "coast", "view"],
    "Portinho da Arrabida": ["coast", "nature"],
    "Praia de Galapinhos": ["coast", "nature", "hidden"],
    "Lapa de Santa Margarida": ["hidden", "spiritual", "nature"],
    "Cabo Espichel": ["coast", "nature", "spiritual", "view"],
    "Praia das Bicas": ["coast", "adventure", "hidden"],
    "Praia do Meco": ["coast", "nature"],
    "Castelo de Sesimbra": ["heritage", "view", "coast"],
    "Sesimbra": ["coast", "local-life", "gastronomy"],
  },
  "arrabida-boat": {
    "Mercado do Livramento": ["gastronomy", "local-life", "wine"],
    "Parque Natural da Arrabida": ["nature", "coast", "view", "adventure"],
    "Lapa de Santa Margarida": ["hidden", "spiritual", "nature"],
    "Castelo de Sesimbra": ["heritage", "view", "coast"],
    "Sesimbra": ["coast", "local-life", "gastronomy"],
    "Cabo Espichel": ["coast", "nature", "spiritual", "view"],
  },
  "tiles-workshop": {
    "Mercado do Livramento": ["gastronomy", "local-life", "wine"],
    "Azulejos de Azeitao": ["craft", "heritage", "culture"],
    "Farm Catralvos": ["wine", "local-life"],
    "Jose Maria de Fonseca": ["wine", "heritage"],
    "Bacalhoa Vinhos de Portugal": ["wine", "culture"],
    "Castelo de Sesimbra": ["heritage", "view", "coast"],
    "Sesimbra": ["coast", "local-life", "gastronomy"],
    "Santuario Nacional de Cristo Rei": ["view", "spiritual"],
  },
  "azeitao-cheese": {
    "Mercado do Livramento": ["gastronomy", "local-life", "wine"],
    "Quinta Velha": ["craft", "gastronomy", "local-life"],
    "Azeitao": ["gastronomy", "wine", "local-life", "slow-luxury"],
    "Farm Catralvos": ["wine", "local-life"],
    "Castelo de Sesimbra": ["heritage", "view", "coast"],
  },
  "sintra-cascais": {
    "Sintra": ["heritage", "culture", "nature"],
    "Sintra National Palace": ["heritage", "culture"],
    "Park and National Palace of Pena": ["heritage", "culture", "view", "romance"],
    "Azenhas do Mar": ["coast", "view", "romance"],
    "Quinta da Regaleira": ["heritage", "culture", "hidden"],
    "Adega Regional de Colares": ["wine", "heritage", "hidden"],
    "Cascais": ["coast", "local-life", "romance"],
    "Cabo Da Roca": ["coast", "nature", "view", "romance"],
  },
  "troia-comporta": {
    "Baia de Setubal — Sado ferry crossing": ["nature", "coast", "adventure"],
    "Roman Ruins of Troia": ["heritage", "culture", "coast"],
    "Marina de Troia": ["coast", "slow-luxury"],
    "Cais Palafitico do Porto da Carrasqueira": ["hidden", "local-life", "view"],
    "Comporta": ["local-life", "slow-luxury", "romance"],
    "Herdade Da Comporta": ["wine", "gastronomy"],
    "Comporta Beach": ["coast", "nature", "romance"],
    "Praia do Carvalhal": ["coast", "nature"],
  },
  "evora-alentejo": {
    "Evora": ["heritage", "culture", "local-life"],
    "Templo Romano de Evora (Templo de Diana)": ["heritage", "culture"],
    "Chapel of Bones": ["heritage", "culture", "spiritual", "hidden"],
    "Joao Portugal Ramos Wines": ["wine", "heritage"],
    "Enoturismo Cartuxa": ["wine", "heritage", "spiritual"],
    "Pera-grave - Qta S. Jose De Peramanca": ["wine", "heritage"],
    "Ervideira": ["wine", "heritage"],
    "Herdade do Esporao": ["wine", "gastronomy", "slow-luxury"],
    "Corticarte - Arte em Cortica": ["craft", "local-life", "nature"],
  },
  "tomar-coimbra": {
    "Tomar": ["heritage", "culture", "local-life"],
    "Convento de Cristo": ["heritage", "culture", "spiritual"],
    "Coimbra": ["heritage", "culture", "local-life"],
    "Universita Di Coimbra": ["heritage", "culture"],
    "Biblioteca Joanina": ["heritage", "culture", "hidden"],
  },
  "fatima-nazare-obidos": {
    "Fatima": ["spiritual", "heritage", "culture"],
    "Nazare": ["coast", "local-life", "gastronomy", "view"],
    "Praia da Nazare": ["coast", "nature"],
    "Obidos": ["heritage", "culture", "local-life", "romance"],
    "Castelo de Obidos": ["heritage", "culture", "view"],
  },
  "roman-heritage-alentejo": {
    "Villa Romana de São Cucufate": ["heritage", "culture", "hidden"],
    "Centro Interpretativo do Vinho de Talha": ["wine", "heritage", "culture"],
    "Vila Alva": ["local-life", "hidden", "slow-luxury"],
    "Adega do Mestre Daniel · XXVI Talhas": ["wine", "heritage", "craft", "hidden"],
    "Albergaria dos Fusos": ["nature", "hidden", "slow-luxury"],
  },
  "southwest-vicentine-coast": {
    "Ilha do Pessegueiro": ["coast", "view", "heritage"],
    "Porto Covo": ["coast", "local-life", "hidden"],
    "Vila Nova de Milfontes": ["coast", "local-life", "gastronomy"],
    "Parque Natural do Sudoeste Alentejano e Costa Vicentina": ["nature", "coast", "hidden"],
    "Odeceixe": ["coast", "nature", "hidden", "romance"],
    "Aljezur": ["heritage", "culture", "view"],
  },
};

export type TourIntentProfile = {
  tourId: string;
  /** Tour region string, verbatim from signatureTours.ts. */
  region: string;
  /** Number of stops carrying each intent. */
  tags: Partial<Record<StopIntent, number>>;
  /** For each intent, the labels of stops that carry it — used as
   *  evidence in the "Why this journey" UI. */
  evidence: Partial<Record<StopIntent, string[]>>;
  /** Top 3 intents by stop count. */
  dominant: StopIntent[];
};

const PROFILE_CACHE = new WeakMap<SignatureTour, TourIntentProfile>();

/** Aggregate a tour's stop-level intents into a profile. Memoised. */
export function tourIntentProfile(tour: SignatureTour): TourIntentProfile {
  const cached = PROFILE_CACHE.get(tour);
  if (cached) return cached;

  const stopMap = TOUR_STOP_INTENTS[tour.id] ?? {};
  const tags: Partial<Record<StopIntent, number>> = {};
  const evidence: Partial<Record<StopIntent, string[]>> = {};

  for (const stop of tour.stops) {
    const intents = stopMap[stop.label] ?? [];
    for (const intent of intents) {
      tags[intent] = (tags[intent] ?? 0) + 1;
      (evidence[intent] ??= []).push(stop.label);
    }
  }

  const dominant = (Object.entries(tags) as Array<[StopIntent, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([intent]) => intent);

  const profile: TourIntentProfile = {
    tourId: tour.id,
    region: tour.region,
    tags,
    evidence,
    dominant,
  };
  PROFILE_CACHE.set(tour, profile);
  return profile;
}

/** Coverage strength for one guest-facing Interest against a tour profile.
 *  ≥2 stops carry the intent → "strong"; 1 → "partial"; 0 → "none". */
export function interestCoverageFromProfile(
  profile: TourIntentProfile,
  interest: string,
): { strength: "strong" | "partial" | "none"; count: number; evidence: string[] } {
  const stopIntents = INTEREST_TO_STOP_INTENTS[interest] ?? [];
  let count = 0;
  const seen = new Set<string>();
  const evidence: string[] = [];
  for (const si of stopIntents) {
    count += profile.tags[si] ?? 0;
    for (const label of profile.evidence[si] ?? []) {
      if (!seen.has(label)) {
        seen.add(label);
        evidence.push(label);
      }
    }
  }
  const strength = count >= 2 ? "strong" : count >= 1 ? "partial" : "none";
  return { strength, count, evidence };
}
