# Checkout "what you're paying for" summary + SEO re-check

## 1. SEO re-check (done, read-only)
A new scan was started. Last completed results show every foundation check passing: homepage reachable, crawler rules, sitemap, full page rendering, page basics, search title/description, social preview, site icon. The results were marked "not yet refreshed" when read. I'll re-read the new results after building and report anything new. The only known open item is still the wine-tours article (needs the real winery names from you).

## 2. What's wrong at checkout today
- The "What's included" list in the checkout panel and the guest-details step is not built from the tour's verified inclusions. It uses short highlight lines or stop names, cut to 4 items.
- On Tailored / Studio days the list is hidden completely, so guests only see stop names and a price.
- The accurate list (the verified tour facts that match Viator) already exists. It's the same one sent to payment, but guests never see it before they pay.

## 3. What guests will see before filling in their details
One calm "Your day, before you pay" summary, the same in every checkout (Signature, Tailored, Studio):
1. Tour name, date, start/pickup time, party (adults / children with ages)
2. Your stops, in order; optional stops clearly marked "Not included unless selected"
3. **Included**: the full verified list (private guide, hotel pickup, tastings, tickets… exactly as on the tour page), never shortened
4. **Not included**: from the same verified facts, when they exist
5. Your changes (Tailored/Studio only): each add-on or swap with its price
6. Price breakdown and total, plus cancellation and "Instant confirmation"

It shows at the top, open by default, before the name/email fields. On a 393px phone it stays compact and scrolls with the form.

## 4. Rules kept
- Facts only from the verified tour data. Nothing invented. If a tour has no verified list, show "Private guide and hotel pickup included" (the site-wide promise) plus a note to ask us, never guessed items.
- No changes to prices, payment, booking rules or the database.
- Brand fonts, colours and calm checkout motion unchanged.

## Technical details
- Add `resolveCheckoutInclusions(tourId, selection)` in `src/lib/checkout/inclusions.ts`. It reuses `getTourContent` (verified facts) → Viator meta → tour fallback and also returns `notIncluded`.
- Pass `included` / `notIncluded` into `BrandedCheckoutDrawer` and `FinalDetailsDialog` `ProductRecap` from `SimpleBookingForm`, `tours_.$tourId.tailor.tsx` and Studio v3 `CheckoutSummary` / `GuestDetailsStep`. Remove the 4-item cap and the `!isTailored` hide. Keep `beats` only as highlights.
- Tests: extend `inclusions.test.ts`, plus a render test for Signature, Tailored and Studio showing the full list. Check at 393px with no overflow.
- Preview only. No publish unless you ask.
