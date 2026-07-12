## Slice A closure — recoverable confirming lease (ready to build)

Migration already applied: `booking_quotes.confirming_at`, `confirm_attempts`, `bokun_reservation_status`; state constraint now includes `confirming`; partial index on `(state, confirming_at) WHERE state='confirming'`.

Approve this plan and I will execute the code changes below in one build turn — no more planning.

### `supabase/functions/stripe-webhook/index.ts` (v3 branch, ~292–410)

Constant: `CONFIRM_LEASE_MS = 3 * 60 * 1000`.

State machine: `reserved | checkout-created → paid → confirming → confirmed`.

Both `checkout.session.completed` and `checkout.session.async_payment_succeeded` already route through this branch (lines 178–180), and the `session.payment_status !== "paid"` guard (line 189) blocks confirmation on unpaid/processing sessions. No change required.

Sequence per webhook delivery:

1. Read quote row (`select *`). Verify Stripe amount ↔ `final_total_eur` parity (existing).
2. **Phase A — atomic `→ paid`**: `.update({state:'paid', paid_at: nowIso}).eq('quote_id',q).in('state',['reserved','checkout-created'])`.
3. Re-read row for authoritative `state`, `confirming_at`, `confirm_attempts`.
4. Route on `currentState`:
   - `confirmed` → mirror booking row, return 200 `already_confirmed`.
   - `expired|cancelled|failed` → return 200 `needs_review: quote_state_terminal`.
   - `paid` → try **Phase B fresh claim**: `.update({state:'confirming', confirming_at: now, confirm_attempts: prev+1}).eq('state','paid')`.
   - `confirming` → skip fresh claim, jump to lease handling.
5. If Phase B produced no row, inspect lease age:
   - Fresh (`age < CONFIRM_LEASE_MS`) → **HTTP 503** `confirm_in_flight`, `retryable:true`, do NOT call Bókun.
   - Stale → **atomic reclaim**: `.update({confirming_at: now, confirm_attempts: prev+1}).eq('state','confirming').eq('confirming_at', prevConfirmingAt)`. Only one webhook wins; loser returns 503 `lease_reclaimed_by_other_worker`.
6. Winner calls `confirmReservation(bokunReservationId)`.
7. **Phase C — success**: `.update({state:'confirmed', bokun_reservation_status:'confirmed', confirmed_at: now, confirming_at: null, last_error: null}).eq('state','confirming')`. Mirror booking row. Return 200 `confirmed`.
8. **Retryable failure** (any thrown/network error): `.update({state:'paid', confirming_at: null, bokun_reservation_status:'confirm_failed', last_error: <sanitised ≤240>}).eq('state','confirming')`. Return **HTTP 502** `confirm_failed`, `retryable:true`. Reservation is NOT released — the provisional hold stays for the next attempt.

Expiry branch unchanged: still requires `state='checkout-created'`, so paid/confirming/confirmed are naturally immune.

Async payment: same code path already handles `checkout.session.async_payment_succeeded` — no card-only constraint.

### `src/__tests__/sliceA.reservation-spine.test.ts`

Extend the in-memory `handlePaymentConfirm` helper to model the three phases + lease, and add:

1. Two simultaneous payment webhooks — only one Phase-B claim succeeds, `confirmReservation` called exactly once, both requests end with the quote `confirmed`.
2. Concurrent webhook sees fresh `confirming` lease → no Bókun call, response `{ httpStatus:503, retryable:true }`.
3. Bókun transient failure → `confirming → paid`, `confirming_at=null`, `last_error` set, HTTP 502; second delivery re-enters Phase B and confirms.
4. Worker dies mid-confirm (simulate: state stays `confirming`, `confirming_at` in the past by > lease) → next webhook reclaims exactly once → Bókun called → `confirmed`.
5. Two webhooks race the stale reclaim → only one wins the conditional update → only one calls `confirmReservation`.
6. Successful confirmation clears `confirming_at` and `last_error`.
7. Retryable failure resets `confirming_at` to `null`.
8. Expiry attempted during `paid` / `confirming` / `confirmed` → no release, state unchanged (three cases).
9. Unpaid Stripe session → no Phase A, no Bókun call.

### Verification

- `bunx vitest run src/__tests__/sliceA.reservation-spine.test.ts`
- `bunx tsgo --noEmit`

### Out of scope

Slice C, UI, admin surfaces, `_shared/bokun.ts` refactor.

### Completion report

Corrected state transitions · test output only.
