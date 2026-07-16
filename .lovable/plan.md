## Scope

Four items, all frontend/presentation:

1. **Southwest cover** — replace the AI-generated cover with the uploaded photo (`IMG_5438.jpeg` — the turquoise cove, real Alentejo/Vicentine coast).
2. **Site-wide animations** — extend the homepage `useMarketingMotion` motion system to every other public route, tuned to "premium + conversion refinement, no bounce".
3. **Reviews on Signature tour pages** — surface TripAdvisor/Viator review quotes on each Signature detail page.
4. **Ratings chip on every Signature card** — show star rating + count on `/day-tours` (and any other card grid).

---

### 1. Southwest cover (uploaded photo)

- Upload `user-uploads://IMG_5438.jpeg` via `lovable-assets` → pointer at `src/assets/tours/southwest-vicentine-coast-cover.jpg.asset.json` (replaces the current AI-generated pointer).
- No component changes needed — `signatureToursViator.ts` and `signatureTours.ts` already reference that path.
- Delete the old AI asset from CDN with `lovable-assets delete` before writing the new pointer.

### 2. Site-wide premium animations (no bounce)

- Add a scoped variant to `use-marketing-motion.ts`: same primitive (`[data-motion]` / `.motion-in`), but with a "refined" scope that caps translateY at 6px, duration 200ms, easing `cubic-bezier(0.22, 0.61, 0.36, 1)` (ease-out, no overshoot). Zero bounce, zero spring.
- Boot `useMarketingMotion()` on every public marketing route that doesn't already have it: `/about`, `/contact`, `/corporate`, `/day-tours`, `/tours/$tourId`, `/experiences`, `/multi-day`, `/tailor`, `/local-stories`, `/proposals`, `/reviews`, `/terms`, plus their `/pt/*` mirrors.
- Do NOT mount it on Studio, Builder, checkout, admin, auth (per existing hook contract).
- Motion targets: section headers, editorial cards, hero image fade+rise, CTA reveal. Reuses existing `data-motion` attribute — no new components.
- `prefers-reduced-motion` short-circuits (already handled by `startHomeMotion`).
- Add one guardrail Playwright check: `/about` and `/tours/$tourId` render `.motion-in` after scroll.

### 3. Reviews on each Signature detail page

- On `src/routes/tours.$tourId.tsx`, render a "What guests say" section pulling from `topReviews` in `signatureToursViator.ts` (already exists per plan.md — data is there, view is missing).
- Fallback: if a tour has 0 curated `topReviews`, query `getTourReviews({ tourId, limit: 3 })` server-side in the loader (already wired for `/reviews` page).
- Compact ivory quote block: Fraunces italic pull, gold hairline, source badge ("via Tripadvisor" / "via Viator"), reviewer name in Inter caption. Matches the style already used on `/reviews`.
- Also add a "See all reviews" link → `/reviews#<tourId>`.

### 4. Rating chip on each Signature card

- Update the Signature card in `src/routes/day-tours.tsx` and the Signature card in `src/routes/experiences.tsx` (if present) to render an `aggregateRating` chip: `★ 4.9 · 127 reviews via Tripadvisor` sourced from `VIATOR_META[tourId].aggregateRating`.
- Positioned under the price line, Inter 12px, tabular-nums, gold star, `--charcoal-soft` text.
- Guardrail: extend `signature-section-contract.test.ts` to allow the new `rating` field on the card (currently the card-fields test whitelists 7 fields — add `aggregateRating` to `ALLOWED_CARD_FIELDS`).

---

## Order of execution

1. Southwest cover swap (1 asset op, zero code).
2. Rating chip on cards (small, high-visibility win).
3. Reviews section on Signature detail pages.
4. Premium animation sweep across all public routes.

## Files touched (estimate)

- `src/assets/tours/southwest-vicentine-coast-cover.jpg.asset.json` (replace)
- `src/hooks/use-marketing-motion.ts` (add refined scope) + `src/styles.css` (`data-motion-scope="refined"` block)
- ~15 route files: add one-line `useMarketingMotion()` call
- `src/routes/day-tours.tsx`, `src/routes/experiences.tsx` (rating chip)
- `src/routes/tours.$tourId.tsx` (reviews section)
- `src/__tests__/signature-section-contract.test.ts` (whitelist `aggregateRating`)

## Open confirmation

The uploaded photo `IMG_5438.jpeg` — is that the Vicentine Coast (Alentejo), or is it Algarve? It reads as Porto Covo / Ilha do Pessegueiro (Southwest Alentejo — correct for this tour), but confirm before I wire it as the Southwest Vicentine Coast cover.
