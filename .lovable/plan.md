## Goal
Execute the full Playwright end-to-end checkout walkthrough against the running app and report results for both Studio V3 and legacy Signature/Tailored flows. No source code changes.

## Scope — which specs run
Three groups, all under `e2e/`:

1. **Legacy Signature / Tailored + Bókun wiring** (deployed edge fn)
   - `instant-booking-checkout.spec.ts` (4 tests — includes the 2 legacy body cases just added)
   - `instant-booking-checkout-negative.spec.ts`
   - `bokun-checkout-coverage.spec.ts`

2. **Studio V3 reveal → quote → checkout golden walkthrough**
   - `studio-v3-reveal-walkthrough.spec.ts`
   - `studio-v3-final-investment-live.spec.ts`
   - `studio-v3-intro-to-investment.spec.ts`
   - `studio-v3-cta-labels-live.spec.ts`
   - `studio-v3-add-ons-total.spec.ts`
   - `studio-v3-add-ons-round-trip.spec.ts`
   - `studio-v3-add-ons-disabled-vs-enabled.spec.ts`
   - `studio-v3-add-ons-disabled-never-affect-total.spec.ts`

3. **CTA / navigation smoke around the reveal**
   - `studio-v3-reveal-and-guest-details-mobile.spec.ts`
   - `studio-v3-p0-guest-details-footer-mobile.spec.ts`

Excluded (not checkout-related): hero, homepage, typography, map-visual specs.

## Execution
Run against the local dev server (`playwright.local.config.ts`) using Chromium:

```bash
bunx playwright test --config playwright.local.config.ts \
  e2e/instant-booking-checkout.spec.ts \
  e2e/instant-booking-checkout-negative.spec.ts \
  e2e/bokun-checkout-coverage.spec.ts \
  e2e/studio-v3-reveal-walkthrough.spec.ts \
  e2e/studio-v3-final-investment-live.spec.ts \
  e2e/studio-v3-intro-to-investment.spec.ts \
  e2e/studio-v3-cta-labels-live.spec.ts \
  e2e/studio-v3-add-ons-total.spec.ts \
  e2e/studio-v3-add-ons-round-trip.spec.ts \
  e2e/studio-v3-add-ons-disabled-vs-enabled.spec.ts \
  e2e/studio-v3-add-ons-disabled-never-affect-total.spec.ts \
  e2e/studio-v3-reveal-and-guest-details-mobile.spec.ts \
  e2e/studio-v3-p0-guest-details-footer-mobile.spec.ts \
  --reporter=list 2>&1 | tee /tmp/e2e-golden.log
```

Timeout budget: up to 10 minutes total (the harness caps each shell call). If a single group exceeds the cap, split into three sequential runs (group 1, then 2, then 3) and concatenate logs.

## Reporting
After each run:
- Summarise `passed / failed / flaky / skipped` counts per group.
- For any failure: file path, test name, first 20 lines of the error, and (if produced) the trace or screenshot path.
- Call out any pre-existing failures unrelated to the checkout fix so they aren't blamed on it.
- Confirm the two new legacy-body tests (`Signature legacy body …`, `Tailored legacy body …`) pass.

## What this will NOT do
- No code edits, no deploys, no migrations.
- Will not open real Stripe checkout — legacy tests stop at the returned `cs_test_...` session URL, matching current suite behaviour.
- Live billing is untouched (`environment: "sandbox"` throughout).

## Rollback
None needed — this is a read-only test run.