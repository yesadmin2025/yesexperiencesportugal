/**
 * Helpers for Google review rich-snippet eligibility on Signature tour
 * pages and the SEO landing pages that map to a Signature parent.
 *
 * - withAggregateAndReviews(productLd, parentTourId)
 *     Returns a new Product JSON-LD object with `aggregateRating` and a
 *     `review` array, drawn from the parent Signature's verified Viator
 *     meta (rating, reviewCount, topReviews).
 *
 * Google requires the rating + review snippets to ALSO appear visibly
 * on the page. <LandingTourCredibility /> renders the same data, keeping
 * the schema and UI in lock-step.
 */
import { getViatorMeta } from "@/data/signatureToursViator";
import { SITE_URL } from "@/lib/jsonld";

type Reviewable = Record<string, unknown>;

export function withAggregateAndReviews<T extends Reviewable>(
  productLd: T,
  parentTourId: string,
): T {
  const meta = getViatorMeta(parentTourId);
  if (!meta) return productLd;

  const merged: Reviewable = { ...productLd };

  const topReviews = (meta.topReviews ?? []).filter((r) => r.text?.trim());

  // Google Rich Results requires that AggregateRating on a Product is
  // matched by review content visible on the same page. When we have no
  // rendered reviews (topReviews empty), we skip aggregateRating rather
  // than declaring a rating the crawler can't verify on-page.
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
      itemReviewed: { "@id": (productLd as { "@id"?: string })["@id"] ?? `${SITE_URL}/` },
    }));
  }

  return merged as T;
}
