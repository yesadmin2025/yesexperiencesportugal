/**
 * FAQ content for FAQPage JSON-LD schema on Signature, Studio and
 * Travel Designer routes. First-party answers only — no third-party
 * review aggregation. Each set targets high-intent Lisbon day-tour
 * queries surfaced in Search Console.
 */
import { CANCELLATION } from "@/config/business-nap";

export type FaqItem = { q: string; a: string };

export const CORPORATE_FAQ: FaqItem[] = [
  {
    q: "Do you organise team building across Portugal?",
    a: "Yes. We design private team-building experiences across Portugal, from cultural, gastronomic and hands-on programmes to coastal activities, workshops, boats and regional experiences. Each programme is adapted to the group's objectives, size and preferred pace.",
  },
  {
    q: "Can you plan corporate retreats and incentives?",
    a: "Yes. We coordinate single-day and multi-day corporate programmes across Portugal, including transport, activities, venues, guides, group logistics and local hosting.",
  },
  {
    q: "What group sizes do you handle?",
    a: "From small executive and leadership teams to company-wide groups of 100+. Transport, venues, staffing, activity rotations and logistics are scaled to the brief.",
  },
  {
    q: "Do you work only in Lisbon and the surrounding region?",
    a: "No. We operate across Portugal. The route and programme are selected according to the group, travel window, objectives and preferred style of experience.",
  },
  {
    q: "Can you create a fully customised corporate programme?",
    a: "Yes. Every proposal can be shaped around the group's objectives, timings, budget, interests and operational requirements. We do not rely on one fixed team-building template.",
  },
];

export const PROPOSAL_FAQ: FaqItem[] = [
  {
    q: "Where in Portugal can we plan a proposal?",
    a: "The most requested settings are Sintra (Pena Palace terraces, Cabo da Roca cliffs at sunset), the Arrábida coast (a quiet cove reached by private boat), and rooftop tables in Lisbon at golden hour. We can shape the moment anywhere in Portugal that fits the story.",
  },
  {
    q: "How discreet is the planning?",
    a: "Fully discreet. The proposal is planned end to end with our local team — vendors, timing and logistics are confirmed in advance. Nothing is discussed in front of your partner, and any surprise elements are held privately until the moment itself.",
  },
  {
    q: "How far in advance should we plan a proposal in Portugal?",
    a: "Two to six weeks is comfortable for most private proposals — enough time to align setting, weather, photographer and any surprise element. Shorter windows are possible when a specific date matters; get in touch and we'll tell you honestly what's still feasible.",
  },
];

export const WINE_TOURS_FAQ: FaqItem[] = [
  {
    q: "Which wine regions can I visit on a private day from Lisbon?",
    a: "Arrábida and Setúbal (about 40 minutes south) are the closest — home to Moscatel de Setúbal and small family cellars. Azeitão adds artisan cheese and quieter tables. The Alentejo (about 90 minutes south-east) is a longer day for concentrated reds and Vinho de Talha.",
  },
  {
    q: "Is the wine tour fully private?",
    a: "Yes. Every YES wine day is private — your group only, with a dedicated English-speaking guide and driver. Hotel pickup and drop-off in Lisbon are included; you never share the day with strangers.",
  },
  {
    q: "How long does a Portugal wine tour take?",
    a: "Most private wine days from Lisbon run between 8 and 10 hours, with two to three cellars and a long Portuguese lunch. Alentejo wine days are 10 to 11 hours because of the drive; multi-day wine journeys are handled by our Travel Designer.",
  },
];

export const WINE_LISBON_FAQ: FaqItem[] = [
  {
    q: "How far is Arrábida from Lisbon?",
    a: "About 40 minutes across the 25 de Abril Bridge. The road climbs into cork-oak hills with the Atlantic visible below — a scenic short drive that keeps most of the day on the wine, not on the road.",
  },
  {
    q: "How many wineries do you visit in one day?",
    a: "Two, sometimes three. We keep the pace unhurried — a serious cellar visit needs time — and always build in a long traditional Portuguese lunch between tastings rather than rushing between them.",
  },
  {
    q: "Is lunch included in the private wine tour?",
    a: "Yes. A long Portuguese lunch at a trusted regional table is included in the Arrábida Wine Signature price, alongside all tastings, transfers and door-to-door driving from Lisbon.",
  },
];

/**
 * Per-tour FAQ overlays for wine-focused Signatures. These questions are
 * prepended to SIGNATURE_FAQ for the matching tour and emitted in the
 * FAQPage JSON-LD + rendered visibly on the tour page. Targets the
 * "wine tour lisbon" / "wine tasting near lisbon" / "alentejo wine tour
 * from lisbon" query cluster.
 */
