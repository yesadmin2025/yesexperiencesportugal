# Final Launch Verification Audit

Scope: read-only pass over the repo (routes, components, config, tests, sitemap, robots, JSON-LD, analytics, checkout) mapped against the Phase 3 plan and the launch QA checklist. No files changed.

---

## A. Fully completed items

- **NAP / license / location consistency** — `RNAVT` absent; no "based in Lisbon" / "Lisbon-based team" / "team from Lisbon" strings; canonical `RNAAT nº 31/2023` + `Based in Sesimbra, Portugal` live in `src/config/business-nap.ts`; guarded by `src/__tests__/nap-consistency.test.ts`. JSON-LD carries `RNAAT` as `propertyID` (`src/lib/jsonld.ts`).
- **Phone / WhatsApp literals** centralised through `PHONE_DISPLAY`, `whatsappUrl()`; allowlist test enforces no drift.
- **Invalid `/local-stories/$slug`** routes — `local-stories.$slug.tsx` has a proper `notFoundComponent`; not-found returns a clean 404 with `robots:noindex` (per route architecture rules).
- **Sitemap** — `src/routes/sitemap[.]xml.ts` includes only public canonical routes, excludes `/admin`, `/checkout`, `/auth`, `/qa`, `/e2e`, `/lovable`, `/preview-check`, `/studio-drift`, `/studio-v2`, `/hero-verify`, `/reviews`, `/portugal-travel-designer` (301→/multi-day), and dedupes DB posts against static articles.
- **robots.txt** — blocks all internal/QA/admin/checkout/auth paths, allows Googlebot/Bingbot, points to production sitemap; canonical host = `yesexperiencesportugal.com`.
- **CTA vocabulary lock** — `e2e/cta-vocabulary-lock.spec.ts` + `CtaPair` primitive; locked labels visible in Signature/Studio V3/tour pages.
- **Review source badges** — `ReviewSourceLink` primitive with 44×44 tap target, aria-label, `stopPropagation`, `rel="noopener noreferrer nofollow"`, no dead links.
- **Mobile behaviour** — snap-x reviews (no autoplay), Signature row peek, `--fab-lift` raises WhatsApp FAB when `MobileStickyCTA` is visible.
- **A11y sweep** — `FinalDetailsDialog` and `SimpleBookingForm` submit on Enter (real `<form onSubmit>`), programmatic labels, sr-only "(required)", focus-visible on hand-rolled buttons.
- **Analytics event hooks** — all 18 required event names (`hero_open_studio_click`, `hero_choose_experience_click`, `five_ways_*_click` ×5, `studio_start_click`, `studio_step_complete`, `studio_continue_draft_click`, `signature_reserve_click`, `signature_tailor_click`, `review_source_click`, `whatsapp_click`, `email_click`, `local_story_cta_click`, `checkout_started`, `payment_success`) present in source; GTM `GTM-M82SQS79` mounted in `__root.tsx`; dataLayer helper in `src/lib/analytics.ts`.
- **Performance safety** — hero `<img>` on `tours.$tourId.tsx` has `width/height`, `loading="eager"`, `fetchpriority` preload; video uses poster + `preload="metadata"`.
- **JSON-LD scaffolding** — Organization+WebSite in `__root.tsx`, per-template (Article/Product/BreadcrumbList) via `src/lib/jsonld.ts`; guarded by `src/__tests__/jsonld-per-template.test.ts` and `guest-quotes-jsonld.test.ts` (no fake aggregateRating).
- **Cancellation copy in shared config** — `CANCELLATION_SIGNATURE = "24h before the experience"`, `CANCELLATION_STUDIO = "before checkout"` (single source of truth in `business-nap.ts`).

## B. Partially completed items

1. **TrustStrip cancellation window is wrong for Signature.**
   `src/components/checkout/TrustStrip.tsx:35` defaults `cancellationHours = 48` and renders `Free cancellation up to 48h`. It is mounted **without an override** in:
   - `src/routes/checkout.$token.tsx:326` (bespoke)
   - `src/components/studio-v2/conversion/FinalBookingPanel.tsx:289` (Signature final panel)
   - `src/routes/tours.$tourId.tsx:186` (Signature tour page — via a *second* local `TrustStrip` component at line 342; also needs check)
   Canonical rule (memory + `business-nap.CANCELLATION_SIGNATURE`) is **24h** for Signature. The pre-flight NAP test regex only catches the pattern "48h cancel" (in that order), so this drift is not caught by the guardrail today.
   The file header comment on TrustStrip still literally says "Free cancellation up to 48h" — stale documentation reinforcing the wrong value.

2. **"Design & Book" CTA label not fully removed.** Plan §1 said to drop the ambiguous label; still present on:
   - `src/routes/wine-tours-lisbon.tsx:162, 258`
   - `src/routes/arrabida-wine-tour.tsx:128, 238`
   - i18n strings `nav.design_and_book` in `en/es/pt/common.json` (may be dead — needs a usage check).

3. **§7 performance pass** — plan marks it deferred:
   - GTM script in `__root.tsx` head is not deferred until after LCP.
   - AVIF/WebP conversion for top-of-fold imagery not done.
   - Not verified: every non-hero `<img>` has explicit `width`/`height` (there is no automated CLS test yet).

