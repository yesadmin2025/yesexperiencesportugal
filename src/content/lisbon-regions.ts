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
    title: "Private Wine Tours from Lisbon — Arrábida & Sesimbra",
    description:
      "Private wine tours from Lisbon into Arrábida and Sesimbra: family wineries in Azeitão, cliff viewpoints, coves and a fishing-town lunch. Hotel pickup, your group only.",
    eyebrow: "Setúbal district · 40 minutes from Lisbon",
    h1Lead: "Private tours in Arrábida & Sesimbra,",
    h1Em: "our own doorstep.",
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
    ],
  },
  {
    path: "/private-tours-azeitao-setubal",
    slug: "azeitao-setubal",
    name: "Azeitão & Setúbal",
    title: "Best Lisbon Wine Tours — Private Azeitão & Setúbal Days",
    description:
      "Private wine tours from Lisbon to Azeitão and Setúbal: family cellars, Moscatel, hands-on cheese-making, tile painting and the Setúbal market. Hotel pickup, one group only.",
    eyebrow: "Azeitão · Setúbal · 40 minutes from Lisbon",
    h1Lead: "Wine, cheese and clay in Azeitão,",
    h1Em: "the table Lisbon eats from.",
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
    title: "Private Alentejo Wine Tours from Lisbon — Évora & Vidigueira",
    description:
      "Private Alentejo wine tours from Lisbon: Évora's Roman temple and walled streets, cork country, and talha wine still made in clay by the families who make it.",
    eyebrow: "Alentejo · 90 minutes from Lisbon",
    h1Lead: "Private tours in Évora & the Alentejo,",
    h1Em: "slow country, long tables.",
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
