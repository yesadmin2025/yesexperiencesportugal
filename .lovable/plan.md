# Surgical final pass

## Scope and safeguards
- Work from the current project state without redesigning any page or changing approved motion, typography, pricing, booking, Stripe, Studio, SEO architecture, or backlink strategy.
- Preserve the protected wine guide’s title, H1, canonical, short answer, methodology, FAQs, intent split, and internal links.
- Publish only after every required validation passes and no blocker or high-risk regression remains.

## Implementation
1. **Correct the two factual passages and brand casing**
   - Update the protected wine guide so Azeitão is described as the hands-on craft and food day built around the cheese workshop, one winery, Azeitão, and Sesimbra.
   - Make lunch wording explicitly route-specific rather than claiming every full-day wine route includes lunch.
   - Normalize the Arrábida operator sentence to “YES Experiences Portugal” and search owned public copy for the same incomplete/lower-case form.
   - Add focused regression coverage that locks these facts and all protected SEO fields.

2. **Clarify review sources without changing ratings or counts**
   - Update the shared tour proof presentation so external-platform totals are visibly attributed as platform reviews.
   - Label the direct review block as reviews collected directly by YES with its unchanged first-party count.
   - Confirm all affected tour pages inherit the shared clarification and that Product structured data remains first-party only.

3. **Prove GA4 behavior in a fresh browser**
   - Test both consent paths on a production-equivalent build: default denied, Accept all → granted, direct tag load, one initial collection hit, and exactly one additional SPA page view.
   - Test Essential only/rejection keeps analytics denied and emits no analytics hit.
   - Inspect data-layer and network evidence for duplicate page views caused by the direct Google tag plus GTM.
   - Change tracking code only if this test proves a site-side defect; otherwise retain the implementation and identify `G-MLYSPHSN41` as the emitted property ID and the external property connection/data freshness as the remaining cause.

4. **Apply only measured, visually neutral performance improvements**
   - Establish mobile production-build baselines for `/about`, `/lisbon-private-tours`, `/contact`, `/day-trips-from-lisbon`, `/faq`, `/cookies`, `/how-many-days-in-portugal`, and `/book`.
   - Inspect shared scripts, widgets, hydration work, route bundles, maps/media, and below-fold images before changing anything.
   - Apply only a shared or route-specific optimization that is safe, visually neutral, and measurably improves an affected route; otherwise leave code unchanged.
   - Re-measure every changed route and report comparable before/after results.

5. **Triage current security evidence conservatively**
   - The persisted scanner currently reports no active findings. A fresh deep scan reports 11 public-read findings already ignored by the user; these will not be reopened or modified.
   - Classify any newly active findings as genuine actionable, intentional public read, false positive, informational, or manual review.
   - Fix and mark only low-risk genuine issues supported by scanner evidence and regression tests. Leave ambiguity open.
   - Separately classify dependency advisories, applying upgrades only if a safe compatible update is available and validated; do not force transitive overrides that risk product behavior.

## Validation and release gate
- Run type checking, focused factual/copy tests, review-attribution tests, analytics consent/page-view browser tests, and any relevant security regression tests.
- Run the full test suite and production build.
- Smoke-test homepage, About, Experiences, Arrábida Signature, wine guide, Contact, and booking flow at 393×852, 430×932, 768×1024, and 1440×900; repeat the booking flow at 200% text size and stop before payment submission.
- Confirm no site-attributable browser console errors, no protected SEO drift, no `700+`, unchanged 4.9/5 · 1,000 owned-site certificate, and first-party-only review schema.
- Publish only if every gate passes; otherwise stop and report the blocker.

## Final report
- List exact files and copy changes, GA4 browser evidence and root cause, route-level performance before/after, security classification totals and reasons, exact validation results, final commit SHA, and publication status.
- Report separately that backlink strategy was untouched and that hotel partners, wineries/venues, travel advisors, wedding planners, and Portugal/travel editorial are the five highest-value outreach categories and the next off-page priority.
