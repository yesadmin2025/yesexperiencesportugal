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
    | "/private-tours-sintra-cascais"
    | "/private-tours-alentejo-evora"
    | "/private-tours-comporta-troia";
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
  faq: readonly { q: string; a: string }[];
}

export const LISBON_REGIONS: readonly LisbonRegion[] = [
  {
    path: "/private-tours-arrabida-sesimbra",
    slug: "arrabida-sesimbra",
    name: "Arrábida & Sesimbra",
    title: "Private Tours in Arrábida & Sesimbra from Lisbon",
    description:
      "Private Arrábida and Sesimbra days from Lisbon: family wineries in Azeitão, cliff viewpoints, coves and a fishing-town lunch. Hotel pickup, your group only.",
    eyebrow: "Setúbal district · 40 minutes from Lisbon",
    h1Lead: "Private tours in Arrábida & Sesimbra,",
    h1Em: "our own doorstep.",
    standfirst:
      "This is where we are based. The Serra da Arrábida drops straight into green water, Azeitão makes wine and cheese a few kilometres inland, and Sesimbra still lands its fish every morning.",
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
    faq: [
      {
        q: "How far is Arrábida from Lisbon?",
        a: "Around 40 minutes by road over the 25 de Abril bridge. We pick you up at your Lisbon address and return you there at the end of the day.",
      },
      {
        q: "Can I combine wine and the coast in one day?",
        a: "Yes — that is exactly how our Arrábida days are built: a family winery in Azeitão in the morning, the park road and viewpoints, then Sesimbra or a cove in the afternoon.",
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
    title: "Private Évora & Alentejo Tours from Lisbon",
    description:
      "Private Évora and Alentejo day tours from Lisbon: Roman temple, walled streets, cork country and talha wine with the families who still make it.",
    eyebrow: "Alentejo · 90 minutes from Lisbon",
    h1Lead: "Private tours in Évora & the Alentejo,",
    h1Em: "slow country, long tables.",
    standfirst:
      "Ninety minutes inland the land opens into cork oaks, marble villages and wine that is still made in clay. These are our longest days from Lisbon, and the ones people talk about most afterwards.",
    tourIds: ["evora-alentejo", "roman-heritage-alentejo"],
    driveTime: "About 1h30 from central Lisbon — these days start earlier",
    bestSeason: "Spring and autumn are ideal; summer is hot inland, so we start early.",
    areaServed: ["Lisbon", "Évora", "Vidigueira", "Alentejo"],
    faq: [
      {
        q: "Is Évora worth a day trip from Lisbon?",
        a: "Yes, if the day is private. The drive is about 90 minutes each way, so a fixed group schedule leaves very little time in the town itself.",
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
] as const;

export function findLisbonRegion(path: LisbonRegion["path"]): LisbonRegion {
  const region = LISBON_REGIONS.find((r) => r.path === path);
  if (!region) throw new Error(`Unknown Lisbon region path: ${path}`);
  return region;
}
