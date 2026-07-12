## Slice A closure — final implementation

Migration for the two new columns already ran (`booking_quotes.expired_at`, `booking_quotes.bokun_release_result`). The two safety corrections are folded in below.

### 1. Preserve `unsupported_age` vs `category_not_ready`

Files: `supabase/functions/create-signature-checkout/index.ts`, `src/__tests__/sliceA.reservation-spine.test.ts`.

The v3 quote path already resolves composition against the confirmed commercial category mapping at quote-generation time (`booking-quote`). So `basePricing.lines[i].bokunCategoryId` means: this age is supported by the mapping. `unsupported_age` therefore surfaces at quote time and is not reintroduced at checkout.

In `handleBookingQuoteCreateSession`:

1. Drop the current "free infant silently skipped when slot omits the infant category" branch (both the pre-flight loop at ~536–544 and the same skip inside the reserve payload builder at ~565–570).
2. Slot pre-flight now checks only `slot_unavailable` and `capacity_exceeded`.
3. Reserve payload build:
   - For EVERY `line.quantity > 0`, the slot MUST expose `line.bokunCategoryId`. Missing → `return jsonError("category_not_ready:<catId>", 409)`. No `isFree` bypass.
   - Accumulate `selectedQuantity += line.quantity` and after the loop assert `selectedQuantity === resolvedGuestMix.totalParticipants`, else `composition_mismatch`.
   - Only then call `reserveActivity`.

`unsupported_age` remains the responsibility of `booking-quote` (already implemented via `resolveCompositionAgainstCategories` in Slice B); the checkout function never converts an unmapped age to Adult or omits it.

### 2. Atomic expiry + payment transitions

File: `supabase/functions/stripe-webhook/index.ts`.

Add handling for `checkout.session.expired`:

```
const { data: claimed } = await admin
  .from("booking_quotes")
  .update({ state: "expired", expired_at: new Date().toISOString() })
  .eq("quote_id", quoteId)
  .eq("state", "checkout-created")
  .select("quote_id, bokun_reservation_id")
  .maybeSingle();

if (!claimed) return 200 { ignored: "not_in_checkout_created" };
if (!claimed.bokun_reservation_id) return 200 { released: false };

const release = await releaseReservation(claimed.bokun_reservation_id); // never throws
await admin
  .from("booking_quotes")
  .update({ bokun_release_result: sanitisedResult })
  .eq("quote_id", claimed.quote_id);
return 200 { released: true };
```

`sanitisedResult` = `{ status: "released"|"already_expired"|"failed", code?: httpStatusOrShortMessage, at: iso }`. No raw Bókun payload, no tokens.

Also import `releaseReservation` from `_shared/bokun.ts` and extend the early "non-checkout events" guard so `checkout.session.expired` falls into the new branch instead of the "ignored" path.

**Payment confirmation atomicity** (existing v3 branch at ~248–330): replace the read-then-guard on `state === "confirmed"` with a claim-then-act:

```
const { data: claimed } = await admin
  .from("booking_quotes")
  .update({
    state: "confirmed",
    bokun_reservation_status: "confirmed",
    paid_at: nowIso, confirmed_at: nowIso,
  })
  .eq("quote_id", quoteId)
  .in("state", ["reserved", "checkout-created"])   // NOT "expired" / "cancelled" / "confirmed"
  .select("quote_id, bokun_reservation_id, final_total_eur, bokun_base_subtotal_eur, database_addon_subtotal_eur")
  .maybeSingle();
```

Only when the claim succeeds do we call `confirmReservation(bokunReservationId)` and mirror to `bookings`. If it returns null (already confirmed, expired, cancelled), the webhook is idempotent and returns `already_confirmed` after mirroring identifiers from the stored row. This makes payment vs expiry mutually exclusive at the DB layer, not just at read-time.

Both the parity check (`amountTotal === Math.round(final_total_eur * 100)`) and the confirm call run only inside the claimed branch.

### 3. Tests (`src/__tests__/sliceA.reservation-spine.test.ts`)

Replace the "free infant silently skipped when the slot omits the infant category" test with:
- `infant selected + slot has no matching Infant category → category_not_ready, no reserveActivity, no Stripe`
- `selected quantity mismatch → composition_mismatch, no reserveActivity`

Keep the mixed-family 4-line test (slot exposes infant → infant included at €0).

Add expiry/atomic cases (pure-logic mirrors of the webhook branch, matching the file's existing style):
- `expired session with state=checkout-created → conditional update returns 1 row → releaseReservation called once → state transitions to expired`
- `duplicate expired webhook → conditional update returns 0 rows → releaseReservation NOT called`
- `expiry arriving after confirmation (state=confirmed) → conditional update returns 0 rows → confirmed booking untouched`
- `payment confirmation claim excludes expired/cancelled/confirmed → no double-confirm`

### 4. Verification
- `bunx vitest run src/__tests__/sliceA.reservation-spine.test.ts`
- `bunx tsgo --noEmit`

### Out of scope
- Slice C, any UI change, any refactor of `_shared/bokun.ts` beyond confirming `releaseReservation` remains idempotent + never-throws.

### Completion report
Files changed · corrected infant-missing-category behaviour · Stripe-expiry release behaviour · vitest output · tsgo output.
