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
    relatedSignatures: [
      { slug: "arrabida-wine-allinclusive", label: "Arrábida Wine Signature" },
    ],
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
    title: "Tróia & Comporta: Beaches, Ruins and Slow Alentejo Days",
    metaDescription:
      "Tróia, Comporta and the slow Alentejo coast — Roman ruins, rice fields, and some of Portugal's best beaches. A local's guide to a quieter day south of Lisbon.",
    h1: "Tróia & Comporta — Beaches, Ruins and Slow Alentejo Days",
    eyebrow: "Tróia · Comporta · Alentejo",
    standfirst:
      "A ferry, a long beach, and a different rhythm. How we spend a day in Tróia and Comporta.",
    sections: [
      { heading: "Crossing to Tróia", body: "[Body copy to be supplied.]" },
      { heading: "Roman ruins few travellers see", body: "[Body copy to be supplied.]" },
      { heading: "Comporta — the slow side", body: "[Body copy to be supplied.]" },
      { heading: "Where to eat, where to swim", body: "[Body copy to be supplied.]" },
    ],
    ctaLead:
      "We shape this day privately — ferry, ruins, beach lunch, and time to do nothing in particular.",
    ctaLabel: "See the Tróia & Comporta Signature",
    signatureSlug: "troia-comporta",
    datePublished: "2026-06-06",
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
    relatedSignatures: [
      { slug: "evora-alentejo-talhas", label: "Évora & Alentejo Signature" },
    ],
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
      { heading: "Arrábida: the coast that quietly makes great wine", body: "[Body copy to be supplied.]" },
      { heading: "Setúbal Moscatel — sweet, salty, and very Portuguese", body: "[Body copy to be supplied.]" },
      { heading: "Alentejo talha wines — buried clay, ancient method", body: "[Body copy to be supplied.]" },
      { heading: "How we choose which wineries to visit", body: "[Body copy to be supplied.]" },
    ],
    ctaLead:
      "Most of these wineries are part of our private Signature wine days — door-to-door from your Lisbon hotel, with a quiet long lunch in between.",
    ctaLabel: "See the Arrábida Wine Signature",
    signatureSlug: "arrabida-wine-allinclusive",
    relatedSignatures: [
      { slug: "evora-alentejo-talhas", label: "Évora & Alentejo Signature" },
    ],
    datePublished: "2026-06-30",
  },
];

export const LOCAL_STORIES_ARTICLES_BY_SLUG: Record<string, LocalStoryArticle> =
  Object.fromEntries(LOCAL_STORIES_ARTICLES.map((a) => [a.slug, a]));

export function getLocalStoryArticle(slug: string): LocalStoryArticle | undefined {
  return LOCAL_STORIES_ARTICLES_BY_SLUG[slug];
}
