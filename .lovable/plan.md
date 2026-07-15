# Clean Refine page — post-map decision surface

## Goal
Make the Refine screen (phase `storyboard`) a clear, 3-second-readable decision page: title, map, editable stops, add-ons, total. No cinematic decoration, no technical readouts, no ambient copy. The final cinematic story stays on `FinalRevealStory` (unchanged).

## Target layout (in order)

```text
[ Back ]

Your day is ready.
Now you can refine it.

┌───────────────────────────────┐
│           MAP                 │
│  (numbered legend below)      │
└───────────────────────────────┘

Your stops
· stop 1   [↑ ↓ ⇄ ✕]
· stop 2   [↑ ↓ ⇄ ✕]
· ...
[ + Add one more moment ]

Enhance your experience
◻ Name — short description        €00
◻ Name — short description        €00

Total                            €000
                        €00 per person

[  Continue  ]
[  Save my signature  ]
```

## Scope — Refine screen only (`data-studio-v3-screen="refine"` in `src/components/studio-v3/StudioV3.tsx`, ~line 3466–4200)

### Replace
- **Hero header** (`pt-10` block, ~3569–3638): eyebrow "— Your Signature", giant `heroLead` display headline, italic `heroSub`, hidden-desktop `heroOrigin`, price eyebrow `studio-v3-hero-price`, gold rule, `<ApprovalBadge>`.
- New header: single centered H2 "Your day is ready." + line "Now you can refine it." Using Fraunces per typography rules. No eyebrow, no rule, no badge.

### Keep (unchanged)
- `<BackLink />`
- Map block `studio-v3-reveal-map` + numbered legend (~3651–3703).
- Stops editor `studio-v3-stops-editor` (~3769–4030) — reorder / swap / remove / add-moment / "Edited by you · Reset" all preserved. Retitle heading from "— Refine the moments" to plain **"Your stops"** (no eyebrow dash, no uppercase tracking) and drop the helper "Reorder, swap or remove…" paragraph.

### Remove entirely from Refine
- **Daypart timeline** `studio-v3-daypart-timeline` (~3706–3737) — decorative.
- **Story of the day** `studio-v3-story-of-day` (~3741–3766) — belongs to final reveal only.
- **Signature DNA** chips `studio-v3-signature-dna` (~4034–4066) — decorative.
- **Shaping direction** italic line `studio-v3-shaping-direction` (~4069–4095) — decorative.
- **"Before you secure it"** block (~4174–4200 area): "Availability and final details…", `studio-v3-date-demoted`, inferred-guests note.
- The composing overlay Beat 2/3 copy stays as-is (it's a transient pre-render, not part of the resting page).

### Simplify `<SignaturePriceCard>` usage
The card currently carries: inclusions list, add-ons toggles with descriptions/prices, day-budget shimmer, "remaining minutes" microcopy, dwellHours, itinerary readout, guest stepper, secure CTA, etc. For Refine we need only **Add-ons + Total** from this card. Two options — pick in implementation:

1. **Preferred:** add a `variant="refine"` prop to `SignaturePriceCard` that renders only:
   - Section title "Enhance your experience"
   - Add-on rows: name · short description · price · toggle (existing toggle behaviour + reactivity already fixed in earlier turn)
   - Total row: `Total €Y` with `€X per person` subline (single source of truth already wired via `perPerson = round(total/totalGuests)`)
   - Primary CTA "Continue" + ghost "Save my signature"
   All of these already exist inside the card — the variant just hides the inclusions block, the day-budget/remaining-minutes shimmer, the drive/dwell/itinerary readouts, and the guest stepper.
2. Fallback if the card is too coupled: extract a small `<RefineAddOnsAndTotal>` component that consumes the same `useAddOns` hook + total math and render that on Refine, leaving `SignaturePriceCard` for other surfaces.

### Add-ons row contract
Each row is exactly: `name` · `short description` (one line, muted) · `€price` · `toggle`. Existing chip highlight + ≤180ms feedback preserved. No shimmer, no "free minutes remaining", no "adds ~X min" microcopy on Refine.

### Total row contract
`Total €Y` (large, tabular) with `€X per person` beneath (small, muted). Values come from the same `total` / `perPerson = round(total/totalGuests)` derivation established last turn — no static `priceFrom` or tier price anywhere on Refine.

## Debug / wifi audit
- No `wifi` / `connectivity` copy exists anywhere in Studio V3 — nothing to remove there.
- `StudioV3DebugOverlay` is already opt-in (`?debug=studio` / `Shift+D` / localStorage). It never renders for real users, so no change needed. Confirming as part of this pass rather than touching it.
- Removing the daypart timeline, remaining-minutes shimmer, dwellHours and itinerary readouts covers the "technical info / debug elements" the brief calls out.

## Files touched
- `src/components/studio-v3/StudioV3.tsx` — replace hero, delete 4 decorative sections, delete "Before you secure it", retitle stops editor, drop helper paragraph, pass `variant="refine"` (or swap in the fallback component) to `SignaturePriceCard`.
- `src/components/studio-v3/SignaturePriceCard.tsx` — add `variant?: "full" | "refine"` (default `"full"`) and gate inclusions / day-budget shimmer / remaining-minutes / dwellHours / itinerary readout / guest stepper behind `variant === "full"`. No pricing math changes.

## Out of scope
- `FinalRevealStory` (cinematic reveal after Refine) — untouched.
- Other Studio phases, other routes, backend, checkout.
- Pricing logic (already fixed in prior turns; this plan only relocates what's rendered).

## Verification
- Manual walkthrough on 393×588: page shows title → map → stops → add-ons → total → CTAs, nothing else, above and below the fold.
- Toggling any add-on updates Total and `€X per person` in the same frame (regression check on the reactivity fix).
- `data-studio-v3-screen="refine"` still present; existing e2e testids `studio-v3-reveal-map`, `studio-v3-stops-editor`, `studio-v3-stop-row`, `studio-v3-swap-pool`, `studio-v3-add-moment`, `studio-v3-add-pool` all still resolve.
- Existing tests under `src/components/studio-v3/__tests__/` for add-on gating, price source-of-truth and refine stop card still pass; update any snapshot that asserts the removed sections.
