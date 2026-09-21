/**
 * Public review certificate — single source of truth.
 *
 * Single source of truth for VISIBLE review proof (Trustindex badge,
 * homepage trust line and other owned-page UI). Do not attach this aggregate
 * to the site's own Organization/LocalBusiness JSON-LD: Google treats those
 * self-serving review snippets as ineligible. Product-specific tour ratings
 * remain separate and must use their own tour-level source.
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
export const REVIEW_COUNT_DISPLAY = REVIEW_CERTIFICATE.reviewCount.toLocaleString("en-US");
