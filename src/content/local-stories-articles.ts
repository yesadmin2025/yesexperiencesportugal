// Static, SEO-optimized Local Stories articles.
// Body copy is intentionally left as placeholders — the founder writes/supplies
// the prose. Each article ships with: unique <title>, meta description, H1,
// internal link to the matching Signature tour, and Article/BlogPosting JSON-LD.

export type LocalStoryArticle = {
  slug: string;
  /** <title> tag — keep under ~60 chars where possible. */
  title: string;
  /** <meta name="description"> — keep under ~160 chars. */
  metaDescription: string;
  /** Single H1 on the page (can differ slightly from <title>). */
  h1: string;
  /** Small uppercase eyebrow above H1. */
  eyebrow: string;
  /** Optional short standfirst shown under the H1. */
  standfirst: string;
  /** Section headings + placeholder paragraphs the founder will replace. */
  sections: { heading: string; body: string }[];
  /** Soft CTA copy at the end of the article. */
  ctaLead: string;
  ctaLabel: string;
  /** Matching Signature tour id (slug). */
  signatureSlug: string;
  /** Optional secondary internal links. */
  relatedSignatures?: { slug: string; label: string }[];
  /** ISO date for JSON-LD datePublished. */
  datePublished: string;
  /** Optional FAQ block — rendered on page AND emitted as FAQPage JSON-LD. */
  faq?: { q: string; a: string }[];
};

