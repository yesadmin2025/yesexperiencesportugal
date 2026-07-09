/**
 * FAQ content for FAQPage JSON-LD schema on Signature, Studio and
 * Travel Designer routes. First-party answers only — no third-party
 * review aggregation. Each set targets high-intent Lisbon day-tour
 * queries surfaced in Search Console.
 */
import { CANCELLATION_SIGNATURE, CANCELLATION_STUDIO } from "@/config/business-nap";

export type FaqItem = { q: string; a: string };

export const CORPORATE_FAQ: FaqItem[] = [
  {
    q: "Do you organise team building in Portugal?",
    a: "Yes. We design private team-building days across Portugal — wine and gastronomy days on the Arrábida coast, sailing and coastal experiences from Sesimbra, cultural days in Sintra and the Alentejo. Transport, guides and venues are coordinated end to end by our local team.",
  },
  {
    q: "Can you plan corporate retreats in Portugal?",
    a: "Yes. Multi-day corporate retreats are handled as a bespoke journey — regional logistics, meeting-friendly venues, cultural moments and free time built into the flow. We work with trusted partners across Lisbon, Sintra, Arrábida, Comporta and the Alentejo.",
  },
  {
    q: "What group sizes do you handle?",
    a: "From small executive off-sites of 6 to 12 people up to full-company retreats of 100+. Transport is scoped accordingly — private vehicles for small groups, coaches with hostesses for large ones — and every group has a dedicated local coordinator.",
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
    a: 'Yes. Use "Tailor this Signature" to adjust pace, timing, small additions and group needs without redesigning the core day. The route, story and local guide stay locked.',
  },
  {
    q: "What's your cancellation policy?",
    a: `${CANCELLATION_SIGNATURE} ${CANCELLATION_STUDIO}`,
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
