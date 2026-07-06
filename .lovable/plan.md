## Goal

Add one Playwright E2E spec that locks in the unified reveal card + add-on live-update contract introduced in the last pass.

## New file

`e2e/studio-v3-unified-signature-card.spec.ts`

## Spec structure

Uses the existing `walkToReveal(page)` helper + `readInteractableAddons`, `parseAddOnsTotalEur`, `parsePartyTotalEur` from `e2e/studio-v3-walk-to-reveal.ts` (no new helpers). `test.skip(...)` when the funnel doesn't reach the reveal, matching the other add-ons specs.

### Test 1 — "unified Signature card renders correctly"

- Wait for `[data-testid="studio-v3-reveal"]`.
- Assert exactly one `[data-testid="studio-v3-signature-card"]` is visible.
- Assert the previously-scattered pieces now live INSIDE that single card, using `card.locator(...)`:
  - `[data-testid="studio-v3-reveal-map"]`
  - `[data-testid="studio-v3-story-of-day"]`
  - `[data-testid="studio-v3-stops-editor"]` (when route resolves — guarded with `count() > 0` so it's not flaky on regions without editable stops)
  - `[data-testid="studio-v3-add-ons"]`
  - `[data-testid="studio-v3-add-ons-total"]`
  - `[data-testid="studio-v3-party-total"]`
- Assert `QualityScore` is NOT inside the reveal (`page.locator('[data-testid="studio-v3-quality-score"]').count()` is 0 within the reveal container — kept only in debug overlay).
- Screenshot the card element only (`card.screenshot(...)`) for visual evidence under `/tmp/browser/unified-card/`.

### Test 2 — "add-on toggles still update totals immediately inside the unified card"

- Read `beforeAddOns` + `beforeParty`.
- Pick first 2 interactable add-ons; for each click:
  - Read totals in the SAME frame via a `page.evaluate` that clicks then reads `data-testid="studio-v3-add-ons-total"` and `studio-v3-party-total` textContent — same pattern as `studio-v3-add-ons-same-frame.spec.ts`.
  - Assert `afterAddOns > beforeAddOns` and `afterParty > beforeParty` after each click, and the delta matches `eur * guests` for party (guests read from `[data-testid="studio-v3-guest-count"]` if present, else assert only monotonic increase).
- Toggle both off; assert totals return to the original baseline.

### Test 3 — "totals stay live after expanding/collapsing reveal sections"

Interactive collapsibles in the current reveal:
- Moment "Swap" toggle (`button[aria-label^="Swap "]`) — expands `[data-testid="studio-v3-swap-pool"]`.
- "+ Add one more moment" toggle (`[data-testid="studio-v3-add-moment"] button[aria-expanded]`) — expands `[data-testid="studio-v3-add-pool"]`.

Flow:
1. Baseline `beforeAddOns` / `beforeParty`.
2. Select 1 add-on → assert totals moved.
3. Expand Swap (if present) → collapse it. Assert totals unchanged after each toggle.
4. Expand Add-moment (if present) → collapse it. Assert totals unchanged.
5. Toggle add-on off. Assert totals returned to baseline.
6. Screenshot final state.

## Non-goals

- No changes to `walkToReveal` or the shared helper file.
- No changes to `SignaturePriceCard` / `StudioV3.tsx`. Purely a new spec.
- No CI config changes.

## Verification

Run just the new spec headlessly:
`bunx playwright test e2e/studio-v3-unified-signature-card.spec.ts --reporter=line`
