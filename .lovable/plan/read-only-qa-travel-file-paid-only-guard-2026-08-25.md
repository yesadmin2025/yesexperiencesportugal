# Read-only QA: Travel File paid-only guard

Scope: validate the current main implementation of the paid-only Travel File security guard. No code, schema, generated files, or checkout/payment logic will be changed.

## Steps

1. Confirm gate markers in the working tree:
   - `currency: null` inside the unpaid branch of `supabase/functions/stripe-session-status/index.ts`
   - `src/routes/__tests__/stripe-session-status-security-contract.test.ts` exists

2. If both markers are present, run:
   - `bunx tsgo --noEmit`
   - `bunx vitest run src/lib/__tests__/public-booking-access.test.ts src/lib/__tests__/booking-snapshot-contract.test.ts src/routes/__tests__/stripe-session-status-security-contract.test.ts`

3. Static-audit the unpaid branch of `supabase/functions/stripe-session-status/index.ts` to confirm it exposes only `status`, `paymentStatus`, `environment` plus null/empty placeholders for `amountTotal`, `currency`, `customerEmail`, `customerName`, `receiptUrl`, `created`, `lineItems`, `metadata`.

4. Confirm that access to `lineItems`, `metadata`, and customer details happens only after the paid-status guard.

5. Report exact results: HEAD SHA, typecheck pass/fail, per-test-file pass/fail counts, and any deviations found. No real Stripe calls or payment submissions will be made.
