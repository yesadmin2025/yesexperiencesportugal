## Scope

Close Slice D by fixing only the three remaining browser failures:

1. Tailored mobile — composition drifts (Adults ends at 3 instead of 2).
2. Studio V3 — intro click does not advance phase in headless.
3. Signature mobile- only shows adults when booking 

No changes to booking, pricing, Bókun, Stripe, or Studio itinerary architecture. One minimal, non-visual testability marker added to the Studio root.

---

## 1. Studio root — add hydration marker (only production change)

File: the existing Studio V3 root component (the element already tagged `data-testid="studio-v3-root"`).

Add:

```tsx
const [clientReady, setClientReady] = useState(false);
useEffect(() => { setClientReady(true); }, []);
```

Extend the existing root element attributes only:

```tsx
<div
  data-testid="studio-v3-root"
  data-phase={phase}
  data-client-ready={clientReady ? "true" : "false"}
  /* all existing className / handlers unchanged */
>
```

Constraints:

- No visual change, no new wrappers, no conditional rendering gated by `clientReady`.
- No change to phase logic, navigation, intro CTA, or any hook order beyond the added `useState` + `useEffect`.
- No new exports.

---

## 2. `e2e/sliceD-browser-interactions.py` — Tailored mobile deterministic composition

Rewrite the composition step (both viewports, but the bug is mobile) to be value-driven, not click-count-driven:

```
adultsTarget = 2
minorAgesTarget = [15, 8, 0]

read current adults from the stepper's displayed value
while adults > target: click "-"; re-read
while adults < target: click "+"; re-read
assert adults === 2

ensure exactly 3 minor rows exist (add/remove as needed)
for each minor row i, fill age input with minorAgesTarget[i], Tab to blur
poll page.evaluate until composition state === {adults:2, minorAges:[15,8,0]}
  (read from the same source the Reserve button uses; 5s deadline)

assert total participants label === 5
```

Then and only then click Reserve. Capture the next `booking-quote` request and assert body composition deep-equals `{adults:2, minorAges:[15,8,0]}`. Mobile scenario is not "passed" unless this assertion holds AND `checkoutCalls === 1` with `quoteToken` echoed.

Apply the same value-driven routine to Tailored desktop to keep both paths identical.

---

## 3. `e2e/sliceD-browser-interactions.py` — Studio driver rewrite

Replace the current intro driver with:

```
await page.goto("/studio-v3", wait_until="domcontentloaded")
root = page.locator('[data-testid="studio-v3-root"]')
await root.wait_for(state="attached", timeout=10_000)
await page.wait_for_function(
    '() => document.querySelector("[data-testid=studio-v3-root]")?.dataset.clientReady === "true"',
    timeout=10_000,
)
assert await root.get_attribute("data-phase") == "intro"

begin = page.get_by_test_id("intro-begin")
await begin.wait_for(state="visible")
await begin.click()   # standard Playwright click only; no evaluate() fallback

await page.wait_for_function(
    '() => document.querySelector("[data-testid=studio-v3-root]")?.dataset.phase !== "intro"',
    timeout=8_000,
)
```

If the wait_for_function times out AFTER `data-client-ready="true"`, capture diagnostics (do NOT retry with JS click):

- `begin.is_disabled()`, `begin.bounding_box()`
- `page.evaluate` of `document.elementFromPoint(cx, cy)?.outerHTML.slice(0,200)`
- computed `pointer-events` on button and every ancestor
- current `data-phase`
- list of `[data-overlay], [role="dialog"], .fixed.inset-0` visible elements
- console errors buffered so far
Fail the scenario with that diagnostic bundle attached to `report.json`.

Continue driving remaining phases (travellers → preferences → generation → Storyboard → Final → Checkout) using existing stable selectors. Enter composition `{adults:2, minorAges:[15,8,0]}` via the same deterministic routine as Tailored.

For Storyboard, Final Itinerary, and Checkout Summary, read independently from the DOM (data attributes already emitted by these screens) and build:

```
{ commercialProductKey, travellerComposition, orderedStops: [{id,label,sequence}] }
```

Assert:

- `storyboard === final === checkout` (deep equal on the three snapshots)
- `commercialProductKey === "studio-v3-private-full-day"`
- `checkoutCalls === 1`

Run at both `1280×1800` and `393×852`.

---

## 4. Reporting

Extend `report.json` (no format regression) with:

- `tailored.desktop.composition`, `tailored.mobile.composition` (from captured quote body)
- `studio.<viewport>.clientReady`, `.introTransitioned`, `.phaseSequence`, `.snapshots.{storyboard,final,checkout}`, `.snapshotsEqual`
- Global `pageErrors`, `consoleErrors`, `failedRequests` per scenario
- `remainingLaunchBlocker: "real Stripe sandbox + Bókun test-channel smoke not executed"`

Screenshots per phase saved under `/tmp/browser/sliceD-interactions/screenshots/` and paths listed in the report.

---

## Files touched

- Studio V3 root component: add `clientReady` state + `data-client-ready` attribute only (≈4 lines).
- `e2e/sliceD-browser-interactions.py`: rewrite Tailored composition helper + Studio driver + report shape.

No other production files change. Signature scenarios and unsupported-age gate remain untouched (already passing).

## Pass criteria (must all hold to close Slice D)

Signature desktop/mobile · Tailored desktop/mobile · Studio desktop/mobile · unsupported-age mobile — as enumerated in the request. Remaining launch blocker stays: real Stripe sandbox + Bókun test-channel smoke not executed.