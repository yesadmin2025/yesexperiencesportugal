## Goal

Make `/local-stories/<slug>` the single canonical pattern for all long-form editorial "story" pages. Every legacy top-level story/lander URL 301s to its `/local-stories/<slug>` counterpart. No article prose or layout changes; brand palette untouched.

## Slug mapping (legacy → canonical)

| Legacy path | New canonical |
|---|---|
| `/day-trips-from-lisbon` | `/local-stories/best-day-trips-from-lisbon` |
| `/arrabida-day-trip-from-lisbon` | `/local-stories/arrabida-day-trip-from-lisbon` |
| `/arrabida-wine-tour` | `/local-stories/arrabida-wine-tour` |
| `/sintra-day-tour-from-lisbon` | `/local-stories/sintra-day-tour-from-lisbon` |
| `/portugal-wine-tours` | `/local-stories/portugal-wine-tours` |
| `/wine-tours-lisbon` | `/local-stories/wine-tours-lisbon` |
| `/private-wine-tour-lisbon` | `/local-stories/private-wine-tour-lisbon` |
| `/alentejo-wine-tour-from-lisbon` | `/local-stories/alentejo-wine-tour-from-lisbon` |
| `/evora-private-tour-from-lisbon` | `/local-stories/evora-private-tour-from-lisbon` |
| `/evora-alentejo-wine-tour` | `/local-stories/evora-alentejo-wine-tour` |

Slugs are preserved 1:1 so the existing SEO equity carries over as cleanly as possible.

## Steps

1. **Move article content into `LOCAL_STORIES_ARTICLES`.** For each of the 9 legacy landers that isn't already an article, add a new entry in `src/content/local-stories-articles.ts` with the current page's title/meta/eyebrow/H1/standfirst/sections/CTA/related links/hero image, mapped verbatim from the existing route file. No copywriting changes — same words, same headings, same internal links, just relocated. `best-day-trips-from-lisbon` already exists; keep it.

2. **Flip the existing reverse redirect.** In `src/routes/local-stories.$slug.tsx`:
   - Delete the `beforeLoad` branch that 301s `best-day-trips-from-lisbon` → `/day-trips-from-lisbon`.
   - Delete the canonical override at line ~147 that points that one article at the legacy URL.
   - `/local-stories/<slug>` becomes self-canonical for every article, including the day-trips guide.

3. **Convert each legacy route file to a 301 redirect.** Replace the body of each of the 10 files under `src/routes/` with:
   ```ts
   export const Route = createFileRoute("/<legacy>")({
     beforeLoad: () => {
       throw redirect({ to: "/local-stories/$slug", params: { slug: "<canonical-slug>" }, statusCode: 301 });
     },
   });
   ```
   No component, no head — the redirect fires before render, and search engines / users land on the canonical URL. Files stay in place so `routeTree.gen.ts` regenerates cleanly and any external inbound link keeps working.

4. **Update internal links** to point at `/local-stories/<slug>`:
   - `src/components/Footer.tsx` (6 links in the SEO footer column).
   - `src/routes/local-stories.index.tsx` — remove the `isDayTripsGuide` branch and the `.filter(a => a.slug !== "best-day-trips-from-lisbon")` in the Blog JSON-LD; every article now routes through `/local-stories/$slug`.
   - `src/routes/portugal-tours.tsx`, `private-tours-portugal.tsx`, `luxury-tours-portugal.tsx`, `portugal-wine-tours.tsx` and any remaining `to="/day-trips-from-lisbon"` / sibling legacy paths → repoint at `/local-stories/$slug` with the matching `params`.
   - Cross-links inside the legacy files themselves become moot once those files are pure redirects, but the `SITE_LANDING_PATHS` array in `src/lib/jsonld-audit.functions.ts` gets updated to the new `/local-stories/*` URLs so the audit keeps scanning the real pages.
   - `public/llms.txt` day-trips entry.

5. **Sitemap.** In `src/routes/sitemap[.]xml.ts`, remove the 10 legacy `path` entries from the static list and drop the `a.slug !== "best-day-trips-from-lisbon"` filter so all Local Stories articles (now including the 9 migrated ones) are emitted once under `/local-stories/<slug>`. `admin.seo-monitor.tsx` seed URL swapped to the new canonical.

## Guardrails

- No article prose, headings, hero images, JSON-LD payloads, layout, spacing, typography, or palette tokens are altered — content is moved, not rewritten.
- Every 301 is a real HTTP 301 via TanStack's `redirect({ statusCode: 301 })` in `beforeLoad`, so both SSR crawls and client navigations return the correct status.
- The `local-stories.$slug` route's own placeholder/notFound guards stay intact.
- After edits: run `tsgo --noEmit`, then a Playwright pass that hits each legacy path and asserts a 301 to the new canonical + a 200 on the canonical.

## Out of scope

- Any change to Signature tour routes (`/tours/$tourId`, `/tours/$tourId/tailor`).
- Any new copywriting, new hero images, or new JSON-LD types.
- Any change to `/local-stories` (listing) URL itself — it stays as-is.
