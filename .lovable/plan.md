## Do I know what the issue is?

Yes. The two screens currently calculate different products:

- **Tailor shows a client estimate**: adult tier price, minus a hardcoded €10 skipped-stop credit, plus hardcoded additions.
- **Checkout uses the server quote**: for the shown group it correctly produced **2 adults × €215 + 1 child × €107.50 = €537.50**.
- Tailor never sends its selected additions to the quote, and its checkout itinerary is built from the original tour stops instead of the Tailor selection.
- Checkout then averages the mixed adult/child total into a misleading rounded **€179 × 3**, which cannot equal €537.50 exactly.

## Implementation plan

1. **Use one price source on Tailor**
   - Replace the independent `estimatedPrice` formula with the existing composition-aware pricing model.
   - Show a **party total and adult/child breakdown**, rather than one averaged `/ pp` amount for mixed-age groups.
   - Once a date is selected, replace the preview with the exact server quote that checkout will consume.

2. **Carry the real Tailor selection into the quote**
   - Build the itinerary snapshot from `summaryStops` so the Live Summary, checkout header, and booking record contain the same stops.
   - Include every price-affecting selection in the pricing revision.
   - Fix the quote helper’s request field so approved selected add-ons reach the server as `addOns`.

3. **Remove untrusted price deltas**
   - Do not charge invented client-side stop credits or additions.
   - Only include additions that exist in the backend’s approved add-on catalogue; unpriced preferences remain itinerary requests and do not alter the displayed total.

4. **Make checkout display exact math**
   - Pass the server quote’s category lines into the branded checkout summary.
   - For mixed groups, display the exact adult/child line items and **€537.50 total**, not a rounded average multiplied by guest count.

5. **Regression coverage and mobile verification**
   - Add tests for the reported case: 2 adults + one 8-year-old resolves to €537.50 on Tailor, the checkout drawer, and payment checkout.
   - Verify selected Tailor stops and approved additions remain identical through the full mobile flow at 393px.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>