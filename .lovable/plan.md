# Studio Post-Builder Flow Correction — Revised Plan v2 (re-issued)

Same north star: add a **Final Signature Day** climax between refinement and guest details, fix broken mobile cards, remove the sparse ConfirmationPause. No changes to Stripe, pricing math, or route/feasibility engine. Incorporates all 12 corrections.

The seven points you just called out are all locked in below (guestDraft, back navigation, mobile @ 393px, Playwright, progressive reveal, full ConfirmationPause removal, live-state-only on final screen).

---

## 1. Split route vs. timeline (§1, §2, §7)

Pure module `src/components/studio-v3/finalItinerary.ts`:

```ts
type AddOnPlacementType = "overlay" | "physical";

interface RouteStop {                    // map + driving math only
  id: string; label: string;
  lat: number; lng: number;              // required, validated
  source: "signature" | "physical-addon-validated";
}

interface TimelineEntry {                // editorial timeline only
  id: string;                            // stable: `stop:${key}` | `addon:${addOnId}`
  kind: "stop" | "overlay-addon" | "physical-addon-validated" | "physical-addon-pending";
  title: string; blurb?: string;
  slot: "morning" | "midday" | "afternoon" | "closing";
  anchorStopId?: string;
  durationMin?: number;
  isPending?: boolean;
}
```

- `routeStops` = refined signature stops ∪ physical add-ons whose coords are present AND already accepted by existing feasibility output. Map filter is explicit `Number.isFinite(lat) && Number.isFinite(lng)`.
- `finalTimelineEntries` = real stops + overlay add-ons (slotted/anchored) + validated physical + pending physical (flagged).
- Overlay never touches `routeStops` and never invents coordinates.
- Unvalidated physical → excluded from `routeStops`, shown in timeline as pending, listed under "To be confirmed with your designer" (§5). Never contributes driving time.

Add `placement: AddOnPlacementType` to `SignatureAddOn` in `src/data/signatureAddOns.ts` (default `"overlay"`, explicit `"physical"` where applicable). No price change.

### `mergeAddOnsIntoStops` — idempotent (§7)
Pure, non-mutating; stable ids; preserves real stop order and selection order; `anchorStopId` beats `slot`; missing anchor falls back to slot; missing slot appends. Rerun on already-merged input returns structurally-equal output.

Tests (`finalItinerary.test.ts`): idempotence; missing anchor fallback; multiple add-ons in same slot; overlay without coords; validated physical with coords; pending physical.

## 2. Canonical duration + price (§3, §4)

**Duration:** new selector `selectFinalDurationMinutes(state)` composed from the existing pieces the reveal already uses (refined experience minutes + validated route driving minutes + Σ confirmed overlay `durationMin` + existing operational buffer). Pending durations are shown as a separate "+ pending" line, never silently summed. `FinalSignatureDay` does **not** compute duration independently.

**Price:** consumed via the same selectors that feed `SignaturePriceCard` and `createSignatureCheckout`. Line items use existing `addOnEurFor({ addOn, baseEur, guests, vehicleCapacity })`. `per_group` and `fixed` never multiplied by guests. Each line shows its unit label ("per guest" / "per group" / "per vehicle" / "flat").

Invariant test `src/lib/checkout/__tests__/final-signature-total.test.ts`: mixed per_person + per_group + fixed cart — Σ displayed line amounts === checkout total.

## 3. Phase rename + migration (§6)

- `StudioV3Phase`: `"confirmation"` → `"finalSignature"` (types.ts, PHASE_ORDER, LINEAR_ORDER in curation.ts).
- Migration in every hydration path:
  ```ts
  const migrated = raw.phase === "confirmation" ? "finalSignature" : raw.phase;
  const phase = PHASE_ORDER.includes(migrated) ? migrated : "storyboard";
  ```
- Test added to `phase-7d-hydration.test.ts`: `"confirmation"` restores as `"finalSignature"`; unknown phase falls back to `"storyboard"`.

## 4. `FinalSignatureDay` (§5, §10, §12) — live state only

`src/components/studio-v3/FinalSignatureDay.tsx`. Every value re-derived from current `state.editedRoutePoints`, `state.addOns`, `state.guests`, `state.date`, `state.pickup`, `state.language`, `state.proposal`. No reveal snapshot fallback anywhere.

Sections:
- **A. Header** — eyebrow "Your final design", Signature name, region, date, guests, canonical duration (with pending line if any), per-guest + total price (live). One editorial sentence from resolved region + top intentions.
- **B. Day at a glance** — reuse `DayAtGlance` over `finalTimelineEntries` grouped by slot.
- **C. Final route** — reuse `StudioV3SignatureMap` fed **only `routeStops`**. Below: driving time + distance + experience duration + pickup + return from live route result.
- **D. Timeline** — reuse `TimelineView` extended to `TimelineEntry[]`; "Addition" chip on overlay/validated-physical, "Pending" chip on pending-physical.
- **E. Designed around you** — `DesignedForYou` fed only guest-facing tokens (no raw DB keys).
- **F. Why this day works** — `WhyRouteWorks`, max 3 points from actual final stop set.
- **G. Inclusions** — three groups: `INCLUSION_HEADER` (existing) / "Your selected additions" (with per-unit prices) / **"To be confirmed with your designer"** (rendered only when non-empty). Never "Everything included".
- **H. Price summary** — transparent breakdown from existing pricing selectors, each line shows its unit label.
- **I. Reassurance** — `ReassuranceStrip`, max 3 (Private guide · Private transport · **Final designer review included**) + one line: "Availability and operational details are confirmed before your day." No "YES Approved" / "Confirmed availability" unless a real status flag exists.
- **J. Actions** — primary `Continue to guest details`; secondary `Back to refine my day`; tertiary `Save this Signature` (only when existing save affordance is wired).

