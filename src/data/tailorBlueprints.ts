/**
 * Tailor Blueprints — single source of truth for every Signature.
 *
 * Each blueprint encodes what the Viator/Bókun product **really** sells:
 *
 *   • core[]      — always included at the anchor price
 *   • choice{}    — "pick N from this pool" (Viator's "2 or 3 wineries")
 *   • optional[]  — time-permitting / opt-in extensions
 *
 * This is the ONLY place to edit a tour's structural truth. It feeds:
 *
 *   1. `/tours/$tourId`        — itinerary timeline + route map
 *      (via `toEditorialChapters` in `src/lib/tailor-chapters.ts`)
 *   2. `/tours/$tourId/tailor` — the Tailor UI (Core/Choice/Optional sections)
 *   3. Studio V3 builder       — surface optionals as add-ons when the
 *      user anchors on a region that maps to this Signature
 *      (via `getSignatureOptionalAddOns`)
 *
 * Source: each tour's public Viator page (`viatorUrl` in
 * `signatureToursViator.ts`) + the supplier's Bókun product description.
 * Never invent stops, partners or itineraries.
 */

import type { StopCategory } from "@/lib/feasibility";

export interface BlueprintStop {
  /** Stable id (kebab). Used as React key + feasibility id. */
  id: string;
  label: string;
  /** Short factual one-liner — no marketing. ≤ 180 chars. */
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
  /** Stops the anchor price always buys. */
  core: BlueprintStop[];
  /** "Pick N from the pool" — Viator's "2 or 3 wineries" rule. */
  choice?: {
    pickCount: number;
    /** UI section header, e.g. "Choose 2 wineries from this pool". */
    label: string;
    /** Plain note shown verbatim to the guest. */
    note: string;
    options: BlueprintStop[];
  };
  /** Optional extensions — time cost only unless `upchargePerPaxEUR` set. */
  optional: BlueprintStop[];
  /** Optional copy overrides for the Tailor section headings. */
  copy?: {
    coreHeading?: string;
    choiceHeading?: string;
    optionalHeading?: string;
    footnote?: string;
  };
}

/* ════════════════════════════════════════════════════════════════
 * 1 · Wine & Heritage — Arrábida (arrabida-wine-allinclusive)
 * Viator: "Visit 2 or 3 wineries (depending on the experience)" ·
 * "Optional stop at Christ the King or Sesimbra Castle".
 * ════════════════════════════════════════════════════════════ */
const wineHeritage: TailorBlueprint = {
  tourId: "arrabida-wine-allinclusive",
  core: [
    {
      id: "livramento",
      label: "Mercado do Livramento",
      blurb: "A 145-year-old fresh market — fish off the boat, regional cheese, oysters and Moscatel.",
      category: "market",
      dwellMinutesOverride: 45,
    },
    {
      id: "arrabida-park",
      label: "Parque Natural da Arrábida",
      blurb: "The panoramic road above the bay — turquoise water, cork-oak hills, no crowds.",
      category: "viewpoint",
      dwellMinutesOverride: 45,
    },
    {
      id: "azeitao-tiles",
      label: "Azulejos de Azeitão tile factory",
      blurb: "A working azulejo factory — five centuries of cobalt-blue tile, still hand-painted.",
      category: "workshop",
      dwellMinutesOverride: 45,
    },
    {
      id: "lunch-azeitao",
      label: "Long lunch in Azeitão",
      blurb: "Regional plates and paired wines in the wine village — unhurried, the way locals eat.",
      category: "lunch",
    },
  ],
  choice: {
    pickCount: 2,
    label: "Choose 2 wineries from this pool",
    note: "Your guide confirms the final pair the day before based on each winery's availability.",
    options: [
      { id: "jmf", label: "José Maria da Fonseca", blurb: "Family winery since 1834 — seven generations of Moscatel.", category: "winery" },
      { id: "bacalhoa", label: "Quinta da Bacalhôa", blurb: "Wine and contemporary art on the same estate.", category: "winery" },
      { id: "catralvos", label: "Quinta de Catralvos", blurb: "Small family estate — five wines tasted at the cellar door.", category: "winery" },
      { id: "piloto", label: "Quinta do Piloto", blurb: "Tradition meets modern winemaking — vineyard walk plus tasting.", category: "winery" },
      { id: "palmela", label: "Adega de Palmela", blurb: "Cooperative cellar — broad cross-section of the Setúbal DOP.", category: "winery" },
    ],
  },
  optional: [
    { id: "cristo-rei", label: "Cristo Rei viewpoint", blurb: "Panorama over Lisbon from across the Tagus. Adds ~30 min.", category: "viewpoint", dwellMinutesOverride: 30 },
    { id: "sesimbra-castle", label: "Castelo de Sesimbra", blurb: "Medieval castle above the fishing village. Adds ~45 min.", category: "viewpoint", dwellMinutesOverride: 45 },
  ],
  copy: {
    coreHeading: "Always included at the anchor price",
    choiceHeading: "Choose your wineries",
    optionalHeading: "Optional viewpoints — subject to time",
    footnote: "Two wineries is the standard pace; a third can replace a viewpoint when the day allows.",
  },
};

