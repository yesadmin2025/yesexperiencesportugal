## Goal

Make social proof verifiable and easy to update, without touching editorial styling. Keep the manual, no-autoplay mobile carousel. No invented reviews. No `AggregateRating` on Organization/LocalBusiness.

## 1. Central config — single source of truth

New file `src/config/review-platforms.ts` exporting a typed array `REVIEW_PLATFORMS`. One entry per platform we can honestly cite:

```ts
{
  id: "tripadvisor" | "google" | "viator",
  name: "Tripadvisor" | "Google" | "Viator",
  rating: number,          // 4.9 etc — matches what the page shows
  reviewCount: number,     // per-platform count, never summed
  url: string,             // canonical listing URL
  lastVerifiedAt: "2026-07-22" // ISO date
}
```

Also export:
- `TOTAL_VERIFIED_REVIEWS` — a manual, conservative number we can defend (sum of the same platform counts on the same `lastVerifiedAt`). Used only when we render the "across verified platforms" phrasing.
- `formatVerifiedLine(locale)` helper returning the compact string used across surfaces.

No component reads platform data from anywhere else. `business-nap.ts` keeps the raw URLs but the review widgets import from this new file.

## 2. New primitive — `PlatformProofRow`

`src/components/social-proof/PlatformProofRow.tsx`. Presentational only, reuses existing tokens/spacing:

- Compact single line, wraps on mobile.
- One chip per platform: logo (clickable, `target="_blank" rel="noopener noreferrer"`, 44×44 tap area, focus ring already used by `ReviewSourceLink`) + rating + "N reviews" + tiny "verified {date}" hint on hover/long-press.
- No combined total inside the row.
- Reads exclusively from `REVIEW_PLATFORMS`.

Used on: homepage (`GuestQuotes`), product pages (`tours.$tourId.tsx`, `tours.$tourId.tailor.tsx`), and any other current mention of the combined claim.

## 3. Homepage `GuestQuotes` — rewording + wiring

`src/components/home/GuestQuotes.tsx`:

- Keep the existing headline structure, but change the fallback claim from bare `"700+ five-star reviews"` to `"700+ five-star reviews across verified platforms"`. The dynamic branch (real count from `global_review_aggregate`) uses the same "across verified platforms" suffix. No combined total is shown unless we can prove and dedupe — since we can't, we keep the conservative `700+` copy behind a small `<PlatformProofRow />` that shows the per-platform breakdown as the proof detail.
- Insert `<PlatformProofRow />` directly under the H2, above the carousel.
- Carousel behavior unchanged: manual scroll-snap, no autoplay, dots and arrows as today.
- Each card keeps reviewer name, country, date (add `datetime` from `published_at` — currently we render name/country only; add a small muted date line under the name using existing typography).
- Each card's source label continues to link to the original review via `ReviewSourceLink` — already implemented, just verify every quote has `source_url` before showing it (drop entries without one).

## 4. Product pages

`src/routes/tours.$tourId.tsx` and `src/routes/tours.$tourId.tailor.tsx`:

- Add `<PlatformProofRow />` in the existing trust area (below hero, above itinerary) — no visual redesign, only a swap-in.
- `LandingTourCredibility` stays as-is (already uses only real Viator meta and real snippets).
- Confirm no product surface synthesises a combined total.

## 5. Footer + other 700+ mentions

Update the literal strings in these files to `"700+ five-star reviews across verified platforms"` (no other change):

- `src/components/Footer.tsx:76`
- `src/components/builder/v3/StudioTrustStrip.tsx` (aria-label + visible copy)
- `src/lib/drift/i18n.ts` (`trust.midflow` en + pt)
- `src/routes/about.tsx:324` — "700+ five-star" → same phrasing
- `src/routes/press.tsx` narrative — leave (already says "hundreds of five-star reviews across Google, Tripadvisor and Viator", which is honest)

## 6. Structured data guardrails

- Confirm nothing this turn re-adds `AggregateRating` to `Organization`/`LocalBusiness`. `guest-quotes-jsonld.ts` already dropped it; keep it that way.
- `withAggregateAndReviews` on product pages already sources rating + reviewCount + reviewBody from the same visible Viator meta — no change needed.
- No new schema is added by the proof row (it's a UI element referencing external listings, not a review widget claiming ratings on our own entity).

## 7. Update policy (docs)

Short comment block at the top of `src/config/review-platforms.ts` describing:
- how to update (edit the array, bump `lastVerifiedAt`, commit);
- rule: never sum across platforms in code — only the manual `TOTAL_VERIFIED_REVIEWS` may express a combined figure, and only paired with "across verified platforms".

## Technical notes

- No new dependencies.
- No visual redesign: `PlatformProofRow` uses existing `PlatformBadge`, gold/charcoal tokens, and the same padding/typography scale as `ReviewSourceLink`.
- Locale: the row is language-agnostic (numbers + platform names); Portuguese strings for "reviews"/"verified" come from `src/i18n/dictionaries.ts` via new keys `proof.reviews`, `proof.verifiedOn`.
- Tests: extend `src/__tests__/guest-quotes-jsonld.test.ts` with a case asserting no `AggregateRating` node is emitted on the Organization graph; add a small unit test for `formatVerifiedLine`.

## Files touched

Create: `src/config/review-platforms.ts`, `src/components/social-proof/PlatformProofRow.tsx`.
Edit: `src/components/home/GuestQuotes.tsx`, `src/routes/tours.$tourId.tsx`, `src/routes/tours.$tourId.tailor.tsx`, `src/components/Footer.tsx`, `src/components/builder/v3/StudioTrustStrip.tsx`, `src/lib/drift/i18n.ts`, `src/routes/about.tsx`, `src/i18n/dictionaries.ts`, `src/__tests__/guest-quotes-jsonld.test.ts`.
