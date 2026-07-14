/**
 * Helpers for Google review rich-snippet eligibility on Signature tour
 * pages and the SEO landing pages that map to a Signature parent.
 *
 * Data priority (highest first):
 *   1. Real backend stats + reviews (tour_review_stats + tour_reviews)
 *      — combined external + first-party rating/count, review objects
 *      carry real `datePublished` from `published_at`.
 *   2. Verified Viator meta (fallback while a Signature has no rows in
 *      the backend yet).
 *
 * Google requires that the AggregateRating/Review values be visibly
 * displayed on the same page. `<TourReviews />` renders backend rows and
 * `<LandingTourCredibility />` renders Viator meta, keeping schema and
 * UI in lock-step.
 */
import { getViatorMeta } from "@/data/signatureToursViator";
import { SITE_URL } from "@/lib/jsonld";
import type { PublicReview, TourStats } from "@/lib/reviews.functions";

type Reviewable = Record<string, unknown>;

export type AggregateReviewInputs = {
  stats?: Pick<TourStats, "total_reviews" | "average_rating"> | null;
  reviews?: PublicReview[] | null;
};

const SOURCE_PUBLISHER: Record<string, string> = {
  viator: "Viator",
  tripadvisor: "Tripadvisor",
  getyourguide: "GetYourGuide",
  google: "Google",
  first_party: "YES Experiences Portugal",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function withAggregateAndReviews<T extends Reviewable>(
  productLd: T,
  parentTourId: string,
  live?: AggregateReviewInputs,
): T {
  const merged: Reviewable = { ...productLd };
  const itemId = (productLd as { "@id"?: string })["@id"] ?? `${SITE_URL}/`;

  const liveCount = live?.stats?.total_reviews ?? 0;
  const liveAvg = live?.stats?.average_rating ?? null;
  const liveReviews = (live?.reviews ?? []).filter((r) => r.body?.trim());

  // ---- Path 1: real backend data ---------------------------------------
  if (liveCount > 0 && liveAvg != null && liveReviews.length > 0) {
    merged.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: round2(liveAvg),
      reviewCount: liveCount,
      bestRating: 5,
      worstRating: 1,
    };

    merged.review = liveReviews.slice(0, 8).map((r) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: Number(r.rating),
        bestRating: 5,
        worstRating: 1,
      },
      author: {
        "@type": "Person",
        name: r.reviewer_name?.trim() || "Verified guest",
      },
      datePublished: r.published_at,
      ...(r.title ? { name: r.title } : {}),
      reviewBody: r.body,
      publisher: {
        "@type": "Organization",
        name: SOURCE_PUBLISHER[r.source] ?? "YES Experiences Portugal",
      },
      itemReviewed: { "@id": itemId },
    }));

    return merged as T;
  }

  // ---- Path 2: Viator fallback -----------------------------------------
  const meta = getViatorMeta(parentTourId);
  if (!meta) return merged as T;

  const topReviews = (meta.topReviews ?? []).filter((r) => r.text?.trim());
  if (meta.reviewCount > 0 && topReviews.length > 0) {
    merged.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: meta.rating,
      reviewCount: meta.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (topReviews.length > 0) {
    merged.review = topReviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: meta.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: { "@type": "Person", name: r.author || "Verified guest" },
      ...(r.date ? { datePublished: r.date } : {}),
      name: r.title,
      reviewBody: r.text,
      publisher: { "@type": "Organization", name: r.source ?? "Viator" },
      itemReviewed: { "@id": itemId },
    }));
  }

  return merged as T;
}
