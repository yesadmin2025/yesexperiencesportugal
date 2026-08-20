# SEO/technical stabilization pass + checkout contrast fix

No redesign, no pricing/Studio/Tailor/booking logic changes, no page removals, no URL structure changes.

## What I already verified (before planning)

- `/contact` and `/pt/contact` **already** emit `noindex, follow` for any non-empty `?type=` variant, each with its own absolute self-referencing canonical (`.../contact` and `.../pt/contact`). No cross-language canonical error. The two SiteGuru "canonical issues" are almost certainly a stale crawl, not a live defect — I will re-verify by fetching the rendered head rather than re-fixing.
- `robots.txt` is valid: single `User-agent: *` group, `Allow: /`, no CSS/JS/image blocks, sitemap declared.
- Checkout/Studio summary uses `text-[color:var(--charcoal-soft)]/80` and `text-[color:var(--charcoal)]/70-80` at 9.5–11px. `#555` at 80% over ivory lands near 4.1:1 — below the 4.5:1 axe threshold. That is the source of the 6 contrast violations.

## Work

### 1. Canonical / query parameters
- Fetch the rendered head for `/contact?type=corporate` and `/pt/contact?type=corporate` and assert: one canonical, absolute, self-language, `noindex, follow` present, `og:url` clean (no query string).
- Sweep other routes with `validateSearch` for the same pattern; only add the noindex+clean-canonical treatment where a parameter is genuinely a duplicate variant (no content difference).
- Confirm no query-string URL can enter the sitemap.

### 2. Sitemap / robots
- Audit every generated sitemap entry: canonical form only, no `?`, no noindexed route, no admin/QA/transactional path, no dynamic-slug placeholders.
- Leave robots.txt as is unless the audit finds a real gap. No new broad `Disallow`.

### 3. Hreflang
- Verify `localeAlternateLinks` emits absolute, reciprocal `en`/`pt-PT` (+ `x-default`) pairs and that every EN page claiming a PT twin has a real PT route. Drop alternates for pages with no true equivalent instead of inventing one.

### 4. Metadata / structured data
- Audit title/description/canonical/og:url/og:image on the main public routes for absolute URLs, correct self-reference and no variant leakage into `og:url`.
- Preserve the existing JSON-LD architecture. Fix only duplicate `@id`s, invalid URLs, or missing required fields. Organization/LocalBusiness stays bound to `src/config/business-nap.ts`.

### 5. Internal linking
- Identify public routes not reachable from nav/homepage/hubs and add a small number of natural, in-context links from the relevant hub pages. No keyword-stuffed link blocks.

### 6. Performance (low risk only)
- Find shared causes across the slow pages: oversized/unsized images, missing `loading="lazy"`/`decoding="async"` below the fold, missing `width`/`height`, duplicate imports, dead code.
- Apply only changes invisible to the eye. Design system, fonts, motion system and the builder stay untouched.

### 7. Similar content
- Classify the 36 flagged pages by cause (shared template chrome vs duplicated metadata vs genuinely repeated copy).
- Fix only duplicated titles/meta descriptions and thin/duplicated intro copy on the pages where a real, specific difference exists. No bulk rewrite. Brand voice unchanged.

### 8. Checkout contrast (axe)
Raise the failing tokens to AA in the checkout/Studio summary only:
- `src/components/checkout/ChargeSummaryLine.tsx`
- `src/components/checkout/guest-form-ui.tsx`
- `src/components/checkout/FinalDetailsDialog.tsx`
- `src/components/studio-v3/CheckoutSummary.tsx`
- `src/components/studio-v3/GuestDetailsStep.tsx`

Approach: drop the `/80`, `/70`, `/65` opacity modifiers on small functional text and use the solid `--charcoal-soft` / `--charcoal` tokens. Visually near-identical, measurably compliant. Placeholder text keeps its own token but moves to a passing value.

### 9. Validation
Build + typecheck, then verify `/`, `/pt`, `/contact`, `/contact?type=corporate`, `/pt/contact`, `/pt/contact?type=corporate`, `/sitemap.xml`, `/robots.txt`, and run `e2e/studio-v3-mobile-a11y-phases.spec.ts` to confirm zero contrast violations.

## Final report
A) files changed · B) what and why · C) deliberately untouched and why · D) build/test result · E) SiteGuru items needing external work (domain authority, backlinks, hosting/CDN latency).
