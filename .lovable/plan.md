# Instant checkout for families + leaner pre-checkout dialog

## What the user is seeing

On the Tailored page (`/tours/:tourId/tailor`), the moment a minor age is added to the traveller picker, a red alert appears:

> "This tour isn't yet configured for family pricing. Please contact us so we can confirm ages and rates."

…and the Reserve CTA no-ops with a toast. That is the "talk to someone" behaviour the user wants gone.

Root cause (verified in code):

- `src/routes/tours.$tourId.tailor.tsx:195` — `const mixedFamilyBlocked = hasMinors(composition) && !categoryReady.ready;`
- `src/routes/tours.$tourId.tailor.tsx:425–432` — `handleReserve` bails out with the "please contact us to confirm ages" toast.
- `src/routes/tours.$tourId.tailor.tsx:745–754` — the red alert block.

This gate was written for the old Bókun-only pricing path (`useCategoryAwareCheckoutReadyFor` needs a confirmed Bókun child/youth/infant category per age). But the whole flow now runs through the **manual pricing path** in `supabase/functions/_shared/manualPricing.ts`, which prices every minor age from the adult Viator tier × age band (adult 100% / youth 80% / child 50% / infant 0€) with no Bókun mapping required. The Signature page (`BandedSignatureBookingForm`) already uses this path and books families instantly. Tailored is the only surface still gated by the obsolete check.

The user also flagged that the pre-checkout dialog "asks too much". `FinalDetailsDialog` currently marks these as required: full name, email, phone, tour date, guests, pickup, language — plus a whole "Anything we should know" optional block (dietary, mobility, children, occasion, guide notes) that's expanded by default and pushes the CTA below the fold on mobile.

## Scope of changes

Frontend + edge-function shared logic only. No DB migration. No pricing math changes.

### 1. Tailored — remove the family / "contact us" gate

`src/routes/tours.$tourId.tailor.tsx`

- Delete the `mixedFamilyBlocked` const, its guard in `handleReserve`, and the red alert block under the traveller picker.
- Drop the now-unused `useCategoryAwareCheckoutReadyFor` import + `categoryReady` call and the `hasMinors` import if it becomes unused.
- Result: adding children keeps the Reserve CTA live; checkout goes straight through `create-signature-checkout` (booking-quote-create-session) with the manual quote, same as Signature does today.

### 2. Signature — confirm no equivalent gate

Read-only verification of `BandedSignatureBookingForm.tsx` — it already goes straight through `useBookingQuote` (no readiness gate on Reserve). Add a small assertion to the existing smoke spec (`e2e/checkout-surfaces-smoke.spec.ts`) that bumping the composition to `{ adults: 2, minorAges: [8] }` still leaves the Reserve CTA enabled and the booking summary shows a € total.

### 3. Pre-checkout dialog — ask only what the host truly needs

`src/components/checkout/FinalDetailsDialog.tsx`

- Keep **required**: full name, email, phone, pickup. That's it.
- Remove the required flag on tour date, guests, and language — these are always prefilled from the page (date + guests) or defaulted to EN. Show them read-only or as small compact controls, not big required inputs.
- Collapse "Anything we should know" (dietary / mobility / children / occasion / guide notes) into a single closed disclosure — one line "Add a note for your host (optional)" that expands on tap. Nothing removed, just tucked away so it doesn't push the CTA down on 393-px viewports.
- Keep the "Main contact person (if different)" field but move it into the same optional disclosure — most bookings don't need it.

Net effect on Signature/Tailored/Studio: pre-checkout dialog is 4 required fields on one mobile screen with the CTA visible above the fold. No behavior change to the payload — hidden fields still submit their (empty) values.

### 4. Studio v3 — verification only

No code change. Re-run the existing `studio-checkout-gate` workflow (itinerary curation, signature contract, reveal section order, checkout inclusions) after the dialog edit to prove the trim didn't shift Studio's checkout inclusions or reveal order. If any gate fails, we roll back the dialog changes and iterate.

### 5. Tests

- Update `e2e/checkout-surfaces-smoke.spec.ts` (already covers Signature/Tailored/Builder × mobile+desktop):
  - Tailored test: fill traveller picker with 2 adults + 1 age-8 minor, assert the "contact us" alert is **absent** and Reserve stays enabled.
  - Signature test: same family composition assertion.
  - Dialog test (new): open the Signature dialog, assert only 4 fields carry the required marker (name, email, phone, pickup), and the "Add a note for your host" disclosure is closed by default.
- Keep the existing `bokun-checkout-coverage.spec.ts` (edge-function level) — it already proves every Signature tour returns a Stripe `clientSecret` for a 2-adult booking; that stays green because we're not touching the edge function.

## Files touched

- `src/routes/tours.$tourId.tailor.tsx` — remove `mixedFamilyBlocked` gate, red alert, and unused imports.
- `src/components/checkout/FinalDetailsDialog.tsx` — reduce required fields, collapse optional section, tighten mobile layout.
- `e2e/checkout-surfaces-smoke.spec.ts` — extend with family + dialog assertions.

## Explicitly out of scope (unless the user asks)

- Studio v3 storytelling / reveal order — no change; existing gate keeps it safe.
- Any pricing / Bókun / webhook logic.
- Removing the "Talk to a local" WhatsApp link at the bottom of the Tailored page — it's a soft help affordance, not blocking checkout.
- The FinalDetailsDialog payload shape sent to `create-signature-checkout` — unchanged so the Bókun push and confirmation emails keep working.
