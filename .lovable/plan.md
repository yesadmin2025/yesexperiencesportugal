## Scope

Two workstreams the user asked for in this turn:

**A. Visual consistency pass across inner pages**

- use real images already sent and in db from team tours for each page matching the content make them high resolution Migrar og:images do bucket Lovable para domínio de produção.
- Match homepage motion (`.home-energy` sequenced reveals, hover lift, gold sheen) on `/day-tours`, `/experiences`, `/multi-day`, `/about`, `/proposal-in-portugal`, `/corporate`, `/local-stories`, tour detail pages. Update more animations for the site to feel alive but premmium no bouncing and uniform in alll pages
- Extend the `arrow-nudge` idle motion (already on `CtaButton`) to any remaining inline CTA arrows on inner pages.

**B. Site hygiene / SEO fixes**

1. `yesexperiences.pt` → `yesexperiencesportugal.com`: audit `src/lib/legacy-domain-redirect.ts` + `src/start.ts` to confirm every path 301s to the canonical apex (and add a wildcard fallback so unmapped paths 301 instead of 410, per user request).
2. Remove obsolete 301s for `/proposals`, `/contact`, `/local-stories` where the equivalent routes are now active — turn them into real route files (or drop the redirect if the target already exists as a live route).
3. Global copy fix: replace every `RNAVT` → `RNAAT nº 31/2023`, and correct any `Lisbon`-as-basecity references to `Sesimbra` (only where it refers to the operator's base, not tour pickup/region context).
4. `/builder` → `/studio-v3`: confirm the redirect exists (it does) and rewrite every internal `to="/builder"` link to `to="/studio-v3"` so we stop bouncing users through a 301.
5. Unify footer payment badges to one canonical `<PaymentMethodsRow />` set across every footer surface.

## Approach

### A1. Image dedupe audit

- Add `scripts/audit-image-usage.mjs` to list every `<img>`/`TourImage` src across `src/routes/**` and `src/components/**` and flag files where the same tour is rendered with different image sources.
- Consolidate to `getTourGallery(tour, meta)` + `useImportedTourImages().resolveImg` everywhere; 

### A2. Homepage-parity motion on inner pages

- Wrap the top-level `<SiteLayout>` children on each inner route in the `home-energy` reveal cadence (already available in `useMarketingMotion` — `/day-tours` uses it; extend to the routes that don't).
- Ensure every primary CTA on inner pages uses `<CtaButton>` (so it inherits the `arrow-nudge` keyframe added last pass). Replace any bespoke `<Link>` + arrow with `<CtaButton>`.

### A3. CTA arrow motion

- Sweep for inline `<ArrowRight />`/`→` usages not inside `<CtaButton>` and either migrate them or add the `arrow-nudge` class directly.

### B1. Legacy domain

- Edit `src/lib/legacy-domain-redirect.ts`: after the mapped-path lookup, replace the `410 Gone` fallback with a 301 to `https://yesexperiencesportugal.com${pathname}${search}`.
- Update the existing tests to reflect the new fallback.

### B2. Stale redirects

- `src/routes/proposals.tsx` currently 301s → `/proposal-in-portugal`. User wants the redirect eliminated: keep `/proposal-in-portugal` as canonical (it's the SEO-targeted URL) but restore `/proposals` as a live route rendering the same component (or vice-versa — confirm target below in Questions).
- Same treatment for `/contact` and `/local-stories` (I'll read each redirect file to see the current target).

### B3. RNAVT / Lisbon copy

- `rg -n "RNAVT"` and `rg -n "\bLisbon\b"` across `src/**` + `public/**`. Fix `RNAVT` → `LICENSE_LABEL` (or the literal `RNAAT nº 31/2023`). For `Lisbon`, only replace instances that describe the operator's base city (footer, About, JSON-LD `addressLocality`, structured data, meta descriptions that say "based in Lisbon"). Leave tour pickup/region copy that legitimately mentions Lisbon alone.

### B4. `/builder` internal links

- `rg -n "to=\"/builder\"|href=\"/builder\"|/builder\b"` across `src/**`. Rewrite every internal `<Link>`/`<CtaButton>`/nav item to `/studio-v3`. Leave the `/builder` route file (301) as a safety net for external inbound links.

### B5. Footer payment badges

- Locate every footer (`src/components/Footer.tsx`, any locale variants, any per-page footer in Studio/Signature) and ensure they all render the single `<PaymentMethodsRow />` component. Remove any hand-rolled badge lists.

## Files (expected)

- `scripts/audit-image-usage.mjs` (new)
- `src/lib/legacy-domain-redirect.ts` + its test
- `src/routes/proposals.tsx`, `src/routes/contact.tsx` (if it's a redirect), `src/routes/local-stories*.tsx`
- Global copy pass touching footer, About page, business-nap consumers, JSON-LD helpers
- Nav + CTA files referencing `/builder`
- Inner-route pages (`/experiences`, `/multi-day`, `/about`, `/proposal-in-portugal`, `/corporate`, tour detail) for motion + CTA parity + image dedupe
- `src/components/Footer.tsx` and any secondary footers

No schema, backend or pricing logic changes.

## Rollout order

1. B3 copy fixes (RNAVT / Lisbon) — safest, high-trust.
2. B1 legacy-domain fallback + tests.
3. B4 `/builder` internal link rewrite.
4. B2 redirect eliminations (needs a couple of clarifications below).
5. B5 footer payment badge unification.
6. A1–A3 image dedupe + motion parity + arrow nudge sweep across inner routes.
7. Update `.lovable/plan.md` + `src/generated/brand-audit.json`.

## Clarifications needed before I start B2

- `/proposals`, `/contact`, `/local-stories` — for each, do you want the CANONICAL URL to switch back to the short one (so `/proposals` becomes the live page and `/proposal-in-portugal` 301s to it), OR do you want BOTH URLs to render the page (no redirect, duplicate canonical resolved with `<link rel=canonical>`)? SEO-safest is option 1 for `/contact` (short is canonical) and keeping `/proposal-in-portugal` canonical for the keyword-targeted proposals page while ALSO serving `/proposals` live. I'll confirm before touching those files.
- yes