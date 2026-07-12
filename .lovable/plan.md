Implement the one-model instant checkout for Signature, Tailored and Studio V3. No dashboard, no phased rollout, no human-review path.

## Commercial model (locked)

`finalTotalEur = liveBokunBaseSubtotal + serverAddOnSubtotal`. Bókun is authoritative for base (product/option/rate/slot/categories/prices/capacity/availability). The database is authoritative for add-ons. Browser is never authoritative for anything.

Runtime precedence: live Bókun quote → active DB add-ons → synced mirror (preview only) → code defaults (placeholder only). A synced/default price never becomes the Stripe amount.

## 1. Universal traveller composition

- Type `TravellerComposition = { adults: number; minorAges: number[] }` in `src/lib/pricing/travellerComposition.ts`. Legacy `guests: N` normalises to `{ adults: N, minorAges: [] }`.
- Server resolves each `minorAges[i]` against the SELECTED product+option+rate+slot's real Bókun categories (adult/youth/child/infant ranges vary per product). Never hard-coded.
- Capacity always uses `adults + minorAges.length`. Infants count.

## 2. Shared "Who is travelling?" component

New `src/components/booking/TravellerCompositionPicker.tsx`:

- Adults stepper (min 1 unless product allows 0), Minors (0–17) stepper, one age field per minor.
- Preserves entered ages when minor count changes.
- Once a live quote resolves, shows `Age 15 · Youth` next to each minor from the server's resolved category.
- Mobile-first at 393px. Replaces `GuestCompositionPicker` on public flows.

## 3. Provider-neutral quote contract + hook + breakdown

- Contract `BookingQuote` (exact shape from spec) in `src/lib/pricing/bookingQuote.ts`, shared by browser and edge.
- Server endpoint: extend `supabase/functions/bokun-quote` to accept `{ flow, commercialProductKey, date, startTime?, availabilityId?, travellerComposition, selectedAddOns, pricingRevision, itineraryRevision?, itinerarySnapshot? }` and return `BookingQuote` (no pending-review; only `available` or `unavailable`). Persist the authoritative snapshot server-side in a new `booking_quotes` row keyed by `quoteId`, signed via existing `STUDIO_QUOTE_SIGNING_SECRET` (reuse `bokunQuoteToken.ts`).
- New hook `src/hooks/use-booking-quote.ts` — one hook for all three flows, replaces per-flow pricing hooks on public surfaces.
- New component `src/components/booking/LivePriceBreakdown.tsx` — one line per non-zero paid Bókun category plus each add-on line, always includes free infants as `Free`. Used in Signature summary, Tailored summary, Studio Final Signature, Guest Details, Checkout Summary.

## 4. Commercial identity by flow

- Signature/Tailored: existing `tour_bokun_option_mapping` (product+option+rate). Tailored itinerary edits DO NOT change base mapping.
- Studio V3: dedicated commercial skeleton `commercialProductKey = "studio-v3-private-full-day"`. Add a `studio_commercial_bokun_mapping` row (single row) with real Bókun product/option/rate for the private full-day skeleton. **Studio must never resolve to any Signature tour's Bókun mapping** — enforced with an explicit deny path in `resolveCommercialMapping()`.

## 5. Revisions

- `pricingRevision` bumps on: date, slot, adults, minor count, any minor age, commercial product, duration, vehicle class, operating-zone product, add-on selection, add-on quantity.
- `itineraryRevision` bumps on: stops, order, narrative, standard itinerary content.
- Itinerary-only edits keep the base quote valid; only the signed itinerary snapshot updates.

## 6. Add-on catalogue (server-owned)

- New table `booking_add_ons` (id text pk, label text, pricing_unit text check `per_person|per_group|per_vehicle|fixed`, unit_eur numeric, active bool, created_at, updated_at). GRANTs + RLS: `SELECT` to anon for `active = true`, `ALL` to service_role.
- Junction `tour_available_add_ons(tour_id, add_on_id)` for which tours expose which add-ons (Signature/Tailored) plus a `studio` scope flag.
- Seed with the current approved add-ons from `signatureAddOnCatalogue.ts` (migrated once, then that file becomes deprecated for pricing).
- Server resolves add-on subtotal from IDs+quantities only. Browser-sent unit prices are ignored/rejected.

## 7. Stripe checkout — parity enforced

Browser sends only `{ quoteToken, currentPricingRevision, currentItineraryRevision, guestDetails }`.

