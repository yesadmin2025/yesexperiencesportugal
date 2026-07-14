
# Batch 1 + Batch 2 — Test baseline + block manual pricing from instant checkout

Scope locked to what the user approved. No routing / legal / visual / SEO / Studio browser convergence / external smoke work in this pass. All Bókun and Stripe integrations for legitimate `bokun-live` quotes remain untouched.

## Batch 1 — Reliable test baseline

**File: `vitest.setup.ts`**

Add a test-environment-only `ResizeObserver` polyfill (jsdom does not implement it). This is the shim required by `RefineAccordion.tsx:50` and any future component that measures content height for CSS transitions. No production code path changes.

```ts
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill { observe(){} unobserve(){} disconnect(){} }
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverPolyfill;
}
```

**File: `src/components/studio-v3/__tests__/refine-stop-card.test.tsx`**

Test #1 (`is collapsed by default and children are not rendered`) is out-of-date with `RefineAccordion.tsx:90-104`. The component intentionally keeps children mounted (aria-hidden + collapsed max-height) so the open↔close CSS transition can play both ways. This is documented in the component header comment. Fix the test to assert the collapsed contract the component actually ships:

- Section still carries `data-open="false"` and button still carries `aria-expanded="false"` (unchanged).
- The wrapping region has `aria-hidden="true"` when collapsed.
- Do NOT assert the child is absent from the DOM.

## Batch 2 — Block manual pricing from instant checkout

### 2.1 Server-authoritative pricing-source identity

**File: `supabase/functions/_shared/bookingQuote.ts`**

Widen the exported type and add a server-owned checkout-eligibility field:

```ts
export type QuoteSource = "bokun-live" | "manual-viator-tiers";
export type CheckoutEligibility = "instant" | "enquiry_only";

export interface BookingQuote {
  …
  source: QuoteSource;
  /** Server-owned checkout eligibility. Instant = safe to charge a card.
   *  enquiry_only = quote exists but a real Bókun provisional reservation
   *  cannot be created; the browser MUST NOT open Stripe. */
  checkoutEligibility: CheckoutEligibility;
}
```

Extend `BookingQuoteUnavailable.reason` with two new codes returned by the checkout endpoint for the enquiry-only path (see §2.3): `enquiry_only_required`, `manual_pricing_forbidden_in_production` (used server-side; not surfaced verbatim to the customer).

**File: `src/lib/pricing/bookingQuote.ts`** — mirror the same two additions on the client.

**File: `supabase/functions/booking-quote/index.ts`**

- Line 283: change `source: "bokun-live"` → `source: "manual-viator-tiers"`.
- Same insert path: add `checkoutEligibility: "enquiry_only"` to the returned `BookingQuote`. Every response from this endpoint is manual today; the field is always `"enquiry_only"` until a real Bókun path lands. When a future live-Bókun branch is added it will return `source: "bokun-live"` + `checkoutEligibility: "instant"`.
- Persist the two fields on `booking_quotes` insert only if the columns already exist in the schema — otherwise the sentinel `bokun_product_id === "manual"` remains authoritative for server-side detection (no schema migration in this batch).

### 2.2 Studio V3 quote response

**File: `supabase/functions/_shared/resolveQuote.ts`**

Add `checkoutEligibility: "instant" | "enquiry_only"` to `ResolvedQuote`, derived server-side:

```ts
checkoutEligibility = (
  pricing.status === "quoted" &&
  routeStatus === "validated" &&
  availabilityStatus === "validated"
) ? "instant" : "enquiry_only";
```

**File: `supabase/functions/create-signature-checkout/index.ts`** in `handleStudioQuote` — include `checkoutEligibility` in the JSON response (line ~92–113).

**File: `src/lib/studio-v3/quoteClient.ts`** — add `checkoutEligibility: "instant" | "enquiry_only"` to `StudioQuoteResponse`.

Per `resolveQuote.ts:72-75` the "Pass 1 Bókun policy" always sets `availabilityStatus = "pending-review"`, so every Studio quote today evaluates to `"enquiry_only"`. That matches the audit finding (Studio commercial mapping empty).

### 2.3 Server-side fail-closed rejection

**File: `supabase/functions/_shared/checkoutError.ts`**

Add a new code:

```ts
enquiry_only_required: {
  message:
    "This journey needs a quick human review before we can hold your date. Send us a message and we'll confirm within a few hours.",
  retryable: false,
}
```

Extend `codeFromLegacy()` so raw slugs `enquiry_only_required`, `manual_pricing_forbidden_in_production`, and `manual_source_forbidden` all map to this code.

**File: `src/lib/checkout/checkoutError.ts`** — mirror the same code so the browser copy is identical whichever surface receives the error.

**File: `supabase/functions/create-signature-checkout/index.ts`** — `handleBookingQuoteCreateSession()` (line ~474)

Insert the fail-closed check after the token is verified and the stored row is loaded, BEFORE step 3a availability revalidation and BEFORE the current manual-branch synthetic reservation (line 632). The check runs unconditionally in production:

