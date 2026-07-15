## Goal
Ensure the Studio always shows the resolved base price, available add-ons, live updated price per person, and live party total—on mobile first and consistently through refine, final story, checkout summary, and payment.

## Confirmed causes
- The refine variant intentionally hides its main base-price block.
- Its fallback Total block is nested inside the add-ons fieldset, so tours with no compatible add-ons show no pricing at all.
- The canonical journey total updates when add-ons change, but the canonical per-person value remains the base rate; the card then prefers that stale base value.
- The final story places all pricing inside a closed “See what’s included” disclosure, making it appear absent.

## Implementation
1. **Correct the canonical pricing model**
   - Keep the resolved base per-person rate separate from the final effective per-person amount.
   - Derive the displayed effective per-person figure from the same resolved party total and guest count used by checkout, including age-band pricing and selected add-ons.
   - Preserve unit-aware add-on totals so per-group/fixed additions are never multiplied incorrectly.

2. **Fix the refine price card structure**
   - Render an always-visible pricing summary independently of whether an add-on pool exists.
   - Show base/itemised traveller pricing, selected additions, updated effective price per person, and party total.
   - Keep compatible add-ons visible and selectable; if none fit, retain the price summary rather than hiding the whole section.

3. **Expose pricing on the final story**
   - Add a compact, always-visible investment summary above the Continue action.
   - Keep detailed inclusions and line items collapsible, but never hide the primary per-person and total figures inside the disclosure.
   - Show each selected add-on with its billing unit and party contribution.

4. **Keep every downstream surface identical**
   - Feed the same resolved itemisation into the final story, checkout summary, and checkout payload.
   - Ensure adult/child rows only render when complete, while valid base and party totals remain visible if optional composition details are incomplete.

5. **Regression coverage and mobile verification**
   - Add tests for: no compatible add-ons, initial base pricing, add-on selection/deselection, same-frame effective per-person updates, party-total updates, age-band itemisation, and parity across card/final story/checkout.
   - Verify the complete Studio path at 393×588, including the exact mobile states shown in the screenshots, and confirm no clipping or hidden pricing.