`create-signature-checkout` (rename responsibilities, keep the function name so URLs don't break):

1. Verify signature + expiry, load stored quote from `booking_quotes`.
2. Confirm current `pricingRevision` matches stored.
3. Revalidate Bókun slot + categories + capacity (reuse `bokunQuoteRevalidate.ts`, extend to full multi-category).
4. Re-resolve add-ons from DB.
5. Reject on any drift/change/expiry (`quote_stale`, `slot_unavailable`, `add_on_invalid`).
6. Create one Stripe line item per non-zero paid Bókun category + one per add-on. Free infant stays in stored quote + Stripe metadata + booking record + Bókun reservation payload, omitted from paid lines.

## 8. Webhook — real category bookings

`stripe-webhook/index.ts`: build Bókun `pricingCategoryBookings` from the stored verified quote (adult/youth/child/infant with real `pricingCategoryId`s + quantities, omitting zeros). Remove every `slot.pricingCategories?.[0]` shortcut.

## 9. Flow wiring

- `SimpleBookingForm` (Signature) and `BandedSignatureBookingForm` → replaced by one `InstantBookingForm` using `TravellerCompositionPicker` + `useBookingQuote` + `LivePriceBreakdown`.
- Tailored surface consumes the same `InstantBookingForm` with `flow: "tailor"` and passes `itinerarySnapshot` on refresh.
- Studio V3 Guest Details + Final Signature + Checkout Summary consume the same hook + breakdown with `flow: "studio"`, `commercialProductKey: "studio-v3-private-full-day"`. Ask "Who is travelling?" early (before itinerary creation) per spec §6.
- Checkout drawer submits only `{ quoteToken, pricingRevision, itineraryRevision, guestDetails }`.

## 10. Copy hygiene

Remove "Pending human review / Pending itinerary validation / Subject to pricing confirmation / Supplier confirmation required" from public supported selections. "Instant confirmation" copy only renders after the server-verified quote is present. Unavailable states show the exact strings from spec §19.

## 11. Launch tests (Playwright, gate build)

New `e2e/instant-checkout-launch.spec.ts` with the exact 9 cases from spec §21:

1. Signature adult-only (2 adults) — visible total = Stripe total, Bókun categories correct.
2. Signature mixed family (2 adults, ages 15/8/1) — infant free, total participants 5, category quantities correct.
3. Tailored itinerary edit — `itineraryRevision` bumps, `pricingRevision` unchanged, base price valid, checkout available.
4. Tailored add-on toggle — base unchanged, add-on subtotal + Stripe total change correctly.
5. Studio itinerary edit — stays mapped to `studio-v3-private-full-day`, pricing unchanged.
6. Studio guest change — pricing revision bumps, old quote invalid, new resolution runs.
7. Slot change — old quote invalid, checkout blocked until new quote ready.
8. Add-on tampering — browser-sent unit price ignored, DB value used.
9. No Signature leakage — Studio quote's `commercialMappingId` is never a Signature mapping.
10. Mobile 393px picker — a11y + hit targets.

Run against localhost via existing Playwright infra. Real browser walkthroughs for Signature/Tailored/Studio also executed at completion, returning: files changed, Bókun product/option/rate, categories+ranges, composition, base + add-on breakdown, visible total, Stripe total, Bókun booking payload, screenshots.

## Files to create

- `src/lib/pricing/travellerComposition.ts`
- `src/lib/pricing/bookingQuote.ts`
- `src/components/booking/TravellerCompositionPicker.tsx`
- `src/components/booking/LivePriceBreakdown.tsx`
- `src/components/booking/InstantBookingForm.tsx`
- `src/hooks/use-booking-quote.ts`
- `supabase/functions/_shared/resolveCommercialMapping.ts`
- `supabase/functions/_shared/resolveAddOnsFromDb.ts`
- Migration: `booking_add_ons`, `tour_available_add_ons`, `studio_commercial_bokun_mapping`, `booking_quotes` (all with GRANTs + RLS).
- `e2e/instant-checkout-launch.spec.ts`

## Files to edit

- `supabase/functions/bokun-quote/index.ts` — new input/output contract, persist stored quote.
- `supabase/functions/_shared/bokunQuoteToken.ts` + `bokunQuoteRevalidate.ts` — multi-category revalidation.
- `supabase/functions/create-signature-checkout/index.ts` — quote-token-only input, real category+add-on Stripe lines.
- `supabase/functions/stripe-webhook/index.ts` — real `pricingCategoryBookings` from stored quote.
- `src/components/SimpleBookingForm.tsx`, `src/components/booking/BandedSignatureBookingForm.tsx` — replaced by `InstantBookingForm` on public surfaces (files kept only as thin adapters if still referenced).
- `src/components/checkout/BrandedCheckoutDrawer.tsx` — send only `{quoteToken, ...}`.
- Studio V3 Guest Details / Final Signature / Checkout Summary — wire `useBookingQuote` + `LivePriceBreakdown`.
- Remove pending-review copy in Studio V3 status surfaces.

## Files to delete/deprecate

- `src/components/booking/GuestCompositionPicker.tsx` (superseded by TravellerCompositionPicker).
- `src/components/booking/BokunRolloutBadge.tsx` (rollout is no longer a public concept in the one-model world; kept only if admin surfaces still reference it).
- Pricing logic inside `signatureAddOnCatalogue.ts` collapses to seed data only.

## Prerequisite you'll need to confirm during build

**Studio commercial Bókun mapping**: I need the real Bókun `productId` + `optionId` + `rateId` for the `studio-v3-private-full-day` skeleton. If you already have one, paste it once when build starts; otherwise I'll seed the row disabled and every Studio walkthrough will fail loudly on that missing mapping (per spec §18: block, don't invent).

Approve to start building — I'll ask for the Studio mapping in the first build turn and then execute end-to-end.
