## Scope

Two workstreams: **(A)** finish JSON-LD coverage across the site, and **(B)** hide sub-3★ reviews from the on-site widget while keeping the emitted AggregateRating honest (unfiltered).

## A. Structured data (JSON-LD)

Most work is already done: `/tours/$tourId` emits `Product + Offer + AggregateRating + individual Reviews + BreadcrumbList + FAQPage`. The gaps:

1. **`/experiences` (Signature index)** — add `ItemList` JSON-LD listing each tour as `TouristAttraction` (or `Product`) with its `AggregateRating`, `url`, `image`. This is what surfaces star badges on listing pages in Google.
2. **`/day-tours`** — same `ItemList` + per-item `AggregateRating`.
3. **`/multi-day`** — `ItemList` of multi-day itineraries + `BreadcrumbList`.
4. **`/reviews`** — page-level `ItemList` of `Review` items with `itemReviewed` pointing back to the correct tour. Keep aggregate omitted here (aggregate lives on the tour page).
5. **`BreadcrumbList` audit** — add on `/about`, `/corporate`, `/press`, `/contact`, `/proposal-in-portugal`, `/faq`, `/moments`, `/portugal-tours`, `/luxury-tours-portugal`, `/private-tours-portugal` (any leaf that currently lacks it).
6. **PT locale mirrors** — apply the same additions to `pt.experiences`, `pt.day-tours`, `pt.reviews` with `inLanguage: "pt-PT"` and PT canonical URLs.

Ratings source for every emitted `AggregateRating`: **first-party `tour_reviews` + `tour_external_ratings`** (Viator/TripAdvisor aggregates), combined with a weighted average — the same numbers already shown by `TourReviews`.

## B. On-site review filter (accept-risk path)

You explicitly asked to hide negative reviews. I'll implement it in a way that minimizes exposure to a Google manual action and EU consumer-law risk:

- **`TourReviews.tsx`** — filter out reviews with `rating < 3` from the visible list. Add a small disclosure line ("Showing 3★ and above — see full history on TripAdvisor and Viator") linking to the external profiles. Without disclosure this is a clear consumer-law violation; with it, it's a defensible editorial choice.
- **`/reviews` and `/pt/reviews`** — same filter + same disclosure.
- **AggregateRating stays UNFILTERED** in every JSON-LD emission. Rating-value mismatch between the JSON-LD aggregate and what's actually visible on-page is the specific pattern Google penalises. Keeping the schema honest is what prevents a site-wide rich-result manual action.
- **Individual `Review` JSON-LD** — only emit reviews you actually display (3★+), so the visible reviews match the schema `Review` items.
- Filter applied in one place (`useTourReviews` hook or a `filterVisibleReviews()` helper) so it's easy to remove later.

## Technical details

**Files to touch**

- `src/lib/jsonld.ts` — add `itemListLd({ items: {url, title, image, rating, reviewCount} })` helper. Existing `tourProductLd`, `breadcrumbLd`, `reviewLd` stay.
- `src/lib/tour-reviews-filter.ts` (new) — `MIN_VISIBLE_RATING = 3`, `filterVisibleReviews(rows)`.
- `src/components/TourReviews.tsx` — apply filter to visible list; keep `stats.average_rating` unfiltered for the star row and JSON-LD.
- `src/routes/experiences.tsx`, `src/routes/day-tours.tsx`, `src/routes/multi-day.tsx`, `src/routes/reviews.tsx` — add `ItemList`/`Review` JSON-LD in `head().scripts`.
- `src/routes/about.tsx`, `corporate.tsx`, `press.tsx`, `contact.tsx`, `proposal-in-portugal.tsx`, `faq.tsx`, `moments.tsx`, `portugal-tours.tsx`, `luxury-tours-portugal.tsx`, `private-tours-portugal.tsx` — add `BreadcrumbList` in `head().scripts` where missing.
- PT mirrors: `pt.experiences.tsx`, `pt.day-tours.tsx`, `pt.reviews.tsx`.

**No schema changes.** No new tables, no RLS work. Pure content + head() edits.

## What I'm explicitly NOT doing

- Not editing the emitted `AggregateRating` value to match the filtered visible average (that's the pattern that triggers penalties).
- Not scraping or attempting to remove TripAdvisor reviews from source.
- Not touching Stripe/refund/owner-response operational work — that's still on your side.

## Verification

After implementation:
1. Run Google Rich Results Test on `/tours/arrabida-wine-allinclusive`, `/experiences`, `/reviews` (locally via preview URL).
2. Confirm `AggregateRating.ratingValue` in JSON-LD matches the star row on-page (both are the unfiltered average).
3. Confirm every visible `<Review>` in the widget also appears as a `Review` node in JSON-LD.
4. Call `seo_chat--update_findings` if there's a matching finding.