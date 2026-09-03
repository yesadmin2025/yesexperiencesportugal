/**
 * CATALOG STOP ALIASES — declared identity between the PUBLISHED catalogue
 * label of a Signature stop and the inventory stop id that describes the same
 * real moment.
 *
 * Same contract as `STRUCTURAL_STOP_BRIDGE`: nothing is invented, nothing is
 * guessed from similarity. Each pair below is the SAME physical, already
 * published moment of the SAME Signature, spelled differently in the public
 * catalogue ("Tile Painting Workshop – Sesimbra") and in the inventory pool
 * ("Private tile-painting workshop").
 *
 * It resolves identity only. It never implies inclusion, pricing, dwell time
 * or availability — those authorities are unchanged.
 */

export const CATALOG_STOP_ALIASES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "tiles-workshop": {
    "tile painting workshop - sesimbra": "azulejos-painting-workshop",
    "farm catralvos": "quinta-de-catralvos",
    "jose maria de fonseca": "jose-maria-da-fonseca",
    "bacalhoa vinhos de portugal": "bacalhoa-vinhos-de-portugal",
    sesimbra: "sesimbra-village",
  },
  "azeitao-cheese": {
    "quinta velha": "quinta-velha-cheese-workshop",
    "farm catralvos": "quinta-de-catralvos",
  },
  "arrabida-wine-allinclusive": {
    "farm catralvos": "quinta-de-catralvos",
  },
};

/** Normalized lookup key: dash variants folded, case and spacing collapsed. */
export function catalogAliasKey(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Declared inventory stop id for a published catalogue label, or null. */
export function aliasedInventoryStopId(anchorTourId: string, label: string): string | null {
  return CATALOG_STOP_ALIASES[anchorTourId]?.[catalogAliasKey(label)] ?? null;
}
