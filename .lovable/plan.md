# Launch Polish Plan

Six focused workstreams, sequenced so the highest-risk items (money math, mobile checkout) land first and the cosmetic passes ride on top.

## 1. Image context audit (page-by-page)

Goal: every image belongs to the page it sits on — no duplicates across Moments / Corporate / Travel Designer / Proposals, no generic swaps.

- Sweep the image imports on: `moments.tsx`, `corporate.tsx`, `portugal-travel-designer.tsx`, `proposals.tsx`, `proposal-in-portugal.tsx`, `experiences.tsx`, `about.tsx`, `contact.tsx`, plus the PT mirrors.
- Build a duplicate map (same `.jpg` used on ≥2 unrelated pages) and flag mismatches (e.g. wine photo on Corporate hero).
- Replace mismatches with the correct real photo from `src/assets/guests/*` or Viator gallery for that context — no stock, no invented imagery (per brand guardrails).
- Report the swap list back before executing so you can veto individual choices.

Out of scope: Signature tour pages (already source-of-truth to Viator) and homepage hero (locked).

## 2. Checkout & pricing math verification

Goal: prove the total on every price surface (SignaturePriceCard, sticky CTA, CheckoutSummary, Tailored, Studio V3 reveal) is byte-identical and correct per pax + add-ons + guest count.

- Run the existing matrix specs: `studio-v3-price-recompute-matrix`, `studio-v3-add-ons-total`, `studio-v3-add-ons-disabled-never-affect-total`, `checkout-full-flow`, `checkout-surfaces-smoke`, `bokun-checkout-coverage`, `instant-booking-checkout`.
- For any failure: diagnose in `signatureTourPricing.ts` / `SignaturePriceCard` / `BandedSignatureBookingForm` / `booking-quote` edge fn and fix at the source, not per surface.
- Manual mobile pass (393×588) through Signature reserve + Tailored + Studio V3 reveal → guest details, confirming totals match at each step.
- Report: green matrix + screenshots of the 3 checkouts on mobile.

## 3. Mobile polish across checkouts + storytelling

Goal: 393px is perfect — no overflow, hit targets ≥44px, sticky CTA never covers total, storytelling copy readable.

- Sweep Studio V3 phases, Signature reserve modal, Tailored form, checkout summary, guest-details footer on mobile.
- Fix any wrap/clip using the responsive-layout pattern (grid + min-w-0 + shrink-0), not ad-hoc.
- Verify Studio storytelling cadence on small viewport — no jank between phases, reveal fits above the fold.

## 4. Dynamic CTAs site-wide

Goal: every CTA visibly alive; homepage arrow CTAs animate on hover + subtle idle motion; no dead-looking buttons.

- Audit CTAs via canonical `<CtaButton>` primitive — anything hand-rolled gets migrated.
- Homepage arrows (`.home-energy` scope): keep existing gold sheen sweep + hover lift, add a gentle idle arrow-nudge (translate 2–3px, 1.8s ease-in-out, respects `prefers-reduced-motion`).
- Non-homepage CTAs stay in the strict motion budget (hover lift -2px, ≤220ms) — no bounce/spring.
- Verify with `cta-vocabulary-lock`, `final-cta-arrow-colors`, `sticky-cta-copy` specs.

## 5. Premium motion pass (site-wide, restraint-first)

Goal: the site "moves, speaks, leads" — but stays editorial. No blobs, no shimmer, no parallax outside `.home-energy`.

- Add entry reveals (fade + translateY 12–16px, ≤220ms, staggered ~60ms) to editorial sections on: About, Moments, Corporate, Travel Designer, Proposals, Local Stories index, Plan hub, Plan destination pages and homepage 
- Image zoom 1.02–1.04 on hover for editorial cards (already in `EditorialCard` primitive — verify it's used, don't hand-roll).
- Section eyebrow + gold rule fade-in on scroll into view.
- Route/link draw on the plan pages that show a map, if not already animated.
- All reduced-motion safe. Nothing on Studio V3 storytelling (its cinematic pacing is already tuned).

## 6. Homepage copy tweak

- `src/routes/index.tsx:977` — replace "A local usually replies within a few hours." with **"A local will reply as soon as possible."**
- Mirror the change in `pt.index.tsx` if the same line exists there.

## Sequencing

1. Copy tweak (§6) — 1 line, ship immediately.
2. Checkout math (§2) — highest risk, blocks launch.
3. Mobile polish (§3) — piggybacks on §2 pass.
4. Image audit (§1) — reversible, do while §2/§3 tests run.
5. Dynamic CTAs (§4).
6. Motion pass (§5) — last, cosmetic.

## Out of scope (explicit)

- No changes to hero copy, brand palette, typography, Studio V3 storytelling structure, Signature tour facts, invented content, or homepage layout.
- No new pages (Tier 3 SEO drafting paused until launch polish ships).
- No competitor comparisons or invented superlatives.

## Deliverables per workstream

- §1: swap-list report + diffs.
- §2: green Playwright matrix + mobile screenshots of 3 checkouts.
- §3: before/after mobile screenshots at 393px.
- §4: CTA inventory + verified specs.
- §5: list of sections touched + motion spec used.
- §6: 1-line diff.

Approve and I'll start with §6 + §2 in parallel.