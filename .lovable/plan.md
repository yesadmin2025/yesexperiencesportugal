## P0 technical SEO, indexation and route integrity

Scope: head metadata, sitemap, robots, redirects, and CTA/heading semantics only. No design, pricing, Stripe, Tailor, Studio logic, tour IDs or slugs change.

### What I verified first (current state)

- `src/start.ts` already returns a single-hop 404 with `x-robots-tag: noindex` for any path containing a literal `$name` segment (decoded, so `%24slug` is covered). No redirect chain for `/local-stories/%24slug` in code.
- `src/routes/sitemap[.]xml.ts` already filters placeholder slugs and excludes redirect/admin/QA routes. It emits **no `/pt/*` URLs at all**.
- Only `corporate.tsx`, `trade.tsx` carry hreflang on the English side; the PT pages (`pt.about`, `pt.contact`, `pt.cookies`, `pt.privacy`, `pt.terms`, `pt.reviews`, `pt.corporate`) point at EN equivalents that mostly do **not** point back — hreflang is non-reciprocal.
- `src/i18n/seo.ts` (`buildI18nHead`) exists and is used by zero routes.
- `src/routes/local-stories.index.tsx` has no `rel="canonical"`.
- 49 routes already declare `noindex`; admin/checkout/auth/QA coverage looks broad but needs a completeness sweep.

### A. Malformed / placeholder URLs

1. Full-codebase sweep for `$slug`, `$tourId`, `${`, `undefined`, `null`, `%24` appearing inside emitted `href`/`to`/canonical/og:url/sitemap strings (excluding legitimate `<Link to params>` usage and the generated route tree).
2. Keep the existing 404 middleware; add a Playwright regression asserting `/local-stories/%24slug` and `/local-stories/$slug` return 404 in one hop with `noindex`, and that `/tours/$tourId` does the same.
3. Add a runtime guard in `local-stories.$slug.tsx` and `tours.$tourId.tsx`: unknown/placeholder param → `notFound()` (hard 404 + noindex), never a redirect.

### B. Canonicals

- Add the missing self-canonical to `/local-stories`.
- Sweep every indexable route so each emits exactly one self-referencing canonical on `https://yesexperiencesportugal.com`, no leaf duplicates, none in `__root.tsx`.
- Confirm no query-parameter state (checkout token, filters, Tailor config, `?heroVariant=`) produces a differing canonical — canonicals stay parameter-free.

### C. Hreflang (reciprocity)

- Route every locale-paired page's head through the existing `buildI18nHead` helper so the EN↔PT pairs emit identical, reciprocal sets plus `x-default`.
- Genuine pairs to wire (EN side currently missing the return reference): `/about`, `/contact`, `/cookies`, `/privacy`, `/terms`, `/corporate`, `/day-tours`, `/experiences`, `/reviews`, `/` ↔ `/pt`.
- Remove hreflang from PT pages whose EN target is a redirect or absent (`pt/faq`, `pt/moments`, `pt/proposals` are 301s — they get `noindex` instead of alternates).
- Deliver a report table of EN pages with no genuine PT equivalent (no hreflang added for those).

### D. Sitemap

- Add the PT pages that are real 200 canonical pages (`/pt`, `/pt/about`, `/pt/contact`, `/pt/experiences`, `/pt/day-tours`, `/pt/corporate`, `/pt/privacy`, `/pt/terms`, `/pt/cookies`) — currently absent, so PT is effectively undiscoverable.
- Re-verify each existing entry returns 200 and is not a redirect; drop any that fail.
- Keep `lastmod` only where a real timestamp exists (DB `published_at`); no generated "today" values.
- Extend `e2e/sitemap-robots-canonical.spec.ts` with the PT set, a 200-status check per URL, and a "no `%24`/`$` in any `<loc>`" assertion.

### E. Robots / noindex

- Sweep for any indexable route among: checkout steps, payment success/cancel, booking receipt, Tailor draft states, Studio temp state, admin, auth, previews, token routes (`/s/`, `/i/`, `/review/`). Add `robots: noindex, nofollow` where missing.
- `public/robots.txt`: keep `Allow: /` and existing disallows; confirm no CSS/JS/image path is blocked.

### F. Semantic HTML / concatenated CTA strings

- Audit rendered DOM on `/`, `/experiences`, `/tours/:id`, `/studio-v3`, `/day-tours` for the reported concatenations ("Open the StudioChoose your Experience", "Check availability & reserveTailor this day", repeated "Add…Add", "ImageImageImage").
- Fixes are markup-only: split fused CTAs into separate interactive elements, unnest any anchor-in-anchor / button-in-anchor, restore one `h1` per page with ordered `h2`/`h3`, add `aria-label` where visible text is insufficient, and give card blocks proper `article`/heading structure.
- Add a Playwright a11y/structure spec asserting: no nested interactive elements, single `h1`, and no accessible name containing two CTA labels.

### G. Validation

Production build, `tsgo` typecheck, full vitest suite, the new + existing Playwright specs (sitemap/robots/canonical, malformed-URL 404s, semantics), plus a manual pass over booking/Tailor flows to confirm nothing broke. No publish.

### Deliverable report

Files changed · route problems found · redirects created · canonical + hreflang changes · pages excluded from indexing · build/test results · off-codebase actions (Search Console: resubmit sitemap, request removal of `/local-stories/%24slug`, validate hreflang in the International Targeting report).
