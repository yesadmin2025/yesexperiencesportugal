# Reviews, admin approval, hero opening view, and a full mobile audit

## What I found

**Reviews are in place and the data is real.** Homepage and the reviews page both load real
five-star guest quotes when I open the live site (three cards on the homepage, full list on
`/reviews`). So the block is not empty because content is missing. The likely cause of a blank
area on your phone is the fade-in animation: the cards start invisible and only appear when the
scroll observer fires. On a fast scroll, or when the phone reduces motion, they can stay
invisible — an empty stretch exactly where the reviews should be.

**Approving reviews:** the approval screen already exists at `/admin/reviews` (pending reviews,
approve/reject, plus platform ratings). It is simply not listed in the admin menu, so there is no
way to reach it by clicking. The enquiries screen is missing from that menu too.

**The hero opening view:** at the top of the page the header sits on a solid cream bar rather than
over the film, the headline starts well below the fold, and the cookie notice covers the whole
lower hero — so the two buttons are not visible at all on first open. That is what reads as "the
hero doesn't start at the beginning".

## What I'll do

### 1. Reviews always visible
- Make the reviews block appear even if the scroll animation never fires (visible by default,
  animation as an enhancement only), so it can never render as an empty band.
- Keep the same content rules: real published guest reviews first, verified platform quotes as
  fallback. Nothing invented.

### 2. Admin approval reachable
- Add "Guest reviews (approve)" and "Enquiries" to the admin menu so you can reach the approval
  screen in one tap.
- Show a count of reviews waiting for approval next to the link, and make the pending list the
  first thing on that screen on mobile.

### 3. Hero opens as intended
- Tighten the top of the hero so eyebrow, headline, subheadline and both buttons fit within the
  first screen on a 390px-wide phone, with the header sitting over the film instead of on a cream bar.
- Keep the cookie notice from covering the hero buttons (compact bar at the bottom on mobile).
- Locked hero wording, film, and tracking stay exactly as they are.

### 4. Overall mobile audit (report, then fix)
Run through on a phone-sized viewport, on the live site and preview:
- Booking and payment: `/book` with and without a tour, date + guests + guest details, real
  card-payment session created, confirmation shown; the enquiry path when dates are flexible.
- Signature day pages, Studio and the region/area pages: buttons reachable, prices shown,
  checkout always possible.
- Every public page: console errors, broken images, sections that render empty, text overflowing,
  tap targets under 44px, anything hidden behind the floating WhatsApp button or sticky bar.
- Header/menu, footer, language switch.

I'll report the findings in a short list, fix the real defects in the same pass, and flag anything
that needs your decision (for example real opening hours) rather than guessing.

## Technical notes
- Reveal utilities: make `.reveal` / `.reveal-stagger` / `.section-enter` fail-open (final state as
  the default, animation applied only once the observer confirms it is running).
- `src/routes/admin.index.tsx`: add `/admin/reviews` and `/admin/enquiries` to the nav list; pending
  count via the existing `listPendingReviews` server function.
- `src/components/home/CinematicHero.tsx` + header: reduce top offset/spacing at mobile widths only;
  cookie banner z-index/height adjustment. No change to `hero-copy.ts` or analytics events.
- Audit driven by Playwright at 393×852 plus spot checks at 360 and 414; existing Vitest/Playwright
  suites re-run for the files touched.
