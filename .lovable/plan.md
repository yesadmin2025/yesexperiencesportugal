Final SEO validation and website fully prepared and fixed what's not consistent or breaking & launch pass

Current scanner state (all scanners current, commit a361371): **2 failing findings**, everything else passing.

## 1. Sitemap coverage (`http:sitemap`, mid)

Scanner flags 5 routes missing from the sitemap. Verified state of each:


| Route                     | Reality                                                                                                                       | Action                                                                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/reviews`                | Live page, `robots: index, follow`, self-canonical `/reviews` — but deliberately excluded from the sitemap as a "thin widget" | **Real inconsistency.** Decide one way: add it to the sitemap (priority 0.5, monthly), or make it `noindex` + canonical to `/about`. Recommendation: add to sitemap — it has real guest-review content and supports the AggregateRating entity. |
| `/pt/reviews`             | Same page, PT locale, excluded via the `!== "/reviews"` filter                                                                | Follow the same decision; if indexed, include with reciprocal hreflang already produced by `localeAlternateLinks`.                                                                                                                              |
| `/proposals`              | Live page, canonical points to `/proposal-in-portugal`                                                                        | Correct as-is. Non-canonical duplicates must not be in a sitemap. No change.                                                                                                                                                                    |
| `/admin/drift-behavior`   | Internal admin                                                                                                                | Confirm `noindex` in its `head()`; `Disallow: /admin` already covers crawling. No sitemap entry.                                                                                                                                                |
| `/.lovable/oauth/consent` | Platform OAuth route                                                                                                          | `robots.txt` disallows `/lovable` but **not** `/.lovable`. Add `Disallow: /.lovable` to the existing `User-agent: *` block.                                                                                                                     |


After the reviews decision is applied, mark the finding fixed with an explanation covering both the added entries and the intentional exclusions.

## 2. `<html lang>` (`lint:page_basics`, low)

`src/routes/__root.tsx:251` already renders `<html lang={LOCALE_BCP47[locale]}>`, so the source is correct — the scanner most likely read a stale published build. Verify by fetching the **published** HTML at `https://yesexperiencesportugal.com/` and `/pt/` and grepping the raw SSR response for `lang=`. If present, mark the finding fixed as a stale-scanner verification. If absent in SSR output (locale resolved only after hydration), give the root a static default `lang="en"` fallback so the server-rendered shell always carries it.

## 3. Re-verify the rest of the SEO contract

Run the existing guards rather than eyeballing:

- `bunx vitest run src/__tests__/jsonld-per-template.test.ts src/i18n/__tests__/hreflang-reciprocity.test.ts src/__tests__/review-certificate-sync.test.ts`
- `bunx playwright test e2e/sitemap-robots-canonical.spec.ts e2e/jsonld-rendered.spec.ts`
- Fetch `/sitemap.xml` and `/robots.txt` from the running app: assert every `<loc>` returns 200 (no redirects, no noindex URLs), and that no `Disallow`'d path appears in the sitemap.
- Spot-check canonical + `og:url` self-reference on `/`, `/experiences`, `/studio-v3`, `/multi-day`, `/trade`, `/partners`, `/local-stories/<slug>`.

## 4. Launch

Run a security scan, then publish. Report the final finding states and anything intentionally left as-is (with the reason), so nothing is silently pending. Typography, copy, spacing, conversion, nothing breaks and it's all perfect ok

