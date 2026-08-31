// YES Experience Studio — Living Atlas taxonomy.
//
// This module is deliberately pure and data-only. It introduces the future
// decision vocabulary without changing the current Studio V3 flow. The
// selection engine and UI can migrate onto it incrementally behind a flag.

export const EXPERIENCE_DIMENSION_IDS = [
  "faith-reflection",
  "history-heritage",
  "wine-table",
  "atlantic-coast",
  "hands-on-traditions",
  "local-life",
  "nature-landscapes",
] as const;

export type ExperienceDimensionId = (typeof EXPERIENCE_DIMENSION_IDS)[number];

export const MAX_SELECTED_DIMENSIONS = 3 as const;
export const MAX_LEAD_DIMENSIONS = 2 as const;

export type ExperienceDimension = {
  id: ExperienceDimensionId;
  label: string;
  whisper: string;
};

export const EXPERIENCE_DIMENSIONS: readonly ExperienceDimension[] = [
  {
    id: "faith-reflection",
    label: "Faith & reflection",
    whisper: "Sanctuaries, sacred history and space to pause.",
  },
  {
    id: "history-heritage",
    label: "History & heritage",
    whisper: "Roman remains, palaces, Templars and old cities.",
  },
  {
    id: "wine-table",
    label: "Wine & the Portuguese table",
    whisper: "Cellars, regional flavours and long local lunches.",
  },
  {
    id: "atlantic-coast",
    label: "The Atlantic",
    whisper: "Boats, beaches, cliffs and coastal roads.",
  },
  {
    id: "hands-on-traditions",
    label: "Hands-on traditions",
    whisper: "Tiles, cheese and Portuguese craft made with local hands.",
  },
  {
    id: "local-life",
    label: "Local life & quieter places",
    whisper: "Markets, villages, makers and Portugal beyond the obvious.",
  },
  {
    id: "nature-landscapes",
    label: "Nature & open landscapes",
    whisper: "Vineyards, forests, coves and wide horizons.",
  },
] as const;

export type ExperienceProfile = {
  /** One to three things that must genuinely belong in the final day. */
  selected: ExperienceDimensionId[];
  /** One lead, or two co-leads when the guest wants an equal balance. */
  leads: ExperienceDimensionId[];
};

export type ExperienceProfileValidation =
  | { ok: true; profile: ExperienceProfile }
  | {
      ok: false;
      reason:
        | "select-at-least-one"
        | "select-at-most-three"
        | "lead-at-least-one"
        | "lead-at-most-two"
        | "lead-must-be-selected"
        | "duplicate-selection"
        | "duplicate-lead";
    };

function hasDuplicates<T>(items: readonly T[]): boolean {
  return new Set(items).size !== items.length;
}

/**
 * Validate the intent hierarchy before it reaches scoring.
 *
 * Contract:
 * - 1–3 selected dimensions;
 * - 1–2 lead dimensions;
 * - every lead is one of the selected dimensions;
 * - no duplicate values.
 *
 * Two leads mean "share the day". A third selected dimension remains a
 * required supporting thread, but may not distort the geography or timing.
 */
export function validateExperienceProfile(profile: ExperienceProfile): ExperienceProfileValidation {
  if (profile.selected.length < 1) return { ok: false, reason: "select-at-least-one" };
  if (profile.selected.length > MAX_SELECTED_DIMENSIONS)
    return { ok: false, reason: "select-at-most-three" };
  if (profile.leads.length < 1) return { ok: false, reason: "lead-at-least-one" };
  if (profile.leads.length > MAX_LEAD_DIMENSIONS) return { ok: false, reason: "lead-at-most-two" };
  if (hasDuplicates(profile.selected)) return { ok: false, reason: "duplicate-selection" };
  if (hasDuplicates(profile.leads)) return { ok: false, reason: "duplicate-lead" };
  if (profile.leads.some((lead) => !profile.selected.includes(lead)))
    return { ok: false, reason: "lead-must-be-selected" };
  return { ok: true, profile };
}

export type DecisionProfileValidation =
  | { ok: true; profile: ExperienceProfile }
  | {
      ok: false;
      reason:
        | "select-at-least-one"
        | "lead-at-least-one"
        | "lead-at-most-two"
        | "lead-must-be-selected"
        | "duplicate-selection"
        | "duplicate-lead";
    };

/**
 * BUILD 2 / Pass 4 — validator for the FULL decision profile.
 *
 * Identical to the legacy contract except that there is deliberately NO
 * max-selected limit: a traveller who asked for six things is never silently
 * reduced to three before scoring.
 */
