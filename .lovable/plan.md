## Goal

Make **per-person pricing** the primary, trust-building number everywhere a traveller sees a price (Signature card → Signature detail → Tailor → Studio → Checkout), and tighten the checkout drawer so the path from "I want this" to "Reserve" is frictionless.

## Current state (verified in code)

| Surface | Today | Gap |
|---|---|---|
| `/experiences` cards | `From €X` | no "per person" — reads as party price |
| `/day-tours` cards | `From €X` (teal) | same |
| `/tours/:id` (Signature detail) | price only inside `SimpleBookingForm` | no visible headline price above the fold |
| `SimpleBookingForm` | shows "Party total" only | missing per-person line + count breakdown |
| `/tours/:id/tailor` | ✅ "For N guests · per person" + "Party total (indicative)" | keep as source-of-truth pattern |
| Studio V3 final reveal | ✅ "€X per person" | keep |
| `BrandedCheckoutDrawer` | per-traveller rows via `PriceBreakdownRows` | audit CTA hierarchy, sticky footer, trust cues |

## Scope

### 1 · Unify the price label — "per person" is the primary number
- **Card lists** (`experiences.tsx`, `day-tours.tsx`): `From €X per person` — small `per person` in `--charcoal-soft`, same line, so the number keeps visual weight.
- **Signature detail hero** (`tours.$tourId.tsx`): add a single price tag next to the H1: `From €X · per person`, gold hairline, no CTA duplication.
- **`SimpleBookingForm`**: mirror the Tailor pattern — two rows, "For N guests · per person = €X" and "Party total (indicative) €Y".
- **Studio V2 booking panel** (`FinalBookingPanel.tsx`) + `InvestmentTierPicker`, `RunningInvestmentRibbon`: confirm every visible € is suffixed with `per person` (spot-fix any that aren't).
- **Reusable primitive**: extract `<PricePerPerson perPax={...} guests={...} total={...} variant="card|hero|form" />` in `src/components/ui/PricePerPerson.tsx` so the pattern stays consistent as new surfaces appear.

### 2 · Conversion-focused checkout drawer polish
Scoped to `BrandedCheckoutDrawer.tsx` + `PriceBreakdownRows.tsx`:
- **Sticky footer** on mobile with **one primary CTA** ("Reserve €Y") and the per-person recap in eyebrow style above it — no competing secondary buttons at the bottom.
- **Trust row** above the CTA: "Free cancellation up to 24h · Instant confirmation · Secure payment" (only claims already true in the copy source-of-truth memory).
- **Progress hint**: `Step 2 of 2 — Traveller details` eyebrow at drawer top so the user knows this is the final step (reduces drop-off).
- **Field polish**: floating labels, `inputMode="email|tel"` on the right fields, `autoComplete` tokens (`given-name`, `family-name`, `email`, `tel`), inline error under the field (not a top banner), 44×44 tap targets.
- **Loading state**: `Reserve €Y` → spinner + `Securing your date…` (uses existing `CtaButton` loading prop) so nothing feels frozen after tap.

### 3 · Analytics — measure the fix
Add two GA4 events (extends `src/lib/analytics-ga4.ts` already used for booking funnel):
- `gaPriceLabelViewed` on card/hero mount — surface + tour id.
- `gaCheckoutFieldFocus` on first focus per field — lets you see which field causes drop-off after the price-label change ships.

### 4 · Non-goals (explicit)
- No pricing-model change — per-person rate is still resolved from `tour_price_tiers` / `priceFrom`, no math changes.
- No new payment provider work; Stripe stays as-is.
- No copy invention — labels stay to the two approved patterns ("per person", "Party total (indicative)").

## Files touched

- new `src/components/ui/PricePerPerson.tsx`
- `src/routes/experiences.tsx`, `src/routes/day-tours.tsx`
- `src/routes/tours.$tourId.tsx` (hero price tag)
- `src/components/SimpleBookingForm.tsx` (two-row pattern)
- `src/components/checkout/BrandedCheckoutDrawer.tsx` (sticky footer, trust row, progress, field polish)
- `src/components/checkout/PriceBreakdownRows.tsx` (only if row hierarchy needs the per-person emphasis)
- `src/lib/analytics-ga4.ts` (+2 events, wired in the surfaces above)
- spot-check: `FinalBookingPanel.tsx`, `InvestmentTierPicker.tsx`, `RunningInvestmentRibbon.tsx`

## Out of scope (flag, don't touch)

- Rewriting `PriceBreakdownRows` per-traveller-band logic — already correct.
- Studio V3 pricing surfaces — already show "per person" and are covered by tests.

## Acceptance
- Every visible price on the site is either "per person" or explicitly labelled "Party total (indicative)".
- Checkout drawer on 390 CSS px has a single primary CTA above the safe-area, trust row visible, no competing buttons.
- No test in `src/components/studio-v3/__tests__/*` regresses.
