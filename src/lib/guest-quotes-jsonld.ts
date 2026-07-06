/**
 * Pure JSON-LD builder for the homepage GuestQuotes block.
 *
 * Extracted from the React component so the schema shape can be unit
 * tested with fixture data — the test asserts every emitted node still
 * satisfies Google's Review + AggregateRating rich-result rules on
 * every build (see `guest-quotes-jsonld.test.ts`). Keep this file free
 * of React and server-function imports so it stays cheap to import
 * from tests and from any surface.
 */
import { SITE_URL } from "@/lib/jsonld";

export type ReviewSource = "viator" | "tripadvisor" | "getyourguide" | "google" | "first_party";

export type GuestQuoteReview = {
  id: string;
  source: ReviewSource | string;
  rating: number;
  body: string;
  reviewer_name: string | null;
  reviewer_country: string | null;
  source_url: string | null;
  published_at: string | null;
};

export type GuestQuoteStats = {
  /** Total review count across every ingested platform + first-party. */
  count: number | null;
  /** Weighted average rating, 1..5. */
  avg: number | null;
};

export const SOURCE_LABEL: Record<string, string> = {
  viator: "Viator",
  tripadvisor: "Tripadvisor",
  getyourguide: "GetYourGuide",
  google: "Google",
  first_party: "Verified guest",
};

/** Fallbacks match the verified public aggregate on Tripadvisor/Viator. */
export const FALLBACK_RATING = 4.9;
export const FALLBACK_COUNT = 700;

/**
 * Build the `@graph` payload rendered inside the GuestQuotes
 * `<script type="application/ld+json">` tag. Returns a plain object so
 * it round-trips through JSON.stringify identically in the browser and
 * in tests.
 */
export function buildGuestQuotesJsonLd(
  quotes: GuestQuoteReview[],
  stats: GuestQuoteStats,
): { "@context": string; "@graph": Record<string, unknown>[] } {
  const orgId = `${SITE_URL}/#organization`;
  const pageUrl = `${SITE_URL}/#reviews`;
  // Inline `itemReviewed` (Organization + name + url) so validators
  // that don't follow @id merges into the sitewide Organization node
  // still see a fully-qualified target.
  const itemReviewed = {
    "@type": "Organization",
    "@id": orgId,
    name: "YES Experiences Portugal",
    url: `${SITE_URL}/`,
  } as const;

  const ratingValue = stats.avg ?? FALLBACK_RATING;
  const reviewCount = stats.count ?? FALLBACK_COUNT;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "AggregateRating",
      "@id": `${SITE_URL}/#aggregate-rating`,
      itemReviewed,
      ratingValue: Number(ratingValue.toFixed(1)),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
      url: pageUrl,
    },
    ...quotes.map((q) => {
      const publisherUrl = q.source_url ?? undefined;
      const reviewUrl = q.source_url ?? pageUrl;
      const author: Record<string, unknown> = {
        "@type": "Person",
        name: q.reviewer_name ?? "Verified guest",
      };
      if (q.reviewer_country) {
        author.nationality = { "@type": "Country", name: q.reviewer_country };
      }
      return {
        "@type": "Review",
        "@id": `${SITE_URL}/#review-${q.id}`,
        url: reviewUrl,
        itemReviewed,
        author,
        reviewRating: {
          "@type": "Rating",
          ratingValue: Math.round(q.rating),
          bestRating: 5,
          worstRating: 1,
        },
        reviewBody: q.body.length > 200 ? `${q.body.slice(0, 197)}…` : q.body,
        ...(q.published_at ? { datePublished: q.published_at } : {}),
        publisher: {
          "@type": "Organization",
          name: SOURCE_LABEL[q.source] ?? q.source,
          ...(publisherUrl ? { url: publisherUrl } : {}),
        },
      };
    }),
  ];

  return { "@context": "https://schema.org", "@graph": graph };
}
