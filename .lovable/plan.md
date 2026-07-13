# Real Stripe sandbox + Bókun test-channel smoke — /tours/arrabida-boat#book

## Current blocker (from live edge logs)

Every `booking-quote` call for `arrabida-boat` on the current Bókun test channel returns:

```
stage: "unavailable"
reason: "no_commercial_mapping"
autoSyncOk: false
autoSyncReason: "no adult price resolvable from Bókun"
warnings:
  - "No resolvable price for band adult (Bókun category 678401)"
  - "No resolvable price for band youth (Bókun category 1022005)"
bokunProductId: 885297, optionId: null, rateId: null
```

Meaning: the code path is correct (auto-sync fires, categories resolve, mapping attempted), but the Bókun **test channel** has no price list attached to product `885297` for the resolved adult category. Without a resolvable adult price, `booking-quote` returns `unavailable`, the Reserve CTA stays disabled, and no Stripe PaymentIntent can be created. A real smoke run cannot pass in this state — it would just re-confirm the same `no_commercial_mapping` we already see.

So the smoke run is not "just execute it": it requires unblocking the upstream data first, then running the end-to-end script and capturing evidence.

## Plan

### 1. Confirm the blocker is upstream, not code

- Re-run `booking-quote` via `supabase--curl_edge_functions` with `{ tourId: "arrabida-boat", adults: 2, minorAges: [8, 0], date: <next open Sat> }` and capture the exact response + `x-request-id`.
- Cross-check against one Signature tour that *does* have a working Bókun test mapping (query `tour_price_tiers` for any row where `bokun_categories` has a confirmed adult price). If that one returns a valid `quote`, the code path is proven and the arrabida-boat failure is purely a Bókun test-channel data gap.

### 2. Fix the upstream gap (Bókun test channel), no code change

Options, in order of preference:
- **(a) Ask the user to attach the sandbox price list to product 885297 in Bókun** for the test channel (adult + youth categories 678401 / 1022005). This is a Bókun dashboard action — cannot be done from code.
- **(b) If (a) is not possible today**, pick a different Signature tour that already has a working test-channel mapping and run the smoke against it instead, clearly labelled as "smoke tour: <id>" rather than arrabida-boat. This still proves Stripe sandbox + Bókun reservation end-to-end.

I will *not* seed fake prices into `tour_price_tiers` to force a quote — that would violate the "no invented prices" rule and would not exercise the real Bókun reservation path anyway.

### 3. Execute the smoke run (Playwright, headless Chromium, 393×852)

Script under `/tmp/browser/stripe-smoke/`:

1. Restore Supabase session from env vars (per browser-use guidance).
2. Navigate to `http://localhost:8080/tours/<smoke-tour>#book`.
3. Assert no legacy Guests stepper; assert `TravellerCompositionPicker` present.
4. Set adults=2, add minors aged 8 and 0, pick next available date.
5. Capture the outgoing `booking-quote` request payload + response (`checkoutSummary`, server labels).
6. Fill contact fields with sandbox test data (name, email `smoke+<ts>@yesexperiences.pt`, phone).
7. Click Reserve; on Stripe Payment Element, use test card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
8. Confirm payment. Wait for redirect to success/confirmation route.
9. Capture:
    - the single `create-checkout` (or equivalent) request — assert `checkoutCalls === 1` by counting matching network requests
    - the resulting `payment_intent` id / status via Stripe sandbox lookup (server function or edge log)
    - the resulting Bókun test reservation id from the edge-function logs
10. Screenshots at each step (picker filled, Stripe element, success page).

### 4. Deliverables reported back to the user

- Confirmation the code path is correct (or list of any real code fixes discovered).
- Which tour the smoke actually ran against and why (if we had to switch off arrabida-boat).
- Exact `booking-quote` request + response payloads.
- Network log line proving `checkoutCalls === 1`.
- Stripe sandbox PaymentIntent id + status.
- Bókun test reservation id (from edge logs).
- 393px screenshots: filled picker, Stripe element, confirmation page.
- If step 2 (a) is required and the user hasn't done it, this plan pauses at step 1's report with a clear one-line ask: "attach sandbox price list to Bókun product 885297 (categories 678401, 1022005) then re-run".

## Out of scope

- Any change to `booking-quote`, `useBookingQuote`, `TravellerComposition`, Signature routing, pricing math, or Studio.
- Seeding prices in `tour_price_tiers` to bypass Bókun.
- Live Stripe or production Bókun — sandbox / test channel only.
