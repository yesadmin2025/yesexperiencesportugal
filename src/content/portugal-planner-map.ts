/**
 * Portugal planner map — single source of truth for the interactive homepage
 * map that lets a visitor explore the country region by region and jump
 * straight into the real Signature tours and the real Local Stories guides
 * that cover that region.
 *
 * NOTHING here is invented:
 *   - regions group EXISTING `signatureTours` ids (validated at build/test time)
 *   - guides are DERIVED from `LOCAL_STORIES_ARTICLES` via `signatureSlug`
 *   - coordinates are real WGS84 lat/lon projected onto a traced Portugal outline
 */

import { LOCAL_STORIES_ARTICLES, type LocalStoryArticle } from "@/content/local-stories-articles";
import { findTour, type SignatureTour } from "@/data/signatureTours";

export type PlannerRegion = {
  id: string;
  /** Short pin label shown on the map. */
  label: string;
  /** One-line orientation copy shown in the panel. */
  note: string;
  /** Real geographic centre of the region (WGS84 degrees). */
  lat: number;
  lon: number;
  /** Existing Signature tour ids that operate in this region. */
  tourIds: readonly string[];
};

/**
 * Projection used by the homepage map. Equirectangular, corrected for the
 * latitude of mainland Portugal, matching the traced coastline path exactly.
 */
export const PLANNER_MAP = {
  lonMin: -9.75,
  lonMax: -6.1,
  latMin: 36.85,
  latMax: 42.25,
  width: 67.8,
  height: 130,
} as const;

/** Project real lat/lon into the map viewBox. */
export function projectPlannerPoint(lat: number, lon: number): { x: number; y: number } {
  const { lonMin, lonMax, latMin, latMax, width, height } = PLANNER_MAP;
  return {
    x: ((lon - lonMin) / (lonMax - lonMin)) * width,
    y: ((latMax - lat) / (latMax - latMin)) * height,
  };
}

/** Where every private day starts and ends. Not a bookable region. */
export const PLANNER_ORIGIN = {
  label: "Lisbon",
  note: "Every private day starts and ends at your Lisbon door.",
  lat: 38.72,
  lon: -9.14,
} as const;

/** North → south, so the pin order reads like the country. */
export const PLANNER_REGIONS: readonly PlannerRegion[] = [
  {
    id: "tomar-coimbra",
    label: "Tomar & Coimbra",
    note: "The Templar convent at Tomar and the old university city on the Mondego.",
    lat: 39.9,
    lon: -8.42,
    tourIds: ["tomar-coimbra"],
  },
  {
    id: "fatima-nazare-obidos",
    label: "Fátima, Nazaré & Óbidos",
    note: "The sanctuary, the giant-wave headland at Nazaré, and walled Óbidos.",
    lat: 39.52,
    lon: -9.0,
    tourIds: ["fatima-nazare-obidos"],
  },
  {
    id: "sintra-cascais",
    label: "Sintra & Cascais",
    note: "Palaces in the mist, Cabo da Roca, and the coast road back into Cascais.",
    lat: 38.79,
    lon: -9.42,
    tourIds: ["sintra-cascais"],
  },
  {
    id: "azeitao-sesimbra",
    label: "Azeitão & Sesimbra",
    note: "Cheese cellars, tile studios and a working fishing harbour under the ridge.",
    lat: 38.47,
    lon: -9.11,
    tourIds: ["azeitao-cheese", "tiles-workshop"],
  },
  {
    id: "arrabida-setubal",
    label: "Arrábida & Setúbal",
    note: "Moscatel cellars, the Livramento market, the ridge road and the green-water coves.",
    lat: 38.52,
    lon: -8.87,
    tourIds: ["arrabida-wine-allinclusive", "arrabida-boat", "wild-beaches-picnic"],
  },
  {
    id: "troia-comporta",
    label: "Tróia & Comporta",
    note: "Roman ruins across the estuary, rice fields, pine and long white sand.",
    lat: 38.38,
    lon: -8.78,
    tourIds: ["troia-comporta"],
  },
  {
    id: "alentejo",
    label: "Évora & Alentejo",
    note: "Roman Évora, clay-pot talha wine and cellars that still ferment the old way.",
    lat: 38.57,
    lon: -7.91,
    tourIds: ["evora-alentejo"],
  },
  {
    id: "roman-alentejo",
    label: "Vidigueira & Roman Alentejo",
    note: "Deep Alentejo — Roman villas, amphora wine and cellars few travellers reach.",
    lat: 38.21,
    lon: -7.8,
    tourIds: ["roman-heritage-alentejo"],
  },
  {
    id: "vicentina",
    label: "Costa Vicentina",
    note: "The wild southwest — cliffs, empty beaches and the longest drive of the day.",
    lat: 37.35,
    lon: -8.8,
    tourIds: ["southwest-vicentine-coast"],
  },
] as const;


export type PlannerRegionResolved = PlannerRegion & {
  tours: SignatureTour[];
  guides: LocalStoryArticle[];
};

/** Resolve a region to its real tours + the guides that point at those tours. */
export function resolvePlannerRegion(region: PlannerRegion): PlannerRegionResolved {
  const tours = region.tourIds
    .map((id) => findTour(id))
    .filter((t): t is SignatureTour => Boolean(t));
  const guides = LOCAL_STORIES_ARTICLES.filter((a) =>
    region.tourIds.includes(a.signatureSlug),
  ).sort((a, b) => b.datePublished.localeCompare(a.datePublished));
  return { ...region, tours, guides };
}

export function resolvePlannerRegions(): PlannerRegionResolved[] {
  return PLANNER_REGIONS.map(resolvePlannerRegion);
}
