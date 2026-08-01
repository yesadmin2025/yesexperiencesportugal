Goal

Make Playwright runs deterministic in this sandbox and CI, then run the full suite and validate checkout + Signature maps.

## 1. Pin the browser path

- Add `scripts/playwright-env.mjs` that resolves a usable browsers root in this order: existing `PLAYWRIGHT_BROWSERS_PATH`, `/opt/ms-playwright` (present here, contains `chromium-1194` and `chromium_headless_shell-1194`), then `~/.cache/ms-playwright`.
- Export the resolved value from `playwright.config.ts` and `playwright.local.config.ts` before `defineConfig`, so every worker inherits it (same pattern already used for the asset ESM hook via `NODE_OPTIONS`).
- Add `package.json` scripts: `test:e2e` and the per-suite scripts run through a small wrapper (`node scripts/playwright-run.mjs …`) that sets the env and forwards args, so no caller can forget the pin.

## 2. Preflight: chrome-headless-shell present or auto-install

- Extend `scripts/check-playwright-libs.mjs` (already wired as Playwright `globalSetup`) into a real preflight:
  - resolve browsers root (step 1),
  - check for `chrome-headless-shell` and the Chromium build Playwright's installed version expects,
  - if missing, run `bunx playwright install chromium chromium-headless-shell` once (guarded by a lockfile so parallel workers don't race), and keep the existing missing-system-libs `ldd` warning,
  - stay non-blocking on warnings, but fail fast with a clear message if install fails.

## 3. Full suite run

- Run `bun run test:e2e` across the three configured projects (mobile / tablet / desktop Chromium) against the dev server.
- Triage every failure; where the failure is a legitimate visual drift from the recent typography and sticky-CTA changes, refresh only those snapshots with `--update-snapshots` for the affected specs. Report the final pass/fail counts.
- All typography and copy consistency all over the site and right spacing and brand pallet, on mobile specially 
- No repeated images anywhere on the website (exclude signature pages) 

## 4. Checkout validation (mobile + tablet)

- Run `e2e/checkout-price-parity.spec.ts`, `e2e/instant-booking-checkout.spec.ts` and `e2e/instant-booking-checkout-negative.spec.ts`.
- Extend the price-parity spec so it also asserts, for mobile and tablet viewports: per-person and party totals match `resolveJourneyPricing`, the tax/VAT line matches what the pricing library returns, and the final confirmation copy on the review step matches the checkout copy constants.

## 5. Signature route maps

- Run `e2e/signature-map-and-images.spec.ts` (already covers all 11 tours, asserts a `[role="img"][aria-label^="Route map"]` tile with non-zero size).
- If any tour fails, fix the underlying cause in `SignatureRouteMap` / its stop resolver rather than loosening the assertion.

## 6. SEO re-check

- Re-run `e2e/sitemap-robots-canonical.spec.ts` and `e2e/jsonld-rendered.spec.ts` last, after all code changes, to confirm nothing regressed.

## Technical notes

- No app behaviour changes are planned; edits are limited to test infra, scripts, and (if a real defect surfaces) the specific component at fault.
- Snapshot refreshes will be scoped per-spec, never a blanket update.