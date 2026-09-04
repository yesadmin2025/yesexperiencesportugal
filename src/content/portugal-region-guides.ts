/**
 * Regional Journal guides for places we design private days in but do not (yet)
 * publish a fixed Signature tour for — the "open pins" on the homepage planner
 * map.
 *
 * Rules:
 *   - geography, seasons and orientation only. No invented tours, stops,
 *     partners, inclusions or prices.
 *   - every guide declares the planner map places it covers via
 *     `plannerRegionIds`, so an open pin fills with real reading.
 *   - the CTA is a designed-day request (`/contact`), never a fake booking.
 */

import type { LocalStoryArticle } from "./local-stories-articles";

const DESIGN_CTA_LEAD =
  "We do not sell a fixed departure here. We design the day privately — your dates, your pace, your pickup — and come back with a plan and a price.";
const DESIGN_CTA_LABEL = "Request a designed day";

export const PORTUGAL_REGION_GUIDES: LocalStoryArticle[] = [
  {
    slug: "porto-and-the-douro-valley-guide",
    title: "Porto & the Douro Valley — A Private Travel Guide",
    metaDescription:
      "How to see Porto and the Douro Valley without rushing — the river, the terraces, the quintas and the drive that makes the day. Written by a Portuguese team.",
    h1: "Porto & the Douro Valley",
    eyebrow: "North · Porto & Douro",
    standfirst:
      "One city built on granite and river light, and the oldest demarcated wine region on earth two hours upstream.",
    sections: [
      {
        heading: "Porto is small enough to walk and steep enough to feel.",
        body: "The historic centre falls from the Sé cathedral to the Douro in a few hundred metres of stairs and alleys. Across the Luís I bridge, Vila Nova de Gaia holds the port lodges, which is where most first visits begin and end. The better version keeps the lodges to one visit and spends the rest of the time on the Porto side — Bolhão market, the Ribeira quays in late light, a long lunch instead of a checklist.",
      },
      {
        heading: "The Douro starts where the motorway ends.",
        body: "The valley proper begins around Peso da Régua and tightens as you go east through Pinhão towards the Spanish border. The terraces were cut into schist by hand over three centuries and are a UNESCO World Heritage landscape. The drive along the N222 above Pinhão is the reason people come back; the river road repays a slow car far more than a fast one.",
      },
      {
        heading: "Quintas, and how many is too many.",
        body: "Two estates in a day is generous. Three is a tasting marathon that erases the landscape. A good Douro day is one morning visit, a table with a view over lunch, and an afternoon that stays outside — a river stretch, a viewpoint, a village where nothing is scheduled. Harvest, in September and early October, is the one time the whole valley is working and worth timing a trip around.",
      },
      {
        heading: "Getting there, honestly.",
        body: "Porto to Pinhão is roughly two hours by road each way, so a Douro day from Porto is a full day. From Lisbon it is a different proposition: around three hours to Porto, which is why we design the north as an overnight or a multi-day route rather than pretending it fits between breakfast and dinner in Lisbon.",
      },
      {
        heading: "When to come.",
        body: "May and June give green terraces and long evenings. September brings the harvest and the warmest river. Winter is quiet, cold and clear, and the valley looks like a drawing — good for travellers who want the landscape without the crowd. August is hot inland and busiest in the city.",
      },
    ],
    faq: [
      {
        q: "Can you do the Douro as a day trip from Lisbon?",
        a: "Not well. Lisbon to the Douro is around four hours each way. We design it as part of a longer route north, or from a Porto base.",
      },
      {
        q: "Is the river cruise worth it?",
        a: "A short stretch, yes — an hour on the water between locks changes the scale of the terraces. A full-day cruise usually costs you the drive, which is the better view.",
      },
    ],
    ctaLead: DESIGN_CTA_LEAD,
    ctaLabel: DESIGN_CTA_LABEL,
    plannerRegionIds: ["porto", "douro"],
    relatedReads: [
      { path: "/portugal-travel-designer", label: "How a designed multi-day route works" },
      { path: "/experiences", label: "Browse all Signature Experiences" },
    ],
    datePublished: "2026-08-04",
  },
  {
    slug: "minho-geres-braga-guimaraes-guide",
    title: "The Minho — Peneda-Gerês, Braga & Guimarães Guide",
    metaDescription:
      "Portugal's green north: the country's only national park, the pilgrim stairway at Bom Jesus and the castle town where Portugal began. A private travel guide.",
    h1: "The Minho — Gerês, Braga and Guimarães",
    eyebrow: "North · Minho",
    standfirst: "Granite, water and the oldest idea of Portugal, all inside an hour of each other.",
    sections: [
      {
        heading: "Peneda-Gerês is the only national park in the country.",
        body: "It runs along the Spanish border in a series of granite ridges, oak woods and river lagoons. Roman road markers still stand on the old Braga–Astorga route near Campo do Gerês. The villages — Soajo, Lindoso — keep clusters of stone espigueiros, the raised granaries that look like small tombs. Wild Garrano horses graze the high ground.",
      },
      {
        heading: "Water sets the rhythm.",
        body: "The park is built around reservoirs and river pools. In summer the lagoons are swimmable and busy at the roadside spots and empty twenty minutes' walk further up. In spring the waterfalls run hard and the tracks are muddy. The park is not a drive-through: one valley, done slowly, beats three seen from a windscreen.",
      },
      {
        heading: "Braga, and the stairway.",
        body: "Braga is one of the oldest Christian cities in the Iberian peninsula and still the ecclesiastical capital. Bom Jesus do Monte, just outside town, is a baroque stairway of chapels and fountains climbing the hillside, served by an 1882 water-counterbalance funicular — the oldest of its kind still running. It is the single image most people take home from the north.",
      },
      {
        heading: "Guimarães is where the country starts.",
        body: "The castle and the Paço dos Duques sit above a medieval centre that is a UNESCO World Heritage site and genuinely lived in, not staged. Portugal's first king was born here, and the town says so on a wall. It pairs naturally with Braga; the two are twenty-five minutes apart.",
      },
      {
        heading: "Vinho verde, quietly.",
        body: "The Minho is vinho verde country — light, low-alcohol whites from vines historically trained high above the fields. The estates here are small and rural, and a visit feels like being in someone's yard rather than a tasting room. It suits travellers who want wine without ceremony.",
      },
    ],
    faq: [
      {
        q: "Can Gerês, Braga and Guimarães be done in one day?",
        a: "Braga and Guimarães, comfortably. Adding Gerês makes it a long day of driving; we usually give the park its own day.",
      },
      {
        q: "What is the best base for the north?",
        a: "Porto for a first visit, Braga or a rural quinta if the park is the point.",
      },
    ],
    ctaLead: DESIGN_CTA_LEAD,
    ctaLabel: DESIGN_CTA_LABEL,
    plannerRegionIds: ["geres", "braga-guimaraes"],
    relatedReads: [
      { path: "/local-stories/porto-and-the-douro-valley-guide", label: "Porto & the Douro" },
      { path: "/portugal-travel-designer", label: "Design a multi-day route" },
    ],
    datePublished: "2026-08-06",
  },
  {
    slug: "aveiro-and-the-central-coast-guide",
    title: "Aveiro & the Central Coast — A Local Travel Guide",
    metaDescription:
      "Aveiro's canals and salt pans, the striped houses of Costa Nova and the long Atlantic beaches between Porto and Coimbra. A private travel guide.",
    h1: "Aveiro and the Central Coast",
    eyebrow: "Centro · Aveiro",
    standfirst: "A lagoon city of salt, seaweed boats and Art Nouveau, half an hour from the ocean.",
    sections: [
      {
        heading: "The Ria is the reason Aveiro exists.",
        body: "The lagoon behind the dunes has been worked for centuries for salt and for moliço, the seaweed harvested as fertiliser. The flat-bottomed moliceiro boats, now painted for visitors, were built for that job. The canals in the centre are short — an hour covers them — and the better half of the day is out on the ria itself, among salt pans and bird colonies.",
      },
      {
        heading: "Costa Nova and the striped houses.",
        body: "Ten minutes across the bridge, the fishermen's palheiros at Costa Nova are painted in vertical stripes, originally to be visible from the water. The beach behind them runs for kilometres with an Atlantic that is cold and honest all year. Praia da Barra, next door, has the tallest lighthouse in Portugal.",
      },
      {
        heading: "Art Nouveau, tiles and ovos moles.",
        body: "Aveiro's brief early-twentieth-century wealth left a run of Art Nouveau facades along the central canal. The city is also the home of ovos moles, an egg-yolk-and-sugar sweet made by convent recipe and sold in wafer shells shaped like shells and barrels — a protected regional speciality, not a tourist invention.",
      },
      {
        heading: "What sits around it.",
        body: "Coimbra and its university are fifty minutes south. Porto is under an hour north. The Bairrada wine country, known for sparkling wines and roast suckling pig, sits between them. That triangle makes Aveiro a good hinge in a route rather than a destination people fly for.",
      },
      {
        heading: "When to come.",
        body: "The salt pans are worked in summer, which is when the ria looks its best. Spring is quiet and green. The coast is windy most of the year — bring a layer even in July.",
      },
    ],
    ctaLead: DESIGN_CTA_LEAD,
    ctaLabel: DESIGN_CTA_LABEL,
    plannerRegionIds: ["aveiro"],
    relatedReads: [
      { path: "/local-stories/porto-and-the-douro-valley-guide", label: "Porto & the Douro" },
      { path: "/portugal-travel-designer", label: "Design a multi-day route" },
    ],
    datePublished: "2026-08-09",
  },
  {
    slug: "serra-da-estrela-guide",
    title: "Serra da Estrela — Portugal's High Mountain Guide",
    metaDescription:
      "The highest ground in mainland Portugal: glacial valleys, granite villages, the cheese with its own name, and when to go. A private travel guide.",
    h1: "Serra da Estrela",
    eyebrow: "Centro · Mountains",
    standfirst:
      "Torre stands at 1,993 metres — the roof of mainland Portugal, and a completely different country from the coast.",
    sections: [
      {
        heading: "A glacial landscape, not just a high road.",
        body: "The Serra is a granite plateau cut by glacial valleys — the Zêzere valley above Manteigas is the clearest U-shape in Iberia. Above the treeline the ground goes to boulder, moss and lagoons. Torre, the summit, is reachable by car, which makes the mountain unusually accessible and unusually easy to see badly if you only drive to the top and back.",
      },
      {
        heading: "The villages hold the story.",
        body: "Manteigas, Linhares da Beira, Belmonte and the schist villages on the eastern slope are stone-built and still worked. Belmonte kept a Jewish community through the Inquisition in secret for centuries and has a museum that tells it plainly. Sortelha and Monsanto, further east, are among the most striking fortified villages in the country — Monsanto is built between and under giant granite boulders.",
      },
      {
        heading: "Queijo Serra da Estrela.",
        body: "The mountain's sheep cheese is made from raw Bordaleira milk set with thistle flower rather than animal rennet, and at its ripest is eaten with a spoon through the top. It has protected designation status and a real season, roughly November to May. Buying it at a mountain dairy in February is a different object from the vacuum-packed version in a city shop.",
      },
      {
        heading: "Snow, and the honest version of it.",
        body: "Portugal's only ski area is here, and it is small. Snow is likely between January and March but never guaranteed, and the access roads close when it falls hard. If snow is the goal, treat it as a bonus. If the landscape is the goal, May, June, September and October are better on every measure.",
      },
      {
        heading: "How it fits a route.",
        body: "The Serra sits inland, roughly three hours from Lisbon and two and a half from Porto, so it works as a leg between the coast and the border rather than a day trip. Paired with Belmonte, Monsanto or the Côa valley rock art, it makes a strong two-day interior route.",
      },
    ],
    ctaLead: DESIGN_CTA_LEAD,
    ctaLabel: DESIGN_CTA_LABEL,
    plannerRegionIds: ["serra-da-estrela"],
    relatedReads: [{ path: "/portugal-travel-designer", label: "Design a multi-day route" }],
    datePublished: "2026-08-12",
  },
  {
    slug: "leiria-and-the-pine-coast-guide",
    title: "Leiria & the Pine Coast — Beaches, Castle & Monasteries",
    metaDescription:
      "Leiria's hilltop castle, the pine forest planted for the caravels, and the Atlantic beaches from São Pedro de Moel to Nazaré. A private travel guide.",
    h1: "Leiria and the Pine Coast",
    eyebrow: "Centro · Leiria",
    standfirst:
      "A castle above a river, a medieval forest planted for shipbuilding, and a coastline most visitors drive straight past.",
    sections: [
      {
        heading: "The castle is the town's whole geometry.",
        body: "Leiria's castle sits on a rock over the Lis river and was a royal residence under King Dinis in the fourteenth century. The loggia looking out over the roofs is the best twenty minutes in the town. Below it, the old streets and the Praça Rodrigues Lobo carry the evening.",
      },
      {
        heading: "Pinhal de Leiria was planted on purpose.",
        body: "The pine forest between the town and the sea was expanded from the thirteenth century to stabilise the dunes and to supply timber for the ships of the Discoveries. Much of it burned in the 2017 fires and is being replanted — the recovery itself is part of what you see now. Roads run through it to the coast at São Pedro de Moel.",
      },
      {
        heading: "The coast, north and south.",
        body: "São Pedro de Moel is a small resort under cliffs with an art-deco lighthouse. North, Nazaré's Praia do Norte produces the giant winter waves that made it famous; the canyon offshore is the reason. South, Foz do Arelho sits on a lagoon that is warm and shallow when the ocean is not.",
      },
      {
        heading: "Two monasteries within half an hour.",
        body: "Batalha and Alcobaça are both UNESCO World Heritage sites and both close to Leiria. Batalha was built to mark the 1385 victory at Aljubarrota and left deliberately unfinished. Alcobaça is Cistercian, vast and austere, and holds the tombs of Pedro and Inês. Fátima is twenty-five minutes east, which is why most routes here combine faith, stone and coast.",
      },
      {
        heading: "Why it is usually skipped.",
        body: "Leiria sits between Lisbon and Porto on the motorway, so it is passed at 120 km/h. Given a day and a driver, it becomes the quietest good day in central Portugal — no queue at either monastery outside August, and a beach at the end of it.",
      },
    ],
    ctaLead: DESIGN_CTA_LEAD,
    ctaLabel: DESIGN_CTA_LABEL,
    plannerRegionIds: ["leiria"],
    relatedReads: [{ path: "/experiences", label: "Browse all Signature Experiences" }],
    datePublished: "2026-08-15",
  },
  {
    slug: "marvao-castelo-de-vide-guide",
    title: "Marvão & Castelo de Vide — The Alentejo Border Guide",
    metaDescription:
      "Two fortified hill towns on the Spanish border: Marvão's walls above the Serra de São Mamede and Castelo de Vide's Jewish quarter and springs.",
    h1: "Marvão and Castelo de Vide",
    eyebrow: "Alentejo · Border country",
    standfirst:
      "The highest walls in the Alentejo, and a spring-fed town below them with one of the oldest Jewish quarters in Portugal.",
    sections: [
      {
        heading: "Marvão is a walled village on a quartzite ridge.",
        body: "It sits at around 860 metres inside the Serra de São Mamede natural park, with the whole border plain on one side and Spain on the other. The village inside the walls is a few hundred people and a handful of streets. It was never taken by assault, which is easy to believe once you have walked the ramparts.",
      },
      {
        heading: "Castelo de Vide, twenty minutes down the road.",
        body: "A whitewashed town of springs and Gothic doorways under its own castle. The Judiaria, the medieval Jewish quarter, is one of the best preserved in the country and includes a synagogue building dated to the fourteenth century. The town's fountains still run and locals still fill bottles at them.",
      },
      {
        heading: "The park between them.",
        body: "São Mamede is greener than the rest of the Alentejo — chestnut and oak instead of cork and stubble, because the altitude catches the rain. There are Iron Age and Roman sites nearby, including the Roman town of Ammaia at the foot of Marvão, and some of the best birdwatching in the interior.",
      },
      {
        heading: "Eat and drink like the interior, not the coast.",
        body: "This is the Portalegre end of the Alentejo: sheep cheese, black pork, migas, game in autumn, and wines from higher, cooler vineyards than the Évora plain. Portions are large and lunch is the main event.",
      },
      {
        heading: "How to arrive.",
        body: "Marvão is roughly three hours from Lisbon and about ninety minutes from Évora, so it works as an overnight or as a leg towards Spain. It is one of the few places in Portugal where staying inside the walls is worth the small hotel rooms — the village empties at six and the view stays.",
      },
    ],
    ctaLead: DESIGN_CTA_LEAD,
    ctaLabel: DESIGN_CTA_LABEL,
    plannerRegionIds: ["marvao"],
    relatedReads: [
      { path: "/tours/evora-alentejo", label: "Évora & Alentejo Signature" },
      { path: "/portugal-travel-designer", label: "Design a multi-day route" },
    ],
    datePublished: "2026-08-18",
  },
  {
    slug: "western-algarve-lagos-sagres-guide",
    title: "The Western Algarve — Lagos & Sagres Travel Guide",
    metaDescription:
      "Golden cliffs at Ponta da Piedade, the end of the known world at Sagres and the wild Costa Vicentina. A private guide to the west Algarve.",
    h1: "The Western Algarve — Lagos and Sagres",
    eyebrow: "Algarve · West",
    standfirst:
      "Where the Algarve stops being a resort coast and becomes cliffs, wind and open Atlantic.",
    sections: [
      {
        heading: "Lagos, past the marina.",
        body: "The old town still sits inside its walls, and its history is not decorative: the first European market for enslaved Africans operated here in the fifteenth century, and the site is now a museum that says so directly. West of town, Ponta da Piedade is a set of ochre sea stacks and arches best seen from the water in the early morning, before the boats stack up.",
      },
      {
        heading: "Sagres and Cabo de São Vicente.",
        body: "The southwest corner of Europe. The fortress at Sagres sits on a flat headland above vertical cliffs; six kilometres on, Cabo de São Vicente takes the sunset and the wind, with one of the most powerful lighthouses in Europe. Prince Henry's navigation school is more legend than documented fact, but the geography explains why the story stuck.",
      },
      {
        heading: "The west coast is a different ocean.",
        body: "Turn north from Sagres and the Costa Vicentina begins — Beliche, Castelejo, Bordeira, Amado, Carrapateira. Cold water, big surf, almost no development, because the whole strip is a protected natural park. It is where Portuguese families go when the south coast is full.",
      },
      {
        heading: "Eating here.",
        body: "Percebes from the western rocks, razor clams, and whatever is on the grill in Salema or Burgau. Inland, Monchique's mountain villages do smoked ham and medronho spirit. The strongest tables in the west are small and often in villages with no sea view at all.",
      },
      {
        heading: "Season and distance.",
        body: "Lisbon to Lagos is about two and a half to three hours by motorway, so the Algarve is a multi-day proposition, not a day trip. May, June, September and October give warm days without August traffic. Winter is mild, empty and often bright — the best walking on the Rota Vicentina.",
      },
    ],
    faq: [
      {
        q: "Can you visit the Algarve from Lisbon in a day?",
        a: "We do not recommend it — six hours in a car for a few hours of coast. We design the Algarve as a two-to-four day private route instead.",
      },
    ],
    ctaLead: DESIGN_CTA_LEAD,
    ctaLabel: DESIGN_CTA_LABEL,
    plannerRegionIds: ["lagos", "sagres"],
    relatedReads: [
      { path: "/local-stories/eastern-algarve-ria-formosa-tavira-guide", label: "Eastern Algarve" },
      { path: "/portugal-travel-designer", label: "Design a multi-day route" },
    ],
    datePublished: "2026-08-21",
  },
  {
    slug: "eastern-algarve-ria-formosa-tavira-guide",
    title: "Eastern Algarve — Ria Formosa, Faro & Tavira Guide",
    metaDescription:
      "The quiet Algarve: the Ria Formosa lagoon, island beaches reached by ferry, Faro's walled centre and Tavira's Roman bridge and salt pans.",
    h1: "The Eastern Algarve — Ria Formosa and Tavira",
    eyebrow: "Algarve · East",
    standfirst:
      "Sixty kilometres of lagoon, barrier islands and salt — the half of the Algarve most visitors never reach.",
    sections: [
      {
        heading: "Ria Formosa is a protected lagoon, not a beach resort.",
        body: "A shifting chain of barrier islands and sandbanks runs from Faro to Cacela Velha, sheltering channels, salt pans and mudflats. It is a natural park and one of the most important bird sites in Europe — flamingos, spoonbills, and the purple swamphen that is the park's emblem. Clam and oyster beds are worked here commercially.",
      },
      {
        heading: "The islands take a boat, and that is the point.",
        body: "Culatra, Armona, Farol, Tavira Island and Cabanas are reached by short ferries or water taxis. There are no cars. Beaches are long, flat and, outside July and August, close to empty. Culatra has a working fishing community rather than hotels.",
      },
      {
        heading: "Faro is more than an airport.",
        body: "Behind the marina, the Cidade Velha sits inside its walls with a cathedral you can climb for a view over the lagoon and a bone chapel at the Carmo church. Olhão, next door, has the best market building on the coast and a North-African-looking cubist quarter behind it.",
      },
      {
        heading: "Tavira, and the salt.",
        body: "Tavira straddles the Gilão on a bridge with Roman foundations, and keeps thirty-odd churches and a castle garden above the roofs. The salt pans outside town still produce flor de sal by hand, and the same water feeds the spa pools people now swim in. Cacela Velha, further east, is one white church, one wall and one enormous view.",
      },
      {
        heading: "When to go.",
        body: "The east is warmer and calmer than the west, with sheltered water good for families. Spring brings the birds and the wildflowers on the sandbanks; September and October keep the sea warm with far fewer people.",
      },
    ],
    ctaLead: DESIGN_CTA_LEAD,
    ctaLabel: DESIGN_CTA_LABEL,
    plannerRegionIds: ["ria-formosa", "tavira"],
    relatedReads: [
      { path: "/local-stories/western-algarve-lagos-sagres-guide", label: "Western Algarve" },
      { path: "/portugal-travel-designer", label: "Design a multi-day route" },
    ],
    datePublished: "2026-08-24",
  },
  {
    slug: "madeira-travel-guide",
    title: "Madeira & Porto Santo — An Island Travel Guide",
    metaDescription:
      "Laurel forest, levada walks, Funchal's market and the golden beach of Porto Santo. A private travel guide to Portugal's Atlantic islands.",
    h1: "Madeira and Porto Santo",
    eyebrow: "Atlantic · Madeira",
    standfirst:
      "A volcanic island where the weather changes with the altitude, and a sister island that is one long beach.",
    sections: [
      {
        heading: "Madeira is vertical.",
        body: "The island rises to 1,862 metres at Pico Ruivo in under twenty kilometres from the sea, so cloud, sun and rain are usually all present at once in different places. The south coast is warm and dry, the north is green and wet, and the central peaks sit above the cloud line more often than not. Planning here is really about choosing altitude.",
      },
      {
        heading: "Levadas are the island's road network for water.",
        body: "Hundreds of kilometres of irrigation channels were cut across the cliffs from the fifteenth century to carry water from the wet north to the terraces of the south. The maintenance paths beside them are now the walking network — mostly level, sometimes vertiginous. Levada do Caldeirão Verde and the Rabaçal paths run through Laurisilva, a UNESCO-listed laurel forest that predates the last ice age.",
      },
      {
        heading: "Funchal, and what is actually good in it.",
        body: "The Mercado dos Lavradores for fruit and scabbardfish, the Zona Velha for painted doors and dinner, and the Monte cable car with the wicker toboggan ride back down, which is a genuine nineteenth-century transport survival rather than a theme-park invention. Madeira wine lodges in the centre pour thirty-, forty- and hundred-year-old bottles by the glass.",
      },
      {
        heading: "Porto Santo is the opposite island.",
        body: "Forty minutes by plane or a two-and-a-half-hour ferry, and nine kilometres of flat golden sand with almost nothing behind it. It is dry, low and quiet, and locals go for the sand itself, which has a long-standing therapeutic reputation. One day is enough to see it; three is better if the point is to stop.",
      },
      {
        heading: "When and how.",
        body: "Madeira works all year — winter averages sit in the high teens. Whale and dolphin boats run most months. Roads are steep, narrow and heavily tunnelled, which is the main reason visitors take a driver rather than a rental car.",
      },
    ],
    ctaLead:
      "Island days are planned, not sold off a shelf — we build the route, the walking level and the timing around you, and come back with a plan and a price.",
    ctaLabel: DESIGN_CTA_LABEL,
    plannerRegionIds: ["madeira", "porto-santo"],
    relatedReads: [
      { path: "/local-stories/azores-sao-miguel-pico-guide", label: "The Azores" },
      { path: "/portugal-travel-designer", label: "Design a multi-day route" },
    ],
    datePublished: "2026-08-27",
  },
  {
    slug: "azores-sao-miguel-pico-guide",
    title: "The Azores — São Miguel, Pico & Faial Travel Guide",
    metaDescription:
      "Crater lakes and hot springs on São Miguel, lava-stone vineyards and Portugal's highest mountain on Pico, and the harbour of Horta on Faial.",
    h1: "The Azores — São Miguel, Pico and Faial",
    eyebrow: "Atlantic · Azores",
    standfirst:
      "Nine volcanic islands in the middle of the Atlantic, where the weather is an argument and the landscape wins it.",
    sections: [
      {
        heading: "São Miguel is the island most people start with.",
        body: "Sete Cidades is a twin crater lake — one green, one blue — inside a caldera you can drive the rim of. Furnas has boiling springs, iron-rich thermal pools at Terra Nostra, and cozido cooked underground in the volcanic soil. Lagoa do Fogo, in the middle of the island, is protected and often the clearest of the three.",
      },
      {
        heading: "Tea, pineapple and cattle.",
        body: "Gorreana on São Miguel is the oldest working tea plantation in Europe and still operates with nineteenth-century machinery. The island also grows pineapple under glass and, above all, keeps cows: the Azores supply a large share of Portugal's milk and cheese, which is why the landscape is hedged into green squares.",
      },
      {
        heading: "Pico is a mountain with an island around it.",
        body: "Ponta do Pico is 2,351 metres, the highest point in Portugal. At sea level, the Criação Velha and Santa Luzia vineyards are grown inside currais — small walls of black lava stone that shelter the vines from salt wind. The landscape is a UNESCO World Heritage site, and the wines from it are salty, mineral and unlike anything on the mainland.",
      },
      {
        heading: "Faial and the channel.",
        body: "Horta's marina is a mid-Atlantic crossing point, and sailors have painted the quay for decades; painting your boat's mark is considered good luck, and Peter Café Sport is the room where those crossings are logged. Capelinhos, at the western end, is the ash desert left by the 1957–58 eruption that added land to the island.",
      },
      {
        heading: "Practicalities.",
        body: "Flights connect Lisbon to Ponta Delgada in about two and a half hours; inter-island flights and summer ferries link Pico, Faial and São Jorge. Weather changes hourly on every island, so a good Azores plan carries two versions of each day. Whale watching runs roughly April to October, with blue and fin whales passing in spring.",
      },
    ],
    ctaLead:
      "Island days are planned, not sold off a shelf — we build the route, the walking level and the timing around you, and come back with a plan and a price.",
    ctaLabel: DESIGN_CTA_LABEL,
    plannerRegionIds: ["sao-miguel", "pico-faial"],
    relatedReads: [
      { path: "/local-stories/madeira-travel-guide", label: "Madeira & Porto Santo" },
      { path: "/portugal-travel-designer", label: "Design a multi-day route" },
    ],
    datePublished: "2026-08-30",
  },
];
