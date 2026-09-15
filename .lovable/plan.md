# P0 Stabilization Plan — YES Experiences Portugal

No code changes, no deploys, no data changes in this plan. Design, prices, hero copy, content and booking rules stay exactly as they are.

## (a) Findings from the current code

**1. Environment separation — the real payment mode is decided by the browser**
- `src/lib/stripe.ts` picks live vs test purely from `VITE_PAYMENTS_CLIENT_TOKEN` (`.env.production` holds a `pk_live_…`, `.env.development` a `pk_test_…`).
- `SimpleBookingForm.tsx`, `StudioV3.tsx`, `LivingAtlasBookingStep.tsx` and `tours_.$tourId.tailor.tsx` all send `environment: getStripeEnvironment()` in the request body, and `create-signature-checkout` / `create-builder-checkout` trust that field (`body.environment !== "sandbox" && !== "live"` is the only check). So any caller — a preview build, a local build, a script, Playwright — can create **live** sessions.
- The return-URL allowlist in `create-signature-checkout` explicitly accepts `*.lovable.app`, `*.lovableproject.com`, `*.lovable.dev` and `http://localhost`, with no coupling to the environment. Live sessions can currently point back at previews.
- There is no build-time or runtime guard tying the live publishable key to `yesexperiencesportugal.com`.

**2. Analytics hygiene**
- `analytics-exclusions.ts` already excludes `/admin`, `/pt/admin`, localhost, `id-preview--*`, `*.lovableproject.com`, `*.sandbox.lovable.dev`.
- Missing: `/auth/*`, the published `*.lovable.app` host, automation (`navigator.webdriver`, Playwright/headless UA), and any `traffic_type` / `environment` dimension. `analytics-page-view.ts` also sends full `page_location` (`window.location.href`), so query strings reach GA4.

**3. Client error logger privacy**
- `client-error-logger.ts` stores `window.location.href` in `url` and `pathname + search` in `route` — raw query strings, so Stripe `session_id`, `token`, `gclid/gbraid`, email and preview tokens can land in `client_error_logs`.

**4. Error observability quality**
- Only a flat `severity` field (`error | warning | info | unhandled_rejection | resource`). No classification, so ad-blocked analytics beacons, dev-only asset 404s and real checkout failures are indistinguishable.

**5. Checkout robustness**
- `uiMode: "hosted" | "embedded"` on the function, `data-checkout="embedded"` in `BrandedCheckoutDrawer`, plus `EmbeddedConfirmationSheet` and `conversion-router` naming — three vocabularies for one concept.
- No shared in-flight lock: each surface builds its own session request, so a double tap or a retry can create duplicate sessions.

**6. Deployment health**
- CI is a large set of narrow workflows (hero copy, typography, brand audit, contrast, sitemap, Studio suites). There is **no single required gate** that proves the deployed build: no build+typecheck+critical-unit+smoke composite, and no post-deploy verification of the actual served bundle.

**7. External health checks** — none exist today.

## (b) Files and functions likely to change

- `src/lib/stripe.ts` — replace token-sniffing with an explicit resolver + canonical-host assertion.
- New `src/lib/payments-environment.ts` — single source of truth (`resolvePaymentsEnvironment(host, key)`), used by client and tests.
- `supabase/functions/create-signature-checkout/index.ts`, `create-builder-checkout/index.ts` — derive environment **server-side** from the request `Origin`; ignore/reject a mismatching client `environment`; scope the return-URL allowlist per environment (live → canonical domain only).
- `supabase/functions/_shared/stripe.ts` — add an assertion that live keys are never used for non-canonical origins.
- `src/lib/analytics-exclusions.ts`, `src/lib/analytics.ts`, `src/lib/analytics-events.ts`, `src/lib/analytics-page-view.ts` — `/auth/*`, `.lovable.app`, automation detection, `environment` + `traffic_type` params, drop raw `page_location`.
- `src/lib/client-error-logger.ts` — sanitize URL/route, add `category`.
- New `src/lib/error-classification.ts` — critical / functional / asset_fallback / third_party_blocked / dev_noise.
- Checkout surfaces (`SimpleBookingForm.tsx`, `StudioV3.tsx`, `LivingAtlasBookingStep.tsx`, `tours_.$tourId.tailor.tsx`, `BrandedCheckoutDrawer.tsx`) — shared `useCheckoutSession` hook with in-flight lock, loading/decline/error states, itinerary preserved on retry.
- New `.github/workflows/production-gate.yml` + `scripts/health-check.mjs`.

## (c) Migrations

1. `client_error_logs`: add `category text`, `query jsonb` (sanitized allowlist), keep `url`/`route` columns but stop writing raw values. Non-destructive, additive only.
2. A **reviewed-but-not-executed** cleanup script that rewrites historical `url`/`route` values to path-only. Presented as SQL for approval; not run as part of this plan.
3. Optional `checkout_sessions` idempotency-key column if the duplicate-session guard needs server-side dedupe (decide in batch 5).

## (d) Test coverage to add/update

- `payments-environment.test.ts` — host×key matrix; live only for `yesexperiencesportugal.com` / `www.`.
- Edge-function tests: client claiming `live` from a preview origin is downgraded/rejected; return URL outside canonical origin rejected for live.
- `analytics-exclusions.test.ts` — `/auth`, `.lovable.app`, `navigator.webdriver`, headless UA.
- `client-error-logger.test.ts` — redaction of `session_id`, `token`, `email`, `gclid`, `gbraid`, preview tokens.
- `error-classification.test.ts` — each category.
- Checkout regression: double-click creates one session; failure keeps itinerary; retry reuses the same draft.
- e2e: Playwright run can never obtain a live publishable key (guard test).

## (e) Risk and rollback

| Item | Risk | Rollback |
|---|---|---|
| 1 Env separation | Medium — touches live payments | Feature-flag the server-side override; revert the two functions independently |
| 2 Analytics | Low | Revert exclusions file |
| 3 Logger privacy | Low | Revert logger; columns are additive |
| 4 Classification | Low | Revert helper; `severity` unchanged |
| 5 Checkout robustness | Medium — user-facing flow | Each surface adopts the hook separately; revert per surface |
| 6 CI gate | Low | Delete workflow |
| 7 Monitor | Very low | Disable schedule |

## (f) Implementation batches

1. **Payments environment lock** (findings 1) — resolver + server-side origin derivation + tests. Highest value, review alone.
2. **Analytics hygiene** (2).
3. **Error privacy + classification** (3, 4) + additive migration.
4. **Checkout naming + double-submit + states** (5).
5. **Production gate workflow** (6).
6. **External health monitor** (7).

Batches 2, 3, 5, 6 are independent of 1 and 4 and can be reviewed in any order.
