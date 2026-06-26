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
];

export const LOCAL_STORIES_ARTICLES_BY_SLUG: Record<string, LocalStoryArticle> =
  Object.fromEntries(LOCAL_STORIES_ARTICLES.map((a) => [a.slug, a]));

export function getLocalStoryArticle(slug: string): LocalStoryArticle | undefined {
  return LOCAL_STORIES_ARTICLES_BY_SLUG[slug];
}
