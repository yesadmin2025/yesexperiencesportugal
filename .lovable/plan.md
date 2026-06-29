# Real review aggregation — Viator + TripAdvisor + GetYourGuide

## Honest note up front

There is no public API for Viator/TripAdvisor/GetYourGuide review feeds. The realistic way to pull *real* per-review text is to scrape the platform's own tour pages with **Firecrawl** (already connected). Limitations to expect:

- ~5–10 visible reviews per platform per tour per scrape (platforms paginate the rest behind JS).
- Author names are first-name only; country sometimes missing — exactly as shown publicly.
- A scraped review can go stale if the platform removes it. We store `source_url` + `scraped_at` so you can re-verify.
- The "700+" claim must come from your manually entered per-platform totals (`tour_external_ratings`) — those are the only authoritative counts.

Per your answers: **counts mixed first-party + external; AggregateRating uses first-party only; build `/reviews` now.**

## What I'll build

### 1. Data — extend existing tables, no breaking changes

- `tour_reviews` already has `source`, `body`, `rating`, `reviewer_name`, `reviewer_country`, `source_url`, `verified`, `is_published`, `is_featured`. Add: `scraped_at timestamptz`, `external_id text` (to dedupe across scrapes), `language text default 'en'`. Unique index on `(source, external_id)` where `external_id is not null`.
- `tour_external_ratings` stays as-is (per-platform counts/averages, manual via `/admin/reviews`).
- Add `tour_review_scrapes` (id, tour_id, source, source_url, status, fetched_count, error, created_at) for audit.

### 2. Server fn — `scrapeTourReviews({ tourId, source })`

- Admin-only (`requireSupabaseAuth` + `has_role('admin')`).
- Reads `signatureTours[tourId].externalUrls.{viator,tripadvisor,getyourguide}` (we already store these).
- Calls Firecrawl `scrape` with structured JSON extraction (schema = array of `{ author, country?, rating, body, dateText? }`).
- Normalizes, generates stable `external_id` (hash of `source + author + first 80 chars of body`), upserts into `tour_reviews` with `source_url`, `scraped_at`, `verified=true`, `is_published=false` (admin reviews before publishing).
- Writes a `tour_review_scrapes` audit row.

### 3. Admin — extend `/admin/reviews`

- Per tour, per platform: "Refresh from Viator/TripAdvisor/GYG" button → calls scrape fn → shows new draft reviews → bulk-publish + feature picker (5–8 per tour).
- Keeps the existing manual counts/averages section (`tour_external_ratings`) — that's the source for the "700+ across platforms" line.

### 4. Aggregation server fns (public, read-only, RLS-respecting)

- `getGlobalReviewSummary()` → `{ totalAcrossPlatforms, averageAcrossPlatforms, firstPartyCount, firstPartyAverage }`. Totals/averages are weighted across `tour_external_ratings` + first-party reviews.
- `getTourReviewSummary(tourId)` → same shape per tour.
- `getCuratedReviews({ tourId?, limit })` → published, featured-first, mix of sources, capped 5–8.
- `getAllReviewsGroupedByTour()` → for `/reviews` page.

### 5. Frontend wiring (mobile-first, brand-token only)

- Homepage `GuestQuotes`: switch to `getGlobalReviewSummary` + `getCuratedReviews({ limit: 6 })`. Keep the existing platform-icons strip with the manual totals.
- Signature tour pages `<TourReviews>`: per-tour summary + 5–8 reviews, source labels per card.
- New `/reviews` route: grouped by tour, summary band, breadcrumbs.

### 6. Structured data

- AggregateRating JSON-LD on home, tour, and `/reviews`: **first-party reviews only** (your choice). Counts and averages computed from published `tour_reviews` where `is_first_party=true`.
- Review JSON-LD: only for reviews actually rendered on the page (visible content match).
- No schema generated from external scraped reviews — they appear as visible "via Viator / via TripAdvisor / via GetYourGuide" cards without `Review` markup, which keeps us compliant with Google's policy and your no-fake-data rule.

### 7. Trust copy

- Single line above the reviews block: "Based on verified guest reviews across major booking platforms."
- Per-card source label: "via Viator" / "via TripAdvisor" / "via GetYourGuide" / "via YES guest" (first-party).

## What I will NOT do

- No invented reviews, no invented ratings, no padded counts.
- No `Review` JSON-LD for scraped platform reviews (would risk schema-mismatch penalties).
- No hidden content; everything in JSON-LD is on the page.
- No changes to Stripe/Bókun/Studio/pricing/booking flow.

## Technical details

- Migration adds 3 columns + 1 audit table + 1 unique index. Public reads stay restricted to `is_published=true`.
- Scrape fn returns `{ inserted, updated, skipped, errors }` for the admin UI.
- Firecrawl call uses `formats: [{ type: 'json', schema, prompt }]` with `onlyMainContent: true` and a sensible `waitFor` for JS-rendered review widgets.
- Aggregation fns are server fns (RLS-respecting) and called from public route loaders via Query (no bearer needed).
- `/reviews` is a public top-level route, SSR on, with breadcrumb + AggregateRating JSON-LD scoped to first-party.

## Output you'll get

- Per-tour totals (counts + averages) on each signature page.
- Global totals on homepage + `/reviews`.
- 5–8 curated cards per tour, with real source attribution.
- AggregateRating schema, first-party only, matching visible content.
- Audit trail of every scrape in `tour_review_scrapes`.

Approve to proceed and I'll start with the migration.

&nbsp;

If possible hide a few negative ones