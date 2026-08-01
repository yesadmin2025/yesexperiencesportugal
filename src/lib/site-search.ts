/**
 * Site search index — powers the public /search route (and the valid
 * schema.org SearchAction advertised in websiteLd()).
 *
 * The index is built from existing sources of truth only:
 *   • Signature tours   → src/data/signatureTours.ts
 *   • Local Stories     → src/content/local-stories-articles.ts
 *   • Key service pages → curated list below (Studio, Tailored, Trade…)
 *
 * Nothing here invents content. Matching is a small deterministic
 * token-scoring pass over title / summary / keyword text — no fuzzy
 * library, no network call, so results ship instantly and work on the
 * server during SSR.
 */
import { signatureTours } from "@/data/signatureTours";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";

export type SearchKind = "experience" | "story" | "page";

export type SearchDoc = {
  id: string;
  kind: SearchKind;
  title: string;
  summary: string;
  path: string;
  /** Extra searchable text (region, theme, highlights…). Never displayed raw. */
  keywords: string;
  /** Small display line under the title, e.g. region · duration. */
  meta?: string;
};

const SERVICE_PAGES: SearchDoc[] = [
  {
    id: "page-experiences",
    kind: "page",
    title: "Signature experiences",
    summary:
      "The full collection of private day experiences from Lisbon — wine, coast, culture and gastronomy.",
    path: "/experiences",
    keywords: "signature collection private day tours lisbon catalog",
  },
  {
    id: "page-studio",
    kind: "page",
    title: "Studio — design your day",
    summary:
      "A guided, cinematic way to shape a private day in Portugal around how you want it to feel.",
    path: "/studio-v3",
    keywords: "studio design build custom day guided planner",
  },
  {
    id: "page-travel-designer",
    kind: "page",
    title: "Portugal travel designer",
    summary: "Multi-day private journeys designed end to end — routes, timing, stays and pace.",
    path: "/portugal-travel-designer",
    keywords: "travel designer multi day itinerary journey private portugal",
  },
  {
    id: "page-multi-day",
    kind: "page",
    title: "Multi-day journeys",
    summary: "Longer private routes across Portugal, paced day by day.",
    path: "/multi-day",
    keywords: "multi day itinerary road trip week portugal",
  },
  {
    id: "page-corporate",
    kind: "page",
    title: "Corporate & incentive experiences",
    summary: "Private group days for teams, incentives and executive retreats.",
    path: "/corporate",
    keywords: "corporate incentive team building group company event",
  },
  {
    id: "page-proposals",
    kind: "page",
    title: "Proposal in Portugal",
    summary: "Discreetly staged proposal moments on the coast and in the vineyards.",
    path: "/proposal-in-portugal",
    keywords: "proposal engagement romantic surprise couple",
  },
  {
    id: "page-moments",
    kind: "page",
    title: "Moments",
    summary: "Small add-on moments — picnics, tastings, photography, celebrations.",
    path: "/proposal-in-portugal",
    keywords: "moments add-ons picnic photographer celebration birthday",
  },
  {
    id: "page-trade",
    kind: "page",
    title: "For travel advisors & agencies",
    summary: "Trade rates, lead times and how we work with advisors and designers.",
    path: "/trade",
    keywords: "travel advisor agency trade partner commission dmc",
  },
  {
    id: "page-reviews",
    kind: "page",
    title: "Guest reviews",
    summary: "Verified guest reviews across our private experiences.",
    path: "/reviews",
    keywords: "reviews ratings testimonials guests trust",
  },
  {
    id: "page-about",
    kind: "page",
    title: "About YES experiences",
    summary: "Who we are, how we work and why we only run private days.",
    path: "/about",
    keywords: "about founder story team company licence rnaat",
  },
  {
    id: "page-contact",
    kind: "page",
    title: "Contact",
    summary: "Talk to us about dates, group size and what you have in mind.",
    path: "/contact",
    keywords: "contact email phone whatsapp enquiry booking help",
  },
  {
    id: "page-faq",
    kind: "page",
    title: "Frequently asked questions",
    summary: "Pickups, pricing, group sizes, weather, cancellations and payment.",
    path: "/faq",
    keywords: "faq questions cancellation pickup payment policy children",
  },
];

let cached: SearchDoc[] | null = null;

/** The full, deduplicated site search index. Built once per runtime. */
export function getSearchIndex(): SearchDoc[] {
  if (cached) return cached;

  const tours: SearchDoc[] = signatureTours.map((t) => ({
    id: `tour-${t.id}`,
    kind: "experience",
    title: t.title,
    summary: t.blurb,
    path: `/tours/${t.id}`,
    meta: `${t.region} · ${t.duration}`,
    keywords: [
      t.region,
      t.theme,
      t.fitsBest,
      ...(t.pace ?? []),
      ...(t.highlights ?? []),
      ...(t.idealFor ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  }));

  const stories: SearchDoc[] = LOCAL_STORIES_ARTICLES.map((a) => ({
    id: `story-${a.slug}`,
    kind: "story",
    title: a.h1,
    summary: a.standfirst || a.metaDescription,
    path: `/local-stories/${a.slug}`,
    meta: "Local story",
    keywords: [a.eyebrow, a.metaDescription, ...(a.sections ?? []).map((s) => s.heading)].join(" "),
  }));

  cached = [...tours, ...stories, ...SERVICE_PAGES];
  return cached;
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

/** Max characters accepted from the URL — guards against absurd queries. */
export const MAX_QUERY_LENGTH = 120;

export type SearchResult = SearchDoc & { score: number };

/**
 * Deterministic token scoring:
 *   title exact phrase   +12
 *   title token          +6
 *   summary token        +3
 *   keyword token        +2
 * Every token must match somewhere, otherwise the doc is dropped (AND).
 */
export function searchSite(rawQuery: string, limit = 40): SearchResult[] {
  const query = normalise(rawQuery.slice(0, MAX_QUERY_LENGTH)).trim();
  if (query.length < 2) return [];

  const tokens = query.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const doc of getSearchIndex()) {
    const title = normalise(doc.title);
    const summary = normalise(doc.summary);
    const keywords = normalise(doc.keywords);

    let score = 0;
    let matchedAll = true;

    for (const token of tokens) {
      let tokenScore = 0;
      if (title.includes(token)) tokenScore += 6;
      if (summary.includes(token)) tokenScore += 3;
      if (keywords.includes(token)) tokenScore += 2;
      if (tokenScore === 0) {
        matchedAll = false;
        break;
      }
      score += tokenScore;
    }

    if (!matchedAll) continue;
    if (title.includes(query)) score += 12;
    if (doc.kind === "experience") score += 2; // commercial intent first
    results.push({ ...doc, score });
  }

  return results
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export const SEARCH_KIND_LABEL: Record<SearchKind, string> = {
  experience: "Experience",
  story: "Local story",
  page: "Page",
};
