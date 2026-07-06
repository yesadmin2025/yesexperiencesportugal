# Make the Studio intention land — and count driving time honestly

Four friction points came back: reveal lands flat, add-ons feel disconnected, drawer summary feels thin, and guest/date/tier feels clunky. Under all of them is one truth bug: **the day-budget behind the add-on picker only counts stop dwell — it ignores the driving between stops**, so it silently over-promises free minutes and the add-ons list feels detached from a real day.

Fix the honesty first, then tighten the moments around it. No new sections, no redesign.

---

## Part 1 — Count real driving time in the day budget (the "add-ons" bug)

Today `SignaturePriceCard` receives `remainingMinutes` from `summarizeDay({ stops, region })` in `StudioV3.tsx` (~L3622). No `drivesMin` is passed, so it falls back to haversine only when every stop has lat/lng — and it never uses the **real OSRM leg minutes** we already fetch in `RevealRouteMap` via `useRouteLegMinutes`. Result: add-on budget is inflated and the "free minutes" gauge lies to the user.

**Fix (surgical):**

1. Lift the `useRouteLegMinutes` call from inside `RevealRouteMap` up to `StoryboardHandoff` (its parent) so both the map AND the price card read the same `legMinutes[]`. Pass legs down to the map as a prop instead of re-fetching.
2. Pass `drivesMin: legMinutes ?? []` into both `summarizeDay(...)` calls that feed `remainingMinutes` and `dwellHours` on `SignaturePriceCard`.
3. While loading legs, show the price card's minutes gauge in a quiet skeleton state (no number flash) — never a fake number.
4. Update the gauge caption from "X min free" to **"X min of driving + stops still fits your day"** so the user sees that driving is included. Change the tooltip label from "free minutes on the base day" to "day time not yet spent (stops + driving)".
5. Extend `src/components/studio-v3/__tests__/add-on-microinteractions.test.tsx` (or add a sibling) with a case that stubs `legMinutes = [40, 25, 30]` and asserts `remainingMin` drops by 95 vs the current (drives=0) baseline.

**Out of scope for Part 1:** changing `summarizeDay` itself, feasibility rules, or the region cap constants.

---

## Part 2 — Make the reveal beat feel earned

Keep the approved section order and copy. Two tiny tightenings:

1. **One eyebrow, one price, one CTA.** Audit `StoryboardHandoff` (~L2520–3200) for any duplicated price line, duplicated "from" label, or second gold rule between the price eyebrow and Say YES. Remove duplicates only — no rewrites.
2. **Rhythm lock.** Confirm the spacing hierarchy is title (mt-4) → sub (mt-4) → price eyebrow (mt-5) → gold rule (mt-6) → YES Approved chip (mt-5) → primary CTA. If any token drifted, restore it. No new motion, no new copy.

---

## Part 3 — Reconnect the add-ons to the day

With Part 1 landed, the gauge tells the truth. Then:

1. Above the add-on list, add one quiet Inter caption (11.5px, charcoal 60%): **"Your day currently runs ~{totalHours}h — {remainingMin} min still comfortably fits."** Reads from the same `summarizeDay` result — no new source of truth.
2. When an add-on would push `remainingMin < 0`, keep the current disabled state but change the helper from generic copy to **"Adds {n} min — would push past your day's rhythm."** (uses the add-on's own minutes, already in `signatureAddOns`).
3. No new add-ons, no new categories, no reorder.

---

## Part 4 — Thicken the drawer summary (no new fields)

`BrandedCheckoutDrawer` already receives tour, guests, date, price. Right now it reads as a receipt. Small edits inside the existing summary block:

1. Add a two-line "Your day" strip under the tour title: **"{stopCount} moments · ~{totalHours}h on the ground · {region}"** — pulled from the same `summarizeDay` + `skeletonTour` the reveal uses. One line, Inter 12px, charcoal 70%.
2. If add-ons are selected, list them as a compact `• Add-on name — €X` block above the total. If none, omit the block entirely (no "No add-ons" empty state).
3. Keep total, guests, date exactly as they are — the pricing alignment from the previous turn stays.

---

## Part 5 — Guest / date / tier friction

Only the friction the user actually feels on mobile. No control redesign.

1. **Guests stepper:** confirm the `−` / `+` hit targets are ≥44×44 and the number doesn't reflow the row when it changes from 1 → 10 (fixed-width numeric slot).
2. **Date:** on mobile, if `dateExact` is empty, the Say YES CTA today allows advance and the drawer asks for date. Instead, keep Say YES enabled but show a single inline caption under it: *"You'll pick your date in the next step."* Removes the ambiguity users hit.
3. **Tier chips:** if two tier chips are visible near the CTA and the price eyebrow, keep the chips but suppress the price restatement inside the chip row (price already lives in the eyebrow). One number, one place.

---

## Verification

- `bunx tsgo --noEmit`, `bun run lint`, `bun run build` — all green.
- New/updated vitest: driving-time-in-budget test from Part 1.
- Playwright on mobile (393×852): reveal → Say YES → drawer. Screenshot the price + "Your day" strip on both surfaces. Confirm add-on gauge shrinks when a stop with a real drive leg is included.

## Deliverable

Typecheck / lint / build status, the Playwright screenshot pair (reveal + drawer showing matching price and honest minutes), and a short diff summary per part. Nothing outside the five parts above.
