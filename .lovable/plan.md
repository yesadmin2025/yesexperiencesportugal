## Why

Two problems today:

1. **Reveal is dispersed.** After the map awakens, the screen scrolls through 8+ standalone islands: story chapters, refine-moments editor, Signature DNA, shaping direction, quality score, price card, add-ons, itinerary spine, blueprint optionals, inclusions footnote, sticky CTA. Add-ons live *inside* the price card, but the route (moments editor) lives *far above* it and the map is gone. Selecting an add-on updates the €/pp but the user can't see it hit the route, the time budget, or the CTA — everything feels detached.
2. **Mobile MapAwakens overlaps.** `MapAwakens.tsx` renders the map at `h-[58dvh]` from the top and the moment card as `absolute bottom-0 z-20` — on 393px viewports the card physically covers the lower third of the map while it's still composing, so the user never sees the route unfold.

## What changes

### A. Mobile MapAwakens — map first, card underneath

- Move the moment card out of the `absolute bottom-0` overlay on mobile: keep it `absolute` at `sm:` and up, switch to normal flow (`static`) at mobile so it sits under the map.
- Give the map section `h-[68dvh]` on mobile (was 58) since the card no longer overlaps.
- Keep the progress dots on the card. No copy or beat-timing changes.
- Desktop layout unchanged.

### B. Reveal — one "Your Signature" cohesive card

Collapse the scattered sections into a single vertically-stacked card in this order, all sharing one background surface and one CTA at the bottom. The map returns as the header of this card so add-on changes visibly affect it.

```
┌── Your Signature (single card) ────────────┐
│  [1] Static route map (mini, ~180px)       │  ← always visible header
│      pins = editedStops + add-on stops     │
│                                            │
│  [2] Title + rhythm/day chip               │
│  [3] Route strip (numbered stops, inline   │
│      swap/remove/add — was "Refine the     │
│      moments", compacted)                  │
│                                            │
│  [4] Make the day yours (add-ons)          │
│      · each chip shows +€X /pp AND +Xmin   │
│      · time budget bar: "Day 6h30 · 45min  │
│        free" turns amber when over         │
│      · selected add-ons inject a pin on    │
│        the map above + a row in [3]        │
│                                            │
│  [5] Investment block                      │
│      · €/pp (base + add-ons)               │
│      · × guests → party total              │
│      · group-size picker (unchanged)       │
│                                            │
│  [6] Primary CTA: Reserve €{partyTotal}    │
│      Secondary: Refine with a curator      │
│                                            │
│  [7] Collapsed accordions (default closed):│
│      · What's included                     │
│      · Optional, if the day allows         │
│      · Why this works                      │
└────────────────────────────────────────────┘
```

Removed / demoted from the reveal:

- Standalone Signature DNA chips section → merge as one line of small chips under the title.
- Standalone "Shaping direction" italic block → move as a single italic caption under the title.
- Standalone Quality Score section → move into a small badge next to the title (or drop from reveal; keep in debug only). Confirm with user if it must stay visible.
- "Story of the day" chapters → move into a collapsed "The story" accordion in [7]; the map + route already tell it.

### C. Add-ons ↔ route / map / CTA / time

Right now `signatureAddOn.durationMinutes` exists but is only used to gate `fitsBudget`. Wire it through so every add-on choice visibly changes the reveal:

1. **Time budget** (new, in add-ons block):
  - Compute `baseDayMin = summarizeDay(...).dwellMin + driveMin` (already available via `summarizeDay`).
  - `addOnsMin = Σ selected add-ons' durationMinutes`.
  - Render a slim horizontal bar: filled = base, gold overlay = add-ons, remaining = free.
  - Copy: "Your day · 6h 30m · 45 min still free" / "Tight — 15 min over the rhythm you chose" (amber).
  - Disable add-ons whose duration would push over the day budget (already partially done via `fitsBudget` — reuse, but recompute against *current* selection, not just base).
2. **Route map reflects add-ons**:
  - For each selected add-on with a `coords`/`sourceTourId` anchor stop, append a lightweight pin at the end of the route array feeding the mini-map (gold ring, dashed connector) so the user sees the day physically grow.
  - If the add-on has no geo anchor, show it as an extra numbered row in [3] with a "no map pin" muted note (no invented coords — memory rule).
3. **Route strip reflects add-ons**:
  - Add a read-only row under editedStops for each selected add-on, labelled with its title + `+{durationMinutes} min`, removable via the same ✕ affordance that toggles it off.
4. **CTA reflects add-ons**:
  - Primary CTA button label becomes `Reserve · €{partyTotalWithAddOns}` and updates on every toggle (already computed as `partyTotalEur`).
  - Mobile sticky CTA (already exists via IntersectionObserver) mirrors the same live total.
5. **Price reflects add-ons** — already working; keep, but move the per-pax and party lines directly above the CTA so cause→effect is one visual jump.

### D. Cleanup

- Delete the duplicated eyebrows/dividers between the collapsed sections (they were the visual "dispersion" the user complained about).
- Keep all existing `data-testid`s (`studio-v3-add-ons`, `studio-v3-add-ons-total`, `studio-v3-party-total`, `studio-v3-stops-editor`, `studio-v3-price-card`, `studio-v3-itinerary-spine`) so the E2E suite (`studio-v3-add-ons-*.spec.ts`, `-round-trip`, `-same-frame`, `-final-investment-live`) keeps passing. Add `data-testid="studio-v3-time-budget"` for the new bar.

## Technical notes

- Touch only:
  - `src/components/studio-v3/MapAwakens.tsx` (mobile layout of the moment card + map height).
  - `src/components/studio-v3/StudioV3.tsx` inside `StoryboardHandoff` (2496–~3800): re-order sections, delete standalone eyebrow blocks, move Story/Included/Optional/Why-this-works into accordions, embed a mini `EditorialMap` as the card header, add time-budget bar, wire selected add-on labels into the route strip.
  - `src/components/studio-v3/SignaturePriceCard.tsx`: tighten to just [4]+[5]+[6] internals (drop its own eyebrow chrome, since it now lives inside the unified card); expose `selectedAddOns` and `addOnsMin` via a callback so the parent can render pins/rows/time bar. Alternatively, lift add-on state up into `StoryboardHandoff` and pass `selectedIds` down — cleaner, and lets the map/route consume it without prop-drilling callbacks. Preferred.
- No new data files. `signatureAddOns.ts` already has `durationMinutes`. `summarizeDay` already returns dwell/drive/remaining minutes. No invented stops/coords — respects `studio-v3-no-invented-stops` memory.
- No backend changes. Purely frontend/presentation, matching the "UI change → keep in frontend" rule.
- Preserves the Studio philosophy memory: interface disappears further (fewer standalone panels), Portugal felt through the always-visible map, restraint > features.

## Open question

Quality Score in the reveal — keep as a small badge next to the title, or drop from the reveal (still visible in debug)? Default: drop, since the user said "too dispersed" and the score doesn't drive a decision at this step.

After clicking cta button to say yes to signature create there should be a summary of the day and stops where guests fills de details like name email etc . Should save abd send email with their own created signature even when don't check out 