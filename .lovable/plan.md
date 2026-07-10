## Post-builder journey redesign — Revised plan (v2)

Reuses everything from v1 (Presentation → Story → Refinement → Confirmation → Guest Details → Checkout, no visual identity changes, tone-only narrative, no invented stops). This revision adds the operational, mobile-UX and pricing corrections you asked for.

---

### A · Base itinerary validation logic (NEW — runs before "YES Approved")

New module: `src/lib/studio-v3/itinerary-validation.ts` — pure function, deterministic, no AI. Consumes the same data the reveal already fetches:

- `editedStops` (labels + geo from `stopCoords`/`lookupStopGeo`)
- Real OSRM per-leg minutes + km + travel mode from `useRouteLegMinutes`
- `DWELL_MINIMUM_MIN` and `DAY_CAPS` from existing `src/lib/feasibility.ts`
- `STOP_OPERATIONAL_RULES` + `isStopClosedOn` from `stopOperational.ts`
- `REGION_RULES[regionKey]` (already exists in `src/data/regionRules.ts`) — kindCaps, `maxDriveMinutes`, `maxHopMinutes`, `dayLengthMinutes`, `minStops`, `maxStops`
- Traffic/parking buffer: `DAY_CAPS.driveBufferMinutes` (already 10 min per drive segment)
- Pickup + return legs re-computed (currently only inter-stop legs are validated)

Returns:

```ts
type ItineraryValidation = {
  status: "approved" | "review" | "reject";
  metrics: {
    totalMinutes; totalKm; drivingMinutes; drivingPct;
    experienceMinutes; longestHopMinutes; backtrackScore;
  };
  failures: Array<{
    code: "exceeds-driving-cap" | "exceeds-driving-pct"
        | "exceeds-day-envelope" | "hop-too-long"
        | "stop-closed-on-date" | "stop-below-dwell-minimum"
        | "kind-cap-exceeded" | "backtrack-detected"
        | "pickup-return-unresolved" | "capacity-exceeded"
        | "mobility-conflict" | "age-conflict"
        | "seasonal-unavailable";
    stopId?: string; detail: string;
  }>;
  suggestions: Array<
    | { kind: "drop-least-coherent"; stopId }
    | { kind: "swap-with-closer"; stopId; candidateLabel }
    | { kind: "reduce-scope"; toStops: number }
    | { kind: "extend-duration"; toHours: number }
    | { kind: "reclassify-multiday" }>;
};
```

### B · Explicit thresholds (locked in a single `itinerary-thresholds.ts`)

```
MAX_DRIVING_MIN_ABS       = REGION_RULES[region].maxDriveMinutes (150–180)
MAX_DRIVING_PCT_OF_DAY    = 40%   // hard cap
PREFERRED_DRIVING_PCT     = 30%   // warn above
MAX_HOP_MIN               = REGION_RULES[region].maxHopMinutes (50–70)
MAX_DAY_MIN               = REGION_RULES[region].dayLengthMinutes.far
MIN_DWELL_MIN[category]   = DWELL_MINIMUM_MIN (existing)
MAX_DAY_KM                = 260 (Lisbon-belt) / 340 (Alentejo, Centro)
BACKTRACK_TOLERANCE       = 15% of total km (any leg whose direction dot-product with route bearing < 0 counts)
PICKUP_RETURN_BUFFER_MIN  = 20
```

Any breach → `status = "review"` (or `"reject"` for hard failures like capacity/closed). "YES Approved" is only granted when `status === "approved"`.

### C · Full-route add-on insertion calculation

Replaces the v1 haversine + bearing filter. New function `evaluateAddOnInsertion(addOn, baseRoute, thresholds)`:

