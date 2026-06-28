/**
 * Tailor Blueprints — what each Signature **really** includes.
 *
 * The current Tailor screen presents every stop on a Viator page as
 * "included", which is wrong. Viator wine-tour pages explicitly say
 * "2 or 3 wineries (depending on the experience you choose)" — i.e. the
 * fixed price buys a *core* of stops plus a *choice pool* the operator
 * confirms based on day-of availability, plus a few *optional viewpoints*
 * that cost time but no extra money.
 *
 * This file encodes that truth per Signature so the Tailor UI can show
 * three clear sections — Core / Choice / Optional — and the feasibility
 * engine in `src/lib/feasibility.ts` can warn when selections won't fit.
 *
 * Source: each tour's public Viator product page (`viatorUrl` in
 * `signatureToursViator.ts`) plus the supplier's Bókun product description.
 *
 * Coverage in this commit: the 3 most-booked Arrábida Signatures. Other
 * tours fall back to the flat `included[]` list until their blueprints
 * are authored — UI degrades gracefully.
 */

import type { StopCategory } from "@/lib/feasibility";

export interface BlueprintStop {
  /** Stable id (kebab). Used as React key + feasibility id. */
  id: string;
  label: string;
  /** Short, factual one-liner — never marketing. */
  blurb?: string;
  category: StopCategory;
  /** Override the category default when the operator commits to a
   *  specific length (e.g. a quicker tasting flight). */
  dwellMinutesOverride?: number;
  /** Add-on per-pax EUR delta. Omit when the stop is included in the
   *  anchor price (Core + Choice). Optional stops may carry a real
   *  upcharge from the Bókun product. */
  upchargePerPaxEUR?: number;
}

export interface TailorBlueprint {
  tourId: string;
  /** Stops the anchor price always buys. The guide may swap one for
   *  operational reasons, but every guest gets this number of stops. */
  core: BlueprintStop[];
  /** "Pick N from the pool" — Viator's "2 or 3 wineries" rule. The
   *  guide confirms which after a final availability check. */
  choice?: {
    pickCount: number;
    /** Human label for the UI section header, e.g. "Choose 1 additional
     *  winery from these options". */
    label: string;
    /** Plain note for the guest — shown verbatim. */
    note: string;
    options: BlueprintStop[];
  };
  /** Optional viewpoints / extensions. Cost only time unless they carry
   *  `upchargePerPaxEUR`. */
  optional: BlueprintStop[];
  /** Free-form notes shown above the Tailor sections (operational caveats,
   *  closures, etc.). */
  copy?: {
    coreHeading?: string;
    choiceHeading?: string;
    optionalHeading?: string;
    footnote?: string;
  };
}

/* ════════════════════════════════════════════════════════════════
 * Wine & Heritage — Arrábida (arrabida-wine-allinclusive)
 *
 * Viator: "Visit 2 or 3 wineries (depending on the experience you
 * choose)" · "Enjoy an optional stop at Christ the King or Sesimbra
 * Castle, depending on your pace and preferences".
 *
 * Core = lunch + market + tile factory + Arrábida natural park drive.
 * Choice = pick 2 of the 4 partner wineries — final pair confirmed by
 *   the guide based on day-of availability.
 * Optional = Cristo Rei, Sesimbra castle.
 * ════════════════════════════════════════════════════════════════ */
