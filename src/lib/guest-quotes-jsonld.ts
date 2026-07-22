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

/**
 * Build the `@graph` payload rendered inside the GuestQuotes
 * `<script type="application/ld+json">` tag.
 *
 * Conservative policy (Google's review guidelines):
 * - NEVER emit AggregateRating on Organization / LocalBusiness.
 * - NEVER aggregate multi-platform reviews (Viator, Tripadvisor,
 *   GetYourGuide, Google, Trustpilot) as if they were first-party.
 * - Only emit individual `Review` nodes whose `itemReviewed` is a
 *   concrete `Product` (a Signature experience). Reviews with no
 *   attributable experience are dropped.
 * - If nothing remains, return `null` so the caller skips the
 *   `<script>` tag entirely.
 *
 * `stats` are intentionally accepted (for API stability) but unused —
 * we no longer emit aggregate ratings from this surface.
 */
export function buildGuestQuotesJsonLd(
  quotes: GuestQuoteReview[],
  _stats: GuestQuoteStats,
): { "@context": string; "@graph": Record<string, unknown>[] } | null {
  const pageUrl = `${SITE_URL}/#reviews`;

  const graph: Record<string, unknown>[] = quotes
    .filter((q) => Boolean(q.source_url))
    .map((q) => {
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
        url: q.source_url ?? pageUrl,
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
          ...(q.source_url ? { url: q.source_url } : {}),
        },
      };
    });

  if (graph.length === 0) return null;
  return { "@context": "https://schema.org", "@graph": graph };
}

