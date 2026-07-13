## Goal

Prove — and where needed fix — that a mobile guest (393×588, DPR 3) can complete a Stripe sandbox checkout on all three surfaces without dead ends, layout breaks, or stale spinners:

- **Signature** — `/tours/:tourId` → `BandedSignatureBookingForm` → `BrandedCheckoutDrawer`
- **Tailored** — `/tours/:tourId/tailor` → `create-signature-checkout`
- **Builder / Studio** — `/studio-v3` (`GuestDetailsStep` → `create-signature-checkout` in booking-quote mode)

Manual pricing is already in the database for all 11 Signature tours, so this pass is about the *surface*, not the pricing engine.

## Method (one shared harness, three runs)

For each surface, a Playwright script on mobile viewport 393×852 executes the same 7-step arc and screenshots each step:

1. Land on the entry route.
2. Pick a future date + 2 adults + 1 child (age 8).
3. Confirm the price line matches the quote (adult ×2 + child at 50%).
4. Fill guest details (name, email, phone, pickup).
5. Click the primary CTA → drawer opens with Stripe Embedded Checkout.
6. Fill Stripe test card `4242 4242 4242 4242` inside the drawer.
7. Assert redirect to `/booking-confirmed` with a `session_id`.

At each step the script captures: screenshot, console errors, failed network requests, and CTA `disabled` state. Anything red → logged into the findings table below.

## What we're specifically checking (mobile-first)

### Shared across all three
- CTA is reachable without horizontal scroll and stays ≥44px tall.
- CTA enables the moment `booking-quote` returns `available` (no stuck spinner tied to a stale `readiness` gate).
- `BrandedCheckoutDrawer` opens as a bottom-anchored sheet on mobile (currently `side="right"` + `sm:max-w-[560px]` — verify it doesn't clip on 393px width).
- The summary card (image + tour + date + guests + total) stays legible and doesn't push Stripe's iframe below the fold before the guest sees the total.
- Stripe iframe scrolls independently of the summary; no double scrollbars.
- Error copy on `booking-quote` failure reads "This date isn't available — try another" (not generic "Something went wrong").
- Close (X) button is inside the safe area on iOS notch devices.

### Signature-specific
- Date + pax pickers don't overflow the card on 393px.
- Add-on chips wrap cleanly (no horizontal scroll).
- "Instant confirmation" copy present, no Bókun readiness gate visible.

### Tailored-specific
- Adjustments panel scrolls independently; sticky price bar stays visible.
- Tailored `guestDetails` payload reaches `create-signature-checkout` with the adjustments applied to the total.

### Builder / Studio v3-specific
- `GuestDetailsStep` footer CTA is above the mobile home indicator, not hidden behind it.
- Quote → session hop shows no intermediate error toast between the two edge-function calls.
- Selected Studio moments are reflected in the drawer's summary.

## Findings & fixes

The plan is: **run the harness first**, then apply only the fixes the harness proves necessary. Likely candidates (based on the code already in context) that I'll confirm or dismiss during the run:

1. **Drawer form factor on mobile.** `BrandedCheckoutDrawer` uses `side="right"` on every breakpoint. On 393px this covers the full width but animates from the right, which is jarring vs. a bottom sheet. If the harness shows the animation or the close button placement fails, switch to `side="bottom"` at `<sm` with `h-[92dvh]` and keep `side="right"` from `sm:` up.
2. **Summary card height eating the Stripe iframe.** If the total sits below the fold on 393×588, collapse the beats/add-ons into an accordion on `<sm` so the total + Stripe iframe are visible without scroll.
3. **CTA enable timing.** If any surface shows a spinner after `booking-quote` returns `available`, remove the stale readiness gate on that surface (Signature already lists this as done; Tailored/Studio are the risk).
4. **Generic error copy.** Replace any "Something went wrong" toast on `booking-quote` failure with the specific "This date isn't available — try another" copy.
5. **iOS safe-area.** Add `pb-[env(safe-area-inset-bottom)]` to the drawer trust footer and Studio guest-details footer if the harness shows either clipped.

Anything unexpected the harness surfaces (broken selectors, missing fields, network 4xx/5xx) becomes an additional item in the report before I touch code.

## Out of scope

- `create-builder-checkout` (custom-built multi-day itineraries) — different product, not one of the three surfaces the user named.
- Corporate / Proposals — human-handled, not Stripe.
- Live-mode Stripe. Sandbox only.
- Any pricing-engine changes; manual pricing is already correct in the DB.

## Deliverable

A single report with:
- Per-surface screenshot strip (7 steps × 3 surfaces).
- Pass/fail table for each check above.
- The exact list of code edits applied (files + reason), or "no fix needed" per item.
- A final Stripe sandbox `session_id` proving end-to-end completion on each surface.

Files likely touched (only if the harness proves it):
- `src/components/checkout/BrandedCheckoutDrawer.tsx` (mobile sheet + safe area).
- `src/components/booking/BandedSignatureBookingForm.tsx` (error copy).
- `src/routes/tours.$tourId.tailor.tsx` (error copy, sticky bar).
- `src/components/studio-v3/GuestDetailsStep.tsx` (footer safe area, error copy).

No DB migrations. No edge-function changes expected.