/* ════════════════════════════════════════════════════════════════
 * 2 · Wild Beaches & Picnic — Arrábida (wild-beaches-picnic)
 * Viator: cove the guide picks depends on swell, wind, crowds.
 * "Cabo Espichel or Sesimbra Castle" — explicit choice / optional.
 * ════════════════════════════════════════════════════════════ */
const wildBeachesPicnic: TailorBlueprint = {
  tourId: "wild-beaches-picnic",
  core: [
    { id: "livramento", label: "Mercado do Livramento", blurb: "Pick the picnic together — bread, cheese, fruit, cured meats, wine.", category: "market", dwellMinutesOverride: 45 },
    { id: "arrabida-drive", label: "Arrábida coastal drive", blurb: "Headline viewpoints above the natural park.", category: "viewpoint", dwellMinutesOverride: 45 },
    { id: "hidden-cove", label: "Hidden cove + private picnic", blurb: "Galapinhos, Portinho or a quieter alternative — your guide reads the day.", category: "picnic", dwellMinutesOverride: 120 },
    { id: "sesimbra-village", label: "Sesimbra fishing village", blurb: "A walk along the harbour and the old town.", category: "village", dwellMinutesOverride: 45 },
  ],
  optional: [
    { id: "sesimbra-castle", label: "Castelo de Sesimbra", blurb: "The last medieval castle still standing by the sea. Adds ~45 min.", category: "viewpoint", dwellMinutesOverride: 45 },
    { id: "cabo-espichel", label: "Cabo Espichel", blurb: "Atlantic clifftop sanctuary and dinosaur footprints. Adds ~45 min.", category: "viewpoint", dwellMinutesOverride: 45 },
  ],
  copy: {
    coreHeading: "Always included at the anchor price",
    optionalHeading: "Optional extensions — subject to time",
    footnote: "The exact cove depends on swell, wind and how busy the park is — your guide picks the right one the morning of.",
  },
};

/* ════════════════════════════════════════════════════════════════
 * 3 · Arrábida Boat Day (arrabida-boat)
 * Boat dominates the day (~2.5h). One land cluster + boat + Sesimbra.
 * ════════════════════════════════════════════════════════════ */
const arrabidaBoat: TailorBlueprint = {
  tourId: "arrabida-boat",
  core: [
    { id: "livramento", label: "Mercado do Livramento", blurb: "Quick fresh-market stop before heading to the coast.", category: "market", dwellMinutesOverride: 30 },
    { id: "arrabida-drive", label: "Arrábida coastal viewpoints", blurb: "Drive across the park down to the bay before boarding.", category: "viewpoint", dwellMinutesOverride: 30 },
    { id: "boat-arrabida", label: "Private boat in Arrábida bay", blurb: "Into the protected coves, including Lapa de Santa Margarida sea cave. Swim stop weather-permitting.", category: "boat", dwellMinutesOverride: 150 },
    { id: "sesimbra-village", label: "Sesimbra fishing village", blurb: "Late-afternoon walk through the harbour town.", category: "village", dwellMinutesOverride: 45 },
  ],
  optional: [
    { id: "sesimbra-castle", label: "Castelo de Sesimbra", blurb: "Medieval castle above the village. Adds ~45 min and only fits with a short boat slot.", category: "viewpoint", dwellMinutesOverride: 45 },
    { id: "cabo-espichel", label: "Cabo Espichel", blurb: "Clifftop sanctuary on the way back. Adds ~45 min.", category: "viewpoint", dwellMinutesOverride: 45 },
  ],
  copy: {
    coreHeading: "Always included at the anchor price",
    optionalHeading: "Optional close — subject to boat timing",
    footnote: "Boat is ~2h30 with boarding. Optional viewpoints only fit when the sea cuts the ride short.",
  },
};

