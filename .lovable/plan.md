
# Slice D — Launch Verification (corrected)

Verification-only. No new features, no refactors. Fix only defects proven by the tests below.

## Corrections applied
1. Lifecycle assertions use exact persisted state strings: `quoted`, `reserved`, `checkout-created`, `paid`, `confirming`, `confirmed`, `expired`. No underscore variants.
2. Server-to-server guarantees verified via Vitest with spied `reserveActivity` / Stripe `checkout.sessions.create`, not Playwright network intercepts. Playwright asserts UI/UX only.
3. No new production URL flag for Studio. Incompatible candidate/stop injected via Playwright `page.route()` fixtures and vi-mocked `studioTourSuitability` / `studioStopSuitability` readiness responses in the Vitest integration test. No production code path changes.
4. Malicious-price policy: server **ignores** client-supplied `priceEur` / `totalEur` and recomputes authoritatively. Test sends deliberately inflated values and asserts stored/Stripe/visible totals equal server-recomputed total and are unequal to the malicious input. 400 is not required.
5. Canonical route snapshot:
   ```ts
   { commercialProductKey, travellerComposition, orderedStops: [{ id, label, sequence }] }
   ```
   Compared across Storyboard → Final Itinerary → Checkout Summary → stored `booking_quotes.itinerary_snapshot` → confirmation payload → PDF/voucher. Confirmation + PDF read persisted snapshot; if `resolveStudioV3Route` is invoked after the quote is stored, test fails. PDF/voucher reported as `not applicable — no artifact generated` if the flow produces none.

## Deliverables

### Vitest integration (server-authoritative)
`src/__tests__/sliceD.parity.test.ts`
- Mixed-family `{adults:2, minorAges:[15,8,0]}` resolves against confirmed categories → Youth/Child/Infant labels + Adult; total=5; four category lines in reservation payload; no `adult` fallback for a minor age.
- Unsupported-age gate with fixture lacking infant: `booking-quote` returns `unavailable: unsupported_age`; spies confirm `reserveActivity` calls=0 and `stripe.checkout.sessions.create` calls=0.
- Ambiguous mapping (`mappingStatus !== "confirmed"` or duplicate range match) → same gate, same spies=0.
- Call-ordering assertion via ordered spy log: `verifyQuoteToken → validateLiveSlotAndCategories → reserveActivity → stripe.checkout.sessions.create`. Stripe call index MUST be greater than reserve call index; failure = defect.
- Malicious client price: POST includes `priceEur: 1, totalEur: 1`; assert `storedQuote.total_eur === serverRecomputed === session.amount_total/100 !== 1`.
- Parity chain: `bokunCategorySubtotal + dbAddOnSubtotal === quote.totalPriceEur === storedQuote.total_eur === session.amount_total/100 === booking.final_total_eur`. Category quantities equal across picker payload → quote → provisional reserve → confirmed reservation.

`src/__tests__/sliceD.lifecycle.test.ts` (extends Slice A harness)
- Success: `quoted → reserved → checkout-created → paid → confirming → confirmed`, single `bokun_reservation_id`, `confirm_attempts=1`, `confirming_at` NULL post-confirm.
- Expired checkout: `checkout-created → expired`, `bokun.release` called exactly once.
- Retry: mock Bókun confirm to fail once → row returns to `paid`, `confirming_at` cleared, `confirm_attempts=1`. Stripe webhook replay → `confirming → confirmed`, `confirm_attempts=2`, same `bokun_reservation_id`, `reserveActivity` still called only once.

`src/__tests__/sliceD.studio-convergence.test.ts`
- Inject one incompatible candidate + one incompatible stop via vi-mocked suitability data.
- Assert: candidate excluded from ranking; incompatible stop replaced or dropped; itinerary non-empty; no duplicate `routeStop.id`; `commercialProductKey === "studio-v3-private-full-day"`; no Signature `bokunProductId` present in Studio quote payload.
- Canonical snapshot equality across Storyboard / Final / Checkout / stored / confirmation. Assert `resolveStudioV3Route` NOT called after quote stored (spy).

### Playwright (UX + composition persistence)
`e2e/sliceD.launch-verification.spec.ts` (chromium, desktop 1280×1800 + mobile 393×852)
- Signature, Tailored, Studio V3: composition `{adults:2, minorAges:[15,8,0]}` selected in picker, verified in checkout summary; screenshots at picker / itinerary / checkout for each flow × each viewport under `/tmp/browser/sliceD/`.
- Assert server-resolved Youth/Child/Infant labels render from `basePricing.resolvedMinors` (not client classification).

### Real external smoke (conditional)
`e2e/sliceD.external-smoke.spec.ts` — runs only when `STRIPE_SANDBOX_API_KEY` + `BOKUN_TEST_CHANNEL_UUID` present AND a safe Bókun test slot resolves.
- One full pass: reserve → Stripe test Session (card 4242…) → webhook → confirm same `bokun_reservation_id`.
- `afterAll` releases any test reservation not intentionally confirmed.
- If unavailable, spec is skipped and report notes `real Stripe sandbox + Bókun test-channel smoke not executed`.

### Regression bundle
```
bunx vitest run
bunx tsgo --noEmit
bun run build
bunx playwright test e2e/sliceD.launch-verification.spec.ts --project=chromium
bunx playwright test e2e/sliceD.external-smoke.spec.ts --project=chromium   # skipped if creds absent
```

## Failure gates (task fails if any true)
- Client-side age classification reachable in any browser path
- Server accepts client-supplied prices into stored/Stripe totals
- Any minor age resolves to `uiBand:"adult"`
- Stripe Session created before or without provisional Bókun reserve
- Studio quote carries any Signature `bokunProductId`
- Divergent canonical snapshot across Storyboard / Final / Checkout / stored / confirmation / PDF
- Duplicate `bokun_reservation_id` reserved twice for one booking
- Confirmation or PDF re-runs `resolveStudioV3Route` instead of reading persisted snapshot

## Defect-fix policy
Only touch production code if a test above fails. Allowed surfaces: `useBookingQuote`, `TravellerCompositionPicker`, `booking-quote` edge fn (price-ignore + ordering), `stripe-webhook` (lifecycle), `StudioV3.tsx` (snapshot persistence). Forbidden: visuals, schema beyond Slice A, Stripe/Bókun key config, admin surfaces.

## Report format
Return only:
- browser scenarios executed
- desktop + 393px screenshot paths
- resolved category payload (one JSON block)
- canonical snapshot equality result per surface (incl. PDF or `not applicable — no artifact generated`)
- parity table (markdown)
- lifecycle result (three rows, exact state strings)
- ordered spy log proving reserve-before-Stripe
- vitest tail, tsgo tail, `bun run build` tail
- defects fixed (files + one-liner)
- `remaining launch blocker: none` — only if external smoke actually ran; otherwise `remaining launch blocker: real Stripe sandbox + Bókun test-channel smoke not executed`
