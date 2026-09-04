/**
 * Portugal planner map — single source of truth for the interactive homepage
 * map that lets a visitor explore the country town by town and jump straight
 * into the real Signature tours and the real Local Stories guides that cover
 * that place.
 *
 * NOTHING here is invented:
 *   - every place resolves its coordinates from the curated gazetteer
 *     (`STOP_LATLNG`) via `geoKey` — no hand-typed lat/lon
 *   - places group EXISTING `signatureTours` ids (validated in tests)
 *   - guides are DERIVED from `LOCAL_STORIES_ARTICLES` via `signatureSlug`
 */

import { LOCAL_STORIES_ARTICLES, type LocalStoryArticle } from "@/content/local-stories-articles";
import { findTour, type SignatureTour } from "@/data/signatureTours";
import { STOP_LATLNG } from "@/data/stopGeo";

export type PlannerRegion = {
  id: string;
  /** Short pin label shown on the map. */
  label: string;
  /** One-line orientation copy shown in the panel. */
  note: string;
  /** Key into the curated gazetteer, when the place is a real tour stop. */
  geoKey?: string;
  /** Real geographic position (WGS84 degrees). */
  lat: number;
  lon: number;
  /** Existing Signature tour ids that operate in this place. May be empty for
   *  places we cover as private designed days and write about in the Journal. */
  tourIds: readonly string[];
  /** Mainland pins project onto the map; island pins render in the inset. */
  area: "mainland" | "islands";
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

/** Where every private day starts and ends. Not a bookable place. */
export const PLANNER_ORIGIN = {
  label: "Lisbon",
  note: "Every private day starts and ends at your Lisbon door.",
  lat: 38.72,
  lon: -9.14,
} as const;

type PlaceSeed = Omit<PlannerRegion, "lat" | "lon" | "area"> &
  Partial<Pick<PlannerRegion, "lat" | "lon" | "area">>;


/** North → south, so the pin order reads like the country. */
const PLACE_SEEDS: readonly PlaceSeed[] = [
  {
    id: "coimbra",
    label: "Coimbra",
    note: "The old university city on the Mondego, and the Joanina library.",
    geoKey: "coimbra",
    tourIds: ["tomar-coimbra"],
  },
  {
    id: "nazare",
    label: "Nazaré",
    note: "The headland above the canyon that makes the giant winter waves.",
    geoKey: "nazare",
    tourIds: ["fatima-nazare-obidos"],
  },
  {
    id: "fatima",
    label: "Fátima",
    note: "The sanctuary, quiet outside the pilgrimage hours.",
    geoKey: "fatima",
    tourIds: ["fatima-nazare-obidos"],
  },
  {
    id: "tomar",
    label: "Tomar",
    note: "The Templar Convento de Cristo above the town.",
    geoKey: "tomar",
    tourIds: ["tomar-coimbra"],
  },
  {
    id: "obidos",
    label: "Óbidos",
    note: "Walled streets, and the walk along the ramparts.",
    geoKey: "obidos",
    tourIds: ["fatima-nazare-obidos"],
  },
  {
    id: "sintra",
    label: "Sintra",
    note: "Palaces in the mist, Regaleira's wells and the Colares cellars.",
    geoKey: "sintra",
    tourIds: ["sintra-cascais"],
  },
  {
    id: "cabo-da-roca",
    label: "Cabo da Roca",
    note: "The westernmost point of continental Europe.",
    geoKey: "cabo da roca",
    tourIds: ["sintra-cascais"],
  },
  {
    id: "cascais",
    label: "Cascais",
    note: "The coast road back into town, and the bay at the end of it.",
    geoKey: "cascais",
    tourIds: ["sintra-cascais"],
  },
  {
    id: "setubal",
    label: "Setúbal",
    note: "The Livramento market at opening hour, and the Sado waterfront.",
    geoKey: "setubal",
    tourIds: [
      "arrabida-wine-allinclusive",
      "arrabida-boat",
      "wild-beaches-picnic",
      "tiles-workshop",
      "azeitao-cheese",
      "troia-comporta",
    ],
  },
  {
    id: "azeitao",
    label: "Azeitão",
    note: "Cheese cellars, tile studios and the Moscatel houses.",
    geoKey: "azeitao",
    tourIds: ["azeitao-cheese", "tiles-workshop", "arrabida-wine-allinclusive"],
  },
  {
    id: "arrabida",
    label: "Arrábida",
    note: "The ridge road, the green water and the coves below it.",
    geoKey: "arrabida",
    tourIds: ["arrabida-wine-allinclusive", "arrabida-boat", "wild-beaches-picnic"],
  },
  {
    id: "sesimbra",
    label: "Sesimbra",
    note: "A working fishing harbour under the castle.",
    geoKey: "sesimbra",
    tourIds: ["arrabida-boat", "wild-beaches-picnic", "tiles-workshop"],
  },
  {
    id: "troia",
    label: "Tróia",
    note: "Across the estuary by ferry — Roman ruins on the sand spit.",
    geoKey: "troia",
    tourIds: ["troia-comporta"],
  },
  {
    id: "comporta",
    label: "Comporta",
    note: "Rice fields, pine, and the long white beaches behind them.",
    geoKey: "comporta",
    tourIds: ["troia-comporta"],
  },
  {
    id: "evora",
    label: "Évora",
    note: "The Roman temple, the bone chapel and the walled centre.",
    geoKey: "evora",
    tourIds: ["evora-alentejo"],
  },
  {
    id: "reguengos-monsaraz",
    label: "Reguengos de Monsaraz",
    note: "Big Alentejo estates east of Évora, under the Monsaraz hill.",
    geoKey: "herdade do esporao",
    tourIds: ["evora-alentejo"],
  },
  {
    id: "vidigueira",
    label: "Vidigueira",
    note: "Roman São Cucufate and the clay-pot talha cellars of Vila Alva.",
    geoKey: "vila alva",
    tourIds: ["roman-heritage-alentejo"],
  },
  {
    id: "porto-covo",
    label: "Porto Covo",
    note: "White fishing village above Ilha do Pessegueiro.",
    geoKey: "porto covo",
    tourIds: ["southwest-vicentine-coast"],
  },
  {
    id: "vila-nova-de-milfontes",
    label: "Vila Nova de Milfontes",
    note: "Where the Mira river meets the Atlantic.",
    geoKey: "vila nova de milfontes",
    tourIds: ["southwest-vicentine-coast"],
  },
  {
    id: "odeceixe",
    label: "Odeceixe",
    note: "The river beach at the Alentejo–Algarve border.",
    geoKey: "odeceixe",
    tourIds: ["southwest-vicentine-coast"],
  },
  {
    id: "aljezur",
    label: "Aljezur",
    note: "Moorish castle town at the end of the wild southwest drive.",
    geoKey: "aljezur",
    tourIds: ["southwest-vicentine-coast"],
  },
] as const;

function seedToRegion(seed: PlaceSeed): PlannerRegion {
  const geo = STOP_LATLNG[seed.geoKey];
  if (!geo) {
    throw new Error(`Planner map place "${seed.id}" has no gazetteer entry for "${seed.geoKey}"`);
  }
  return { ...seed, lat: geo.lat, lon: geo.lng };
}

export const PLANNER_REGIONS: readonly PlannerRegion[] = PLACE_SEEDS.map(seedToRegion);

export type PlannerRegionResolved = PlannerRegion & {
  tours: SignatureTour[];
  guides: LocalStoryArticle[];
};

/** Resolve a place to its real tours + the guides that point at those tours. */
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
