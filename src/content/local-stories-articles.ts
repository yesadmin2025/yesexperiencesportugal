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
  /** Optional ISO date for JSON-LD dateModified. Falls back to datePublished. */
  dateModified?: string;
  /** Optional absolute or root-relative hero image URL for og:image + JSON-LD.
   *  When absent, the matching Signature tour hero is used. */
  heroImage?: string;
  heroImageAlt?: string;
  /** Optional FAQ block — rendered on page AND emitted as FAQPage JSON-LD. */
  faq?: { q: string; a: string }[];

};

export const LOCAL_STORIES_ARTICLES: LocalStoryArticle[] = [
  {
    slug: "best-day-trips-from-lisbon",
    title: "Best Day Trips from Lisbon (by a Local) — Wine, Coast & Arrábida",
    metaDescription:
      "A local's guide to the best private day trips from Lisbon — Arrábida wine country, Sintra, Sesimbra and the wild south coast. Hotel pickup, instant confirmation.",
    h1: "Best Day Trips from Lisbon — by a Local",
    eyebrow: "Lisbon · Day Trips",
    standfirst:
      "Where we actually take friends when they visit — and which trips are worth the drive.",
    sections: [
      {
        heading: "Lisbon sits on a wide estuary, with very different landscapes within an hour.",
        body: "South, the Arrábida hills drop into the Atlantic. West, Sintra rises green and misty. The coast road to Cascais catches the evening light. Each direction is a short drive, but the mood changes completely. The right day trip depends on what you want to feel by lunchtime — palace gardens, wine country, or a wild beach with no plans.",
      },
      {
        heading: "South of the bridge, the city loosens.",
        body: "Cross the 25 de Abril Bridge and the road curves through cork and pine to the Arrábida Natural Park. The mountains meet a string of small, unguarded beaches. Setúbal is a working fishing city with a calm waterfront, grilled fish on the promenade, and the small cellars that make Moscatel de Setúbal. It is a slower day, built around wine, fish, and long views.",
      },
      {
        heading: "The palace-and-forest day, done early.",
        body: "Sintra is the day everyone has heard of. We prefer it early, before the main estates fill with buses. The Pena Palace sits above the treeline, the Quinta da Regaleira is a garden of grottoes and symbols, and the road west passes Cabo da Roca, Europe's westernmost point, before dropping to Cascais for late afternoon.",
      },
      {
        heading: "A picnic, a cove, and nowhere to be.",
        body: "For guests who want to move less and feel more, we head to the beaches below the Arrábida ridge. The water is cold, the cliffs are warm, and a long picnic turns the day into something quieter. It is the choice when the goal is to escape the city rather than tick off sights.",
      },
      {
        heading: "Pick the mood, not the itinerary.",
        body: "If palaces, forest, and a coastal road sound right, choose Sintra. If wine, fish, and a wild coastline sound right, choose Arrábida. If you want to do almost nothing in a beautiful place, choose the beach picnic. All three are within 90 minutes of Lisbon, and each can stand alone as a full day.",
      },
      {
        heading: "The difference is in the rhythm.",
        body: "Group tours cover the same ground, but they run on a fixed clock and a fixed menu. A private day means you choose when to stop, where to eat, and how long to stay. The route can flex — add a cellar, skip the busiest palace, or spend an hour on a beach you did not plan to find. That flexibility is what turns a day trip into a personal experience.",
      },
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
    slug: "private-driver-vs-self-driving-portugal",
    title: "Private Driver vs Self-Driving in Portugal — A Local's Take",
    metaDescription:
      "Hiring a private driver in Portugal vs renting a car — a Lisbon-based founder compares safety, local insight, cost, and the experience of each.",
    h1: "Private Driver vs Self-Driving in Portugal — A Local's Take",
    eyebrow: "Portugal · How to Travel",
    standfirst:
      "The question we hear most from planning travellers. Here is how we think about it.",
    sections: [
      {
        heading: "The decision is not really about the car.",
        body: "Most travellers frame it as a cost question: driver or rental. After ten years of designing private days across Portugal, we think it is a question of what kind of day you want to have. A rental car gives you control of the wheel. A private driver gives you control of the day — your attention, your timing, and the ability to be somewhere fully rather than navigating to it.",
      },
      {
        heading: "What a private driver gives you that a rental cannot.",
        body: "A good driver here is also a host. They know which winery is worth the detour, which coastal road is closed in winter, and where to stop for coffee that is not on any itinerary. They handle parking in Sintra, narrow village streets in Alentejo, and the sudden tolls that catch first-time visitors. More importantly, they free you to look out the window. Portugal is a country best seen, not navigated.",
      },
      {
        heading: "The self-drive case — and where it works.",
        body: "Renting a car makes sense when the route is simple, the pace is slow, and you genuinely enjoy driving. The Algarve coast between Tavira and Lagos, the flat roads of the Alentejo plains, or a single hop to Óbidos are all pleasant behind the wheel. If your plan is one town, a beach, and a relaxed schedule, a rental can be the right tool. The problems start when the day becomes ambitious.",
      },
      {
        heading: "Safety, parking, and the things maps do not show.",
        body: "Portuguese drivers are fast on motorways and patient in villages, but the roads change character quickly. GPS will send you down cobblestone lanes built for carts. It will suggest parking that does not exist in August. It will miss the sign for a closed pass in the Serra da Estrela. A local driver reads the road in real time and adjusts without stress.",
      },
      {
        heading: "Cost is closer than it looks.",
        body: "A rental rate is only the beginning. Add fuel, tolls, parking, insurance excess, and the occasional fine, then factor in the time spent navigating. A private day with YES includes the car, fuel, tolls, and a licensed local host. The difference is smaller than it appears, and the value shifts dramatically once you want to visit more than one place.",
      },
      {
        heading: "The YES way of doing it.",
        body: "We do not run a transfer service. Every private day is designed around the guest — the route, the stops, the rhythm, and the conversations along the way. Our hosts are licensed, insured, and chosen because they love this country and know how to share it. The car is simply the frame. The experience is the point.",
      },
    ],
    ctaLead:
      "If you would rather look out the window than at the GPS, our Signature experiences are fully private — one car, one host, one day shaped to you.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "sintra-cascais", label: "Sintra & Cascais Signature" },
      { slug: "troia-comporta", label: "Tróia & Comporta Signature" },
    ],
    datePublished: "2026-07-14",
    faq: [
      {
        q: "Is it worth hiring a private driver in Portugal?",
        a: "Yes, if your day involves more than one stop, rural roads, wine tasting, or any route where navigation would distract you from the landscape. The value is highest when the journey itself is part of the experience.",
      },
      {
        q: "Can I self-drive in Portugal as a foreigner?",
        a: "Yes. A valid licence from most countries is accepted for short visits. Roads are generally good, but narrow village streets, toll systems, and summer parking can be challenging for first-time visitors.",
      },
      {
        q: "Is a private driver more expensive than a rental car?",
        a: "The headline rate is higher, but once you include fuel, tolls, parking, and the time you spend navigating, the gap narrows. For multi-stop days, a private driver often delivers more value per hour.",
      },
    ],
  },
  {
    slug: "troia-comporta-guide",
    title: "Tróia & Comporta from Lisbon — A Local's Slow Alentejo Day",
    metaDescription:
      "Tróia, Comporta and the slow Alentejo coast — Roman ruins, sandy-soil wineries and untouched beaches. A local's guide to a private day south of Lisbon.",
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
      "The wild Vicentine coast from Lisbon — Porto Covo, Milfontes, Odeceixe. A local's guide to Portugal's hidden Atlantic between Alentejo and Algarve.",
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
  // -----------------------------------------------------------------------
  // Migrated from legacy top-level SEO landers (now 301-redirected here).
  // Copy preserved verbatim from each former lander's hero + body sections.
  // -----------------------------------------------------------------------
  {
    slug: "arrabida-day-trip-from-lisbon",
    title: "Arrábida Day Trip from Lisbon — Private Wine & Beaches",
    metaDescription:
      "Private Arrábida day trip from Lisbon — Setúbal market, family wineries in Azeitão and a long Portuguese lunch. Hotel pickup, English-speaking guide, instant confirmation.",
    h1: "Arrábida Day Trip from Lisbon — wine, hills & sea",
    eyebrow: "Lisbon · Arrábida Day",
    standfirst:
      "Setúbal market, family wineries in Azeitão, a long Portuguese lunch and an optional close above Sesimbra harbour.",
    sections: [
      {
        heading: "South of the bridge, forty minutes and a different country.",
        body: "Cross the 25 de Abril Bridge and the road curves through cork and pine into the Arrábida Natural Park — limestone mountains dropping straight into turquoise water, small unguarded beaches, and the wine village of Azeitão at its centre. It is the closest serious wine country to Lisbon, and the most under-the-radar.",
      },
      {
        heading: "Market, wineries, long lunch, viewpoint.",
        body: "We open at Setúbal's 145-year-old Livramento market, climb to two or three family wineries, and sit down for an unhurried Portuguese lunch in Azeitão. Optional close at Cristo Rei for the Lisbon panorama or Sesimbra Castle for Atlantic light.",
      },
      {
        heading: "A private car, your own pace.",
        body: "Group Arrábida tours typically stop at one winery and rush the lunch. Private means hotel pickup, your own driver-guide, and the choice of where to linger — an extra cellar, a swim at Galápos, or a longer walk on Sesimbra's castle walls.",
      },
    ],
    ctaLead:
      "This day lives inside our Arrábida Wine Signature — private from the start, paced around the long lunch, home to Lisbon by evening.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "arrabida-boat", label: "Arrábida by Boat" },
      { slug: "wild-beaches-picnic", label: "Wild Beaches & Picnic" },
      { slug: "azeitao-cheese", label: "Azeitão Cheese" },
    ],
    datePublished: "2026-07-01",
  },
  {
    slug: "arrabida-wine-tour",
    title: "Arrábida Wine Tour from Lisbon | Private Azeitão Day",
    metaDescription:
      "Private Arrábida wine day from Lisbon — three family cellars in Azeitão, Moscatel tasting, slow lunch. Hotel pickup, English-speaking guide, instant confirmation.",
    h1: "Arrábida Wine Tour — Azeitão & Setúbal, from Lisbon",
    eyebrow: "Arrábida · Private Wine Day",
    standfirst:
      "Three family wineries, the Setúbal market, a long Portuguese lunch — all on the cork-oak side of the Atlantic, with your own driver and guide.",
    sections: [
      {
        heading: "The closest serious wine country to Lisbon.",
        body: "Cross the 25 de Abril Bridge and forty minutes later the road climbs into the Arrábida hills. Cork oaks on one side, the Atlantic glinting on the other. At the centre is the village of Azeitão — home of Moscatel de Setúbal and small family wineries that have been pouring for seven generations. The Setúbal fish market, 145 years old, is fifteen minutes further down the coast.",
      },
      {
        heading: "Three cellars, one long lunch, no rush.",
        body: "We start at Setúbal's Livramento market — oysters, cheese, the first glass of Moscatel — then move between three family wineries in Azeitão, with a long traditional lunch in the middle. Optional close at Cristo Rei or Sesimbra Castle for Atlantic light at the end of the day. Pickup and drop-off at your Lisbon hotel; the driving is on us.",
      },
      {
        heading: "Private from the start. Real cellars. Designed live.",
        body: "We are a licensed Portuguese tour operator (RNAAT nº 31/2023), not a marketplace re-selling someone else's bus. Every day is private from the start — your group, your pace, your wineries. The cellars we use are ones we have personally worked with, where the family still pours. If a winery isn't open the day you want, we change it — the Studio shows you the alternative in real time, with price.",
      },
    ],
    ctaLead:
      "This is our most-booked private day. Reserve the Signature, or open the Studio and design the same day around your own preferences.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "azeitao-cheese", label: "Azeitão Cheese & Wine" },
      { slug: "arrabida-boat", label: "Arrábida by Boat" },
      { slug: "wild-beaches-picnic", label: "Wild Beaches & Picnic" },
    ],
    datePublished: "2026-07-02",
  },
  {
    slug: "sintra-day-tour-from-lisbon",
    title: "Sintra Day Tour from Lisbon — Private & Cabo da Roca",
    metaDescription:
      "Private Sintra day tour from Lisbon — quieter palaces, Cabo da Roca, Cascais and a small wine tasting. Hotel pickup, English-speaking guide, instant confirmation.",
    h1: "Private Sintra Day Tour from Lisbon — without the queues",
    eyebrow: "Lisbon · Private Sintra Day",
    standfirst:
      "Quieter palaces and forest paths, Cabo da Roca and Cascais, finishing with a small private wine tasting.",
    sections: [
      {
        heading: "Sintra is the day everyone has heard of.",
        body: "We prefer it early, before the main estates fill with buses. The Pena Palace sits above the treeline; Quinta da Regaleira is a garden of grottoes and symbols. From the hill the road runs west to Cabo da Roca, the westernmost point of mainland Europe, and drops to Cascais for late afternoon.",
      },
      {
        heading: "A working winery, not just the postcard list.",
        body: "Most Sintra day tours stop at the palaces and leave. We add a quiet tasting at Adega Regional de Colares — vines planted in Atlantic sand — and a lunch break above the cliffs at Azenhas do Mar. The mood matters as much as the monuments.",
      },
      {
        heading: "The train takes you to the town. We take you to the day.",
        body: "The Lisbon-to-Sintra train is fine for a half-day glance. A private day means hotel pickup, a single car between Sintra, Cabo da Roca and Cascais, and a licensed local guide who decides which estate to skip when the line is long.",
      },
    ],
    ctaLead:
      "This day lives inside our Sintra & Cascais Signature — reserve it, or open the Studio and tailor the palaces, lunch and Cascais close.",
    ctaLabel: "See the Sintra & Cascais Signature",
    signatureSlug: "sintra-cascais",
    relatedSignatures: [
      { slug: "arrabida-wine-allinclusive", label: "Arrábida Wine" },
      { slug: "wild-beaches-picnic", label: "Wild Beaches & Picnic" },
      { slug: "fatima-nazare-obidos", label: "Fátima · Nazaré · Óbidos" },
    ],
    datePublished: "2026-07-03",
    faq: [
      {
        q: "How long is a Sintra day tour from Lisbon?",
        a: "A full private day is about 8 hours door-to-door, with hotel pickup in Lisbon, two palaces or estates in Sintra, Cabo da Roca and a stop in Cascais before returning. We can shorten it to a half-day (~5 hours) on request.",
      },
      {
        q: "Is a private Sintra tour worth it vs the train?",
        a: "The Lisbon-to-Sintra train is fine for a half-day glance at the town. A private day means hotel pickup, a single car between Sintra, Cabo da Roca and Cascais, and a licensed local guide who decides which palace to skip when the queue is long — which matters in Sintra more than almost anywhere else in Portugal.",
      },
      {
        q: "Which palaces are included on the Sintra day tour?",
        a: "We typically visit two of: Pena Palace, Quinta da Regaleira, Monserrate and the National Palace of Sintra. The pair is chosen on the day based on opening times and crowds — your guide picks the calmest combination.",
      },
      {
        q: "Do you include Cabo da Roca and Cascais?",
        a: "Yes. After Sintra we drive west to Cabo da Roca — the westernmost point of mainland Europe — then down the Atlantic road to Cascais for late afternoon. A small private wine tasting at Adega Regional de Colares can be added on request.",
      },
      {
        q: "Where does the Sintra tour start and end?",
        a: "Hotel pickup and drop-off anywhere in central Lisbon, Cascais or Estoril is included. Pickups from Lisbon airport or cruise terminals can be arranged.",
      },
    ],
  },
  {
    slug: "portugal-wine-tours",
    title: "Portugal Wine Tours | Private Wine Days by YES Experiences",
    metaDescription:
      "Private wine days across Arrábida, Setúbal, Azeitão and Alentejo — small family cellars and slow lunches, designed with you. Hotel pickup from Lisbon, instant confirmation.",
    h1: "Portugal wine tours, poured properly.",
    eyebrow: "Portugal · Wine Tours",
    standfirst:
      "Small cellars, real winemakers, and a private day paced around lunch.",
    sections: [
      {
        heading: "Off the coach circuit.",
        body: "Portugal is a wine country before it's a beach country. Our private wine tours stay off the coach circuit — small cellars, working winemakers, and the kind of lunch that turns a tasting into a proper day.",
      },
      {
        heading: "Arrábida & Setúbal — the wine coast an hour from Lisbon.",
        body: "Moscatel de Setúbal, Castelão reds, and cellars perched between cork forest and Atlantic cliffs. Our home region — a private day here is what we do best.",
      },
      {
        heading: "Azeitão — a quieter cellar day: cheese, wine, and no queue.",
        body: "Azeitão's small artisan cheesemakers, a working family cellar, and a lunch table under grapevines. Slower, closer, and often the guest favourite.",
      },
      {
        heading: "Alentejo — Reserva reds under old olive trees.",
        body: "Two hours south, the Alentejo pours the country's most concentrated reds. Estates that don't take walk-ins, long lunches, and an afternoon in Évora on the way back.",
      },
      {
        heading: "One private car, one guide, one great cellar day.",
        body: "All-inclusive: transfers from your Lisbon hotel, tastings, lunch, and the guide who knows which cellar is pouring well this month.",
      },
    ],
    ctaLead:
      "Start with our most-booked wine day — the Arrábida Signature — or design your own combination in the Studio.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "evora-alentejo", label: "Évora & Alentejo Wine" },
      { slug: "azeitao-cheese", label: "Azeitão Cheese & Wine" },
    ],
    datePublished: "2026-07-04",
  },
  {
    slug: "wine-tours-lisbon",
    title: "Private Wine Tours from Lisbon | Arrábida and Alentejo by YES",
    metaDescription:
      "Private wine tours from Lisbon — Arrábida, Setúbal, Comporta and Alentejo. Real family cellars, no group buses. Booked with a licensed local operator.",
    h1: "The Best Wine Tours from Lisbon — Arrábida, Comporta & Alentejo",
    eyebrow: "Lisbon · Private Wine Days",
    standfirst:
      "Three real wine regions within reach of your hotel. Family producers, long Portuguese lunches, your own driver and guide.",
    sections: [
      {
        heading: "Three wine regions, all reachable in a day.",
        body: "Lisbon sits between two serious wine countries. Forty minutes south across the 25 de Abril bridge are the Arrábida hills and Azeitão — Moscatel de Setúbal country, small whitewashed family wineries, the Atlantic just below. An hour and a half east lies the Alentejo plain, with the walled town of Évora at its centre. We design private wine days in both, and we drive you door to door.",
      },
      {
        heading: "Private. Local. Designed live, not booked off a shelf.",
        body: "We are a licensed Portuguese tour operator (RNAAT nº 31/2023), not a marketplace reselling someone else's bus tour. Every day is private from the start: your group, your pace, your wineries. We open the wineries we have personally worked with — the cellars where the family pours, not a tasting-room queue — and we sit you at a long lunch that takes as long as it should.",
      },
      {
        heading: "Real Signature wine days.",
        body: "Arrábida Wine — All Inclusive (8h): Setúbal's 145-year-old market for oysters and Moscatel, three family wineries in Azeitão, traditional Portuguese lunch, panoramic close at Cristo Rei or Sesimbra. Évora & Alentejo Wine (11h): the walled town of Évora — Roman temple, bone chapel — then two Alentejo wineries with a long lunch under the cork oaks, on the way back to Lisbon. Azeitão Cheese & Wine (half day): a morning with a 7th-generation Azeitão cheesemaker, paired with the local Moscatel — a calm, intimate alternative to a full wine day.",
      },
    ],
    ctaLead:
      "Reserve a Signature, or open the Studio and design your own wine day — route, wineries, lunch, and close.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "evora-alentejo", label: "Évora & Alentejo Wine" },
      { slug: "azeitao-cheese", label: "Azeitão Cheese & Wine" },
    ],
    datePublished: "2026-07-05",
  },
  {
    slug: "private-wine-tour-lisbon",
    title: "Private Wine Tour from Lisbon — Arrábida, Azeitão & Setúbal",
    metaDescription:
      "Private wine tour from Lisbon to Arrábida and Azeitão — two or three family wineries, a long Portuguese lunch and door-to-door driving.",
    h1: "Private Wine Tour from Lisbon — Arrábida & Azeitão",
    eyebrow: "Lisbon · Private Wine Day",
    standfirst:
      "Two or three family wineries, a long Portuguese lunch and a panoramic close — handled door to door from Lisbon.",
    sections: [
      {
        heading: "The closest serious wine country to Lisbon.",
        body: "Cross the 25 de Abril Bridge and within forty minutes the road climbs into the Arrábida hills. Cork oaks, low whitewashed wineries, and the Atlantic glinting below. Azeitão is the village at the centre — home to Moscatel de Setúbal and small family producers who have been pouring for seven generations.",
      },
      {
        heading: "Two or three wineries, one long lunch, no rush.",
        body: "We start with Setúbal's 145-year-old Livramento market — oysters, cheese, the first glass of Moscatel — then move between family wineries with a long traditional lunch in Azeitão in the middle. Optional close at Cristo Rei or Sesimbra Castle for Atlantic light. Pickup and drop-off at your Lisbon hotel; the driving is on us.",
      },
      {
        heading: "Your own pace, your own pours.",
        body: "Group wine tours run on a fixed clock and a fixed cellar list. A private day means you choose how long to linger at each table, which wineries to add, and whether to end the day on a viewpoint or back in the city for dinner.",
      },
    ],
    ctaLead:
      "This is the day most guests are imagining when they ask about a wine tour from Lisbon — reserve the Signature, or tailor the wineries and close in the Studio.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "azeitao-cheese", label: "Azeitão Cheese" },
      { slug: "arrabida-boat", label: "Arrábida by Boat" },
      { slug: "wild-beaches-picnic", label: "Wild Beaches & Picnic" },
    ],
    datePublished: "2026-07-06",
  },
  {
    slug: "alentejo-wine-tour-from-lisbon",
    title: "Alentejo Wine Tour from Lisbon | Private Évora & Cork",
    metaDescription:
      "Private Alentejo wine tour from Lisbon — Évora's UNESCO old town, two family wineries and a cork stop, with a long Alentejo lunch. Door-to-door.",
    h1: "Alentejo Wine Tour from Lisbon — wine, cork & Évora",
    eyebrow: "Lisbon · Alentejo wine country",
    standfirst:
      "Two family wineries, a cork tradition stop and Évora's UNESCO old town — at the unhurried pace of Alentejo.",
    sections: [
      {
        heading: "Portugal's most underrated wine region — and the slowest.",
        body: "Alentejo is plains, cork oaks and family-run wineries that still make wine the way their grandparents did. It is also where most of the world's cork is born. From Lisbon it is a long day, not a short one — which is exactly why it stays quiet.",
      },
      {
        heading: "Cork, two wineries, Évora old town, long lunch.",
        body: "We open with a cork tradition stop, taste at two family wineries — one with restaurant, one with cellars — and walk Évora's cobbled centre past the Roman Temple and the Chapel of Bones. Lunch is unhurried, somewhere local, somewhere honest.",
      },
      {
        heading: "Your driver-guide, your pace.",
        body: "Hotel pickup in Lisbon, a comfortable car, and the freedom to linger an extra glass at a cellar you like or skip a stop you don't. The route is built around you — not a coach schedule.",
      },
    ],
    ctaLead:
      "This day lives inside our Évora & Alentejo Signature — reserve it, or tailor the wineries and Évora time in the Studio.",
    ctaLabel: "See the Évora & Alentejo Signature",
    signatureSlug: "evora-alentejo",
    relatedSignatures: [
      { slug: "roman-heritage-alentejo", label: "Roman Heritage & Talha Wines" },
      { slug: "troia-comporta", label: "Tróia & Comporta" },
    ],
    datePublished: "2026-07-07",
  },
  {
    slug: "evora-alentejo-wine-tour",
    title: "Évora & Alentejo Wine Tour | Private Full-Day from Lisbon",
    metaDescription:
      "A private full day from Lisbon combining Évora's UNESCO old town, two family Alentejo wineries and a cork tradition stop — unhurried, door-to-door.",
    h1: "Évora & Alentejo Wine Tour — one private full day",
    eyebrow: "Lisbon · Évora & Alentejo",
    standfirst:
      "UNESCO heritage, cork traditions, local wines and a route designed around you — from Lisbon, for one day, at your pace.",
    sections: [
      {
        heading: "Évora and Alentejo, in one day from Lisbon.",
        body: "Évora is the UNESCO-listed capital of Alentejo — Roman Temple, Chapel of Bones, narrow lanes. Around it stretches cork-oak country and some of Portugal's most honest family wineries. Done privately, the two fit comfortably into a single full day.",
      },
      {
        heading: "Cork, wine, heritage, lunch.",
        body: "A cork tradition stop, two family wineries, a walk through Évora's old town with the Roman Temple and Chapel of Bones, and a long Alentejo lunch. The route flexes — fewer stops, deeper ones, or the opposite, depending on what you want.",
      },
      {
        heading: "Reviewed across independent travel guides.",
        body: "The Évora & Alentejo wine experience YES Experiences Portugal operates has been compared, ranked and reviewed by independent travel guides covering full-day tours from Lisbon.",
      },
    ],
    ctaLead:
      "Reserve the Évora & Alentejo Signature, or design your own Alentejo day in the Studio.",
    ctaLabel: "See the Évora & Alentejo Signature",
    signatureSlug: "evora-alentejo",
    relatedSignatures: [
      { slug: "roman-heritage-alentejo", label: "Roman Heritage & Talha Wines" },
      { slug: "troia-comporta", label: "Tróia & Comporta" },
    ],
    datePublished: "2026-07-08",
  },
  {
    slug: "evora-private-tour-from-lisbon",
    title: "Private Évora Day Tour from Lisbon — UNESCO & Alentejo",
    metaDescription:
      "Private Évora tour from Lisbon — the Roman Temple, Chapel of Bones, two family wineries and a cork tradition stop, with an unhurried Alentejo lunch.",
    h1: "Private Évora Tour from Lisbon — heritage, wine & cork",
    eyebrow: "Lisbon · Évora private day",
    standfirst:
      "Évora's UNESCO centre, two family wineries and a cork tradition stop — a private day across Alentejo at the pace of a long lunch.",
    sections: [
      {
        heading: "Ninety minutes south, two thousand years deep.",
        body: "Évora is a small UNESCO World Heritage city in the heart of Alentejo — Roman Temple, cathedral, narrow lanes and the famous Chapel of Bones, all walkable in an afternoon. From Lisbon it is an easy private drive across cork-oak country.",
      },
      {
        heading: "Roman temple, two wineries, a cork stop, long lunch.",
        body: "We walk the old town with a local guide, visit two family wineries — one of them with a restaurant — and add a cork tradition stop so you see where Portuguese cork actually comes from. Lunch is Alentejo-slow, plates shared, wine local.",
      },
      {
        heading: "No coach, no rush, no fixed script.",
        body: "Hotel pickup, your own driver-guide, your own car. Stay longer in the cathedral cloister, skip a winery, add an extra glass — the day moves with you, not with thirty strangers.",
      },
    ],
    ctaLead:
      "This day lives inside our Évora & Alentejo Signature — reserve it, or tailor the wineries and Évora time in the Studio.",
    ctaLabel: "See the Évora & Alentejo Signature",
    signatureSlug: "evora-alentejo",
    relatedSignatures: [
      { slug: "roman-heritage-alentejo", label: "Roman Heritage & Talha Wines" },
      { slug: "troia-comporta", label: "Tróia & Comporta" },
    ],
    datePublished: "2026-07-09",
  },
];

export const LOCAL_STORIES_ARTICLES_BY_SLUG: Record<string, LocalStoryArticle> = Object.fromEntries(
  LOCAL_STORIES_ARTICLES.map((a) => [a.slug, a]),
);

export function getLocalStoryArticle(slug: string): LocalStoryArticle | undefined {
  return LOCAL_STORIES_ARTICLES_BY_SLUG[slug];
}
