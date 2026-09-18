/**
 * Regional listing pages that depart from Lisbon.
 *
 * Every region maps to REAL Signature tour ids — nothing here invents a
 * tour, a stop, a partner or a price. Copy is orientation and logistics
 * only (drive time, pickup, season), which is factual and matches what
 * the tour pages already publish.
 */

export interface LisbonRegion {
  /** Route path — one static route file per region (sitemap friendly). */
  path:
    | "/private-tours-arrabida-sesimbra"
    | "/private-tours-azeitao-setubal"
    | "/private-tours-sintra-cascais"
    | "/private-tours-alentejo-evora"
    | "/private-tours-comporta-troia"
    | "/private-tours-centro-silver-coast";
  slug: string;
  name: string;
  title: string;
  description: string;
  eyebrow: string;
  h1Lead: string;
  h1Em: string;
  standfirst: string;
  /** Signature tour ids that genuinely run in this region. */
  tourIds: readonly string[];
  driveTime: string;
  bestSeason: string;
  areaServed: readonly string[];
  /** Where the day starts. Door-to-door pickup, plus the usual departure areas. */
  pickup: readonly string[];
  faq: readonly { q: string; a: string }[];
}

/**
 * Pickup answers shared by every region page. Factual and identical
 * across the site — door-to-door from your own address, no meeting point
 * to find. Appended to each region's own FAQ so the FAQPage schema and
 * the visible list always match.
 */
export const PICKUP_FAQ: readonly { q: string; a: string }[] = [
  {
    q: "Where does pickup happen in Lisbon?",
    a: "At your own address — hotel lobby, apartment door, villa or the Lisbon cruise terminal. There is no meeting point to find and no extra charge for pickup inside Lisbon. You are returned to the same address at the end of the day.",
  },
  {
    q: "Can you collect us outside Lisbon?",
    a: "Yes. We regularly start in Cascais, Estoril, Sintra, Sesimbra and Setúbal as well as Lisbon. Tell us your address when you book and your host confirms the exact time.",
  },
  {
    q: "What time is pickup?",
    a: "Most days leave Lisbon between 08:00 and 09:30, depending on the region and the season. Longer inland days start earlier. Your host confirms the precise time once the date is set.",
  },
  {
    q: "What if our flight or ship is delayed?",
    a: "Tell us as soon as you know. Your driver-host waits and reshapes the day around the time you actually have, since the vehicle and the day are yours alone.",
  },
];

