## Goal
Guarantee `POST /create-signature-checkout` keeps working for the legacy Signature and Tailored body shape after the recent dedupe fix — and catch parse-time regressions (like the duplicated `StudioCreateSessionBody` block) before they ship.

## Approach
Two layers, both cheap and CI-friendly. No new infra.

### 1. Deno module-load smoke test (catches the exact regression)
New file: `supabase/functions/create-signature-checkout/module_load_test.ts`

- `Deno.test("module parses and exports Deno.serve handler", …)` that dynamic-`import()`s `./index.ts`.
- Assertion: import resolves without throwing. This alone would have failed on the duplicated-interface bug.
- Stubs required env (`STRIPE_SANDBOX_API_KEY`, `STUDIO_QUOTE_SIGNING_SECRET`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) with dummy values via `Deno.env.set` before import so top-level reads don't blow up.

### 2. Legacy Signature/Tailor integration test against the deployed function
Extend `e2e/instant-booking-checkout.spec.ts` with one focused block, `test.describe("legacy checkout body — no Studio V3 fields")`, containing two tests:

- **Signature legacy** — POST body with only the pre-Studio-V3 fields (`tourId`, `tourTitle`, `guests`, `stopLabels`, `pickupLabel`, `dateExact`, `journeyTitle`, `priceFromEur`, `returnUrl`, `cancelUrl`, `environment: "sandbox"`, `tailored: false`) — no `flow`, no `mode`, no `quoteToken`. Assert 200, `json.url` matches `^https://checkout\.stripe\.com/`, `json.sessionId` matches `^cs_`, and `resolveFlow` defaulted to `"signature"` (`json.flow === "signature"`, `productName` starts with `"YES Signature — "`).
- **Tailored legacy** — same shape with `tailored: true` and one swapped stop. Assert `json.flow === "tailor"`, `productName` starts with `"YES Tailored — "`, `submitMessage` contains `"within 2 hours"`.

Both use the existing `TOUR_ID = "sintra-cascais"` (already Bókun-mapped) and the existing `invokeCheckout` helper — extended so `flow` is optional in `CheckoutBody`.

### Files
- **New**: `supabase/functions/create-signature-checkout/module_load_test.ts`
- **Edit**: `e2e/instant-booking-checkout.spec.ts` — make `flow` optional in `CheckoutBody`, add the `legacy checkout body` describe block (2 tests).

### Runs in CI
- Deno test executes via existing `supabase--test_edge_functions` tool / any Deno-test CI step.
- Playwright test runs alongside the existing `instant-booking-checkout.spec.ts` — no new workflow needed.

### Out of scope
- No changes to `index.ts`.
- No mocking of Stripe in the e2e layer — the deployed sandbox already returns real `cs_test_...` sessions, matching what the existing suite does.
- No Bókun assertion (already covered by the existing "Bókun is wired" test).