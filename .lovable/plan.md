## Goal

Extend `e2e/copy-parity.spec.ts` so the same copy-drift guardrails already applied to `/terms`, `/privacy`, `/cookies`, `/contact` and the shared footer also cover:

1. **Signature product pages** (`/tours/$tourId` and their `/tailor` variants)
2. **The checkout step** (`/checkout/$token`)

So that legal terms, FAQ wording and the approved CTA vocabulary stay in lock-step across the full purchase funnel.

## Current state (verified)

- `e2e/copy-parity.spec.ts` already asserts: canonical `EMAIL` / `LICENSE_LABEL` on legal pages, `EMAIL_HREF` + `PHONE_HREF` on `/contact`, canonical `SOCIAL` links on the footer of `/`, `/experiences`, `/portugal-travel-designer`, and that `HOMEPAGE_FAQ` never uses the verb "book".
- `e2e/cta-vocabulary-lock.spec.ts` already checks a legacy-CTA blacklist on product routes but does NOT assert the approved verbs (`Check availability & reserve`, `Tailor this day`, `Reserve securely`) are actually present, and it does not touch `/checkout/$token`.
- Signature routes render `SIGNATURE_FAQ` (from `src/content/seo-faq.ts`) as visible FAQ + `faqPageLd` — perfect surface for a "no legacy verbs / same wording" guard.
- Checkout route is `/checkout/$token` — a stateful page. We need a fixture strategy to reach it.

## Scope

### 1. New "product pages" block in `e2e/copy-parity.spec.ts`

For a small canonical sample of Signature routes:
```
/tours/arrabida-wine-allinclusive
/tours/southwest-vicentine-coast
/sintra-day-tour-from-lisbon
/evora-private-tour-from-lisbon
```
assert on the rendered DOM:
- Canonical `EMAIL` appears somewhere (footer surfaces it), and `EMAIL_HREF` mailto is present.
- Canonical `LICENSE_LABEL` appears (footer credential line).
- Approved primary CTA `Check availability & reserve` is present (`getByRole('link'|'button', { name: /check availability & reserve/i })`).
- Approved secondary CTA `Tailor this day` is present.
- Cancellation copy on the page equals `CANCELLATION.signature.en` (never the deprecated `CANCELLATION_STUDIO` variant on a Signature route).
- FAQ items rendered on the page match `SIGNATURE_FAQ` from `src/content/seo-faq.ts` — for each item's question string, `body.innerText()` must contain it verbatim. Guards against a page starting to hand-edit the visible FAQ while JSON-LD stays untouched (or vice-versa).

### 2. `/tours/$tourId/tailor` sub-block

For the same tours, on their `/tailor` route:
- No legacy CTA strings (reuses `LEGACY` list, kept in sync with `cta-vocabulary-lock`).
- `EMAIL` + `LICENSE_LABEL` still present (footer parity).
- The Tailor page shows a CTA whose accessible name matches `/reserve securely|check availability & reserve/i` (whichever the funnel currently uses — read once via first-match, then assert on subsequent tours to prove parity across tours).

### 3. Checkout block — `/checkout/$token`

Checkout is token-gated. Two options; the plan picks (b):

- (a) Full happy path: mock a Stripe session — heavy, brittle, out of scope for a copy-parity spec.
- (b) **Chosen**: assert the invalid-token / expired-token state renders the canonical copy from `business-nap.ts`. Visit `/checkout/copy-parity-fixture` (a deliberately invalid token) and confirm:
  - The page (or its error state) still renders the site footer with canonical `EMAIL_HREF`, `PHONE_HREF`, `LICENSE_LABEL`.
  - Any recovery CTA uses approved verbs (`Reserve securely`, or a "Back to experiences" style link) — no legacy `Continue draft`, `Design & Book`.
  - Support email in any error message equals `EMAIL` (not a hard-coded string).

If `checkout.$token.tsx` currently renders nothing user-facing for an invalid token (pure redirect), the test instead asserts the redirect target is one of the approved recovery routes (`/experiences`, `/`, `/portugal-travel-designer`) — captured via `page.waitForURL`.

### 4. Small helper refactor (kept in-file)

Extract two tiny helpers already implicit in the current spec:
- `assertCanonicalFooter(page)` — email + license + no duplicate `/contact` link.
- `assertNoLegacyCta(page)` — reuses the same `LEGACY` array as `cta-vocabulary-lock.spec.ts`. To keep the two specs in sync without cross-importing test files, move the array into a new tiny module `e2e/copy-parity-constants.ts` and import it from both specs.

## Out of scope

- No changes to production source files. This is a test-only expansion.
- No new fixtures for a real Stripe session — invalid-token path only.
- No visual/regression screenshots — copy assertions only.
- Does not touch the Studio V3 funnel (already covered by `studio-v3-cta-labels-live.spec.ts`).

## Files touched

- edit `e2e/copy-parity.spec.ts` — three new `describe` blocks (Product pages · Tailor pages · Checkout token page) + helpers.
- **new** `e2e/copy-parity-constants.ts` — shared `LEGACY_CTAS` list.
- edit `e2e/cta-vocabulary-lock.spec.ts` — import `LEGACY_CTAS` from the new module (replaces its inline `LEGACY` constant) so both specs cannot drift.

## Verification

- Run locally: `bunx playwright test --config=playwright.local.config.ts e2e/copy-parity.spec.ts e2e/cta-vocabulary-lock.spec.ts` against the running dev server on `:8080`.
- Confirm all pre-existing copy-parity + cta-vocabulary tests still pass unchanged.
- Confirm the new blocks fail deliberately when a temporary edit (e.g. changing the CTA to `Reserve this day` on one tour, or hard-coding `support@…` on `/checkout/$token`) is applied — proving the guard bites.
- The `pricing-ssot.yml` workflow already runs the copy-parity suite in CI, so the expanded coverage is automatically enforced on every PR — no new workflow file needed.
