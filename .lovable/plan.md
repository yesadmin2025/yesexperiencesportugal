# Studio Checkout Retry + Extra Failure Modes E2E

Two additions layered on top of the existing `e2e/structured-data-rendered.spec.ts` + `create-signature-checkout-error-envelope.spec.ts` from the previous turn. Both live in a single new spec so they share Studio-drive-through helpers.

## Retry model recap (verified in `StudioV3.tsx`)

- CTA fires `handleStripeCheckout(state, pendingGuestDetails)` → sets `checkoutPending = true`.
- On any thrown error: `toast.error(userMessage)` fires, `finally { setCheckoutPending(false) }` restores the CTA.
- There is no separate "Retry" button — retry = re-tapping the primary Reserve CTA after the toast surfaces. That is the behaviour to lock in.

## New file: `e2e/studio-v3-checkout-retry-and-failures.spec.ts`

Playwright spec, `mobile-chromium` project (matches Studio's mobile-first surface).

### Shared harness

- `openStudioReserve(page)` helper: hydrates `sessionStorage` with a completed Studio V3 draft (tour id `sintra-cascais`, guests: 2, valid guest details) so the phase advances straight to `confirmation`, then waits for the Reserve CTA.
- `stubCheckout(page, handler)` helper: `page.route('**/functions/v1/create-signature-checkout*', handler)` with per-test counters for call count, method, and body assertions.
- `readToast(page)` helper: reads the latest `[data-sonner-toast]` node.

### Test 1 — Retry re-fires the correct request and clears prior error

Steps:

1. First stub returns `500 { error: "internal_error", code: "internal_error", message: "…", retryable: true, requestId: "req_1" }`.
2. Tap Reserve → assert `checkoutPending` visible (CTA disabled / spinner), toast appears with the guest-safe "Something went wrong on our side" copy, CTA re-enables.
3. Swap stub to `200` success envelope (mocked Stripe session URL + sessionId).
4. Tap Reserve again → assert:
  - Exactly one additional POST to `create-signature-checkout` (call counter = 2).
  - Second request body matches the first (same `quoteToken`, `guests`, `returnUrl`) — proves retry re-fires the *same* checkout intent, not a stale/wrong payload.
  - Prior error toast is dismissed (no visible error toast at moment of retry).
  - CTA transitions to pending, then navigation to Stripe URL is intercepted.
5. After success: assert `checkoutPending` is false (spinner gone), no lingering error state, and no orphaned toast.

### Test 2 — Timeout keeps CTA retryable, no stuck pending

- Stub: `route.fulfill` after a delay that exceeds Studio's per-call timeout OR use `route.abort('timedout')`.
- Tap Reserve → wait for `toast.error` with network / timeout copy (`network_error` mapping).
- Assert CTA re-enables (button not `disabled`) within a bounded window.
- Tap again with a normal 200 stub → second request fires, spinner clears, no double-request race.

### Test 3 — Malformed payload (non-JSON body) → generic guest copy, retryable

- Stub: `status 200, body: "<html>gateway</html>"`.
- Assert: toast surfaces generic guest copy (not raw HTML), CTA re-enabled, `checkoutPending` reset.
- Retry with valid stub → success path fires.

### Test 4 — 5xx upstream (`502 bokun_unreachable`) marks retryable and honours retry

- Stub: `502 { error: "bokun_unreachable:…", code: "bokun_unreachable", retryable: true, requestId: "req_x" }`.
- Assert guest copy: "Our booking partner is briefly unreachable…".
- CTA stays enabled after toast; second tap re-fires; success stub resolves the flow.

### Test 5 — 5xx non-retryable (`config_missing`) disables silent retry loop

- Stub: `500 { code: "config_missing", retryable: false, requestId: "req_y" }`.
- Assert toast copy matches the `config_missing` line.
- CTA re-enables (guest can *choose* to retry), but the second tap MUST still fire only when the guest asks — assert we do NOT auto-retry (call counter stays at 1 until a second explicit tap).

### Test 6 — `checkoutPending` never leaks across failure→success

Covers the memory the plan calls out ("no stale checkoutPending"):

- Force `page.route` to `route.abort('failed')` on first tap → toast, CTA re-enabled.
- Immediately swap to success stub → tap Reserve → assert only one in-flight request at a time (`page.waitForRequest` count = 1 for this tap), spinner clears once resolved.

## Assertions shared across all tests

- Call counter is asserted per test (no duplicate concurrent requests during pending).
- After every failure, `await expect(reserveCta).toBeEnabled()` within 2s.
- After every success stub, navigation intercept confirms the Stripe URL was requested (page.route on Stripe host or window.location assign spy).
- Toast text is asserted against the guest-safe copy from `src/lib/checkout/checkoutError.ts` (imported from the same COPY dictionary to keep tests aligned with source of truth).

## Package.json script

Add `"test:e2e:checkout-retry": "playwright test e2e/studio-v3-checkout-retry-and-failures.spec.ts --project=mobile-chromium"`.

## Out of scope

- No changes to `handleStripeCheckout` or `StudioV3.tsx` — this is pure test coverage.
- No new UI "Retry" button; the plan honours the existing tap-CTA-again retry model.
- Builder checkout (`create-builder-checkout`) is intentionally deferred — Studio V3 always routes through signature checkout; a Builder retry spec would need a separate driver and is not what the user asked for.

After testing fix issues