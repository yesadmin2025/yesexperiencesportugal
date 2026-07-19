Complete the approved Motion System v2 plan

Foundation (Batch 1) and most of Batches 2–3 are already shipped. This plan closes the outstanding items in the same order §11 defined, with no new scope. All work stays inside the plan's exclusions (Studio, Builder, Tailor, Checkout, admin, auth submit, api, sitemap, etc. remain untouched).

## Current adoption (verified)
Scene wrappers live in: `__root.tsx`, `about.tsx`, `contact.tsx`, `experiences.tsx`, `local-stories.index.tsx`, `press.tsx`, `reviews.tsx`, `unsubscribe.tsx`. Motion tokens, hooks, primitives, `RouteFade`, and `data-motion-ready` gate all exist in `src/lib/motion/`, `src/components/motion/`, and `src/styles.css`. Homepage `.home-energy` block is present at `styles.css` line 3904+ and untouched.

Note: `studio-v3.tsx` currently has Scene wraps on the intro/aside. Studio is on the plan's exclusion list — those wraps will be removed to restore §0.

## Batch 2 tail (L1 + L2 + footer + 404)
- Footer: opacity fade on route change only (single component, apply once). Verify footer sits outside `RouteFade` or shares one transition — no double-opacity.
- L1 titles: add `Scene` title fade on `terms.tsx`, `privacy.tsx`, `cookies.tsx` + PT twins.
- L2 tail: `review.$token.tsx` heading Scene; `booking-confirmed.tsx` — confirm existing check-icon scale-in matches spec (240ms, motion-safe).
- 404 (`NotFoundComponent` in `__root.tsx`): confirm the single soft reveal exists; do not gate on IO.

## Batch 3 tail (L3)
- `local-stories.$slug.tsx`: hero image `RevealImage motion="mask"`, one pull-quote Scene, related-experience Scene at end, and the reading-progress bar via `transform: scaleX(var(--reading-progress))` (non-interactive, `aria-hidden`, disabled under reduced motion).

## Batch 4 (L4 Homepage)
- `index.tsx` + `pt.index.tsx`: reconcile with `.home-energy`. For each hero/section already animated by `.home-energy`, keep `.home-energy` as the winner and do NOT add Scene on the same element. Add Scene only to sections that currently have no motion (e.g. Occasions rows below the fold, testimonials strip, closing CTA). No home-energy CSS repointing needed — tokens are already aliased.

## Batch 5 (L4 Signature detail)
- `tours.$tourId.tsx`: `ChapterLead` on the opening block, `RevealImage motion="mask"` on the editorial gallery (NOT hero — hero stays `motion="none"` for LCP), itinerary stops with `.scene-item` stagger, and one `CtaSentinel` placed after itinerary stop #3 that toggles the sticky Reserve CTA's `data-cta-active` for arrow-translate emphasis.

## Batch 6 (L4 landings — Level-3 density per §8)
Apply the reduced density variant: fewer masks, shorter sequences, hero stays `motion="none"`.
- Campaign narrative pages (full L4): `corporate.tsx`, `pt.corporate.tsx`, `moments.tsx`, `pt.moments.tsx`, `multi-day.tsx`, `portugal-travel-designer.tsx`, `proposal-in-portugal.tsx`, `proposals.tsx`, `pt.proposals.tsx`.
- SEO landings (L4 vocabulary, L3 density): `arrabida-wine-tour.tsx`, `arrabida-day-trip-from-lisbon.tsx`, `alentejo-wine-tour-from-lisbon.tsx`, `evora-alentejo-wine-tour.tsx`, `evora-private-tour-from-lisbon.tsx`, `sintra-day-tour-from-lisbon.tsx`, `wine-tours-lisbon.tsx`, `private-wine-tour-lisbon.tsx`, `portugal-wine-tours.tsx`, `portugal-tours.tsx`, `private-tours-portugal.tsx`, `luxury-tours-portugal.tsx`, `day-trips-from-lisbon.tsx`, `day-tours.tsx`, `pt.day-tours.tsx`, `pt.experiences.tsx`, `itineraries.10-day-private-portugal-tour.tsx`.

Density rule per route: at most 1 `ChapterLead`, 1 `RevealImage motion="mask"`, and one `.scene-item` stagger group. No IO on above-the-fold hero.

## Batch 7 (Navbar + CtaButton polish)
- `Navbar.tsx`: condensed inner-scale `scale(0.94)` on logo (240ms), border fade-in on scrolled state, mobile menu 240ms slide+fade with 60ms per-item stagger. No header height animation. Touch targets ≥44px preserved.
- `CtaButton.tsx`: arrow translate + press scale bound to `var(--dur-tap)` / `var(--ease-snap)`. No pulse. Verify `data-cta-active` state hooks into arrow-translate for `CtaSentinel` emphasis.

## Batch 8 (QA sweep — §12)
- `bun run check:css` + typecheck + Playwright hero/motion specs.
- Manual pass at 393×852 and desktop for: JS-off content visibility (documented via SSR HTML check), reduced-motion (no transforms), keyboard focus visibility across `RouteFade`.
- Verify no persistent `will-change` on `<img>` after reveals (RevealImage cleanup).
- Confirm `studio-v3.tsx` no longer contains Scene wraps.

## Files touched (wrapping/classes/sentinel placement only)
Foundation, Studio revert, Footer, L1 (6), L2 tail (2), L3 tail (1), Home (2), Signature detail (1), landing pages (17), Navbar, CtaButton. No business logic, no data changes, no route additions.

## Not touched (unchanged from §0)
Studio, Builder, Tailor, Checkout, admin, auth submit, api, sitemap, mcp, email, lovable, pt splat, qa/hero-verify/preview-check, `BrandedCheckoutDrawer`, `SimpleBookingForm`, Stripe surfaces, `TourReviews` sorting.

Ready to execute on approval.
