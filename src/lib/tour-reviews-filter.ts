/**
 * Visibility filter for on-site review widgets.
 *
 * Transparency rule: every PUBLISHED review is visible, whatever its star
 * rating. The JSON-LD AggregateRating counts all published first-party
 * ratings, so the visible list must not selectively suppress low ratings.
 * Only rows with an invalid rating (outside 1–5) are dropped.
 *
 * Kept as one helper so callers stay unchanged.
 */

export const MIN_VISIBLE_RATING = 1;

export function filterVisibleReviews<T extends { rating: number }>(rows: T[]): T[] {
  return rows.filter((r) => {
    const n = Number(r.rating);
    return Number.isFinite(n) && n >= 1 && n <= 5;
  });
}