export const WINE_TOUR_FAQ_BY_ID: Record<string, FaqItem[]> = {
  "arrabida-wine-allinclusive": [
    {
      q: "Is this the best private wine tour from Lisbon?",
      a: "It's our most-booked private wine tour from Lisbon — a full Arrábida day with two family wineries in Azeitão, the Livramento market in Setúbal, a long Portuguese lunch, and time in the Arrábida Natural Park. Everything included, only your group, back in Lisbon by evening.",
    },
    {
      q: "How far is Arrábida from Lisbon?",
      a: "About 40 minutes across the 25 de Abril Bridge. The road climbs into cork-oak hills with the Atlantic below — the drive itself is part of the day, and you spend the rest on wine and coast, not on the road.",
    },
    {
      q: "Which wines will I taste on this Lisbon wine tour?",
      a: "Moscatel de Setúbal at a historic Azeitão cellar, and Castelão / Syrah / Fernão Pires reds at a second family estate. Every tasting is guided by someone who works with the wine, not a hostess reading from a script.",
    },
  ],
  "azeitao-cheese": [
    {
      q: "Is this a good wine tasting near Lisbon?",
      a: "Yes. This is a full private 8–9 hour day from Lisbon combining the Setúbal market, a hands-on Azeitão cheese-making workshop, lunch in Azeitão, a guided winery visit and tasting, and Sesimbra Castle. It is designed for guests who want food, wine and local craft in one unhurried day.",
    },
    {
      q: "How does this compare to the Arrábida private wine tour from Lisbon?",
      a: "They explore the same wider region but with a different focus. The Arrábida Wine Signature is wine-led; Azeitão Cheese & Wine gives the cheese workshop equal weight, then adds a winery tasting, lunch and Sesimbra context. Both are full private days rather than short tasting trips.",
    },
    {
      q: "Is the cheese-making workshop included?",
      a: "Yes. The hands-on Azeitão cheese workshop is part of the booked day, together with its listed tastings and accompaniments. You make the cheese with the producer rather than only watching a demonstration.",
    },
    {
      q: "Is a cellar tour and wine tasting included?",
      a: "Yes. A guided winery visit and tasting are included, alongside the cheese workshop, lunch, private transport, pickup and drop-off, and the other inclusions shown on the tour page.",
    },
  ],
  "evora-alentejo": [
    {
      q: "Is this the best Alentejo wine tour from Lisbon?",
      a: "It's our most-requested Alentejo wine tour from Lisbon — a private day combining UNESCO Évora (Roman temple, Chapel of Bones, medieval walls) with a working Alentejo winery visit and a long regional lunch. One driver, one guide, door-to-door from your Lisbon hotel.",
    },
    {
      q: "How long is the drive to the Alentejo from Lisbon?",
      a: "About 90 minutes each way to Évora. The day is long — usually 10 to 11 hours door-to-door — but the pace inside it is unhurried: heritage in the morning, wine and lunch after, and time to actually taste rather than tick boxes.",
    },
    {
      q: "Which Alentejo wines will I taste?",
      a: "The core Alentejo range at a working winery — typically Alicante Bouschet, Aragonez, Trincadeira and Syrah reds, with Antão Vaz or Arinto whites. Tastings are guided by the estate team, not a marketing host.",
    },
  ],
  "roman-heritage-alentejo": [
    {
      q: "What makes this different from a standard Alentejo wine tour from Lisbon?",
      a: "It's built around vinho de talha — wine still fermented in clay amphorae, the way the Romans made it here two thousand years ago. Small cellars, a hands-on tasting, and a wine story you won't find on the standard Évora circuit.",
    },
    {
      q: "Is this a private tour from Lisbon?",
      a: "Yes. Fully private, door-to-door from your Lisbon hotel. A licensed local driver, an English-speaking guide, and only your group in the vehicle.",
    },
    {
      q: "Who is this wine tour best for?",
      a: "Wine travelers who have already seen the standard Portuguese wine circuit and want a quieter, deeper day — real cellars, real winemakers, and a technique older than most of Europe's vineyards.",
    },
  ],
};

/** Returns the FAQ set for a tour page — wine overlay (if any) + SIGNATURE_FAQ. */
export function getFaqForTour(tourId: string): FaqItem[] {
  const overlay = WINE_TOUR_FAQ_BY_ID[tourId] ?? [];
  return [...overlay, ...SIGNATURE_FAQ];
}

