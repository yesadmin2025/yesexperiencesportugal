## Pass 1B — full visible-surface convergence (executable roadmap)

Executes steps 1–14 of the directive in one continuous build pass. No slicing across turns for surfaces 1–8; tests and Playwright follow in the same pass.

### File-by-file changes

**1. `StudioV3.tsx` (hoist + thread)**
- Keep existing `useResolvedSignature` call at parent scope; expand its consumers.
- Build a single `resolvedSignature` prop from the hook: `{ pricing, confirmedStops, selectedAddOns, routeStatus, availabilityStatus, title, destinationRegion, inclusions, revision, quoteToken, expiresAt, status }`.
- Thread `resolvedSignature` into: `SignaturePriceCard`, `FinalRevealStory`, `LivingJourneyPanel`, `GuestDetailsStep`, `CheckoutSummary`, `handleStripeCheckout`.
- Delete every child-level quote query and every prop that fed legacy price/itinerary (`previewTiers`, `pricePctOfBase`, `resolvePerPaxEur`, `tour.priceFrom`, `tour.stops` re-derivations after Storyboard).
- Quote invalidation: in the state reducer for Refine mutations (stops order/replace/remove, add-on toggles, guests, date, pickup, language, title), clear `quoteToken`, mark `pricing.status = "stale"`, disable checkout until next Final entry. Do not auto-refetch during editing.
- Checkout gating: CTA disabled unless `pricing.status === "quoted" && quoteToken && !expired && revisionMatches && routeStatus !== "unavailable" && availabilityStatus !== "unavailable"`.
- Remove legacy checkout fallback in `handleStripeCheckout` — Studio V3 always uses `create-session` quote-first path.

**2. `SignaturePriceCard.tsx`**
- Replace internal price logic with `serverPricing` (already added). Extend for full loading/quoted/stale/unsupported states.
- Loading + in final: "Calculating live price…". Pre-final: "Price confirmed in your final review". Quoted: full breakdown block (BASE €unitEur × guests = baseSubtotalEur; per add-on line with `Pending review` chip when routeIntegration === "pending-review"; TOTAL €totalEur). Unsupported: designer-handoff copy + disabled CTA. Delete `previewTiers`, `resolvePerPaxEur`, `tour.priceFrom` reads.
- Strip "ADDITIONS €X / PP" combined label.

**3. `FinalRevealStory.tsx`**
- Numbered stops from `resolvedSignature.confirmedStops` only. Delete `tour.stops` / `alternativeStops` reads for the numbered list.
- Optional "Other possibilities" section renders unnumbered alternatives.
- Apply `confirmationCopy(routeStatus)`.

**4. `LivingJourneyPanel.tsx`**
- Route/stops/pricing from `resolvedSignature`. Delete independent route recompute.
- Apply `confirmationCopy(routeStatus)`.

**5. `GuestDetailsStep.tsx`**
- Collapsed Signature summary: title, destination, date, guests, server total, selected add-ons, pending-review chip — all from `resolvedSignature`. No pricing/inclusion reconstruction.
- Preserve typed guest fields across nav (lift form state into StudioV3 reducer if not already).

**6. `CheckoutSummary.tsx`**
- Extend existing `serverPricing` wiring to consume the full `resolvedSignature`: title, destinationRegion, four confirmed stops, add-ons, inclusions, total, pending-review status.
- Remove `tour.stops`, `tour.priceFrom`, `tour.included`, `VIATOR_META` reads. Retain `tour.img` fallback only for hero image (does not affect metadata).

**7. Confirmation copy source**
- Reuse existing `confirmationCopy(routeStatus)` helper. Wire into all five surfaces + payment reassurance area.
- Add `src/components/studio-v3/__tests__/no-instant-confirmation-in-studio.test.ts` — source-level `rg` assertion that "Instant confirmation", "Reserve instantly", "Your date is held the moment you reserve" do not appear in Studio V3 booking-flow modules outside `confirmationCopy`.

### New Vitest suites (5)

1. `visible-price-convergence.test.ts` — extend existing golden fixture to render all five surfaces and assert every displayed total === €525 (already covers SignaturePriceCard + CheckoutSummary; add FinalRevealStory, LivingJourneyPanel, GuestDetailsStep).
2. `visible-itinerary-convergence.test.ts` — fixture with `tour.stops` deliberately different from `confirmedStops`; assert FinalRevealStory, LivingJourneyPanel, CheckoutSummary render identical 4-stop list; Stripe metadata `stop_ids` from server response matches.
3. `no-instant-confirmation-in-studio.test.ts` — source scan (above).
4. `unsupported-guests.test.tsx` — render with guests=13; assert no numeric total, no `create-session` call, CTA disabled, designer-handoff copy visible.
5. `quote-invalidation-on-refine.test.tsx` — mount full StudioV3 with mocked quoteClient; go Final → Refine → toggle boat off → Final; assert `quoteToken` cleared between edits, new revision issued, old token rejected by mocked server (409 stale).

### Playwright golden walkthrough
- New file `e2e/studio-v3-golden-walkthrough.spec.ts`, run against local dev server, mobile-chromium project.
- Flow: `/studio-v3` → seed golden state via `window.__STUDIO_V3_SEED__` (add hatch behind `?goldenSeed=1`) → walk Storyboard → Refine → Final → GuestDetails → Checkout intent.
- Assertions: on Final, SignaturePriceCard shows `€435` base, `€90` add-on, `€525` total, "Pending review", four stops (Livramento, Azulejos, Bacalhôa, Sesimbra Castle), no José Maria in numbered list. GuestDetails collapsed summary shows same total. CheckoutSummary shows same total + stops. `create-signature-checkout` request body inspected via `page.on("request")` — asserts `mode: "create-session"` with matching revision and total.
- Screenshots: `final-reveal.png`, `guest-details.png`, `checkout-summary.png`, plus network-captured Stripe session response asserted to contain `total_eur: "525"` in metadata.
- Since real Stripe checkout page isn't navigated, verify €525 via the `pricing.totalEur` field returned in the create-session JSON response — matches existing e2e pattern.

### Execution order in build mode
1. Extend `useResolvedSignature.ts` return shape if needed.
2. Refactor `StudioV3.tsx` (hoist + thread + invalidation + gating + remove legacy fallback).
3. Rewire `FinalRevealStory.tsx`, `LivingJourneyPanel.tsx`, `GuestDetailsStep.tsx` in parallel.
4. Extend `SignaturePriceCard.tsx` + `CheckoutSummary.tsx` (already partly done).
5. Add `confirmationCopy` everywhere + source-scan test.
6. Write 5 Vitest suites; run `bunx vitest run src/components/studio-v3` and iterate until green.
7. Run `bunx tsgo --noEmit`.
8. Add seed hatch + Playwright golden walkthrough; run via `playwright.local.config.ts`; capture screenshots to `/tmp/browser/golden/`.
9. Final report: files changed, Vitest output, Playwright output, screenshot paths, verified €525 chain, list of any deferred mechanical enum-rename items.

### Non-goals this pass
- Internal `ConfirmationPause` → final-presentation enum rename (mechanical, tracked separately).
- PDF export layout.
- Non-Studio mobile rework.

### Risk / scope acknowledgement
This pass touches ~9k lines across 7 components, adds 5 test suites, and one Playwright walkthrough. Credit spend will be substantial (many parallel edits + several test iterations + Playwright runs). Proceeding as one continuous build.