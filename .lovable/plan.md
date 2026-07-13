## Goal

Restore the four-screen Studio journey the user expects:

```text
Signature (skeleton)  →  Refine  →  Storytelling  →  Checkout
```

Right now the `storyboard` phase collapses "Signature + Refine + Price + Add-ons" into a single scroll that opens with a hero + "See my signature story" CTA. On mobile (393px) the Refine controls sit far below the fold, so guests never see Remove / Swap and go straight to the storytelling reveal — exactly what the user reported ("using it as a reveal, not a skeleton").

## What changes

### 1. Split `storyboard` into two clear surfaces

Keep the existing phases but change what each renders on screen. The phase order stays: `…map → storyboard → confirmation → guestDetails → checkoutSummary`.

- **`storyboard` = Signature (skeleton) + Refine.** Above-the-fold: eyebrow "Your Signature — draft", tour title, one-line origin, small map. Immediately below (no scroll needed to discover): the **Refine the moments** list with Remove (✕) and Swap (⇄) actions per stop — the same controls already implemented in `StudioV3.tsx` lines 3929–4094. Price card + add-ons stay on this screen but move **below** Refine. Primary CTA changes from "See my signature story" → **"Continue to your story"**.
- **`confirmation` = Storytelling only.** Unchanged — `FinalRevealStory` renders the cinematic day. CTA "Continue" → `guestDetails`.
- **`guestDetails` → `checkoutSummary` → Stripe.** Unchanged.

### 2. Make Refine impossible to miss

- Move the "Refine the moments" block from mid-card to directly under the hero, before the price card.
- Header copy: "This is your draft. Remove what doesn't fit, swap for another moment in the same region."
- Each stop row keeps the existing icon cluster (↑ ↓ ⇄ ✕). No new controls.
- When `editedStops.length === 0` (defensive), render a compact "We couldn't compose a draft — start over" state instead of silently hiding the whole editor. (Today the whole `Refine` block is gated on `editedStops.length > 0`, so an empty resolve makes it vanish — that matches the "reveal, no refine" symptom.)

### 3. CTA + copy sweep on `storyboard`

- Primary CTA label: **Continue to your story** (was "See my signature story").
- Eyebrow: **— Your Signature · draft** (was "— Your Signature").
- Hero subtitle framed as a starting point, not a verdict ("A day shaped around … — refine it below before we tell the story.").

### 4. Guardrails preserved

- No new tours, stops or invented content. Swap pool stays limited to `skeletonTour.stops` + approved `REGION_STOP_POOL` same-region candidates (existing `swapPool` memo, line 3333).
- Add-ons remain same-region only, unchanged wiring.
- No changes to pricing, quote, or checkout backend. Payments flow (guest details → Stripe) is untouched.

## Files touched

- `src/components/studio-v3/StudioV3.tsx`
  - Reorder the `storyboard` render tree: hero → Refine block → price card + add-ons → CTA.
  - Update CTA label and hero eyebrow/subtitle strings.
  - Add empty-state for `editedStops.length === 0`.
- `src/components/studio-v3/SignaturePriceCard.tsx`
  - Change the "See my signature story" button text to "Continue to your story" (mobile + desktop button, lines ~998 and ~1069).

No route, phase-order, curation, or pricing logic changes.

## Verification

- Manual mobile check at 393×588: after the Studio questions, first screen shows Signature title + Refine list with ✕ and ⇄ visible without scrolling past the fold.
- Existing e2e suites (`studio-v3-p0-storytelling-reveal-mobile`, `studio-v3-reveal-walkthrough`, `studio-v3-your-additions-visual`) still target `data-studio-v3-screen="refine"` and `data-testid="studio-v3-stops-editor"` — both preserved.
- Typecheck.
