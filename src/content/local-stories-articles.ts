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
  /** Optional related-read links (any internal path) rendered in the aside. */
  relatedReads?: { path: string; label: string }[];
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
    relatedReads: [
      { path: "/local-stories/what-to-do-in-sesimbra", label: "Things to do in Sesimbra" },
      { path: "/local-stories/arrabida-vs-sintra", label: "Arrábida vs Sintra" },
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
      {
        heading: "What Arrábida feels like",
        body: "Arrábida feels open, bright and unhurried. The road crosses vineyards and cork-oak countryside before climbing into a natural park where the mountains fall directly towards the Atlantic.\n\nA typical day can combine a local market, family wineries, a long Portuguese lunch, viewpoints and the fishing towns of Setúbal or Sesimbra. The experience is shaped less by famous monuments and more by landscape, food, wine and the freedom to stop when somewhere feels right.\n\nArrábida suits travelers who want to escape the city rather than replace it with another crowded attraction. It is especially rewarding for guests interested in local producers, coastal scenery and a slower rhythm.",
      },
      {
        heading: "What Sintra feels like",
        body: "Sintra feels theatrical, historic and slightly mysterious. Forested hills surround palaces, gardens and old estates, while mist and changing light give the landscape a character unlike anywhere else near Lisbon.\n\nThe main attractions are internationally famous, particularly Pena Palace and Quinta da Regaleira. A well-designed private day can also continue through the Sintra-Cascais Natural Park, Cabo da Roca and the coast towards Cascais.\n\nSintra suits travelers drawn to architecture, royal history, gardens and dramatic scenery. It is more monument-focused than Arrábida and generally requires greater planning because entrance times, traffic and visitor numbers influence the rhythm of the day.",
      },
      {
        heading: "Crowds, driving time, pace",
        body: "Both regions are accessible from Lisbon, but they behave very differently once the day begins. Sintra attracts large numbers of visitors, particularly around its principal palaces. Starting early, reserving timed entrance tickets and planning the route carefully can make a substantial difference.\n\nArrábida usually feels less pressured. Driving times between wineries, viewpoints and coastal stops are manageable, and the day can remain flexible. There is more freedom to extend lunch, add a tasting or spend longer beside the sea.\n\nSintra rewards structure. Arrábida rewards spontaneity. Neither is automatically better, but the preferred pace should influence the choice as much as the list of places to visit.",
      },
      {
        heading: "Our honest take",
        body: "Choose Sintra when palaces, gardens and Portuguese royal history are essential to your trip. It is one of the country's most remarkable destinations and deserves to be experienced properly rather than rushed between compulsory photographs.\n\nChoose Arrábida when you want wine, local food, Atlantic scenery and a day that can adapt as it unfolds. It is quieter, more personal and still unfamiliar to many international visitors.\n\nFor a first visit to Portugal, Sintra may feel unavoidable. For travelers who already know the famous sights, or who simply prefer authentic local experiences to crowded landmarks, Arrábida is often the more memorable surprise.",
      },
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
    title: "Setúbal Wine Country Guide | Moscatel & Wineries",
    metaDescription:
      "Explore Setúbal wine country near Lisbon, from Moscatel and Azeitão cheese to family wineries, Arrábida landscapes and coastal lunches.",
    h1: "Setúbal Wine Country — A Local's Guide",
    eyebrow: "Setúbal · Wine",
    standfirst:
      "Twenty minutes south of Lisbon, a wine region most travelers still miss. Here is what to taste, and where.",
    sections: [
      {
        heading: "Why Setúbal is different",
        body: "Setúbal feels remarkably removed from Lisbon despite being close enough for an easy private day trip. Vineyards stretch between the limestone hills of Arrábida, the plains around Palmela and the Atlantic coast. The sea influences the climate, while the soils and sheltered valleys allow local grape varieties to develop with freshness and character.\n\nIt is also a working wine region rather than a destination built only for visitors. Family producers, historic estates and small cellars still form part of everyday life. Tastings are usually relaxed, lunches are long and the landscape changes continually between vines, cork oaks, fishing towns and sea views. For travelers who want Portuguese wine without losing an entire day to driving, Setúbal is one of the most rewarding regions near Lisbon.",
      },
      {
        heading: "Moscatel de Setúbal, explained simply",
        body: "Moscatel de Setúbal is the region's most distinctive wine. It is made mainly from aromatic Muscat grapes and fortified during fermentation, preserving natural sweetness while developing greater depth as it ages.\n\nYou may find aromas of orange blossom, citrus peel, honey, dried apricot, spices and roasted nuts. Older examples can become darker, richer and unexpectedly complex. Despite the sweetness, good Moscatel keeps enough acidity to feel balanced rather than heavy.\n\nLocally, it may be served after lunch, alongside dessert or with the strong, buttery character of Azeitão cheese. Even guests who normally avoid sweet wines are often surprised by how fresh and expressive Moscatel de Setúbal can be.",
      },
      {
        heading: "The wineries we love",
        body: "The most memorable wineries are not necessarily the largest or the most photographed. We look for producers where the tasting still feels personal, the wines express the region and the people hosting genuinely understand what is inside each bottle.\n\nSome estates have centuries of history. Others are small family projects working with local grapes, limited production and a more contemporary approach. The best visits allow enough time to understand the vineyards, the cellar and the choices made by the winemaker rather than moving guests rapidly through a standard tasting.\n\nAvailability changes throughout the year, so we select wineries according to the day, the guests and the style of wine they are most interested in discovering.",
      },
      {
        heading: "What to pair it with",
        body: "Setúbal wine makes most sense when experienced with the food and landscape that surround it. Azeitão cheese is the classic local pairing, particularly with Moscatel, but the region also offers excellent bread, olive oil, seafood and grilled fish.\n\nSetúbal itself is known for its fishing tradition, while Sesimbra and Portinho da Arrábida offer coastal lunches where the setting becomes part of the experience. A dry white can work beautifully with fresh fish, while local reds pair naturally with meat, richer dishes and aged cheese.\n\nThe point is not to rush from tasting to tasting. A good Setúbal wine day leaves room for lunch, conversation and the pleasure of understanding why the wines taste as they do here. If you are choosing where to start, our guide to the [best wine tasting near Lisbon](/local-stories/best-wine-tasting-near-lisbon) compares Azeitão, Setúbal and Arrábida side by side.",
      },
    ],
    ctaLead:
      "We bring guests into these cellars on a private, all-inclusive day — wine, lunch, and the Arrábida coast on the way home.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedReads: [
      { path: "/local-stories/arrabida-wine-tour", label: "Arrábida wine tour from Lisbon" },
      { path: "/tours/arrabida-wine-allinclusive", label: "Arrábida Wine — All Inclusive" },
      { path: "/local-stories/best-wineries-near-lisbon", label: "Best wineries near Lisbon" },
      { path: "/local-stories/what-to-do-in-sesimbra", label: "Things to do in Sesimbra" },
    ],
    datePublished: "2026-06-03",
  },
  {
    slug: "what-to-do-in-sesimbra",
    title: "Things to Do in Sesimbra: A Local's Day Guide (2026)",
    metaDescription:
      "Things to do in Sesimbra, by locals who live here: castle viewpoint, harbour seafood lunch, wild Arrábida coves, when to go, and the 40-minute drive from Lisbon.",


    h1: "Things to Do in Sesimbra, Portugal — A Fishing Town Worth the Drive",
    eyebrow: "Sesimbra · Coast",
    standfirst:
      "Sesimbra is our home town, 40 minutes south of Lisbon. The short answer: the castle viewpoint, the harbour, a long seafood lunch and a wild Arrábida cove — half a day for the town, a full day with the coast.",
    sections: [
      {
        heading: "Sesimbra harbour and the castle viewpoint",

        body: "Sesimbra still feels like a fishing town because fishing remains part of its daily life. Boats return to the harbour, seafood restaurants prepare the morning’s catch, and the waterfront becomes livelier as families arrive for lunch and an evening walk beside the beach.\n\nAbove the town, Sesimbra Castle looks across the roofs, the bay and the surrounding hills. The climb reveals how naturally the town is protected between the sea and the Arrábida landscape. Closer to the water, the old centre is compact and easy to explore on foot.\n\nSesimbra is not a place built around a checklist of monuments. Its appeal lies in watching the harbour, walking through the narrow streets and allowing the pace of the coast to replace the rhythm of Lisbon.",
      },
      {
        heading: "Where to eat in Sesimbra — the harbour fish lunch",
        body: "In Sesimbra, lunch should begin with the fish rather than with a restaurant ranking. Many menus depend on what arrived at the harbour, so the best choice may be grilled sea bass, sea bream, cuttlefish or another local catch simply prepared with olive oil, garlic, potatoes and vegetables.\n\nThe restaurants along the waterfront are convenient, but smaller streets behind the main promenade also hide long-established local places. We usually look for a dining room where Portuguese families are eating, the fish is shown clearly and nobody is attempting to rush the table.\n\nA Sesimbra lunch is part of the day, not an interruption between activities. Leave time for it. The sea view, conversation and unhurried service are part of what makes the town worth visiting.",
      },
      {
        heading: "Best beaches near Sesimbra, inside the Arrábida park",
        body: "Beyond Sesimbra, the Arrábida coast becomes quieter and more dramatic. Limestone hills descend towards clear Atlantic water, creating coves and beaches protected by the natural park.\n\nSome beaches are easily reached, while others require a short walk, seasonal transport or local knowledge. Conditions also change throughout the year, so the right stop depends on weather, access and how much time guests want to spend by the sea.\n\nThe water can be cold even in summer, but the landscape is exceptional. A beach stop here is less about organised entertainment and more about swimming, walking, watching the cliffs and enjoying a part of the Portuguese coast that still feels remarkably untouched.",
      },
      {
        heading: "How to get to Sesimbra from Lisbon (about 40 minutes by car)",
        body: "Sesimbra sits roughly 40 kilometres south of Lisbon. By car it is usually around 40 minutes, crossing the 25 de Abril bridge and then turning off towards the Arrábida hills — the last stretch drops down to the sea and is the best part of the drive.\n\nPublic transport is possible via bus from Lisbon, but connections are limited and the wild beaches inside the natural park are difficult to reach without a car. Most travelers who want the coast as well as the town end up driving or booking a private day.\n\nIf you would rather not drive, Sesimbra is part of our [Wild Beaches & Picnic Signature](/tours/wild-beaches-picnic), and it can also close an [Arrábida private wine day](/tours/arrabida-wine-allinclusive) with Atlantic light over the harbour.",
      },
      {
        heading: "A half-day in Sesimbra, if you have less time",
        body: "Sesimbra also works well when a full sightseeing day feels unnecessary. A relaxed half-day can include a coastal drive through Arrábida, time beside the harbour, a walk through the old centre and a long seafood lunch.\n\nIt is particularly suitable for travelers staying in Lisbon who want to see another side of the region without beginning early or returning late. The town offers enough to feel like a genuine escape, but not so much that the visit becomes another demanding itinerary.\n\nFor a slower version, combine Sesimbra with a viewpoint or quiet beach. For a fuller day, add wineries in Azeitão or Setúbal — our guide to the [best wine tasting near Lisbon](/local-stories/best-wine-tasting-near-lisbon) compares them, and you can shape either version yourself in the [Experience Studio](/studio-v3).",
      },
      {
        heading: "Best time to visit Sesimbra, and how long you need",
        body: "Half a day is enough for the town itself: the harbour, the old centre, the castle viewpoint and lunch. A full day is what you need if you also want the Arrábida coast, a swim and an unhurried table by the sea.\n\nLate spring and early autumn are our favourite windows — the light is soft, the sea is calm enough for the coves and the restaurants are busy with locals rather than queues. July and August bring the warmest water and the busiest access roads inside the natural park, so early starts matter. In winter Sesimbra stays open and working; you trade swimming for empty streets and dramatic Atlantic weather.\n\nBring shoes you can walk a slope in for the castle, and remember that some beaches inside the park have seasonal access rules. If a beach is closed or crowded on the day, the coast has enough alternatives — knowing which one is open is the part that is hard from a guidebook.",
      },
      {
        heading: "Sesimbra day trips from Lisbon — see it on a private day",
        body: "If you would rather not drive, park or guess which cove is accessible, we run Sesimbra and the Arrábida coast as private days from Lisbon.\n\nThe [Wild Beaches & Picnic private day](/tours/wild-beaches-picnic) is the coastal version: Arrábida viewpoints, a quiet beach and a picnic by the sea. The [Arrábida Wine private day](/tours/arrabida-wine-allinclusive) pairs Azeitão cellars and lunch with coastal Sesimbra light on the way home. Both are private to your party, with door-to-door pickup in Lisbon.\n\nIf neither shape is quite yours, design your own in the [Experience Studio](/studio-v3) — you choose the feeling and the rhythm, and the day is built around it. See all [private day tours from Lisbon](/experiences) for the full collection.",
      },
    ],
    ctaLead:
      "Most guests reach Sesimbra through our Wild Beaches & Picnic Signature — a slow, private day on the Arrábida coast.",
    ctaLabel: "See the Wild Beaches Signature",
    signatureSlug: "wild-beaches-picnic",
    relatedSignatures: [
      { slug: "wild-beaches-picnic", label: "Wild Beaches & Picnic Signature" },
      { slug: "arrabida-wine-allinclusive", label: "Arrábida Wine Signature" },
    ],
    relatedReads: [
      { path: "/tours/wild-beaches-picnic", label: "Wild Beaches & Picnic — private day" },
      { path: "/tours/arrabida-wine-allinclusive", label: "Arrábida Wine — All Inclusive" },
      { path: "/local-stories/best-day-trips-from-lisbon", label: "Best day trips from Lisbon" },
      { path: "/local-stories/best-wine-tasting-near-lisbon", label: "Where to taste wine near Lisbon" },
    ],

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
      {
        heading: "What 'private' actually means",
        body: "A private tour should mean more than traveling in a smaller vehicle. The guide, transport and route are reserved for your party, but the real difference is control over the rhythm of the day.\n\nThere is no need to wait for other guests, return to a meeting point or follow a schedule designed around a large group. Stops can last longer when they are interesting and be shortened when they are not. Lunch can suit your preferences, and the route can adapt to weather, energy levels and unexpected discoveries.\n\nPrivacy also creates space for conversation. Guests can ask detailed questions, change direction and experience Portugal through their own interests rather than through a fixed script prepared for everyone.",
      },
      {
        heading: "What you pay for, and what you don't",
        body: "A private experience usually costs more per person because the vehicle, guide and operating time are not divided among a large group. The value lies in exclusivity, flexibility and the ability to shape the day around a small number of travelers.\n\nYou are not necessarily paying for more attractions. You are paying to avoid unnecessary waiting, generic stops, fixed restaurants and a timetable designed for thirty unrelated people.\n\nA well-designed private day should also explain clearly what is included. Transport, tastings, meals, admission tickets and activities vary between experiences. The important comparison is not simply the headline price, but what the day contains, how personal it is and how much of your limited holiday time is used well.",
      },
      {
        heading: "Where group tours still make sense",
        body: "Group tours can be the sensible choice for solo travelers, guests with a limited budget or visitors who want a straightforward introduction without needing much flexibility.\n\nThey also work well when the main goal is reaching one famous monument or destination and the traveler is comfortable following a fixed schedule. A reputable small-group tour may offer good information, convenient transport and the social element of meeting other people.\n\nThe compromise is usually pace. Departure times, lunch stops and the length of each visit must serve the whole group. For some travelers that structure is reassuring. For others, it is precisely what they hoped to escape while on holiday.",
      },
      {
        heading: "Our rule of thumb",
        body: "Choose a group tour when price matters most, the route is simple and you are happy for someone else to determine the schedule.\n\nChoose a private tour when time, comfort and flexibility matter more. It is especially valuable for families, couples celebrating something important, groups of friends and travelers with specific interests or mobility considerations.\n\nPrivate touring also becomes more economical as the number of guests increases because the cost of the vehicle and guide is shared within the party.\n\nThe best option is not automatically the most expensive one. It is the format that matches the way you actually like to travel, rather than the way a generic itinerary assumes you should.",
      },
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
      "Tróia, Comporta and the slow Alentejo coast — Roman ruins, sandy-soil wineries and untouched beaches. A local's guide to a private day south of Lisbon.",
    h1: "Tróia & Comporta — Beaches, Ruins and Slow Alentejo Days",
    eyebrow: "Tróia · Comporta · Alentejo",
    standfirst:
      "A ferry, a Roman fish-salting complex, a wooden pier on stilts, and one of Europe's most unusual wine terroirs — all in a single private day from Lisbon.",
    sections: [
      {
        heading: "Crossing to Tróia — Lisbon behind, another Portugal ahead",
        body: "The day begins with a short ferry over the Sado estuary. It sounds banal on paper. In practice, it's the moment the trip changes register: bottlenose dolphins live in this estuary year-round, the Serra da Arrábida drops behind you, and by the time you step off on the Tróia side you're in a landscape most travelers never see. This is not Algarve, and it is not Lisbon. It is the Alentejo coast — quieter, sandier, older.",
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
      "Between Alentejo and Algarve there is a coastline most travelers never see — protected, empty, cinematic. Here is how we spend a day inside it.",
    sections: [
      {
        heading: "Why this coast still feels secret",
        body: "The Parque Natural do Sudoeste Alentejano e Costa Vicentina protects roughly 120 kilometres of Atlantic coastline south of Sines. Development is capped by law: no high-rises, no beachfront resorts, no marinas. The result is a landscape that looks the way the Algarve looked in the 1970s — whitewashed villages, cliffs, coves reached on foot, and a light most travelers associate with Greece rather than Portugal.",
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
        heading: "São Cucufate — a Roman villa most travelers never see",
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
        body: "If the season is right we finish at Albergaria dos Fusos, a small hidden river beach tucked into the countryside — a Portuguese habit foreign travelers rarely discover. Feet in the water, olive trees, no one else there. Then the drive back to Lisbon, which takes roughly 1h45.",
      },
    ],
    ctaLead:
      "This is one of the most unique wine days in Portugal — Roman ruins, ancient method, real family cellar, real long lunch. Private car, licensed local host, hotel pickup from Lisbon.",
    ctaLabel: "See the Roman Heritage & Talha Wines Signature",
    signatureSlug: "roman-heritage-alentejo",
    relatedSignatures: [
      { slug: "evora-alentejo", label: "Évora & Alentejo Signature" },
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
        body: "Yes — a wine tour from Lisbon is one of the best days you can have in Portugal, provided you do it well. Within an hour of the city you have three serious wine regions (Setúbal, Palmela, Arrábida) and within two hours, Alentejo opens up. The mistake most travelers make is booking a 40-seat coach with three tastings and a buffet lunch. That is not a wine tour. That is a logistics exercise with wine in it.",
      },
      {
        heading: "When it's absolutely worth it",
        body: "When the day is private, paced, and built around one or two real wineries rather than five. When the lunch is sit-down, local, and lasts longer than the tastings. When the host is someone who actually knows the winemakers — not a driver reading a script. That is the day people remember a year later. It is also why our Arrábida wine Signature is our most-booked experience: it does exactly this, and nothing more.",
      },
      {
        heading: "When it isn't",
        body: "If you have one day in Lisbon and have never seen the city, do Lisbon. If you don't drink, a wine-led day will feel long. And if you are traveling on a group coach tour — skip it. The drive south is short but the experience compresses badly at scale. Better to wait for a private day, even if it means doing it on a different trip.",
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
      { slug: "evora-alentejo", label: "Évora & Alentejo Signature" },
      { slug: "azeitao-cheese", label: "Azeitão Cheese & Wine" },
    ],
    datePublished: "2026-06-10",
  },
  {
    slug: "best-wine-regions-near-lisbon",
    title: "Best Wine Regions Near Lisbon | Arrábida, Setúbal & Alentejo",
    metaDescription:
      "Compare the best wine regions near Lisbon, including Arrábida, Setúbal and Alentejo, with local advice on distance, style and the right day trip.",
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
        heading: "Which region for which traveler",
        body: "Short on time and want one beautiful day — Arrábida. Wine-obsessed and prepared to drive — Alentejo. First trip to Portugal and want something genuinely local without the distance — Setúbal and Palmela together. If you can't decide, the Studio lets you mix two regions across a slow day, or stretch it into a two-day private journey south.",
      },
    ],
    ctaLead:
      "Most guests start with our Arrábida wine Signature — the most-loved private day from Lisbon. If you want to design your own combination, the Studio is built for exactly that.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "evora-alentejo", label: "Évora & Alentejo Signature" },
      { slug: "azeitao-cheese", label: "Azeitão Cheese & Wine" },
    ],
    relatedReads: [
      { path: "/local-stories/wine-tours-lisbon", label: "Wine tours from Lisbon" },
      { path: "/local-stories/arrabida-wine-tour", label: "Arrábida wine tour" },
      { path: "/local-stories/setubal-wine-guide", label: "Setúbal wine country guide" },
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
    relatedSignatures: [{ slug: "evora-alentejo", label: "Évora & Alentejo Signature" }],
    datePublished: "2026-06-12",
  },
  {
    slug: "best-wineries-near-lisbon",
    title: "Best Wineries Near Lisbon | A Local Wine Guide",
    metaDescription:
      "Discover the best winery experiences near Lisbon, from family cellars in Arrábida and Setúbal to traditional talha wine in Alentejo.",
    h1: "The Best Wineries Near Lisbon",
    eyebrow: "Wine · Lisbon Region",
    standfirst:
      "The cellars we actually take guests to — small, family-run, and within an easy private drive of Lisbon.",
    sections: [
      {
        heading: "Arrábida: the coast that quietly makes great wine",
        body: "Arrábida is often discovered for its beaches and mountain views, but wine has been part of this landscape for centuries. Vineyards sit between the Atlantic, the limestone hills and the warmer plains around Azeitão and Palmela.\n\nThis unusual combination creates very different styles within a relatively small area. Local wineries produce fresh whites, structured reds and the region's famous Moscatel de Setúbal. Castelão remains one of the most characteristic red grapes, particularly in the sandy soils of the Setúbal Peninsula.\n\nWhat makes Arrábida especially attractive from Lisbon is the variety of the day. A private wine experience can include family cellars, panoramic roads, a traditional lunch and the coast without spending several hours traveling between each stop.",
      },
      {
        heading: "Setúbal Moscatel — sweet, salty, and very Portuguese",
        body: "Moscatel de Setúbal is one of Portugal's great fortified wines and one of the clearest expressions of this region. It begins with intensely aromatic grapes and develops greater complexity through ageing.\n\nOrange blossom, candied citrus, honey, dried fruit and spices are common notes. Some wines remain bright and floral, while older Moscatel can become deep, nutty and almost savoury. That contrast between sweetness, acidity and a subtle saline character is what makes it so distinctive.\n\nIt is traditionally associated with dessert, but locally it also appears beside Azeitão cheese or as the final glass after a long lunch. For many visitors, Moscatel becomes the unexpected discovery of a wine tour near Lisbon — and it is the reason we point first-time guests towards a [tasting day in Azeitão and Setúbal](/local-stories/best-wine-tasting-near-lisbon).",
      },
      {
        heading: "Alentejo talha wines — buried clay, ancient method",
        body: "In Alentejo, some producers continue to make wine in large clay vessels called talhas. The method has roots stretching back to Roman times and remains especially important in villages around Vidigueira.\n\nGrapes ferment inside the clay vessels, often with their skins, before the wine is separated naturally through an opening near the base. The process is simple in appearance but demands knowledge, patience and careful attention throughout fermentation.\n\nTalha wines can feel textured, earthy and direct, with a character very different from wines made entirely in modern stainless-steel tanks or oak barrels. Visiting a working talha cellar is not merely a tasting. It is an encounter with a living winemaking tradition that has survived for almost two thousand years.",
      },
      {
        heading: "How we choose which wineries to visit",
        body: "We choose wineries according to the quality of the experience, not only the fame of the label. Good wine matters, but so do the people hosting, the time allowed for the visit and the ability to explain the region without turning the tasting into a rehearsed sales presentation.\n\nFor some guests, the right choice is a small family cellar. Others appreciate the history and wider range of an established estate. Some want traditional Portuguese grapes, while others are curious about natural methods, clay amphorae or premium aged wines.\n\nWe therefore build the winery combination around the traveler, availability and the rhythm of the day. The goal is contrast: different producers, different stories and enough time to understand what makes each one worth visiting.",
      },
    ],
    ctaLead:
      "Most of these wineries are part of our private Signature wine days — door-to-door from your Lisbon hotel, with a quiet long lunch in between.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [{ slug: "evora-alentejo", label: "Évora & Alentejo Signature" }],
    relatedReads: [
      { path: "/local-stories/wine-tours-lisbon", label: "Wine tours from Lisbon" },
      { path: "/tours/arrabida-wine-allinclusive", label: "Arrábida Wine — All Inclusive" },
      { path: "/local-stories/setubal-wine-guide", label: "Setúbal wine country guide" },
    ],
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
      "Private Arrábida day trip from Lisbon — Setúbal market, family wineries in Azeitão and a long Portuguese lunch. Door-to-door driving.",
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
    relatedReads: [
      { path: "/local-stories/private-tours-from-lisbon", label: "Best private tours from Lisbon" },
      { path: "/local-stories/arrabida-wine-tour", label: "Arrábida wine tour guide" },
      {
        path: "/local-stories/best-wine-tasting-near-lisbon",
        label: "Best wine tasting near Lisbon",
      },
      { path: "/local-stories/what-to-do-in-sesimbra", label: "Things to do in Sesimbra" },
    ],
    datePublished: "2026-07-01",
  },
  {
    slug: "arrabida-wine-tour",
    title: "Arrábida Wine Tour from Lisbon | Private Setúbal Day",
    metaDescription:
      "Discover Arrábida and Setúbal on a private wine tour from Lisbon, with family wineries, Azeitão, coastal scenery and a relaxed Portuguese lunch.",
    h1: "Private Arrábida Wine Tour from Lisbon",
    eyebrow: "Arrábida · Private Wine Day",
    standfirst:
      "Three family wineries, the Setúbal market, a long Portuguese lunch — all on the cork-oak side of the Atlantic, with your own driver and guide.",
    sections: [
      {
        heading: "The closest complete wine region to Lisbon",
        body: "Arrábida and the Setúbal Peninsula form the closest complete wine region to Lisbon. Vineyards spread between Azeitão, Palmela and the limestone hills of the Arrábida Natural Park, with the Atlantic coast always nearby.\n\nThe region is known for Moscatel de Setúbal, local Castelão reds and a mixture of historic wine houses and independent family estates. A private Arrábida wine tour can combine contrasting tastings with Setúbal, a traditional lunch, panoramic mountain roads or the fishing town of Sesimbra.\n\nBecause the distances are relatively short, the experience can remain flexible. There is time to understand the wines, speak with local hosts and enjoy lunch without following the fixed pace of a large group tour. It is an especially strong choice for travelers who want Portuguese wine, local food and coastal scenery within one day from Lisbon. For a closer look at the cellars themselves, read [where to taste wine close to Lisbon](/local-stories/best-wine-tasting-near-lisbon).",
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
    relatedReads: [
      {
        path: "/tours/arrabida-wine-allinclusive",
        label: "Reserve the private three-winery experience",
      },
      { path: "/local-stories/wine-tours-lisbon", label: "Compare private wine tours from Lisbon" },
      {
        path: "/local-stories/setubal-wine-guide",
        label: "Read our local guide to Setúbal wine country",
      },
    ],
    datePublished: "2026-07-02",
  },
  {
    slug: "sintra-day-tour-from-lisbon",
    title: "Sintra Day Tour from Lisbon — Private & Cabo da Roca",
    metaDescription:
      "Private Sintra day tour from Lisbon — quieter palaces, Cabo da Roca, Cascais and a small wine tasting. Door-to-door from your hotel.",
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
    title: "Private Portugal Wine Tours | Lisbon, Alentejo & Beyond",
    metaDescription:
      "Discover private wine tours across Portugal, from Arrábida and Setúbal near Lisbon to Alentejo traditions, family wineries and local food.",
    h1: "Private Wine Tours in Portugal",
    eyebrow: "Portugal · Wine Tours",
    standfirst: "Small cellars, real winemakers, and a private day paced around lunch.",
    sections: [
      {
        heading: "Portugal as a wine destination",
        body: "Portugal is one of the most diverse wine countries in Europe, with distinct regions, native grape varieties and long-established traditions in every part of the territory. Each area has its own climate, its own soil and its own way of making and drinking wine.\n\nFrom the Douro Valley in the north to the Alentejo plains in the south, and from Bairrada and Dão in central Portugal to the vineyards near Lisbon in Arrábida and Setúbal, the country offers many possible experiences for wine lovers.\n\nA well-designed private wine tour makes it possible to explore this diversity without trying to include everything at once. The most memorable journeys tend to focus on one or two regions and give enough time to enjoy the landscape, food and hospitality that surround the wine itself.",
      },
      {
        heading: "How we design private wine journeys",
        body: "Our private wine journeys begin with the traveler rather than a predefined itinerary. We consider the amount of time available, previous experience with Portuguese wine, personal preferences, physical rhythm and interest in food, culture or nature.\n\nBased on this, we can plan a full private day near Lisbon in Arrábida, Setúbal or Palmela, a longer day in the Alentejo, or a multi-day route combining more than one region. Winery selection, driving times, meals and cultural stops are all considered together to create a natural pace.\n\nWe pay particular attention to matching each guest with wineries that suit their curiosity. Some travelers prefer historic estates, others prefer smaller family cellars. Some want a strong focus on tasting technique, while others prefer conversation and landscape. Every element is intended to feel intentional rather than generic.",
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
    relatedReads: [
      { path: "/local-stories/wine-tours-lisbon", label: "Private wine tours from Lisbon" },
      {
        path: "/local-stories/arrabida-wine-tour",
        label: "Explore Arrábida and Setúbal wine country",
      },
      {
        path: "/local-stories/alentejo-wine-tour-from-lisbon",
        label: "Explore an Alentejo wine day",
      },
      { path: "/multi-day", label: "Design a multi-day Portugal wine journey" },
    ],
    datePublished: "2026-07-04",
  },
  {
    slug: "wine-tours-lisbon",
    title: "Private Wine Tours from Lisbon | Arrábida & Setúbal",
    metaDescription:
      "Explore private wine tours from Lisbon to Arrábida, Setúbal, Azeitão and Palmela, with family wineries, local lunch and a private guide.",
    h1: "Private Wine Tours from Lisbon",
    eyebrow: "Lisbon · Private Wine Days",
    standfirst:
      "Three real wine regions within reach of your hotel. Family producers, long Portuguese lunches, your own driver and guide.",
    sections: [
      {
        heading: "Wine tours from Lisbon at their best",
        body: "Lisbon is one of the most convenient starting points in Europe for a serious wine day. Within a short drive, travelers can reach several distinct regions, each with its own grape varieties, wineries and gastronomic traditions.\n\nArrábida, Setúbal, Palmela and Azeitão are especially close. All can easily be visited on a single day trip, offering a strong balance between tasting quality, landscape and a comfortable pace. A little further, the Alentejo and its historic talha wines allow for a more immersive full-day experience.\n\nA private wine tour from Lisbon is ideal for travelers who want to understand these regions in depth without long, exhausting itineraries. It also allows the day to be shaped precisely to individual preferences, whether the focus is on family cellars, historic estates, coastal scenery, traditional lunch or all of these together. If tasting is the main reason you are travelling, start with our local guide to [wine tasting south of Lisbon](/local-stories/best-wine-tasting-near-lisbon).",
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
    relatedReads: [
      { path: "/local-stories/arrabida-wine-tour", label: "Explore the Arrábida wine region" },
      { path: "/tours/arrabida-wine-allinclusive", label: "See the three-winery Signature" },
      {
        path: "/local-stories/portugal-wine-tours",
        label: "Explore wine journeys across Portugal",
      },
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
        body: "We start with Setúbal's 145-year-old Livramento market — oysters, cheese, the first glass of Moscatel — then move between family wineries with a long traditional lunch in Azeitão in the middle. Optional close at Cristo Rei or Sesimbra Castle for Atlantic light. The full-day version is our [Arrábida private wine tour from Lisbon](/tours/arrabida-wine-allinclusive); the shorter, tasting-focused version is the [Azeitão wine tasting near Lisbon](/tours/azeitao-cheese). Pickup and drop-off at your Lisbon hotel; the driving is on us.",
      },
      {
        heading: "Your own pace, your own pours.",
        body: "Group wine tours run on a fixed clock and a fixed cellar list. A private [wine tour from Lisbon](/tours/arrabida-wine-allinclusive) means you choose how long to linger at each table, which wineries to add, and whether to end the day on a viewpoint or back in the city for dinner.",
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
    relatedReads: [
      {
        path: "/local-stories/best-wine-tasting-near-lisbon",
        label: "Best wine tasting near Lisbon",
      },
      { path: "/local-stories/arrabida-wine-tour", label: "Arrábida wine tour guide" },
      { path: "/local-stories/setubal-wine-guide", label: "Setúbal wine country guide" },
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
  {
    slug: "best-private-day-tours-from-lisbon",
    title: "Best Private Day Tours from Lisbon — A Local's Guide",
    metaDescription:
      "A local operator's guide to the best private day tours from Lisbon — Sintra, Arrábida and Évora compared, honestly, by the team that designs them.",
    h1: "Best Private Day Tours from Lisbon",
    eyebrow: "Lisbon · Private Day Tours",
    standfirst:
      "Three directions, three different Portugals. Sintra for palaces and forest, Arrábida for wine and wild coast, Évora for the slow inland south. Here is how a local chooses between them — and why doing them privately changes the day.",
    sections: [
      {
        heading: "Why private, and why from Lisbon.",
        body: "Lisbon is one of the rare European capitals where an hour's drive lands you in a completely different landscape — a UNESCO forest, a marine park, or a walled Roman city on the plain. The three directions below are all doable as a single day. What changes, when the day is private, is the rhythm: you leave when you want, you stop when the light is right, and lunch is chosen for you — not for the coach behind you.",
      },
      {
        heading: "Sintra — palaces, forest, and Cabo da Roca.",
        body: "Thirty minutes west, Sintra sits in a green microclimate of its own. Pena Palace above the treeline, Quinta da Regaleira and its initiation well, the road out to Cabo da Roca — Europe's westernmost point — and Cascais light on the way back. Private matters most here: the estates fill by 11am, and an early private start (in before the coaches) is the difference between a magical morning and a queue.",
      },
      {
        heading: "Arrábida — wine, fish, and a wild Atlantic coast.",
        body: "South across the 25 de Abril Bridge, the cork and pine hills of Arrábida drop straight into a turquoise sea. This is our home region. A private day here typically threads a small family winery in Azeitão, a hidden cove for a swim, and grilled fish on the Setúbal waterfront. It is the most sensory of the three — the one guests describe as the day they did not want to end.",
      },
      {
        heading: "Évora — the slow, inland Alentejo.",
        body: "Ninety minutes east, past cork oaks and long horizons, Évora is a walled Roman-to-Renaissance city on the Alentejo plain. A private day here pairs the Roman temple and the old town with a working Alentejo estate — talha wines fermented in clay, olive oil pressed on site, a long lunch under a tree. It is the quietest of the three, and the one that surprises people most.",
      },
      {
        heading: "How to choose in one line.",
        body: "Choose Sintra for palaces and forest drama; choose Arrábida for wine, sea, and long lunches; choose Évora for the slow inland south. If it is your first time in Portugal and you want the postcard, Sintra. If you want the day you will still talk about a year later, Arrábida. If you already know Lisbon and want somewhere different, Évora.",
      },
      {
        heading: "What private actually changes.",
        body: "A private day is not the group day with fewer people. The route flexes to the weather, the light, and your pace. Winery visits are booked ahead so no one is turning us away at the door. Lunch is a real table at a real place, not a set menu for forty. And the guide is a local who lives here — not a script.",
      },
    ],
    ctaLead:
      "Each of the three directions lives inside a Signature day designed by our team. Start with the one that matches the mood you want.",
    ctaLabel: "See our Signature Day Tours",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "sintra-cascais", label: "Sintra & Cascais Signature" },
      { slug: "evora-alentejo", label: "Évora & Alentejo Signature" },
      { slug: "wild-beaches-picnic", label: "Wild Beaches & Picnic" },
    ],
    datePublished: "2026-07-16",
    faq: [
      {
        q: "What is the best private day tour from Lisbon?",
        a: "It depends on the mood you want. Sintra is best for palaces and forest, Arrábida for wine and wild coast, and Évora for the slow inland Alentejo. All three are within 90 minutes of Lisbon and can be done comfortably as a single private day.",
      },
      {
        q: "How long is a private day tour from Lisbon?",
        a: "A typical private day runs 8 to 10 hours door-to-door, with pickup at your hotel or apartment. Timings flex to your pace — an earlier start avoids crowds at Sintra, while Arrábida and Évora days often stretch later for a long lunch.",
      },
      {
        q: "Is a private tour worth it compared to a group tour?",
        a: "For Sintra especially, yes — a private early start beats the coach traffic that arrives around 11am. For Arrábida and Évora, private unlocks small family wineries and lunch tables that group tours cannot access. The day is shaped to you, not to a fixed schedule.",
      },
    ],
  },
  {
    slug: "best-wine-tasting-near-lisbon",
    title: "Best Wine Tasting Near Lisbon — Setúbal, Arrábida & Azeitão",
    metaDescription:
      "Best wine tasting near Lisbon — family wineries in Setúbal, Azeitão and Arrábida, with Moscatel, local reds and a long lunch. Private days.",
    h1: "Best Wine Tasting Near Lisbon — by a Local",
    eyebrow: "Lisbon · Wine Tasting",
    standfirst:
      "The most interesting wine tasting near Lisbon is not in the city — it is south of the Tagus, in Azeitão, Setúbal and Arrábida, all within about an hour of your hotel.",
    sections: [
      {
        heading: "Why the best tastings are south of the bridge.",
        body: "Lisbon itself has good wine bars, but the wineries are across the Tagus. In less than an hour you reach Azeitão and Setúbal, where family producers have been making Moscatel and Castelão for generations. The cellars are small, the pours are generous, and the lunch that follows is part of the tasting.\n\nSo when travelers ask where to taste wine close to Lisbon, the honest answer is three neighbouring places rather than one: Azeitão for Moscatel and small cellars, Setúbal for the market and the fish, and Arrábida for the coastal road between them.",
      },
      {
        heading: "Azeitão — Moscatel and small cellars.",
        body: "Azeitão is a village of wineries, cheese dairies and tile workshops. The tastings here are intimate — often in the family's own cellar or courtyard — and Moscatel de Setúbal is the star. Our [Azeitão wine tasting near Lisbon](/tours/azeitao-cheese) can include cheese, a tile atelier and two wineries without ever feeling rushed.",
      },
      {
        heading: "Setúbal — market, fish, wine.",
        body: "Setúbal's Livramento market is one of the best in Portugal. A tasting day that starts here — oysters, cheese, bread — then moves to a nearby cellar feels connected to the place rather than just the grape. The best Setúbal days end with grilled fish by the water, which is how our [Arrábida private wine tour from Lisbon](/tours/arrabida-wine-allinclusive) closes.",
      },
      {
        heading: "Arrábida — wine with a view.",
        body: "The Arrábida Natural Park rises behind the wineries, and the road between them offers some of the most cinematic coastal views near Lisbon. A tasting here is as much about the landscape as the wine — which is why a [private wine tour from Lisbon](/tours/arrabida-wine-allinclusive) lingers longer than group tours can. For an [Alentejo wine tour from Lisbon](/tours/evora-alentejo) instead, the pace is different but the same principle holds: private, unrushed, local cellars.",
      },
    ],
    ctaLead:
      "This is exactly the day we built our Arrábida Wine Signature around — private, paced, and designed around the long lunch.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "azeitao-cheese", label: "Azeitão Cheese & Wine" },
      { slug: "roman-heritage-alentejo", label: "Roman Heritage & Talha Wines" },
    ],
    relatedReads: [
      { path: "/tours/arrabida-wine-allinclusive", label: "Reserve the private Arrábida wine day" },
      { path: "/local-stories/private-wine-tour-lisbon", label: "Private wine tour from Lisbon" },
      { path: "/local-stories/setubal-wine-guide", label: "Local guide to Setúbal wine" },
    ],
    faq: [
      {
        q: "Where is the best wine tasting near Lisbon?",
        a: "South of the Tagus, in Azeitão, Setúbal and Arrábida. Azeitão is a village of small family cellars where Moscatel de Setúbal is the star; Setúbal adds the Livramento market and grilled fish; Arrábida adds the coastal landscape between them.",
      },
      {
        q: "How far are the wineries from Lisbon?",
        a: "Less than an hour. Azeitão and Setúbal sit just across the Tagus from Lisbon, which is why a tasting there works comfortably as a single private day.",
      },
      {
        q: "What wine will I taste near Lisbon?",
        a: "Mostly Moscatel de Setúbal and local Castelão reds, made by family producers who have been working these vineyards for generations.",
      },
    ],
    datePublished: "2026-07-10",
  },
  {
    slug: "private-tours-from-lisbon",
    title: "Private Tours from Lisbon — Sintra, Arrábida & Alentejo",
    metaDescription:
      "Private tours from Lisbon — Sintra, Arrábida, Alentejo and the Vicentine Coast, designed around you. Licensed local operator, door-to-door.",
    h1: "Private Tours from Lisbon — a local's guide to the best days",
    eyebrow: "Lisbon · Private Days",
    standfirst:
      "The best private day tours from Lisbon head south to Arrábida, inland to Évora, or west to Sintra and Cascais.",
    sections: [
      {
        heading: "Arrábida — wine, coast and a long lunch.",
        body: "South of the bridge, the Arrábida hills drop into the Atlantic. A private day here combines family wineries in Azeitão, the Livramento market in Setúbal and a long Portuguese lunch. It is the most complete wine-and-coast day within an hour of Lisbon.",
      },
      {
        heading: "Alentejo — history and slow wine.",
        body: "Évora is a UNESCO city of Roman temples, medieval walls and the Chapel of Bones. Around it, Alentejo wineries work at a slower pace — big reds, cork oaks, long lunches. A private day from Lisbon is long but unhurried, with time for both heritage and wine.",
      },
      {
        heading: "Sintra & Cascais — palaces and the Atlantic.",
        body: "Sintra is the famous choice, and best done early. A private day can slip into quieter estates, reach Cabo da Roca — Europe's westernmost point — and end in Cascais with a small wine tasting. Structure matters here; a guide who knows the timing makes the difference.",
      },
      {
        heading: "The Vicentine Coast — wild and far.",
        body: "For travelers who have already seen Sintra and Arrábida, the Southwest Vicentine Coast is the next level. Porto Covo, Milfontes and Odeceixe sit inside a protected natural park of cliffs, dunes and river-meets-ocean beaches. It is a long day from Lisbon, but the emptiness is the point.",
      },
    ],
    ctaLead:
      "Every one of these days exists as a Signature Experience — private from the start, shaped to your pace.",
    ctaLabel: "See all Signature Experiences",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "sintra-cascais", label: "Sintra & Cascais" },
      { slug: "evora-alentejo", label: "Évora & Alentejo" },
      { slug: "southwest-vicentine-coast", label: "Southwest Vicentine Coast" },
      { slug: "troia-comporta", label: "Tróia & Comporta" },
    ],
    relatedReads: [
      { path: "/portugal-travel-designer", label: "Design your own Portugal journey" },
      { path: "/experiences", label: "Browse all Signature Experiences" },
      {
        path: "/local-stories/arrabida-day-trip-from-lisbon",
        label: "Arrábida day trip from Lisbon",
      },
    ],
    datePublished: "2026-07-11",
  },
  {
    slug: "best-wine-tours-from-lisbon",
    title: "Best Wine Tours from Lisbon — Private Day Trips 2026",
    metaDescription:
      "The best wine tours from Lisbon — private day trips to Arrábida, Azeitão and Alentejo. Small-group, door-to-door, designed by a licensed local operator.",
    h1: "The Best Wine Tours from Lisbon",
    eyebrow: "Lisbon · Wine",
    standfirst:
      "Three real wine regions sit within 90 minutes of Lisbon. Here are the private days we actually run — and how to choose between them.",
    sections: [
      {
        heading: "Lisbon is closer to serious wine country than travelers expect.",
        body: "South of the 25 de Abril Bridge, the Setúbal Peninsula makes Moscatel de Setúbal and structured reds around Azeitão. Ninety minutes inland, the Alentejo plains produce Portugal's most recognised big reds. And on the coast west of the city, the tiny Colares appellation still grows vines in sand. You do not need to travel to the Douro to taste real Portuguese wine — the best wine tours from Lisbon are day trips, private, and back in the city for dinner.",
      },
      {
        heading: "Arrábida All-Inclusive Day — the complete wine-and-coast day.",
        body: "Our most-booked [private wine tour from Lisbon](/tours/arrabida-wine-allinclusive). Family wineries in Azeitão, the Livramento market in Setúbal, a long Portuguese lunch, and the Arrábida Natural Park where the mountains fall into the Atlantic. Door-to-door from Lisbon, everything included, paced around you rather than a coach timetable.",
      },
      {
        heading: "Azeitão Cheese & Wine Day — a shorter, more focused tasting.",
        body: "For travelers who want depth over distance — the best [wine tasting near Lisbon](/tours/azeitao-cheese) for a half-day. A morning at a working Azeitão estate — Moscatel and JP Azeitão reds — a small producer of Azeitão sheep's cheese, and lunch in a village that has been making both for centuries. Back in Lisbon by mid-afternoon.",
      },
      {
        heading: "Évora & Alentejo Wine Tour — the Alentejo day, done properly.",
        body: "A private [Alentejo wine tour from Lisbon](/tours/evora-alentejo) to Évora — UNESCO Roman temple, medieval walls, the Chapel of Bones — with an Alentejo winery visit and a long regional lunch. It is a longer drive than Arrábida, but the landscape and the wines are entirely different: cork oaks, open plains, structured reds.",
      },
      {
        heading: "Roman Heritage Wine Tour — the day for wine travelers who have seen the rest.",
        body: "A quieter [Alentejo wine tour from Lisbon](/tours/roman-heritage-alentejo) built around vinho de talha — wine still fermented in clay amphorae, the way the Romans made it here two thousand years ago. Small cellars, a hands-on tasting, and history you can drink. Private, slow, and off the standard route.",
      },
      {
        heading: "How to choose.",
        body: "If it is your first wine day from Lisbon, choose [Arrábida](/tours/arrabida-wine-allinclusive) — coast, food and wine in the same afternoon. If you want to be back early and taste seriously, choose [Azeitão](/tours/azeitao-cheese). If Alentejo is on your list, choose [Évora](/tours/evora-alentejo) for the heritage plus wine, or [Roman Heritage](/tours/roman-heritage-alentejo) for the deeper wine story. All four are private, licensed, and shaped around your pace — never a fixed coach itinerary.",
      },
    ],
    ctaLead:
      "Every day above exists as a private Signature Experience. Prefer to shape your own? Our Studio lets you design a wine day from scratch.",
    ctaLabel: "See all Signature Experiences",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "azeitao-cheese", label: "Azeitão Cheese & Wine Day" },
      { slug: "evora-alentejo", label: "Évora & Alentejo Wine Tour" },
      { slug: "roman-heritage-alentejo", label: "Roman Heritage Wine Tour" },
    ],
    relatedReads: [
      { path: "/local-stories/private-wine-tour-lisbon", label: "Private wine tour from Lisbon" },
      {
        path: "/local-stories/best-wine-tasting-near-lisbon",
        label: "Best wine tasting near Lisbon",
      },
      { path: "/portugal-travel-designer", label: "Design your own Portugal journey" },
    ],
    datePublished: "2026-07-24",
  },
];

export const LOCAL_STORIES_ARTICLES_BY_SLUG: Record<string, LocalStoryArticle> = Object.fromEntries(
  LOCAL_STORIES_ARTICLES.map((a) => [a.slug, a]),
);

export function getLocalStoryArticle(slug: string): LocalStoryArticle | undefined {
  return LOCAL_STORIES_ARTICLES_BY_SLUG[slug];
}
