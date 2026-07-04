# Homepage Premium Pass — Mobile QA + Typography Unification + Five Ways Redesign

Three focused workstreams. Each ships together so the homepage reads as one voice at 360 / 393 / 430 px.

---

## 1. Typography unification (root cause of "mixed fonts")

Symptom: some H2s render Montserrat (display), others render Georgia serif, italic emphasis inconsistent, weights drift between 500/600/700. Different sections hand-roll `serif` class + inline sizes instead of using `<SectionTitle>`.

Fix:
- Adopt `<SectionTitle>` + `<SectionTitle.Em>` (already canonical in `src/components/ui/SectionTitle.tsx`) for **every** H2 on the homepage: FourWaysIn, StudioLivePreview, RealReviewsStrip, Signature rail, Occasions, RecentJourney, FAQ, Final CTA.
- Delete every inline `text-[2rem] sm:text-[2.4rem] md:text-[3.6rem]…` copy of the ramp.
- Lock emphasis token: `italic font-normal text-[color:var(--teal)]` — no other italic color/weight variants allowed in headlines.
- Eyebrows: single class `he-eyebrow-bar` (11px, tracking 0.28em, teal, gold bar). Kill ad-hoc uppercase spans on Studio/Reviews.
- Body copy: Inter 15/16px, `text-[color:var(--charcoal-soft)]`, leading 1.6. Remove stray `font-light` on light surfaces (per memory rule).
- Card titles: `serif text-[1.3rem] md:text-[1.6rem] font-medium leading-[1.2]` — single recipe reused.

Result: one display voice (Montserrat medium) + one italic accent (Georgia teal) across the entire scroll.

---

## 2. Five Ways cards — from static to dynamic (premium, not busy)

Current cards are flat: uniform ivory bg, tiny icon, static number, no depth, no motion story. Redesign for tactile luxury while keeping equal hierarchy.

Card structure (mobile-first):
- **Ambient hover halo**: soft radial gold glow behind card on hover (`opacity 0 → 0.35`, 500ms). On mobile, ambient version fades in via IntersectionObserver as each card enters viewport, then eases out — creates a subtle "ripple" as the user scrolls the 5 cards.
- **Numeral treatment**: giant Georgia italic numeral (`01`…`05`) at 3.4rem, positioned top-right, `text-[color:var(--gold)]/60`, translates up 4px on hover. Currently `font-light` sans — swap to serif italic for editorial feel.
- **Icon puck**: keep 36px circle, add gold ring animation on hover (double-ring reveal, 320ms).
- **Card lift**: `-3px translateY` + shadow bloom `0 18px 40px -24px rgba(46,46,46,0.18)` on hover (already in `.he-card-lift`, ensure applied).
- **Gold sweep**: 1px gold underline sweeps left→right on hover (already present, extend duration to 600ms for smoother feel).
- **Sequenced entrance**: stagger reveal at 90ms intervals under `.home-energy` scope, respecting `prefers-reduced-motion`.
- **CTA row**: arrow shifts +6px on hover (currently +4px), gold color stays.
- **Grid**: mobile 1-col (was fine), sm 2-col with card 5 spanning full width, lg 5-col editorial row. This kills the awkward orphan card on tablet.

Copy stays as-is (approved). Only visual treatment changes.

---

## 3. Mobile conversion QA — 360 / 393 / 430

Run Playwright at all three widths, screenshot every section, fix any that fail:

Checklist per viewport:
- No horizontal scroll (`document.documentElement.scrollWidth ≤ innerWidth` outside opt-in carousel).
- Hero stanza doesn't collide with CTAs; CTA group ≥ 44px tap targets, ≥ 8px between.
- FourWaysIn: card padding 20px, no text clipping on 360, gold rule visible.
- Signature rail: 80vw cards snap cleanly, no partial card cut mid-title.
- Studio preview: image + text stacked, no overflow.
- Reviews: 3 cards stack cleanly on 360, star row visible.
- FAQ: accordion chevrons aligned, no clipping.
- Final CTA: buttons full-width on 360, side-by-side ≥ 400.
- Section rhythm: `py-20` mobile, alternating ivory/sand backgrounds preserved.
- Sticky nav doesn't overlap hero copy.

Deliverable: screenshot grid saved to `/tmp/browser/home-qa/` for verification, then targeted CSS fixes per failure.

---

## Files touched

- `src/components/home/FourWaysIn.tsx` — full card redesign, adopt `<SectionTitle>`
- `src/components/home/StudioLivePreview.tsx` — adopt `<SectionTitle>`, fix eyebrow
- `src/components/home/RealReviewsStrip.tsx` — adopt `<SectionTitle>`, eyebrow lock
- `src/components/home/RecentJourney.tsx` — H2 to `<SectionTitle>`
- `src/routes/index.tsx` — replace inline H2s in Signature/Occasions/Final CTA with `<SectionTitle>`
- `src/styles.css` — add `.he-card-halo` utility + `.he-card-numeral` recipe; scoped under `.home-energy`

## Not touched

Hero copy lock, HERO_COPY probes, Studio route, booking logic, Signature tour data, Bókun/Stripe, footer, i18n, other routes.

## Verification

- `tsgo` clean
- Playwright screenshots at 360/393/430 (Home only, headless)
- Manual scan: every H2 renders Montserrat medium + Georgia italic teal accent
- Reduced-motion: card halo + stagger disabled

Approve to build.