const wineHeritage: TailorBlueprint = {
  tourId: "arrabida-wine-allinclusive",
  core: [
    {
      id: "livramento",
      label: "Mercado do Livramento",
      blurb: "One of the world's best markets — oysters, cheese, pastries.",
      category: "market",
      dwellMinutesOverride: 45,
    },
    {
      id: "arrabida-park",
      label: "Parque Natural da Arrábida",
      blurb: "Drive across the coastal range with stops at the headline viewpoints.",
      category: "viewpoint",
      dwellMinutesOverride: 45,
    },
    {
      id: "azeitao-tiles",
      label: "Azulejos de Azeitão — tile factory",
      blurb: "Hand-painted tiles since the 19th century.",
      category: "workshop",
      dwellMinutesOverride: 45,
    },
    {
      id: "lunch-azeitao",
      label: "Lunch in Azeitão village",
      blurb: "Traditional Portuguese lunch with paired wines.",
      category: "lunch",
    },
  ],
  choice: {
    pickCount: 2,
    label: "Choose 2 wineries from this pool",
    note: "We confirm the final pair the day before based on each winery's availability.",
    options: [
      {
        id: "jmf",
        label: "José Maria da Fonseca",
        blurb: "Family winery since 1834 — seven generations of Moscatel.",
        category: "winery",
      },
      {
        id: "bacalhoa",
        label: "Quinta da Bacalhôa",
        blurb: "Wine + contemporary art on the same estate.",
        category: "winery",
      },
      {
        id: "catralvos",
        label: "Quinta de Catralvos",
        blurb: "Small family estate — five wines tasted at the cellar door.",
        category: "winery",
      },
      {
        id: "piloto",
        label: "Quinta do Piloto",
        blurb: "Tradition meeting modern winemaking — vineyards walk + tasting.",
        category: "winery",
      },
      {
        id: "palmela",
        label: "Adega de Palmela",
        blurb: "Cooperative cellar — broad cross-section of the Setúbal DOP.",
        category: "winery",
      },
    ],
  },
  optional: [
    {
      id: "cristo-rei",
      label: "Cristo Rei viewpoint",
      blurb: "Panorama over Lisbon from across the Tagus. Adds ~30 min.",
      category: "viewpoint",
      dwellMinutesOverride: 30,
    },
    {
      id: "sesimbra-castle",
      label: "Castelo de Sesimbra",
      blurb: "Medieval castle above the fishing village. Adds ~45 min.",
      category: "viewpoint",
      dwellMinutesOverride: 45,
    },
  ],
  copy: {
    coreHeading: "Always included at the anchor price",
    choiceHeading: "Choose your wineries",
    optionalHeading: "Optional viewpoints — subject to time",
    footnote:
      "Two wineries is the standard pace; a third can replace a viewpoint when the day allows. Final wineries are confirmed by your guide the day before based on availability.",
  },
};

/* ════════════════════════════════════════════════════════════════
 * Coastal & Picnic — Arrábida (wild-beaches-picnic)
 *
 * Core = market (picnic shopping) + Arrábida drive + cove + picnic.
 * Optional = Sesimbra castle, Cabo Espichel.
 * No choice pool — the cove the guide picks depends on swell and crowds.
 * ════════════════════════════════════════════════════════════════ */
const wildBeachesPicnic: TailorBlueprint = {
  tourId: "wild-beaches-picnic",
  core: [
    {
      id: "livramento",
      label: "Mercado do Livramento",
      blurb: "Pick the picnic together — bread, cheese, fruit, cured meats, wine.",
      category: "market",
      dwellMinutesOverride: 45,
    },
    {
      id: "arrabida-drive",
      label: "Arrábida coastal drive",
      blurb: "The headline viewpoints over the natural park.",
      category: "viewpoint",
      dwellMinutesOverride: 45,
    },
    {
      id: "hidden-cove",
      label: "Hidden cove + private picnic",
      blurb: "Galapinhos / Portinho or quieter alternative — the guide reads the day.",
      category: "picnic",
      dwellMinutesOverride: 120,
    },
    {
      id: "sesimbra-village",
      label: "Sesimbra fishing village",
      blurb: "Walk along the harbour and the old town.",
      category: "village",
      dwellMinutesOverride: 45,
    },
  ],
  optional: [
    {
      id: "sesimbra-castle",
      label: "Castelo de Sesimbra",
      blurb: "The last medieval castle still standing by the sea. Adds ~45 min.",
      category: "viewpoint",
      dwellMinutesOverride: 45,
    },
    {
      id: "cabo-espichel",
      label: "Cabo Espichel",
      blurb: "Atlantic clifftop sanctuary and dinosaur footprints. Adds ~45 min.",
      category: "viewpoint",
      dwellMinutesOverride: 45,
    },
  ],
  copy: {
    coreHeading: "Always included at the anchor price",
    optionalHeading: "Optional extensions — subject to time",
    footnote:
      "The exact cove depends on swell, wind and how busy the park is — your guide picks the right one the morning of.",
  },
};

/* ════════════════════════════════════════════════════════════════
 * Registry
 * ════════════════════════════════════════════════════════════════ */
export const TAILOR_BLUEPRINTS: Record<string, TailorBlueprint> = {
  [wineHeritage.tourId]: wineHeritage,
  [wildBeachesPicnic.tourId]: wildBeachesPicnic,
};

export function getTailorBlueprint(tourId: string): TailorBlueprint | null {
  return TAILOR_BLUEPRINTS[tourId] ?? null;
}