/* ════════════════════════════════════════════════════════════════
 * 4 · Tile Painting Workshop (tiles-workshop)
 * Core = market + tile workshop + Azeitão lunch. Choice = 1 winery.
 * Optional = Sesimbra coast / Cristo Rei.
 * ════════════════════════════════════════════════════════════ */
const tilesWorkshop: TailorBlueprint = {
  tourId: "tiles-workshop",
  core: [
    { id: "livramento", label: "Mercado do Livramento", blurb: "Setúbal's historic fresh market — a quick walk before the workshop.", category: "market", dwellMinutesOverride: 30 },
    { id: "azulejos-workshop", label: "Private tile-painting workshop", blurb: "Hands-on azulejo class at a 19th-century tile factory — take your tile home.", category: "workshop", dwellMinutesOverride: 90 },
    { id: "lunch-azeitao", label: "Lunch in Azeitão", blurb: "Traditional Portuguese lunch in the wine village.", category: "lunch" },
  ],
  choice: {
    pickCount: 1,
    label: "Choose 1 winery to visit after lunch",
    note: "Your guide confirms the winery the day before based on availability.",
    options: [
      { id: "jmf", label: "José Maria da Fonseca", blurb: "Family winery since 1834.", category: "winery" },
      { id: "bacalhoa", label: "Quinta da Bacalhôa", blurb: "Wine and contemporary art on the same estate.", category: "winery" },
      { id: "catralvos", label: "Quinta de Catralvos", blurb: "Small family estate, cellar-door tasting.", category: "winery" },
    ],
  },
  optional: [
    { id: "sesimbra-castle", label: "Castelo de Sesimbra", blurb: "Medieval castle above the fishing village. Adds ~45 min.", category: "viewpoint", dwellMinutesOverride: 45 },
    { id: "sesimbra-village", label: "Sesimbra harbour", blurb: "Short walk through the fishing town. Adds ~30 min.", category: "village", dwellMinutesOverride: 30 },
    { id: "cristo-rei", label: "Cristo Rei viewpoint", blurb: "Lisbon panorama on the way back. Adds ~30 min.", category: "viewpoint", dwellMinutesOverride: 30 },
  ],
  copy: {
    coreHeading: "Always included at the anchor price",
    choiceHeading: "Choose your winery",
    optionalHeading: "Optional viewpoints — subject to time",
  },
};

/* ════════════════════════════════════════════════════════════════
 * 5 · Cheese & Wine in Azeitão (azeitao-cheese)
 * Core = market, cheese workshop (Quinta Velha), Azeitão lunch, winery.
 * Optional = Sesimbra Castle, Cristo Rei.
 * ════════════════════════════════════════════════════════════ */
const azeitaoCheese: TailorBlueprint = {
  tourId: "azeitao-cheese",
  core: [
    { id: "livramento", label: "Mercado do Livramento", blurb: "Setúbal's fresh market — pick up cheese pairings before the workshop.", category: "market", dwellMinutesOverride: 30 },
    { id: "quinta-velha", label: "Cheese-making at Quinta Velha", blurb: "Private workshop at a small family producer — see the Azeitão DOP cheese being made.", category: "workshop", dwellMinutesOverride: 75 },
    { id: "lunch-azeitao", label: "Lunch in Azeitão", blurb: "Traditional lunch in the wine village.", category: "lunch" },
    { id: "catralvos", label: "Quinta de Catralvos winery", blurb: "Five-wine tasting at the family cellar door.", category: "winery" },
  ],
  optional: [
    { id: "sesimbra-castle", label: "Castelo de Sesimbra", blurb: "Medieval castle above the village. Adds ~45 min.", category: "viewpoint", dwellMinutesOverride: 45 },
    { id: "cristo-rei", label: "Cristo Rei viewpoint", blurb: "Lisbon panorama on the way back. Adds ~30 min.", category: "viewpoint", dwellMinutesOverride: 30 },
  ],
  copy: {
    coreHeading: "Always included at the anchor price",
    optionalHeading: "Optional close — subject to time",
  },
};

