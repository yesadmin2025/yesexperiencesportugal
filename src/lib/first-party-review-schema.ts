/**
 * First-party-only review structured data.
 *
 * Google's review-snippet policy forbids aggregating ratings or reviews
 * collected on other websites (Viator, Tripadvisor, GetYourGuide, Google).
 * Those stay VISIBLE on the page as attributed social proof, but they must
 * never feed `aggregateRating` or `review` in our Product JSON-LD.
 *
 * This helper therefore accepts ONLY first-party data (rows with
 * `tour_reviews.is_first_party = true`, aggregated by
 * `tour_review_stats.first_party_count / first_party_avg`). When that data
 * is unavailable, the fields are omitted entirely — never substituted.
 */
import { SITE_URL } from "@/lib/jsonld";

export type FirstPartyReviewForSchema = {
  rating: number;
  title?: string | null;
  body: string;
  reviewer_name?: string | null;
  published_at?: string | null;
};

export type FirstPartyReviewSchemaData = {
  count: number;
  average: number | null;
  reviews: FirstPartyReviewForSchema[];
};

type Reviewable = Record<string, unknown>;

function validAverage(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5;
}

/**
 * Returns a copy of the Product JSON-LD with first-party aggregateRating and
 * review nodes, when genuine first-party data exists. Otherwise unchanged.
 */
export function withFirstPartyReviews<T extends Reviewable>(
  productLd: T,
  data: FirstPartyReviewSchemaData | null | undefined,
): T {
  if (!data) return productLd;

  const merged: Reviewable = { ...productLd };
  const itemId = (productLd as { "@id"?: string })["@id"] ?? `${SITE_URL}/`;

  if (data.count > 0 && validAverage(data.average)) {
    merged.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(data.average.toFixed(1)),
      reviewCount: data.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const reviews = (data.reviews ?? []).filter((r) => r.body?.trim() && validAverage(r.rating));
  if (reviews.length > 0) {
    merged.review = reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: { "@type": "Person", name: r.reviewer_name?.trim() || "Verified guest" },
      ...(r.published_at ? { datePublished: r.published_at.slice(0, 10) } : {}),
      ...(r.title ? { name: r.title } : {}),
      reviewBody: r.body,
      publisher: { "@id": `${SITE_URL}/#organization` },
      itemReviewed: { "@id": itemId },
    }));
  }

  return merged as T;
}
