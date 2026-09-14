# Full site audit — September 2026

Scope: booking flow, copy, typography, motion, CTAs, duplication, admin, SEO.
Method: automated guardrails (route meta, sitemap, brand/contrast, typecheck, Vitest)
plus a Playwright sweep of all 44 public sitemap routes at 393×852, and a live
mobile booking + payment run.

## Fixed in this pass

1. **Guest reviews never reached approval.** `listPendingReviews` filtered
   `is_first_party = false`, but public submissions are stored first-party,
   pending and unpublished — so the approval screen was always empty and reviews
   had to be approved by hand in the database. Filter removed; locked by
   `src/__tests__/review-moderation-queue.test.ts`.
2. **Admin home exposed 10 of 43 screens, in Portuguese.** New
   `src/components/admin/AdminNavIndex.tsx` groups every admin route (guests &
   bookings, reviews, prices, experiences & content, search & visibility, health)
   in English, with a "waiting for approval" badge and a banner when reviews are
   pending. Remaining Portuguese labels on the overview translated.
3. **Uncaught error on most routes.** The Trustindex certificate loader keeps a
   reference to a node removed by client-side navigation and throws
   `Cannot read properties of null (reading 'remove')`. Contained in
   `TrustindexWidget` (vendor-scoped, logged once); the static seal is unchanged.
4. **Retired CTA label in the top bar.** `Design & Book` → `Design your day`
   (both desktop and mobile). The solid cream top bar itself is unchanged.

## Verified clean

- Booking/payment on mobile: date + guests + guest details → embedded Stripe
  session, €183/adult, €366 for two on the Arrábida wine day; card, Klarna,
  MB WAY, Amazon Pay. No console errors, no horizontal overflow.
- Route metadata: 85 routes, no duplicate or missing titles/descriptions/OG.
- Sitemap: 44 public routes, in sync with the route tree.
- Typography: only Fraunces and Inter observed; no heading skips, no missing or
  duplicated H1, no overflow at 393px.
- Structured data: valid JSON-LD on public routes, no duplicate IDs, hours
  09:00–20:00 daily matching the Google profile.
- Full suite: typecheck clean, ~1,396 Vitest tests passing.

## Open — needs your input or is external

- **Thin pages:** `/studio-v3` (851 chars of text), `/contact` (1,872),
  `/terms` (2,395). Studio is intentionally an interface, not an article; contact
  and terms would benefit from real content you supply.
- **Overlapping area/region pages:** Sintra/Cascais, Azeitão/Setúbal,
  Évora/Alentejo, Comporta/Tróia address near-identical intent. Recommendation is
  differentiation plus cross-linking, not deletion — no page removed without your
  approval.
- **Small tap targets:** remaining cases are inline body links and footer text,
  not primary actions.
- **Manual/owner-only:** Google Business Profile publication and verification,
  Google's Rich Results Test UI, and per-URL "Request indexing" in Search
  Console. Sitemap resubmission is automated and returns 204.
