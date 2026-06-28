/**
 * Derive editorial chapters + builder add-ons from the Tailor blueprint.
 *
 * The blueprint is the single source of truth for what a Signature
 * really sells (see `src/data/tailorBlueprints.ts`). This module
 * projects that truth into two consumer shapes:
 *
 *   • `toEditorialChapters(blueprint)` — for the tour detail page
 *     itinerary timeline and the route map. Core stops in order,
 *     followed by a single grouped "Choose N…" chapter when the
 *     blueprint has a Choice pool, followed by each Optional as a
 *     chapter flagged `optional: true`.
 *
 *   • `getSignatureOptionalAddOns(tourId)` — for the Studio V3 builder.
 *     Returns the Optional stops so they can be surfaced as add-ons
 *     when the user anchors on the region tied to this Signature.
 *
 * If a tour has no blueprint, both helpers return `null` / `[]` and
 * the caller falls back to its previous data source.
 */

import type {
  BlueprintStop,
  TailorBlueprint,
} from "@/data/tailorBlueprints";
import { getTailorBlueprint } from "@/data/tailorBlueprints";

export interface EditorialChapter {
  /** Editorial headline — e.g. "Two or three family wineries". */
  label: string;
  /** One concise sentence — what actually happens here. */
  story: string;
  /** Mark optional chapters with a gold "Optional" pill. */
  optional?: boolean;
  /** Canonical stop name in the Viator `stops[]` array for map snap. */
  representativeStop?: string;
}

/** Map a blueprint stop label back to the Viator `stops[].name` so the
 *  RouteMap can resolve coordinates. Keep this list aligned with
 *  `signatureToursViator.ts`. */
const REPRESENTATIVE: Record<string, string> = {
  livramento: "Mercado do Livramento",
  "arrabida-park": "Parque Natural da Arrabida",
  "arrabida-drive": "Parque Natural da Arrabida",
  "azeitao-tiles": "Azulejos de Azeitao",
  "azulejos-workshop": "Azulejos de Azeitao",
  "lunch-azeitao": "Azeitao",
  "hidden-cove": "Portinho da Arrabida",
  "sesimbra-village": "Sesimbra",
  "boat-arrabida": "Lapa de Santa Margarida",
  "quinta-velha": "Quinta Velha",
  catralvos: "Farm Catralvos",
  "sintra-vila": "Sintra",
  "lunch-azenhas": "Azenhas do Mar",
  "cabo-da-roca": "Cabo Da Roca",
  cascais: "Cascais",
  pena: "Park and National Palace of Pena",
  regaleira: "Quinta da Regaleira",
  "sintra-palace": "Sintra National Palace",
  "colares-winery": "Adega Regional de Colares",
  "sado-ferry": "Baia de Setubal",
  "troia-ruins": "Roman Ruins of Troia",
  "herdade-comporta": "Herdade Da Comporta",
  "comporta-lunch": "Comporta",
  "comporta-beach": "Comporta Beach",
  carrasqueira: "Cais Palafitico do Porto da Carrasqueira",
  "evora-old-town": "Evora",
  "templo-romano": "Templo Romano de Evora (Templo de Diana)",
  "chapel-of-bones": "Chapel of Bones",
  "evora-lunch": "Evora",
  ramos: "Joao Portugal Ramos Wines",
  cartuxa: "Enoturismo Cartuxa",
  peramanca: "Pera-grave - Qta S. Jose De Peramanca",
  ervideira: "Ervideira",
  esporao: "Herdade do Esporao",
  corticarte: "Corticarte - Arte em Cortica",
  "convento-cristo": "Convento de Cristo",
  "tomar-town": "Tomar",
  "tomar-lunch": "Tomar",
  "coimbra-uni": "Universita Di Coimbra",
  "biblioteca-joanina": "Biblioteca Joanina",
  fatima: "Fatima",
  "nazare-beach": "Praia da Nazare",
  "nazare-lunch": "Nazare",
  obidos: "Castelo de Obidos",
  "sao-cucufate": "Villa Romana de Sao Cucufate",
  "vinho-talha": "Centro Interpretativo do Vinho de Talha",
  "vila-alva": "Vila Alva",
  "mestre-daniel": "Adega do Mestre Daniel - XXVI Talhas",
  "talha-lunch": "Vila Alva",
  "albergaria-fusos": "Albergaria dos Fusos",
  "cristo-rei": "Santuario Nacional de Cristo Rei",
  "sesimbra-castle": "Castelo de Sesimbra",
  "cabo-espichel": "Cabo Espichel",
};

function repFor(stop: BlueprintStop): string | undefined {
  return REPRESENTATIVE[stop.id];
}

function storyFor(stop: BlueprintStop): string {
  return stop.blurb ?? stop.label;
}

/**
 * Project a blueprint into 4–6 editorial chapters for the tour detail
 * page. Returns `null` when no blueprint exists for that tourId.
 */
export function toEditorialChapters(
  tourId: string,
): EditorialChapter[] | null {
  const bp = getTailorBlueprint(tourId);
  if (!bp) return null;

  const chapters: EditorialChapter[] = [];

  for (const stop of bp.core) {
    chapters.push({
      label: stop.label,
      story: storyFor(stop),
      representativeStop: repFor(stop),
    });
  }

  if (bp.choice && bp.choice.options.length > 0) {
    const n = bp.choice.pickCount;
    const cat = bp.choice.options[0].category;
    const categoryLabel =
      cat === "winery"
        ? n === 1
          ? "family winery"
          : `family wineries`
        : cat === "monument"
          ? n === 1
            ? "palace or monument"
            : "palaces or monuments"
          : "stops";
    chapters.push({
      label: `${n === 1 ? "One" : n === 2 ? "Two" : n === 3 ? "Three" : String(n)} ${categoryLabel}`,
      story: bp.choice.note,
      representativeStop: repFor(bp.choice.options[0]),
    });
  }

  for (const stop of bp.optional) {
    chapters.push({
      label: stop.label,
      story: storyFor(stop),
      optional: true,
      representativeStop: repFor(stop),
    });
  }

  return chapters;
}

/**
 * Builder helper — return the Optional stops from this Signature's
 * blueprint so the builder can offer them as add-ons when the user
 * anchors on the matching region. Returns an empty array when no
 * blueprint exists.
 */
export function getSignatureOptionalAddOns(
  tourId: string,
): BlueprintStop[] {
  const bp = getTailorBlueprint(tourId);
  if (!bp) return [];
  return bp.optional;
}

export type { BlueprintStop, TailorBlueprint };
