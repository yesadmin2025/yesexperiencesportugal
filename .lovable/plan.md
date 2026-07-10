# Standardize the Accepted Payments block

## Finding first — the "divergent variant" claim

I audited `/multi-day` and `/corporate`. Both routes render through the shared `SiteLayout` (`src/components/SiteLayout.tsx`), which mounts the single `Footer` (`src/components/Footer.tsx`), which mounts `PaymentMethodsRow` (`src/components/trust/PaymentMethodsRow.tsx`). **There is no second footer variant on those pages** — they already render the same block as every other route.

The only place the phrase "Secure payment · Stripe" appears is inside `src/components/checkout/TrustStrip.tsx`, which is a **pre-checkout trust row** (mounted above Reserve on tour pages and inside booking panels), not a footer. That's a different surface with a different job (payment security + cancellation + license + WhatsApp), so I will leave it untouched unless you confirm you want it removed too.

If you were seeing a different footer on `/multi-day` or `/corporate`, it may have been a cached preview. I'll verify visually after the change lands.

## What changes

One file changes: `src/components/trust/PaymentMethodsRow.tsx`.

### 1. Method list (in order)

Visa · Mastercard · American Express · PayPal · Klarna · Multibanco · MB WAY · Revolut Pay · Apple Pay · Google Pay

Each rendered as an inline SVG typographic/mono mark (same approach the file already uses — no external requests, layout-stable, no unofficial brand lockups). New marks to add:

- **Klarna** — wordmark "Klarna"
- **Multibanco** — wordmark "Multibanco"
- **Revolut Pay** — wordmark "Revolut Pay"

### 2. Palette — badges on Warm Ivory, labels in Charcoal

Current block sits on the charcoal footer with translucent ivory chips. New spec:

- Badge background: `var(--ivory)` (#FAF8F3)
- Badge ring: `color-mix(in oklab, var(--charcoal) 10%, transparent)` (very soft hairline, uses locked palette only)
- Mark color: `var(--charcoal)` (#2E2E2E) via `currentColor` on each SVG
- Row label "Accepted payment methods": stays in the ivory/65 footer color (row label is outside the badges — reads on charcoal footer)
- No new tokens, no hex literals. Uses only the six locked colors.

Badge chip: `h-7`, `min-w-[3rem]`, `px-2.5`, `rounded-[3px]` — unchanged.

### 3. Layout

- Same flex-wrap row, same gaps, same responsive behavior
- With 10 marks (vs 7) the row will wrap to 2 lines on narrow mobile — acceptable and layout-stable

## What does NOT change

- `src/components/Footer.tsx` — no edits; already mounts the block
- `src/components/SiteLayout.tsx` — no edits
- `src/components/checkout/TrustStrip.tsx` — untouched (different surface)
- `src/routes/multi-day.tsx`, `src/routes/corporate.tsx` — no edits; they inherit the same footer
- No color tokens, no CSS variables, no brand hexes

## Files touched

1. `src/components/trust/PaymentMethodsRow.tsx` — replace `MARKS` array (add Klarna/Multibanco/Revolut Pay) and switch chip background from ivory-alpha to solid `var(--ivory)` with charcoal marks.

## Verification

After the edit I'll:
1. Read the file back
2. Load `/`, `/multi-day`, `/corporate` in Playwright and screenshot the footer at 393px + 1280px to confirm identical block on all three, ivory chips, charcoal marks, all 10 methods visible.

## Risk

Low. Single-file, presentational change. No routing, no data, no business logic. The one visible side-effect is the 10-badge row wrapping to 2 lines on narrow phones — intentional and readable.
