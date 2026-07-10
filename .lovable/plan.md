# GA4 ecommerce dataLayer on GTM-M82SQS79

Data-layer / logic only. No styling, no palette, no button changes.

## Audit — what's already in place

- GTM container `GTM-M82SQS79` is installed in `src/routes/__root.tsx:196` (script + `<noscript>` iframe). No changes needed.
- `src/lib/analytics.ts` already owns a `track(event, params)` primitive that pushes to `window.dataLayer` and mirrors to `gtag`. It's SSR/test-safe.
- `src/lib/studio-v3-funnel.ts` already tracks per-step funnel enters via `useStepTimer` and knows `stepNumber`/`stepKey`.
- `computeQualityScore(state)` in `src/lib/studio-v3-quality.ts` returns the 0–100 quality read.
- Booking-confirmed page (`src/routes/booking-confirmed.tsx`) polls session status and receives `amountTotal`, `currency`, `paymentStatus`, `environment` — the natural home for `purchase`.
- Studio v3 fires an existing `tier_chosen` internal funnel event at `src/components/studio-v3/StudioV3.tsx:1355` — the perfect anchor for `add_to_cart` (tier).

## New module: `src/lib/analytics-ga4.ts`

A thin, typed layer on top of `track()`. Every call:

1. `window.dataLayer.push({ ecommerce: null })` — required GA4 reset.
2. `window.dataLayer.push({ event, ecommerce: { … } })` — the real push, with the exact GA4 event name and standard `items[]` shape.

No mirroring to `gtag` — GA4 in GTM consumes dataLayer directly; keeping the reset paired with the payload avoids double-fire.

Exported helpers (all no-op during SSR/test):

```ts
gaViewItem({ tour })                       // GA4: view_item
gaStudioStart()                            // custom: studio_start
gaStudioStep({ stepNumber, stepKey, qualityScore })  // custom: studio_step
gaAddToCartSignature({ tour, guests })     // GA4: add_to_cart  (tier: "signature")
gaAddToCartStudioTier({ tier, priceEur, tourId?, tourTitle? })  // GA4: add_to_cart
gaBeginCheckout({ items, valueEur })       // GA4: begin_checkout
gaAddPaymentInfo({ paymentType, items, valueEur })  // GA4: add_payment_info
gaPurchase({ transactionId, valueEur, items, currency? })  // GA4: purchase
gaGenerateLead({ leadSource, method })     // GA4: generate_lead
```

`buildTourItem(tour, { quantity, tier })` centralizes the GA4 item shape:
`{ item_id, item_name, item_category: "Signature" | "Studio", item_brand: "YES Experiences Portugal", price, quantity, currency: "EUR" }`.

## Call sites

### 1. `view_item` — `/tours/*`
`src/routes/tours.$tourId.tsx` — `useEffect(() => gaViewItem({ tour }), [tour.id])` inside the page component. Fires once per tour load.

### 2. `studio_start` — Begin click
`src/components/studio-v3/StudioV3Intro.tsx:136` — add `onClick={() => { gaStudioStart(); setStep("name"); }}` (composes with the existing handler). No visual change.

### 3. `studio_step` — every configurator step
`src/lib/studio-v3-funnel.ts` — extend `useStepTimer` signature to accept an optional `qualityScoreProvider: () => number | null`, and call `gaStudioStep({ stepNumber, stepKey: input.stepKey, qualityScore: qualityScoreProvider?.() ?? null })` inside the same `enter` branch that already runs `trackStep`. In `StudioV3.tsx`, pass `() => computeQualityScore(state)?.total ?? null` to the hook. Existing Supabase funnel logging is untouched.

### 4. `add_to_cart` — Signature Reserve
`src/components/SimpleBookingForm.tsx` — inside the submit handler, immediately before the `supabase.functions.invoke("create-signature-checkout", …)` call, fire `gaAddToCartSignature({ tour, guests })`. Same call added in `src/routes/tours.$tourId.tailor.tsx:390` (tailor path shares the same edge function). Both are Reserve intents.

### 5. `add_to_cart` — Studio tier selected
`src/components/studio-v3/StudioV3.tsx` around line 1355 (inside the existing `onTierChosen` handler that already emits `tier_chosen`) — fire `gaAddToCartStudioTier({ tier: id, priceEur, tourId, tourTitle })`.

