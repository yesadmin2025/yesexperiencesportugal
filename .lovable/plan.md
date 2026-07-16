# Polish duplicated reviews on tour pages

## Problem
On `/tours/$tourId`, two review sections render back-to-back:
1. `<TourReviews />` — canonical, DB-driven aggregate + reviews (with Viator fallback when DB empty)
2. `<ReviewsBlock meta={meta} />` — legacy inline block that re-renders the same Viator `topReviews`

Result: guests see the same star rating and quotes twice.

## Change
- `src/routes/tours.$tourId.tsx`: remove the `<ReviewsBlock meta={meta} />` render (line 220) and delete the now-unused `ReviewsBlock` component + `FALLBACK_REVIEWS` constant further down the file. Keep `<TourReviews />` as the single reviews section — it already handles the Viator fallback when the DB has no rows, so no data coverage is lost.
- No other file changes: `LandingTourCredibility` is only used on SEO landing pages (not tour detail), and homepage `RealReviewsStrip` is a different surface.

## Out of scope
No copy, styling, or schema changes. JSON-LD `withAggregateAndReviews(...)` stays as-is (it's schema, not a visible block).
