# Three mobile polish fixes on the Signature tour page

## 1. Per-child price line missing on Signature booking form
`src/components/SimpleBookingForm.tsx` currently only shows:
- `For 3 guests · per person  €215`
- `Party total  €538  age-based pricing`

When minors are in the party, the user cannot see the child rate. Every other surface (Tailor, Studio V3 reveal, CheckoutSummary) already uses `<PerPersonBands journeyLines={...} />` to render one line per band (adult / youth / child / infant).

Do the same here:
- Compute `journeyLines` from the existing pricing hook (same source Tailor uses via `journeyPricing.lines`).
- Under the "For N guests · per person €X" row, when `hasMinors` and complete journey pricing exists, render `<PerPersonBands journeyLines={journeyLines} />` — producing e.g. `€215 / adult` + `€108 / child` stacked. Keep the party-total row underneath.
- Adults-only parties keep today's single "per person" line (no change).

## 2. Map attribution footer
Remove the `Map data © OpenStreetMap · Tiles © CARTO` paragraph (lines 285–304 of `src/components/SignatureRouteMap.tsx`). The Leaflet control is already suppressed via `attributionControl: false`; the standalone paragraph was the last visible attribution. Owner-approved on the earlier "keep it clean and simple" pass — this one was missed.

## 3. Low contrast on the child selection card (mobile)
The card in `src/components/booking/CompositionField.tsx` (each minor row) sits on `--ivory` with:
- Row border at `color-mix(charcoal 14%)` — too faint on mobile.
- "CHILD 1" label and "CHILD · 50%" band label rendered in teal or charcoal at 60% mix — dips below 4.5:1 on ivory at 11px uppercase.
- Age input border at 18% charcoal.

Bump each to brand-guardrail AA:
- Row border → `color-mix(charcoal 28%)`, background stays ivory.
- "CHILD n" eyebrow → charcoal at 78% mix (was 60%).
- Band tag ("CHILD · 50%" etc.) → use `var(--teal)` solid (AA on ivory) instead of `var(--teal)` behind a mixed opacity; when the band is "adult" or unset, use `--gold-ink` (already a token) instead of 45% charcoal.
- Age-input border → `color-mix(charcoal 32%)` when filled; keep gold when empty (invalid state).

No layout, spacing, or typography changes — contrast only.

## Files touched
- `src/components/SimpleBookingForm.tsx` — wire `journeyLines` + `<PerPersonBands>` row.
- `src/components/SignatureRouteMap.tsx` — delete attribution `<p>` block.
- `src/components/booking/CompositionField.tsx` — contrast tokens on minor row.

No new deps, no schema changes, no copy changes beyond what the band renderer already outputs.
