/**
 * Visibility filter for on-site review widgets.
 *
 * Hides reviews below MIN_VISIBLE_RATING from the visible list only.
 * The emitted AggregateRating in JSON-LD stays UNFILTERED — Google
 * penalises rich-result eligibility when the schema aggregate value
 * does not match the reviews visible on-page, so the aggregate must
 * reflect all reviews we hold, not just the ones we display.
 *
 * Filter applied in one place so it's easy to remove later.
 */

export const MIN_VISIBLE_RATING = 3;

export function filterVisibleReviews<T extends { rating: number }>(rows: T[]): T[] {
  return rows.filter((r) => Number(r.rating) >= MIN_VISIBLE_RATING);
}
