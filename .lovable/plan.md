# Checkout — Summary + Payment

Simplify `src/components/studio-v3/CheckoutSummary.tsx` so the summary card shows exactly the five items requested, in order, then Stripe below. Zero price math on this surface.

## Summary card (top) — exact contents, in order

1. **Date** — `guestDetails.tourDate ?? state.dateExact`, formatted
2. **Guests** — `formatGuestComposition(adults, minorAges, guestDetails.guests)` → "N guests (X adults, Y children)" — same helper the refine page uses
3. **Stops** — resolved from the same priority chain the reveal uses: `state.editedRoutePoints` → composed stops passed via a new `composedStops` prop → `tour.stops`. Rendered as a compact stacked list of stop labels only (no stories, no numerals). Guarantees the checkout stops match refine exactly.
4. **Add-ons** — `selectedAddOns` from props, each row `· label ······ €price` using existing `formatEur` (display only, no math)
5. **Total** — `totalEur` from props, with `perPaxEur` as small subline. **No calculation** — both values come straight from the same props the refine page uses.

## What is removed from the summary card

To eliminate "checkout confusion" and honor the strict list:
- Pickup row
- Language row
- Start time row
- Travellers age-band block (`resolveJourneyPricing(...)` → itemized per-traveller %/€) — this is a derived recalculation on the page and is explicitly out per "DO NOT recalculate price here"
- "Included" list (inclusions) — belongs to the reveal, not the payment step

Also removes the "Download one-pager (PDF)" CTA on this surface — not part of the requested layout, adds cognitive load right before payment. PDF stays available on the reveal (unchanged).

## What is kept (unchanged behavior)

- Back button (top-left)
- Header: eyebrow + `CHECKOUT_HEADER` + italic tour title
- Guest identity recap (name / email / phone + Edit button) — this is *who is booking*, not pricing, and is required for trust before payment
- `INSTANT_CONFIRMATION` reassurance line
- Bottom: Stripe Embedded Checkout when `clientSecret + publishableKey` are set; otherwise sticky "Reserve and pay" CTA that opens the session (existing logic, untouched)
- All existing testids: `studio-v3-checkout-summary`, `-cta-bar`, `-reserve`, `-stripe-inline`. The removed `-travellers` and `-pdf` testids go with the removed blocks — checked against e2e specs before deletion.

## Wiring

**File edited:** `src/components/studio-v3/CheckoutSummary.tsx`
- Drop imports no longer used: `Download`, `Loader2`, `CtaButton` (still used by sticky bar — keep), `BookingCtaSkeleton` (still used — keep), `resolveJourneyPricing`, `pdf`, `@react-pdf/renderer`, `signatureOnePagerPdf`, PDF state + handler.
- Add prop `readonly composedStops?: ReadonlyArray<{ label: string }>` (optional; deep-link edge case falls back to `tour.stops`).
- Resolve `stopsForSummary` using the same chain as FinalRevealStory.

**File edited:** `src/components/studio-v3/StudioV3.tsx`
- At the CheckoutSummary mount, pass `composedStops={resolvedStops}` — reusing the same value already computed for the refine/reveal surfaces (no duplication, single source of truth).

## Verification

- Typecheck + build pass
- Grep for `studio-v3-checkout-summary-travellers` and `studio-v3-checkout-summary-pdf` in `e2e/` and `src/` to confirm no test relies on them; if any do, patch those specs in the same turn.
- Mobile 393×588 walkthrough: exactly five summary rows visible in the card (Date, Guests, Stops, Add-ons, Total) → Stripe below (or sticky Reserve CTA)
- Toggle add-ons upstream → row list + total update via the same props the refine page uses (proves same source of truth)
- Regression: existing Stripe embedded flow still mounts, still fires `onPaymentComplete`

## Out of scope

- No pricing/logic changes (`totalEur`, `perPaxEur`, add-on selection, session creation edge function)
- No changes to Guest Details step, Reveal, Refine, or PriceCard
- No copy changes to `INSTANT_CONFIRMATION`, `CHECKOUT_HEADER`, `CTA_RESERVE_AND_PAY`
- No backend / Supabase / Stripe function changes
