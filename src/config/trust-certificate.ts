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
  /**
   * Public widget id from the Trustindex dashboard ("Copy embed code").
   * Loading this script is what makes Trustindex register the domain under
   * "Widget appearances" — without it the dashboard reports "not embedded".
   */
  widgetId: "5b4acfc688a54881970649b49a5",
} as const;

/** Vendor loader for the review certificate. */
export const TRUSTINDEX_LOADER_SRC = `https://cdn.trustindex.io/loader-cert.js?${REVIEW_CERTIFICATE.widgetId}`;

/** Display string for the review count, e.g. "1000 customer reviews". */
export const REVIEW_COUNT_DISPLAY = String(REVIEW_CERTIFICATE.reviewCount);