export function validateDecisionProfile(profile: ExperienceProfile): DecisionProfileValidation {
  if (profile.selected.length < 1) return { ok: false, reason: "select-at-least-one" };
  if (profile.leads.length < 1) return { ok: false, reason: "lead-at-least-one" };
  if (profile.leads.length > MAX_LEAD_DIMENSIONS) return { ok: false, reason: "lead-at-most-two" };
  if (hasDuplicates(profile.selected)) return { ok: false, reason: "duplicate-selection" };
  if (hasDuplicates(profile.leads)) return { ok: false, reason: "duplicate-lead" };
  if (profile.leads.some((lead) => !profile.selected.includes(lead)))
    return { ok: false, reason: "lead-must-be-selected" };
  return { ok: true, profile };
}


export const LIVING_ATLAS_SIGNATURE_IDS = [
  "arrabida-wine-allinclusive",
  "arrabida-boat",
  "wild-beaches-picnic",
  "tiles-workshop",
  "azeitao-cheese",
  "sintra-cascais",
  "troia-comporta",
  "evora-alentejo",
  "tomar-coimbra",
  "fatima-nazare-obidos",
  "roman-heritage-alentejo",
  "southwest-vicentine-coast",
] as const;

export type LivingAtlasSignatureId = (typeof LIVING_ATLAS_SIGNATURE_IDS)[number];
export type AffinityStrength = 0 | 1 | 2 | 3;

/**
 * 3 = structural truth of the Signature
 * 2 = meaningful built-in thread
 * 1 = compatible supporting thread
 * 0 = not promised by the Signature
 *
 * These affinities only shortlist and explain. They never override a direct
 * destination choice, operational constraints, price truth or availability.
 */
export const SIGNATURE_DIMENSION_AFFINITY: Readonly<
  Record<LivingAtlasSignatureId, Readonly<Record<ExperienceDimensionId, AffinityStrength>>>
> = {
  "arrabida-wine-allinclusive": {
    "faith-reflection": 0,
    "history-heritage": 1,
    "wine-table": 3,
    "atlantic-coast": 1,
    "hands-on-traditions": 0,
    "local-life": 2,
    "nature-landscapes": 2,
  },
  "arrabida-boat": {
    "faith-reflection": 0,
    "history-heritage": 1,
    "wine-table": 1,
    "atlantic-coast": 3,
    "hands-on-traditions": 0,
    "local-life": 2,
    "nature-landscapes": 3,
  },
  "wild-beaches-picnic": {
    "faith-reflection": 0,
    "history-heritage": 0,
    "wine-table": 1,
    "atlantic-coast": 3,
    "hands-on-traditions": 0,
    "local-life": 1,
    "nature-landscapes": 3,
  },
  "tiles-workshop": {
    "faith-reflection": 0,
    "history-heritage": 2,
    "wine-table": 2,
    "atlantic-coast": 1,
    "hands-on-traditions": 3,
    "local-life": 3,
    "nature-landscapes": 1,
  },
  "azeitao-cheese": {
    "faith-reflection": 0,
    "history-heritage": 1,
    "wine-table": 3,
    "atlantic-coast": 1,
    "hands-on-traditions": 3,
    "local-life": 3,
    "nature-landscapes": 1,
  },
  "sintra-cascais": {
    "faith-reflection": 0,
    "history-heritage": 3,
    "wine-table": 1,
    "atlantic-coast": 2,
    "hands-on-traditions": 0,
    "local-life": 1,
    "nature-landscapes": 2,
  },
  "troia-comporta": {
    "faith-reflection": 0,
    "history-heritage": 2,
    "wine-table": 2,
    "atlantic-coast": 3,
    "hands-on-traditions": 0,
    "local-life": 3,
    "nature-landscapes": 3,
  },
  "evora-alentejo": {
    "faith-reflection": 1,
    "history-heritage": 3,
    "wine-table": 3,
    "atlantic-coast": 0,
    "hands-on-traditions": 1,
    "local-life": 2,
    "nature-landscapes": 2,
  },
  "tomar-coimbra": {
    "faith-reflection": 2,
    "history-heritage": 3,
    "wine-table": 0,
    "atlantic-coast": 0,
    "hands-on-traditions": 0,
    "local-life": 2,
    "nature-landscapes": 1,
  },
  "fatima-nazare-obidos": {
    "faith-reflection": 3,
    "history-heritage": 2,
    "wine-table": 0,
    "atlantic-coast": 2,
    "hands-on-traditions": 0,
    "local-life": 2,
    "nature-landscapes": 1,
  },
  "roman-heritage-alentejo": {
    "faith-reflection": 0,
    "history-heritage": 3,
    "wine-table": 3,
    "atlantic-coast": 0,
    "hands-on-traditions": 2,
    "local-life": 3,
    "nature-landscapes": 2,
  },
  "southwest-vicentine-coast": {
    "faith-reflection": 0,
    "history-heritage": 1,
    "wine-table": 0,
    "atlantic-coast": 3,
    "hands-on-traditions": 0,
    "local-life": 2,
    "nature-landscapes": 3,
  },
};

