## North star

Three screens, one job each. Everything the traveller can do lives in exactly one place. No duplicate CTAs, no shadow controls, no invented content.

```text
   MapAwakens          →           Refine                →       Storytelling Signature      →   Guest Details
 "This is your day"          "Shape it to fit you"            "Live it before you book"           (existing)
```

Current code already runs this sequence, but the middle screen is coded under the confusing phase name `storyboard` and mixes concerns. Plan below tightens each screen, keeps the flow, and locks the handoff contract between them.

## Screen 1 — MapAwakens (`phase: "map"`)

**Role.** Cinematic reveal of the route. Purely emotional. No pricing, no editing.

**Contract.**
- Route draws stop-by-stop with existing sequence + hold-journey CTA.
- Single primary CTA: **"Personalise a few details"** → advances to Refine.
- No secondary CTA visible on this screen (the "Ask a curator" ghost lives on Refine only, to keep this moment silent).
- No price chip, no add-on preview, no inclusions here.

**Change.** None functionally — just enforce "no price / no CTA duplication" as a lint-style unit assertion.

## Screen 2 — Refine (`phase: "storyboard"`, `StoryboardHandoff` + `SignaturePriceCard`)

**Role.** The only place the traveller edits: reorder / remove / swap stops, add moments, toggle add-ons, see live price. Every interaction updates one shared state slice (`editedRoutePoints`, `selectedAddOnIds`, `guests`).

**Layout, top → bottom, single column, mobile-first:**

1. **Header.** Journey title (existing) + one-line "for {N} guests in {pickupCity}".
2. **Stops editor** (`studio-v3-stops-editor`, already implemented, stays exactly as-is):
   - Drag-reorder.
   - Per-stop **Remove** (X) → shows an inline "Suggestion" chip pulled from the SAME resolved Signature's pool (never from other tours), tap to accept swap.
   - Per-stop **Swap** → expands `studio-v3-swap-pool` with pool candidates.
   - "— Refine the moments" divider then **Add a moment** → expands `studio-v3-add-pool`, capped by rhythm.
   - "Reset to original" appears only when `editedRoutePoints !== null`.
3. **Add-ons** (`studio-v3-add-ons`, kept separate from stops per user note): grid of toggleable chips with real `+€N / pp` price. Live `studio-v3-add-ons-total`.
4. **Included in your day** footnote (`studio-v3-inclusions-footnote`):
   - Header: `Included in your day` (exact, from `INCLUDED_HEADER_REFINE`).
   - Real `included[]` from resolved Signature, capped at 4.
   - After any add-on toggle, appends `— Your additions` divider + one row per toggled add-on with `+€N`. Divider disappears when no add-ons selected.
5. **Price block** — one live line only:
   `For {N} guests · €{perPax} / guest · €{partyTotal} total`
   No tier picker, no "Drops to €X with 8+" hint (already removed), no duration/moments chips.
6. **CTAs — exactly two, no sticky duplicates on desktop:**
   - Primary (charcoal, arrow): **"See my signature story"** → advances to Storytelling.
   - Ghost link: **"Ask a curator for help"** → WhatsApp handoff with journey title in body.
   - Mobile only: one bottom sticky mirror of the primary CTA + the "Nothing is booked yet · Confirm on the next step" microcopy. Not visible on desktop.

**What is explicitly NOT on Refine:** the itinerary spine repeat, blueprint optionals, trust strip, QualityScore, `Save my signature` button (that belongs to Storytelling), any second "See my signature story" outside the sticky mirror.

**State written here, read by Screen 3:** `editedRoutePoints`, `selectedAddOnIds`, `guests`, `tourId`. No new state.

## Screen 3 — Storytelling Signature (`phase: "confirmation"`, `FinalRevealStory`)

**Role.** Cinematic proof: "here is the day you just composed, in words." No editing.

**Contract.**
- **Timeline source (locked):** `state.editedRoutePoints ?? composedStops ?? tour.stops` — already wired via the `composedStops` prop set in `StudioV3.tsx:2377`. Never widens past the resolved Signature.
- **Add-on beats** append after kept stops, in `selectedAddOns` order. Same voice, no invented stops.
- **Price line** mirrors Refine exactly (`perPax`, `partyTotal`) — read from props, never recomputed with a different rule.
- **CTAs — exactly two:**
   - Primary: **"Continue to guest details"** → `onContinue` (advances to `guestDetails`).
   - Secondary: **"Save my signature"** → `onSaveSignature` (emails the letter; stays on screen with confirmation line).
- Back button returns to Refine, preserving all edits.

**What is explicitly NOT on Storytelling:** stops editor, add-on toggles, swap pool, guest picker. If the traveller wants to change anything, they go back — one direction of edit-authority.

## Handoff contract (the one thing that keeps the flow honest)

Single source of truth per field, one writer, many readers:

| Field                 | Written on | Read on                          |
|-----------------------|------------|----------------------------------|
| `tourId`              | `map`      | Refine, Storytelling, Checkout   |
| `editedRoutePoints`   | Refine     | Storytelling, Checkout           |
| `selectedAddOnIds`    | Refine     | Storytelling, Checkout           |
| `guests`              | questions  | Refine, Storytelling, Checkout   |
| `journeyTitle`        | `map`      | Refine, Storytelling, WhatsApp   |

Guarantee: Storytelling never calls `resolveStudioV3Route` with different inputs than Refine did. It receives `composedStops` and `perPax/totalEur` as props only.

## Naming cleanup (comments + testids only, no phase rename)

Renaming the `storyboard` phase string is a wide-blast-radius change (analytics, saved-signature hydration, tests). Instead:

- Add a top-of-file comment in `StudioV3.tsx` mapping the three product screens to their phase strings: `map → MapAwakens`, `storyboard → Refine`, `confirmation → Storytelling`.
- Add stable testids: `studio-v3-screen="refine"` on `StoryboardHandoff` root, `studio-v3-screen="storytelling"` on `FinalRevealStory` root. Existing testids stay for backward compat.

## Playwright + unit spec updates (follows the earlier plan you already saw)

- `studio-v3-unified-signature-card.spec.ts` — add: exactly-two-CTA assertion on Refine, `Included in your day` header lock, `Your additions` divider + ordering + styling contract, add-on toggle round-trip. Keep swap-pool / add-pool expand tests.
- `studio-v3-price-anchor-exit-intent.spec.ts` → rename to `studio-v3-exit-intent.spec.ts`, delete the anchor-hint block, keep exit-intent + questionnaire coverage.
- `studio-v3-reveal-and-guest-details-mobile.spec.ts` — no functional change; flag PNG baselines for `--update-snapshots`; add a copy-lock that Storytelling has `Continue to guest details` and `Save my signature`, and does NOT have `See my signature story` or add-on toggles.
- New tiny unit test: `MapAwakens` renders only ONE primary CTA, labelled `Personalise a few details`, and no price string.

## Non-goals (deliberately excluded)

- Renaming the `storyboard` phase string (risky, low value).
- Any new backend, pricing, or add-on catalogue changes.
- New animations or visual redesign on any of the three screens.
- Touching Guest Details / Checkout Summary.
- Reintroducing anchor hints, tier picker, itinerary spine, or trust strip.

## Verification

1. `bunx tsgo --noEmit` clean.
2. Headed Playwright run of the unified-signature-card spec against `http://localhost:8080`.
3. Manual mobile pass at 393×588: MapAwakens → Personalise → Refine (remove one stop, accept suggestion, toggle one add-on, watch price + `Your additions` update) → See my signature story → Storytelling (verify timeline matches kept stops + add-on beats) → Continue.
