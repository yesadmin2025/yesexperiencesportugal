# Currency chip coverage, E2E hardening & a11y polish

Extend the "View in EUR · USD" chip so every EUR surface offers it, prove via E2E that checkout stays untouched, and tighten the chip's a11y.

## 1. Chip coverage on all EUR surfaces

Today `PriceCurrencyChip` is on `/experiences`, `/day-tours` (EN+PT) and the Signature tour hero. Add it — always aligned right, uppercase eyebrow style already baked in — to the remaining EUR marketing surfaces:

- `src/routes/tours.$tourId.tailor.tsx` — above the price summary block (line ~1474). Also replace the two hardcoded `€…toLocaleString` values (per-person + party total, lines 1480/1491) with `<PriceEur amountEur={…} role="per-person" | "total" />` so the toggle actually reformats them.
- `src/routes/i.$token.tsx` (proposal viewer) — chip above the price section; wrap any EUR amounts in `PriceEur`.
- `src/routes/pt.index.tsx` — if a "from €X" appears near the Signature CTAs, wrap in `PriceEur` and add a chip in that band.
- Studio V3 investment surfaces (`SignaturePriceCard`, `InvestmentTierPicker`, `RevealInvestment`, `PriceWhisper`) — one chip in the reveal/investment panel header, EUR amounts routed through `PriceEur`. Studio is a cinematic flow, so only ONE chip per panel, aligned end, never repeated per row.
- Homepage `ThreePathsSection` / `StudioLivePreview` if they display a "from €…" — wrap in `PriceEur`; no chip needed there (already reachable via `/experiences`).

Explicitly NOT touched (checkout = EUR source of truth):
- `src/components/checkout/*` (`PriceBreakdownRows`, `PerPersonBands`, `BrandedCheckoutDrawer`)
- `src/components/SimpleBookingForm.tsx` totals
- `src/components/builder/StickyBar.tsx` and `ReviewScreen.tsx` final totals
- Any email/receipt template

These stay literal `€` with no chip and no `PriceEur`.

Fallback: `PriceCurrencyChip` already falls back to `"View in"` when `currency.view_in` i18n key is missing — add the key to `src/i18n/dictionaries.ts` (EN: "View in", PT: "Ver em") so the chip localises cleanly.

## 2. E2E updates

- **`e2e/switchers-a11y-axe.spec.ts`** — currency toggle no longer lives in header/footer. Remove the header+footer `currency-toggle` scans; keep the language switcher scans. Add a new scan targeting `[data-a11y-scope="currency-toggle"]` on `/experiences` (mobile + desktop) and assert it is NOT present under `header, footer` selectors on `/`. Roving `aria-pressed` test moves to `/experiences`.
- **`e2e/currency-toggle-parity.spec.ts`** — set currency by clicking the chip's inner toggle inside `[data-a11y-scope="currency-toggle"]` on the current page (helper `setCurrency` already targets that scope; verify it still resolves). Add explicit assertion per route that at least one `PriceCurrencyChip` is visible on the marketing routes (`/experiences`, `/day-tours`, `/tours/:id`, `/tours/:id/tailor`) and that it is ABSENT on checkout surfaces (drawer opened via booking form) — the drawer's price nodes must have no `data-price-eur` conversion applied (all `€`, no `$`) even when USD is active.
- **New `e2e/currency-chip-header-absence.spec.ts`** — 2 assertions:
  1. `page.locator('header [data-a11y-scope="currency-toggle"]')` count = 0 on `/`, `/experiences`, `/tours/douro-valley-wine-tour`.
  2. `page.locator('footer [data-a11y-scope="currency-toggle"]')` count = 0 on same routes.
- Extend `ROUTES` in currency-toggle-parity to include `/tours/douro-valley-wine-tour/tailor` (already there) and add `/pt/experiences`, `/pt/day-tours`.

## 3. Chip a11y polish

`CurrencyToggle` already has group label + roving `aria-pressed` + polite live region. Improve at the chip wrapper:

- `PriceCurrencyChip`: wrap in `<div role="group" aria-labelledby>` with a real `<span id>` for the "View in" label (currently `aria-hidden`, so the inner group loses its context). Give the wrapper `aria-label={t("currency.chip_label") ?? "Display currency"}` so screen readers announce purpose before the two buttons.
- Ensure focus ring visibility: the chip lives on ivory/sand backgrounds — verify `focus-visible:ring-offset-[color:var(--ivory)]` still contrasts on the tour hero (charcoal-tinted) and add a `data-surface` prop (`light` | `dark`) so tour hero can pass `dark` and swap the ring-offset token.
- Live region: `CurrencyToggle`'s `sr-only` `<span role="status" aria-live="polite">` currently sits inside the same fragment. When multiple chips render on one page (e.g. tour hero + tailor summary later), we'd get duplicate announcements. Hoist a single app-level live region into `CurrencyProvider` (in `src/lib/currency.tsx`) that announces on `setCurrency`, and remove the per-toggle `<span role="status">` block. Screen readers hear one confirmation regardless of chip count.
- Add `aria-describedby` on each currency button pointing to a hidden helper: "Indicative conversion. Checkout remains in EUR." — reassures the traveller the change is display-only.

## 4. Files touched

- `src/routes/tours.$tourId.tailor.tsx`
- `src/routes/i.$token.tsx`
- `src/routes/pt.index.tsx` (only if a EUR price is rendered)
- `src/components/studio-v3/SignaturePriceCard.tsx`, `InvestmentTierPicker.tsx`, `RevealInvestment.tsx`, `PriceWhisper.tsx`
- `src/components/PriceCurrencyChip.tsx` (a11y wrapper, describedby, `data-surface`)
- `src/lib/currency.tsx` (single app-level live region + describedby helper)
- `src/components/CurrencyToggle.tsx` (drop per-toggle live region)
- `src/i18n/dictionaries.ts` (`currency.view_in`, `currency.chip_label`, `currency.checkout_notice`)
- `e2e/switchers-a11y-axe.spec.ts` (rework)
- `e2e/currency-toggle-parity.spec.ts` (extend routes + drawer absence)
- `e2e/currency-chip-header-absence.spec.ts` (new)

## 5. Verification

- Typecheck.
- Axe scan on the updated scopes must pass.
- Manual: toggle USD on `/tours/douro-valley-wine-tour/tailor`, confirm hero + summary reformat, open booking form → EUR everywhere; refresh → USD sticks; VoiceOver reads "Display currency, group. Euro, pressed. US dollar. Indicative conversion. Checkout remains in EUR."