### 6. `begin_checkout` — Stripe redirect
Fired at three checkout entry points, right before the `create-signature-checkout` invoke:
- `src/components/studio-v3/StudioV3.tsx:758`
- `src/components/SimpleBookingForm.tsx:83`
- `src/routes/tours.$tourId.tailor.tsx:390`

Payload: `value: totalEur || (priceFrom * guests)`, `currency: "EUR"`, `items: [buildTourItem(tour, { quantity: guests, tier })]`.

### 7. `add_payment_info`
Best available signal in this codebase is "embedded Stripe UI mounted with a valid clientSecret" — the user has reached the payment surface. Fire once when `setClientSecret(resp.clientSecret)` succeeds in the three checkout callers above (guarded by a ref so re-mounts don't double-fire per session). `payment_type: "stripe"` (Stripe Embedded doesn't expose the chosen method until confirm; we use the wrapper as the payment type).

### 8. `purchase` — confirmation
`src/routes/booking-confirmed.tsx` — in the existing `useEffect` that resolves session status, when `data.paymentStatus === "paid"`, fire `gaPurchase({ transactionId: session_id, valueEur: data.amountTotal / 100, currency: data.currency ?? "EUR", items: [buildTourItem(tourById(tour), { quantity: 1, tier: "signature" })] })`. Guarded by a ref keyed on `session_id` so polling never double-fires.

### 9. `generate_lead` — 3 sources
- Contact submit: `src/routes/contact.tsx:160` — inside `setStatus("success")` branch, `gaGenerateLead({ leadSource: "contact_form", method: "email" })`.
- WhatsApp click: `src/components/support/WhatsAppSupportButton.tsx` and the shared `data-analytics="whatsapp_click"` delegator — extend the click handler (or add a wrapper in `installAnalyticsAttrs`) so any element with `data-analytics="whatsapp_click"` also fires `gaGenerateLead({ leadSource: dataset.analyticsPlacement ?? "whatsapp", method: "whatsapp" })`. Covers TrustStrip, Footer, FAB.
- Tailor "Talk to a local": `src/routes/tours.$tourId.tailor.tsx:1099` — add `onClick={() => gaGenerateLead({ leadSource: "tailor_talk_to_local", method: "whatsapp" })}` to the anchor.

## Files touched

New:
- `src/lib/analytics-ga4.ts`
- `src/lib/__tests__/analytics-ga4.test.ts` (verifies each helper pushes `{ecommerce: null}` first, then the correct GA4 payload; verifies items[] shape and `currency: "EUR"`)

Edited:
- `src/lib/analytics.ts` — extend delegator to also fire `generate_lead` when `data-analytics="whatsapp_click"` matches.
- `src/lib/studio-v3-funnel.ts` — add optional `qualityScoreProvider` to `useStepTimer`, fire `gaStudioStep` on enter.
- `src/routes/tours.$tourId.tsx` — `useEffect` view_item.
- `src/components/studio-v3/StudioV3Intro.tsx` — onClick studio_start.
- `src/components/studio-v3/StudioV3.tsx` — pass qualityScoreProvider to timer, fire add_to_cart on tier_chosen, fire begin_checkout + add_payment_info around Stripe invoke.
- `src/components/SimpleBookingForm.tsx` — fire add_to_cart + begin_checkout + add_payment_info.
- `src/routes/tours.$tourId.tailor.tsx` — fire add_to_cart + begin_checkout + add_payment_info + generate_lead on Talk to a local.
- `src/routes/contact.tsx` — fire generate_lead on success.
- `src/routes/booking-confirmed.tsx` — fire purchase when paid, dedupe by session_id ref.

Zero visual, style, palette, or copy changes. No package installs.

## Verification

1. `bun run test src/lib/__tests__/analytics-ga4.test.ts` — asserts reset-then-push contract and payload shape per event.
2. Playwright script that navigates through `/tours/sintra-private-tour` → tailor → begin_checkout, and separately `/studio-v3` intro → step 1, capturing `window.dataLayer` after each interaction and asserting the exact GA4 event names and `items[]` structure appear in order, each preceded by `{ ecommerce: null }`.
3. Manual: GTM Preview mode against the container to confirm each event surfaces with the expected params.

## Risk

Low. Additive analytics only — every call site is guarded by SSR/test checks and swallowed try/catch. No changes to Stripe payloads, checkout logic, routing, RLS, or components' visible output. The one shared change (studio-v3-funnel `useStepTimer` signature gaining an optional arg) is backward-compatible.