1. Build `baseStops = [pickup, ...editedStops, return]`, request OSRM legs via existing `getStudioV3RouteLegs` server fn — already cached in `builder_route_cache`.
2. For each candidate position `i` (best position picked by minimum insertion cost), build `candidateStops` with add-on inserted, request OSRM legs (cached), compute Δminutes + Δkm.
3. Re-run itinerary-validation on the candidate route.
4. Accept only if ALL:
   - `deltaDrivingMin ≤ 20` (preferred) → shown as normal recommendation
   - `deltaDrivingMin ≤ 30` AND `addOn.narrativeScore ≥ 0.75` → shown, badged `"Small detour — worth it"`
   - candidate route still `status === "approved"`
   - no closed-day / capacity / mobility conflict introduced
   - `regionBucket` + Lisbon `lisbonSubRegion` match (kept from v1)
5. Reject silently otherwise. Render zero add-ons when none pass — never fill by time budget.

Each surfaced candidate carries `whyLine` (curator voice) AND a factual `impactLine` such as `"Adds 14 min driving · fits between lunch and return."` Both come from real deltas, no invented copy.

Extra OSRM calls per reveal: capped at `min(5, availableCandidates)`; results memoised by `(baseRouteKey, addOnId, insertionIdx)`. Uses existing react-query dedupe + `builder_route_cache` — no schema changes.

### D · Mobile stop-card wireframe (Refinement section)

Current: 393px card has `[#][title—text][icon][icon][icon][icon]` on one row → description column collapses.

Revised layout (`RefineStopCard.tsx`, replaces the current inline row inside `SignatureDayReveal`):

```
┌───────────────────────────────────────────────┐
│ (1)  Cabo da Roca — the western edge          │  ← Row 1: number + full title (Fraunces 15px)
│                                               │
│  Where the mainland ends and the Atlantic     │  ← Row 2: full-width paragraph (Inter 14px/1.6,
│  takes over. A short cliff walk, ten          │        min content width ≥ 260px @ 393vp,
│  minutes to feel the wind, no hurry.          │        max 3 lines then "Read more" disclosure)
│                                               │
│  ─── Actions ───────────────────────────      │  ← Row 3: 44×44 icon toolbar, left-aligned
│  [↑ Earlier] [↓ Later] [⇄ Swap] [✕ Remove]    │        (labels visible sm+; icon-only <sm
│                                               │          with aria-label + long-press tooltip)
└───────────────────────────────────────────────┘
```

Rules:
- Grid: single column always. No side-by-side text/actions.
- Each action button: `min-h-[44px] min-w-[44px]`, `aria-label`, `title` for tooltip, disabled state greys icon + adds `aria-disabled="true"` + removes focus ring cycle (`tabindex="-1"`), tap-scale suppressed on disabled.
- Disabled cases codified: Earlier (index 0), Later (index last), Swap (empty `swapPool`), Remove (stops === minStops).
- Description clamp: `line-clamp-3` with disclosure button `"Read more"` (Inter 11.5px, gold arrow) that expands in place — no route change.

### E · Editorial page length control (progressive disclosure)

Approx 4–6 mobile viewport heights until the first primary continuation CTA `Continue with my Signature Day`. Enforced by section ordering + `<details>`-style disclosures. Above the CTA (essential):

1. Opening whisper (single line)
2. Hero (image + title + meta strip)
3. Day at a glance (chips)
4. Story of your day (3 short chapters, ≤3 lines each; "Read the full story" expands the rest)
5. The map, retold (Rhythm Ribbon on top; `Show driving details` toggle collapses OSRM km/min table)
6. Curated additions (max 3 cards, `"See more options"` disclosure below)
7. Investment (see F)
8. Primary CTA `Continue with my Signature Day`

Collapsed by default (below the fold, still on the same phase, or moved to the Confirmation Pause screen):

- Full inclusion list (`"See what's included"` expander)
- Why this route works (4 bullets — kept visible but tight)
- Designed for you (3 curator notes — kept visible)
- Refinement / stop editor (`"Adjust the moments"` accordion, collapsed by default; auto-opens if user taps a stop chip)
- Full driving details table
- Reassurance strip (moves to Confirmation Pause)

