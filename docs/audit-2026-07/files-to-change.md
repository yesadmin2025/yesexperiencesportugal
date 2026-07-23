# Files Phase 2 would touch (proposal, none edited in this pass)

## NEW (Phase 2)
- `src/config/pricing.ts` — SSOT (see ssot-proposal.md)
- `supabase/functions/_shared/pricing-tiers.ts` — server mirror
- `supabase/migrations/<date>_platform_tiers.sql` — `ALTER TABLE tour_price_tiers ADD COLUMN platform_tiers jsonb` + `tour_pricing_v` view
- `src/components/studio-v3/ComposedJourneyCard.tsx` — reveal for original days
- `src/lib/studio-v3/regionAdjacency.ts` — coherence rules for composer

## MODIFY (Phase 2, in priority order)

### P0 — pricing correctness
1. `src/routes/tours.$tourId.tailor.tsx` (lines 420-495) — replace flat ±€10/€20 with `priceForTailor`; wire `evaluateTailorAdjustment`
2. `src/routes/tours.$tourId.tsx` — read `fromEur`, `priceForParty` from SSOT
3. `src/data/signatureTours.ts` — remove hardcoded `priceFrom` numbers, compute at build time from SSOT
4. `src/components/SimpleBookingForm.tsx` — use `priceForParty` for adult/child rows
5. `src/routes/experiences.tsx` + `pt.experiences.tsx` + `day-tours.tsx` + `pt.day-tours.tsx` — card price from SSOT
6. `src/routes/index.tsx` + `pt.index.tsx` — homepage card prices (no hero changes)
7. `src/components/home/PathfinderQuiz.tsx:490` — remove hardcoded "From €138"
8. `src/components/home/ThreePathsSection.tsx` — card prices via SSOT
9. `supabase/functions/create-signature-checkout/index.ts` — server-side recompute total, ignore client `totalEur`
10. `supabase/functions/create-builder-checkout/index.ts` — same

### P1 — Studio composition
11. `src/components/studio-v3/StudioV3.tsx` — composer path (see studio-findings.md)
12. `src/components/studio-v3/SmartRecommendation.tsx` — return composed itinerary, offer Signature as shortcut only
13. `src/components/studio-v3/useResolvedJourney.ts` — accept composed shape
14. `src/lib/studio-v3/composerPricing.ts` — extend beyond anchor pricing

### P1 — pickup + CTA polish
15. `src/components/checkout/*` — pickup label + contrast (WCAG AA), "confirm later" toggle
16. `src/components/ui/CtaButton.tsx` — enforce disabled visual + AA contrast
17. `src/routes/tours.$tourId.tsx` sticky CTA — copy lock (`CHECK AVAILABILITY` / `RESERVE THIS DAY`)
18. Portuguese copy parity — `src/i18n/dictionaries.ts` + `src/content/i18n/pt/common.json`

### P2 — tracking + QA
19. `src/lib/analytics.ts` (or equivalent) — add missing events (pickup_started, tailor_item_restored, studio_route_generated, checkout_step_completed, checkout_error, checkout_abandoned)
20. `e2e/` — new suites for QA matrix scenarios

## Files intentionally NOT changing
- `src/routes/index.tsx` hero block, hero video, hero copy, hero CTAs
- `src/components/home/Hero*.tsx`
- `src/content/hero-copy.ts`, `hero-scene-variants.ts`
- Approved palette (`src/styles.css` design tokens)
- Typography (`--font-editorial`, Inter/Fraunces setup)
- Navbar/footer structure
- `src/components/home/ThreePathsSection.tsx` layout (prices only, no visual redesign)
- Any Signature card visual (photo, chip, layout)
- Approved animations (`home-energy`, MaskReveal, ParallaxLayer, Ken Burns)
