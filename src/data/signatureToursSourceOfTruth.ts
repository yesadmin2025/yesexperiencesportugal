/**
 * Signature Tours — Source of Truth (SoT).
 *
 * Hand-verified extract of each Signature tour's public Viator product page.
 * This file is the ONLY place Signature overview / highlights / included /
 * itinerary / real per-chapter timings should live once every tour is
 * populated. Nothing here may be invented — every field must be visible on
 * the linked Viator URL. See `docs/signature-source-of-truth.md`.
 *
 * Populate via /admin/sot-refresh — that page fetches the Viator page,
 * runs the extractor, and gives you a ready-to-paste TS block.
 *
 * Ranges (e.g. "8 to 9 hours"): use MIDPOINT for durationMinutes and for
 * chapter minute sums. This is the project-wide convention (approved 2026-07).
 */

export type SotItineraryChapter = {
  /** Position in the day (1-based). */
  order: number;
  /** Real stop / activity name — spelled as on Viator. */
  label: string;
  /** One faithful sentence from the Viator description. ≤ 220 chars. */
  description: string;
  /**
   * Real minutes spent AT this stop. `null` when Viator doesn't state a
   * duration — never guess. Studio then falls back to its own estimate
   * but visibly marks it as approximate.
   */
  durationMinutes: number | null;
  /**
   * Real minutes of driving/transit from THIS stop to the next.
   * `null` for the last chapter or when Viator doesn't state it.
   */
  travelToNextMinutes: number | null;
  /**
   * True when Viator marks the stop as "depending on option" / "optional" /
   * "subject to availability". These render as dashed timeline entries.
   */
  optional: boolean;
};

export type SignatureSourceOfTruth = {
  /** Internal Signature tour id (must exist in signatureTours.ts). */
  tourId: string;
  /** Full Viator product URL — canonical source. */
  viatorUrl: string;
  /** e.g. "P3", parsed from the URL. */
  productCode: string;

  /** Title as printed on Viator. */
  title: string;
  /** Duration text as printed on Viator, e.g. "8 to 9 hours". */
  durationText: string;
  /** Midpoint of durationText in minutes. E.g. "8 to 9 hours" → 510. */
  durationMinutes: number;

  /** Meeting / pickup window as printed on Viator (or `null` when omitted). */
  pickupWindow: string | null;
  /** Free-text pickup zone as printed on Viator. */
  pickupZone: string;

  /** "Private tour" | "Small group" | etc — verbatim. */
  groupType: string;
  /** Max group size when Viator states it explicitly. */
  maxGroup: number | null;

  /** 2–4 sentence overview drawn only from Viator page copy. */
  overview: string;

  /** Bullet highlights as printed on Viator ("Highlights" section). */
  highlights: string[];
  /** Verbatim "What's included" list. */
  included: string[];
  /** Verbatim "What's not included" list. */
  notIncluded: string[];
  /** Items Viator marks as varying by selected package/option. */
  variesByOption: string[];

  /** Ordered chapter list — real stops with real timings when available. */
  itinerary: SotItineraryChapter[];

  /** Cancellation policy sentence as printed on Viator. */
  cancellation: string | null;
  /** Language(s) the tour is offered in. */
  languages: string[];
  /** Meeting point description as printed on Viator. */
  meetingPoint: string | null;

  /** ISO date the entry was last verified against the live Viator page. */
  verifiedAt: string;
};

/**
 * Registry — populate one tour at a time via /admin/sot-refresh.
 *
 * Populated entries are the source of truth for /tours/$tourId,
 * /tours/$tourId.tailor and Studio v2 itinerary timings. Missing entries
 * cause callers to fall back to the legacy VIATOR_META + signatureTours
 * fields (safe, unchanged behaviour).
 */
export const SIGNATURE_SOURCE_OF_TRUTH: Partial<
  Record<string, SignatureSourceOfTruth>
