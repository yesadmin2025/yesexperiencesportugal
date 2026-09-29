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
    q: "Do you organize team building across Portugal?",
    a: "Yes. We design private team-building experiences across Portugal, from cultural, gastronomic and hands-on programs to coastal activities, workshops, boats and regional experiences. Each program is adapted to the group's objectives, size and preferred pace.",
  },
  {
    q: "Can you plan corporate retreats and incentives?",
    a: "Yes. We coordinate single-day and multi-day corporate programs across Portugal, including transport, activities, venues, guides, group logistics and local hosting.",
  },
  {
    q: "What group sizes do you handle?",
    a: "From small executive and leadership teams to company-wide groups of 100+. Transport, venues, staffing, activity rotations and logistics are scaled to the brief.",
  },
  {
    q: "Do you work only in Lisbon and the surrounding region?",
    a: "No. We operate across Portugal. The route and program are selected according to the group, travel window, objectives and preferred style of experience.",
  },
  {
    q: "Can you create a fully customized corporate program?",
    a: "Yes. Every program can be shaped around the group's objectives, timings, budget, interests and operational requirements. We do not rely on one fixed team-building template.",
  },
];

export const PROPOSAL_FAQ: FaqItem[] = [
  {
    q: "Where in Portugal can we plan a proposal?",
    a: "The most requested settings are Sintra (Pena Palace terraces, Cabo da Roca cliffs at sunset), the Arrábida coast (a quiet cove reached by private boat), and rooftop tables in Lisbon at golden hour. We can shape the moment anywhere in Portugal that fits the story.",
  },
  {
    q: "How discreet is the planning?",
    a: "Discretion is part of the planning. You coordinate privately with our local team, and vendors, timing and logistics are confirmed with you ahead of the day, so surprise elements stay between you and us until the moment itself.",
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
    a: "Yes. Every YES wine day is private — your group only, with a dedicated English-speaking guide and driver. Pickup areas are listed on each experience page; you never share the day with strangers.",
  },
  {
    q: "How long does a Portugal wine tour take?",
    a: "Most private wine days run a full day of roughly 7 to 10 hours; Alentejo days run longer because of the drive. The number of wineries and whether lunch is included differ by experience, and each page lists exactly what is covered. Multi-day wine journeys are handled by our Travel Designer.",
  },
];

export const WINE_LISBON_FAQ: FaqItem[] = [
  {
    q: "How far is Arrábida from Lisbon?",
    a: "About 40 minutes across the 25 de Abril Bridge. The road climbs into cork-oak hills with the Atlantic visible below — a scenic short drive that keeps most of the day on the wine, not on the road.",
  },
  {
    q: "How many wineries do you visit in one day?",
    a: "Usually one or two, depending on the experience — the Arrábida Wine day includes two (up to four when tailored). We keep the pace unhurried, because a serious cellar visit needs time.",
  },
  {
    q: "Is lunch included in the Arrábida private wine tour?",
    a: "Yes, on the Arrábida Wine Signature: lunch is included alongside the tastings and private transport. On other wine days, such as Évora & Alentejo, lunch is at your own expense — each page states it clearly.",
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
      a: "It's our most-booked private wine tour from Lisbon — a full Arrábida day with two family wineries in Azeitão, the Livramento market in Setúbal, a long Portuguese lunch, and time in the Arrábida Natural Park. Tastings and lunch included, only your group, back by evening.",
    },
    {
      q: "How far is Arrábida from Lisbon?",
      a: "About 40 minutes across the 25 de Abril Bridge. The road climbs into cork-oak hills with the Atlantic below — the drive itself is part of the day, and you spend the rest on wine and coast, not on the road.",
    },
    {
      q: "Which wines will I taste on this Lisbon wine tour?",
      a: "Moscatel de Setúbal at a historic Azeitão cellar, and Castelão / Syrah / Fernão Pires reds at a second family estate. Every tasting is guided by someone who works with the wine, not a hostess reading from a script.",
    },
    {
      q: "Why Azeitão for a private wine tour from Lisbon?",
      a: "Azeitão sits between the Arrábida hills and the Setúbal estuary, so a single private day covers cellars, market and coast without long drives. The wineries here are family houses rather than visitor centres, which is why we build the day around them.",
    },
    {
      q: "Is the Arrábida wine day private to my group?",
      a: "Yes. The vehicle, the guide and the pace belong only to your group, so tastings, lunch and time in the Arrábida Natural Park follow how your day is going rather than a shared schedule.",
    },
  ],
  "azeitao-cheese": [
    {
      q: "Is this a good wine tasting near Lisbon?",
      a: "Yes. This full private day combines Livramento Market in Setúbal, a hands-on Azeitão cheese workshop with regional tastings, time in Azeitão village, a local winery visit and tasting, and Sesimbra by the sea. Lunch is at your own expense, so you choose the table. It suits guests who want food, wine and local craft in one unhurried day.",
    },
    {
      q: "How does this compare to the Arrábida private wine tour from Lisbon?",
      a: "They explore the same wider region but with a different focus. The Arrábida Wine Signature is wine-led; Azeitão Cheese & Wine gives the cheese workshop equal weight, then adds a winery tasting and Sesimbra context. Both are full private days rather than short tasting trips.",
    },
    {
      q: "Is the cheese-making workshop included?",
      a: "Yes. The hands-on Azeitão cheese workshop is part of the booked day, together with its listed tastings and accompaniments. You make the cheese with the producer rather than only watching a demonstration.",
    },
    {
      q: "Is a cellar tour and wine tasting included?",
      a: "Yes. A local winery visit and tasting are included, alongside the cheese workshop, private transport, pickup and drop-off, and the other inclusions shown on the tour page. Lunch is not included.",
    },
  ],
  "evora-alentejo": [
    {
      q: "Is this the best Alentejo wine tour from Lisbon?",
      a: "It's our most-requested Alentejo wine tour from Lisbon — a private day combining UNESCO Évora (Roman Temple, Chapel of Bones) with two selected Alentejo winery visits and tastings and a traditional cork production site. Lunch is at your own expense. Your group only, with private transport.",
    },
    {
      q: "How long is the drive to the Alentejo from Lisbon?",
      a: "About 90 minutes each way to Évora. The day is long — usually 9 to 11 hours door-to-door — but the pace inside it is unhurried: heritage in the morning, lunch (own expense) and two winery tastings after, with time to actually taste rather than tick boxes.",
    },
    {
      q: "Which Alentejo wines will I taste?",
      a: "The core Alentejo range across the two selected wineries — typically regional reds such as Aragonez, Trincadeira and Alicante Bouschet, with whites such as Antão Vaz or Arinto. Which two wineries run is confirmed with you based on availability.",
    },
  ],
  "roman-heritage-alentejo": [
    {
      q: "What makes this different from a standard Alentejo wine tour from Lisbon?",
      a: "It's built around vinho de talha — wine still fermented in clay amphorae, the way the Romans made it here two thousand years ago. A family talha winery, multiple talha wines with a traditional lunch included, and the Talha Wine Interpretation Center.",
    },
    {
      q: "Is this a private tour from Lisbon?",
      a: "Yes. Fully private, with pickup as listed on this page, a licensed local driver-guide, and only your group in the vehicle.",
    },
    {
      q: "Who is this wine tour best for?",
      a: "Wine travelers who want a quieter, deeper Alentejo day built around Roman heritage and wine still made in clay vessels.",
    },
  ],
};

