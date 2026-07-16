## Fixes

Three bugs, all on the Studio + Tailor checkout surfaces. No pricing math changes on the backend — the edge function already computes age-banded totals correctly. All three fixes are in the presentation + call layer.

### 1. Kill the blended "€X / guest" per-person line

Root cause: `useResolvedJourney` computes `perPaxEur = totalEur / guests`, which averages adults + children into a meaningless number. That value is then labelled "per person" / "/ guest" in `FinalRevealStory`, `CheckoutSummary`, `SignaturePriceCard`, and tailor's `/ pp` line.

Fix:

- In `useResolvedJourney`, stop returning a blended `perPaxEur`. Instead expose:
  - `adultUnitEur` — unit price for the Adult band (from `journeyLines`)
  - `childUnitEur` — the highest minor-band unit (Youth/Child/Infant, whichever exists in `journeyLines`), or `null` when there are no minors
  - Keep `perPaxEur` **only** as a fallback for legacy adults-only bookings (no composition) — computed as `adult unit`, not a blended average.
- Update the four display sites to render two lines when children are present:
  - `€250 / adult`
  - `€125 / child` (only when `minorAges.length > 0`)
  - When multiple minor bands are present (Youth + Child + Infant), show each on its own line using the same treatment.
- Surfaces touched: `FinalRevealStory.tsx` (lines ~404, 505), `CheckoutSummary.tsx` (line ~292), `SignaturePriceCard.tsx` (lines ~706, 997, 1115), `tours.$tourId.tailor.tsx` (line ~1403).
- Reuse `<PriceBreakdownRows />` styling tokens for consistency; this is a compact 1–3 line label block, not the full itemised breakdown.

### 2. Studio "Checkout Summary total ≠ Stripe amount"

Root cause: `StudioV3.tsx` (line ~945) invokes `create-signature-checkout` with `adults` / `minorAges` **only when composition is present in the current state**, otherwise falls back to `details.adults` / `details.minorAges`. In some flows the summary renders using `state.adults + state.minorAges` (via `useResolvedJourney`) while the checkout call sends `details.*`, so Stripe recomputes against a different composition and returns a different amount.

Fix:

- In `StudioV3.tsx` handleCheckout, use exactly the same composition the summary displays: read directly from the same `journeyLines` / `state.adults` / `state.minorAges` that `useResolvedJourney` already returns. Remove the `details.*` fallback branch — if composition is missing at checkout time, block the CTA (defensive) rather than send a mismatched payload.
- Add a client-side assertion: sum of `line_items` derived from `journeyLines` × units must equal the displayed `totalEur` before the invoke; if not, log and abort with a user-visible retry toast.
- No edge function changes; the server pricing is authoritative and already correct.

### 3. "Review & confirm" step before Stripe on Studio

Currently the Studio checkout button calls `supabase.functions.invoke("create-signature-checkout", …)` and redirects straight to Stripe. Add one interstitial modal:

- New component `src/components/studio-v3/ReviewConfirmDialog.tsx`: full-screen sheet on mobile, centered dialog on desktop. Shows:
  - Tour title + date
  - Composition ("2 adults · 1 child (8)")
  - Itemised price breakdown (`<PriceBreakdownRows />`)
  - Add-ons
  - Grand total (matches Stripe exactly — see fix #2)
  - Two buttons: **Back to edit** (ghost) and **Confirm & pay** (primary, gold arrow)
- CTA in `CheckoutSummary` no longer invokes the edge function directly; it opens the dialog. The dialog's "Confirm & pay" is the only path that calls `create-signature-checkout`.
- Analytics: fire `studio_review_opened` on open, `studio_review_confirmed` on confirm, `studio_review_dismissed` on back.
- Reduced-motion safe; brand tokens only; existing `Sheet`/`Dialog` primitives from shadcn.

Tailor checkout instant without manual review 

### Out of scope

- &nbsp;
- Email templates and receipts (unchanged, already itemised in Turn 2).
- Backend pricing math.

### Verification (after build)

- Playwright: adults-only → single "€X / adult" line, no mismatch.
- Playwright: 2 adults + 1 child (8) → "€250 / adult" + "€125 / child", summary total = review-dialog total = Stripe amount metadata.
- Playwright: Confirm & pay path reaches Stripe; Back to edit returns to summary with state intact.