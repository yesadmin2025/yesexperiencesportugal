# Structured Data Validation + Checkout Error E2E

Three coordinated workstreams that lock in the recent JSON-LD and error-envelope work with automated checks.

---

## 1. Structured Data Validation Crawler

**Goal:** parseable ImageObject / ImageGallery / TouristAttraction / ItemList markup on every tour and itinerary page.

New files:
- `scripts/validate-structured-data.mjs` — Node script driven by Playwright (already installed for E2E).
  - Boots the app against `http://localhost:8080` (assumes `bun run dev` or CI-started server; script accepts `--base-url`).
  - Route list sourced from `src/lib/planning-head.ts` destination map + a filesystem scan of `src/routes/tours.$tourId.tsx` fixtures + `src/routes/itineraries.*.tsx`.
  - For each URL: `page.goto`, then extract every `<script type="application/ld+json">`, `JSON.parse`, and run validators.
  - Validators (pure functions in `scripts/lib/jsonld-validators.mjs`):
    - `assertImageObject(node)` — requires `@type: "ImageObject"`, absolute `contentUrl`/`url`, `caption`, `width`/`height` when present are numeric.
    - `assertImageGallery(node)` — requires `@type: "ImageGallery"`, `name`, `image[]` with ≥3 valid `ImageObject`.
    - `assertTouristAttraction(node)` — requires `@type: "TouristAttraction"`, `name`, `image` (ImageObject or absolute URL string).
    - `assertItemListOfStops(node)` — `@type: "ItemList"`, `itemListElement[]` with `position` + `item` that passes `assertTouristAttraction`.
  - Fails the process with a summary table (URL, missing field, node index) and exit code 1.
- `scripts/lib/route-inventory.mjs` — resolves the concrete URL list (tours + itineraries + planning destinations) so both this script and the vitest suite share one source.

No new deps: reuses installed `playwright`.

---

## 2. CI Check: Rendered JSON-LD Assertions (unit-level)

**Goal:** fast, in-band vitest that renders tour + itinerary routes and asserts `stopMediaLd` / `pageGalleryLd` shape without needing a running browser. Complements #1 (which catches SSR/runtime regressions).

New file:
- `src/routes/__tests__/structured-data.render.test.tsx`
  - Uses `@tanstack/react-router` memory history + `createRouter` to render `/tours/:tourId` and each itinerary route with the existing test loader fixtures.
  - Uses `@testing-library/react`'s `renderToStaticMarkup`-style helper already used in other route tests.
  - Parses emitted `<script type="application/ld+json">` from the head via the same helper the app uses (`extractHeadLd` — new tiny util in `src/lib/__tests__/helpers/extractHeadLd.ts`).
  - Asserts per stop:
    - `stopMediaLd` present, `itemListElement.length === stops.length`.
    - Each `item.image.contentUrl` is `https://…`, `caption` non-empty, matches the stop label prefix.
  - Asserts per gallery block:
    - `pageGalleryLd` present with `image.length ≥ 3`, deduped URLs, all absolute.
- New CI script entry in `package.json`:
  - `"test:structured-data": "vitest run src/routes/__tests__/structured-data.render.test.tsx src/lib/__tests__/jsonld-stop-media.test.ts"`
  - `"validate:structured-data": "node scripts/validate-structured-data.mjs"`
- `.github/workflows/structured-data.yml` (only if repo already uses GH Actions — otherwise document invocation in `docs/ci-structured-data.md`):
  - Job A: `bun install && bun run test:structured-data` (fast, always).
  - Job B: `bun install && bun run build && bun run preview & wait-on http://localhost:8080 && bun run validate:structured-data` (SSR-truth check).

---

## 3. E2E: Checkout Edge-Function Failure Modes

**Goal:** for every `checkoutError` code, Studio surfaces the correct guest-safe message and honors retryable behavior.

New file:
- `tests/e2e/studio-checkout-errors.spec.ts` (Playwright).
  - Uses `page.route('**/functions/v1/create-signature-checkout', …)` and `**/create-builder-checkout` to stub responses per test case.
  - Cases (one `test()` each), driven by a table of `{ code, status, retryable, expectedCopy }` imported from `src/content/checkout-errors.ts` (single source of truth — matches unit tests):
    - `validation_failed` (400) → shows validation copy, CTA stays enabled, no retry spinner loop.
    - `unauthenticated` (401) → shows sign-in prompt, CTA disabled until auth.
    - `rate_limited` (429) → shows "try again in a moment" copy, CTA re-enabled after cooldown.
    - `stripe_unavailable` (502) → retryable copy, CTA remains enabled, breadcrumb logged.
    - `internal_error` (500) → generic guest-safe copy + supportId visible.
    - Legacy string payload → parseCheckoutError fallback path renders generic copy.
    - Network failure (`page.route` → `route.abort('failed')`) → offline copy, CTA enabled.
  - Shared helper `tests/e2e/helpers/openStudioCheckout.ts`: navigates to Studio V3, seeds `editedStops` via `page.evaluate` (localStorage), advances to the final reveal, clicks primary CTA.
  - Assertions per case:
    - `expect(page.getByRole('alert')).toContainText(expectedCopy)`.
    - CTA enabled/disabled state via `toBeEnabled()` / `toBeDisabled()`.
    - `retryable === true` → clicking CTA again fires a second network call (verify via `page.waitForRequest`).
  - Both Signature and Builder flows covered (parameterized).

Config:
- Add `playwright.config.ts` if absent (headless chromium, viewport 393×852 mobile-first per project memory, plus a desktop project).
- New scripts:
  - `"test:e2e": "playwright test"`
  - `"test:e2e:checkout": "playwright test tests/e2e/studio-checkout-errors.spec.ts"`

No new runtime deps. Adds dev dep `@playwright/test` if not already present (project uses raw `playwright` today).

---

## Order of execution

1. Shared inventory + validators (`scripts/lib/*`) — needed by #1 and #2.
2. Vitest render assertions (#2) — fastest feedback.
3. Playwright crawler (#1).
4. Checkout error E2E (#3), reusing checkout-errors content module.

## Out of scope
- No changes to runtime JSON-LD emitters (already hardened last turn).
- No changes to edge-function error envelopes (already stable).
- No new visual/UX changes.