export const LISBON_REGIONS: readonly LisbonRegion[] = [
  {
    path: "/private-tours-arrabida-sesimbra",
    slug: "arrabida-sesimbra",
    name: "Arrábida & Sesimbra",
    title: "Private Wine Tours Lisbon to Arrábida & Sesimbra",
    description:
      "Private wine tours from Lisbon to Arrábida and Sesimbra, with Azeitão cellars, Atlantic viewpoints and a fishing-town lunch. Hotel pickup; your group only.",
    eyebrow: "Setúbal district · 40 minutes from Lisbon",
    h1Lead: "Private wine tours from Lisbon,",
    h1Em: "through Arrábida & Sesimbra.",
    standfirst:
      "This is where we are based, and it is the closest real wine country to Lisbon. The Serra da Arrábida drops straight into green water, Azeitão makes wine and cheese a few kilometres inland, and Sesimbra still lands its fish every morning.",
    tourIds: [
      "arrabida-wine-allinclusive",
      "arrabida-boat",
      "wild-beaches-picnic",
      "azeitao-cheese",
      "tiles-workshop",
    ],
    driveTime: "About 40 minutes from central Lisbon",
    bestSeason: "Good all year; the coves and the boat days are best April to October.",
    areaServed: ["Lisbon", "Sesimbra", "Setúbal", "Azeitão", "Cascais"],
    pickup: [
      "Door-to-door from your Lisbon hotel, apartment or villa",
      "Lisbon cruise terminal (Santa Apolónia / Jardim do Tabaco)",
      "Cascais, Estoril and Sintra addresses",
      "Sesimbra and Setúbal addresses — we are based here",
    ],
    faq: [
      {
        q: "How far is Arrábida from Lisbon?",
        a: "Around 40 minutes by road over the 25 de Abril bridge. We pick you up at your Lisbon address and return you there at the end of the day.",
      },
      {
        q: "Is this one of the best wine tours from Lisbon?",
        a: "It is the closest one that stays private all day. Arrábida and Azeitão are 40 minutes from the city, so the day is spent at the tables rather than on the motorway — and the vehicle, the host and the pace are yours alone.",
      },
      {
        q: "Can I combine wine and the coast in one day?",
        a: "Yes — that is exactly how our Arrábida days are built: a family winery in Azeitão in the morning, the park road and viewpoints, then Sesimbra or a cove in the afternoon.",
      },
      {
        q: "Why choose a private Arrábida wine tour from Lisbon?",
        a: "The region is close enough to combine cellar time, the Arrábida ridge and Sesimbra without rushing. A private day also keeps pickup, timing and pace with your own party.",
      },
    ],
  },
  {
    path: "/private-tours-azeitao-setubal",
    slug: "azeitao-setubal",
    name: "Azeitão & Setúbal",
    title: "Private Wine Tours Lisbon to Azeitão & Setúbal",
    description:
      "Private wine tours from Lisbon to Azeitão and Setúbal: family cellars, Moscatel, hands-on cheese-making, tile painting and the Setúbal market. Hotel pickup, one group only.",
    eyebrow: "Azeitão · Setúbal · 40 minutes from Lisbon",
    h1Lead: "Private wine tours in Azeitão,",
    h1Em: "close to Lisbon, far from the crowds.",
    standfirst:
      "Azeitão is a village of cellars, cheese rooms and tile workshops sitting between the Arrábida hills and the Sado estuary. It is where Lisbon's Moscatel comes from, and it is close enough that the day belongs to the tastings rather than the drive.",
    tourIds: ["azeitao-cheese", "arrabida-wine-allinclusive", "tiles-workshop"],
    driveTime: "About 40 minutes from central Lisbon",
    bestSeason: "Year-round. Harvest energy in September; cellars are at their best in winter.",
    areaServed: ["Lisbon", "Azeitão", "Setúbal", "Sesimbra", "Cascais"],
    pickup: [
      "Door-to-door from your Lisbon hotel, apartment or villa",
      "Lisbon cruise terminal (Santa Apolónia / Jardim do Tabaco)",
      "Cascais, Estoril and Sintra addresses",
      "Setúbal and Azeitão addresses",
    ],
    faq: [
      {
        q: "Are these private wine tours from Lisbon?",
        a: "Yes. Every day is your group only — your own vehicle, your own host, no strangers and no fixed coach timetable.",
      },
      {
        q: "What makes Azeitão worth the drive?",
        a: "It is the wine and cheese country closest to Lisbon: Moscatel cellars, the hands-on Azeitão cheese workshop, the Setúbal market and tile painting, all within a short radius.",
      },
      {
        q: "Do we drink at more than one place?",
        a: "It depends on the day you choose. Each Signature page lists exactly what that day includes — we never add or promise stops that are not on it.",
      },
      {
        q: "Is Azeitão a good choice for a private Lisbon wine tour?",
        a: "Yes. It is the closest concentrated wine area south of Lisbon, with Moscatel cellars and local food traditions within about forty minutes of the city.",
      },
    ],
  },
  {
    path: "/private-tours-sintra-cascais",
    slug: "sintra-cascais",
    name: "Sintra & Cascais",
    title: "Private Tours in Sintra & Cascais from Lisbon",
    description:
      "A private Sintra and Cascais day from Lisbon, timed to avoid the queues: hilltop estates, Cabo da Roca, the coast road and a wine tasting. Your group only.",
    eyebrow: "Lisbon coast · 40 minutes from Lisbon",
    h1Lead: "Private tours in Sintra & Cascais,",
    h1Em: "timed against the crowds.",
    standfirst:
      "Sintra rewards early starts and local timing far more than long lists. We shape the day around when each place empties, then run the coast road back through Cabo da Roca and Cascais.",
    tourIds: ["sintra-cascais"],
    driveTime: "About 40 minutes from central Lisbon",
    bestSeason: "Year-round. Spring and autumn give the clearest light on the coast road.",
    areaServed: ["Lisbon", "Sintra", "Cascais", "Estoril"],
    pickup: [
      "Door-to-door from your Lisbon hotel, apartment or villa",
      "Lisbon cruise terminal (Santa Apolónia / Jardim do Tabaco)",
      "Cascais, Estoril and Sintra addresses",
      "Sesimbra and Setúbal addresses",
    ],
    faq: [
      {
        q: "Do you pick up at Lisbon hotels for Sintra?",
        a: "Yes. Door-to-door pickup at your hotel, apartment or any Lisbon address, with the return to the same place.",
      },
      {
        q: "Is one day enough for Sintra and Cascais?",
        a: "It is, when the day is private and properly sequenced. Public transport and group tours are what make it feel rushed.",
      },
    ],
  },
  {
    path: "/private-tours-alentejo-evora",
    slug: "alentejo-evora",
    name: "Évora & the Alentejo",
    title: "Private Alentejo Wine Tours from Lisbon — Évora & Talha",
    description:
      "Private Alentejo wine tours from Lisbon: Évora's Roman temple and walled streets, cork country, and talha wine still made in clay by the families who make it.",
    eyebrow: "Alentejo · 90 minutes from Lisbon",
    h1Lead: "Private Alentejo wine tours from Lisbon,",
    h1Em: "through Évora and talha country.",
    standfirst:
      "Ninety minutes inland the land opens into cork oaks, marble villages and wine that is still made in clay. These are our longest wine days from Lisbon, and the ones people talk about most afterwards.",
    tourIds: ["evora-alentejo", "roman-heritage-alentejo"],
    driveTime: "About 1h30 from central Lisbon — these days start earlier",
    bestSeason: "Spring and autumn are ideal; summer is hot inland, so we start early.",
    areaServed: ["Lisbon", "Évora", "Vidigueira", "Alentejo"],
    pickup: [
      "Door-to-door from your Lisbon hotel, apartment or villa",
      "Lisbon cruise terminal (Santa Apolónia / Jardim do Tabaco)",
      "Cascais, Estoril and Sintra addresses",
      "Sesimbra and Setúbal addresses",
    ],
    faq: [
      {
        q: "Is Évora worth a day trip from Lisbon?",
        a: "Yes, if the day is private. The drive is about 90 minutes each way, so a fixed group schedule leaves very little time in the town itself.",
      },
      {
        q: "How do Alentejo wine days differ from Arrábida ones?",
        a: "Arrábida is 40 minutes away and coastal; the Alentejo is 90 minutes inland and slower, with clay-jar talha wine, cork country and marble villages. Both run as private wine tours from Lisbon, your group only.",
      },
      {
        q: "What time do Alentejo days start?",
        a: "Usually 08:00 from Lisbon. Your host confirms the exact pickup time once your dates are set.",
      },
      {
        q: "What is talha wine?",
        a: "Talha wine is fermented in large clay vessels, following a tradition with Roman roots that remains alive in parts of the Alentejo. The matching Signature page lists the exact visits included on each day.",
      },
    ],
  },
  {
    path: "/private-tours-comporta-troia",
    slug: "comporta-troia",
    name: "Comporta & Tróia",
    title: "Private Comporta & Tróia Tours from Lisbon",
    description:
      "Private Comporta and Tróia day trips from Lisbon: the estuary ferry, Roman ruins, rice fields, pine and miles of near-empty Atlantic sand.",
    eyebrow: "Setúbal peninsula · Comporta · Alentejo coast",
    h1Lead: "Private tours in Comporta & Tróia,",
    h1Em: "sand, rice and quiet.",
    standfirst:
      "Cross the Sado estuary by ferry and the landscape changes completely — Roman ruins on the sandspit, rice fields behind the dunes, and beaches that stay wide and quiet even in August.",
    tourIds: ["troia-comporta", "southwest-vicentine-coast"],
    driveTime: "About 1h from central Lisbon, including the Sado ferry crossing",
    bestSeason: "May to October for the beaches; the estuary is beautiful all year.",
    areaServed: ["Lisbon", "Comporta", "Tróia", "Setúbal", "Alcácer do Sal"],
    pickup: [
      "Door-to-door from your Lisbon hotel, apartment or villa",
      "Lisbon cruise terminal (Santa Apolónia / Jardim do Tabaco)",
      "Cascais, Estoril and Sintra addresses",
      "Sesimbra and Setúbal addresses",
    ],
    faq: [
      {
        q: "How do you get to Comporta from Lisbon?",
        a: "We drive to Setúbal and cross the Sado estuary by ferry to Tróia, then follow the coast down to Comporta. It is around an hour door to door, and the crossing is part of the day.",
      },
      {
        q: "Are these beach days?",
        a: "Partly. There is time on the sand, but the day also takes in the Roman ruins at Tróia, the rice fields and lunch near the coast.",
      },
    ],
  },
  {
    path: "/private-tours-centro-silver-coast",
    slug: "centro-silver-coast",
    name: "Centro & the Silver Coast",
    title: "Private Fátima, Nazaré, Óbidos & Tomar Tours from Lisbon",
    description:
      "Private day tours north of Lisbon: Fátima, the Nazaré cliffs, walled Óbidos, and the Templar convent at Tomar with Coimbra. Hotel pickup, your group only.",
    eyebrow: "Centro · Silver Coast · north of Lisbon",
    h1Lead: "Private tours north of Lisbon,",
    h1Em: "Templars, cliffs and walled towns.",
    standfirst:
      "North of the city the country turns monumental — the Templar convent at Tomar, the university city of Coimbra, the pilgrimage at Fátima, the Atlantic wall at Nazaré and the whitewashed streets inside Óbidos.",
    tourIds: ["fatima-nazare-obidos", "tomar-coimbra"],
    driveTime: "About 1h to 2h from central Lisbon — these are full, early-start days",
    bestSeason: "Year-round; the Nazaré swell is at its most dramatic between October and March.",
    areaServed: ["Lisbon", "Fátima", "Nazaré", "Óbidos", "Tomar", "Coimbra"],
    pickup: [
      "Door-to-door from your Lisbon hotel, apartment or villa",
      "Lisbon cruise terminal (Santa Apolónia / Jardim do Tabaco)",
      "Cascais, Estoril and Sintra addresses",
      "Sesimbra and Setúbal addresses",
    ],
    faq: [
      {
        q: "Can Fátima, Nazaré and Óbidos be done in one day?",
        a: "Yes — privately. It is a long, early day, and the private format is what keeps it comfortable: the vehicle is yours, and the time in each place flexes to how you feel.",
      },
      {
        q: "How early do these days start?",
        a: "Usually 08:00 from Lisbon, because the first stop is between one and two hours north. Your host confirms the exact pickup time with your dates.",
      },
    ],
  },
] as const;

