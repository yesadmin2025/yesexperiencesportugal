import type { StopCapability } from "@/data/regionStopPool";
import type {
  ExperienceDimensionId,
  LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";


export const LIVING_ATLAS_BUILDER_REGION_KEYS = [
  "arrabida-setubal",
  "sintra-cascais",
  "troia-comporta",
  "evora-alentejo",
  "centro-tomar-coimbra",
  "centro-fatima-nazare-obidos",
  "alentejo",
] as const;

export type LivingAtlasBuilderRegionKey = (typeof LIVING_ATLAS_BUILDER_REGION_KEYS)[number];

/**
 * Canonical region ownership for every Signature.
 *
 * This intentionally bypasses the legacy `seed.region` values in
 * signatureTours.ts. Tomar and Fátima are currently mislabelled as Alentejo
 * in that legacy seed, while their product region and Builder data correctly
 * place them in Central Portugal.
 */
export const SIGNATURE_BUILDER_REGION: Readonly<
  Record<LivingAtlasSignatureId, LivingAtlasBuilderRegionKey>
> = {
  "arrabida-wine-allinclusive": "arrabida-setubal",
  "arrabida-boat": "arrabida-setubal",
  "wild-beaches-picnic": "arrabida-setubal",
  "tiles-workshop": "arrabida-setubal",
  "azeitao-cheese": "arrabida-setubal",
  "sintra-cascais": "sintra-cascais",
  "troia-comporta": "troia-comporta",
  "evora-alentejo": "evora-alentejo",
  "tomar-coimbra": "centro-tomar-coimbra",
  "fatima-nazare-obidos": "centro-fatima-nazare-obidos",
  "roman-heritage-alentejo": "alentejo",
  "southwest-vicentine-coast": "alentejo",
};

export type LivingAtlasStopEvidenceInput = {
  label: string;
  tag?: string | null;
  intentionTags?: readonly string[] | null;
  /**
   * Verified structural capabilities of a REAL inventory stop.
   *
   * Presence of this key (even as an empty array) switches the derivation
   * into AUTHORITATIVE INVENTORY MODE: `hands-on-traditions` is then decided
   * exclusively by `participatory` and the legacy label regex can no longer
   * promote an observational stop into hands-on Studio inventory.
   *
   * Free-text callers (route point labels, stories) omit it and keep the
   * legacy, non-authoritative label evidence.
   */
  capabilities?: readonly StopCapability[];
};


const LABEL_RULES: ReadonlyArray<{
  dimension: ExperienceDimensionId;
  pattern: RegExp;
}> = [
  {
    dimension: "faith-reflection",
    pattern:
      /\b(f[aá]tima|sanctuar|santu[aá]rio|pilgrim|peregrin|chapel|capela|convent|convento|monaster|mosteiro|church|igreja|sacred|templar|temple|templo)\b/i,
  },
  {
    dimension: "history-heritage",
    pattern:
      /\b(roman|romano|ruins?|ru[ií]nas|castle|castelo|palace|pal[aá]cio|heritage|patrim[oó]nio|medieval|historic|hist[oó]ric|university|universidade|library|biblioteca|templar|convent|convento|temple|templo|chapel|capela)\b/i,
  },
  {
    dimension: "wine-table",
    pattern:
      /\b(wine|vinho|winery|wineries|adega|vineyard|vinha|tasting|prova|talha|cheese|queijo|gastronomy|gastronomia|lunch|almo[cç]o|table|mesa|market|mercado)\b/i,
  },
  {
    dimension: "atlantic-coast",
    pattern:
      /\b(atlantic|atl[aâ]ntic|coast|costa|coastal|beach|praia|boat|barco|ferry|cove|enseada|cliff|fal[eé]sia|nazare|nazar[eé]|sesimbra|troia|tr[oó]ia|comporta)\b/i,
  },
  {
    dimension: "hands-on-traditions",
    pattern:
      /\b(workshop|atelier|paint|painting|pintura|tile|tiles|azulejo|cheese.?making|fazer queijo|pottery|ceramic|cer[aâ]mica|cork|corti[cç]a|maker|artisan|artes[aã])\b/i,
  },
  {
    dimension: "local-life",
    pattern:
      /\b(market|mercado|village|vila|aldeia|fisher|pescador|local|maker|artisan|family|fam[ií]lia|comporta|azeit[aã]o|sesimbra|tomar|coimbra|[oó]bidos|obidos|porto covo|milfontes|aljezur)\b/i,
  },
  {
    dimension: "nature-landscapes",
    pattern:
      /\b(nature|natural|park|parque|forest|floresta|pine|pinhal|vineyard|vinha|landscape|paisagem|viewpoint|miradouro|cliff|fal[eé]sia|beach|praia|river|rio|cove|enseada|dunes?|dunas?|mountain|serra)\b/i,
  },
];

const LEGACY_TAG_RULES: Readonly<Record<string, readonly ExperienceDimensionId[]>> = {
  heritage: ["history-heritage"],
  wine: ["wine-table"],
  gastronomy: ["wine-table", "local-life"],
  coast: ["atlantic-coast"],
  coastal: ["atlantic-coast"],
  nature: ["nature-landscapes"],
  hidden: ["local-life"],
  wellness: ["faith-reflection", "nature-landscapes"],
  wonder: ["history-heritage", "nature-landscapes"],
};

/**
 * Capabilities that authoritatively PROVE a dimension for real inventory.
 * Deterministic, inventory-bound, no labels, no AI.
 */
const CAPABILITY_RULES: Readonly<Record<StopCapability, readonly ExperienceDimensionId[]>> = {
  participatory: ["hands-on-traditions"],
  "from-water": ["atlantic-coast"],
};

/**
 * Dimensions that may ONLY be produced by verified capabilities when the
 * caller supplies inventory capabilities. The legacy label regex is demoted
 * to non-authoritative evidence for these.
 */
const CAPABILITY_ONLY_DIMENSIONS: ReadonlySet<ExperienceDimensionId> = new Set([
  "hands-on-traditions",
]);

/**
 * Translate a real Builder stop into the Living Atlas vocabulary.
 *
 * Evidence comes from verified structural capabilities, existing tags and the
 * verified stop label. It does not generate content, infer a new stop or call
 * AI. The result is deliberately multi-label: Fátima can be faith + heritage;
 * Nazaré can be coast + local life.
 *
 * BUILD 1 / Pass 3 — CAPABILITY AUTHORITY. When `capabilities` is supplied
 * (authoritative inventory mode), `hands-on-traditions` requires an explicit
 * verified `participatory` capability. A `type: "workshop"` stop or a craft
 * keyword in the name can NEVER make an observational moment hands-on.
 */
export function deriveLivingAtlasDimensions(
  stop: LivingAtlasStopEvidenceInput,
): ExperienceDimensionId[] {
  const dimensions = new Set<ExperienceDimensionId>();
  const inventoryMode = stop.capabilities !== undefined;
  const legacyTags = [stop.tag, ...(stop.intentionTags ?? [])]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase());

  for (const tag of legacyTags) {
    for (const dimension of LEGACY_TAG_RULES[tag] ?? []) {
      if (inventoryMode && CAPABILITY_ONLY_DIMENSIONS.has(dimension)) continue;
      dimensions.add(dimension);
    }
  }

  for (const rule of LABEL_RULES) {
    if (inventoryMode && CAPABILITY_ONLY_DIMENSIONS.has(rule.dimension)) continue;
    if (rule.pattern.test(stop.label)) dimensions.add(rule.dimension);
  }

  for (const capability of stop.capabilities ?? []) {
    for (const dimension of CAPABILITY_RULES[capability] ?? []) dimensions.add(dimension);
  }

  return [...dimensions];
}


export function signatureBuilderRegion(
  signatureId: LivingAtlasSignatureId,
): LivingAtlasBuilderRegionKey {
  return SIGNATURE_BUILDER_REGION[signatureId];
}
