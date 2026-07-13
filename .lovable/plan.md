## Root cause
The live quote succeeds (€537.50 for 2 adults + 1 child), but its signed token contains literal `undefined` values for optional fields. Checkout then rejects that token because it is not valid JSON, producing the generic “Checkout unavailable” toast. This affects manual quotes generally; adding a child exposed it but is not the child-pricing failure.

## Fix
1. **Make quote tokens valid JSON**
   - Update the shared booking-quote token serializer to omit undefined object properties, matching normal JSON behavior.
   - Stop explicitly adding optional fields with `undefined` when creating manual quote tokens.

2. **Add regression coverage**
   - Add token round-trip tests covering absent optional Bókun fields and itinerary revisions.
   - Add an adult-plus-child checkout test that obtains a quote, creates an embedded checkout session, and verifies a client secret/session is returned rather than “checkout unavailable.”
   - Keep Builder, Tailored, and Signature confirmation-flow coverage intact.

3. **Improve failure visibility**
   - Preserve the backend error body in the checkout helper so future failures are classified accurately instead of always becoming the generic toast.

4. **Deploy and validate**
   - Deploy the corrected quote and checkout functions.
   - Re-run the exact mobile flow shown: 2 adults + child age 8 → Reserve securely → embedded secure checkout opens immediately.
   - Confirm the same behavior for Tailored and Signature, with no error copy.