export function findLisbonRegion(path: LisbonRegion["path"]): LisbonRegion {
  const region = LISBON_REGIONS.find((r) => r.path === path);
  if (!region) throw new Error(`Unknown Lisbon region path: ${path}`);
  return region;
}

/** Visible FAQ list + FAQPage schema source for a region page. */
export function regionFaq(region: LisbonRegion) {
  return [...region.faq, ...PICKUP_FAQ];
}

/**
 * The nine published service areas (see `business-nap`), each pointed at the
 * page that actually covers pickups there. Used for the "Where we collect
 * you" block on every region page — real internal links, no new thin pages.
 */
export const SERVICE_AREA_LINKS: readonly {
  area: string;
  path: string;
  /** Anchor of that area's local section on the host page. */
  anchor: string;
  note: string;
}[] = [
  { area: "Lisbon", anchor: "lisbon", path: "/lisbon-private-tours", note: "Hotel, apartment or cruise terminal" },
  { area: "Cascais", anchor: "cascais", path: "/private-tours-sintra-cascais", note: "Cascais & Estoril pickups" },
  { area: "Sintra", anchor: "sintra", path: "/private-tours-sintra-cascais", note: "Sintra village and hotels" },
  { area: "Sesimbra", anchor: "sesimbra", path: "/private-tours-arrabida-sesimbra", note: "Our home base" },
  { area: "Setúbal", anchor: "setubal", path: "/private-tours-azeitao-setubal", note: "Setúbal city and marina" },
  { area: "Azeitão", anchor: "azeitao", path: "/private-tours-azeitao-setubal", note: "Wine and cheese country" },
  { area: "Évora", anchor: "evora", path: "/private-tours-alentejo-evora", note: "Alentejo departures" },
  { area: "Comporta", anchor: "comporta", path: "/private-tours-comporta-troia", note: "Comporta houses and hotels" },
  { area: "Tróia", anchor: "troia", path: "/private-tours-comporta-troia", note: "Tróia peninsula and ferry" },
] as const;

