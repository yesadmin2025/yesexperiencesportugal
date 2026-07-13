## Scope

Fix only the three proven browser failures in `e2e/sliceD-browser-interactions.py`. No production code changes. Re-run the script; return the completion report.

## 1. Signature mobile — commit minor ages before Reserve

Symptom: 393px scenario sent `{adults:2, minorAges:[]}` because Reserve fired before the three minor-age `<input>` values debounced up into `TravellerCompositionPicker`'s `onChange`.

Fix in `compose_2_15_8_0()`:
- After the third `Increase Travellers aged 0-17`, wait for `input[id^="minor-age-"]` count === 3 (already done).
- For each of the 3 inputs: `focus → fill → dispatch input+change → Tab` (blur) so the controlled `onChange({adults, minorAges})` fires. Current `el.fill(); el.blur()` in `set_minor_age` is not always enough on mobile — add `page.keyboard.press("Tab")` after fill.
- Poll `page.evaluate` reading the actual `input[id^="minor-age-"]` values until they equal `["15","8","0"]`, deadline 5s.
- Before clicking Reserve, poll `fx.quote_calls[-1].body.travellerComposition` until it equals `{adults:2, minorAges:[15,8,0]}` (that proves the quote debounced with the committed composition). Only then click Reserve.
- Assertion `outgoingCompositionMatchesExpected` becomes a pass gate for both viewports.

## 2. Tailored — align readiness fixture with production contract + wait for readiness

Two proven issues:

(a) Fixture shape drift. The resolver reads `MappedBokunPricingCategory` fields:
`bokunCategoryId`, `bokunTitle`, `minAge`, `maxAge`, `uiBand`, `mappingStatus`, `countsTowardCapacity`, `normallyFree`. Current fixture emits `label` instead of `bokunTitle` and omits `countsTowardCapacity`. Rewrite `readiness_row()` to emit the exact production names:

```
{
  "bokunCategoryId": "adult",
  "bokunTitle": "Adult",
  "minAge": 18, "maxAge": 99,
  "uiBand": "adult",
  "countsTowardCapacity": true,
  "normallyFree": false,
  "mappingStatus": "confirmed"
}
```

Repeat for youth (14-17, `bokunTitle: "Youth 14-17"`), child (6-13, `"Child 6-13"`), infant (0-5, `"Infant 0-5"`, `normallyFree: true`). Keep the outer row keys (`tour_id`, `bokun_categories`, `pricing_mode`, `banded_pricing_enabled`, `synced_from_bokun_at`) that `fetchTourBokunReadiness` selects.

(b) Timing gate. `useCategoryAwareCheckoutReadyFor` returns `ready:false` while the react-query is loading. Tailored clicks Reserve before the query resolves → `mixedFamilyBlocked`. In `run_tailored()`, before clicking Reserve, poll a `page.evaluate` diagnostic that reads:

```js
window.__yesTailoredDiagnostic  // set only if instrumentation exists
```

Since no such window hook exists in production, use a DOM-shaped diagnostic instead: poll until `Reserve securely` button is enabled (its disabled attribute reflects `!mixedFamilyBlocked`). Cap at 6s. Also assert the "unresolvedAges" inline error is NOT present on any minor row.

If the button never enables inside 6s, capture and log the full readiness state through the visible UI (each minor-row hint shows `Age N · <bandLabel>` when resolved, or `not supported` when unsupported) and screenshot; treat that as a production defect only if fixture is correct and Reserve still won't enable.

Complete the flow in both viewports:
- date → composition (via §1 fixed helper) → wait Reserve enabled → click Reserve → fill FinalDetailsDialog → Continue to secure checkout → assert `quoteCalls>=1`, `checkoutCalls===1`, `checkout.body.quoteToken===QUOTE_TOKEN`, `outgoingComposition==={adults:2,minorAges:[15,8,0]}`.

## 3. Studio V3 — real route + real intro drive + real phase snapshots

Symptom: `[data-testid="studio-v3-root"]` never mounted because the driver never cleared `StudioV3Intro`. The route `/studio-v3` is correct (confirmed from `src/routes/studio-v3.tsx`). The intro is rendered from inside `StudioV3` when `state.phase === "intro"`; only after `onComplete` fires (name + pathMode) does `studio-v3-root` mount.

Fix `run_studio()`:
- `page.goto("/studio-v3")`. Assert current URL contains `/studio-v3` and no redirect.
- Intro step 1: wait for the intro name input (`input[autocomplete="given-name"]` or the first visible text input inside the intro region), fill "Test", click the Intro `Continue` button.
- Intro step 2: click the "Compose it quickly" (fast path) card. Use `get_by_role("button")` with accessible-name match; if it's a `div[role=button]`, fall back to `page.locator('text=Compose it quickly').first.click()`.
- Wait up to 8s for `[data-testid="studio-v3-root"]` to exist. If it doesn't mount, capture: current URL, page title, all `h1/h2/h3` texts, body excerpt (first 500 chars), console errors, failed requests, DOM screenshot; return `{error:"root-mount-failed", diagnostics:{...}}`.
- Once mounted, read `data-phase` and drive using the real controls:
  1. `who` → composition (reuse §1 helper) → Continue
  2. `rhythm`/`preferences` phases → pick first visible ChoiceGrid tile → Continue
  3. Loop until `data-phase === "storyboard"` (cap 15 iterations)
  4. Snapshot Storyboard: read `commercialProductKey` from `window.__studioV3State?.commercialProductKey` if exposed, otherwise from `[data-testid="studio-v3-signature-card"] [data-commercial-key]` fallback; enumerate `[data-testid="studio-v3-stop-row"][data-stop-id]` (id + label + sequence)
  5. Advance to `confirmation` (Final) → snapshot from `[data-testid="studio-v3-final-reveal-timeline"] [data-stop-id]`
  6. Advance to `checkoutSummary` → snapshot from checkout summary stops → click `[data-testid="studio-v3-checkout-summary-reserve"]`
  7. Await `checkoutCalls===1`
- Assert `snapshots.storyboard.orderedStops`, `.final.orderedStops`, `.checkout.orderedStops` deep-equal, and `commercialProductKey === "studio-v3-private-full-day"`.

If Studio phases beyond `who` require additional selection (region, feeling), pick the first visible tile and log the phase path. Never fabricate a "?" phase — record the actual `data-phase` string.

## 4. Report

Extend the existing `report.json` writer to record, per scenario:
- Signature desktop + mobile: `outgoingComposition`, `checkoutCalls`, `checkoutHasQuoteToken`, screenshot paths
- Tailored desktop + mobile: same + `summaryPopulated`, `reserveEnabledAfterMs`
- Studio desktop + mobile: route used, `rootMounted`, `phaseSequence`, three snapshots, `equal`, `commercialProductKey`, `checkoutCalls`
- Unsupported-age mobile: `errorVisible`, `ctaDisabled`, `checkoutCalls===0`
- Aggregated `pageErrors`, `consoleErrors`, `failedRequests`
- `remainingLaunchBlocker: "real Stripe sandbox + Bókun test-channel smoke not executed"`

Pass criteria: all 7 scenarios succeed as defined by the user.

## Files touched

Only `e2e/sliceD-browser-interactions.py`. No `src/**`, `supabase/**`, or workflow changes.

## Out of scope

Real Bókun/Stripe smoke — remains the sole remaining launch blocker.