export const SIGNATURE_FAQ: FaqItem[] = [
  {
    q: "Is this a private day tour from Lisbon?",
    a: "Yes. Every Signature is fully private — only your group, your guide and your driver. We pick you up at your Lisbon hotel or apartment and bring you back at the end of the day.",
  },
  {
    q: "Is hotel pickup from Lisbon included?",
    a: "Yes. Door-to-door hotel pickup and drop-off in Lisbon, Cascais and Estoril are included at no extra cost. Pickups outside this area can be arranged on request.",
  },
  {
    q: "How long does the day last?",
    a: "Most Signature day tours run between 8 and 10 hours, designed at a relaxed Portuguese pace — never rushed, with time at each stop to actually enjoy it.",
  },
  {
    q: "How many people can join a private tour?",
    a: "Signatures are designed for couples, families and small private groups up to 7 guests in one vehicle. Larger groups are handled as a Travel Designer request.",
  },
  {
    q: "What's included in the price?",
    a: "Private vehicle and English-speaking guide, hotel pickup and drop-off, fuel and tolls, and any tastings or visits noted as included in the tour page. Personal extras and meals not listed as included are paid on the day.",
  },
  {
    q: "Can I customise this Signature?",
    a: 'Yes. Use "Tailor this day" to adjust pace, timing, small additions and group needs without redesigning the core day. The route, story and local guide stay locked.',
  },
  {
    q: "What's your cancellation policy?",
    a: `Signature Experiences: ${CANCELLATION.signature.en} Studio, Travel Designer, Corporate, Moments and other custom-built experiences: ${CANCELLATION.custom.en}`,
  },
];

export const STUDIO_FAQ: FaqItem[] = [
  {
    q: "What is the YES Experience Studio?",
    a: "A guided composer that designs a private Portugal day around your feeling, company and rhythm — then prices and reserves it instantly. It is not a quiz or a form; the map and itinerary respond as you choose.",
  },
  {
    q: "Can I book a private day tour from Lisbon instantly?",
    a: "Yes. Once you've composed your day in the Studio you get a live price and can confirm with secure checkout — no email back-and-forth, no waiting.",
  },
  {
    q: "Which regions can I design a day in?",
    a: "Lisbon, Sintra, Cascais, Arrábida, Sesimbra and the surrounding coast and countryside. Évora, Comporta and the Alentejo are available as day trips or inside a longer journey.",
  },
  {
    q: "Is the day fully private?",
    a: "Yes. Every Studio day is private — your group only, with a dedicated guide and driver, and hotel pickup in the Lisbon area included.",
  },
  {
    q: "How accurate are the prices in the Studio?",
    a: "Prices update live as you adjust group size, pace and add-ons. The number you see at checkout is the number you pay — no hidden fees.",
  },
  {
    q: "What if I want help instead of designing it myself?",
    a: "You can switch to a Signature day for a ready-made route, or open a Travel Designer request and we'll compose it with you over a short conversation.",
  },
];

export const TRAVEL_DESIGNER_FAQ: FaqItem[] = [
  {
    q: "What is a Travel Designer in Portugal?",
    a: "A Travel Designer creates a full private Portugal journey around your pace, interests, route, stays, experiences and logistics. It is different from booking a single tour because the entire trip is designed as one connected journey.",
  },
  {
    q: "Is this different from booking a private tour?",
    a: "Yes. A private tour is usually one day or one fixed experience. Travel Designer is for a complete journey, where routes, stays, transfers, private experiences and timing are designed together.",
  },
  {
    q: "Can you design a multi-day Portugal itinerary?",
    a: "Yes. Travel Designer can create anything from a short regional escape to a multi-week journey across Portugal, depending on your time, pace and interests.",
  },
  {
    q: "Can you plan honeymoons or special occasions in Portugal?",
    a: "Yes. Honeymoons, anniversaries, proposals, family celebrations and meaningful private occasions can be designed into the journey with discretion and care.",
  },
  {
    q: "Can you include hotels, transfers and private experiences?",
    a: "Yes. The travel file can include stay logic, transfers, private experiences, timing notes, trusted partners and confirmed elements where relevant.",
  },
  {
    q: "Do I receive a written proposal before booking?",
    a: "Yes. Travel Designer journeys are delivered as a curated travel file so you can understand the rhythm, route and key details before travelling.",
  },
  {
    q: "Can the journey be adjusted after the first proposal?",
    a: "Yes. The journey can be refined with you before travelling and supported locally while you are in Portugal.",
  },
  {
    q: "How far in advance should I request a Travel Designer journey?",
    a: "For multi-day journeys, we recommend starting as early as possible, especially for spring, summer and September. Shorter timelines may still be possible depending on dates, route and availability.",
  },
];