/* ════════════════════════════════════════════════════════════════
 * 6 · Sintra & Cascais (sintra-cascais)
 * Viator names Pena, Sintra Palace, Regaleira as "options on the
 * itinerary" → Choice of 1. Cabo da Roca + Cascais + lunch = Core.
 * ════════════════════════════════════════════════════════════ */
const sintraCascais: TailorBlueprint = {
  tourId: "sintra-cascais",
  core: [
    { id: "sintra-vila", label: "Sintra historic town", blurb: "UNESCO World Heritage centre — walk the cobbled streets before the palace visit.", category: "village", dwellMinutesOverride: 45 },
    { id: "lunch-azenhas", label: "Lunch at Azenhas do Mar", blurb: "Clifftop lunch above the Atlantic — fresh fish, ocean view.", category: "lunch" },
    { id: "cabo-da-roca", label: "Cabo da Roca", blurb: "The westernmost point of mainland Europe — Atlantic cliffs.", category: "viewpoint", dwellMinutesOverride: 30 },
    { id: "cascais", label: "Cascais", blurb: "Royal seaside town — short walk through the old centre and marina.", category: "village", dwellMinutesOverride: 45 },
  ],
  choice: {
    pickCount: 1,
    label: "Choose 1 Sintra palace to visit inside",
    note: "Queues in Sintra are heavy — one full visit lets the rest of the day breathe. Tickets confirmed by your guide.",
    options: [
      { id: "pena", label: "Park & Palace of Pena", blurb: "Vibrant 19th-century romantic palace on the Sintra ridge.", category: "monument" },
      { id: "regaleira", label: "Quinta da Regaleira", blurb: "Mystical gardens, initiation well and chapel.", category: "monument" },
      { id: "sintra-palace", label: "Sintra National Palace", blurb: "Moorish-Gothic palace at the heart of the historic centre.", category: "monument" },
    ],
  },
  optional: [
    { id: "colares-winery", label: "Adega Regional de Colares", blurb: "Historic Colares winery — vines planted in sand. Adds ~60 min.", category: "winery", dwellMinutesOverride: 60 },
  ],
  copy: {
    coreHeading: "Always included at the anchor price",
    choiceHeading: "Choose your palace",
    optionalHeading: "Optional after Cascais — subject to time",
    footnote: "Sintra works best when you pick one palace properly rather than rushing two.",
  },
};

/* ════════════════════════════════════════════════════════════════
 * 7 · Tróia & Comporta (troia-comporta)
 * Core = Sado ferry, Tróia ruins, Comporta lunch + winery, a beach.
 * Optional = Carrasqueira stilt pier.
 * ════════════════════════════════════════════════════════════ */
const troiaComporta: TailorBlueprint = {
  tourId: "troia-comporta",
  core: [
    { id: "sado-ferry", label: "Sado ferry crossing", blurb: "Short ferry over the Sado estuary — dolphins are sometimes seen.", category: "drive-by", dwellMinutesOverride: 30 },
    { id: "troia-ruins", label: "Roman Ruins of Tróia", blurb: "2,000-year-old fish-salting site on the peninsula.", category: "monument", dwellMinutesOverride: 45 },
    { id: "herdade-comporta", label: "Herdade da Comporta winery", blurb: "Sandy-soil wines shaped by Atlantic wind — tasting at the cellar.", category: "winery" },
    { id: "comporta-lunch", label: "Lunch in Comporta", blurb: "Relaxed lunch in the dunes village.", category: "lunch" },
    { id: "comporta-beach", label: "Comporta or Carvalhal beach", blurb: "Long white-sand Atlantic beach — short walk if conditions allow.", category: "beach", dwellMinutesOverride: 45 },
  ],
  optional: [
    { id: "carrasqueira", label: "Cais Palafítico da Carrasqueira", blurb: "Wooden stilt fishing pier on the Sado — one of Portugal's most photogenic spots. Adds ~30 min.", category: "viewpoint", dwellMinutesOverride: 30 },
  ],
  copy: {
    coreHeading: "Always included at the anchor price",
    optionalHeading: "Optional extension — subject to tide and time",
  },
};

