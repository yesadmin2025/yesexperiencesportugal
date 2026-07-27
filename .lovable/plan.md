## Goal

Remove the invented-feeling `/partners` hub and its three platform pages. Keep only three small icons in the footer, linking directly out to the real listings.

## What gets removed

- `src/routes/partners.tsx`, `src/routes/partners.index.tsx`, `src/routes/partners.$slug.tsx`
- `src/data/platform-partners.ts` (all the long unique copy, "verified facts", editorial notes)
- The four `/partners*` entries in `src/routes/sitemap[.]xml.ts`
- `e2e/platform-icons-a11y.spec.ts` partner-page test; the sitemap spec's `/partners*` expectations

## Footer change

Replace the "Also listed on" block's internal links plus the "View all partners" text link with a single row of three icon-only external links, opening in a new tab with `rel="noopener noreferrer"`:

- Viator → the canonical Viator tour listing already stored in the source-of-truth data
- GetYourGuide → `https://www.getyourguide.com/pt-pt/yesexperiences-portugal-s249432/` (tracking/visitor query params stripped)
- Tripadvisor → the existing Tripadvisor profile URL from business NAP config

Each keeps its `aria-label` ("Also listed on Viator", etc.), tooltip, 44×44 tap target and visible focus ring. Nothing else in the footer moves.

## Technical notes

- `AccessibleIconLink` currently takes a router `to`; it needs an external `href` mode (plain `<a>` with target/rel) — added without changing existing call sites.
- Old URLs: add 301 redirects from `/partners` and `/partners/*` to `/` so indexed pages don't 404.
- Update `e2e/platform-icons-a11y.spec.ts` to assert the external `href`s instead of internal routes.
- Grep confirms no other route links to `/partners`, so no orphaned internal links remain.
