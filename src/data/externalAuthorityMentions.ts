/**
 * External Authority Mentions — source of truth.
 *
 * Real third-party travel articles that either:
 *   (a) name YES Experiences Portugal / Yes!experiences directly, OR
 *   (b) rank/review a tour that YES Experiences Portugal operates on Viator
 *       or GetYourGuide (provider association, not a brand mention).
 *
 * STRICT POLICY (do not relax):
 *  • No fabricated quotes. Every `quote` is verbatim from the source article
 *    (verified on the date below in `lastCheckedAt`).
 *  • Only entries with `mentionType: "brand-direct"` may be presented as
 *    "YES Experiences Portugal was mentioned in …".
 *  • Entries with `mentionType: "product-mention"` MUST be presented as
 *    "the tour we operate was featured/ranked in …" — never as a brand mention.
 *  • No invisible content. No fake review schema is generated from these.
 *
 * Future migration: move to a Supabase `external_authority_mentions` table
 * with admin curation when volume grows past ~20 entries. For now the static
 * dataset matches existing `src/data/*.ts` conventions and keeps the launch
 * surface read-only/fast.
 */

export type AuthorityMentionType =
  | "brand-direct"        // article explicitly names YES Experiences / Yes!experiences
  | "product-mention"     // article ranks/reviews a tour that YES operates on a platform
  | "best-list"           // included in a "best of" ranked list
  | "platform-linked";    // article links primarily to Viator/GYG listing

export type AuthorityPlacement =
  | "homepage"
  | "wine-landing"
  | "arrabida-tour"
  | "alentejo"
  | "inventory-only";

export type AuthorityQuality = "high" | "medium" | "low";

export interface ExternalAuthorityMention {
  id: string;
  sourceName: string;        // display name, e.g. "Wine With Our Family"
  sourceDomain: string;      // e.g. "winewithourfamily.com"
  articleTitle: string;
  articleUrl: string;
  topic: string;             // short topic label, e.g. "Alentejo wine region"
  mentionType: AuthorityMentionType;
  linkedPlatform: "viator" | "getyourguide" | "tripadvisor" | "yes-direct" | null;
  providerNameDetected: boolean;     // true ONLY when the page names "YES Experiences" / "Yes!experiences"
  relatedTourSlug?: string;          // signature tour id when applicable
  relatedRegion: "lisbon" | "arrabida-setubal" | "alentejo" | "douro" | "sintra";
  ratingValueIfAvailable?: number;   // article's own displayed rating (NOT used for schema)
  reviewCountIfAvailable?: number;
  quote: string;                     // short, verbatim excerpt from the article
  quality: AuthorityQuality;
  placement: AuthorityPlacement[];
  lastCheckedAt: string;             // ISO date the entry was last verified manually
}

/**
 * NOTE on schema safety:
 * These mentions are visible editorial trust signals. They are NOT used to
 * build aggregateRating / Review JSON-LD. Review schema lives elsewhere and
 * uses only first-party reviews (see `tour_reviews` table).
 */