4. **JSON-LD coverage on key SEO landing pages** — `Service`/`Product` + `Offer` scaffolding exists in `src/lib/jsonld.ts`, but no test asserts each `tours.$tourId` variant and pillar pages (`/wine-tours-lisbon`, `/arrabida-wine-tour`, `/portugal-wine-tours`, `/multi-day`) actually emit it. Needs a per-URL render assertion.

## C. Not completed items

- **Cancellation copy audit outside TrustStrip** — no repo-wide test that surfaces every "48h" / "48 hours" / "48-hour" literal for review; only the reversed "48h cancel" phrase is guarded. Given finding B1, the guardrail needs to be widened.
- **Meta title/description uniqueness test** — no automated check that the priority routes (`/`, `/about`, `/corporate`, `/multi-day`, `/portugal-wine-tours`, `/wine-tours-lisbon`, `/arrabida-wine-tour`, `/tours/arrabida-wine-allinclusive`, `/tours/azeitao-cheese`, `/local-stories/best-wine-regions-near-lisbon`) all have unique, non-placeholder `<title>`/description. Should exist before public launch.

## D. Launch blockers

1. **TrustStrip shows "Free cancellation up to 48h"** on every checkout surface — contradicts the 24h Signature policy in `business-nap.ts` and public copy. This is visible right above every payment CTA. **Must fix before launch.**
2. **"Design & Book" CTA still on `/wine-tours-lisbon` and `/arrabida-wine-tour`** — breaks the CTA vocabulary lock announced to users. Two high-intent SEO landing pages.

## E. Non-blocking improvements

- Widen the NAP guardrail to reject any `48\s*h(ours?)?` / `48-hour` literal in prose (config file exempt).
- Add a Playwright test that visits the ten priority routes and asserts unique, non-empty `<title>` and `<meta name="description">`.
- Add a Playwright/vitest test asserting `Service|Product` JSON-LD is present on every `/tours/$tourId` and the four pillar pages.
- Defer GTM: convert `__root.tsx` GTM script to load after LCP (2s timeout fallback), per plan §7.
- Convert hero poster + top-of-fold imagery to AVIF via `vite-imagetools`.
- Remove or verify `nav.design_and_book` i18n keys.
- Update stale comment in `TrustStrip.tsx` header to reflect the correct window.

## F. Exact next implementation prompts

1. **Fix cancellation window in TrustStrip.**
   > In `src/components/checkout/TrustStrip.tsx`: import `CANCELLATION_SIGNATURE` and `CANCELLATION_STUDIO` from `@/config/business-nap`. Replace the `cancellationHours` prop with `variant: "signature" | "studio" | "bespoke"` (default `"signature"`). Render the label as `Free cancellation — {signature|studio|bespoke copy}` using the canonical strings — no numeric "48h" literal anywhere. Update the header comment. Update the three call sites: `tours.$tourId.tsx` and `FinalBookingPanel.tsx` pass `variant="signature"`; `checkout.$token.tsx` passes `variant="bespoke"`. Do not change layout, tokens, or motion.

2. **Remove "Design & Book" CTA label.**
   > In `src/routes/wine-tours-lisbon.tsx` (lines 162, 258) and `src/routes/arrabida-wine-tour.tsx` (lines 128, 238) replace the CTA text `Design & Book` with `Check availability & reserve` (primary) — keep the existing `href`/handlers, tokens, motion. Then grep for remaining `Design & Book` occurrences (including i18n `nav.design_and_book` in `en/es/pt/common.json`) and either remove the key if unused, or repoint its value to `Check availability & reserve`.

3. **Extend the NAP guardrail to catch any "48h" prose drift.**
   > In `src/__tests__/nap-consistency.test.ts` add to `FORBIDDEN_TOKENS`: `{ needle: /\b48\s?(?:h|hours?|-hour)\b/gi, reason: "Cancellation window is 24h for Signature — no 48h references in prose." }` and add the config file / this test to the allowlist for that specific rule if any legitimate "48h" appears there.

4. **Meta uniqueness Playwright test.**
   > Create `e2e/meta-uniqueness.spec.ts` that visits `/`, `/about`, `/corporate`, `/multi-day`, `/portugal-wine-tours`, `/wine-tours-lisbon`, `/arrabida-wine-tour`, `/tours/arrabida-wine-allinclusive`, `/tours/azeitao-cheese`, `/local-stories/best-wine-regions-near-lisbon`. For each: assert `<title>` and `<meta name="description">` are non-empty, do not include "Lovable" or "Generated Project", and — across the batch — are all unique.

5. **Defer GTM until after LCP** *(post-launch OK).*
   > In `src/routes/__root.tsx` head scripts array: move the GTM `<script>` from a synchronous head entry to one that injects after `window.load` + `2000ms` fallback timer, preserving the existing container ID `GTM-M82SQS79` and dataLayer bootstrap. No change to `data-analytics` attributes.

## G. Final launch verdict

**Ready to launch after minor fixes.**

Two blockers only — both label/copy fixes, no architecture change:

- Cancellation window in TrustStrip (24h Signature, not 48h)
- "Design & Book" removal on `/wine-tours-lisbon` and `/arrabida-wine-tour`

Everything else (guardrails, deferred GTM, meta uniqueness test, AVIF, JSON-LD assertions) is non-blocking and can ship in the week after launch.
