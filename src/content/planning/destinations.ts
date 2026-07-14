/**
 * Editorial destination planning guides.
 *
 * Each destination anchors a real Portugal region we run private
 * experiences in. Copy stays truthful: no invented restaurants,
 * partners, addresses or prices. The `signatureIds` list must only
 * contain tours that exist in `signatureTours`.
 */

export interface DestinationSection {
  heading: string;
  body: string;
}

export interface PlanningDestination {
  slug: string;
  path: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  standfirst: string;
  /** Free-text region string used in the recommender seed (matches SignatureTour.region tokens). */
  regionSeed: string;
  /** Style tokens for the recommender (must match SignatureTour.seed.styles). */
  styleSeed: string[];
  /** Editorial sections rendered in order. */
  sections: DestinationSection[];
  /** Real Signature tour ids featured on the page. */
  signatureIds: string[];
  /** Related Local Story slugs. */
  relatedStorySlugs: string[];
  faq: { q: string; a: string }[];
}

export const PLANNING_DESTINATIONS: PlanningDestination[] = [
  {
    slug: "lisbon",
    path: "/plan/lisbon",
    metaTitle: "Lisbon Travel Planning Guide — By a Local Operator",
    metaDescription:
      "A local operator's Lisbon planning guide — where to stay, when to go, and the private day trips worth building a week around. Written by the team that designs them.",
    eyebrow: "Destination · Lisbon",
    h1: "Planning a Private Trip to Lisbon",
    standfirst:
      "Lisbon rewards travellers who slow down. Two full days in the city, and the rest of the week spent going out — Sintra one morning, Arrábida the next, the Alentejo for a night, back for dinner in Alfama.",
    regionSeed: "Lisbon · Setúbal · Arrábida · Sintra",
    styleSeed: ["heritage", "wine", "gastronomy", "coastal"],
    sections: [
      {
        heading: "When to visit",
        body: "May, June, September and October are the windows we design most weeks in. July and August are hot and crowded; November through February are quiet, mild and honest about the light. Christmas and Easter each carry their own atmosphere — worth planning around a table, not a schedule.",
      },
      {
        heading: "Where to stay",
        body: "For a first visit, Chiado or Príncipe Real puts everything on foot. For a slower week, Alfama or Estrela feels more like a neighbourhood than a hotel district. Your Travel Designer suggests small boutique hotels and quintas we know personally — the shortlist changes every season.",
      },
      {
        heading: "The private day trips that make the week",
        body: "Lisbon sits on an estuary with three very different day trips within an hour: Sintra's forest palaces to the west, the Arrábida wine coast south of the bridge, and the Alentejo cork-oak plains further out. Most weeks include at least two.",
      },
      {
        heading: "How we work",
        body: "Every experience below is one we run ourselves — our own driver-guides, our own partners, tables our team eats at. You can book a single Signature day, compose your own private day in the Studio, or hand the full week to a Travel Designer.",
      },
    ],
    signatureIds: [
      "sintra-cascais",
      "arrabida-wine-allinclusive",
      "azeitao-cheese",
      "arrabida-boat",
      "tiles-workshop",
    ],
    relatedStorySlugs: ["best-day-trips-from-lisbon", "sintra-day-tour-from-lisbon"],
    faq: [
      {
        q: "How many days should we spend in Lisbon?",
        a: "For a first visit, two full days in the city and three to four day trips is the shape most travellers wish they'd chosen. A week is comfortable; less than four days rushes it.",
      },
      {
        q: "Do we need a car in Lisbon?",
        a: "No — the city is walkable and taxis are cheap. For day trips outside the city, a private driver-guide is faster, safer and considerably less stressful than a rental car.",
      },
    ],
  },
  {
    slug: "sintra",
    path: "/plan/sintra",
    metaTitle: "Sintra Travel Planning Guide — Private Day Trips from Lisbon",
    metaDescription:
      "How to visit Sintra without the crowds — a local planning guide with the private day trip we design from Lisbon. Palaces, coast, and a slow lunch.",
    eyebrow: "Destination · Sintra",
    h1: "Planning a Private Trip to Sintra",
    standfirst:
      "Sintra is worth the day, but only if you arrive before the buses. A private early start, one palace done properly, and the rest of the day on the Atlantic coast — that's how the day works.",
    regionSeed: "Sintra · Lisbon Coast",
    styleSeed: ["heritage", "coastal", "nature"],
    sections: [
      {
        heading: "Why Sintra needs a plan",
        body: "The palaces (Pena, Regaleira, Monserrate) are extraordinary — and completely overwhelmed by lunch. Every serious Sintra day starts before 9:00, does one palace at unfair speed, and leaves the mountain by early afternoon.",
      },
      {
        heading: "The full-day shape we design",
        body: "A private early start at Pena or Regaleira, a walk in the Monserrate gardens, lunch in the old town, then west to Cabo da Roca — the westernmost point of continental Europe — and down the Guincho coast to Cascais for the evening light. Back to Lisbon before dinner.",
      },
      {
        heading: "Where to stay",
        body: "Most travellers day-trip from Lisbon. If you want a night in Sintra itself, one or two quintas up the mountain are extraordinary — your Travel Designer knows which ones actually deliver on quiet.",
      },
    ],
    signatureIds: ["sintra-cascais"],
    relatedStorySlugs: ["sintra-day-tour-from-lisbon", "best-day-trips-from-lisbon"],
    faq: [
      {
        q: "Is Sintra worth a whole day?",
        a: "Yes, but only if you extend the day west to Cabo da Roca and Cascais. A palaces-only Sintra day feels short and crowded; a palaces-plus-coast day is the one people remember.",
      },
      {
        q: "Can we do Sintra without a private driver?",
        a: "You can, but the trains fill up and the palaces do not accept large-luggage entries. A private driver-guide books the timed entries in advance and gets you between palaces on the mountain in minutes rather than an hour.",
      },
    ],
  },
  {
    slug: "arrabida",
    path: "/plan/arrabida",
    metaTitle: "Arrábida Travel Planning Guide — Wine, Coast, Sesimbra",
    metaDescription:
      "A local guide to the Arrábida Natural Park — wine country in Azeitão, cliff-top viewpoints, and Sesimbra's fishing harbour. The private days we design here.",
    eyebrow: "Destination · Arrábida",
    h1: "Planning a Private Trip to the Arrábida",
    standfirst:
      "Cross the 25 de Abril bridge from Lisbon and the landscape loosens — cork oaks, low hills, a natural park that drops straight into the Atlantic. Our best-seller lives here.",
    regionSeed: "Setúbal · Arrábida · Sesimbra · Azeitão",
    styleSeed: ["wine", "coastal", "gastronomy", "nature"],
    sections: [
      {
        heading: "What the Arrábida is",
        body: "A small natural park south of Lisbon with a very specific character: family wineries in Azeitão, cliff-top viewpoints over the park, small unguarded beaches, and Sesimbra — a working fishing town that hasn't been renovated into a resort. The area is 45 minutes from Lisbon and feels like another country.",
      },
      {
        heading: "The wine day (our best-seller)",
        body: "Two or three family cellars in Azeitão, Moscatel de Setúbal at the source, a viewpoint above the park, and a slow lunch in Sesimbra harbour. This is the private day most guests call their favourite of the trip.",
      },
      {
        heading: "The coastal day",
        body: "A boat morning out of Sesimbra into the coves that only open from the water, a swim off Portinho da Arrábida, and lunch on the beach. Best from May through October.",
      },
      {
        heading: "The cheese-and-tiles day",
        body: "For guests who prefer heritage to hiking — the traditional tile ateliers of Azeitão and the family cheesemakers of the Serra de Arrábida. A gentle, slow day.",
      },
    ],
    signatureIds: [
      "arrabida-wine-allinclusive",
      "arrabida-boat",
      "azeitao-cheese",
      "tiles-workshop",
    ],
    relatedStorySlugs: [
      "arrabida-day-trip-from-lisbon",
      "arrabida-wine-tour",
      "wine-tours-lisbon",
    ],
    faq: [
      {
        q: "Is the Arrábida a day trip or a stay?",
        a: "For most travellers, a day trip from Lisbon. There is one small hotel inside the park worth an overnight for guests who want a quieter rhythm — your Travel Designer will suggest it if it fits.",
      },
      {
        q: "When is Arrábida wine season?",
        a: "The wineries are open year-round. May to October is warmest for the coast and viewpoints; September and October are our favourite months — the harvest is in and the beaches are quiet.",
      },
    ],
  },
  {
    slug: "alentejo",
    path: "/plan/alentejo",
    metaTitle: "Alentejo Travel Planning Guide — Évora, Marble, Vinho de Talha",
    metaDescription:
      "A local guide to the Alentejo — Évora, marble villages, cork oaks and the vinho de talha wine tradition. The private days and multi-day journeys we design.",
    eyebrow: "Destination · Alentejo",
    h1: "Planning a Private Trip to the Alentejo",
    standfirst:
      "The Alentejo is Portugal's slow-Portugal — cork-oak plains, marble towns, and one of the world's oldest continuous wine traditions. Two nights is the minimum; four is better.",
    regionSeed: "Alentejo · Évora · Vidigueira",
    styleSeed: ["wine", "heritage", "gastronomy"],
    sections: [
      {
        heading: "Why the Alentejo",
        body: "The Alentejo is what most travellers imagine when they think of Portugal but rarely reach. Long horizons, sheep bells, whitewashed towns with marble streets, and a wine culture that still ferments in Roman-style clay amphorae (vinho de talha) — a tradition older than the country itself.",
      },
      {
        heading: "The two-night shape",
        body: "One night in Évora — Roman ruins, the cathedral, dinner at a table your designer has eaten at — and one night at a quinta outside town, so you wake up in the landscape you drove into.",
      },
      {
        heading: "The vinho de talha morning",
        body: "A private morning inside a family cellar in the Vidigueira region — the amphorae, the tasting, and a conversation with the winemaker in a language your guide translates gently. This is one of our most distinctive experiences.",
      },
    ],
    signatureIds: ["evora-alentejo", "roman-heritage-alentejo"],
    relatedStorySlugs: [
      "evora-alentejo-wine-tour",
      "evora-private-tour-from-lisbon",
      "alentejo-wine-tour-from-lisbon",
    ],
    faq: [
      {
        q: "Is the Alentejo doable as a day trip from Lisbon?",
        a: "Yes — we run a private day tour to Évora and back, and it works. For the wine tradition and the light, though, two nights is the shape that stays with you.",
      },
      {
        q: "When is the best time to visit the Alentejo?",
        a: "Spring (April–June) and autumn (September–October). July and August are very hot; the plains bake. Winter is quiet, cold in the morning and warm at lunch — surprisingly beautiful.",
      },
    ],
  },
  {
    slug: "comporta",
    path: "/plan/comporta",
    metaTitle: "Comporta Travel Planning Guide — Beach, Rice Fields, Tróia",
    metaDescription:
      "A local guide to Comporta — rice fields, pine forest, quiet-luxury beaches and the Sado estuary. The private day and multi-day journeys we design.",
    eyebrow: "Destination · Comporta",
    h1: "Planning a Private Trip to Comporta",
    standfirst:
      "Comporta is Portugal's quiet-luxury coast — pine forest, rice fields, white beaches with almost no infrastructure, and a rhythm you notice inside an hour.",
    regionSeed: "Tróia · Comporta · Alentejo",
    styleSeed: ["coastal", "heritage", "gastronomy"],
    sections: [
      {
        heading: "What Comporta is",
        body: "A stretch of coast an hour south of Lisbon (via the Sado ferry from Setúbal to Tróia) that has been consciously kept low-rise: rice fields inland, a long dune-and-pine beach, small restaurants, a few very good hotels, and the estuary's dolphin pods. It is nobody's first Portugal itinerary and, quietly, many people's favourite piece of it.",
      },
      {
        heading: "The private day from Lisbon",
        body: "The Sado ferry, Tróia's Roman ruins by the water, a long lunch in Comporta, and an afternoon on a beach with almost no one on it. Back in Lisbon by dinner.",
      },
      {
        heading: "The two-night option",
        body: "For travellers who feel the pace immediately, two nights in a small Comporta hotel — a beach morning, a rice-fields drive, and dinner on a wooden terrace. Your Travel Designer chooses the hotel based on the season and your group.",
      },
    ],
    signatureIds: ["troia-comporta"],
    relatedStorySlugs: ["best-day-trips-from-lisbon"],
    faq: [
      {
        q: "Is Comporta a day trip or a stay?",
        a: "Both work. A private day from Lisbon gives you the beach, Tróia and lunch. Two nights lets the pace actually land.",
      },
      {
        q: "When is Comporta best?",
        a: "May, June, September and October — warm enough for the beach, cool enough to be outside all day, and quieter than midsummer. July and August are the busiest weeks.",
      },
    ],
  },
  {
    slug: "costa-vicentina",
    path: "/plan/costa-vicentina",
    metaTitle: "Costa Vicentina Travel Planning Guide — Wild Southwest Coast",
    metaDescription:
      "A local guide to Portugal's Costa Vicentina — cliffs, empty beaches, fishing villages between Porto Covo and Odeceixe. The private day tour we run from Lisbon.",
    eyebrow: "Destination · Costa Vicentina",
    h1: "Planning a Private Trip to the Costa Vicentina",
    standfirst:
      "The southwest coast is the Portugal most trips never reach — cliffs, empty beaches, fishing villages, and one long protected park. A private day from Lisbon is the fastest way in; two nights is the way to feel it.",
    regionSeed: "Southwest Alentejo · Costa Vicentina",
    styleSeed: ["coastal", "nature", "heritage"],
    sections: [
      {
        heading: "What the Costa Vicentina is",
        body: "A stretch of protected Atlantic coast running from south of Sines to the Algarve — small fishing towns (Porto Covo, Vila Nova de Milfontes, Odeceixe), long empty beaches, and cliff walks that stay quiet even in high season. One of the most unique landscapes in Portugal.",
      },
      {
        heading: "The private day from Lisbon",
        body: "A long drive south, three or four coastal stops (Porto Covo, Milfontes, sometimes Odeceixe), a swim if the day allows, and lunch on a terrace above the sea. Back to Lisbon late — this is a slow, cinematic day, not a fast one.",
      },
      {
        heading: "The two-night option",
        body: "Two nights in one small hotel between Milfontes and Odeceixe lets the coast open up — a picnic on a wild beach, a fisherman's dinner, and time to walk a stretch of the Rota Vicentina trail.",
      },
    ],
    signatureIds: ["southwest-vicentine-coast", "wild-beaches-picnic"],
    relatedStorySlugs: [],
    faq: [
      {
        q: "Is the Costa Vicentina worth the drive from Lisbon?",
        a: "For travellers who love raw coastal landscape, absolutely — it is one of the most unique days we run, and the coast we get the most repeat guests for. If you prefer wine country, choose the Alentejo instead.",
      },
      {
        q: "When can we swim on the Costa Vicentina?",
        a: "The Atlantic here is cold — May through October is comfortable for most swimmers, July and August are warmest. The cliffs, walks and light are extraordinary year-round.",
      },
    ],
  },
];

export function getPlanningDestination(slug: string): PlanningDestination | undefined {
  return PLANNING_DESTINATIONS.find((d) => d.slug === slug);
}