A telemetry event `presentation_cta_within_viewports` records how many 100vh scrolls until the CTA becomes visible; asserted in an e2e budget test (target ≤ 6 at 393×588).

### F · Pricing hierarchy (single unambiguous ladder)

`SignaturePriceCard` restructured (props only, still one component). Order top → bottom:

```
YOUR SIGNATURE DAY
€1,077 total                            ← largest, 28px Fraunces bold
3 guests · €359 per guest               ← 14px Inter, muted

SELECTED ADDITIONS
+ Chapel of Bones      +€40 per guest   ← unit label ALWAYS shown
+ Winery visit         +€120 per group

FINAL ESTIMATED TOTAL
€1,317                                  ← 22px Fraunces bold, teal underline

Included in your selected itinerary
- Private guide, private transport, all listed stops,
  entrance fees to listed sites, lunch as described

Optional additions are priced separately and shown before checkout.

—————————————————————————
Group savings (visually secondary, muted, smaller card)
6 guests · €239 per guest
```

Add-on data contract expanded (`src/data/signatureAddOns.ts`):

```ts
type AddOnPricingUnit = "per_person" | "per_group" | "per_vehicle" | "fixed";
interface SignatureAddOn {
  ...existing...
  pricingUnit: AddOnPricingUnit;   // NEW — required
}
```

All 13 existing add-ons get `pricingUnit` filled in from the source Signature's real pricing rule. `addOnEurFromBase` becomes `addOnEurFor({addOn, base, guests})` returning `{amount, unit, unitLabel}` so both the card and the checkout use the same math.

Group-savings block visually smaller (13px), ivory background, no gold ornament, positioned below Final Total with a divider. Never larger than the current-total figure.

### G · Accurate inclusion terminology

Global copy sweep in `signature-day-copy.ts`:

- Remove all uses of "Everything included" and "All entrances included" from the Studio reveal path.
- Replace with:
  - Card header: `"Included in your selected itinerary"`
  - Footnote: `"Optional additions are priced separately and shown before checkout."`
- `SignaturePriceCard` renders whichever is true right now — recomputed from `resolveClientIncludedItems(meta, tour)` + current `selectedAddOnIds`.
- Truth invariant test added to `src/lib/checkout/__tests__/inclusions.test.ts` (already gated in CI): `inclusion list ∪ selected add-ons === Stripe line items === checkout payload`. If any drift, test fails, deploy blocked.

### H · "YES Approved" state machine

```
        ┌────────────────┐
        │  route resolved │
        └───────┬────────┘
                ▼
        run itinerary-validation
                ▼
  ┌─────────────┼─────────────┬─────────────────┐
  │             │             │                 │
approved     review        reject          incomplete
  │             │             │                 │
YES APPROVED "Route being  Fallback screen  "Preliminary
 (gold check)  reviewed"    + suggestion(s)   itinerary"
              (teal dot)    from validation   (muted)
              — no gold      applied
              badge
```

Required checks (all evaluated for "approved"): geographic coherence (backtrack score < tolerance), realistic duration, driving thresholds (§B), opening hours (STOP_OPERATIONAL_RULES + date), route direction (bearing dot-product), visit timing (dwell minimums), date-based closures, guest count ≤ tour capacity, mobility (state.considerations includes `mobility` → require step-free stops via new `stop.mobilityFriendly` flag), children (state.considerations includes `children` → require `stop.childFriendly`), seasonal availability (new `stop.seasonalWindow` where relevant, e.g. Arrábida boats), add-on compatibility (evaluated per §C).

Fields added (data-only, additive) to `regionStops.ts` stop rows: `capacityMax?`, `mobilityFriendly?`, `childFriendly?`, `seasonalWindow?: { fromMonth; toMonth }`. Unpopulated ⇒ skipped (no false negatives).

Badge component `<ApprovalBadge state={validationStatus} />` — three visual states already defined via existing tokens (gold check / teal dot / muted italic). Never shows "YES Approved" when state ≠ approved.

