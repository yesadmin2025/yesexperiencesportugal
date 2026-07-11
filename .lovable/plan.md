# Pass 1B — Slice A (visible price authority)

Smallest coherent, shippable slice of Pass 1B. Lands the single most user-visible piece (the €525 authoritative price card + checkout total) without leaving the tree half-refactored. Keeps existing 35 tests green.

Explicitly **out of scope this slice** (deferred to a follow-up turn with more credit): `FinalRevealStory` + `LivingJourneyPanel` itinerary rewiring, `GuestDetailsStep` collapsed summary, quote-invalidation-on-Refine wiring, unsupported-guests UI polish beyond a disabled CTA, the remaining 4 Vitest suites, Playwright golden walkthrough + screenshots, `confirmation` → `finalSignature` enum rename.

## What ships

1. **Hoist `useResolvedSignature` once** in `StudioV3.tsx`
   - Build the `StudioQuoteSnapshot` at parent scope using the existing `canonicalRouteStops` helper + current guest/addon/date/pickup/language state.
   - Call `useResolvedSignature({ phase, snapshot })` once; keep the §1 rule intact (no fetch before `confirmation`/`guestDetails`/`checkoutSummary`).
   - Reuse the returned `resolved` inside `handleStripeCheckout` instead of re-fetching, so the CTA and the visible card share the same revision.

2. **Rewire `SignaturePriceCard` price block** to read only from `resolved.pricing`
   - Loading (quote in flight during final presentation): `Calculating live price…`.
   - Pre-final phases: no authoritative total — render the existing anchor as "Price confirmed in your final review" copy, no €number.
   - Quoted: render
     - `BASE — €{unitEur} per person × {guests} — €{baseSubtotalEur}`
     - one line per `resolved.addOns[]`: `{label} — €{unitEur} per person × {quantity} — €{lineSubtotalEur}` + `Pending review` chip when `routeIntegration === "pending-review"`
     - `TOTAL €{totalEur}`
   - Unsupported (`pricing.status === "unavailable"` or `guests` outside supported range): show handoff copy "Live pricing for this group size requires a tailored quote. Send this Signature to our travel designer." and disable the pay CTA (existing handoff path).
   - Remove in-component use of `tour.priceFrom`, `previewTiers`, `resolvePerPaxEur`, `pricePctOfBase`, client add-on math.
   - Apply `confirmationCopy(resolved.routeStatus)` — suppress "Instant confirmation" / "Reserve instantly" / "date is held" strings when `routeStatus === "pending-review"`.

3. **Rewire `CheckoutSummary` totals + additions block** to consume `resolved`
   - Total row, per-guest row, additions list all read from `resolved.pricing` + `resolved.addOns`.
   - Drop client add-on math and `tour.priceFrom` fallback for the *number*.
   - `included` list may temporarily keep `tour.included` fallback (itinerary/inclusion rewiring is next slice) — flagged with a `TODO(pass-1b-slice-b)` comment.
   - Replace the `INSTANT_CONFIRMATION` footer string with `confirmationCopy(resolved.routeStatus)` output.
   - Sticky-CTA caption changes to the pending-review copy when applicable.

4. **One new Vitest suite: `visible-price-convergence.test.ts`**
   - Golden fixture: 3 guests, Lisbon pickup, Azeitão signature, coastal boat add-on.
   - Mock `fetchStudioQuote` to return the canonical €435 + €90 = €525 response.
   - Render `SignaturePriceCard` and `CheckoutSummary` with the same `resolved` object.
   - Assert visible total on both === `resolved.pricing.totalEur` === `525`.
   - Assert no `€145` anchor and no `ADDITIONS €175 / PP` combined label appear in either.

5. **Verification**
   - `tsgo` typecheck.
   - `bunx vitest run` — all 35 existing + 1 new = 36 tests green.
   - Return real output in the completion report.

## Files touched

- `src/components/studio-v3/StudioV3.tsx` — hoist hook, thread `resolved` prop
- `src/components/studio-v3/SignaturePriceCard.tsx` — price block rewrite
- `src/components/studio-v3/CheckoutSummary.tsx` — total/additions block rewrite
- `src/components/studio-v3/__tests__/visible-price-convergence.test.ts` — new

## Not touched this slice

`FinalRevealStory.tsx`, `LivingJourneyPanel.tsx`, `GuestDetailsStep.tsx`, quote-invalidation logic in refine, phase enum, PDF, mobile layout, Playwright.

## Completion criteria for Slice A

- `SignaturePriceCard` and `CheckoutSummary` render €525 sourced only from the server response on the golden fixture.
- No `tour.priceFrom` and no client add-on arithmetic feeds a visible price in either component.
- `confirmationCopy` gates instant-confirmation strings in both components.
- 36/36 tests pass.
- Report explicitly lists the deferred Pass 1B items so the follow-up turn has a clean handoff.

Approve to switch to build mode and execute.