export const externalAuthorityMentions: ExternalAuthorityMention[] = [
  {
    id: "wine-with-our-family-alentejo",
    sourceName: "Wine With Our Family",
    sourceDomain: "winewithourfamily.com",
    articleTitle: "Best Way to Sample Portugal's Alentejo Wine Region in a Day",
    articleUrl:
      "https://www.winewithourfamily.com/post/best-way-portugal-s-alentejo-wine-region-in-a-day",
    topic: "Alentejo wine day trip from Lisbon",
    mentionType: "brand-direct",
    linkedPlatform: "yes-direct",
    providerNameDetected: true,
    relatedRegion: "alentejo",
    quote:
      "We opted to use Yes!experiences, the same tour operator that we used to visit the Setubal wine region, since we liked the variety of the tour and knew that the two wineries included were top-notch.",
    quality: "high",
    placement: ["homepage", "wine-landing", "alentejo"],
    lastCheckedAt: "2026-06-29",
  },
  {
    id: "world-tourism-arrabida-setubal",
    sourceName: "World Tourism",
    sourceDomain: "world-tourism.org",
    articleTitle:
      "Private Arrábida & Setúbal Wine Tour: All-Inclusive from Lisbon — Review",
    articleUrl:
      "https://www.world-tourism.org/private-arrabida-setubal-wine-tour-all-inclusive-from-lisbon/",
    topic: "Arrábida & Setúbal full-day private wine tour",
    mentionType: "product-mention",
    linkedPlatform: "viator",
    providerNameDetected: false,
    relatedTourSlug: "arrabida-wine-allinclusive",
    relatedRegion: "arrabida-setubal",
    ratingValueIfAvailable: 5.0,
    reviewCountIfAvailable: 450,
    quote:
      "The knowledgeable guides and custom private experience make it stand apart from more generic group outings.",
    quality: "high",
    placement: ["homepage", "wine-landing", "arrabida-tour"],
    lastCheckedAt: "2026-06-29",
  },
  {
    id: "worldguidestotravel-best-lisbon-wine-tours",
    sourceName: "World Guides to Travel",
    sourceDomain: "worldguidestotravel.com",
    articleTitle: "Best Lisbon Wine Tours",
    articleUrl: "https://worldguidestotravel.com/best-lisbon-wine-tours/",
    topic: "Best Lisbon wine tours ranking",
    mentionType: "best-list",
    linkedPlatform: "viator",
    providerNameDetected: false,
    relatedTourSlug: "arrabida-wine-allinclusive",
    relatedRegion: "arrabida-setubal",
    quote:
      "Private Full-Day Arrábida Wine Tour and Food Tasting — Best Full-Day Tour.",
    quality: "high",
    placement: ["homepage", "wine-landing", "arrabida-tour"],
    lastCheckedAt: "2026-06-29",
  },
  {
    id: "powertraveller-southern-lisbon-wine",
    sourceName: "Powertraveller",
    sourceDomain: "powertraveller.com",
    articleTitle: "Private Full-Day Wine Tour with Lunch in Southern Lisbon",
    articleUrl:
      "https://powertraveller.com/private-full-day-wine-tour-with-lunch-in-southern-lisbon/",
    topic: "Southern Lisbon private wine day",
    mentionType: "product-mention",
    linkedPlatform: "viator",
    providerNameDetected: false,
    relatedTourSlug: "arrabida-wine-allinclusive",
    relatedRegion: "arrabida-setubal",
    quote:
      "This experience made our list of the 25 Best Lunch Experiences In Lisbon.",
    quality: "medium",
    placement: ["wine-landing", "arrabida-tour"],
    lastCheckedAt: "2026-06-29",
  },
  {
    id: "happytovisit-3-best-wine-tours",
    sourceName: "Happy to Visit",
    sourceDomain: "happytovisit.com",
    articleTitle:
      "Lisbon Metropolitan Area's 3 Best Wine Tours — Which to Choose",
    articleUrl:
      "https://happytovisit.com/lisbon-metropolitan-areas-3-best-wine-tours-which-to-choose/",
    topic: "Lisbon wine tours comparison",
    mentionType: "best-list",
    linkedPlatform: "getyourguide",
    providerNameDetected: false,
    relatedTourSlug: "arrabida-wine-allinclusive",
    relatedRegion: "arrabida-setubal",
    quote:
      "If you prefer a hassle-free, all-inclusive day that combines wine, food, and scenic stops with a professional guide, this tour offers great value.",
    quality: "medium",
    placement: ["wine-landing", "arrabida-tour"],
    lastCheckedAt: "2026-06-29",
  },
  {
    id: "travelersuniverse-3-top-wine-tours",
    sourceName: "Travelers Universe",
    sourceDomain: "travelersuniverse.com",
    articleTitle:
      "We Rank Lisbon Metropolitan Area's 3 Top Wine Tours",
    articleUrl:
      "https://www.travelersuniverse.com/we-rank-lisbon-metropolitan-areas-3-top-wine-tours/",
    topic: "Lisbon wine tours ranked",
    mentionType: "best-list",
    linkedPlatform: "getyourguide",
    providerNameDetected: false,
    relatedTourSlug: "arrabida-wine-allinclusive",
    relatedRegion: "arrabida-setubal",
    quote:
      "Ideal for travellers seeking a seamless, all-inclusive day that combines wine, food, and culture in a stunning setting.",
    quality: "medium",
    placement: ["wine-landing"],
    lastCheckedAt: "2026-06-29",
  },
  {
    id: "mumsdotravel-2-best-wine-tours",
    sourceName: "Mums Do Travel",
    sourceDomain: "mumsdotravel.com",
    articleTitle:
      "Lisbon Metropolitan Area's 2 Best Wine Tours — Which to Choose",
    articleUrl:
      "https://mumsdotravel.com/lisbon-metropolitan-areas-2-best-wine-tours-which-to-choose/",
    topic: "Lisbon wine tours short list",
    mentionType: "best-list",
    linkedPlatform: "getyourguide",
    providerNameDetected: false,
    relatedTourSlug: "arrabida-wine-allinclusive",
    relatedRegion: "arrabida-setubal",
    quote:
      "An excellent choice for those wanting a tailored, relaxed exploration of Arrábida's vineyards paired with cultural stops and scenic vistas.",
    quality: "low",
    placement: ["inventory-only"],
    lastCheckedAt: "2026-06-29",
  },
  {
    id: "happytovisit-evora-alentejo-wine",
    sourceName: "Happy to Visit",
    sourceDomain: "happytovisit.com",
    articleTitle: "Lisbon: Private Full Day Évora & Alentejo Wine Tour — Review",
    articleUrl:
      "https://happytovisit.com/lisbon-private-full-day-evora-alentejo-wine-tour/",
    topic: "Évora & Alentejo private full-day wine tour",
    mentionType: "product-mention",
    linkedPlatform: "viator",
    providerNameDetected: false,
    relatedTourSlug: "evora-alentejo",
    relatedRegion: "alentejo",
    quote:
      "What we love about this tour is how it balances cultural exploration with gastronomic delights.",
    quality: "high",
    placement: ["alentejo"],
    lastCheckedAt: "2026-06-29",
  },
  {
    id: "travelersuniverse-evora-alentejo-wine",
    sourceName: "Travelers Universe",
    sourceDomain: "travelersuniverse.com",
    articleTitle:
      "Exploring Portugal's Alentejo: A Private Full-Day Évora & Wine Tour Review",
    articleUrl:
      "https://www.travelersuniverse.com/lisbon-private-full-day-evora-alentejo-wine-tour/",
    topic: "Évora & Alentejo private full-day wine tour",
    mentionType: "product-mention",
    linkedPlatform: "viator",
    providerNameDetected: false,
    relatedTourSlug: "evora-alentejo",
    relatedRegion: "alentejo",
    quote:
      "If you're considering a day trip from Lisbon into Portugal's lesser-known but utterly captivating wine country, the Lisbon: Private Full Day Evora & Alentejo Wine Tour might just be your best bet.",
    quality: "high",
    placement: ["alentejo"],
    lastCheckedAt: "2026-06-29",
  },
  {
    id: "travel-buddies-evora-alentejo-wine",
    sourceName: "Travel Buddies",
    sourceDomain: "travel-buddies.com",
    articleTitle:
      "Lisbon: Private Full Day Évora & Alentejo Wine Tour — Featured in 13 Best Full-Day Tours in Évora",
    articleUrl:
      "https://travel-buddies.com/lisbon-private-full-day-evora-alentejo-wine-tour/",
    topic: "Best full-day tours in Évora ranking",
    mentionType: "best-list",
    linkedPlatform: "viator",
    providerNameDetected: false,
    relatedTourSlug: "evora-alentejo",
    relatedRegion: "alentejo",
    quote:
      "This experience made our list of the 13 Best Full-Day Tours In Evora.",
    quality: "medium",
    placement: ["alentejo"],
    lastCheckedAt: "2026-06-29",
  },
  {
    id: "world-tourism-9-top-evora",
    sourceName: "World Tourism",
    sourceDomain: "world-tourism.org",
    articleTitle: "The 9 Top Full-Day Tours in Évora — Which Is Best?",
    articleUrl:
      "https://www.world-tourism.org/the-9-top-full-day-tours-in-evora-which-is-best/",
    topic: "Best full-day tours in Évora ranking",
    mentionType: "best-list",
    linkedPlatform: "viator",
    providerNameDetected: false,
    relatedTourSlug: "evora-alentejo",
    relatedRegion: "alentejo",
    quote:
      "A private Évora & Alentejo wine tour offers a perfect blend of culture and tastings, making it a favorite among travelers seeking a personalized experience.",
    quality: "high",
    placement: ["homepage", "alentejo"],
    lastCheckedAt: "2026-06-29",
  },
];

/* ───── Helpers ───── */

export function getMentionsForPlacement(
  placement: AuthorityPlacement,
  limit?: number,
): ExternalAuthorityMention[] {
  const list = externalAuthorityMentions
    .filter((m) => m.placement.includes(placement))
    .sort((a, b) => {
      // brand-direct first, then by quality, then by review count if any
      const aBrand = a.mentionType === "brand-direct" ? 0 : 1;
      const bBrand = b.mentionType === "brand-direct" ? 0 : 1;
      if (aBrand !== bBrand) return aBrand - bBrand;
      const q = { high: 0, medium: 1, low: 2 } as const;
      if (q[a.quality] !== q[b.quality]) return q[a.quality] - q[b.quality];
      return (b.reviewCountIfAvailable ?? 0) - (a.reviewCountIfAvailable ?? 0);
    });
  return typeof limit === "number" ? list.slice(0, limit) : list;
}
