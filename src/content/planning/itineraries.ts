/**
 * Editorial itinerary planning pages.
 *
 * Each itinerary is a *shape* — the rhythm of a private N-day Portugal
 * journey drawn from experiences YES actually runs. It never invents
 * stops, partners or prices; the Travel Designer at /multi-day composes
 * the real itinerary with the guest.
 *
 * `signatureIds` on a day are OPTIONAL and only reference tours that
 * already exist in `signatureTours` — the recommender surfaces them
 * on the page. Never add an id that isn't in the catalog.
 */

export interface ItineraryDay {
  /** e.g. "Day 1", "Days 3–4". */
  span: string;
  /** Short uppercase region label. */
  eyebrow: string;
  /** Chapter title. */
  title: string;
  /** 2–4 sentence editorial paragraph. */
  body: string;
  /** Real Signature tour ids this day draws from — must exist in signatureTours. */
  signatureIds?: string[];
}

export interface PlanningItinerary {
  slug: string;
  /** For sitemap + canonical. */
  path: string;
  /** <title> — ≤60 chars. */
  metaTitle: string;
  /** <meta name="description"> — ≤160 chars. */
  metaDescription: string;
  /** Small uppercase eyebrow above H1. */
  eyebrow: string;
  /** Page H1. */
  h1: string;
  /** Standfirst under H1. */
  standfirst: string;
  /** Total-days label (e.g. "5 days · Lisbon → Sintra → Arrábida"). */
  spanLabel: string;
  /** ISO 8601 duration for schema.org, e.g. "P5D". */
  isoDuration: string;
  days: ItineraryDay[];
  /** Closing paragraph before the Travel Designer CTA. */
  outro: string;
  /** FAQ items rendered visibly and emitted as FAQPage JSON-LD. */
  faq: { q: string; a: string }[];
  /** Related signature ids surfaced in the "Experiences inside this journey" rail. */
  relatedSignatureIds: string[];
  /** Related Local Story slugs. */
  relatedStorySlugs: string[];
}

