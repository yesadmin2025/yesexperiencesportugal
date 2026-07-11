# Pass 1B — Fix Regressions and Complete Visible Convergence

Two architectural regressions from the previous turn are corrected first, then the visible surfaces (price card, final reveal, living journey, checkout summary, guest details) are wired to a single hoisted resolved-signature object driven by the server-signed quote.

## 1. Regression fixes (must land before any UI swap)

### 1a. Gate quote-first by Studio identity, not tour id
- `src/components/studio-v3/StudioV3.tsx` `handleStripeCheckout`: replace `tourId === "azeitao-cheese"` gate with
  `commercialProductKey === "studio-v3-private-full-day"` (the Studio V3 commercial identity — every Studio-generated itinerary carries this key regardless of the resolved Signature tour).
- Same gate applied in `useResolvedSignature` so it always runs for Studio V3.
- Legacy tier checkout path remains only for non-Studio product flows.
- Server: `create-signature-checkout` already returns `409 studio_quote_required` when this key hits `create-tier-session` — keep and cover with a new test that exercises multiple tour ids under the same commercial key.

### 1b. Signed snapshot uses refined route, not `tour.stops`
- New helper `src/lib/studio-v3/canonicalRouteStops.ts`:
  ```ts
  canonicalConfirmedStops(latestState): Array<{ id; label }>
  ```
  Derives from `resolveStudioV3Route(latestState).routePoints` (current order, replacements applied, removals honored, explicit additions with validated route integration included; alternative-winery suggestions, removed stops, stale initial proposal stops, non-selected catalogue stops, and unvalidated physical add-ons excluded).
- `buildStudioQuoteSnapshot` in `quoteClient.ts` and the parent `useResolvedSignature` consume this helper instead of `tour.stops`.
- `StudioV3.tsx` `handleStripeCheckout` no longer reads `tour.stops` when constructing the snapshot.

## 2. Hoist a single `useResolvedSignature`

- Instantiate `useResolvedSignature(latestState)` once inside `StudioV3.tsx` at the parent that owns the final-presentation phase.
- Pass the resolved object (or narrow props: `pricing`, `confirmedStops`, `addOnLines`, `routeStatus`, `availabilityStatus`, `quoteToken`, `revision`, `isLoading`, `status`) into:
  - `SignaturePriceCard`
  - `FinalRevealStory`
  - `LivingJourneyPanel`
  - `GuestDetailsStep`
  - `CheckoutSummary`
- Remove all in-child calls to `findTour`, `tour.priceFrom`, `resolvePerPaxEur`, client add-on math, `tour.stops`, `tour.included`, and alternative-stop generators for the final-presentation surfaces.

## 3. Visible pre-checkout price swap

For each surface listed above:
- While `status !== "quoted"`: render skeleton "Calculating live price…" (no €145 anchor as final).
- When `status === "quoted"`: render only server-returned values:
  - Base: `€{unitEur} per person × {guests} = €{baseSubtotalEur}`
  - Each add-on line from `pricing.addOnLineItems`: label + `€{unitEur} × {quantity} = €{lineSubtotalEur}` + `Pending review` chip
  - Total: `€{totalEur}`
- When `status === "unavailable"` (unsupported guest count): render handoff CTA, disable Stripe.

Fallback catalogue may supply labels while loading but never the final amount.

## 4. Itinerary panel convergence

- `FinalRevealStory` and `LivingJourneyPanel` render the numbered final day from `resolved.confirmedStops` (same array feeding the signed snapshot).
- Alternative winery options render under a separate "Other possibilities" heading and are never numbered as part of the confirmed day unless the guest explicitly selected them (in which case they are already part of `confirmedStops`).

## 5. Confirmation-status copy

- `confirmationCopy(routeStatus)` helper (already exists) wired into `SignaturePriceCard`, `FinalRevealStory`, `LivingJourneyPanel`, `GuestDetailsStep`, `CheckoutSummary`.
- For `pending-review`, render only:
  > "Your request is received after payment and remains subject to final route and availability confirmation."
- Conditionally suppress "Instant confirmation", "Reserve instantly", "Your date is held the moment you reserve" and equivalents.

## 6. Preserve state / invalidate quote

- In `useResolvedSignature`: when any of `{confirmedStops, addOnIds, guests, date, pickup, language, title}` changes (deep-compare via `snapshotHash`), immediately clear the current `quoteToken` and mark `status = "stale"`.
- Do not refetch during Refine — only refetch when the phase transitions back into the final presentation (`finalSignature`).
- Guest draft, selected stops, add-ons, title, date, pickup, language remain preserved on the Studio state as today.

## 7. Phase name

Keep internal `confirmation` enum this turn (mechanical rename deferred to the next turn) but ensure the finalSignature phase never renders the sparse `ConfirmationPause` or the original proposal as the final screen.

## 8. Tests (must pass before completion report)

New / updated Vitest files:
- `studio-identity.test.ts` — two different Studio itineraries (Azeitão and a synthetic Sintra variant) both resolve to `studio-v3-private-full-day` and both are rejected by the legacy tier endpoint.
- `refined-route-snapshot.test.ts` — with `tour.stops` deliberately different, assert signed snapshot, `FinalRevealStory` render output, `CheckoutSummary` render output, and Stripe metadata all match the refined route (ids, order, labels).
- `visible-price-convergence.test.ts` — render Studio V3 through to checkout with the golden fixture; assert every surface shows €525 and equals `pricing.totalEur` and `pricing.stripeTotalEur`.
- `confirmation-copy.test.ts` — `pending-review` renders the pending-review copy and none of the instant-confirmation strings.
- `quote-invalidation.test.ts` — mutate an add-on after returning to Refine, assert the prior token is discarded and cannot create a session (server rejects on hash mismatch).
- `unsupported-guests.test.ts` — guest count outside supported tiers yields `status: "unavailable"`, disables Stripe, and cannot enter the legacy path.

All 25 previous Pass 1 tests continue to pass.

## 9. Completion condition

Playwright screenshot of the real Studio V3 flow at 3 guests showing:
- Base €145 × 3 = €435
- Boat €30 × 3 = €90 (Pending review)
- Total €525
- Destination: Setúbal · Azeitão · Sesimbra
- Confirmed stops: Mercado do Livramento, Azulejos de Azeitão, Bacalhôa Vinhos de Portugal, Castelo de Sesimbra
- No `tour.priceFrom` as final price, no client-computed add-on total, no static `tour.stops` in the signed snapshot, no `azeitao-cheese`-only gate, no instant-confirmation copy, no Studio legacy fallback.

## Files touched

- `src/components/studio-v3/StudioV3.tsx`
- `src/components/studio-v3/useResolvedSignature.ts`
- `src/components/studio-v3/SignaturePriceCard.tsx`
- `src/components/studio-v3/FinalRevealStory.tsx`
- `src/components/studio-v3/LivingJourneyPanel.tsx`
- `src/components/studio-v3/GuestDetailsStep.tsx`
- `src/components/studio-v3/CheckoutSummary.tsx`
- `src/lib/studio-v3/quoteClient.ts`
- `src/lib/studio-v3/canonicalRouteStops.ts` (new)
- `supabase/functions/create-signature-checkout/index.ts` (assert identity gate; no shape change)
- `src/components/studio-v3/__tests__/*` — six new files listed above

## Out of scope this turn

- Internal `confirmation` → `finalSignature` enum rename (next turn).
- PDF re-enable.
- Broad mobile redesign.

Implementation proceeds after approval; completion report will include the actual Vitest output and Playwright screenshot.
