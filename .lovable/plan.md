# SEO verification sweep

Kick off a fresh SEO review of the live project so canonicals, sitemap entries, meta titles/descriptions, and JSON-LD are validated against the current build — the previous scan returned zero findings but pre-dates today's TrustStrip / CTA fixes.

## Steps

1. **Trigger a fresh SEO scan** via `seo_chat--trigger_scan` (user approval required). The scan takes ~1 minute and runs in the background.
2. **Point the user to the SEO tab** for the full results panel (canonicals, duplicate titles/descriptions, JSON-LD validation, preview/placeholder URL leaks).
3. **After the scan completes**, I'll read the findings and — for any real issue — either fix it in code or explain why it's a false positive, then mark it resolved.

## Coverage the scanner handles automatically

- Meta `<title>` and `<meta name="description">` — presence, length, uniqueness across routes, placeholder detection ("Lovable App", "Generated Project").
- `<link rel="canonical">` — presence on leaf routes, correct absolute URL, no cross-route drift.
- `og:*` / `twitter:*` — presence, absolute image URLs, no root-level `og:image` leaking into every route.
- `robots` / `noindex` — flags unintended blocks on public routes.
- Sitemap — reachability, valid XML, entries resolve 200, no preview/placeholder URLs.
- JSON-LD — schema validity (Organization, WebSite, Article, Product/Service, BreadcrumbList, FAQPage), no fake `aggregateRating`.
- Duplicate content signals across canonical URLs.

## What I'll spot-check manually alongside the scan

- Priority pages from the earlier audit: `/`, `/about`, `/corporate`, `/multi-day`, `/portugal-wine-tours`, `/wine-tours-lisbon`, `/arrabida-wine-tour`, `/tours/arrabida-wine-allinclusive`, `/tours/azeitao-cheese`, `/local-stories/best-wine-regions-near-lisbon`.
- Confirm `sitemap.xml` still lists only public canonical routes and excludes `/admin`, `/checkout`, `/auth`, `/qa`, `/preview-check`, `/studio-drift`, `/studio-v2`, `/portugal-travel-designer` (301→/multi-day).
- Confirm `robots.txt` `Host:` and `Sitemap:` still point at `yesexperiencesportugal.com`.

## Deliverable back to you

After the scan finishes:
- A. Passing checks (canonicals, sitemap, JSON-LD, meta uniqueness).
- B. Any issues found, grouped by page and by category.
- C. Recommended fixes for each — with a note on which are launch-blocking vs post-launch.

No code changes in this step — audit only.
