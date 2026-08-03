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

export type LivingAtlasBuilderRegionKey =
  (typeof LIVING_ATLAS_BUILDER_REGION_KEYS)[number];

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
 * Translate a real Builder stop into the Living Atlas vocabulary.
 *
 * Evidence comes from existing tags and the verified stop label only. It does
 * not generate content, infer a new stop or call AI. The result is deliberately
 * multi-label: Fátima can be faith + heritage; Nazaré can be coast + local life.
 */
export function deriveLivingAtlasDimensions(
  stop: LivingAtlasStopEvidenceInput,
): ExperienceDimensionId[] {
  const dimensions = new Set<ExperienceDimensionId>();
  const legacyTags = [stop.tag, ...(stop.intentionTags ?? [])]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase());

  for (const tag of legacyTags) {
    for (const dimension of LEGACY_TAG_RULES[tag] ?? []) dimensions.add(dimension);
  }

  for (const rule of LABEL_RULES) {
    if (rule.pattern.test(stop.label)) dimensions.add(rule.dimension);
  }

  return [...dimensions];
}

export function signatureBuilderRegion(
  signatureId: LivingAtlasSignatureId,
): LivingAtlasBuilderRegionKey {
  return SIGNATURE_BUILDER_REGION[signatureId];
}
