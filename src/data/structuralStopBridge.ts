/**
 * STRUCTURAL STOP BRIDGE — declared identity between the two EXISTING id
 * spaces that already describe the same real moments:
 *
 *   `REGION_STOP_POOL[].id`   (inventory / Living Atlas composer)
 *   `TAILOR_BLUEPRINTS[].id`  (structural + commercial anchor truth)
 *
 * This file invents NOTHING. Every pair below is the SAME physical, already
 * published moment of the SAME Signature, present in both catalogues under a
 * different slug. It exists because the previous bridge was a normalized
 * label comparison, which silently failed whenever the two catalogues spell
 * the same place differently ("House & Museum José Maria da Fonseca" vs
 * "José Maria da Fonseca") and therefore demoted verified blueprint moments
 * to unidentified siblings.
 *
 * Rules:
 *  - A pair may only be declared when both entries are provably the same real
 *    place in the same Signature. Anything approximate (e.g. a village stop
 *    vs. a lunch slot in that village) is deliberately NOT declared, so the
 *    commercial ledger keeps failing closed.
 *  - The bridge is anchor-scoped: a blueprint id is only meaningful inside its
 *    own Signature blueprint.
 *  - It resolves identity only. It never implies inclusion, pricing, dwell
 *    time or availability — those authorities are unchanged.
 */

export const STRUCTURAL_STOP_BRIDGE: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "arrabida-wine-allinclusive": {
    "lunch-azeitao-table": "lunch-azeitao",
    "mercado-do-livramento": "livramento",
    "parque-natural-arrabida": "arrabida-park",
    "azulejos-de-azeitao": "azeitao-tiles",
    "jose-maria-da-fonseca": "jmf",
    "quinta-de-catralvos": "catralvos",
    "quinta-do-piloto": "piloto",
    "adega-cooperativa-palmela": "palmela",
    "bacalhoa-vinhos-de-portugal": "bacalhoa",
    "castelo-de-sesimbra": "sesimbra-castle",
  },
  "wild-beaches-picnic": {
    "mercado-do-livramento": "livramento",
    "sesimbra-village": "sesimbra-village",
    "castelo-de-sesimbra": "sesimbra-castle",
    "cabo-espichel": "cabo-espichel",
  },
  "arrabida-boat": {
    "mercado-do-livramento": "livramento",
    "arrabida-bay-boat": "boat-arrabida",
    "sesimbra-village": "sesimbra-village",
    "castelo-de-sesimbra": "sesimbra-castle",
    "cabo-espichel": "cabo-espichel",
  },
  "tiles-workshop": {
    "lunch-azeitao-table": "lunch-azeitao",
    "mercado-do-livramento": "livramento",
    "azulejos-painting-workshop": "azulejos-workshop",
    "jose-maria-da-fonseca": "jmf",
    "quinta-de-catralvos": "catralvos",
    "bacalhoa-vinhos-de-portugal": "bacalhoa",
    "castelo-de-sesimbra": "sesimbra-castle",
    "sesimbra-village": "sesimbra-village",
  },
  "azeitao-cheese": {
    "lunch-azeitao-table": "lunch-azeitao",
    "mercado-do-livramento": "livramento",
    "quinta-velha-cheese-workshop": "quinta-velha",
    "quinta-de-catralvos": "catralvos",
    "castelo-de-sesimbra": "sesimbra-castle",
  },
  "sintra-cascais": {
    "lunch-azenhas-table": "lunch-azenhas",
    "sintra-town": "sintra-vila",
    "sintra-national-palace": "sintra-palace",
    "pena-palace": "pena",
    "quinta-da-regaleira": "regaleira",
    "cabo-da-roca": "cabo-da-roca",
    "cascais-town": "cascais",
    "adega-regional-de-colares": "colares-winery",
  },
  "troia-comporta": {
    "lunch-comporta-table": "comporta-lunch",
    "roman-ruins-troia": "troia-ruins",
    // The blueprint core stop is published as "Comporta or Carvalhal beach",
    // so BOTH beaches are the same declared moment of this Signature.
    "praia-do-carvalhal": "comporta-beach",
    "herdade-da-comporta": "herdade-comporta",
    "comporta-beach": "comporta-beach",
    "cais-palafitico-carrasqueira": "carrasqueira",
  },
  "evora-alentejo": {
    "lunch-evora-table": "evora-lunch",
    "evora-city": "evora-old-town",
    "templo-romano-evora": "templo-romano",
    "capela-dos-ossos": "chapel-of-bones",
    "joao-portugal-ramos-wines": "ramos",
    "enoturismo-cartuxa": "cartuxa",
    "pera-grave-peramanca": "peramanca",
    "ervideira-winery": "ervideira",
    "herdade-do-esporao": "esporao",
    "corticarte-cork-workshop": "corticarte",
  },
  "tomar-coimbra": {
    "lunch-tomar-table": "tomar-lunch",
    "convento-de-cristo": "convento-cristo",
    "tomar-historic-center": "tomar-town",
    "universidade-de-coimbra": "coimbra-uni",
    "biblioteca-joanina": "biblioteca-joanina",
  },
  "fatima-nazare-obidos": {
    "lunch-nazare-table": "nazare-lunch",
    "fatima-sanctuary": "fatima",
    "praia-da-nazare": "nazare-beach",
    "obidos-medieval-town": "obidos",
  },
  "roman-heritage-alentejo": {
    "lunch-talha-table": "talha-lunch",
    "villa-romana-sao-cucufate": "sao-cucufate",
    "centro-interpretativo-vinho-talha": "vinho-talha",
    "vila-alva": "vila-alva",
    "adega-mestre-daniel-xxvi-talhas": "mestre-daniel",
    "albergaria-dos-fusos": "albergaria-fusos",
  },
};

/** Declared blueprint identity for an inventory stop inside one anchor. */
export function bridgedBlueprintStopId(
  anchorTourId: string,
  inventoryStopId: string | null | undefined,
): string | null {
  if (!inventoryStopId) return null;
  return STRUCTURAL_STOP_BRIDGE[anchorTourId]?.[inventoryStopId] ?? null;
}