export const PLANNING_ITINERARIES: PlanningItinerary[] = [
  {
    slug: "5-day-portugal-itinerary",
    path: "/plan/5-day-portugal-itinerary",
    metaTitle: "5-Day Portugal Itinerary (Private) — Lisbon, Sintra, Arrábida",
    metaDescription:
      "A private 5-day Portugal itinerary composed with a local travel designer — Lisbon, Sintra, Arrábida wine country. Real days, real pace, no packages.",
    eyebrow: "Portugal · 5-day itinerary",
    h1: "A 5-Day Private Portugal Itinerary",
    standfirst:
      "The shortest journey we recommend for a first Portugal trip — Lisbon anchored by two contrasting day trips: Sintra's forest palaces and the Arrábida wine coast south of the bridge.",
    spanLabel: "5 days · Lisbon → Sintra → Arrábida",
    isoDuration: "P5D",
    days: [
      {
        span: "Day 1",
        eyebrow: "Lisbon · Arrival",
        title: "Land in Lisbon and let the city settle in slowly.",
        body: "A soft first day: a late breakfast in Príncipe Real, a walk down through Chiado, and a viewpoint before the light goes. Your designer books dinner at a table your host actually eats at — never a rooftop with a queue.",
      },
      {
        span: "Day 2",
        eyebrow: "Sintra · Cascais",
        title: "Sintra's palaces without the crush, then the Atlantic road home.",
        body: "A private early start beats the Pena Palace crowds. The rest of the day is what most itineraries skip — Cabo da Roca's cliffs, a slow lunch in Cascais, the Guincho coast on the way back. Ends before it should so you keep the evening for Lisbon.",
        signatureIds: ["sintra-cascais"],
      },
      {
        span: "Day 3",
        eyebrow: "Arrábida · Sesimbra",
        title: "South of the bridge — Arrábida wine country and a fishing village.",
        body: "Cross the 25 de Abril bridge and the landscape loosens. Two or three family cellars in Azeitão, a cliff-top viewpoint over the Arrábida park, and lunch in Sesimbra harbour. Our best-seller for a reason — most guests call this their favourite day of the trip.",
        signatureIds: ["arrabida-wine-allinclusive", "azeitao-cheese", "arrabida-boat"],
      },
      {
        span: "Day 4",
        eyebrow: "Lisbon · Neighbourhoods",
        title: "A slow Lisbon day on foot — the neighbourhoods that don't fit on a map.",
        body: "No monuments. A pastelaria in Estrela, the tile museum if you're a maker, a fado tasca in Alfama that opens for dinner without a stage. Your designer holds an evening reservation you can cancel by lunch.",
      },
      {
        span: "Day 5",
        eyebrow: "Lisbon · Departure",
        title: "One last table, then home.",
        body: "A morning coffee at the market, a private car to the airport, and a story worth telling. Five days is enough to know why people come back.",
      },
    ],
    outro:
      "This is the shape — your Travel Designer composes the real days with you, adjusting pace, tables and pick-up times to your rhythm. Every experience above is one we already run privately, with our own driver-guides.",
    faq: [
      {
        q: "Is 5 days enough for Portugal?",
        a: "For a first visit anchored in Lisbon, yes — you'll see the city, one forest-and-coast day (Sintra), and one wine-and-Atlantic day (Arrábida). Longer trips add the Alentejo or the north; five days is the shortest itinerary we design without cutting corners.",
      },
      {
        q: "Should I stay in Lisbon the whole time?",
        a: "For 5 days, we recommend one hotel in Lisbon and travelling out for day trips. Two moves in five days costs a full day to packing and transfers.",
      },
      {
        q: "Can you book the hotels too?",
        a: "Your Travel Designer suggests where to stay — small boutique hotels and quintas we know personally — but hotel bookings stay in your name so loyalty points and preferences are yours.",
      },
    ],
    relatedSignatureIds: [
      "sintra-cascais",
      "arrabida-wine-allinclusive",
      "azeitao-cheese",
    ],
    relatedStorySlugs: ["best-day-trips-from-lisbon", "sintra-day-tour-from-lisbon"],
  },
  {
    slug: "7-day-portugal-itinerary",
    path: "/plan/7-day-portugal-itinerary",
    metaTitle: "7-Day Portugal Itinerary (Private) | Lisbon, Alentejo, Comporta",
    metaDescription:
      "A private 7-day Portugal itinerary — Lisbon, Sintra, Arrábida wine coast, Alentejo hill towns and the Comporta coast. Designed with a local travel designer.",
    eyebrow: "Portugal · 7-day itinerary",
    h1: "A 7-Day Private Portugal Itinerary",
    standfirst:
      "One week is the sweet spot — long enough to leave Lisbon for two nights and come back, short enough to keep the rhythm slow. Lisbon and Sintra anchor either end; the Alentejo wine country and the Comporta coast fill the middle.",
    spanLabel: "7 days · Lisbon → Sintra → Alentejo → Comporta",
    isoDuration: "P7D",
    days: [
      {
        span: "Day 1",
        eyebrow: "Lisbon · Arrival",
        title: "Arrive in Lisbon and eat within walking distance of your hotel.",
        body: "A soft landing day. Your designer holds one dinner reservation you can move by lunch. Nothing else on the schedule.",
      },
      {
        span: "Day 2",
        eyebrow: "Sintra · Cascais",
        title: "Sintra's palaces, then the Atlantic coast home.",
        body: "A private early start, one palace done properly, and the wild coast road back through Cabo da Roca and Cascais.",
        signatureIds: ["sintra-cascais"],
      },
      {
        span: "Day 3",
        eyebrow: "Arrábida · Sesimbra",
        title: "South of the bridge — wine country and a fishing village.",
        body: "Family cellars in Azeitão, a viewpoint over the Arrábida park, lunch in Sesimbra harbour. Back to Lisbon by early evening.",
        signatureIds: ["arrabida-wine-allinclusive", "azeitao-cheese"],
      },
      {
        span: "Days 4–5",
        eyebrow: "Alentejo · Évora",
        title: "Two nights in Évora — Roman ruins, marble villages, clay-amphora wine.",
        body: "The Alentejo is Portugal's slow-Portugal — cork oaks, marble towns, and a wine tradition (vinho de talha) that still ferments in Roman-style clay amphorae. One night in Évora, one night at a quinta outside town.",
        signatureIds: ["evora-alentejo", "roman-heritage-alentejo"],
      },
      {
        span: "Day 6",
        eyebrow: "Comporta · Tróia",
        title: "Comporta and the Sado estuary on the way back to Lisbon.",
        body: "Rice fields, pine forest, and Portugal's quiet-luxury beach coast — the Sado ferry over to Tróia, a long lunch, and an unhurried drive back into the city.",
        signatureIds: ["troia-comporta"],
      },
      {
        span: "Day 7",
        eyebrow: "Lisbon · Departure",
        title: "One last Lisbon morning.",
        body: "Coffee at the market, a walk you didn't have time for on day one, and a private car to the airport.",
      },
    ],
    outro:
      "Seven days lets you leave Lisbon without losing it. Your Travel Designer builds the real itinerary around your tastes — a slower Alentejo, more Comporta beach, or an extra Lisbon night if the food capital hits differently than expected.",
    faq: [
      {
        q: "Is a 7-day Portugal trip better than 10?",
        a: "For a first visit, 7 days covers the south (Lisbon, Sintra, Arrábida, Alentejo, Comporta) beautifully. 10 days lets you add the north (Porto and the Douro). If your priority is depth over distance, seven private days in the south beats a scattered ten.",
      },
      {
        q: "Can you plan the whole trip, including drivers between cities?",
        a: "Yes — every transfer in the itinerary is with our own driver-guides. You never touch a bus, a train timetable or a rental-car counter.",
      },
      {
        q: "How far in advance should we plan?",
        a: "Peak season (May–October) fills 8–10 weeks out for the best small hotels and quintas. For shoulder season, four to six weeks is comfortable.",
      },
    ],
    relatedSignatureIds: [
      "sintra-cascais",
      "arrabida-wine-allinclusive",
      "evora-alentejo",
      "troia-comporta",
      "roman-heritage-alentejo",
    ],
    relatedStorySlugs: [
      "best-day-trips-from-lisbon",
      "evora-alentejo-wine-tour",
      "portugal-wine-tours",
    ],
  },
  {
    slug: "14-day-portugal-itinerary",
    path: "/plan/14-day-portugal-itinerary",
    metaTitle: "14-Day Portugal Itinerary (Private) | North to South",
    metaDescription:
      "A private 14-day Portugal itinerary — Lisbon, Sintra, Arrábida, Alentejo, Costa Vicentina and the north. Composed with a local travel designer.",
    eyebrow: "Portugal · 14-day itinerary",
    h1: "A 14-Day Private Portugal Itinerary",
    standfirst:
      "Two weeks is the itinerary we compose for travellers who want the whole country — Lisbon and its south, the Alentejo plains, the wild Costa Vicentina and, if it fits, the north. It's the trip most people wish they'd booked the first time.",
    spanLabel: "14 days · North → Centre → South",
    isoDuration: "P14D",
    days: [
      {
        span: "Days 1–3",
        eyebrow: "Lisbon · Sintra · Arrábida",
        title: "The Lisbon triangle — city, forest, wine coast.",
        body: "A soft arrival, one private Sintra day, and one day south of the bridge in the Arrábida wine country. By day four you understand why people fall for Lisbon.",
        signatureIds: ["sintra-cascais", "arrabida-wine-allinclusive"],
      },
      {
        span: "Days 4–5",
        eyebrow: "Alentejo · Évora",
        title: "Évora and the marble villages.",
        body: "Two nights in Évora — Roman ruins, cork-oak drives, and dinner at a table your designer has eaten at. A vinho de talha morning outside the city on day five.",
        signatureIds: ["evora-alentejo", "roman-heritage-alentejo"],
      },
      {
        span: "Days 6–7",
        eyebrow: "Costa Vicentina",
        title: "The wild southwest coast — cliffs, empty beaches, fishing villages.",
        body: "Two nights on the Costa Vicentina. Porto Covo, Vila Nova de Milfontes, Odeceixe — the Atlantic coast most trips never see. Slow, cinematic, and easy on the phone.",
        signatureIds: ["southwest-vicentine-coast", "wild-beaches-picnic"],
      },
      {
        span: "Day 8",
        eyebrow: "Comporta · Tróia",
        title: "Back north through Comporta.",
        body: "Rice fields and pine forest on the drive back up. Lunch in Comporta, a walk on the beach, a night in Tróia or a quiet quinta on the estuary.",
        signatureIds: ["troia-comporta"],
      },
      {
        span: "Days 9–10",
        eyebrow: "Centro · Tomar · Coimbra",
        title: "The Centro — Templar heritage and a university city.",
        body: "The Convento de Cristo in Tomar, a slow lunch by the Mondego in Coimbra, and — if the season is right — a fado alma at a small tasca in the old town.",
        signatureIds: ["tomar-coimbra", "fatima-nazare-obidos"],
      },
      {
        span: "Days 11–13",
        eyebrow: "Porto · Douro",
        title: "Porto and the Douro Valley.",
        body: "Two nights in Porto for the city, one night at a wine quinta in the Douro. This is the leg the Travel Designer builds most carefully — the good places book out first.",
      },
      {
        span: "Day 14",
        eyebrow: "Lisbon · Departure",
        title: "Fly home from Lisbon.",
        body: "A short domestic hop from Porto to Lisbon, a last coffee, and out. Two weeks is exactly enough to want to come back.",
      },
    ],
    outro:
      "Fourteen days is our most-requested multi-day journey. Your Travel Designer decides where to slow down and where to skip — some travellers cut the north for more Alentejo, others do the opposite. The itinerary is a shape; the days are yours.",
    faq: [
      {
        q: "Is 14 days too long for Portugal?",
        a: "No — Portugal is a small country with very different regions. Two weeks lets you go deep in both the south and the north without a rushed schedule. Shorter trips inevitably skip either the Alentejo or the Douro.",
      },
      {
        q: "How much does a 14-day private Portugal trip cost?",
        a: "It varies with hotel category, group size, and how many days are chauffeured versus self-drive. Your Travel Designer shares a realistic budget range on the first call — no obligation.",
      },
      {
        q: "Can we adjust the itinerary once we're travelling?",
        a: "Yes — because everything is private, the itinerary flexes day-by-day. Your designer stays reachable throughout the trip.",
      },
    ],
    relatedSignatureIds: [
      "sintra-cascais",
      "arrabida-wine-allinclusive",
      "evora-alentejo",
      "southwest-vicentine-coast",
      "troia-comporta",
      "tomar-coimbra",
    ],
    relatedStorySlugs: [
      "best-day-trips-from-lisbon",
      "portugal-wine-tours",
      "evora-alentejo-wine-tour",
    ],
  },
];

export function getPlanningItinerary(slug: string): PlanningItinerary | undefined {
  return PLANNING_ITINERARIES.find((i) => i.slug === slug);
}
