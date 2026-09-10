/**
 * Comparison data for /day-trips-from-lisbon.
 *
 * Every row maps to a REAL Signature tour id. Duration and price are read
 * from `signatureTours` at render time — never duplicated here. Drive
 * times mirror the published region data in `lisbon-regions.ts`; distances
 * are plain road geography (stated in miles first for US readers, with km
 * alongside). "Best for" and "Our honest verdict" are editorial judgement
 * about days we run ourselves — they invent no stop, partner or inclusion.
 */

export interface DayTripComparisonRow {
  /** Signature tour id — the bookable day this row describes. */
  tourId: string;
  /** Where the day goes, in the words an American traveler would search. */
  destination: string;
  /** One-way drive from central Lisbon. */
  drive: string;
  /** Miles first, km second. Road distance, one way. */
  distance: string;
  /** Half day or full day, in plain language. */
  shape: string;
  bestFor: string;
  verdict: string;
}

export const DAY_TRIP_COMPARISON: readonly DayTripComparisonRow[] = [
  {
    tourId: "arrabida-wine-allinclusive",
    destination: "Arrábida & Azeitão wine country",
    drive: "About 40 minutes",
    distance: "25 miles (40 km)",
    shape: "Full day",
    bestFor: "Wine, coastline and a long lunch in the same day",
    verdict:
      "The day we would pick if you only have one. It is the closest real wine country to Lisbon, so almost none of it is spent on the motorway — and the Arrábida park road to the sea is the best short drive near the capital.",
  },
  {
    tourId: "sintra-cascais",
    destination: "Sintra, Cabo da Roca & Cascais",
    drive: "About 40 minutes",
    distance: "19 miles (30 km)",
    shape: "Full day",
    bestFor: "First-time visitors who want the palaces and the Atlantic",
    verdict:
      "Worth it, but only with early timing. Sintra is the most visited day trip from Lisbon and the difference between a wonderful day and a frustrating one is entirely about what hour you arrive where.",
  },
  {
    tourId: "wild-beaches-picnic",
    destination: "Arrábida beaches & Sesimbra",
    drive: "About 40 minutes",
    distance: "25 miles (40 km)",
    shape: "Full day",
    bestFor: "Swimming, coves and a slow coastal day",
    verdict:
      "The day to choose between May and October. Green water, white cliffs and a picnic instead of a restaurant — the closest thing to the Algarve without the six-hour round trip.",
  },
  {
    tourId: "azeitao-cheese",
    destination: "Azeitão cheese-making & wine",
    drive: "About 40 minutes",
    distance: "25 miles (40 km)",
    shape: "Full day",
    bestFor: "Hands-on food lovers and families",
    verdict:
      "The most hands-on day we run, and the one guests describe most vividly afterwards. You make the cheese yourself; it is not a demonstration you watch.",
  },
  {
    tourId: "arrabida-boat",
    destination: "Arrábida coast by boat",
    drive: "About 40 minutes",
    distance: "25 miles (40 km)",
    shape: "Full day",
    bestFor: "Seeing the cliffs from the water",
    verdict:
      "The Arrábida cliffs read completely differently from sea level. Weather-dependent, so we keep it to the warm half of the year.",
  },
  {
    tourId: "troia-comporta",
    destination: "Tróia & Comporta",
    drive: "About 1 hour, including the Sado ferry",
    distance: "68 miles (110 km) by road, or shorter via the ferry",
    shape: "Full day",
    bestFor: "Wide empty sand, rice fields and Roman ruins",
    verdict:
      "Quieter than anything on the Lisbon side, and the estuary crossing makes the arrival feel like a different country. Best from late spring to early autumn.",
  },
  {
    tourId: "evora-alentejo",
    destination: "Évora & the Alentejo",
    drive: "About 1 hour 30 minutes",
    distance: "84 miles (135 km)",
    shape: "Long full day, early start",
    bestFor: "Roman history, walled streets and serious wine",
    verdict:
      "Genuinely worth the drive — but only as a private day. On a fixed group schedule, three hours of driving leaves very little Évora.",
  },
  {
    tourId: "roman-heritage-alentejo",
    destination: "Hidden Alentejo & talha wine",
    drive: "About 1 hour 45 minutes",
    distance: "100 miles (160 km)",
    shape: "Long full day, early start",
    bestFor: "Travelers who have already seen the obvious Portugal",
    verdict:
      "Wine still fermented in clay amphorae, the way the Romans did it here. The most unusual day in our catalog and the one wine people remember longest.",
  },
  {
    tourId: "southwest-vicentine-coast",
    destination: "Southwest Vicentine coast",
    drive: "About 2 hours",
    distance: "112 miles (180 km)",
    shape: "Long full day, early start",
    bestFor: "Dramatic Atlantic cliffs far from any crowd",
    verdict:
      "The wildest coastline within a day of Lisbon. A long drive, and worth it if empty landscape is what you came for.",
  },
  {
    tourId: "fatima-nazare-obidos",
    destination: "Fátima, Nazaré & Óbidos",
    drive: "1 to 2 hours",
    distance: "78 miles (125 km) to Fátima",
    shape: "Long full day, early start",
    bestFor: "Pilgrimage, giant surf and a walled medieval town",
    verdict:
      "Three very different places in one day. It works because the vehicle is yours — you decide how long each one gets.",
  },
  {
    tourId: "tomar-coimbra",
    destination: "Tomar & Coimbra",
    drive: "About 1 hour 30 minutes",
    distance: "87 miles (140 km)",
    shape: "Long full day, early start",
    bestFor: "Templar history and Portugal's oldest university",
    verdict:
      "The Convent of Christ at Tomar is one of the great buildings of Europe and sees a fraction of Sintra's visitors.",
  },
];