/**
 * Per-tour overlays for the remaining Signatures, written for the questions
 * North American travelers actually type before booking a private day from
 * Lisbon: is it private, is hotel pickup included, how long is the day, does
 * it work from a cruise ship, is it good with kids. Every answer repeats only
 * facts already published on the tour page — no new inclusions, no invented
 * stops, no new pricing.
 */
export const DESTINATION_FAQ_BY_ID: Record<string, FaqItem[]> = {
  "sintra-cascais": [
    {
      q: "Is this a private Sintra day trip from Lisbon?",
      a: "Yes. It is a private full-day tour for your group only, with a certified guide and pickup and drop-off in Lisbon, Setúbal, Almada or Sesimbra included.",
    },
    {
      q: "How long is the Sintra and Cascais day tour?",
      a: "It is a full day, normally 8 to 10 hours door to door, at a relaxed pace with real time at each stop instead of a rushed checklist.",
    },
    {
      q: "Is Sintra and Cascais a good day trip for first-time visitors from the US?",
      a: "Yes. It pairs the Sintra hills with the Atlantic coast and Cascais in one private day, so you see the region without changing hotels, renting a car or using trains.",
    },
  ],
  "fatima-nazare-obidos": [
    {
      q: "Can I visit Fátima, Nazaré and Óbidos in one day from Lisbon?",
      a: "Yes. This is a private full-day tour covering all three, normally 8 to 9 hours door to door, with pickup as listed on this page. In Nazaré, the famous giant waves are a seasonal winter phenomenon; the cliffs and beach are striking all year.",
    },
    {
      q: "Is this Fátima tour private or a shared bus tour?",
      a: "Fully private. Only your group travels with your guide and driver — no shared coach, no other travelers, no fixed group departure time.",
    },
    {
      q: "Is this day suitable for older travelers?",
      a: "The pace is unhurried and the driving is broken up across three stops. Tell us about mobility needs when you book and we adjust the walking where the route allows.",
    },
  ],
  "tomar-coimbra": [
    {
      q: "Is Tomar and Coimbra doable as a day trip from Lisbon?",
      a: "Yes, as a private full-day tour — normally 8 to 9 hours door to door, with pickup as listed on this page. The Joanina Library runs on timed entry, so your visit time is set by the available slot on your date.",
    },
    {
      q: "Is this tour good for history lovers?",
      a: "It is built around Templar Tomar and university-city Coimbra, guided in English by someone who knows the history rather than reading a script.",
    },
  ],
  "troia-comporta": [
    {
      q: "Is there a private tour to Comporta from Lisbon?",
      a: "Yes. This is a private full-day tour to Tróia and Comporta, your group only, with pickup as listed on this page. Lunch is at your own expense.",
    },
    {
      q: "How long does the Comporta day from Lisbon take?",
      a: "A full day, usually 8 to 9 hours door to door, at a relaxed pace with time on the coast rather than a fast drive-by.",
    },
  ],
  "arrabida-boat": [
    {
      q: "Is the boat ride private on this Arrábida tour?",
      a: "The day is a private Signature for your group only, and the coastal boat ride along Arrábida is part of the booked day as shown in the inclusions on this page.",
    },
    {
      q: "Is hotel pickup included?",
      a: "Pickup is included within the areas listed on this page. If you are staying elsewhere, ask before booking and we confirm what is possible.",
    },
  ],
  "wild-beaches-picnic": [
    {
      q: "What are the best beaches near Lisbon to visit on a private day?",
      a: "This day follows the Arrábida and Sesimbra coast south of Lisbon — protected-park beaches and clear water about 40 minutes from the city, with a picnic included as listed on this page.",
    },
    {
      q: "Is this beach day private?",
      a: "Yes. Your group only, with a guide and private transport, pickup as listed on this page, and a full day of about 7½ hours at a relaxed pace.",
    },
  ],
  "p23-artisan-pottery-cork": [
    {
      q: "What happens on the Alentejo cork and pottery day?",
      a: "You work hands-on with cork alongside local makers, have lunch, then spend a three-hour afternoon pottery workshop at a ceramics and earth arts centre.",
    },
    {
      q: "What is included in the cork and pottery workshop tour?",
      a: "Private transport in an air-conditioned vehicle, a private local guide, both workshops, admission fees, lunch and bottled water are included.",
    },
  ],
  "tiles-workshop": [
    {
      q: "Where can I do a tile painting workshop near Lisbon?",
      a: "This private full day pairs a hands-on azulejo painting workshop in Azeitão with a selected winery tasting and time in Sesimbra. Your tile is fired and shipped to you, as listed in the inclusions.",
    },
    {
      q: "Is the tile workshop good for families?",
      a: "Yes. It is a hands-on activity that works well for couples and families up to 7 guests in one private vehicle, and everyone paints their own tile.",
    },
  ],
  "southwest-vicentine-coast": [
    {
      q: "Can I see the Vicentine Coast on a day trip from Lisbon?",
      a: "Yes, as a private long day. It runs longer than our standard Signatures because of the distance to the southwest coast, with pickup as listed on this page.",
    },
    {
      q: "Who is the Vicentine Coast day best for?",
      a: "Travelers who have already seen Sintra and Cascais and want wilder Atlantic cliffs and quieter villages, with only their own group in the vehicle.",
    },
  ],
};

