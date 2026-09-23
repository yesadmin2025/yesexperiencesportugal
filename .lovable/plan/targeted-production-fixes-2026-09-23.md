# Targeted production fixes

## Scope
- Change only the requested Studio URL, theme color metadata, two broken Signature-card presentations, review rich-result eligibility, locale metadata, and analytics verification/integration.
- Preserve all prices, tour facts, booking/payment behavior, visual design, copy, schema policy, and unrelated routes.

## Implementation
1. **Canonical Studio URL**
   - Make `/studio` the sole rendered and canonical Studio route.
   - Permanently redirect `/studio-v3`, `/studio-v2`, `/studio-v1` if present, and existing Studio aliases to `/studio`, preserving query parameters.
   - Replace user-facing internal links and structured-data URLs, and regenerate the sitemap so only `/studio` is listed.
   - Keep internal component/test identifiers named `studio-v3` where they are implementation details rather than public URLs.

2. **Theme color**
   - Replace the invalid CSS-variable meta value with the literal primary brand teal hex.

3. **Signature cards and imagery**
   - Make bundled, durable tour imagery the first choice for Signature cards so the Arrábida card on `/experiences` cannot depend on an expired remote image.
   - Ensure the homepage Sintra & Cascais card uses the same complete source-backed title, rating, duration, price, and reserve-link structure as the other Signature cards.
   - Do not alter card styling or tour facts.

4. **Review count and Google schema**
   - Keep Product review schema restricted to eligible, visible first-party tour reviews.
   - Ensure the direct-review count is recognized even when only aggregate first-party stats are publicly readable, while external platform totals remain clearly attributed and excluded from Product JSON-LD.
   - Do not add self-serving Organization review schema or combine Google/platform counts into an ineligible aggregate.

5. **Hreflang and locale metadata**
   - Add reciprocal `en`, `pt-PT`, and EN `x-default` hreflang to every genuine EN/PT pair.
   - Emit `og:locale=en_US` plus `pt_PT` alternate on EN pages, and `og:locale=pt_PT` plus `en_US` alternate on PT pages, in server-rendered HTML.
   - Add regression coverage and report every EN route without a genuine PT equivalent rather than linking hreflang to redirects or missing translations.

6. **GA4 and SiteGuru**
   - After publication, run fresh production browser sessions for consent acceptance and rejection, and capture actual GA4 collect requests/page-view counts.
   - Connect SiteGuru to the real GA4 property through an available authenticated SiteGuru connector or dashboard. No SiteGuru connector is currently exposed, so if account access is unavailable, stop at that external-account boundary and state the exact remaining action without adding an unrelated tracking script.

## Validation and release
- Run focused tests, route/SEO checks, the full automated suite, and the production build.
- Browser-check `/`, `/experiences`, `/studio`, legacy Studio redirects, one paired EN/PT route, and the Arrábida tour review block at mobile and desktop sizes.
- Verify images load without 404s, Sintra metadata/CTA render, canonical/sitemap/hreflang are correct, and schema remains first-party only.
- Publish only after all code-level gates pass; then perform production GA4 verification. Do not claim the external SiteGuru connection unless it is actually completed.
