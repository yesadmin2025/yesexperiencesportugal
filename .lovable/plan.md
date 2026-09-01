# Curator booking panel + Studio intelligence pass

Two workstreams. The booking panel is small and shippable first. The Studio pass is large, so it is broken into ordered stages, each verified before the next starts. Nothing is published until you say so.

---

## Part 1 — Curator booking panel

The list at `/admin/bookings` already shows day, guests, amount and status, and the detail page already shows the frozen purchase snapshot (13 paid reservations in the database today). What is missing is control and context.

**List page**
- Status filters: all / paid / pending / cancelled / refunded, plus a toggle to sort by upcoming travel day instead of newest booked.
- CSV export of exactly what is filtered on screen, for accounting.
- Cancel button per row, with a confirmation dialog.

**Cancel dialog**
- Always sets the reservation to cancelled.
- Optional "also refund the payment in full" checkbox. When ticked, the refund is issued through the payment provider and the status becomes refunded. Refunds are irreversible, so the dialog states the exact amount and requires an explicit confirm.
- A required short reason, stored on the booking, so there is always a record of why.

**Detail page additions**
- The guest's own itinerary (the composed day as bought) and any notes the client left at checkout, shown in full rather than buried.
- A curator notes field you can write in and save at any time, with the last edit time. Free text, saved separately from anything the guest sees, never included in guest emails.

**Database**
- One migration adding curator notes, cancellation reason, cancelled-at and refund reference to the bookings table. Access stays admin-only.

---

## Part 2 — Studio: intelligent days, true prices, no friction

Ordered stages. Each ends with a mobile check at 393px and the Studio test suite green.

**Stage 1 — Reality audit (no code changes)**
Walk the live Studio on mobile as a real guest for several distinct profiles (wine, no-wine, family, hands-on, romance, culture) and record, per profile: which questions were asked, whether any repeated or felt generic, the composed day, per-stop prices, distances and timings versus reality, every field the guest is asked twice, and each image against the activity it claims to show. This produces a defect list with evidence instead of guesswork, and it decides the order of stages 2–6.

**Stage 2 — Checkout friction (highest conversion impact)**
- Guest details captured once and carried forward; nothing already answered in Studio is asked again at checkout.
- Party size, date and pickup flow straight through from the composed day.
- Payment step verified end-to-end on mobile for at least three profiles, including the certified Arrábida day.

**Stage 3 — Mobile flow**
- Single primary action visible at every step, thumb-reachable, never covered by the map or sticky bars.
- Steps fit the viewport without horizontal scroll or layout jumps between phases.
- Back and edit always available without losing the composed day.

**Stage 4 — Price, distance and time truth**
- Every stop in the composed day carries its real price contribution from existing approved pricing data; anything unpriceable fails closed to curator review as it does today.
- The displayed total equals the amount actually charged, for every profile tested.
- Distances and drive times come from the existing road-data authority; anything unproven is not shown as fact.
- No invented tours, stops, prices, inclusions or timings at any point.

**Stage 5 — Smarter questions, no repetition**
- Questions adapt to what the guest already revealed; nothing already known is asked again, and no acknowledgement is repeated.
- Each question changes the day in a visible way; questions that cannot change the outcome are not asked.
- Copy stays in the Studio voice: guided, cinematic, never a quiz.

**Stage 6 — Images loyal to activity, conversion polish**
- Each moment shows a real image of that activity from existing verified assets; no stock, no reused image standing in for a different stop.
- Reveal rhythm and final call to action tightened for conversion: value before price, one clear next step, no duplicate calls to action.

---

## Technical notes

- Booking panel: new admin-only server functions for cancel-with-optional-refund and save-curator-notes, both re-verifying the admin role server-side and validating input with zod. Refunds go through the existing payment integration; no new payment path.
- Migration adds columns only, with admin-only access; existing rows and the frozen snapshot contract are untouched.
- Studio work stays inside the existing authorities: composition, route truth, time gate, commercial ledger and fail-closed booking gate are reused, not replaced. No second pricing or timing engine.
- Locked and untouched: approved Tailor rules and amounts, rhythm stop counts, exact-tier pricing, generic winery presentation, Travel File paid-only access, protected generated files.
- Verification per stage: focused Studio tests, full typecheck, and a real mobile pass in a headless browser with screenshots.
- Nothing is published until you approve the result.
