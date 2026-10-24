# Fix check failures, continue premium simplification, test mobile checkout

The checkout screen simplified last turn ("Your details") stays as it is. The only changes allowed there are fixes for real problems found while testing it.

## 1. Automatic check failures (32 checks, about 10 underlying causes)

Sorted by whether visitors are affected.

Affects visitors (fix in the site):
- The Studio's floating reserve bar uses a 10.5px label, below the site's 11px minimum. Raise it to 11px.
- An itinerary timeline label lost its approved softer text colour. Restore it.
- The homepage first screen no longer has its quiet text link to the Travel Designer page, which the conversion lock requires. Check that it is missing, then put the discreet link back without adding a third button.
- A wording rule about review proof (the "reviews across platforms" line) and a page-spacing marker on a region page are missing. Check each against the approved copy and restore it only if it was removed by mistake.

Tied to approved decisions (update the checks, not the site):
- The Travel Designer and Proposal page titles were deliberately shortened last week and no longer contain "YES Experiences Portugal". The checks are updated to the approved titles; the titles do not change.

Test harness only (no change for visitors):
- About 20 checks for page animations and reveal effects crash because the test setup doesn't load the page navigation context. Fix the test setup so these checks run again and show whether the animations really work.

## 2. Premium simplification, one page at a time

Rule for each page: one primary action per screen, at most one quiet secondary action, and no repeated sections that say the same thing twice. CTA wording, prices, booking rules, the approved Hero and SEO titles stay unchanged.

Order (highest traffic first):
1. Homepage: reduce repeated review/proof blocks and duplicate bottom buttons; Five Ways cards keep one action each.
2. /experiences and tour pages: one "Reserve this day" per screen; Tailor stays a quiet link; remove repeated inclusion/reassurance blocks.
3. Studio entrance: no explanatory text before creating starts.
4. Proposals, Corporate, About, Reviews, FAQ: one closing action per page; remove repeated end-of-page bands.
5. Local Stories index and articles: one closing action. The "Design my experience" label stays because a check locks it; I will ask before changing it.

Each page gets a screenshot on a phone-sized screen (393px wide) before and after the changes.

## 3. Test the checkout on a phone

Automated phone test (393px wide) of a Signature day and a Studio day, up to the "Your details" screen, then to the step where the payment screen opens. No real payment is made.

What gets checked:
- The booking summary and first fields are visible without scrolling.
- With the phone keyboard open (simulated shorter screen), the field being typed into stays visible, and the bottom bar doesn't cover it or take over the screen.
- Error messages are clear when a required field is left empty, and the screen jumps to the first missing field.
- "Edit" date or guests works, the total updates, and the payment button responds immediately.
- The Stripe payment screen opens with the correct total.

Any problem found is fixed in the smallest possible way. Payment logic is not touched.

## Technical details
- Font fix: `src/components/studio-v3/YourDayReserveBar.tsx`, `text-[10.5px]` changed to `text-[11px]`.
- Failing checks: `minimum-type-size`, `visual-storytelling-system`, `homepage-brand-restoration`, `surgical-final-pass-truth`, `reveal-class-coverage`, `service-search-copy` (expected titles updated), and `reveal-*` / `reduced-motion-validation`. The last group fails with `useRouterState` null because `SiteLayout` renders without a router; it needs a router wrapper or mock in the test setup.
- Keyboard test: Playwright at 393x844, then the screen height is reduced to about 420px to stand in for the open keyboard. Each field's position is checked against the footer (`final-details-reassurance` container).
- All checks run again at the end. Nothing is published unless you ask.
