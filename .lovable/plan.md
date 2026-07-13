## Slice D Closure — Browser Interaction Pass

Ready to execute. I'm still in plan mode — approving this plan will let me write the test file and run it.

### Deliverable

One versioned Playwright script: `e2e/sliceD-browser-interactions.py` (reproducible after sandbox destruction). Evidence goes to `/tmp/browser/sliceD-interactions/{screenshots,logs,report.json}`.

### Endpoints actually mocked (verified against source)

Static scan of `src/hooks/use-booking-quote.ts`, `src/lib/pricing/bookingQuoteCheckout.ts`, `src/components/SimpleBookingForm.tsx`, `src/components/checkout/FinalDetailsDialog.tsx`, `src/routes/tours.$tourId.tailor.tsx`, `src/components/studio-v3/StudioV3.tsx` confirms the app only calls these Supabase functions in these flows:

- `POST /functions/v1/booking-quote`
- `POST /functions/v1/create-signature-checkout` (used by Signature, Tailored, and Studio; mode field disambiguates)
- `POST /functions/v1/bokun-availability` (fired by `FinalDetailsDialog` when a date is set)

No `bokun-quote`, `bokun-availability` (as a picker call), or `studio-*` endpoints are invented. A catch-all fulfills any other `/functions/v1/*` with `599` and records URL/method/body into `report.unexpectedSupabaseCalls` — the run fails the scenario if the list is non-empty.

The `tour_price_tiers` Data-API read is also intercepted with a fixture row that carries `banded_pricing_enabled: true` and one confirmed Bókun category per band. This is required to force `SimpleBookingForm` to route to `BandedSignatureBookingForm` (the only Signature form hosting `TravellerCompositionPicker`).

### Response-contract fidelity

Quote response matches `BookingQuoteResponse` exactly (from `src/lib/pricing/bookingQuote.ts`) — including `travellerComposition`, `resolvedGuestMix`, `basePricing.lines[]` with distinctive labels `Youth 14-17`, `Child 6-13`, `Infant 0-5`, plus `quoteToken`.

Unsupported-age fixture uses the exact production shape:
```json
{"availabilityStatus":"unavailable","reason":"age_unsupported","unresolvedAges":[0],"message":"…"}
```
No invented `{"mode":"unsupported_age"}` or `{"unavailable":"…"}` shape.

Checkout response matches `BookingQuoteCheckoutResponse`.

### Quote-token checkout assertion

- Assert `bookingQuote` request body contains `travellerComposition:{adults:2,minorAges:[15,8,0]}`. Fail if it uses `guests:5` only.
- Assert `create-signature-checkout` request body contains `quoteToken === QUOTE_TOKEN`. Do NOT re-assert composition on the checkout body (production is token-based).

### Scenarios (per viewport unless noted)

Viewports: 1280×1800 and 393×852.

1. **Signature** — nav `/tours/sintra-cascais`, fill date, adults +1 → 2, minors +3 → set ages [15,8,0]. Assert distinctive labels rendered. Click "Reserve securely" → fill `FinalDetailsDialog` (name/email/phone/pickup) → "Continue to secure checkout". Assert `checkoutCalls===1`, `quoteToken` present. Screenshots: `signature-picker-*`, `signature-checkout-*`.
2. **Tailored** — nav `/tours/sintra-cascais/tailor`, same composition, follow same reserve flow. Screenshots: `tailored-picker-*`, `tailored-checkout-*`.
3. **Studio V3** — nav `/studio-v3`; capture initial phase screenshot. Full 19-phase drive-through (`PHASE_ORDER` in `StudioV3.tsx`, lines 276–292) is out of scope for one browser pass; report explicitly notes that Storyboard/Final/Checkout DOM triple-snapshot convergence is covered by the existing `sliceD.studio-convergence.test.ts` (17/17 vitest passing). Static invariant: `commercialProductKey: "studio-v3-private-full-day"` is grep-confirmed as the sole route-resolution target. Screenshot: `studio-storyboard-*`.
4. **Unsupported age (393px only)** — same flow, single minor age 0, quote mock returns `age_unsupported`. Assert error text visible, Reserve button `is_disabled()` true, `checkoutCalls===0`. Report does NOT claim browser proof of `reserveActivity===0` — that stays with the existing Slice D vitest. Screenshot: `signature-unsupported-393`.
5. **Mobile bounds (393px only)** — picker + Reserve CTA bounding boxes fully inside 393px viewport; `documentElement.scrollWidth <= clientWidth + 1`.

### Recorded per run

`pageerror` events, `console` error events, `requestfailed` non-asset events, and every unexpected Supabase call. All folded into `report.json`.

### Completion report

Printed to stdout and written to `/tmp/browser/sliceD-interactions/report.json`:

- browser interactions executed (per viewport)
- actual outgoing `travellerComposition` payload from the intercepted `booking-quote` request
- server labels rendered (from DOM `getByText` counts)
- Signature checkout call result `{calls, hasQuoteToken}`
- Tailored checkout call result `{calls, hasQuoteToken}`
- Studio DOM snapshot: static-invariant `commercialProductKey`, note pointing to vitest for triple-surface convergence
- Unsupported-age gate: `{errorVisible, ctaDisabled, checkoutCalls}`
- screenshot paths
- pageErrors / consoleErrors / failedRequests / unexpectedSupabaseCalls
- `remaining launch blocker: real Stripe sandbox + Bókun test-channel smoke not executed`

### Not modified

No changes to `src/**`, `supabase/**`, existing `e2e/*.spec.ts`, styles, routes, pricing, Bókun, Stripe, Studio generation, or visuals. No new vitest tests.