**Mobile hierarchy @ 393px (§10):** No forced above-the-fold. Order: Signature name → one-line description → price + guests → route status → map → primary CTA. CTA becomes sticky-bottom on mobile after the header scrolls past — reachable without compressing content.

## 5. Reveal repositioning + progressive disclosure

- `SignatureDayReveal`/`StoryboardHandoff`: primary CTA becomes **"See my final Signature"**. Reservation CTA removed from reveal.
- Above the fold: Signature name, one-line description, price + guests, route status, map, primary CTA. Behind `<details>`: full transit breakdown, all DNA tags, long inclusions, price comparisons. Add-ons stay in refine.
- New copy tokens in `signature-day-copy.ts`:
  `CTA_SEE_FINAL`, `CTA_CONTINUE_TO_DETAILS`, `CTA_BACK_TO_REFINE`, `INCLUSION_PENDING_HEADER = "To be confirmed with your designer"`, `STATUS_ROUTE_PREPARED = "Route prepared — pending final availability"`.

## 6. ConfirmationPause — full removal from the chain

- Deleted from `PHASE_ORDER` and `LINEAR_ORDER`.
- Render branch + import removed from `StudioV3.tsx`.
- No route or component references it after this change (grep-verified before shipping).
- File `ConfirmationPause.tsx` left on disk this turn only to avoid touching its own test file; removed in an immediate follow-up commit once tests are updated.

## 7. Guest details + draft persistence (§11)

`GuestDetailsStep.tsx`:
- Header **"A few details for your Signature Day"**.
- Small collapsed live summary strip: Signature name · date · guests · total · selected additions.
- Local form state stays local for keystroke performance. Sync to `state.guestDraft` on `onBlur` and via 400ms trailing debounce during typing.
- On mount, hydrate the local form from `state.guestDraft` when present.
- Back button routes to `finalSignature` and preserves both refine edits (already in reducer) and typed guest fields (via `guestDraft`).
- `guestDraft` = `{ name?, email?, phone?, notes? }` only. No payment/card fields.
- Refinements (stop reorder, add-on toggle) never wipe `guestDraft`. Changing `state.guests` re-validates only the guest-count-dependent field.

## 8. Back navigation

- `back()` from `finalSignature` → `storyboard` with all refinement edits intact (reducer already keeps state).
- `back()` from `guestDetails` → `finalSignature`; on returning to `guestDetails`, form rehydrates from `guestDraft`.
- `advance()`/`back()` logic unchanged beyond the phase enum swap; existing `PHASE_ORDER` guards still gate transitions.

## 9. Mobile cards @ 393px (§8, §9)

**RefineStopCard.tsx** — 3-row layout already in place. Fixes:
- Toolbar labels: visible short text **at every width < 640px** (`Up · Down · Replace · Remove`). Remove the current `hidden sm:inline` rule that hides labels below 360px only. At `sm+`, icon-only allowed with existing `aria-label`, `title`, 44×44 hit area.
- Description row remains full-width Row 2, never shares a row with actions.

**Add-on card** (`RefineAccordion.tsx` add-ons block) — stacked mobile layout:
- L1 title / L2 full-width description / L3 duration · price / L4 full-width toggle **"Add to my day" / "Added ✓" / "Remove"**. No floating overlay chips.

**Test split (§9):**
- **RTL (vitest/jsdom):** structure, aria-labels, ordering, copy contract, phase migration, mergeAddOns idempotence, pricing invariants.
- **Playwright** — new `e2e/studio-v3-final-signature-mobile.spec.ts` at `viewport: { width: 393, height: 852 }` (reuses existing Playwright config). Asserts:
  - no horizontal overflow on Refine + FinalSignature + GuestDetails,
  - refine description bounding-box width ≥ ~260px,
  - toolbar controls never intersect description bounding box,
  - every action button ≥ 44×44,
  - add-on cards render stacked (title/desc/meta/CTA on separate y-rows),
  - primary CTA on FinalSignature reachable (in viewport or sticky),
  - GuestDetails not in DOM until Continue is pressed on FinalSignature.

## 10. State summary (`types.ts`)

- `guestDraft?: { name?: string; email?: string; phone?: string; notes?: string }` — no payment data.
- `addOns: SelectedAddOn[]` — confirm carries add-on id + selection order.
- `SignatureAddOn` extended with `placement: AddOnPlacementType`.

## 11. Files touched

New:
- `src/components/studio-v3/FinalSignatureDay.tsx`
- `src/components/studio-v3/finalItinerary.ts` (+ `finalItinerary.test.ts`)
- `e2e/studio-v3-final-signature-mobile.spec.ts`
- `src/lib/checkout/__tests__/final-signature-total.test.ts`

Edited:
- `StudioV3.tsx`, `types.ts`, `curation.ts`, `signature-day-copy.ts`, `signatureAddOns.ts`, `RefineStopCard.tsx`, `RefineAccordion.tsx`, `SignatureDayReveal.tsx`, `GuestDetailsStep.tsx`, `TimelineView.tsx`, `__tests__/phase-7d-hydration.test.ts`, `__tests__/reveal-section-order.test.ts`, `src/__tests__/signature-section-contract.test.ts`.

Removed from render chain (file deleted in follow-up): `ConfirmationPause.tsx`.

## 12. Out of scope

Stripe/checkout, pricing math, route/feasibility engine, Studio questionnaire, brand system, main nav, production data.

---

Approve to proceed.
