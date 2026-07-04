/**
 * FAQ content for FAQPage JSON-LD schema on Signature, Studio and
 * Travel Designer routes. First-party answers only — no third-party
 * review aggregation. Each set targets high-intent Lisbon day-tour
 * queries surfaced in Search Console.
 */

export type FaqItem = { q: string; a: string };

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
    a: "Yes. Use \"Tailor this Signature\" to adjust pace, timing, small additions and group needs without redesigning the core day. The route, story and local guide stay locked.",
  },
  {
    q: "What's your cancellation policy?",
    a: "Free cancellation up to 24 hours before the experience start time for a full refund. Inside 24 hours the booking is non-refundable.",
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