```ts
const isManual = String(stored.bokun_product_id) === "manual";
const testModeEnabled =
  Deno.env.get("MANUAL_CHECKOUT_TEST_MODE") === "yes-i-know-this-is-test" &&
  body.environment === "sandbox";

if (isManual && !testModeEnabled) {
  return jsonError("enquiry_only_required", 409);
}
```

Wrap the existing manual-branch (`else` block at line 632) inside `if (isManual && testModeEnabled) { … }`. In production the branch is now unreachable, so the synthetic `reservationId = "manual:{quoteId}"` write never happens and no Stripe session is created for a manual quote. Live-Bókun quotes (`isManual === false`) reach the normal Bókun reservation flow unchanged.

**File: `supabase/functions/create-signature-checkout/index.ts`** — `handleStudioCreateSession()` (line ~132)

Extend the eligibility gate at line 149. Today it rejects only when a status is literally `"unavailable"`. Change to reject anything that isn't `"validated"` on BOTH statuses, again with the same production-only bypass:

```ts
const isInstant =
  payload.routeStatus === "validated" && payload.availabilityStatus === "validated";
const testModeEnabled =
  Deno.env.get("MANUAL_CHECKOUT_TEST_MODE") === "yes-i-know-this-is-test" &&
  body.environment === "sandbox";
if (!isInstant && !testModeEnabled) {
  return jsonError("enquiry_only_required", 409);
}
```

### 2.4 Environment guarding — the only escape hatch

Production must always reject. The only bypass is BOTH:

- Env var `MANUAL_CHECKOUT_TEST_MODE === "yes-i-know-this-is-test"` (deliberately verbose, cannot be enabled by accident).
- Request body `environment === "sandbox"` (Stripe sandbox; cannot charge live cards).

Both conditions must be true; either alone rejects. No per-product allow-list. No looser `LAUNCH_MODE` value. The env var is NOT set today, so instant checkout is closed everywhere until real Bókun configuration lands.

### 2.5 Signature UI

**File: `src/components/booking/BandedSignatureBookingForm.tsx`**