export const LOCAL_STORIES_ARTICLES: LocalStoryArticle[] = [
  {
    slug: "best-day-trips-from-lisbon",
    title: "Best Day Trips from Lisbon (by a Local) — Wine, Coast & Arrábida",
    metaDescription:
      "A local's guide to the best day trips from Lisbon — Arrábida wine country, the wild south coast, Sintra and Sesimbra. Written by the team that designs them.",
    h1: "Best Day Trips from Lisbon — by a Local",
    eyebrow: "Lisbon · Day Trips",
    standfirst:
      "Where we actually take friends when they visit — and which trips are worth the drive.",
    sections: [
      { heading: "South of the bridge: Arrábida and Setúbal", body: "[Body copy to be supplied.]" },
      { heading: "Sintra without the queues", body: "[Body copy to be supplied.]" },
      { heading: "Wild beaches and a long lunch", body: "[Body copy to be supplied.]" },
      { heading: "How to choose", body: "[Body copy to be supplied.]" },
    ],
    ctaLead:
      "Most of these days live inside one of our Signature experiences — private, paced, and shaped to you.",
    ctaLabel: "See our Arrábida Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "sintra-cascais", label: "Sintra & Cascais Signature" },
      { slug: "wild-beaches-picnic", label: "Wild Beaches & Picnic" },
    ],
    datePublished: "2026-06-01",
  },
  {
    slug: "arrabida-vs-sintra",
    title: "Arrábida vs Sintra: Which Day Trip Is Right for You?",
    metaDescription:
      "Arrábida or Sintra from Lisbon? A local's honest comparison — wine country and wild coast vs palaces and forest — to help you choose the right day.",
    h1: "Arrábida vs Sintra: Which Day Trip Is Right for You?",
    eyebrow: "Compare · Day Trips",
    standfirst:
      "Two very different sides of Lisbon. Here is how we help guests pick the right one.",
    sections: [
      { heading: "What Arrábida feels like", body: "[Body copy to be supplied.]" },
      { heading: "What Sintra feels like", body: "[Body copy to be supplied.]" },
      { heading: "Crowds, driving time, pace", body: "[Body copy to be supplied.]" },
      { heading: "Our honest take", body: "[Body copy to be supplied.]" },
    ],
    ctaLead:
      "If Sintra calls you, we have a private Signature shaped around it — palaces, forest, and Cascais light.",
    ctaLabel: "See the Sintra & Cascais Signature",
    signatureSlug: "sintra-cascais",
    relatedSignatures: [{ slug: "arrabida-wine-allinclusive", label: "Arrábida Wine Signature" }],
    datePublished: "2026-06-02",
  },
  {
    slug: "setubal-wine-guide",
    title: "Setúbal Wine Country: A Local's Guide",
    metaDescription:
      "Setúbal Moscatel, Palmela reds, and the family wineries we visit ourselves — a local's guide to Portugal's most underrated wine region.",
    h1: "Setúbal Wine Country — A Local's Guide",
    eyebrow: "Setúbal · Wine",
    standfirst:
      "Twenty minutes south of Lisbon, a wine region most travellers still miss. Here is what to taste, and where.",
    sections: [
      { heading: "Why Setúbal is different", body: "[Body copy to be supplied.]" },
      { heading: "Moscatel de Setúbal, explained simply", body: "[Body copy to be supplied.]" },
      { heading: "The wineries we love", body: "[Body copy to be supplied.]" },
      { heading: "What to pair it with", body: "[Body copy to be supplied.]" },
    ],
    ctaLead:
      "We bring guests into these cellars on a private, all-inclusive day — wine, lunch, and the Arrábida coast on the way home.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    datePublished: "2026-06-03",
  },
  {
    slug: "what-to-do-in-sesimbra",
    title: "What to Do in Sesimbra — A Fishing Town Worth the Drive",
    metaDescription:
      "A local's guide to Sesimbra — the fort, the beach, the fish lunch, and the wild Arrábida coast next door. Why this small fishing town is worth a day.",
    h1: "What to Do in Sesimbra — A Fishing Town Worth the Drive",
    eyebrow: "Sesimbra · Coast",
    standfirst:
      "Our home town. Here is how we would spend a day in Sesimbra — slowly, and by the sea.",
    sections: [
      { heading: "The fishing port and the fort", body: "[Body copy to be supplied.]" },
      { heading: "Where we eat", body: "[Body copy to be supplied.]" },
      { heading: "Wild beaches inside the Arrábida park", body: "[Body copy to be supplied.]" },
      { heading: "A quiet half-day option", body: "[Body copy to be supplied.]" },
    ],
    ctaLead:
      "Most guests reach Sesimbra through our Wild Beaches & Picnic Signature — a slow, private day on the Arrábida coast.",
    ctaLabel: "See the Wild Beaches Signature",
    signatureSlug: "wild-beaches-picnic",
    datePublished: "2026-06-04",
  },
  {
    slug: "private-tour-vs-group-tour",
    title: "Private vs Group Tours in Portugal: What's Actually Worth It",
    metaDescription:
      "Private tour or group tour in Portugal? A local operator's honest comparison — what you really get, what you actually pay, and when each makes sense.",
    h1: "Private vs Group Tours in Portugal — What's Actually Worth It",
    eyebrow: "Travel · How to Choose",
    standfirst:
      "We run private days for a living. Here is an honest comparison — including when a group tour is the smarter call.",
    sections: [
      { heading: "What 'private' actually means", body: "[Body copy to be supplied.]" },
      { heading: "What you pay for, and what you don't", body: "[Body copy to be supplied.]" },
      { heading: "Where group tours still make sense", body: "[Body copy to be supplied.]" },
      { heading: "Our rule of thumb", body: "[Body copy to be supplied.]" },
    ],
    ctaLead:
      "If a private day feels right, our Signature experiences are fully private — one host, one car, one route shaped to you.",
    ctaLabel: "See our Signature experiences",
    signatureSlug: "arrabida-wine-allinclusive",
    datePublished: "2026-06-05",
  },
  {
    slug: "troia-comporta-guide",
    title: "Tróia & Comporta from Lisbon — A Local's Slow Alentejo Day",
    metaDescription:
      "Tróia, Comporta and the slow Alentejo coast — Roman ruins, sandy-soil wineries, palafitic piers and untouched beaches. A local's guide to a private day south of Lisbon.",
    h1: "Tróia & Comporta — Beaches, Ruins and Slow Alentejo Days",
    eyebrow: "Tróia · Comporta · Alentejo",
    standfirst:
      "A ferry, a Roman fish-salting complex, a wooden pier on stilts, and one of Europe's most unusual wine terroirs — all in a single private day from Lisbon.",
    sections: [
      {
        heading: "Crossing to Tróia — Lisbon behind, another Portugal ahead",
        body: "The day begins with a short ferry over the Sado estuary. It sounds banal on paper. In practice, it's the moment the trip changes register: bottlenose dolphins live in this estuary year-round, the Serra da Arrábida drops behind you, and by the time you step off on the Tróia side you're in a landscape most travellers never see. This is not Algarve, and it is not Lisbon. It is the Alentejo coast — quieter, sandier, older.",
      },
      {
        heading: "Roman ruins almost nobody visits",
        body: "The Roman Ruins of Tróia are one of the largest fish-salting complexes in the whole Roman Empire — active from the 1st to the 5th century, sending garum (fermented fish sauce) across the Mediterranean. Standing among the salting tanks and thermal baths, with the Atlantic on one side and the estuary on the other, you understand quickly why this coast was chosen two thousand years ago and why it still feels strategic. We stop here with a licensed local guide who works with the site's archaeologists — not a script.",
      },
      {
        heading: "Carrasqueira Palafítica — a working pier on stilts",
        body: "A twenty-minute drive south, the Cais Palafítico da Carrasqueira is a wooden fishing pier built directly into the estuary mud — hand-driven stakes, no concrete, still used every day. It's one of the most photographed places in Alentejo and one of the least understood: the pier isn't a folk display, it's a live fishing infrastructure that has stayed unchanged because it works. We time the stop with the tide.",
      },
      {
        heading: "Comporta and the sandy-soil wines",
        body: "Comporta itself is the reason people fly here. Sand-floor tascas, whitewashed rice-workers' villages, dune systems that stretch uninterrupted for kilometres. What almost no one talks about is the wine: Herdade da Comporta grows vines directly on the Atlantic sand, with the ocean two hundred metres away — a terroir that exists in maybe a dozen places on Earth. The tastings there are quiet, technical, and free of the theatre you get in more famous regions.",
      },
      {
        heading: "Wild beaches, and the drive back",
        body: "If conditions allow we finish the day at Praia do Carvalhal or one of the smaller unnamed beaches south of Comporta — endless sand, no bars, no rentals, just Atlantic. The drive back to Lisbon is under 90 minutes; most guests are quiet for the first half of it. That's the sign the day landed.",
      },
    ],
    ctaLead:
      "We shape this day privately — ferry, ruins, palafitic pier, sandy-soil winery and a beach lunch, timed with the tide. One car, one licensed local host, home to Lisbon by evening.",
    ctaLabel: "See the Tróia & Comporta Signature",
    signatureSlug: "troia-comporta",
    relatedSignatures: [
      { slug: "southwest-vicentine-coast", label: "Southwest Vicentine Coast" },
      { slug: "roman-heritage-alentejo", label: "Roman Heritage & Talha Wines" },
    ],
    datePublished: "2026-06-06",
  },
  {
    slug: "southwest-vicentine-coast-guide",
    title: "Portugal's Southwest Coast: A Local's Guide to the Vicentine Coast",
    metaDescription:
      "The wild Vicentine coast from Lisbon — Porto Covo, Milfontes, Odeceixe, Aljezur. A licensed local's guide to Portugal's hidden Atlantic between Alentejo and Algarve.",
    h1: "The Southwest Vicentine Coast — Portugal's Hidden Atlantic",
    eyebrow: "Vicentine Coast · Alentejo · Costa",
    standfirst:
      "Between Alentejo and Algarve there is a coastline most travellers never see — protected, empty, cinematic. Here is how we spend a day inside it.",
    sections: [
      {
        heading: "Why this coast still feels secret",
        body: "The Parque Natural do Sudoeste Alentejano e Costa Vicentina protects roughly 120 kilometres of Atlantic coastline south of Sines. Development is capped by law: no high-rises, no beachfront resorts, no marinas. The result is a landscape that looks the way the Algarve looked in the 1970s — whitewashed villages, cliffs, coves reached on foot, and a light most travellers associate with Greece rather than Portugal.",
      },
      {
        heading: "Porto Covo and Ilha do Pessegueiro",
        body: "Porto Covo is a tiny fishing village where the cliffs meet the ocean in dramatic drops. Just south, Ilha do Pessegueiro sits offshore with the ruins of a 17th-century fortress — this coastline was strategic long before it was scenic. It's the softest opening to the Vicentine coast; we start here so the scale of the drive south makes sense.",
      },
      {
        heading: "Vila Nova de Milfontes — where the river meets the sea",
        body: "Milfontes is the day's natural lunch stop. The Mira estuary widens into a calm river beach on one side and opens straight to the Atlantic on the other. We book a table with a small handful of family-run restaurants that grill fish the same way their grandparents did. Nothing on the menu is designed to impress a magazine.",
      },
      {
        heading: "Odeceixe — the day's quiet climax",
        body: "The Praia de Odeceixe is the natural border between Alentejo and Algarve — a rare place where a river (the Seixe) meets the ocean and splits the beach in two. Standing at the viewpoint above, you see both provinces in a single frame: calm river beach on one side, wild ocean on the other, cliffs on both ends. It's the reason we designed this day at all.",
      },
      {
        heading: "Aljezur, and the road back",
        body: "Aljezur is a Moorish hilltop town with the ruins of a 10th-century castle — the last layer of context before turning north. It's a small stop by design; by this point in the day you've absorbed a lot, and the drive back to Lisbon (about 2h30) is part of the experience, not something to minimise.",
      },
    ],
    ctaLead:
      "This is a long day (9–10h door to door) and worth every kilometre. Private car, licensed local host, lunch in Milfontes, Odeceixe as the finale — home to Lisbon by evening.",
    ctaLabel: "See the Southwest Vicentine Coast Signature",
    signatureSlug: "southwest-vicentine-coast",
    relatedSignatures: [
      { slug: "troia-comporta", label: "Tróia & Comporta" },
      { slug: "roman-heritage-alentejo", label: "Roman Heritage & Talha Wines" },
    ],
    datePublished: "2026-06-15",
    faq: [
      {
        q: "Is the Vicentine coast worth the drive from Lisbon?",
        a: "Yes, if you go private and treat the drive as part of the day. The Costa Vicentina is one of Europe's last undeveloped Atlantic coastlines — protected by law, virtually no resorts, and radically quieter than the Algarve an hour further south.",
      },
      {
        q: "How long is the day from Lisbon?",
        a: "9–10 hours door to door. About 2h15 to Porto Covo, then a slow linear route south to Odeceixe with a long lunch in Milfontes, and 2h30 back. Private car, licensed local host, hotel pickup and drop-off.",
      },
      {
        q: "What's the best month to visit the Vicentine coast?",
        a: "May–June and September–October are ideal — long light, warm sea, empty beaches. July–August is beautiful but busier in Milfontes and Odeceixe. Winter is dramatic and empty; the light is unmatched.",
      },
    ],
  },
  {
    slug: "roman-heritage-alentejo-talha-wines",
    title: "Roman Wines of Alentejo — A Local's Guide to Talha Wine Country",
    metaDescription:
      "The hidden Alentejo: São Cucufate Roman ruins, Vila Alva, and family-run talha wineries making wine in clay amphorae the Roman way. A local's guide from Lisbon.",
    h1: "The Roman Wines of Alentejo — Talha Country, a Local's Guide",
    eyebrow: "Alentejo · Wine · Heritage",
    standfirst:
      "Two thousand years of continuous winemaking in clay amphorae — a tradition kept alive by a handful of families in the villages south of Vidigueira. This is the day we designed around it.",
    sections: [
      {
        heading: "What talha wine actually is",
        body: "Talha wine is fermented and aged in large clay amphorae, buried in the ground or standing in cool cellars — the same method the Romans used across the Empire and the same method preserved almost exclusively today in a small triangle of Alentejo villages: Vila de Frades, Vila Alva, Vidigueira. Not stainless steel, not oak barrels, not modern concrete. Clay. When you taste one for the first time, it doesn't taste like any Alentejo wine you've had — it's fresher, more mineral, with a texture that comes from centuries of skin contact and slow settling.",
      },
      {
        heading: "São Cucufate — a Roman villa most travellers never see",
        body: "The Villa Romana de São Cucufate, near Vila de Frades, is one of the best-preserved Roman rural estates in the Iberian Peninsula — 1st to 4th century, later converted into a medieval monastery. The site tells the whole story of why wine ended up here at all: Roman legionaries settled this land specifically for grain, olives and wine. We visit with a licensed local host who works with the archaeological team and can walk you through the layers without a script.",
      },
      {
        heading: "The Talha Wine Interpretation Centre",
        body: "In Vila de Frades, a small interpretation centre explains the technique end-to-end: how the amphorae are made, how the pez (natural resin lining) is applied, how the wine ferments, and why San Martinho — 11 November — is the traditional first tasting day. It's a 30-minute stop, but it's the moment the winery visit that follows makes proper sense.",
      },
      {
        heading: "Adega Mestre Daniel — lunch in a family talha cellar",
        body: "This is the heart of the day. Mestre Daniel is one of the last families still fermenting exclusively in traditional talhas, and the visit is not a tourist tasting — it's lunch, in the cellar, with the family, at the family's pace. Traditional Alentejo dishes: migas, black pork, homemade bread, olive oil pressed within kilometres of the table. Wines drawn straight from the amphorae. Nobody rushes anyone. When we say slow, we mean the meal takes three hours, and that's the point.",
      },
      {
        heading: "A quiet river beach to finish",
        body: "If the season is right we finish at Albergaria dos Fusos, a small hidden river beach tucked into the countryside — a Portuguese habit foreign travellers rarely discover. Feet in the water, olive trees, no one else there. Then the drive back to Lisbon, which takes roughly 1h45.",
      },
    ],
    ctaLead:
      "This is one of the most unique wine days in Portugal — Roman ruins, ancient method, real family cellar, real long lunch. Private car, licensed local host, hotel pickup from Lisbon.",
    ctaLabel: "See the Roman Heritage & Talha Wines Signature",
    signatureSlug: "roman-heritage-alentejo",
    relatedSignatures: [
      { slug: "evora-alentejo-talhas", label: "Évora & Alentejo Signature" },
      { slug: "troia-comporta", label: "Tróia & Comporta" },
    ],
    datePublished: "2026-06-18",
    faq: [
      {
        q: "What is talha wine?",
        a: "Talha wine is wine fermented and aged in large clay amphorae, buried or standing — the method Romans used across the Empire. Today it survives almost exclusively in a handful of Alentejo villages (Vila de Frades, Vila Alva, Vidigueira), protected as a living cultural heritage.",
      },
      {
        q: "Is this day different from a standard Évora wine tour?",
        a: "Yes — completely. Évora tours visit large modern wineries and the city. This day goes deeper south into the villages, focuses on Roman heritage and a single family talha producer, and centres on a long cellar lunch rather than multiple quick tastings.",
      },
      {
        q: "How long is the day and what's the pace?",
        a: "About 10 hours door to door from Lisbon. Slow by design — one Roman site, one interpretation centre, one deep winery visit with a 2.5–3 hour lunch, and a river-beach or village stop to finish.",
      },
    ],
  },
  {
    slug: "is-a-wine-tour-from-lisbon-worth-it",
    title: "Is a Wine Tour from Lisbon Worth It? An Honest Local Answer",
    metaDescription:
      "Is a wine tour from Lisbon actually worth it? A local operator's honest answer — when it's brilliant, when it isn't, and how to choose the right day.",
    h1: "Is a Wine Tour from Lisbon Worth It?",
    eyebrow: "Lisbon · Wine",
    standfirst:
      "The short answer is yes — if you go private, go south, and skip the bus. Here is the longer one.",
    sections: [
      {
        heading: "The short answer",
        body: "Yes — a wine tour from Lisbon is one of the best days you can have in Portugal, provided you do it well. Within an hour of the city you have three serious wine regions (Setúbal, Palmela, Arrábida) and within two hours, Alentejo opens up. The mistake most travellers make is booking a 40-seat coach with three tastings and a buffet lunch. That is not a wine tour. That is a logistics exercise with wine in it.",
      },
      {
        heading: "When it's absolutely worth it",
        body: "When the day is private, paced, and built around one or two real wineries rather than five. When the lunch is sit-down, local, and lasts longer than the tastings. When the host is someone who actually knows the winemakers — not a driver reading a script. That is the day people remember a year later. It is also why our Arrábida wine Signature is our most-booked experience: it does exactly this, and nothing more.",
      },
      {
        heading: "When it isn't",
        body: "If you have one day in Lisbon and have never seen the city, do Lisbon. If you don't drink, a wine-led day will feel long. And if you are travelling on a group coach tour — skip it. The drive south is short but the experience compresses badly at scale. Better to wait for a private day, even if it means doing it on a different trip.",
      },
      {
        heading: "How to choose the right day",
        body: "Three honest questions: do you want wine, or wine and a view? Do you want one deep visit or a sampler? And do you want lunch to be the centre of the day, or a stop along the way? Arrábida answers the coast-and-view version. Alentejo answers the deep, slow, table-led version. If you are unsure, the Studio lets you build the day around your own answers — pace, stops, lunch, and how much driving you actually want.",
      },
    ],
    ctaLead:
      "Our Arrábida wine Signature is the day most guests are imagining when they ask this question — private, sit-down lunch, two family wineries, home by early evening.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "evora-alentejo-talhas", label: "Évora & Alentejo Signature" },
      { slug: "azeitao-cheese-wine", label: "Azeitão Cheese & Wine" },
    ],
    datePublished: "2026-06-10",
  },
  {
    slug: "best-wine-regions-near-lisbon",
    title: "The Best Wine Regions Near Lisbon — A Local's Guide",
    metaDescription:
      "Setúbal, Palmela, Arrábida, Alentejo — a local's guide to the best wine regions within reach of Lisbon, what each tastes like, and which suits your day.",
    h1: "The Best Wine Regions Near Lisbon",
    eyebrow: "Wine · Regions",
    standfirst:
      "Four regions, four very different days. How we choose between them when guests ask.",
    sections: [
      {
        heading: "Setúbal — the closest, the most underrated",
        body: "Twenty-five minutes south of Lisbon and almost no one outside Portugal knows the name. Setúbal is Moscatel country — fortified, aromatic, the kind of wine you keep thinking about a week later. The estates here are family-run, the tastings are quiet, and the drive in is along the Sado estuary. If you have half a day, this is the answer.",
      },
      {
        heading: "Palmela — reds with character",
        body: "Castelão is the grape that defines Palmela: dark, structured, a little wild. The cooperative tradition here means some of the best value bottles in Portugal come from this small region. We use Palmela as the second stop on a slower day — usually paired with a long lunch in a village that hasn't changed much in thirty years.",
      },
      {
        heading: "Arrábida — wine with a view",
        body: "Arrábida isn't only a wine region — it's a natural park dropping into the Atlantic. Vineyards sit between the mountain and the sea, the light is different here, and the lunch options (Sesimbra, Portinho) are some of the best on the coast. If you want one day that combines wine, scenery, and a proper Portuguese lunch by the water, this is it.",
      },
      {
        heading: "Alentejo — the deep one",
        body: "Ninety minutes east of Lisbon and the landscape changes completely: cork oaks, wheat plains, white villages, and wineries that have been making wine in clay amphorae (talhas) for two thousand years. Alentejo is a longer day — and a better one if you want to slow down properly. Évora makes the perfect base, and the wines (Antão Vaz, Aragonez, Trincadeira) reward the drive.",
      },
      {
        heading: "Which region for which traveller",
        body: "Short on time and want one beautiful day — Arrábida. Wine-obsessed and prepared to drive — Alentejo. First trip to Portugal and want something genuinely local without the distance — Setúbal and Palmela together. If you can't decide, the Studio lets you mix two regions across a slow day, or stretch it into a two-day private journey south.",
      },
    ],
    ctaLead:
      "Most guests start with our Arrábida wine Signature — the most-loved private day from Lisbon. If you want to design your own combination, the Studio is built for exactly that.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "evora-alentejo-talhas", label: "Évora & Alentejo Signature" },
      { slug: "azeitao-cheese-wine", label: "Azeitão Cheese & Wine" },
    ],
    datePublished: "2026-06-11",
  },
  {
    slug: "arrabida-vs-alentejo",
    title: "Arrábida vs Alentejo: Which Wine Region Should You Visit?",
    metaDescription:
      "Arrábida or Alentejo from Lisbon? A local's honest comparison — coast and Moscatel vs cork oaks and talhas — to help you pick the right wine day.",
    h1: "Arrábida vs Alentejo — Which Wine Region Should You Visit?",
    eyebrow: "Compare · Wine",
    standfirst:
      "Both are brilliant. They are also very different days. Here is how we help guests choose.",
    sections: [
      {
        heading: "What Arrábida feels like",
        body: "Arrábida is short and cinematic. Forty minutes from Lisbon, you are inside a natural park where the mountain falls into the Atlantic. The vineyards sit between the two — Moscatel de Setúbal, Castelão reds, a handful of small family estates. Lunch is by the water in Sesimbra or Portinho. You are home by early evening, slightly sun-tired, with a bottle in the boot.",
      },
      {
        heading: "What Alentejo feels like",
        body: "Alentejo is slower and quieter. Ninety minutes east of Lisbon the world opens up — cork oaks, wheat fields, white villages, almost no traffic. The wines are bigger, the lunches longer, and the tasting in a talha cellar (clay amphorae buried in the ground, used since Roman times) is something you simply cannot do in Arrábida. Évora itself is a UNESCO town worth two hours of slow walking.",
      },
      {
        heading: "Driving, pace, and how a day actually feels",
        body: "Arrábida: forty-minute transfer, two stops, long lunch, scenic coast drive home — about 8 hours door to door. Alentejo: ninety-minute transfer each way, fewer stops but deeper ones, slower lunch — closer to 10 hours and the right call only if you want the drive to be part of the day. Neither is better. They are answering different questions.",
      },
      {
        heading: "Our honest recommendation",
        body: "First trip to Portugal, one wine day, and you want the coast — Arrábida, every time. Second trip, more time, more curious about how Portugal made wine before glass bottles existed — Alentejo. Have two days? Do both, with a quiet night in Évora in between. That is the journey most wine-led guests end up wishing they had booked from the start.",
      },
    ],
    ctaLead:
      "If Arrábida is calling, the all-inclusive wine Signature is our most-loved version of this day. Want the Alentejo one? The Évora Signature does that, in the same private, slow rhythm.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [{ slug: "evora-alentejo-talhas", label: "Évora & Alentejo Signature" }],
    datePublished: "2026-06-12",
  },
  {
    slug: "best-wineries-near-lisbon",
    title: "Best Wineries Near Lisbon — Arrábida & Alentejo (by a Local)",
    metaDescription:
      "A local's guide to the best wineries near Lisbon — small Arrábida cellars, Setúbal Moscatel houses and Alentejo talha producers worth the drive.",
    h1: "The Best Wineries Near Lisbon",
    eyebrow: "Wine · Lisbon Region",
    standfirst:
      "The cellars we actually take guests to — small, family-run, and within an easy private drive of Lisbon.",
    sections: [
      {
        heading: "Arrábida: the coast that quietly makes great wine",
        body: "[Body copy to be supplied.]",
      },
      {
        heading: "Setúbal Moscatel — sweet, salty, and very Portuguese",
        body: "[Body copy to be supplied.]",
      },
      {
        heading: "Alentejo talha wines — buried clay, ancient method",
        body: "[Body copy to be supplied.]",
      },
      { heading: "How we choose which wineries to visit", body: "[Body copy to be supplied.]" },
    ],
    ctaLead:
      "Most of these wineries are part of our private Signature wine days — door-to-door from your Lisbon hotel, with a quiet long lunch in between.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [{ slug: "evora-alentejo-talhas", label: "Évora & Alentejo Signature" }],
    datePublished: "2026-06-30",
    faq: [
      {
        q: "What are the best wineries near Lisbon?",
        a: "For a private day from Lisbon we go to small Arrábida producers like Quinta de Catralvos and José Maria da Fonseca, Setúbal Moscatel houses such as Bacalhôa, and — if you have a full day — talha wineries near Évora in the Alentejo. They're family-run, quiet, and within an easy drive of the city.",
      },
      {
        q: "How far are the wineries from Lisbon?",
        a: "Arrábida and Setúbal are 40–50 minutes south of Lisbon by car. Évora and the Alentejo talha producers are about 1h20–1h40 east. Both make a comfortable private day with hotel pickup; the Alentejo is better as a longer day or an overnight.",
      },
      {
        q: "Is a private wine tour from Lisbon worth it?",
        a: "Yes if you want to visit small family cellars that don't take walk-ins, taste with the producer rather than a counter assistant, and have a proper long lunch in between. The price difference vs a coach tour buys you access, pace, and a licensed local guide.",
      },
      {
        q: "Arrábida or Alentejo — which wine region should I choose?",
        a: "Arrábida is closer, cooler, coastal, and pairs naturally with a beach or Setúbal seafood lunch. Alentejo is warmer, older, and the talha (clay-amphora) wines are unlike anything else in Portugal. If it's your first wine day from Lisbon, start with Arrábida.",
      },
    ],
  },
];

export const LOCAL_STORIES_ARTICLES_BY_SLUG: Record<string, LocalStoryArticle> = Object.fromEntries(
  LOCAL_STORIES_ARTICLES.map((a) => [a.slug, a]),
);

export function getLocalStoryArticle(slug: string): LocalStoryArticle | undefined {
  return LOCAL_STORIES_ARTICLES_BY_SLUG[slug];
}
