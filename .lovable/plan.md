## Goal

Add two focused Studio V3 E2E specs that harden the add-on pricing contract from two angles the current suite doesn't cover yet:

1. **Disabled add-ons must never move the totals** — even when the user tries to click them.
2. **Totals must update in the same frame as the click** — no scroll, no navigation, no debounce.

Both specs reuse the existing `walkToReveal` + DOM readers in `e2e/studio-v3-walk-to-reveal.ts`, so the walker logic stays in lockstep with the sibling specs.

## Files to add

### `e2e/studio-v3-add-ons-disabled-never-affect-total.spec.ts`

Contract: an add-on with `data-state="disabled"` (either gated by day capacity or hidden behind the cap-of-3) must be inert.

Steps:
1. Navigate `/studio-v3?e2e=1`, wait for `__APP_READY__`, `walkToReveal(page)`.
2. Skip cleanly if the reveal / add-ons fieldset / party-total isn't mounted (same guard style as `studio-v3-final-investment-live.spec.ts`).
3. Snapshot baseline `addOnsTotal` (should be `0` / hidden) and baseline `partyTotal`.
4. Collect all add-on chips inside `[data-testid="studio-v3-add-ons"]`. Force-click every chip whose `data-state="disabled"` (capacity-gated by the day). After each attempted click:
   - Assert `aria-pressed` stays `"false"`.
   - Assert `parseAddOnsTotalEur(page)` is still `null` / baseline.
   - Assert `parsePartyTotalEur(page)` equals the baseline.
5. Cap-of-3 branch: use `readInteractableAddons(page)` and, if ≥4 exist, select the first 3, then attempt to click a 4th. Verify:
   - The 4th chip flips to `aria-disabled="true"` (per `add-on-microinteractions.test.tsx` contract).
   - Force-click it; `aria-pressed` stays `"false"`, `addOnsTotal` and `partyTotal` unchanged from the 3-selected state.
   - Deselect one → previously-gated chip re-enables (mirrors the unit test but at rendered-HTML level).

### `e2e/studio-v3-add-ons-same-frame.spec.ts`

Contract: `studio-v3-add-ons-total` and `studio-v3-party-total` must reflect the new value **in the same frame as the click**, with no scroll and no phase transition.

Steps:
1. Same setup + `walkToReveal` + skip guards.
2. Record `window.scrollY` and the current `[data-testid="studio-v3-root"]` `data-phase` before each click; assert both are unchanged after.
3. For each of the first 2–3 interactable add-ons, run this atomic sequence inside a single `page.evaluate` to eliminate the Playwright-round-trip window:
   - Read `addOnsTotal.textContent` and `partyTotal.textContent` (pre-click).
   - Dispatch a synthetic `click` on the chip (`btn.click()` in the same evaluate).
   - Immediately (synchronously, no `await`, no `requestAnimationFrame`) re-read both text contents.
   - Return `{ beforeAddOns, afterAddOns, beforeParty, afterParty, phaseBefore, phaseAfter, scrollBefore, scrollAfter, pressed }`.
4. Assert:
   - `afterAddOns !== beforeAddOns` and the numeric delta equals `+€<addon>` for that chip.
   - `afterParty !== beforeParty` and delta equals `addon.eur × partyCount` (derived from the party-total line, same regex as `studio-v3-final-investment-live.spec.ts`).
   - `pressed === "true"`.
   - `phaseAfter === phaseBefore` and `scrollAfter === scrollBefore`.
5. Toggle the same chip off in a second evaluate; assert both totals return to `beforeAddOns` / `beforeParty` in the same synchronous read.

## What this locks down that current specs don't

- `studio-v3-add-ons-total.spec.ts` and `-final-investment-live.spec.ts` only iterate through **interactable** add-ons — they never verify that `disabled` chips are truly inert against forced clicks, and they never verify the cap-gate is enforced at the rendered-HTML level (only the unit test does).
- No existing E2E verifies the "same-frame" property. Every current spec uses `await expect(...)` polling, which would still pass if the totals updated one `rAF` later. The new spec asserts the read is synchronous inside a single `page.evaluate`, and additionally asserts no scroll / no phase change happened.

## Non-goals

- No changes to `SignaturePriceCard.tsx` or the walker helper — the current implementation already satisfies both contracts; these tests are pure regression guards.
- No new CI workflow — both specs run under the existing Playwright config alongside the sibling `studio-v3-add-ons-*.spec.ts` files.
