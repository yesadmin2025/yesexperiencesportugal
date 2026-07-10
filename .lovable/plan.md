# Refine / Preview Signature — simplify & fix overlaps (mobile 393px)

Understood: the screen in the screenshots is the **Preview / Refine Signature** step. It is NOT the reserve step. Flow is:

```
Preview & Refine signature (this screen)
   → Final storytelling letter (FinalRevealStory)
      → Guest details + Stripe summary (reserve)
```

So the primary CTA here must advance to the storytelling letter — never say "Reserve" or show a total-with-euros. The amount you should be updating somewhere in the page so it's clear before moving to the storytelling letter. But not on the button.

Scope: `src/components/studio-v3/CheckoutSummary.tsx` and `SignaturePriceCard.tsx` only. No pricing/logic/state/routing changes.

## Problems visible in screenshots

1. **Add-on cards break one word per line** (`Coastal / boat / ride / from / Sesimbra`) — text column starved of width.
2. **"ADD +€40 PER GUEST" pill floats over the add-on body** — sticky/absolute overlay covering copy.
3. **Add-ons rendered twice** — sticky offer strip + a second "MAKE THE DAY YOURS" list below.
4. **6 CTAs stacked**: `YES — RESERVE · €636`, `ADJUST A FEW THINGS FIRST`, `SAY YES TO THIS SIGNATURE`, `SAVE THIS SIGNATURE`, `REFINE WITH YES FIRST`, `NEED HELP? ASK YES`. This screen shouldn't have a reserve button at all.
5. **Price card is dense** — pp, ×guests investment, "drops to €139 with 7 guests", group-size selector, meta chips, "why this works" list all stacked.

## Fixes

### 1. Correct the CTA semantics for this step

- **Remove the reserve CTA** (`YES — RESERVE · €636`) and its `Adjust a few things first` chip — reserve belongs on the Guest Details step, after the letter.
- Keep exactly **one primary CTA** that advances to the storytelling letter: `See my signature story →` (calls the existing "advance" handler that routes to `FinalRevealStory`).
- Keep **one secondary text link** under it: `Save this signature` (existing save handler).
- Remove `SAY YES TO THIS SIGNATURE`, `REFINE WITH YES FIRST`, `NEED HELP? ASK YES`, standalone `ADJUST A FEW THINGS FIRST`. Help is already available via the persistent WhatsApp bubble.
- &nbsp;

### 2. Add-on card layout (root of the overlap bugs)

- Grid: `grid-cols-[minmax(0,1fr)_auto] gap-3`, text column gets `min-w-0`, remove `break-all`/`break-words`.
- Price + duration go into the right `auto` column, stacked, right-aligned, `shrink-0` (`+€40 / guest` over `+75 min`). No absolute pill.
- Selection state = radio + tinted border/background, not a floating "ADD" chip.

### 3. Dedupe add-ons

- Render add-ons **once**, in a collapsed `<details data-testid="refine-addons">` "Enhance your day (optional)" above `Your day includes`.
- Delete the top offer strip.

### 4. Tighten the price card (still shown as reference, not a purchase button)

- One quiet headline row: `From €159 / guest · 4 guests` (no dark reserve button, no total in bold euros as a CTA).
- Move `Drops to €139 with 7 guests` + group-size selector into one collapsed `<details>` "Price by group size".
- Meta chips `6+H · 4 MOMENTS · 31 JUL 2026` become a single muted line.
- Drop the free-standing "Why this works" bullet list — the numbered `Your day includes` covers the same ground.

### 5. Overflow guards

- Wrap outer container in `min-w-0 overflow-x-hidden`; every text+value flex row gets `min-w-0` on the text child and `shrink-0` on the value.

## Files touched

- `src/components/studio-v3/CheckoutSummary.tsx` — swap CTA set to `See my signature story →` + `Save this signature` link, dedupe add-ons, tighten sections.
- `src/components/studio-v3/SignaturePriceCard.tsx` — quiet headline row, collapse group-size, drop duplicate "why this works", fix add-on row grid + remove sticky pill.

## Out of scope

Stripe, email/PDF, , Guest Details, state machine, routing, Playwright specs.