- Derive `isInstant = quote.quote?.checkoutEligibility === "instant"`.
- `canReserve` (line 78) requires `isInstant` too. When the quote is enquiry-only the Reserve button is not shown.
- Replace the Reserve button + "Instant confirmation" text with an **Enquire** section when `!isInstant` and a quote exists:
  - Copy: "This journey needs a quick human review before we can hold your date. Message us and we'll confirm within a few hours."
  - Primary CTA: `<Link to="/contact" search={{ tour: tour.id, date, adults: composition.adults, minors: composition.minorAges.join(",") }}>Send an enquiry</Link>` (falls back to `/contact` if the search key isn't yet read there — search state preservation is best-effort in this batch; contact route displays the tour name unchanged).
  - Secondary: existing WhatsApp support FAB stays on screen (do NOT hide it here — the enquiry CTA is the primary path).
- Preserve date, `composition`, `pickup`, and the tour context in the enquiry link; never render the strings `manual-viator-tiers`, `no_commercial_mapping`, `bokun_product_id`, or `category_not_ready` to the customer.
- The "Instant confirmation — final price locked at reservation." lead paragraph (line 203) only shows when `isInstant`. When enquiry-only, use a calm alternative: "Live pricing shown below. A designer confirms availability by hand for this journey."

### 2.6 Tailored UI

**File: `src/routes/tours.$tourId.tailor.tsx`**

Same pattern as Signature:
- Disable the Reserve button (line 1408) when `liveQuote.quote?.checkoutEligibility !== "instant"`.
- Inside `handleReserve` (line 470), after `fetchBookingQuote` succeeds but before `createBookingQuoteSession`, check `quoteResp.checkoutEligibility`. If not `"instant"`, close the drawer, do NOT call `createBookingQuoteSession`, and navigate to `/contact` with tour + date preserved.
- Replace "Instant confirmation" copy at line 1431 with the same calm enquiry copy when enquiry-only.

### 2.7 Studio V3 UI

**File: `src/components/studio-v3/StudioV3.tsx`** (around line 992)

Immediately after `const quote = await fetchStudioQuote(snapshot);`:

```ts
if (quote.checkoutEligibility !== "instant") {
  toast.info(
    "This journey needs a quick human review. Message us and we'll confirm within a few hours.",
  );
  setCheckoutOpen(false);
  navigate({ to: "/contact", search: { tour: tour.id } });
  return;
}
```

Also short-circuit `pricing.status !== "quoted"` before the eligibility check (existing behaviour preserved). `commercialProductKey`, `travellerComposition`, `routeStops`, and `selectedAddOns` remain untouched — Studio still uses `studio-v3-private-full-day`.

### 2.8 Preserved behaviours (regression surface)

Do NOT touch: `bokunQuoteRevalidate.ts`, `handleBokunSignatureCreateSession` (already returns `bokun-live` from real Bókun), the Stripe session line-item shape, `booking_quotes` schema, `stripe-webhook`, `paid → confirming → confirmed` lifecycle, idempotency + confirmation lease, `quoteToken` verification, price parity. Every live-Bókun call site is unchanged; the only new refusal is on `isManual` or non-instant paths.

### 2.9 Tests added (required)

All new tests live under `src/__tests__/` or `supabase/functions/**/__tests__/` — component tests are added only where they don't require full router bootstrap.

- **A. Manual-quote identity (`src/__tests__/booking-quote-manual-source.test.ts`)** — a tiny helper `deriveEligibility(source)` extracted into `src/lib/pricing/checkoutEligibility.ts` proves: `"manual-viator-tiers" → "enquiry_only"`, `"bokun-live" → "instant"`. Guarantees the two enums can never diverge again.
- **B. Production manual-checkout rejection (`supabase/functions/create-signature-checkout/__tests__/reject-manual-in-prod.test.ts`)** — Deno-style unit that stubs `verifyBookingQuoteToken` + the admin client and asserts: manual `bokun_product_id` + no test-mode env → 409 `enquiry_only_required`, zero `reserveActivity` calls, zero Stripe calls, no synthetic reservation ID written.
- **C. Direct malicious request** — same test file, second case: even with a valid signed manual token submitted directly, the server refuses without touching Stripe.
- **D. Signature UI (`src/__tests__/banded-signature-enquiry-ui.test.tsx`)** — mocks `useBookingQuote` to return an `enquiry_only` quote, asserts: Reserve button absent, "Instant confirmation" copy absent, Enquire link visible pointing at `/contact`.
- **E. Tailored UI (`src/__tests__/tailor-enquiry-ui.test.tsx`)** — same shape, minus the actual route mount (mock `Link` + `useNavigate`).
- **F. Studio V3 UI** — handled in the same suite by mocking `fetchStudioQuote` to return `checkoutEligibility: "enquiry_only"` and asserting `createStudioSession` is never called and `navigate` fires with `/contact`.
- **G. Live-Bókun regression** — `useResolvedSignature.test.ts` extended: `checkoutEligibility: "instant"` + `routeStatus: "validated"` + `availabilityStatus: "validated"` → existing checkout path proceeds unchanged.

### 2.10 Verification

- `bunx vitest run` → 0 failures (was 2/1874).
- `bunx tsgo --noEmit` → clean.
- Grep confirms no consumer displays raw strings `manual-viator-tiers` / `no_commercial_mapping` / `bokun_product_id` / `category_not_ready`.
- Grep confirms `source: "bokun-live"` no longer appears inside `booking-quote/index.ts`.

## Audit record — arithmetic correction (no re-audit)

Reconciling the numbers I published without re-running scripts:

- **Route inventory dedup**: `local-stories.tsx` (layout) + `local-stories.index.tsx` (leaf) collapse to a single `/local-stories` URL — previously double-counted in bucket A1. Corrected A1 EN indexable static = **30** (was 31).
- **PT exact count**: `pt.tsx` (layout) + `pt.index.tsx` (leaf) = `/pt`; plus 10 leaf routes → **11 PT indexable URLs** (unchanged, already correct).
- **PT catch-all**: `pt.$.tsx` reclassified from bucket A5 (redirect) to bucket A3 (dynamic route family, catch-all → redirects unknown PT paths). Redirect-only count corrected to **19** (was 20).
- **`api/` folder**: `src/routes/api/public/font-fallback-report.ts` (POST beacon), plus any other files under `src/routes/api/` — bucket A9 is enumerated file-by-file, not "3 (+ folders)". Actual count to be listed in the audit record as an exact file list.
- **`email/` folder**: server routes for pgmq processing; enumerate the files instead of citing the folder.
- **55 audited URLs**: 30 (A1 EN indexable, corrected) + 11 (A2 PT) + 12 (A3 tour) + 2 outliers (`/reviews`, `/press` in A1) = 55 measurements input. That total is already what `/tmp/browser/audit/full.py` reported (55 × 5 vps = 275). No re-count needed.
- **Sitemap coverage priority**: reclassified from **P0 → P1**. Sitemap gaps do not corrupt bookings or charge cards; they slow indexing. P0 stays reserved for payment integrity, real Bókun readiness, legal certificate gaps, and the manual-path defect being fixed in this batch.

These corrections are recorded in the audit summary only. No file edit required beyond `.lovable/plan.md` archival if the user wants a written trail.

## Completion report format (returned after implementation)

- files changed (list);
- final pricing-source contract (`"bokun-live" | "manual-viator-tiers"`);
- final checkout-eligibility contract (`"instant" | "enquiry_only"`);
- production rejection behaviour (guard + env var name + typed error code);
- Signature / Tailored / Studio V3 enquiry behaviour (per surface);
- `bunx vitest run` output tail;
- `bunx tsgo --noEmit` output tail;
- explicit confirmation that manual pricing can no longer create a production Stripe Session;
- blockers surfaced for subsequent batches (expected: the entire live-Bókun external configuration gate — currently every quote is enquiry-only until real Bókun categories + price lists exist for at least one tour).
