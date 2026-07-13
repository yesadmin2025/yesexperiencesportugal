## Goal

Ship a live public Signature booking flow that quotes prices from the existing `tour_price_tiers` adult data (Viator) with server-computed underage bands, WITHOUT any Bókun call. All 12 Signature tours become bookable today; Bókun availability + category mapping stay untouched for a later phase.

## Age-band rule (locked)

Applied uniformly to all 11 tours, computed server-side from the adult per-pax tier:

- Adult (18+) = 100% of the adult per-pax tier for the party size
- Youth (13–17) = 80% of adult
- Child (3–12) = 50% of adult
- Infant (0–2) = free (€0)

Party size for the tier lookup = adults + youth + children (infants excluded). Per-pax adult tier is the existing `tiers` map (1..8, clamped).

## Files changed

1. `supabase/functions/_shared/bookingQuote.ts`
  - Add a `manual` pricing branch: given a tour with adult tiers in DB, compute per-pax + total from the composition using the 100/80/50/0 rule.
  - Return a normal `available` envelope with server labels ("Adult", "Youth (13–17)", "Child (3–12)", "Infant (0–2, free)"), unit price per band, line subtotals, and grand total in EUR.
2. `supabase/functions/booking-quote/index.ts`
  - Short-circuit BEFORE `resolveCommercialMapping` / Bókun: if the tour row has adult tiers (all 11 do), take the manual path. No `no_commercial_mapping`, no `bokun_unreachable`, no availability lookup.
  - Treat every future date as available (reject only past dates and dates > 18 months out).
  - Keep the existing signed-quote token pipeline so Stripe checkout still validates the snapshot server-side.
3. `supabase/functions/create-signature-checkout/*`
  - Accept the manual-mode quote token unchanged (it's already signed by `bookingQuoteToken`). No Bókun reservation call; PaymentIntent metadata gets `pricing_source: "manual_viator_tiers"` so ops can reconcile with Bókun by hand after payment.
4. `src/components/booking/BandedSignatureBookingForm.tsx`
  - Remove any client-side gate that waits on `readiness.bokunCategories` — the manual quote does not need them. Empty readiness = fetch quote anyway (already done in the last pass, verify).
  - Display the four server labels + prices exactly as returned; no client math.
5. `src/generated/brand-audit.json`
  - Log the manual-mode toggle for the audit trail.

No DB migration needed — the existing `tour_price_tiers.tiers` (adult map) is the single input. `pricing_mode`, `banded_pricing_enabled`, `bokun_categories` stay as-is and unused by this path.

## Verification (before returning)

- Call `booking-quote` for all 11 Signature tours with composition `{ adults: 2, minorAges: [8, 0] }` and a future date. Expect `available`, 4 lines (or 3 when no youth), Adult €×tier, Child = 50%, Infant €0.
- Confirm no Bókun HTTP call fires (check edge logs).
- Full Stripe sandbox smoke on `/tours/arrabida-boat#book`: quote → Reserve → PaymentIntent created → `checkoutCalls = 1` → 393px screenshot of the paid confirmation.
- Confirm no public Signature route can render the legacy adults-only fallback (grep + the existing routing test).

## Return payload (to user, after build)

- Root cause (Bókun channel empty, but pricing was already in DB — no reason to block launch on the sync)
- Files changed
- Signature route coverage: 11/11
- Exact outgoing `booking-quote` payload for `arrabida-boat` + `{2 adults, 1 child 8, 1 infant 0}`
- Server-resolved labels rendered
- 393px screenshot of quote + reserve + Stripe confirmation
- Stripe PaymentIntent id, `checkoutCalls` count
- Confirmation that no Bókun call fires anywhere in the manual path