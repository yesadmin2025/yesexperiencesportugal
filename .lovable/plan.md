# Studio V3 — first-time customer audit (preview, 393px + 1280px)

Read-only. Nothing was edited, deployed or changed. Evidence comes from driving the current project preview at `/studio-v3` as a real guest (2 adults, wine & table, couple, Arrábida/Setúbal, elevated, full day).

## What actually happens

The funnel completes in 8 steps and lands on "Your Day" with a fully composed 11-moment Arrábida day, price shown (€366 / €183 per adult). Then it stops:

- `RESERVE YOUR DAY` renders with the native `disabled` attribute and `data-reserve-blocked="true"`. It can never be clicked, in any run.
- The only live path is `HAVE A CURATOR CONFIRM THIS DAY`.
- Guest Details, Checkout Summary and Stripe are unreachable — no `create-signature-checkout` call is ever attempted, so no server-side or Stripe blocker could even be observed.
- No console errors, no failed network requests. The block is purely a client gate.

## P0 — Reserve is structurally impossible (route-leg shape mismatch, confirmed)

`canReserve` (StudioV3.tsx:5136) requires `approvalStatus === "approved"`, which comes from `validateItinerary({ stops: editedStops, legMinutes: revealLegMinutes })`.

- `validateItinerary` (itinerary-validation.ts:158-177) requires `legMinutes.length === stops.length - 1`, i.e. **10** legs for 11 moments.
- `revealLegMinutes` comes from `useRouteLegMinutes(revealRouteStops)`, and `resolveRevealRouteStops` prepends an **origin** point: `[origin, ...11 stops]` → **11** legs.
- 11 ≠ 10 ⇒ `missing_leg_data` ⇒ status `incomplete` ⇒ mapped to `review` ⇒ Reserve disabled. Always. For every composed day.
- A second failure mode compounds it: `routeStops` is `null` unless *every* moment has approved coordinates, and it also de-duplicates consecutive identical coords — both change the leg count again, so even an off-by-one patch must reconcile counts, not assume them.

This is not a data or content problem; the day is valid and priced. The gate compares two arrays that are defined against different geometries.

**Fix direction (one bounded change):** feed validation the leg set that matches its contract — either drop the origin leg before validating (`legMinutes.slice(1)` when the origin point is present), or pass the origin as a stop so both sides count identically. Must be derived from the actual route-stop array, not hard-coded, and must stay fail-closed when `routeStops` is `null`.

## P0 — the dead end is silent

When Reserve is blocked the user gets a greyed-out primary CTA and no explanation. Nothing says why, nothing says what a curator path means for price or speed, and the page above still promises "Instant confirmation. Your date is held the moment you reserve." That contradiction is visible on screen at the same time as an unclickable Reserve. Even after the P0 fix, a blocked state needs an honest one-line reason next to the CTA.

## P1 — composition density undermines the promise

- 11 moments including **five** wineries ("A local winery" … "A fifth local winery") for a single day with 2 guests. It reads as a list, not a curated day, and the generic labels make five consecutive entries indistinguishable.
- Both add-ons show `WON'T FIT THIS DAY (75M / 90M)` — the day is self-evidently over-full, which is consistent with the validator refusing to approve it for time reasons too.
- Recommendation: cap same-kind repetition (wineries) in the composer and let the freed time make add-ons reachable — the add-on rail is currently pure dead weight on this configuration.

## P1 — the compose overlay holds the screen too long

`studio-v3-compose-overlay` (fixed, `inset-0`, `z-40`) is still painted over Your Day several seconds after the content is behind it, and it intercepts pointer events at the CTA position (`elementFromPoint` returns the overlay, not the button). It does clear eventually. On mobile this reads as a frozen screen.

## P2 — Your Day density and hierarchy at 393px

- The same 11 stops are listed **twice** (hero timeline + "ADJUST THE MOMENTS" accordion) with the reasons only on the second pass. Long scroll, little new information.
- "Because you chose wine." appears on stops 8 and 10 only — sparse reasoning reads arbitrary rather than intelligent.
- Price, add-ons and CTAs all sit below that double list; the commercial moment is a long way from the reveal.

## Verdict as a customer

Up to the reveal it feels genuinely cinematic and unlike a configurator — the pacing, the whispers and the Living Canvas earn trust. Then it collapses: the day it just built for me is one I am not allowed to book, with no reason given, and the only door left is "ask a human". P0 is a single-cause bug, not an architecture problem.

## Next step

Say the word and I will implement the P0 leg-count reconciliation plus the blocked-state reason line, with a regression that asserts an 11-moment composed day reaches `approved` and enables Reserve.
