# SEO pages + search tracking — what's real work and what already exists

## What I checked first

- **Unique titles / descriptions / Open Graph:** already complete. The publish gate
  (`check:route-meta`) passes across 85 pages with no missing or duplicated title,
  description, og:title or og:description. Every experience page builds its own
  SERP-safe title and description, and every local story page carries its own
  title, description, og:title/description/url/type, share image, canonical and
  article structured data.
- **Search Console + analytics:** the Search Console account is already connected
  to this project. There are working server functions for verified properties,
  per-URL index status, sitemap submission/status, and top pages with clicks and
  impressions, plus an admin SEO monitor page. Analytics already tracks the full
  booking funnel (view → add to cart → begin checkout → payment info → purchase)
  with campaign attribution captured and kept for 30 days.
- **A new "best wine tours in Lisbon" landing page:** this is the one thing I
  recommend **not** doing as asked. Last session we found exactly that problem —
  nine near-identical wine pages splitting the same searches — and permanently
  redirected them into one strong guide. Adding another page on the same search
  would undo that fix and push the ranking back down.

## What I will build

### 1. Search performance panel (the real gap)
Add a search performance section to the admin SEO page showing, for the last 28
days and the 28 before it:
- clicks, impressions, average position and click-through rate per page
- the same per search query, so you can see which words actually bring visitors
- movement versus the previous period, so a drop is visible immediately
- the retired wine URLs listed separately, to confirm Google stops serving them

This reuses the existing Search Console connection and the existing top-pages
function; it adds a query dimension and a period comparison.

### 2. Bookings joined to search
Add a row to the same page showing, per landing page, how many people reached
guest details and how many completed payment, so search visits and real bookings
sit side by side instead of in two separate tools.

### 3. Strengthen the surviving wine guide instead of a new page
Add to `/local-stories/best-wine-tours-from-lisbon` only what is missing for
booking intent: a short "which day suits you" chooser near the top with a direct
reserve link per experience, and a booking call to action after each region
section. No new page, no new URL, no invented facts.

### 4. Redirect + indexing watch
Extend the existing monitor so each retired wine URL is checked automatically for
a permanent redirect and its index status, with a clear pass/fail list.

## Technical notes

- New/changed: `src/lib/gscMonitor.functions.ts` (query dimension + period
  comparison, admin-guarded as today), `src/routes/admin.seo-monitor.tsx`,
  `src/content/local-stories-articles.ts` (hub sections only),
  booking-funnel read via existing Supabase booking rows.
- Untouched: prices, inventory, tour facts, routes, cancellation rules, Stripe and
  booking logic, database schemas, typography and motion system.
- Validated at 393×852 and 1280×900, plus typecheck, focused tests and build.
  Nothing published until you say so.