/**
 * Local copy for each of the nine published service areas.
 *
 * Each area lives on the page that actually covers its pickups (see
 * SERVICE_AREA_LINKS) and gets its own anchor, heading and factual
 * orientation copy — what the area is, why guests stay there, how the
 * pickup works and which of our real days run from it. No new thin
 * pages, no invented stops, partners or prices.
 */
export interface ServiceAreaProfile {
  area: string;
  /** Anchor id on the host page, e.g. `#sintra`. */
  anchor: string;
  /** Page that owns this area's copy. */
  path: string;
  heading: string;
  body: string;
  pickup: string;
  drive: string;
}

export const AREA_PROFILES: readonly ServiceAreaProfile[] = [
  {
    area: "Lisbon",
    anchor: "lisbon",
    path: "/lisbon-private-tours",
    heading: "Day trips from Lisbon",
    body: "Almost every day we run starts in Lisbon, because that is where our guests sleep. Baixa, Chiado, Príncipe Real, Alfama, Belém, Parque das Nações and the cruise terminal are all inside our standard pickup area, and the bridge puts real wine country forty minutes away.",
    pickup: "Your own hotel lobby, apartment door, villa or the cruise terminal — no meeting point to find, and no charge for pickup inside Lisbon.",
    drive: "40 minutes to Arrábida and Sintra; about 1h to Comporta; about 1h30 to Évora.",
  },
  {
    area: "Sintra",
    anchor: "sintra",
    path: "/private-tours-sintra-cascais",
    heading: "Private tours in Sintra",
    body: "Sintra is a hill town of estates and cool, wooded gardens where timing decides everything. We shape the day around when each place empties rather than around a fixed list, and we drive between the hilltop stops so nobody spends the afternoon queueing for a shuttle.",
    pickup: "Sintra village hotels and guest houses, plus any Lisbon or Cascais address on the way.",
    drive: "About 40 minutes from central Lisbon.",
  },
  {
    area: "Cascais",
    anchor: "cascais",
    path: "/private-tours-sintra-cascais",
    heading: "Private tours from Cascais & Estoril",
    body: "Cascais and Estoril sit on the same coast road as Cabo da Roca and Guincho, so a day that starts here can take the ocean first and the Sintra hills afterwards. Staying on this coast usually means a calmer, later start than the same day from the city.",
    pickup: "Cascais, Estoril and Carcavelos hotels, apartments and villas.",
    drive: "About 30 minutes from Lisbon; 20 minutes to Sintra over the Malveira road.",
  },
  {
    area: "Sesimbra",
    anchor: "sesimbra",
    path: "/private-tours-arrabida-sesimbra",
    heading: "Private tours from Sesimbra",
    body: "Sesimbra is our home base — a working fishing town under the Arrábida ridge where the boats still land the fish each morning. It is also the shortest possible start to an Arrábida day: the park road, the coves and the Azeitão cellars are all within a few minutes.",
    pickup: "Sesimbra town, Santana and the Meco side of the cape.",
    drive: "About 40 minutes from central Lisbon over the 25 de Abril bridge.",
  },
  {
    area: "Setúbal",
    anchor: "setubal",
    path: "/private-tours-azeitao-setubal",
    heading: "Private tours from Setúbal",
    body: "Setúbal is the estuary city between the Arrábida hills and the Sado — a serious fish market, dolphins in the channel and the Tróia ferry leaving from the docks. Days that begin here reach both the Azeitão cellars and the Comporta side of the water quickly.",
    pickup: "Setúbal city, the marina and the ferry terminal area.",
    drive: "About 45 minutes from central Lisbon; 15 minutes to Azeitão.",
  },
  {
    area: "Azeitão",
    anchor: "azeitao",
    path: "/private-tours-azeitao-setubal",
    heading: "Private wine tours in Azeitão",
    body: "Azeitão is the wine and cheese village closest to Lisbon: Moscatel cellars, sheep's cheese made by hand, and tile workshops still painting by eye. It is small enough to walk and close enough that the day belongs to the tastings rather than the motorway.",
    pickup: "Vila Nogueira and Vila Fresca de Azeitão, plus the surrounding quintas.",
    drive: "About 40 minutes from central Lisbon.",
  },
  {
    area: "Évora",
    anchor: "evora",
    path: "/private-tours-alentejo-evora",
    heading: "Private tours from Évora",
    body: "Évora is a walled Alentejo city with a Roman temple in the middle of it and cork country all around. Ninety minutes inland, it rewards an early start and a private vehicle: the wine here is still made in clay, and the villages between are worth stopping in.",
    pickup: "Évora hotels inside and outside the walls, and nearby Alentejo estates.",
    drive: "About 1h30 from central Lisbon — these days start earlier.",
  },
  {
    area: "Comporta",
    anchor: "comporta",
    path: "/private-tours-comporta-troia",
    heading: "Private tours from Comporta",
    body: "Comporta is rice fields, pine, sand tracks and low white houses behind miles of open Atlantic beach. It stays quiet even in August, and a day from here can take the dunes in the morning and the Alentejo coast or the estuary in the afternoon.",
    pickup: "Comporta, Carvalhal and Muda houses, hotels and villas.",
    drive: "About 1h from central Lisbon, or minutes from the Tróia ferry.",
  },
  {
    area: "Tróia",
    anchor: "troia",
    path: "/private-tours-comporta-troia",
    heading: "Private tours from Tróia",
    body: "Tróia sits on the sandspit across the Sado from Setúbal, with Roman fish-salting ruins on the beach side and the estuary channel on the other. Arriving or leaving by ferry is part of the day rather than a transfer.",
    pickup: "Tróia resort, the marina and the ferry terminal.",
    drive: "About 1h from central Lisbon including the Sado crossing.",
  },
] as const;

/** Area profiles owned by a given page path. */
export function areaProfilesFor(path: string): readonly ServiceAreaProfile[] {
  return AREA_PROFILES.filter((a) => a.path === path);
}
