
## What's happening

In your screenshot, the Studio draft collapses into a dead end:
- "We couldn't compose a draft for this combination…" (no way to adjust)
- "Price shaped with you" bespoke card (no add‑ons, only "Request the investment")

Reason (in `src/components/studio-v3/StudioV3.tsx`):

`baseStops` runs `filterStopsBySuitability` + `validateItineraryAfterReplacement`. When validation isn't `null`, it returns `[]`. Then:
1. The Refine editor is gated on `editedStops.length > 0`, so all Remove / Swap / Add controls disappear.
2. `SignaturePriceCard` receives `stopCount = 0` → `hasPrice = false` → bespoke branch renders, and add‑ons are hidden by `showAddOns && hasPrice && availableAddOns.length > 0`.

So even when the swap pool has valid moments AND the tour has priced add‑ons, the user is shown a locked "adjust earlier answers" screen. That's the bug.

## Fix

Recover gracefully instead of collapsing. When base composition fails but the skeleton tour + swap pool exist, offer the user an editable starting point and keep add‑ons available.

### 1. Never surface an empty editor without an escape hatch
File: `src/components/studio-v3/StudioV3.tsx`

- Introduce `hasSkeletonFallback = !!skeletonTour && swapPool.length > 0`.
- Replace the current empty branch (~line 4173–4188) with a **recoverable** empty state that renders inside the editor container:
  - Keeps the "— Refine your Signature" eyebrow.
  - Short line: "We softened the draft for your answers. Add the moments that call you — you're still in control."
  - Primary action: "Add a moment" (opens the existing `swapPool` picker, same UI already used at line 4100).
  - Secondary link: "Adjust earlier answers" → `onBack`.
- Keep the true dead end (no skeleton AND no swap pool) as today's copy, since nothing can be added.

### 2. Seed a minimal editable draft when composition returns empty
File: `src/components/studio-v3/StudioV3.tsx`, `baseStops` memo (~line 3236–3254).

Currently `validateItineraryAfterReplacement` failure returns `[]`. Change to:
- Prefer the filtered `outcome.stops` when it has ≥1 stop, even if `validateItineraryAfterReplacement` flags "thin" — the user can complete it themselves via the swap pool.
- Only return `[]` when there is literally nothing safe to show (no skeleton stops at all).

This keeps composition conservative (we still don't auto‑publish a thin day) while giving the user something to shape.

### 3. Keep add‑ons visible on recovered drafts
File: `src/components/studio-v3/SignaturePriceCard.tsx` (~line 645).

Relax the add‑ons gate to `showAddOns && availableAddOns.length > 0 && (hasPrice || allowAddOnsWithoutPrice)`. Pass a new `allowAddOnsWithoutPrice` prop from `StudioV3` when `skeletonTour` exists, so add‑ons render even in bespoke mode. The add‑ons still price per tour's real catalog; only the base line stays "Price shaped with you".

If we don't want a new prop, alternative: derive `hasPrice` from `skeletonTour && (priceFrom || tier)` so a valid tour with `priceFrom` no longer falls into bespoke — which also restores add‑ons.

### 4. Guardrails
- No invented stops, no invented prices — swap pool already draws only from the same Signature skeleton / region pool.
- Studio philosophy check: still guided, restraint intact, no configurator vibe — we're just not slamming the door on a recoverable state.
- Mobile‑first: reuses existing 393px editor + add‑ons layout; no new components.

## Files touched

- `src/components/studio-v3/StudioV3.tsx` — recoverable empty state, `baseStops` fallback, prop wiring.
- `src/components/studio-v3/SignaturePriceCard.tsx` — add‑ons gate.

## Out of scope

- Rewriting `resolveStudioV3Route` composition logic.
- Any change to Signature source of truth, pricing tiers, or Viator data.

Ready to implement on approval.
