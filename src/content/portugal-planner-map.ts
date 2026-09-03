/**
 * Portugal planner map — single source of truth for the interactive homepage
 * map that lets a visitor explore the country region by region and jump
 * straight into the real Signature tours and the real Local Stories guides
 * that cover that region.
 *
 * NOTHING here is invented:
 *   - regions group EXISTING `signatureTours` ids (validated at build/test time)
 *   - guides are DERIVED from `LOCAL_STORIES_ARTICLES` via `signatureSlug`
 *   - coordinates reuse the curated `STOP_COORDS` viewBox (0–100 × 0–130)
 */

import { LOCAL_STORIES_ARTICLES, type LocalStoryArticle } from "@/content/local-stories-articles";
import { findTour, type SignatureTour } from "@/data/signatureTours";

export type PlannerRegion = {
  id: string;
  /** Short pin label shown on the map. */
  label: string;
  /** One-line orientation copy shown in the panel. */
  note: string;
  /** stopCoords-space coordinates (x ∈ 0–100, y ∈ 0–130). */
  x: number;
  y: number;
  /** Existing Signature tour ids that operate in this region. */
  tourIds: readonly string[];
};

/** North → south, so the pin order reads like the country. */
export const PLANNER_REGIONS: readonly PlannerRegion[] = [
  {
    id: "centro",
    label: "Centro & Coast",
    note: "Templar Tomar, university Coimbra, Fátima, the Nazaré swell and walled Óbidos.",
    x: 38,
    y: 60,
    tourIds: ["tomar-coimbra", "fatima-nazare-obidos"],
  },
  {
    id: "sintra-cascais",
    label: "Sintra & Cascais",
    note: "Palaces in the mist, Cabo da Roca, and the coast road back into Cascais.",
    x: 21,
    y: 77,
    tourIds: ["sintra-cascais"],
  },
  {
    id: "azeitao-sesimbra",
    label: "Azeitão & Sesimbra",
    note: "Cheese cellars, tile studios and a working fishing harbour under the ridge.",
    x: 30,
    y: 85,
    tourIds: ["azeitao-cheese", "tiles-workshop"],
  },
  {
    id: "arrabida-setubal",
    label: "Arrábida & Setúbal",
    note: "Moscatel cellars, the Livramento market, the ridge road and the green-water coves.",
    x: 36,
    y: 82,
    tourIds: ["arrabida-wine-allinclusive", "arrabida-boat", "wild-beaches-picnic"],
  },
  {
    id: "troia-comporta",
    label: "Tróia & Comporta",
    note: "Roman ruins across the estuary, rice fields, pine and long white sand.",
    x: 42,
    y: 94,
    tourIds: ["troia-comporta"],
  },
  {
    id: "alentejo",
    label: "Évora & Alentejo",
    note: "Roman Évora, clay-pot talha wine and cellars that still ferment the old way.",
    x: 54,
    y: 84,
    tourIds: ["evora-alentejo", "roman-heritage-alentejo"],
  },
  {
    id: "vicentina",
    label: "Costa Vicentina",
    note: "The wild southwest — cliffs, empty beaches and the longest drive of the day.",
    x: 36,
    y: 106,
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