/* ════════════════════════════════════════════════════════════════
 * 8 · Évora & Alentejo (evora-alentejo)
 * Viator lists 5 wineries as "winery options" → Choice of 1.
 * Core = Évora old town, Roman temple, Chapel of Bones, lunch.
 * Optional = cork factory.
 * ════════════════════════════════════════════════════════════ */
const evoraAlentejo: TailorBlueprint = {
  tourId: "evora-alentejo",
  core: [
    { id: "evora-old-town", label: "Évora historic centre", blurb: "UNESCO city — walled centre with Roman, Moorish and medieval layers.", category: "village", dwellMinutesOverride: 60 },
    { id: "templo-romano", label: "Roman Temple of Évora", blurb: "1st-century Roman temple (Templo de Diana) in the old town.", category: "monument", dwellMinutesOverride: 20 },
    { id: "chapel-of-bones", label: "Chapel of Bones", blurb: "The 16th-century chapel lined with the bones of monks — a few minutes inside the Igreja de São Francisco.", category: "monument", dwellMinutesOverride: 25 },
    { id: "evora-lunch", label: "Long Alentejo lunch", blurb: "Traditional Alentejo lunch — black pork, açorda, regional wines.", category: "lunch" },
  ],
  choice: {
    pickCount: 1,
    label: "Choose 1 Alentejo winery to visit",
    note: "Your guide confirms the winery the day before based on availability.",
    options: [
      { id: "ramos", label: "João Portugal Ramos", blurb: "Modern flagship of the Alentejo — broad estate, polished visit.", category: "winery" },
      { id: "cartuxa", label: "Cartuxa", blurb: "Adega Cartuxa, named after the 16th-century monastery — home of Pêra-Manca.", category: "winery" },
      { id: "peramanca", label: "Quinta São José de Peramanca", blurb: "16th-century estate, family-run small-production wines.", category: "winery" },
      { id: "ervideira", label: "Ervideira", blurb: "Pioneer of underwater-aged wine — tasting at the estate.", category: "winery" },
      { id: "esporao", label: "Herdade do Esporão", blurb: "Iconic Alentejo estate — wine, olive oil, contemporary tasting room.", category: "winery" },
    ],
  },
  optional: [
    { id: "corticarte", label: "Corticarte cork factory", blurb: "See cork harvested, sorted and finished — a 30-min industrial visit. Adds ~45 min.", category: "workshop", dwellMinutesOverride: 45 },
  ],
  copy: {
    coreHeading: "Always included at the anchor price",
    choiceHeading: "Choose your Alentejo winery",
    optionalHeading: "Optional extension — subject to time",
  },
};

/* ════════════════════════════════════════════════════════════════
 * 9 · Tomar & Coimbra (tomar-coimbra)
 * Core = Tomar town + Convento de Cristo + Coimbra Univ + Joanina.
 * Two anchor monuments — long drive day.
 * ════════════════════════════════════════════════════════════ */
const tomarCoimbra: TailorBlueprint = {
  tourId: "tomar-coimbra",
  core: [
    { id: "convento-cristo", label: "Convento de Cristo, Tomar", blurb: "UNESCO Templar convent — the rotunda church and Manueline chapter house.", category: "monument", dwellMinutesOverride: 75 },
    { id: "tomar-town", label: "Tomar old town", blurb: "Short walk through the medieval centre below the convent.", category: "village", dwellMinutesOverride: 30 },
    { id: "tomar-lunch", label: "Lunch en route", blurb: "Traditional lunch between Tomar and Coimbra.", category: "lunch" },
    { id: "coimbra-uni", label: "University of Coimbra", blurb: "One of Europe's oldest universities — courtyard, Royal Palace, bell tower view.", category: "monument", dwellMinutesOverride: 60 },
    { id: "biblioteca-joanina", label: "Biblioteca Joanina", blurb: "18th-century baroque library inside the university — timed entry.", category: "monument", dwellMinutesOverride: 30 },
  ],
  optional: [],
  copy: {
    coreHeading: "Always included at the anchor price",
    footnote: "It's a long drive day — the itinerary is tight by design. No optional add-ons fit without losing one of the two anchors.",
  },
};