/** Returns the FAQ set for a tour page — destination overlay (if any) + SIGNATURE_FAQ. */
export function getFaqForTour(tourId: string): FaqItem[] {
  const overlay = WINE_TOUR_FAQ_BY_ID[tourId] ?? DESTINATION_FAQ_BY_ID[tourId] ?? [];
  return [...overlay, ...SIGNATURE_FAQ];
}

export const SIGNATURE_FAQ: FaqItem[] = [
  {
    q: "Is this a private day tour from Lisbon?",
    a: "Yes. Every Signature is fully private — only your group and your guide. Pickup and drop-off are included within the areas listed on each experience page.",
  },
  {
    q: "Is hotel pickup included?",
    a: "Pickup is included within the areas listed on this page. If you are staying elsewhere, ask before booking and we confirm what is possible. Pickups outside this area can be arranged on request.",
  },
  {
    q: "How long does the day last?",
    a: "Most Signature days run a full day; the exact duration is shown on each page, at a relaxed pace with real time at each stop.",
  },
  {
    q: "How many people can join a private tour?",
    a: "Signatures are designed for couples, families and small private groups; the booking form shows the group sizes available. For larger private or company groups, use our Corporate & private groups page.",
  },
  {
    q: "What's included in the price?",
    a: "Each experience page lists exactly what is included and what is not. Some Signatures include lunch and tastings; others intentionally leave lunch and personal extras outside the price.",
  },
  {
    q: "Can I customize this Signature?",
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
    a: "Yes. Every Studio day is private — your group only, with a dedicated guide. Pickup details are shown before you pay.",
  },
  {
    q: "How accurate are the prices in the Studio?",
    a: "Prices update live as you adjust group size, pace and add-ons. The number you see at checkout is the number you pay — no hidden fees.",
  },
  {
    q: "What if I want help instead of designing it myself?",
    a: "You can switch to a Signature day for a ready-made route, or, for a multi-day journey across Portugal, work with our Travel Designer.",
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
