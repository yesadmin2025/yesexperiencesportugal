/**
 * Dedicated local pages for the published service areas.
 *
 * Each page covers ONE area we genuinely collect guests in, and links to
 * the real Signature days that run from it. Everything here is factual
 * orientation and logistics — area character, pickup, drive time, season.
 * Nothing invents a tour, a stop, a partner or a price: tour ids resolve
 * against `signatureTours`, and prices come from that data at render time.
 *
 * Lisbon itself is not repeated here — it is owned by /lisbon-private-tours
 * and /day-trips-from-lisbon.
 */

export interface ServiceAreaPage {
  path: string;
  /** Area name as published in the business profile. */
  area: string;
  title: string;
  description: string;
  eyebrow: string;
  h1Lead: string;
  h1Em: string;
  standfirst: string;
  /** Two or three factual paragraphs of local orientation. */
  paragraphs: readonly string[];
  /** Real Signature tour ids that run from / through this area. */
  tourIds: readonly string[];
  pickup: readonly string[];
  driveTime: string;
  bestSeason: string;
  areaServed: readonly string[];
  /** The regional hub page this area belongs to. */
  hubPath: string;
  hubName: string;
  faq: readonly { q: string; a: string }[];
}

export const SERVICE_AREA_PAGES: readonly ServiceAreaPage[] = [
  {
    path: "/private-tours-lisbon",
    area: "Lisbon",
    title: "Private Tours in Lisbon — Hotel Pickup, One Group Per Car",
    description:
      "Private tours in Lisbon with door-to-door pickup from any hotel, apartment or the cruise terminal: wine country, Sintra, the Atlantic coast and Alentejo. Your group only.",
    eyebrow: "Lisbon · where every day begins",
    h1Lead: "Private tours in Lisbon,",
    h1Em: "collected at your own door.",
    standfirst:
      "Lisbon is where almost every day we run starts and ends. This page covers the practical side of that: where we collect you in the city, how long each direction takes, and which private day suits the time you have.",
    paragraphs: [
      "The city sits between the Tejo and the hills, which is why the same morning can end up in three completely different landscapes. South across the bridge is the Setúbal peninsula — Arrábida's limestone coast, the Azeitão wine estates and Sesimbra's fishing harbour. West is Sintra's wooded hill and the Atlantic cliffs at Cabo da Roca. Inland to the southeast, the Alentejo plain and Évora's Roman centre. All of it is a day trip, and all of it returns to your Lisbon address the same evening.",
      "Pickup is door to door: hotels in Baixa, Chiado, Avenida, Príncipe Real, Alfama and Belém, short-let apartments and villas anywhere in the municipality, and the Santa Apolónia cruise terminal for days that have to fit a ship's schedule. Central Lisbon traffic decides the departure time more than the distance does, so your host confirms a time that gets you out of the city before it thickens.",
      "One group per car, one licensed local host, and no shared seats — the difference in Lisbon is less about the sights than about not spending the day waiting for other people. If you would rather see the featured days, prices and the full Lisbon overview together, the private Lisbon hub lists them side by side.",
    ],
    tourIds: ["arrabida-wine-allinclusive", "sintra-cascais", "azeitao-cheese", "evora-alentejo"],
    pickup: [
      "Any Lisbon hotel, apartment or villa — Baixa, Chiado, Avenida, Alfama, Belém and beyond",
      "Santa Apolónia cruise terminal, timed to your ship",
      "Lisbon airport and Parque das Nações addresses",
    ],
    driveTime:
      "Arrábida and Azeitão about 45 minutes; Sintra about 40; Évora about 1h20 — all door to door",
    bestSeason: "Year-round. Spring and autumn give the best light and the quietest roads.",
    areaServed: ["Lisbon", "Cascais", "Sintra", "Setúbal", "Azeitão", "Sesimbra"],
    hubPath: "/lisbon-private-tours",
    hubName: "Private Lisbon tours",
    faq: [
      {
        q: "Do you pick up at Lisbon hotels?",
        a: "Yes — anywhere in the city, including short-let apartments, villas and the Santa Apolónia cruise terminal. Give us the address when you book and your host confirms the pickup time.",
      },
      {
        q: "What is the best private day trip from Lisbon?",
        a: "For wine and coast in one day, Arrábida and Azeitão. For palaces and the Atlantic edge, Sintra and Cascais. For Roman history and big Alentejo reds, Évora. Each day's route, length and price for your party is shown on its own page before you pay.",
      },
      {
        q: "Can a private tour fit a cruise stop?",
        a: "Yes. Tell us the ship and the times when you book and the day is built to be back at the terminal with margin — that is the only reason we shorten a route.",
      },
    ],
  },
  {
    path: "/private-tours-sintra",
    area: "Sintra",
    title: "Private Tours in Sintra From Lisbon — Palaces, No Queues",
    description:
      "Private tours in Sintra from Lisbon with hotel pickup: palaces and gardens timed to avoid the crowds, then Cabo da Roca and Cascais. One group, one host, one car.",
    eyebrow: "Sintra · 40 minutes from Lisbon",
    h1Lead: "Private tours in Sintra,",
    h1Em: "timed around the crowds.",
    standfirst:
      "Sintra rewards timing more than any other day trip from Lisbon. Everything sits on a wooded hill with narrow roads, so the difference between a beautiful day and a frustrating one is knowing what to see and when.",
    paragraphs: [
      "The hill is a cluster of nineteenth-century estates in cool, damp woodland: painted palaces, gardens built as follies, and views that reach the Atlantic when the mist lifts. Because it is a UNESCO landscape rather than a single monument, the town fills from mid-morning and the hilltop roads slow to walking pace.",
      "A private day changes the order rather than the sights. Your host reads the day, drives you between the hilltop stops, and puts the busiest place either early or late so you are inside it while the coaches are somewhere else. Between the estates there is time for a pastry in the village, and the coast road out to Cabo da Roca — mainland Europe's western edge — before Cascais on the way home.",
      "Sintra is 40 minutes from central Lisbon and 20 minutes from Cascais, so it also works as the second half of a coastal day. We collect you at your own address in Lisbon, Cascais, Estoril or Sintra village, and bring you back to the same door.",
    ],
    tourIds: ["sintra-cascais"],
    pickup: [
      "Sintra village hotels, quintas and guest houses",
      "Any Lisbon hotel, apartment, villa or the cruise terminal",
      "Cascais, Estoril and Carcavelos addresses",
    ],
    driveTime: "About 40 minutes from central Lisbon; 20 minutes from Cascais",
    bestSeason: "Year-round. Spring and autumn give the clearest light on the coast road.",
    areaServed: ["Sintra", "Lisbon", "Cascais", "Estoril"],
    hubPath: "/private-tours-sintra-cascais",
    hubName: "Sintra & Cascais",
    faq: [
      {
        q: "What is the best way to visit Sintra from Lisbon?",
        a: "With a private car and a host who sets the order of the day. Sintra's estates are spread across a hill with narrow roads, so a private day removes the shuttle queues and lets you be at the busiest place when it is quietest.",
      },
      {
        q: "How long does a private Sintra tour take?",
        a: "A full day. Our Sintra and Cascais day runs door to door and usually adds Cabo da Roca and Cascais to the hill itself — the exact length is on the tour page, and the price for your party is shown before you pay.",
      },
      {
        q: "Do you buy the palace tickets?",
        a: "Entrance tickets are bought for the places you choose to go inside; what is included is listed on the tour page before you book. Your host advises which are worth the time on your date.",
      },
    ],
  },
  {
    path: "/private-tours-cascais",
    area: "Cascais",
    title: "Private Tours From Cascais & Estoril — Coast and Sintra",
    description:
      "Private day tours from Cascais and Estoril: Guincho, Cabo da Roca and the Sintra hills at your own pace, with door-to-door pickup and one group per car.",
    eyebrow: "Cascais & Estoril · Lisbon coast",
    h1Lead: "Private days from Cascais,",
    h1Em: "ocean first, hills after.",
    standfirst:
      "Staying on the Cascais coast changes the shape of a day trip: you are already past the city traffic, so the ocean road comes first and the Sintra hills follow when the light softens.",
    paragraphs: [
      "Cascais is a former fishing town turned seaside town, with Estoril beside it and a cycle path running along the bay towards Lisbon. From here the Guincho dunes, the cliffs at Cabo da Roca and the Sintra estates all sit within half an hour, which means a later, calmer start than the same day from the city.",
      "We collect you at your hotel, apartment or villa in Cascais, Estoril or Carcavelos and shape the route around the weather — the coast when it is clear, the wooded hill when the Atlantic mist sits low. The car and the host are yours alone, so a long lunch or an extra viewpoint is a decision, not a problem.",
      "Cascais is about 30 minutes from central Lisbon, so days from the city and days from the coast use the same itinerary in a different order.",
    ],
    tourIds: ["sintra-cascais"],
    pickup: [
      "Cascais, Estoril and Carcavelos hotels, apartments and villas",
      "Any Lisbon address or the cruise terminal",
      "Sintra village addresses",
    ],
    driveTime: "About 30 minutes from central Lisbon; 20 minutes to Sintra",
    bestSeason: "Year-round; the coast is at its best from April to October.",
    areaServed: ["Cascais", "Estoril", "Sintra", "Lisbon"],
    hubPath: "/private-tours-sintra-cascais",
    hubName: "Sintra & Cascais",
    faq: [
      {
        q: "Can you pick us up in Cascais rather than Lisbon?",
        a: "Yes. Cascais, Estoril and Carcavelos are inside our standard pickup area — tell us the address when you book and your host confirms the time.",
      },
      {
        q: "Can we combine Cascais with Sintra in one day?",
        a: "That is how the day is usually built: the coast road and Cabo da Roca on one side of the day, the Sintra hill on the other, with the order set by the weather and the crowds.",
      },
    ],
  },
  {
    path: "/private-tours-sesimbra",
    area: "Sesimbra",
    title: "Private Tours From Sesimbra — Arrábida, Coves & Wine",
    description:
      "Private day tours from Sesimbra: the Arrábida park road, clear-water coves, Azeitão wine and cheese, and fish landed that morning. Our home base, 40 minutes from Lisbon.",
    eyebrow: "Sesimbra · Setúbal district · our home base",
    h1Lead: "Private days from Sesimbra,",
    h1Em: "where we actually live.",
    standfirst:
      "Sesimbra is our home base — a working fishing town under the Arrábida ridge, 40 minutes from Lisbon, where the boats still land the catch every morning.",
    paragraphs: [
      "The town sits in a south-facing bay below the castle, with the Serra da Arrábida rising behind it and the park's coves — Galapinhos, Galápos, Portinho — a few minutes along the ridge road. Because the mountain shelters the coast, the water here is calm and green rather than Atlantic grey.",
      "Days that start in Sesimbra reach everything quickly: the Azeitão cellars and cheese makers are fifteen minutes inland, Setúbal and the Sado are twenty, and the park road is immediate. That closeness is the whole point — the day is spent at the tables and the viewpoints instead of on the motorway.",
      "Being based here also means the practical things are ours rather than a subcontractor's: the vehicle, the host, the timing, and the local knowledge of which cove is calm on the day you come.",
    ],
    tourIds: [
      "arrabida-wine-allinclusive",
      "arrabida-boat",
      "wild-beaches-picnic",
      "azeitao-cheese",
    ],
    pickup: [
      "Sesimbra town, Santana and the Meco side of the cape",
      "Any Lisbon hotel, apartment, villa or the cruise terminal",
      "Setúbal and Azeitão addresses",
    ],
    driveTime: "About 40 minutes from central Lisbon over the 25 de Abril bridge",
    bestSeason: "Good all year; the coves and boat days are best from April to October.",
    areaServed: ["Sesimbra", "Arrábida", "Setúbal", "Azeitão", "Lisbon"],
    hubPath: "/private-tours-arrabida-sesimbra",
    hubName: "Arrábida & Sesimbra",
    faq: [
      {
        q: "How far is Sesimbra from Lisbon?",
        a: "About 40 minutes by road across the 25 de Abril bridge. We collect you at your Lisbon address and return you to the same door.",
      },
      {
        q: "Which beaches can we reach from Sesimbra?",
        a: "The Arrábida park coves — Portinho da Arrábida, Galápos and Galapinhos — are a few minutes along the ridge road. Your host picks the one that is calm and reachable on your date.",
      },
      {
        q: "Can we go out on the water?",
        a: "Yes, on the days built around a boat. What the boat day includes is listed on its tour page, and the price for your party is shown before you pay.",
      },
    ],
  },
  {
    path: "/private-tours-setubal",
    area: "Setúbal",
    title: "Private Tours From Setúbal — Sado, Moscatel & Arrábida",
    description:
      "Private day tours from Setúbal: Moscatel cellars in Azeitão, the Sado estuary and Tróia ferry, the Arrábida ridge road and a serious fish market. Door-to-door pickup.",
    eyebrow: "Setúbal · Sado estuary",
    h1Lead: "Private days from Setúbal,",
    h1Em: "between the hills and the estuary.",
    standfirst:
      "Setúbal is the estuary city between the Arrábida hills and the Sado — a real fish market, dolphins in the channel and the Tróia ferry leaving from the docks.",
    paragraphs: [
      "It is a working city rather than a resort, and better for it: the Livramento market is one of the best in the country, the seafront restaurants grill what came in that morning, and the Sado channel is home to a resident dolphin population.",
      "From here the day can go either way. Inland, Azeitão is fifteen minutes away with its Moscatel cellars, hand-made sheep's cheese and tile workshops. Over the ridge, the Arrábida park road drops to the coves. Across the water, the ferry puts Tróia and the Comporta beaches within an hour of Lisbon.",
      "We collect you at your address in Setúbal city, the marina or the ferry terminal area — or in Lisbon, 45 minutes away, if that is where you are staying.",
    ],
    tourIds: ["azeitao-cheese", "arrabida-wine-allinclusive", "troia-comporta"],
    pickup: [
      "Setúbal city, the marina and the ferry terminal area",
      "Azeitão and the surrounding quintas",
      "Any Lisbon hotel, apartment, villa or the cruise terminal",
    ],
    driveTime: "About 45 minutes from central Lisbon; 15 minutes to Azeitão",
    bestSeason: "Year-round; the estuary is beautiful in every season.",
    areaServed: ["Setúbal", "Azeitão", "Arrábida", "Tróia", "Lisbon"],
    hubPath: "/private-tours-azeitao-setubal",
    hubName: "Azeitão & Setúbal",
    faq: [
      {
        q: "What is there to do in Setúbal on a day trip?",
        a: "The Livramento market and the seafront, the Sado estuary and its dolphins, the Arrábida ridge road, and the Azeitão wine and cheese villages fifteen minutes inland. Which of those a day includes is set out on each tour page.",
      },
      {
        q: "Can we take the Tróia ferry?",
        a: "Yes — the Sado crossing is part of the Tróia and Comporta day rather than a transfer, and it is how we reach the beaches on the far side.",
      },
    ],
  },
  {
    path: "/private-tours-azeitao",
    area: "Azeitão",
    title: "Private Wine Tours in Azeitão From Lisbon — Cellars & Cheese",
    description:
      "Private wine tours in Azeitão, 40 minutes from Lisbon: Moscatel cellars, hand-made sheep's cheese and hand-painted tiles, with hotel pickup and one group per host.",
    eyebrow: "Azeitão · 40 minutes from Lisbon",
    h1Lead: "Private wine tours in Azeitão,",
    h1Em: "the closest real wine country to Lisbon.",
    standfirst:
      "Azeitão is the shortest possible route from a Lisbon hotel to a working cellar: forty minutes over the bridge, and the day belongs to the tastings rather than the motorway.",
    paragraphs: [
      "Two villages — Vila Nogueira and Vila Fresca — sit between the Arrábida ridge and the vines. This is Moscatel de Setúbal country, and the estates here still pour in their own cellars rather than in a visitor centre built for coaches.",
      "The same few kilometres also make the sheep's cheese the region is known for, pressed and turned by hand, and paint the tiles that end up on Lisbon façades. A day here can be all three: a cellar in the morning, the cheese and the tiles after, and lunch at a long table.",
      "Because it is close, Azeitão pairs naturally with the Arrábida coves or Sesimbra in the afternoon. We collect you at your own address in Lisbon, Setúbal or Sesimbra and bring you back there.",
    ],
    tourIds: ["azeitao-cheese", "arrabida-wine-allinclusive", "tiles-workshop"],
    pickup: [
      "Vila Nogueira and Vila Fresca de Azeitão, plus the surrounding quintas",
      "Any Lisbon hotel, apartment, villa or the cruise terminal",
      "Setúbal and Sesimbra addresses",
    ],
    driveTime: "About 40 minutes from central Lisbon",
    bestSeason: "Year-round; harvest energy in the cellars from late August to October.",
    areaServed: ["Azeitão", "Setúbal", "Sesimbra", "Arrábida", "Lisbon"],
    hubPath: "/private-tours-azeitao-setubal",
    hubName: "Azeitão & Setúbal",
    faq: [
      {
        q: "Is Azeitão the closest wine region to Lisbon?",
        a: "It is the closest one we run days to — about 40 minutes from the city centre over the 25 de Abril bridge, which is why the tastings get the time instead of the drive.",
      },
      {
        q: "What wine is Azeitão known for?",
        a: "Moscatel de Setúbal, plus the reds and whites of the Setúbal peninsula. Which estates a day visits is listed on the tour page — we do not publish partners we have not worked with.",
      },
      {
        q: "Can we add the cheese and the tiles?",
        a: "Yes. The cheese making and the tile painting are separate real experiences in the same villages, and they combine with a cellar visit in one unhurried day.",
      },
    ],
  },
  {
    path: "/private-tours-evora",
    area: "Évora",
    title: "Private Tours From Évora & the Alentejo — Wine and Marble",
    description:
      "Private day tours to Évora and the Alentejo from Lisbon: a walled UNESCO city, a Roman temple, clay-fermented wine and marble villages. About 1h30 inland, early start.",
    eyebrow: "Évora · Alentejo · 1h30 from Lisbon",
    h1Lead: "Private days in Évora,",
    h1Em: "the Alentejo at its own speed.",
    standfirst:
      "Évora is a walled city with a Roman temple in the middle of it and cork country all around — ninety minutes inland, and worth the earlier start.",
    paragraphs: [
      "Inside the walls the streets are white and low, with the temple, the cathedral and the university a short walk apart. Outside them the Alentejo opens: cork oaks, wheat, marble quarries, and estates where wine is still fermented in clay amphorae as the Romans did here.",
      "Distance is what makes this a private day rather than a coach day. Ninety minutes each way means the schedule has to belong to you: an earlier departure, a long lunch, a village that turns out to be worth an hour, and a return whenever the light goes.",
      "We collect you in Lisbon, or at your hotel in Évora and the surrounding estates if you are already in the Alentejo.",
    ],
    tourIds: ["evora-alentejo", "roman-heritage-alentejo"],
    pickup: [
      "Évora hotels inside and outside the walls, and nearby Alentejo estates",
      "Any Lisbon hotel, apartment, villa or the cruise terminal",
    ],
    driveTime: "About 1h30 from central Lisbon — these days start earlier",
    bestSeason: "Spring and autumn are ideal; summer is hot inland, so we start early.",
    areaServed: ["Évora", "Alentejo", "Vidigueira", "Lisbon"],
    hubPath: "/private-tours-alentejo-evora",
    hubName: "Évora & the Alentejo",
    faq: [
      {
        q: "Is Évora worth a day trip from Lisbon?",
        a: "Yes, if the day is built for it. It is about 1h30 each way, so an early start and a private vehicle turn it into an unhurried day inside the walls plus wine country around them.",
      },
      {
        q: "What makes Alentejo wine different?",
        a: "Some estates still ferment in clay amphorae, a Roman method that survived here. Which producers a day visits is listed on the tour page.",
      },
    ],
  },
  {
    path: "/private-tours-comporta",
    area: "Comporta",
    title: "Private Tours From Comporta — Rice Fields, Dunes & Beaches",
    description:
      "Private day tours in and from Comporta: rice fields, pine, sand tracks and miles of open Atlantic beach, about an hour from Lisbon. Door-to-door pickup, one group only.",
    eyebrow: "Comporta · about 1h from Lisbon",
    h1Lead: "Private days in Comporta,",
    h1Em: "quiet even in August.",
    standfirst:
      "Comporta is rice fields, umbrella pine, sand tracks and low white houses behind miles of open Atlantic beach — about an hour from Lisbon and still unhurried in high summer.",
    paragraphs: [
      "The landscape is flat and horizontal: paddies with storks in them, pine woods, then a dune line and a beach that runs for kilometres with almost nothing built on it. The villages are small, whitewashed and blue-trimmed, and the rhythm is deliberately slow.",
      "A day here works in two halves — the dunes and the beach while the light is long, then the estuary, Alcácer do Sal or the Alentejo coast further south. Because the vehicle is yours, the sand tracks and the lunch that runs long are part of the plan rather than a delay.",
      "We collect you in Comporta, Carvalhal or Muda, or in Lisbon about an hour away, including the Sado ferry when it is the better route.",
    ],
    tourIds: ["troia-comporta", "southwest-vicentine-coast"],
    pickup: [
      "Comporta, Carvalhal and Muda houses, hotels and villas",
      "Tróia resort and the ferry terminal",
      "Any Lisbon hotel, apartment, villa or the cruise terminal",
    ],
    driveTime: "About 1h from central Lisbon, or minutes from the Tróia ferry",
    bestSeason: "May to October for the beaches; the estuary is beautiful all year.",
    areaServed: ["Comporta", "Carvalhal", "Tróia", "Alcácer do Sal", "Lisbon"],
    hubPath: "/private-tours-comporta-troia",
    hubName: "Comporta & Tróia",
    faq: [
      {
        q: "How far is Comporta from Lisbon?",
        a: "About an hour, either around the estuary or across it on the Tróia ferry. We collect you at your own address and return you there.",
      },
      {
        q: "Is Comporta busy in summer?",
        a: "Far less than the Algarve. The beach runs for kilometres with very little built on it, so even in August there is room — your host knows which access points stay quiet.",
      },
    ],
  },
  {
    path: "/private-tours-troia",
    area: "Tróia",
    title: "Private Tours From Tróia — Sado Ferry, Dunes & Roman Ruins",
    description:
      "Private day tours from Tróia: the Sado crossing, Roman fish-salting ruins on the beach, dune coastline and the Comporta beaches. Door-to-door pickup, your group only.",
    eyebrow: "Tróia · Sado peninsula",
    h1Lead: "Private days from Tróia,",
    h1Em: "the crossing is part of the day.",
    standfirst:
      "Tróia sits on the sandspit across the Sado from Setúbal, with Roman fish-salting ruins on the beach side and the estuary channel on the other.",
    paragraphs: [
      "Arriving by ferry changes the tone: twenty minutes of open water with the Arrábida ridge behind you, dolphins in the channel often enough to look for them, and then a peninsula of dune, pine and beach on the far side.",
      "The Roman ruins at Tróia are on the sand itself — the tanks where fish was salted for the empire — and the beach runs south from there towards Comporta and Carvalhal without interruption. A day from here usually takes the estuary in the morning and the beach line in the afternoon.",
      "We collect you at the resort, the marina or the ferry terminal, or in Lisbon about an hour away including the crossing.",
    ],
    tourIds: ["troia-comporta", "southwest-vicentine-coast"],
    pickup: [
      "Tróia resort, the marina and the ferry terminal",
      "Comporta and Carvalhal addresses",
      "Any Lisbon hotel, apartment, villa or the cruise terminal",
    ],
    driveTime: "About 1h from central Lisbon including the Sado crossing",
    bestSeason: "May to October for the beaches; the estuary is beautiful all year.",
    areaServed: ["Tróia", "Comporta", "Setúbal", "Lisbon"],
    hubPath: "/private-tours-comporta-troia",
    hubName: "Comporta & Tróia",
    faq: [
      {
        q: "How do you reach Tróia from Lisbon?",
        a: "By road to Setúbal and then the Sado ferry, or around the estuary — about an hour either way. Your host picks the route that fits the day's timing.",
      },
      {
        q: "Can we see dolphins in the Sado?",
        a: "There is a resident population in the estuary and they are often visible from the crossing. We never promise a sighting — it is wild.",
      },
    ],
  },
] as const;

export function findServiceAreaPage(path: string): ServiceAreaPage {
  const page = SERVICE_AREA_PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`Unknown service area page: ${path}`);
  return page;
}