export type DiscoveryDoor = {
  signatureId: LivingAtlasSignatureId;
  leads: readonly ExperienceDimensionId[];
  supporting: readonly ExperienceDimensionId[];
  distinction: string;
};

/**
 * A guaranteed human-readable discovery route for every Signature.
 * Precision Fork copy may evolve, but every commercial product must remain
 * reachable without relying on array order, randomness or model output.
 */
export const SIGNATURE_DISCOVERY_DOORS: readonly DiscoveryDoor[] = [
  {
    signatureId: "arrabida-wine-allinclusive",
    leads: ["wine-table"],
    supporting: ["local-life", "nature-landscapes"],
    distinction: "Family wineries close to Lisbon and a generous regional table.",
  },
  {
    signatureId: "arrabida-boat",
    leads: ["atlantic-coast"],
    supporting: ["nature-landscapes", "local-life"],
    distinction: "Meet the Arrábida coast from the water and enter its coves.",
  },
  {
    signatureId: "wild-beaches-picnic",
    leads: ["atlantic-coast", "nature-landscapes"],
    supporting: [],
    distinction: "Stillness, beach time and a private picnic rather than a moving boat day.",
  },
  {
    signatureId: "tiles-workshop",
    leads: ["hands-on-traditions"],
    supporting: ["history-heritage", "wine-table"],
    distinction: "Paint a Portuguese azulejo and take part in a living craft.",
  },
  {
    signatureId: "azeitao-cheese",
    leads: ["hands-on-traditions", "wine-table"],
    supporting: ["local-life"],
    distinction: "Make traditional Azeitão cheese and connect it to the region's wine culture.",
  },
  {
    signatureId: "sintra-cascais",
    leads: ["history-heritage"],
    supporting: ["atlantic-coast", "nature-landscapes"],
    distinction: "Palaces, estates and Atlantic cliffs in one day.",
  },
  {
    signatureId: "troia-comporta",
    leads: ["atlantic-coast", "local-life"],
    supporting: ["history-heritage", "wine-table", "nature-landscapes"],
    distinction: "Ferry, Roman ruins, rice fields, wine and the quieter Alentejo coast.",
  },
  {
    signatureId: "evora-alentejo",
    leads: ["history-heritage", "wine-table"],
    supporting: ["local-life", "nature-landscapes"],
    distinction: "Monumental Évora and the classic estates of Alentejo wine country.",
  },
  {
    signatureId: "tomar-coimbra",
    leads: ["history-heritage"],
    supporting: ["faith-reflection", "local-life"],
    distinction: "Templars, ancient orders and Portugal's scholarly heritage.",
  },
  {
    signatureId: "fatima-nazare-obidos",
    leads: ["faith-reflection"],
    supporting: ["atlantic-coast", "history-heritage"],
    distinction: "Living faith, Atlantic scenery and a medieval walled town.",
  },
  {
    signatureId: "roman-heritage-alentejo",
    leads: ["history-heritage", "wine-table"],
    supporting: ["local-life", "hands-on-traditions"],
    distinction: "An intimate Alentejo of Roman roots, clay talhas and a family cellar.",
  },
  {
    signatureId: "southwest-vicentine-coast",
    leads: ["atlantic-coast", "nature-landscapes"],
    supporting: ["local-life"],
    distinction: "A remote, wild coastline of villages, river mouths and open Atlantic landscape.",
  },
] as const;

export function discoveryDoorFor(signatureId: LivingAtlasSignatureId): DiscoveryDoor {
  const door = SIGNATURE_DISCOVERY_DOORS.find((item) => item.signatureId === signatureId);
  if (!door) throw new Error(`Missing Living Atlas discovery door for ${signatureId}`);
  return door;
}
