
## Parity audit — findings

The confirmation email's traveller section does NOT match the on-page summary today. The values are usually numerically close but the shape, labels, and source of truth differ:

| Aspect | On-page summary (`PriceBreakdownRows` / `summarizeJourneyLines`) | Confirmation email (`checkout-receipt.tsx` → `buildCompositionRows`) |
|---|---|---|
| Source of unit prices | Real `journeyLines[]` from `useResolvedJourney` (tier-resolved server truth) | Recomputed in the template from a single `perPaxAdultEur` × hardcoded 0.75 / 0.5 / 0 band multipliers |
| Minor rows | One row per minor: `Youth (age 13) — €188` | Grouped per band: `Youth (11–17) · ages 8, 12 — €188 each · €376` |
| Adult label | `Adults` | `Adults (18+)` |
| Rounding | `unit * qty` on raw unit | `Math.round(perPaxAdultEur * pct)` per band, then `* qty` — can drift by €1 vs summary when tiers use non-round multipliers |
| Webhook payload | Sends `perPaxAdultEur` only; no per-line array | Same |

So there IS a real drift risk (any future change to age-band multipliers in `signatureTourPricing.ts` would silently desynchronise the email) plus a visible label/format mismatch.

## Fix plan

1. **Extend the webhook → email hook payload** (`supabase/functions/stripe-webhook/index.ts` + `src/routes/api/public/hooks/checkout-email.ts`) to forward the resolved `journeyLines` array (kind, band, age, unitEur) that the summary already uses. Keep `perPaxAdultEur` as a fallback for legacy sends.

2. **Rewrite the email traveller section** (`src/lib/email-templates/checkout-receipt.tsx`):
   - Add a `journeyLines?: CheckoutJourneyLine[]` prop.
   - When present, feed it to the SHARED `summarizeJourneyLines` from `@/lib/checkout/journeyDisplay` — same helper the on-page `PriceBreakdownRows` uses. One row per minor, adult label = `Adults`, same subtotal math.
   - Delete `buildCompositionRows` + hardcoded `pct` multipliers so there's a single source of truth.
   - Keep the current grouped fallback only when `journeyLines` is absent (legacy sessions).

3. **Update `previewData`** with a 2 adults + 2 minors (age 13, age 8) example carrying `journeyLines` so the dashboard preview reflects the new shape.

4. **Render a preview to `/mnt/documents`**: run a small Node script that calls `@react-email/render` on the updated template with realistic data (2 adults + child age 8 + youth age 13), save as `checkout-receipt-preview.html` + a PNG screenshot via Playwright, then emit a `<presentation-artifact>` tag so you can open it directly in chat.

5. **Assertion test** (`src/__tests__/checkout-email-parity.test.ts`): given the same `journeyLines`, assert the rows returned by `summarizeJourneyLines` (on-page) equal the rows rendered in the email — labels, unit, qty, subtotal — so this can never drift again.

## Out of scope

No pricing math changes, no Stripe amount changes, no on-page UI changes — only the email side is being aligned to the on-page truth.
