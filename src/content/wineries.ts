/**
 * Partner winery pages. Every fact here is taken from the verified
 * Signature itineraries in `src/data/signatureToursViator.ts` (which mirror
 * the Viator/TripAdvisor listings). Do not add tastings, grapes, history or
 * venues that are not in those listings.
 */
export interface Winery {
  slug: string;
  name: string;
  region: "Arrábida & Azeitão" | "Évora & Alentejo";
  summary: string;
  /** Search-result title override when the public name is unusually long. */
  seoTitle?: string;
  /** Unique search description, kept within the target 120–170 characters. */
  seoDescription: string;
  body: string[];
  /** Signature tours (ids) that can include this winery. */
  tours: { id: string; label: string; role: string }[];
}

export const WINERIES: Winery[] = [
  {
    slug: "jose-maria-da-fonseca",
    name: "José Maria da Fonseca",
    region: "Arrábida & Azeitão",
    summary: "Historic family house and museum in Azeitão, making wine since 1834.",
    seoDescription: "José Maria da Fonseca in Azeitão, a historic family winery founded in 1834. Visit it on a private Arrábida wine day from Lisbon.",
    body: [
      "José Maria da Fonseca has been making wine since 1834, passed down through seven generations of the same family.",
      "The visit takes in the house and museum, with a guided winery tour and a tasting.",
    ],
    tours: [
      { id: "arrabida-wine-allinclusive", label: "Arrábida wine day", role: "One of the winery options" },
    ],
  },
  {
    slug: "quinta-de-catralvos",
    name: "Quinta de Catralvos",
    region: "Arrábida & Azeitão",
    summary: "Traditional Azeitão winery: vineyards, production and a tasting of at least five wines.",
    seoDescription: "Quinta de Catralvos in Azeitão pairs vineyards and production with a tasting of at least five wines on a private Arrábida wine day from Lisbon.",
    body: [
      "Quinta de Catralvos is a traditional winery in Azeitão. Guests walk through the vineyards and see how the wine is made, from production to labelling and bottling.",
      "The tasting includes at least five wines. On the Azeitão cheese day it is the winery stop, with a wine tour and five glasses of wine.",
    ],
    tours: [
      { id: "arrabida-wine-allinclusive", label: "Arrábida wine day", role: "One of the winery options" },
      { id: "azeitao-cheese", label: "Azeitão cheese & wine day", role: "Winery stop" },
    ],
  },
  {
    slug: "quinta-do-piloto",
    name: "Quinta do Piloto",
    region: "Arrábida & Azeitão",
    summary: "Winery tour through the vineyards and production, followed by a tasting.",
    seoDescription: "Quinta do Piloto near Palmela combines vineyards, production and a guided tasting on a private Arrábida and Azeitão wine day from Lisbon.",
    body: [
      "At Quinta do Piloto the winery tour covers the vineyards and production facilities, explaining how the wines are made, before the tasting.",
    ],
    tours: [
      { id: "arrabida-wine-allinclusive", label: "Arrábida wine day", role: "One of the winery options" },
    ],
  },
  {
    slug: "quinta-da-bacalhoa",
    name: "Quinta da Bacalhôa",
    region: "Arrábida & Azeitão",
    summary: "Modern winery tour that pairs wine with an art collection.",
    seoDescription: "Quinta da Bacalhôa combines a modern winery visit, art collection and wine tasting on a private Arrábida and Azeitão day from Lisbon.",
    body: [
      "Bacalhôa combines a modern winery tour with an art exhibition, so the visit is as much about culture as about wine, ending with a tasting.",
    ],
    tours: [
      { id: "arrabida-wine-allinclusive", label: "Arrábida wine day", role: "One of the winery options" },
    ],
  },
  {
    slug: "adega-de-palmela",
    name: "Adega de Palmela",
    region: "Arrábida & Azeitão",
    summary: "Palmela's wine cooperative — an optional stop on the Arrábida day.",
    seoDescription: "Adega de Palmela is a local wine cooperative and optional Arrábida stop, with vineyards, production and tasting on a private day from Lisbon.",
    body: [
      "Adega de Palmela is an optional stop. The visit covers the vineyards and production facilities, followed by a curated tasting.",
    ],
    tours: [
      { id: "arrabida-wine-allinclusive", label: "Arrábida wine day", role: "Optional stop" },
    ],
  },
  {
    slug: "joao-portugal-ramos",
    name: "João Portugal Ramos",
    region: "Évora & Alentejo",
    summary: "Modern Alentejo winemaking that respects traditional techniques.",
    seoDescription: "João Portugal Ramos brings modern Alentejo winemaking together with traditional techniques on a private Évora and Alentejo wine day from Lisbon.",
    body: [
      "João Portugal Ramos takes a modern approach to winemaking while keeping traditional techniques. The range includes wines from Portuguese and international grape varieties.",
    ],
    tours: [{ id: "evora-alentejo", label: "Évora & Alentejo day", role: "One of the winery options" }],
  },
  {
    slug: "adega-cartuxa",
    name: "Adega Cartuxa",
    region: "Évora & Alentejo",
    summary: "Winery beside Évora's 16th-century Cartuxa monastery.",
    seoDescription: "Adega Cartuxa sits beside Évora's 16th-century Cartuxa Monastery and can feature on a private Évora and Alentejo wine day from Lisbon.",
    body: [
      "Adega Cartuxa takes its name from the 16th-century Cartuxa Monastery right next to it, part of the Eugénio de Almeida Foundation.",
    ],
    tours: [{ id: "evora-alentejo", label: "Évora & Alentejo day", role: "One of the winery options" }],
  },
  {
    slug: "pera-grave",
    name: "Pêra-Grave (Quinta de São José de Peramanca)",
    region: "Évora & Alentejo",
    summary: "A historic estate known for reds from Aragonez, Trincadeira and Alicante Bouschet.",
    seoTitle: "Pêra-Grave · Private Alentejo Wine Tour from Lisbon",
    seoDescription: "Pêra-Grave is a historic Alentejo estate known for traditional red varieties and can feature on a private Évora and Alentejo wine day from Lisbon.",
    body: [
      "The estate's origins go back to the 16th century. It is best known for red wines from traditional Alentejo varieties such as Aragonez, Trincadeira and Alicante Bouschet.",
    ],
    tours: [{ id: "evora-alentejo", label: "Évora & Alentejo day", role: "One of the winery options" }],
  },
  {
    slug: "ervideira",
    name: "Ervideira",
    region: "Évora & Alentejo",
    summary: "Family wine company since 1880, now in its fourth and fifth generations.",
    seoDescription: "Ervideira is a family wine company founded in 1880, now in its fourth and fifth generations, visited on private Évora wine days from Lisbon.",
    body: [
      "Ervideira has been producing wine since 1880 and is run today by the fourth and fifth generations. Its 160 hectares of vineyards are spread across family properties in Vidigueira and Reguengos.",
    ],
    tours: [{ id: "evora-alentejo", label: "Évora & Alentejo day", role: "One of the winery options" }],
  },
  {
    slug: "herdade-do-esporao",
    name: "Herdade do Esporão",
    region: "Évora & Alentejo",
    summary: "Historic estate in the heart of Reguengos de Monsaraz.",
    seoDescription: "Herdade do Esporão is a historic estate in Reguengos de Monsaraz, visited on selected private Évora and Alentejo wine days from Lisbon.",
    body: [
      "Herdade do Esporão's vineyards sit in the heart of Reguengos de Monsaraz, producing balanced wines with good ageing potential.",
    ],
    tours: [{ id: "evora-alentejo", label: "Évora & Alentejo day", role: "One of the winery options" }],
  },
];

export function findWinery(slug: string): Winery | undefined {
  return WINERIES.find((w) => w.slug === slug);
}
