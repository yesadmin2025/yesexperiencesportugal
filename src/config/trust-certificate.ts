/**
 * Public review certificate — single source of truth.
 *
 * The footer badge (`TrustindexBadge`) and the Organization JSON-LD
 * `aggregateRating` MUST read these constants so the visible seal and the
 * structured data can never drift apart (a Google rich-results requirement:
 * the rating in markup has to be visible on the page).
 *
 * Update here when the public certificate changes.
 */
export const REVIEW_CERTIFICATE = {
  ratingValue: "4.9",
  bestRating: "5",
  worstRating: "1",
  reviewCount: 1000,
  url: "https://www.trustindex.io/reviews/yesexperiencesportugal.com",
  provider: "Trustindex",
} as const;

/** Display string for the review count, e.g. "1000 customer reviews". */
export const REVIEW_COUNT_DISPLAY = String(REVIEW_CERTIFICATE.reviewCount);