> = {
  "arrabida-boat": {
    tourId: "arrabida-boat",
    viatorUrl: "https://www.viator.com/tours/Lisbon/Private-Full-Day-Arrabida-and-Sesimbra-with-Boat-Tour-from-Lisbon/d538-349639P12",
    productCode: "P12",
    title: "Private Tour from Lisbon – Arrábida, Sesimbra & Coastal Boat Ride",
    durationText: "6 to 8 hours (approx.)",
    durationMinutes: 420,
    pickupWindow: null,
    pickupZone: "Pickup and drop-off available anywhere in Lisbon, Almada, Sesimbra, or Setúbal including hotels, apartments, Airbnbs, the Port of Lisbon (cruise terminal), and Lisbon Airport.",
    groupType: "Private Tour",
    maxGroup: null,
    overview: "Leave Lisbon behind to explore the stunning beauty of southern Lisbon on this full-day private tour. Visit the world-renowned Mercado do Livramento in Setúbal and wind through the dramatic cliffs of Arrábida Natural Park. Enjoy a scenic coastal boat ride with flexible options including dolphin watching, snorkeling, or kayaking.",
    highlights: ["Visit the vibrant Livramento Market in Setúbal, one of the top fresh markets in the world","Wind through the dramatic landscapes of Arrábida Natural Park","Enjoy a scenic boat ride along the Arrábida coastline with multiple activity options","Explore the charming fishing village of Sesimbra and its historic castle","Take in the sweeping views from the spectacular cliffs of Cape Espichel"],
    included: ["Private transportation","Boat Tour (3 different options)","Private local tour guide","Lunch (when choosing the “Arrabida Discovery Boat Tour with Lunch”)","Private pick up and drop off anywhere in Lisbon, Setúbal, Sesimbra and Almada.","Bottled water","Air-conditioned vehicle"],
    notIncluded: ["Lunch","Personal expenses"],
    variesByOption: ["dolphin watching","snorkeling","kayaking","boat ride with an included lunch"],
    itinerary: [
      { order: 1, label: "Lisbon", description: "Pick up", durationMinutes: 10, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Mercado do Livramento", description: "One of the best fresh marketplaces in the world is located in Setúbal and is called Mercado do Livramento. Known for its lively ambiance and gorgeous azulejo tiles, it provides a wide selection of fresh fish and regional specialties.", durationMinutes: 45, travelToNextMinutes: null, optional: false },
      { order: 3, label: "Parque Natural da Arrabida", description: "A sanctuary of breathtaking scenery and abundant wildlife. Renowned for its verdant surroundings, undulating hills, and expansive vistas of the ocean, providing an ideal fusion of the natural world's splendor and peace.", durationMinutes: 60, travelToNextMinutes: null, optional: false },
      { order: 4, label: "Lapa de Santa Margarida", description: "A little-known jewel sea cave providing a rare fusion of spiritual peace and natural beauty. It has a small chapel devoted to Saint Margaret and offers breathtaking views of the Atlantic Ocean.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 5, label: "Castelo de Sesimbra", description: "An ancient fortification perched on a mountaintop above the settlement with expansive views. Dating to the ninth century, it has a magnificent chapel, old walls, and medieval architecture.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 6, label: "Cabo Espichel", description: "Spectacular coast close to Sesimbra famous for its breathtaking cliffs and historical significance. Features both a quaint lighthouse and the Sanctuary of Our Lady of the Cape. Discover old dinosaur footprints.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 7, label: "Sesimbra", description: "Charming fishing community on the Portuguese coast well-known for its exquisite beaches, mouthwatering seafood, and extensive maritime history. Sandwiched between the Atlantic Ocean and the Arrábida Natural Park.", durationMinutes: 240, travelToNextMinutes: null, optional: false }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English"],
    meetingPoint: null,
    verifiedAt: "2026-07-25",
  },
  "arrabida-wine-allinclusive": {
    tourId: "arrabida-wine-allinclusive",
    viatorUrl: "https://www.viator.com/tours/Lisbon/Private-Wine-Tour-with-Food-and-Wine-Tasting-in-Southern-Lisbon/d538-349639P3",
    productCode: "P3",
    title: "Private Setúbal & Arrábida Wine Tour: 3 Wineries, Lunch & Views",
    durationText: "7 to 9 hours",
    durationMinutes: 480,
    pickupWindow: null,
    pickupZone: "Lisbon, Almada, Sesimbra, or Setúbal. Airbnbs, cruise terminal, and Lisbon Airport included.",
    groupType: "Private",
    maxGroup: null,
    overview: "Indulge in a private journey through the Arrábida and Setúbal wine regions with visits to handpicked wineries. Explore the bustling Mercado do Livramento, witness traditional tile making at a local factory, and enjoy a Portuguese lunch. Along the way, take in panoramic views of the coastline and visit historic sites like Sesimbra Castle.",
    highlights: ["Visit a mix of prestigious producers and family estates for tastings","Taste local specialties and tuck into a traditional Portuguese lunch","Check off multiple locations without the hassle of organizing a route yourself","Flexible and personal experience with a private guide"],
    included: ["Visit 2 or 3 wineries (depending on the experience you choose)","Alcoholic Beverages","Snacks","Lunch (depending on the selected option)","Private transportation","Bottled water","Hotel pickup and drop-off","Local certified guide","Visit to Livramento Market and Tile Factory and Arrabida Natural Park","Optional stop at Christ the King or Sesimbra Castle"],
    notIncluded: [],
    variesByOption: ["Visit 2 or 3 wineries","Lunch at a local restaurant"],
    itinerary: [
      { order: 1, label: "Lisbon District", description: "Pick up from your location.", durationMinutes: 5, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Parque Natural da Arrabida", description: "Journey across the majestic mountains offering panoramic views of the coastline.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 3, label: "House & Museum José Maria Da Fonseca", description: "Uncover secrets behind renowned craftsmanship and indulge in a tasting experience.", durationMinutes: 45, travelToNextMinutes: null, optional: false },
      { order: 4, label: "Mercado do Livramento", description: "Explore one of the best fresh markets in the world, featuring local delicacies like fresh oysters.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 5, label: "Azeitao", description: "Lunch at a local restaurant and free time at the picturesque wine village.", durationMinutes: 60, travelToNextMinutes: null, optional: false },
      { order: 6, label: "Quinta do Piloto", description: "Dive into the world of winemaking with an immersive tour of vineyards and production facilities.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 7, label: "Adega Coop. de Palmela, C.R.L.", description: "Journey through historic vineyards and production facilities (optional stop).", durationMinutes: 30, travelToNextMinutes: null, optional: true },
      { order: 8, label: "Bacalhoa Vinhos de Portugal", description: "A modern winery tour featuring a CAPTIVATING blend of wine and art.", durationMinutes: 45, travelToNextMinutes: null, optional: false },
      { order: 9, label: "Azulejos de Azeitao", description: "Witness skilled artisans handcrafting tiles with centuries-old craftsmanship.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 10, label: "Farm Catralvos", description: "Wander through vineyards and witness the process from labeling to bottling.", durationMinutes: 45, travelToNextMinutes: null, optional: false },
      { order: 11, label: "Santuario Nacional de Cristo Rei", description: "Marvel at panoramic vistas of Lisbon from this monumental symbol of faith.", durationMinutes: 15, travelToNextMinutes: null, optional: true },
      { order: 12, label: "Castelo de Sesimbra", description: "Explore the ancient walls of the last medieval castle still standing by the sea.", durationMinutes: 15, travelToNextMinutes: null, optional: true }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English"],
    meetingPoint: "Hard Rock Cafe Lisbon (for small group option)",
    verifiedAt: "2026-07-25",
  },
  "azeitao-cheese": {
    tourId: "azeitao-cheese",
    viatorUrl: "https://www.viator.com/tours/Lisbon/Azeitao-Cheese-Private-Workshop-with-Wine-and-Food-Tasting/d538-349639P9",
    productCode: "P9",
    title: "Private Azeitão Cheese Workshop: Wine & Sesimbra Coastal Tour",
    durationText: "8 hours 30 minutes",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone: "Private Pick Up and Drop Off anywhere in Lisbon, Almada, Setúbal and Sesimbra. Extra charge for Tróia and Comporta.",
    groupType: "Private",
    maxGroup: null,
    overview: "Explore beyond Lisbon city limits on this private day tour featuring multiple Portuguese culinary and cultural experiences. Visit the top-ranked Mercado do Livramento in Setúbal, drive through Arrábida Natural Park, and participate in a hands-on cheese workshop in Azeitão. Cap off the journey with a winery tasting and a visit to the medieval Sesimbra Castle.",
    highlights: ["Enjoy the most personalized way to explore on this private day tour","Try local produce, visit a winery, and make cheese on this multi-part tour","Round-trip transit from your Lisbon hotel makes getting around hassle-free","This tour is great for food lovers who want to get off the tourist trail"],
    included: ["Air-conditioned vehicle","Private transportation","All Fees and Taxes","Private Azeitão cheese workshop","Toasts, regional bread, fresh cheese, buttery Azeitão cheese, homemade jam/chutney and muscat wine","Bottled water","Private Pick Up and Drop Off anywhere in Lisbon, Almada, Setúbal and Sesimbra","Winery entrances and tastings"],
    notIncluded: ["Lunch"],
    variesByOption: [],
    itinerary: [
      { order: 1, label: "Mercado do Livramento", description: "One of the Best Fresh Markets in the Word according to “USA Today”. Livramento Market is a vibrant and bustling food market located in Setúbal, Portugal.", durationMinutes: 90, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Quinta Velha", description: "This private workshop delves into a collective story, aiming to revive the tradition of knowledge transmission once held by elders like Ti Alfredo, the esteemed figure in Azeitão cheese making.", durationMinutes: 90, travelToNextMinutes: null, optional: false },
      { order: 3, label: "Azeitao", description: "Lunch and free time. Azeitão is a charming village located in the Setúbal district of Portugal known for its picturesque landscapes and delicious local cuisine.", durationMinutes: 90, travelToNextMinutes: null, optional: false },
      { order: 4, label: "Farm Catralvos", description: "Wine tour and 5 glasses of wine. Quinta de Catralvos is a renowned winery situated in Azeitão, Portugal.", durationMinutes: 120, travelToNextMinutes: null, optional: false },
      { order: 5, label: "Castelo de Sesimbra", description: "The last Medieval Castle that is still standing by the sea in Portugal. Sesimbra Castle is a historic fortress perched on a hilltop overlooking the town of Sesimbra via the coastline.", durationMinutes: 120, travelToNextMinutes: null, optional: false }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English"],
    meetingPoint: null,
    verifiedAt: "2026-07-25",
  },
  "evora-alentejo": {
    tourId: "evora-alentejo",
    viatorUrl: "https://www.viator.com/tours/Lisbon/Private-Full-Day-Wine-Tour-in-Setubal-Region-from-Lisbon/d538-349639P6",
    productCode: "P6",
    title: "Private Evora & Alentejo Wine Tour from Lisbon - Cork & Flavors",
    durationText: "9 to 11 hours (approx.)",
    durationMinutes: 600,
    pickupWindow: null,
    pickupZone: "Pickup and drop-off available anywhere in Lisbon, Almada, Sesimbra, or Setúbal. We collect from hotels, apartments, Airbnbs, the Port of Lisbon (cruise terminal), and Lisbon Airport.",
    groupType: "Private Tour",
    maxGroup: null,
    overview: "Skip the rental cars and book a private day trip from Lisbon to Évora, the capital of Alentejo. Visit local wineries for guided tastings and explore city highlights, including the Roman temple and the eerie Chapel of Bones. Learn about traditional Portuguese cork production at a local site.",
    highlights: ["Avoid cramped coach buses and travel in a private vehicle","Choose two wineries from the list below to enjoy tastings","Includes convenient door-to-door transfers from your hotel","Enjoy a flexible and personalized experience on a private tour"],
    included: ["Private pick-up and drop-off at your accommodation","Dedicated local guide/host for a personalized and flexible experience","All entrance fees included (including the iconic Chapel of Bones and Évora city visits)","Guided visits and wine tastings at two carefully selected wineries","Traditional tastings of local cheeses and cured meats","Visit a traditional cork production site, showcasing Portugal as the world’s leading cork producer","Bottled water throughout the day"],
    notIncluded: ["Lunch"],
    variesByOption: [],
    itinerary: [
      { order: 1, label: "Ponte 25 de Abril", description: "For traveleres coming from Lisbon. The Portuguese Golden Gate, overlooking Lisbon and Tagus River.", durationMinutes: null, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Joao Portugal Ramos Wines", description: "One of the Winery options on the itinerary. The winery embraces a modern approach to winemaking while respecting and honoring traditional winemaking techniques. Admission Ticket Included.", durationMinutes: 90, travelToNextMinutes: null, optional: true },
      { order: 3, label: "Enoturismo Cartuxa", description: "One of the options on the itinerary. Excellence, quality, and individuality in a style of its own are the values recognized by consumers of the Cartuxa brand. Admission Ticket Included.", durationMinutes: 90, travelToNextMinutes: null, optional: true },
      { order: 4, label: "Pera-grave - Qta S. Jose De Peramanca", description: "One of the Winery options on the itinerary. The winery has a long history, with its origins dating back to the 16th century. Today, it is considered one of the most prestigious wineries in Portugal. Admission Ticket Included.", durationMinutes: 90, travelToNextMinutes: null, optional: true },
      { order: 5, label: "Ervideira", description: "One of the Winery options on the itinerary. Ervideira is one of the secular wine companies in Portugal, dedicated to producing wine since 1880. Admission Ticket Included.", durationMinutes: 90, travelToNextMinutes: null, optional: true },
      { order: 6, label: "Herdade do Esporao", description: "One of the winery options. The vines are located in the heart of Reguengos de Monsaraz, where wines are more balanced and seductive. Admission Ticket Included.", durationMinutes: 120, travelToNextMinutes: null, optional: true },
      { order: 7, label: "Chapel of Bones", description: "The Chapel of Bones is a unique and intriguing attractions, known for its macabre interior decoration, built in the 16th century by Franciscan monks. Admission Ticket Included.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 8, label: "Evora", description: "Évora is a UNESCO World Heritage site. The city dates back to Roman times and is full of ancient ruins and narrow streets lined with beautiful whitewashed houses. Admission Ticket Free.", durationMinutes: 60, travelToNextMinutes: null, optional: false },
      { order: 9, label: "Templo Romano de Evora (Templo de Diana)", description: "Also popularly known as Templo de Diana, it was probably a place of worship to the Roman emperor. This pagan monument of imposing proportions was built in the beginning of the 1st century AD. Admission Ticket Included.", durationMinutes: 10, travelToNextMinutes: null, optional: false },
      { order: 10, label: "Corticarte - Arte em Cortica", description: "Visit a cork factory with a visit through the preparation process and explanations, from cork harvesting, quality selection and final products. Admission Ticket Included.", durationMinutes: 30, travelToNextMinutes: null, optional: false }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English","Portuguese","Spanish"],
    meetingPoint: null,
    verifiedAt: "2026-07-25",
  },
  "fatima-nazare-obidos": {
    tourId: "fatima-nazare-obidos",
    viatorUrl: "https://www.viator.com/tours/Lisbon/Private-Full-day-Fatima-Nazare-Obidos-Tour-from-Lisbon/d538-349639P5",
    productCode: "P5",
    title: "Private Lisbon to Fátima, Nazaré & Óbidos Tour – Spirit & Charm",
    durationText: "8 to 9 hours (approx.)",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone: "Private pickup and drop off anywhere in Lisbon, Setubal, Sesimbra and Almada.",
    groupType: "Private tour",
    maxGroup: null,
    overview: "Maximize your time in Portugal with this private, full-day excursion to Fatima, Nazare, and Obidos from Lisbon. Leave the driving and logistics to a professional while you explore religious landmarks, fishing villages, and medieval walls. This three-in-one trip includes a pastry and a traditional ginjinha liqueur tasting.",
    highlights: ["This three-in-one trip is ideal for time-pressed Lisbon visitors","Explore Fatima, Nazare, and Obidos all in one day","Enjoy insights and stories from your ceertified guide","Private roundtrip transportation, pastry, and liqueur tasting is included"],
    included: ["All Fees and Taxes","Air-conditioned vehicle","Private transportation","Alcoholic Beverages","Ginginha tasting","Certified tour guide","Private pickup and drop off","Bottled water","Local pastry"],
    notIncluded: ["Lunch"],
    variesByOption: [],
    itinerary: [
      { order: 1, label: "Lisbon", description: "Pick up", durationMinutes: 10, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Fatima", description: "Visit the Sanctuary of Our Lady of Fatima. Explore the Basilica of Our Lady of the Rosary and the Chapel of the Apparitions. Take some time for personal reflection and perhaps attend a mass or service if you wish.", durationMinutes: 120, travelToNextMinutes: null, optional: false },
      { order: 3, label: "Nazare", description: "Visit Nazaré Beach and witness the breathtaking views from the Sitio da Nazaré viewpoint. Explore the town's streets, shops, and restaurants. Enjoy a traditional Portuguese lunch (1 hour).", durationMinutes: 120, travelToNextMinutes: null, optional: false },
      { order: 4, label: "Obidos", description: "Wander through the picturesque medieval streets, enclosed by the castle walls. Don't miss the chance to try \"ginjinha,\" a traditional Portuguese cherry liqueur, served in chocolate cups.", durationMinutes: 90, travelToNextMinutes: null, optional: false },
      { order: 5, label: "Praia da Nazare", description: "Visit Nazaré beach.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 6, label: "Castelo de Obidos", description: "Obidos' castle dates back to Portugal’s Roman occupation, but its current layout is Moorish. The main towers were built in 1375, and in addition to its military function, it also served as a royal palace.", durationMinutes: 60, travelToNextMinutes: null, optional: false }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English","Portuguese","Spanish"],
    meetingPoint: null,
    verifiedAt: "2026-07-25",
  },
  "roman-heritage-alentejo": {
    tourId: "roman-heritage-alentejo",
    viatorUrl: "https://www.viator.com/tours/Lisbon/Exclusive-Roman-Wine-Tour-from-Lisbon-Hidden-Alentejo-and-Flavors/d538-349639P17",
    productCode: "P17",
    title: "Roman Talha Wine Tour: A Private Taste of Alentejo Family Secrets",
    durationText: "8 to 9 hours (approx.)",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone: "Guide will meet client at their accommodation at the booked time",
    groupType: "Private",
    maxGroup: null,
    overview: "Experience a private taste of Alentejo family secrets on this Roman Talha wine tour. Visit the Roman ruins of São Cucufate and the Talha Wine Interpretation Center. Enjoy a local guided experience at a family-run winery featuring traditional Alentejo lunch and Roman-style wine tasting.",
    highlights: ["Private pickup and drop-off","Visit to Roman ruins of São Cucufate (Vila de Frades)","Visit to Talha Wine Interpretation Center","Local Guided experience at a family-run winery","Roman-style wine tasting (multiple wines)","Traditional Alentejo lunch at the winery","Bottled water","Local guide / host throughout the day"],
    included: ["Air-conditioned vehicle","Private pickup and drop-off","Visit to Roman ruins of São Cucufate (Vila de Frades)","Visit to Talha Wine Interpretation Center","Local Guided experience at a family-run winery","Alcoholic Beverages","Roman-style wine tasting (multiple wines)","Lunch","Traditional Alentejo lunch at the winery","Bottled water","Local guide / host throughout the day"],
    notIncluded: [],
    variesByOption: [],
    itinerary: [
      { order: 1, label: "Lisbon", description: "Guide will meet client at their accommodation at the booked time.", durationMinutes: 10, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Villa Romana de Sao Cucufate", description: "Visit the ancient Roman ruins located in Vila de Frades. Admission ticket included.", durationMinutes: 60, travelToNextMinutes: null, optional: false },
      { order: 3, label: "Vila Alva", description: "A stop in the village of Vila Alva. Admission ticket free.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 4, label: "Adega do Mestre Daniel - XXVI Talhas", description: "Enjoy a 3-hour local guided experience at this family-run winery including wine tasting and lunch. Admission ticket included.", durationMinutes: 180, travelToNextMinutes: null, optional: false },
      { order: 5, label: "Albergaria dos Fusos", description: "A stop in Albergaria dos Fusos. Admission ticket free.", durationMinutes: 60, travelToNextMinutes: null, optional: false },
      { order: 6, label: "Centro Interpretativo do Vinho de Talha", description: "Explore the Talha Wine Interpretation Center. Admission ticket included.", durationMinutes: 60, travelToNextMinutes: null, optional: false }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English"],
    meetingPoint: null,
    verifiedAt: "2026-07-25",
  },
  "sintra-cascais": {
    tourId: "sintra-cascais",
    viatorUrl: "https://www.viator.com/tours/Lisbon/Sintra-and-Cascais-Hidden-Gems-Private-Tour-with-Wine-Tasting/d538-349639P10",
    productCode: "P10",
    title: "Private Sintra & Cascais Tour from Lisbon – Hidden Gems & Wine",
    durationText: "8 to 10 hours",
    durationMinutes: 540,
    pickupWindow: null,
    pickupZone: "Pickup and drop-off available anywhere in Lisbon, Almada, Sesimbra, or Setúbal. We collect from hotels, apartments, Airbnbs, the Port of Lisbon (cruise terminal), and Lisbon Airport.",
    groupType: "Private tour/activity",
    maxGroup: null,
    overview: "Discover the cultural gems and coastal charm of Sintra and Cascais on this customizable private tour from Lisbon. Explore palaces, sip local wines, and enjoy scenic stops along Portugal’s scenic western coast. This flexible experience includes expert local guidance and round-trip transport from Lisbon, Setúbal, Almada, or Sesimbra.",
    highlights: ["Private full-day tour combining history, wine, and coastal views","Flexible itinerary with expert local guide to skip crowds","Includes choice of palace visits and wine tasting at regional winery","Enjoy seamless private transport with convenient pick-up and drop-off"],
    included: ["Private transportation","Air-conditioned vehicle","One palace ticket and wine tour and tasting OR two palace tickets per person","Bottled water","Certified tour guide","Private pick up and drop off anywhere in Lisbon, Setúbal, Almada and Sesimbra","Local pastry"],
    notIncluded: ["Lunch"],
    variesByOption: ["One palace ticket and wine tour and tasting OR two palace tickets per person"],
    itinerary: [
      { order: 1, label: "Sintra", description: "Sintra, a UNESCO World Heritage Site, is a magical town nestled in the lush hills of Portugal. Known for its fairytale-like palaces, enchanting gardens, and mystical atmosphere.", durationMinutes: 60, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Sintra National Palace", description: "One of the options on the itinerary: The Palácio Nacional de Sintra, or Sintra National Palace, is a captivating blend of Moorish and Gothic architecture nestled in the heart of Sintra, Portugal.", durationMinutes: 90, travelToNextMinutes: null, optional: true },
      { order: 3, label: "Park and National Palace of Pena", description: "One of the options on the itinerary: Perched atop the verdant hills of Sintra, Pena Palace is a vibrant and whimsical masterpiece of 19th-century Romantic architecture.", durationMinutes: 90, travelToNextMinutes: null, optional: true },
      { order: 4, label: "Azenhas do Mar", description: "Lunch break and free time. Azenhas do Mar is a picturesque coastal village nestled along the cliffs of Portugal's Atlantic coast. ", durationMinutes: 90, travelToNextMinutes: null, optional: false },
      { order: 5, label: "Quinta da Regaleira", description: "One of the options on the itinerary: Quinta da Regaleira is a mesmerizing estate located in Sintra, Portugal, renowned for its enchanting gardens, mysterious tunnels, and Gothic architecture.", durationMinutes: 90, travelToNextMinutes: null, optional: true },
      { order: 6, label: "Adega Regional de Colares", description: "Adega de Colares is a historic winery nestled in the Colares region of Portugal, renowned for its unique vineyards planted in sandy soils near the Atlantic coast.", durationMinutes: 90, travelToNextMinutes: null, optional: false },
      { order: 7, label: "Cascais", description: "Cascais is a charming coastal town located just a short drive from Lisbon, Portugal. Known for its sandy beaches, picturesque harbor, and vibrant atmosphere.", durationMinutes: 45, travelToNextMinutes: null, optional: false },
      { order: 8, label: "Cabo Da Roca", description: "Cabo da Roca is a rugged headland located on the western coast of Portugal, marking the westernmost point of mainland Europe. 30 minutes. Admission Ticket Included.", durationMinutes: 30, travelToNextMinutes: null, optional: false }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English"],
    meetingPoint: null,
    verifiedAt: "2026-07-25",
  },
  "southwest-vicentine-coast": {
    tourId: "southwest-vicentine-coast",
    viatorUrl: "https://www.viator.com/tours/Lisbon/Exclusive-Southwest-Coast-Experience-Undiscovered-Hidden-Secret/d538-349639P16",
    productCode: "P16",
    title: "Lisbon: Private Southwest Vicentine Coast Tour - Secret Paradise",
    durationText: "9 to 10 hours (approx.)",
    durationMinutes: 570,
    pickupWindow: null,
    pickupZone: "The guide will contact before the tour date to arrange pickup and special requests.",
    groupType: "Private tour/activity. Only your group will participate",
    maxGroup: null,
    overview: "Discover Portugal’s wild Southwest Coast, a hidden Atlantic paradise between Alentejo and Algarve. This experience takes you to whitewashed villages, dramatic cliffs, and untouched landscapes like Porto Covo, Vila Nova de Milfontes, and Odeceixe. Explore protected natural scenery where the river meets the sea and discover historical Moorish roots in Aljezur.",
    highlights: ["Discover Portugal’s wild Southwest Coast, a hidden Atlantic paradise.","Explore the whitewashed coastal village of Porto Covo.","Visit Vila Nova de Milfontes where the Mira River meets the Atlantic Ocean.","Cross the Southwest Alentejo and Vicentine Coast Natural Park.","Experience Odeceixe, where the river naturally separates Alentejo from Algarve.","Discover the historical depth and Moorish roots of Aljezur."],
    included: ["Air-conditioned vehicle","Private transportation with a local guide","Private pickup and drop-off","Entrance fee - All entrances and transportation fees","Bottled water","Private and personalized itinerary"],
    notIncluded: ["Meals"],
    variesByOption: [],
    itinerary: [
      { order: 1, label: "Lisbon(Pass By)", description: "Pick up and drop off", durationMinutes: null, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Ilha do Pessegueiro", description: "The route continues along the coast towards the Ilha do Pessegueiro area, one of the most iconic coastal views near Porto Covo. This area has traces of ancient occupation and later coastal defence structures.", durationMinutes: 25, travelToNextMinutes: null, optional: false },
      { order: 3, label: "Porto Covo", description: "Porto Covo is a small whitewashed coastal village where Portugal still feels closely connected to the Atlantic. This stop introduces the wild character of the Southwest Coast, with dramatic cliffs and small coves.", durationMinutes: 45, travelToNextMinutes: null, optional: false },
      { order: 4, label: "Vila Nova de Milfontes", description: "Located where the Mira River meets the Atlantic Ocean, Vila Nova de Milfontes offers calmer waters, whitewashed streets, and river views. This is the ideal place to pause for lunch.", durationMinutes: 90, travelToNextMinutes: null, optional: false },
      { order: 5, label: "Parque Natural do Sudoeste Alentejano e Costa Vicentina", description: "This route crosses one of Portugal’s most protected coastal regions, where development remains limited and the landscape still feels wild, open and untouched.", durationMinutes: 60, travelToNextMinutes: null, optional: false },
      { order: 6, label: "Odeceixe", description: "The main highlight of the day. Here, the Rio Seixe meets the Atlantic Ocean, creating two different environments side by side: a calm river beach and a wild ocean beach. This is also a natural border between Alentejo and Algarve.", durationMinutes: 90, travelToNextMinutes: null, optional: false },
      { order: 7, label: "Aljezur", description: "Aljezur adds historical depth to the day. This historic town has strong Moorish roots and is overlooked by the ruins of its hilltop castle.", durationMinutes: 60, travelToNextMinutes: null, optional: false }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English","Portuguese","Spanish"],
    meetingPoint: null,
    verifiedAt: "2026-07-25",
  },
  "tiles-workshop": {
    tourId: "tiles-workshop",
    viatorUrl: "https://www.viator.com/tours/Lisbon/Full-Day-Golf-and-Wine-tasting-Private-Tour-in-South-Lisbon/d538-349639P4",
    productCode: "P4",
    title: "Tile Painting, Wine & Coastal Sesimbra Private Tour from Lisbon",
    durationText: "8 to 9 hours",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone: "Pickup and drop-off available anywhere in Lisbon, Almada, Sesimbra, or Setúbal. We collect from hotels, apartments, Airbnbs, the Port of Lisbon (cruise terminal), and Lisbon Airport.",
    groupType: "Private Tour",
    maxGroup: null,
    overview: "Go beyond traditional sightseeing and immerse yourself in Portuguese tradition south of Lisbon. Learn about traditional “azulejos” and create your own ceramic tile as a souvenir. Visit the seaside village of Sesimbra and cap off the day at a local vineyard for a guided wine tasting.",
    highlights: ["Visit several towns in the Setubal region without renting a car","Stop at the Christ the King Monument for stunning views of Lisbon","Learn about Portuguese history and traditions from your guide","Enjoy a flexible and personalized experience on a private tour"],
    included: ["Private transportation","Bottled water","Certified tour guide","Air-conditioned vehicle","Alcoholic Beverages","Tiles Making Workshop and Tile Shipping","All entrances","Cheese tasting"],
    notIncluded: ["Lunch"],
    variesByOption: [],
    itinerary: [
      { order: 1, label: "Lisbon (Pass By)", description: "Pick up", durationMinutes: null, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Mercado do Livramento", description: "Experience the vibrant Mercado do Livramento in Setúbal, hailed as one of the Best Fresh Markets in the World by USA Today. Explore local culinary traditions from vegetables and fruits to freshly caught fish and seafood.", durationMinutes: 15, travelToNextMinutes: null, optional: false },
      { order: 3, label: "Castelo de Sesimbra", description: "Nestled atop a windswept hill, Sesimbra Castle dated back the 9th century. Within its walls lies the castle's church adorned with over 10,000 Portuguese tiles dating back to the 16th century.", durationMinutes: 20, travelToNextMinutes: null, optional: false },
      { order: 4, label: "Azulejos de Azeitao", description: "Embark on a private tiles painting workshop where you'll delve into the artistry and heritage of tile making. Under the guidance of skilled artisans, unleash your creativity and craft your own ceramic tile masterpiece.", durationMinutes: 120, travelToNextMinutes: null, optional: false },
      { order: 5, label: "Sesimbra", description: "Experience the charm of Sesimbra, a picturesque fishing town nestled at the foothills of the Serra da Arrábida mountain range. Wander through historic streets and soak in the vibrant culture.", durationMinutes: 90, travelToNextMinutes: null, optional: false },
      { order: 6, label: "Jose Maria de Fonseca", description: "One of the Winery Options.", durationMinutes: 90, travelToNextMinutes: null, optional: true },
      { order: 7, label: "Farm Catralvos", description: "Embark on a journey through the traditions of Portugal's winemaking heritage with a guided tour through the vineyards and winery at Quinta de Catralvos.", durationMinutes: 90, travelToNextMinutes: null, optional: true },
      { order: 8, label: "Bacalhoa Vinhos de Portugal", description: "One of the Winery Options.", durationMinutes: 90, travelToNextMinutes: null, optional: true },
      { order: 9, label: "Santuario Nacional de Cristo Rei", description: "Experience a moment of awe at Cristo Rei, one of Portugal's most iconic landmarks. Towering over the Tagus River, this magnificent statue of Christ offers panoramic views of Lisbon and beyond.", durationMinutes: 20, travelToNextMinutes: null, optional: false }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English"],
    meetingPoint: null,
    verifiedAt: "2026-07-25",
  },
  "tomar-coimbra": {
    tourId: "tomar-coimbra",
    viatorUrl: "https://www.viator.com/tours/Lisbon/From-Lisbon-Private-Full-Day-Tour-to-Tomar-and-Coimbra/d538-349639P8",
    productCode: "P8",
    title: "Private Tomar & Coimbra Tour from Lisbon – Templars & Scholars",
    durationText: "8 to 9 hours",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone: "Pickup and drop-off available anywhere in Lisbon, Almada, Sesimbra, or Setúbal. We collect from hotels, apartments, Airbnbs, the Port of Lisbon (cruise terminal), and Lisbon Airport.",
    groupType: "Private tour/activity",
    maxGroup: null,
    overview: "Discover Portugal’s historic heartlands on this private full‑day tour to Tomar, home to the medieval Templar fortress, and the scholarly city of Coimbra. With a dedicated driver and guide, enjoy a relaxed pace and a seamless route through two of Portugal’s most culturally significant cities. Dive deep beyond the guidebooks into Portuguese history and architecture.",
    highlights: ["Visit historic Tomar’s Templar heritage and Coimbra’s university city in one efficient day","Enjoy private transport and flexible schedule all day","Dive deep beyond the guidebooks into Portuguese history and architecture","Learn about the history and heritage without the crowds or rush"],
    included: ["All Fees and Taxes","Private transportation","Air-conditioned vehicle","All entrances and tickets","Certified Tour Guide","Bottled water","Local pastry"],
    notIncluded: ["Lunch"],
    variesByOption: [],
    itinerary: [
      { order: 1, label: "Lisbon", description: "Pick up", durationMinutes: 10, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Convento de Cristo", description: "Originally built as a Templar stronghold in the 12th century, it later became the headquarters of the Knights Templar in Portugal. The complex includes the iconic Templar Castle and the Charola, a remarkable round church.", durationMinutes: 90, travelToNextMinutes: null, optional: false },
      { order: 3, label: "Coimbra", description: "Coimbra, situated in central Portugal, is a city steeped in history and academic prestige. Home to one of Europe's oldest universities, the University of Coimbra, the city exudes a vibrant student atmosphere.", durationMinutes: 120, travelToNextMinutes: null, optional: false },
      { order: 4, label: "Universita Di Coimbra", description: "Coimbra University, perched majestically atop a hill overlooking the Mondego River in central Portugal, is one of the oldest and most prestigious universities in Europe. Founded in 1290, it is a UNESCO World Heritage site.", durationMinutes: 105, travelToNextMinutes: null, optional: false },
      { order: 5, label: "Biblioteca Joanina", description: "Built in the Baroque style in the 18th century, the library houses a remarkable collection of rare manuscripts, ancient books, and scholarly treasures. It features a colony of bats that help preserve the delicate books.", durationMinutes: 90, travelToNextMinutes: null, optional: false },
      { order: 6, label: "Tomar", description: "Tomar is a historic town located in central Portugal, known for its rich cultural heritage and historical significance. At the heart of Tomar stands the Convent of Christ, a UNESCO World Heritage site.", durationMinutes: 120, travelToNextMinutes: null, optional: false }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English"],
    meetingPoint: null,
    verifiedAt: "2026-07-25",
  },
  "troia-comporta": {
    tourId: "troia-comporta",
    viatorUrl: "https://www.viator.com/tours/Lisbon/Private-Troia-and-Comporta-Tour-from-Lisbon-Ruins-Wine-and-Coast/d538-349639P18",
    productCode: "P18",
    title: "Private Troia & Comporta Tour from Lisbon - Ruins, Wine & Beaches",
    durationText: "8 to 9 hours",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone: "Pickup and drop-off available anywhere in Lisbon, Almada, Sesimbra, or Setúbal. We collect from hotels, apartments, Airbnbs, the Port of Lisbon (cruise terminal), and Lisbon Airport.",
    groupType: "Private Tour",
    maxGroup: null,
    overview: "Escape into one of Portugal’s best-kept secrets, a discreet retreat favored by artists blendering history, wine, and raw nature. Explore ancient Roman ruins, visit the authentic Carrasqueira Palafitic Pier, and savor local wines at Herdade da Comporta. This private, personalized experience is designed for travelers seeking refined authenticity difficult to find without local knowledge.",
    highlights: ["Private transportation in air-conditioned vehicle","Exclusive private experience with a local expert guide","Ferry crossing across the Sado River (vehicle + passengers included)","Guided visit to the Roman Ruins of Tróia (admission included)","Wine experience at Herdade da Comporta (tasting included)","Bottled water throughout the day","Flexible itinerary with scenic stops and hidden gems along the coast","Pickup and drop-off at your accommodation (Lisbon, Setúbal, Sesimbra or Almada)"],
    included: ["Private transportation in air-conditioned vehicle","Exclusive private experience with a local expert guide","Ferry crossing across the Sado River (vehicle + passengers included)","Guided visit to the Roman Ruins of Tróia (admission included)","Wine experience at Herdade da Comporta (tasting included)","Bottled water throughout the day","Flexible itinerary with scenic stops and hidden gems along the coast","Personalized recommendations for restaurants and local experiences","Pickup and drop-off at your accommodation (Lisbon, Setúbal, Sesimbra or Almada)"],
    notIncluded: ["Lunch (we provide curated restaurant recommendations based on your preferences)"],
    variesByOption: [],
    itinerary: [
      { order: 1, label: "Lisbon", description: "Pick up from your accommodation in Lisbon, Almada, Sesimbra, or Setúbal.", durationMinutes: 5, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Baia de Setubal", description: "Your journey begins with a scenic ferry crossing over the Sado River. Keep your eyes open: dolphins are sometimes seen in these waters.", durationMinutes: 15, travelToNextMinutes: null, optional: false },
      { order: 3, label: "Roman Ruins of Troia", description: "Step into over 2,000 years of history at one of Portugal’s most fascinating archaeological sites. Explore ancient fish-salting tanks, baths and structures.", durationMinutes: 45, travelToNextMinutes: null, optional: false },
      { order: 4, label: "Marina de Troia", description: "A brief stop to experience the contrast between ancient and modern Tróia where sleek architecture meets natural surroundings.", durationMinutes: 15, travelToNextMinutes: null, optional: false },
      { order: 5, label: "Cais Palafitico do Porto da Carrasqueira", description: "This traditional wooden fishing pier, built on stilts, is still used today by local fishermen and reflects a way of life unchanged for generations.", durationMinutes: 20, travelToNextMinutes: null, optional: false },
      { order: 6, label: "Comporta", description: "Arrive in Comporta, known for relaxed sophistication and natural elegance. Enjoy free time for lunch with curated restaurant recommendations.", durationMinutes: 95, travelToNextMinutes: null, optional: false },
      { order: 7, label: "Herdade Da Comporta", description: "Learn about the unique characteristics of Comporta wines, shaped by sandy soils and Atlantic influence. Enjoy a guided tasting of selected wines.", durationMinutes: 95, travelToNextMinutes: null, optional: false },
      { order: 8, label: "Praia do Carvalhal", description: "Another stunning coastal stop, known for its natural beauty and relaxed atmosphere. Perfect for photos or a short walk.", durationMinutes: 15, travelToNextMinutes: null, optional: false },
      { order: 9, label: "Comporta Beach", description: "If conditions allow, stop at one of Comporta’s famous wild beaches. Endless sand, untouched dunes and the Atlantic breeze.", durationMinutes: 15, travelToNextMinutes: null, optional: true }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English"],
    meetingPoint: null,
    verifiedAt: "2026-07-25",
  },
  "wild-beaches-picnic": {
    tourId: "wild-beaches-picnic",
    viatorUrl: "https://www.viator.com/tours/Lisbon/Wild-Beaches-and-Picnic-Experience/d538-349639P1",
    productCode: "P1",
    title: "Private Lisbon Coastal Tour – Arrábida, Sesimbra and Beach Picnic",
    durationText: "7 hours 30 minutes",
    durationMinutes: 450,
    pickupWindow: null,
    pickupZone: "Lisbon, Setúbal, Almada and Sesimbra.",
    groupType: "Private",
    maxGroup: null,
    overview: "Embark on a full-day, private adventure through Arrabida Natural Park and Sesimbra from Lisbon. Experience rugged landscapes, serene beaches, and local culture off the beaten path. Discover the historic fishing village of Sesimbra, visit the Livramento Market in Setubal, and enjoy a private picnic at your beach of choice.",
    highlights: ["A private tour means a personalized and flexible experience","See stunning beaches including Praia de Galapinhos and Praia das Bicas","Indulge in a private picnic with local products at your beach of choice","Private 2-way transfers from Lisbon, Setubal, Almada and Sesimbra addresses"],
    included: ["Private transportation","Air-conditioned vehicle","Private Picnic with local cheeses, bread, smoked meats, pastries, fruit, wine, juice and water","Bottled water","All Fees and Taxes","Local certified tour guide","Private pick-up and drop-off in Lisbon, Setúbal, Almada and Sesimbra"],
    notIncluded: [],
    variesByOption: [],
    itinerary: [
      { order: 1, label: "Lisbon", description: "Pick up", durationMinutes: null, travelToNextMinutes: null, optional: false },
      { order: 2, label: "Parque Natural da Arrabida", description: "Arrábida Mountain on Portugal's Setúbal Peninsula is a stunning natural gem, boasting rugged cliffs, lush forests, and golden beaches lapped by azure waters.", durationMinutes: 60, travelToNextMinutes: null, optional: false },
      { order: 3, label: "Portinho da Arrabida", description: "Portinho da Arrábida is a picturesque bay located in the Arrábida Natural Park known for its stunning natural beauty and clear turquoise waters.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 4, label: "Mercado do Livramento", description: "One of the best markets in world, where you can choose some delights for your picnic. Closed on Mondays.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 5, label: "Lapa de Santa Margarida", description: "Lapa de Santa Margarida in Arrábida is a cave known for its stunning limestone formations and its underground lake.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 6, label: "Sesimbra", description: "Sesimbra is a charming coastal town renowned for its beautiful beaches, clear waters, and picturesque landscapes.", durationMinutes: 30, travelToNextMinutes: null, optional: false },
      { order: 7, label: "Cabo Espichel", description: "We can explore Cabo Espichel or Sesimbra Castle. Cabo Espichel is a stunning promontory renowned for its dramatic cliffs.", durationMinutes: 40, travelToNextMinutes: null, optional: false },
      { order: 8, label: "Praia das Bicas", description: "Praia das bicas is another beautiful and wild beach in Sesimbra. You can have your picnic here.", durationMinutes: 60, travelToNextMinutes: null, optional: false },
      { order: 9, label: "Praia do Meco", description: "Admire the Praia do Meco we can enjoy our picnic here.", durationMinutes: 60, travelToNextMinutes: null, optional: false },
      { order: 10, label: "Praia de Foz", description: "You can decide to do your picnic on any of the beaches on the itinerary. We will pass by all of they so you can enjoy the views.", durationMinutes: null, travelToNextMinutes: null, optional: false },
      { order: 11, label: "Praia da Lagoa de Albufeira", description: "We can also visit Praia da Lagoa de Albufeira and observe the birds and the nature around it. You can have your picnic here.", durationMinutes: null, travelToNextMinutes: null, optional: false },
      { order: 12, label: "Praia de Galapinhos", description: "Experience paradise on Earth at Praia de Galapinhos in Arrábida, boasting crystal-clear turquoise waters and golden sands.", durationMinutes: 60, travelToNextMinutes: null, optional: false }
    ],
    cancellation: "You can cancel up to 24 hours in advance of the experience for a full refund.",
    languages: ["English","Portuguese","Spanish"],
    meetingPoint: null,
    verifiedAt: "2026-07-25",
  },
};

/**
 * Canonical Viator URL registry for the 12 Signature tours.
 * Used by /admin/sot-refresh to know which URL to fetch per tour id.
 * Two ids intentionally point at DIFFERENT Viator products than their
 * name suggests — see plan approved 2026-07:
 *   - tiles-workshop      → P4 Golf & Wine       (id kept for SEO history)
 *   - evora-alentejo      → P6 Setúbal Wine Tour (id kept for SEO history)
 */
export const CANONICAL_VIATOR_URLS: Record<string, string> = {
  "arrabida-wine-allinclusive":
    "https://www.viator.com/tours/Lisbon/Private-Wine-Tour-with-Food-and-Wine-Tasting-in-Southern-Lisbon/d538-349639P3",
  "wild-beaches-picnic":
    "https://www.viator.com/tours/Lisbon/Wild-Beaches-and-Picnic-Experience/d538-349639P1",
  "arrabida-boat":
    "https://www.viator.com/tours/Lisbon/Private-Full-Day-Arrabida-and-Sesimbra-with-Boat-Tour-from-Lisbon/d538-349639P12",
  "tiles-workshop":
    "https://www.viator.com/tours/Lisbon/Full-Day-Golf-and-Wine-tasting-Private-Tour-in-South-Lisbon/d538-349639P4",
  "azeitao-cheese":
    "https://www.viator.com/tours/Lisbon/Azeitao-Cheese-Private-Workshop-with-Wine-and-Food-Tasting/d538-349639P9",
  "sintra-cascais":
    "https://www.viator.com/tours/Lisbon/Sintra-and-Cascais-Hidden-Gems-Private-Tour-with-Wine-Tasting/d538-349639P10",
  "troia-comporta":
    "https://www.viator.com/tours/Lisbon/Private-Troia-and-Comporta-Tour-from-Lisbon-Ruins-Wine-and-Coast/d538-349639P18",
  "evora-alentejo":
    "https://www.viator.com/tours/Lisbon/Private-Full-Day-Wine-Tour-in-Setubal-Region-from-Lisbon/d538-349639P6",
  "tomar-coimbra":
    "https://www.viator.com/tours/Lisbon/From-Lisbon-Private-Full-Day-Tour-to-Tomar-and-Coimbra/d538-349639P8",
  "fatima-nazare-obidos":
    "https://www.viator.com/tours/Lisbon/Private-Full-day-Fatima-Nazare-Obidos-Tour-from-Lisbon/d538-349639P5",
  "roman-heritage-alentejo":
    "https://www.viator.com/tours/Lisbon/Exclusive-Roman-Wine-Tour-from-Lisbon-Hidden-Alentejo-and-Flavors/d538-349639P17",
  "southwest-vicentine-coast":
    "https://www.viator.com/tours/Lisbon/Exclusive-Southwest-Coast-Experience-Undiscovered-Hidden-Secret/d538-349639P16",
};

/* -------------------------------------------------------------------------- */
/*  Read helpers — all fall back to `undefined` when SoT entry is missing.    */
/*  Callers should default to the legacy VIATOR_META / signatureTours field.  */
/* -------------------------------------------------------------------------- */

export function getSot(tourId: string): SignatureSourceOfTruth | undefined {
  return SIGNATURE_SOURCE_OF_TRUTH[tourId];
}

export function sotOverview(tourId: string): string | undefined {
  return getSot(tourId)?.overview;
}

export function sotHighlights(tourId: string): string[] | undefined {
  const v = getSot(tourId)?.highlights;
  return v && v.length > 0 ? v : undefined;
}

export function sotIncluded(tourId: string): string[] | undefined {
  const v = getSot(tourId)?.included;
  return v && v.length > 0 ? v : undefined;
}

export function sotItinerary(
  tourId: string,
): SotItineraryChapter[] | undefined {
  const v = getSot(tourId)?.itinerary;
  return v && v.length > 0 ? v : undefined;
}

export function sotDurationMinutes(tourId: string): number | undefined {
  return getSot(tourId)?.durationMinutes;
}

export function sotDurationText(tourId: string): string | undefined {
  return getSot(tourId)?.durationText;
}

/**
 * canonicalViatorUrl — single source of truth for every Viator link
 * rendered on the site. SoT entry first, canonical registry fallback,
 * `undefined` when the id is unknown. All new code MUST use this
 * helper instead of reading `VIATOR_META[id].viatorUrl` or
 * hardcoding a Viator URL.
 */
export function canonicalViatorUrl(tourId: string): string | undefined {
  return getSot(tourId)?.viatorUrl ?? CANONICAL_VIATOR_URLS[tourId];
}