/* ════════════════════════════════════════════════════════════════
 * 10 · Fátima, Nazaré & Óbidos (fatima-nazare-obidos)
 * Three towns + lunch — Viator product is compact.
 * ════════════════════════════════════════════════════════════ */
const fatimaNazareObidos: TailorBlueprint = {
  tourId: "fatima-nazare-obidos",
  core: [
    { id: "fatima", label: "Sanctuary of Fátima", blurb: "One of the world's most-visited pilgrimage sites — Basilica and the Apparitions chapel.", category: "monument", dwellMinutesOverride: 60 },
    { id: "nazare-beach", label: "Nazaré cliffs and beach", blurb: "Atlantic fishing town famous for giant winter waves — viewpoint and seafront.", category: "viewpoint", dwellMinutesOverride: 45 },
    { id: "nazare-lunch", label: "Lunch in Nazaré", blurb: "Traditional Portuguese lunch by the sea.", category: "lunch" },
    { id: "obidos", label: "Óbidos walled town", blurb: "Medieval white-and-blue village inside its castle walls — finish with a Ginjinha in a chocolate cup.", category: "village", dwellMinutesOverride: 60 },
  ],
  optional: [],
  copy: {
    coreHeading: "Always included at the anchor price",
    footnote: "Three towns is the natural day. Adding a fourth eats into the time that makes each of them feel real.",
  },
};

/* ════════════════════════════════════════════════════════════════
 * 11 · Roman Heritage & Talha Wines (roman-heritage-alentejo)
 * Niche: archaeology + ancestral clay-pot winemaking.
 * Core = Roman villa + Talha centre + Adega + Vila Alva drive.
 * Optional = river beach (warm months only).
 * ════════════════════════════════════════════════════════════ */
const romanHeritageAlentejo: TailorBlueprint = {
  tourId: "roman-heritage-alentejo",
  core: [
    { id: "sao-cucufate", label: "Villa Romana de São Cucufate", blurb: "One of Alentejo's most important Roman archaeological sites.", category: "monument", dwellMinutesOverride: 60 },
    { id: "vinho-talha", label: "Centro Interpretativo do Vinho de Talha", blurb: "Centre dedicated to Portugal's 2,000-year-old clay-pot winemaking method.", category: "workshop", dwellMinutesOverride: 45 },
    { id: "vila-alva", label: "Vila Alva drive", blurb: "Drive through a quiet wine village surrounded by old vines and olive groves.", category: "drive-by", dwellMinutesOverride: 20 },
    { id: "mestre-daniel", label: "Adega Mestre Daniel — XXVI Talhas", blurb: "Family winery still making wine in Roman clay vessels — private tasting.", category: "winery" },
    { id: "talha-lunch", label: "Long Alentejo lunch", blurb: "Slow lunch with talha wines.", category: "lunch" },
  ],
  optional: [
    { id: "albergaria-fusos", label: "Albergaria dos Fusos river beach", blurb: "Hidden river beach for a warm-month swim or quiet stop. Adds ~45 min.", category: "beach", dwellMinutesOverride: 45 },
  ],
  copy: {
    coreHeading: "Always included at the anchor price",
    optionalHeading: "Optional extension — warm months only",
  },
};

/* ════════════════════════════════════════════════════════════════
 * Registry
 * ════════════════════════════════════════════════════════════ */
export const TAILOR_BLUEPRINTS: Record<string, TailorBlueprint> = {
  [wineHeritage.tourId]: wineHeritage,
  [wildBeachesPicnic.tourId]: wildBeachesPicnic,
  [arrabidaBoat.tourId]: arrabidaBoat,
  [tilesWorkshop.tourId]: tilesWorkshop,
  [azeitaoCheese.tourId]: azeitaoCheese,
  [sintraCascais.tourId]: sintraCascais,
  [troiaComporta.tourId]: troiaComporta,
  [evoraAlentejo.tourId]: evoraAlentejo,
  [tomarCoimbra.tourId]: tomarCoimbra,
  [fatimaNazareObidos.tourId]: fatimaNazareObidos,
  [romanHeritageAlentejo.tourId]: romanHeritageAlentejo,
};

export function getTailorBlueprint(tourId: string): TailorBlueprint | null {
  return TAILOR_BLUEPRINTS[tourId] ?? null;
}