Auto-remediation: when `status === "review"`, the reveal offers a one-tap `"Rebalance this day"` action that applies the top suggestion (drop least coherent → swap closer → reduce scope). Never auto-triggers; user opt-in only.

### I · Guest Details step (reinforced)

- New route-less phase inside StudioV3 (`state.phase === "guest-details"`).
- Rendered inside `PhaseShell` (same surface as other phases) — not a `Dialog`, not a `Sheet`. `FinalDetailsDialog` stays only for legacy /tours flows.
- Header: eyebrow `— Step 6 of 7`, H1 `Your details`, back link `← Return to your Signature (edits kept)`.
- All Studio state persists (React state + `saveStudioV3Signature` snapshot on entry).
- Form state lives in a local `useReducer`; `Back` from confirmation restores it (kept in Studio state under `state.guestDetailsDraft`, never sent to Stripe until submit).
- Sticky footer band: safe-area-aware (`pb-[env(safe-area-inset-bottom)]`), sits above the virtual keyboard using `visualViewport` listener that shifts the band up while the keyboard is open. Never covers the currently-focused input.
- CTA `Continue to secure checkout` disabled until validators pass: `fullName`, `email` (regex), `phone` (E.164 loose), `tourDate` (ISO + not past + Bókun slot selected when tourId maps to Bókun product), `guests ≥ 1`, `pickupAddress`, `language`.
- Only on valid submit → `handleStripeCheckout(state, details)` → `BrandedCheckoutDrawer`.

### J · Updated component list

Added:
- `src/lib/studio-v3/itinerary-validation.ts` + `itinerary-thresholds.ts`
- `src/lib/studio-v3/addon-insertion.ts` (full-route eval)
- `src/components/studio-v3/ApprovalBadge.tsx`
- `src/components/studio-v3/RefineStopCard.tsx` (mobile-safe)
- `src/components/studio-v3/SignatureDayReveal.tsx` (extracted from StoryboardHandoff)
- `src/components/studio-v3/DayAtGlance.tsx`
- `src/components/studio-v3/RhythmRibbon.tsx`
- `src/components/studio-v3/WhyRouteWorks.tsx`
- `src/components/studio-v3/DesignedForYou.tsx`
- `src/components/studio-v3/CuratedAdditions.tsx`
- `src/components/studio-v3/ReassuranceStrip.tsx`
- `src/components/studio-v3/ConfirmationPause.tsx`
- `src/components/studio-v3/GuestDetailsStep.tsx`
- `src/content/signature-day-copy.ts`

Modified (props/data, no restyle):
- `signatureAddOns.ts` — `pricingUnit` field + `addOnEurFor` helper
- `regionStops.ts` — optional `capacityMax`, `mobilityFriendly`, `childFriendly`, `seasonalWindow`
- `SignaturePriceCard.tsx` — hierarchy per §F, unit-aware totals
- `StudioV3.tsx` — `PHASE_ORDER` gains `confirmation`, `guest-details`; stops mounting `FinalDetailsDialog` from Studio path
- `curation.ts` — `explainCurationDecisions()` helper

Retired from the Studio reveal surface (kept for other routes):
- Existing inline stop editor row layout
- Current footer CTA stack (`Say YES` + `Save` + `Refine` + WhatsApp) — replaced by ConfirmationPause
- Daypart timeline block (folded into RhythmRibbon)
- Modal `FinalDetailsDialog` invocation from Studio

### K · Implementation order

