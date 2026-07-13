
# Slice D closure — execute the missing verification only

No new features. No production code changes. Add only test scaffolding and run commands.

## 1. Mocked browser flows (Playwright)

Create `e2e/sliceD.launch-verification.spec.ts`. All external calls stubbed via `page.route()` — clearly labelled at top of file as **mocked browser flows, not real external smoke**.

Fixture module `e2e/fixtures/sliceD-mocks.ts` returns deterministic JSON for:
- `POST **/functions/v1/booking-quote` → mixed-family `{adults:2, minorAges:[15,8,0]}` → 4 category lines (Adult ×2, Youth ×1, Child ×1, Infant ×1), `totalPriceEur:745`
- `POST **/functions/v1/bokun-quote` / `bokun-availability` → single slot with 4 matching categories
- `POST **/functions/v1/create-signature-checkout` → `{ url: "about:blank#stub-checkout", sessionId: "cs_test_stub" }`
- `POST **/functions/v1/create-builder-checkout` (Studio) → same stub session
- `GET **/functions/v1/stripe-session-status` → `{ status: "complete", bookingRef: "TEST-1" }`
- Studio suitability + resolved route snapshot: canonical `orderedStops: [{id,label,sequence}]` × 3 stops
- Unsupported-age variant: `POST booking-quote` returns `{ unavailable: "unsupported_age" }`

Two viewports run in the same spec via `test.use({ viewport })`:
- Desktop 1280×1800
- Mobile 393×852

Scenarios per viewport (3 flows × 2 sizes = 6 baseline + 1 unsupported gate = 7):
1. **Signature** — open a Signature tour route (discover from `signatureTours` map), open composition picker, set `{2, [15,8,0]}`, wait for quote, assert:
   - DOM shows labels "Adult", "Youth", "Child", "Infant" from server payload
   - total participants text = 5
   - price = €745 (or the mocked value) matches across itinerary / checkout summary
   - "Reserve" / "Continue" CTA enabled
2. **Tailored** — same picker + summary assertions on the Tailored route
3. **Studio V3** — same composition, then assert Storyboard / Final / Checkout render the same normalised `orderedStops` (compare DOM `data-stop-id` list or visible labels)
4. **Unsupported-age gate** — mock returns `unsupported_age`; assert CTA disabled, error surface shown, `waitForRequest` for Stripe URL times out → prove no checkout call
5. **Horizontal-overflow check** at 393px — `document.documentElement.scrollWidth === clientWidth` on every screenshot

Screenshots to `/tmp/browser/sliceD/<flow>-<viewport>-<step>.png`.

## 2. Production build

Run `bun run build`. Capture exit code and tail. Report actual result — no forward-dated claims.

## 3. Regression baseline

- Baseline attempt: `git stash` the three new Slice D test files, run `bunx vitest run`, capture failing test names + assertion lines to `/tmp/sliceD/baseline-failures.txt`. Restore files, re-run, diff.
- If `git` is unavailable in this sandbox for stash, run vitest with `--exclude src/__tests__/sliceD.*` first, then unrestricted, and diff failure lists by name.
- Report either:
  - `new failures introduced by Slice D: 0` (only if names + line numbers match), or
  - `31 pre-existing failures claimed but not independently baselined` if diff cannot be produced reliably.

## 4. External smoke

Not executed. Report unchanged:
`remaining launch blocker: real Stripe sandbox + Bókun test-channel smoke not executed`.
No mock is substituted for the real flow.

## Completion report shape
- mocked browser scenarios executed (list of 7)
- desktop + 393px screenshot paths (grouped)
- DOM composition + Studio route-convergence result (equal / not equal)
- full-suite baseline comparison (with method + result)
- `bun run build` exit code + tail
- real external smoke status: not executed
- remaining launch blocker: as above

## Files added (test-only)
- `e2e/sliceD.launch-verification.spec.ts`
- `e2e/fixtures/sliceD-mocks.ts`

## Files NOT touched
Slice A/B/C tests and helpers, production edge functions, `useBookingQuote`, `TravellerCompositionPicker`, `StudioV3.tsx`, styles, routes.