/** The three destinations Americans most often compare before booking. */
export const HEAD_TO_HEAD: readonly { title: string; body: string }[] = [
  {
    title: "Sintra vs Arrábida — which day trip from Lisbon should you take?",
    body: "Sintra is the famous one: palaces on a forested hill, forty minutes from Lisbon, and by mid-morning in summer it is the busiest place in the country. Arrábida is forty minutes in the other direction and almost nobody outside Portugal has heard of it: a limestone ridge dropping into green water, family wineries in Azeitão, a fishing town at the bottom. If it is your first trip to Portugal and you want the picture you have already seen, take Sintra and start early. If you would rather eat and drink well somewhere that still feels local, take Arrábida. Guests with two days usually do both, and almost always say Arrábida was the surprise.",
  },
  {
    title: "Sintra vs Évora — palaces or Roman Portugal?",
    body: "Évora is three times further inland — around 90 minutes each way — and that drive is the whole decision. What you get for it is a walled UNESCO town with a Roman temple in the middle of it, marble villages, cork oaks and Alentejo wine, all of it far quieter than the Lisbon coast. Sintra gives you more per mile; Évora gives you more per hour once you arrive. If you have three or more days around Lisbon, Évora is the one that makes the trip feel bigger than a city break.",
  },
  {
    title: "Is a day trip from Lisbon actually worth it?",
    body: "Yes, with one condition: the day has to be built around when places are empty rather than around a coach timetable. Portugal's distances are small — most of what people fly here to see sits within 90 minutes of Lisbon — so the limiting factor is never the driving, it is the queuing. That is the entire argument for a private day, and it is why we only run them that way.",
  },
];

/** Practical answers American travelers ask us before they book. */
export const US_TRAVELER_NOTES: readonly { q: string; a: string }[] = [
  {
    q: "How far in advance should we book from the US?",
    a: "For May to October, four to eight weeks is comfortable; July and August weekends go first. Outside those months a week or two is usually fine. Dates and prices are live on every Signature page, so you can see availability yourself before you commit.",
  },
  {
    q: "We land in Lisbon that morning — can we still do a day trip?",
    a: "We would not recommend it on the day you land from a US east-coast red-eye. Most guests arrive, sleep, and take their first day trip the following morning. If your schedule leaves no choice, tell us the flight and we will start later and shorten the day rather than rush it.",
  },
  {
    q: "Do we tip, and how much?",
    a: "Tipping is not expected in Portugal the way it is in the US. Guests who have had a good day often leave 5 to 10 percent for their host; nobody will think anything of it if you do not.",
  },
  {
    q: "Do we need to rent a car?",
    a: "Not for these days — the vehicle and the driver-host are part of the price, and Portuguese country roads plus European parking are the two things visiting Americans most often regret taking on.",
  },
  {
    q: "What does it cost, in dollars?",
    a: "Prices are set in euros and shown per person on each Signature page. Your card is charged in euros; your bank converts at the rate on the day, so we cannot publish a fixed dollar figure without it going stale.",
  },
  {
    q: "When is the best time of year to visit Lisbon?",
    a: "April to early June and mid-September to October: warm, long days, and far fewer people than July and August. Winter is mild and green, the wine cellars are at their best, and the coast is empty — just with a shorter day and a real chance of rain.",
  },
];