1. Data-only additions: `signatureAddOns.pricingUnit`, stop metadata fields, thresholds file. Existing suites still green.
2. `itinerary-validation.ts` + unit tests. Wire into a debug-only overlay first (no UI change yet).
3. `addon-insertion.ts` + unit tests. Replace `SmartRecommendation` selection with new pipeline behind a feature flag (`?addonV2=1`) initially; flip default once green.
4. `SignaturePriceCard` hierarchy + unit-aware totals; expand `inclusions.test.ts` to cover unit types.
5. Extract `SignatureDayReveal` from `StoryboardHandoff` (pure refactor); snapshot tests must stay green.
6. New editorial sections (Day at a Glance, Rhythm Ribbon, Why Route Works, Designed for You, Reassurance) — content only.
7. `RefineStopCard` mobile-safe layout; move refinement into an accordion.
8. Progressive-disclosure budgeting; new e2e `presentation-cta-viewport-budget.spec.ts` asserts ≤ 6 viewports.
9. `ApprovalBadge` state machine wired to validation result; sweep out all remaining "Everything included" / premature "YES Approved" copy.
10. `ConfirmationPause` phase.
11. `GuestDetailsStep` phase + keyboard/safe-area handling; stop mounting `FinalDetailsDialog` in the Studio path.
12. Telemetry: `presentation_seen`, `confirmation_seen`, `guest_details_seen`, `addon_reason_shown`, `approval_state`, `rebalance_applied`.
13. Full mobile QA (393×588) + reduced-motion + a11y sweep + `bunx vitest run` on the gated suites + Playwright reveal walkthrough.

### L · Tests required before launch

Unit (Vitest):
- `itinerary-validation.test.ts` — table-driven cases per threshold (over-drive, hop-too-long, backtrack, closed-day, kind-cap, capacity, mobility, seasonal).
- `addon-insertion.test.ts` — accept ≤20 min, band 20–30 min gated by narrative score, reject >30, reject when candidate route fails validation, reject cross-sub-region.
- `approval-state.test.ts` — every failure code maps to the correct badge state; "YES Approved" is unreachable when any failure present.
- `pricing-units.test.ts` — per_person × N, per_group × 1, per_vehicle × ceil(N/vehicleCap), fixed × 1. Final total === sum of line items.
- `inclusions.test.ts` (extended, already CI-gated) — inclusion list ∪ selected add-ons === checkout payload === Stripe amount.
- `refine-stop-card-a11y.test.tsx` — each action has aria-label, disabled states, 44×44 hit area.
- `signature-day-copy.test.ts` — no legacy strings ("Everything included", "All entrances included", "Say YES to this Signature") in the reveal path.

E2E (Playwright):
- `studio-v3-presentation-viewport-budget.spec.ts` — primary CTA reachable ≤ 6 × 100vh at 393×588.
- `studio-v3-refine-stop-card-mobile.spec.ts` — description column ≥ 260px, no overlap with icons, disabled Earlier/Later at ends.
- `studio-v3-addon-insertion.spec.ts` — mock OSRM to force a candidate that adds 12 min (accept), 25 min (accept with badge), 45 min (reject).
- `studio-v3-approval-badge-states.spec.ts` — force each failure code, assert badge label.
- `studio-v3-guest-details-step.spec.ts` — inline (not modal), sticky CTA above virtual keyboard, back preserves form + itinerary, Stripe only opens after validation passes.
- `studio-v3-confirmation-pause.spec.ts` — pause screen renders between reveal and details; CTA `Continue with my Signature Day`.
- `studio-v3-price-hierarchy.spec.ts` — per-unit labels visible, final total = base + additions, group-savings never larger than final total.
- Existing gated suites (itinerary-edit-stability, signature-section-contract, reveal-section-order, inclusions) all still green.

CI: add the 4 new e2e specs + the new unit tests to `studio-checkout-gate.yml` so the same required check enforces validation + pricing + mobile card + inclusion truth on every PR.

---

### Explicit non-goals of this revision (unchanged from v1)

- No changes to `--teal`, `--gold`, `--ivory`, `--charcoal`, Fraunces, Inter, spacing tokens, buttons, or ornaments.
- No new tours, stops, add-ons, images, or fictional inclusions.
- No AI stop generation; AI = tone only.
- No changes to homepage, `/tours/*`, brand PDFs, or other routes.
- Portuguese translations of new strings follow after English is signed off.

Awaiting your approval before any code changes.
