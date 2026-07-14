## Goal

Completely delete Bókun from the codebase and restore the pre-Bókun booking flow: internal `tour_price_tiers` + `VIATOR_META.priceTiersEUR` → Stripe checkout. Add child pricing using fixed age bands applied uniformly to every tour.

## Age-band rule (final)

Applied identically to all 12 Signature tours, computed against the resolved per-pax adult rate for the party size:

- Infant 0–2 → free (not counted in party size for pricing tier lookup)
- Child 3–11 → 50% of adult per-pax
- Youth 12–17 → 75% of adult per-pax
- Adult 18+ → 100% (party size = adults + youths + children for tier resolution)

Encoded once in a new `src/lib/pricing/ageBands.ts` (client + edge share via a small mirror in `supabase/functions/_shared/`).

## Deletions (hard remove — not stubbed)

### Edge functions (delete entire directories)
- `supabase/functions/bokun-quote/`
- `supabase/functions/bokun-availability/`
- `supabase/functions/bokun-list-products/`
- `supabase/functions/sync-bokun-pricing/`
- `supabase/functions/sync-all-bokun-pricing/`
- `supabase/functions/audit-bokun-mapping/`
- `supabase/functions/booking-quote/` (Bókun-coupled quote endpoint — replaced by pure client-side pricing)

Remove their entries from `supabase/config.toml`.

### Shared edge modules (delete)
- `_shared/bokun.ts`, `bokunCategories.ts`, `bokunQuoteToken.ts`, `bokunQuoteToken_test.ts`, `bokunQuoteRevalidate.ts`, `bokun_channel_test.ts`, `syncBokunPricing.ts`, `resolveCommercialMapping.ts`, `resolveQuote.ts`, `resolveInclusions.ts`, `bookingQuote.ts`, `bookingQuoteToken.ts`, `bookingQuoteToken_test.ts`, `manualPricing.ts`, `studioCommercialPricing.ts`, `quoteToken.ts`, `quoteSnapshotSchema.ts`, `ageBandPricing.ts`, `ageBandPricing_parity_test.ts`, `travellerComposition.ts` (kept only if create-signature-checkout needs the type — otherwise deleted).

### Client source
- `src/hooks/use-bokun-quote.ts`
- `src/hooks/use-tour-bokun-readiness.ts`
- `src/hooks/use-category-aware-checkout-ready.ts`
- `src/hooks/use-booking-quote.ts`
- `src/lib/pricing/bokunCategories.ts`
- `src/lib/pricing/bookingQuote.ts`
- `src/lib/pricing/bookingQuoteCheckout.ts`
- `src/lib/pricing/checkoutEligibility.ts`
- `src/lib/pricing/manualQuotePreview.ts`
- `src/lib/pricing/filterSignatureCandidatesForAges.ts`
- `src/lib/studio-v3/quoteClient.ts` Bókun paths (keep only internal-pricing checkout invocation)
- `src/components/booking/GuestCompositionPicker.tsx` — keep component, strip readiness/category dependency; drives `{adults, minorAges}` only
- `src/components/booking/BokunRolloutBadge.tsx` — delete
- `src/components/booking/LivePriceBreakdown.tsx` — rewrite to compute from internal pricing (no edge call)
- `src/components/booking/BandedSignatureBookingForm.tsx` — rewrite to internal pricing
- `src/components/admin/BokunCategoryMappingPanel.tsx` — delete
- `src/routes/admin.bokun-mapping.tsx` — delete
- Corresponding tests under `src/__tests__/sliceA…D`, `resolveCompositionAgainstCategories.test.ts`, `signature-booking-form-routing.test.tsx`, `src/lib/pricing/__tests__/manualQuotePreview.test.ts`, `checkoutEligibility.test.ts`, `bookingQuoteCheckout.retry.test.ts`, `src/lib/studio-v3/__tests__/quoteClient.retry.test.ts` (Bókun scenarios)
- E2E specs: `e2e/bokun-checkout-coverage.spec.ts`, plus Bókun-specific assertions in `checkout-full-flow.spec.ts`, `checkout-surfaces-smoke.spec.ts`, `instant-booking-checkout*.spec.ts`, `studio-v3-checkout-retry-and-failures.spec.ts`

### Admin/other
- `src/routes/admin.index.tsx`, `admin.bookings.tsx`, `admin.pricing.tsx` — remove Bókun sync buttons, readiness columns, mapping links
- `src/lib/tours/signatureRegistry.ts` — remove any Bókun readiness fields
- `src/routes/tours.$tourId.tailor.tsx` — remove Bókun quote path, use internal pricing directly
- `src/components/studio-v3/StudioV3.tsx`, `GuestDetailsStep.tsx`, `PriceWhisper.tsx`, `StudioLivePreview.tsx`, `elements.ts` — strip Bókun quote wiring
- `src/components/checkout/FinalDetailsDialog.tsx`, `BrandedCheckoutDrawer.tsx` — remove availability check, remove `checkoutEligibility` gating (always instant), remove `quoteToken` requirement
- `src/lib/checkout/checkoutError.ts`, its tests, and `supabase/functions/_shared/checkoutError.ts` — strip Bókun error codes
- `src/lib/email-templates/internal-booking.tsx`, `checkout-receipt.tsx` — remove Bókun reservation ID; use internal booking id
- `src/routes/api/public/hooks/checkout-email.ts` — remove Bókun dependency
- `SimpleBookingForm.tsx` — remove readiness hook usage
- Secrets to schedule for deletion after ship: `BOKUN_ACCESS_KEY`, `BOKUN_SECRET_KEY`, `BOKUN_CHANNEL_UUID` (I'll list them; user removes in Cloud UI)

### Database columns to drop (migration)
On `tour_price_tiers`: `bokun_categories`, `synced_from_bokun_at`, `synced_tiers`, `override_tiers`, `override_metadata`, `pricing_mode`, `source_version`, `banded_pricing_enabled`.
Drop tables `tour_bokun_mapping`, `tour_bokun_option_mapping`, `studio_commercial_bokun_mapping`.

## Rebuild — the restored flow

### 1. Internal pricing resolver (single source)
`src/lib/pricing/resolveInternalQuote.ts` (new, client-safe):

```
input:  { tourId, adults, minorAges, addOns?, dbTiersOverride? }
steps:
  1. adultsEquivalent = adults + youthCount + childCount   (infants excluded)
  2. perPaxAdult = resolvePerPaxEur(tour, adultsEquivalent, dbTiersOverride).eurPerPax
  3. lines:
       adults    → { qty: adults, unit: perPaxAdult }
       youths    → { qty: N,      unit: perPaxAdult * 0.75 }
       children  → { qty: N,      unit: perPaxAdult * 0.50 }
       infants   → { qty: N,      unit: 0, isFree: true }
  4. addOns  → subtotal from tour_available_add_ons
  5. total   → sum of lines + add-ons (EUR, rounded to cents)
output: { lines[], addOnLines[], subtotalEur, finalTotalEur, currency: "EUR" }
```

Party-size tier lookup uses `adultsEquivalent` so a 2-adult + 2-child group is priced at the 4-pax tier. This matches how Viator prices real bookings.

### 2. Live tiers hook (kept, simplified)
`src/hooks/use-tour-price-tiers.ts` already reads `tour_price_tiers.tiers` — keep as-is, only the columns we removed above are gone.

### 3. `use-booking-quote` replacement
New `src/hooks/use-internal-quote.ts` — pure client, no network. Debounces `{ adults, minorAges, addOns }` and returns the resolver output synchronously. Zero edge dependency.

### 4. Checkout — `create-signature-checkout`
Rewrite handler to:
- Accept `{ tourId, date, startTime, adults, minorAges, addOns, contact }` (no `quoteToken`, no `availabilityId`).
- Re-run `resolveInternalQuote` **on the server** (mirror the resolver in `_shared/`) so client-declared totals cannot be tampered with.
- Create Stripe Checkout Session with the re-computed line items (adults / youths / children / add-ons) and store the resolved snapshot in `bookings.pricing_snapshot`.
- On webhook completion, insert booking row exactly like the pre-Bókun path. No reservation calls.

### 5. UI
- `BandedSignatureBookingForm` renders `GuestCompositionPicker` (adults + per-child age input) + `LivePriceBreakdown` (from internal resolver) + Reserve button → checkout. No readiness gate, no "enquiry only" state.
- Studio V3 uses the same resolver; strip `quoteToken` echo requirement.
- Contact/enquiry routes stay untouched.

### 6. Config
- `supabase/config.toml`: remove all Bókun function entries.
- `.env*`: remove BOKUN_* references from any client-visible files (they're server-only anyway).

## Migration (single file)

```sql
ALTER TABLE public.tour_price_tiers
  DROP COLUMN bokun_categories,
  DROP COLUMN synced_from_bokun_at,
  DROP COLUMN synced_tiers,
  DROP COLUMN override_tiers,
  DROP COLUMN override_metadata,
  DROP COLUMN pricing_mode,
  DROP COLUMN source_version,
  DROP COLUMN banded_pricing_enabled;

DROP TABLE IF EXISTS public.tour_bokun_option_mapping;
DROP TABLE IF EXISTS public.tour_bokun_mapping;
DROP TABLE IF EXISTS public.studio_commercial_bokun_mapping;
```

`tiers` jsonb, `bookings`, `booking_add_ons`, `tour_available_add_ons` are unchanged. Note: this deletes any manually-mapped Bókun category data — irreversible.

## Verification

1. `bun run typecheck` — must be clean after deletions (many imports will break; each is a target for the strip).
2. `bunx vitest run` — remaining pricing/checkout tests pass. Delete tests that only cover Bókun behaviour; add:
   - `resolveInternalQuote.test.ts` covering: adults only, mixed ages, all-infants (blocked), 8+ party clamps to tier 8, add-ons applied.
   - `create-signature-checkout` server-side re-compute matches client (tamper-resistance).
3. Playwright smoke on `/tours/arrabida-wine-allinclusive`: pick date, 2 adults + 1 child (age 8) + 1 infant → price shows adult×2 + child×0.5 + infant free → Reserve → Stripe test session opens (via sandbox key).
4. Console/network audit: no `bokun-*` function calls anywhere on the site.

## Out of scope (explicit — will not touch)

- No architectural refactor. No new pricing systems. No AI/gateway changes.
- No changes to the 12 tour catalog, imagery, copy, or brand tokens.
- No re-adding availability, category, readiness, or reservation-side logic.
- BYOK Bókun secrets stay in the vault (unused) until the user deletes them manually.

## Risks / user acknowledgements needed before build

1. **Real availability disappears.** Every date/time the user picks will accept Stripe payment; there is no upstream capacity check. Confirmed acceptable per your "site is in TEST MODE" guardrail.
2. **Fulfilment becomes manual.** Bookings land in the `bookings` table + email; no auto-reservation on Bókun (or anywhere). Ops must handle each one.
3. **Age-band multipliers are hardcoded** (50/75%). Changing them later requires a code change, not an admin toggle.
4. **Irreversible column drop.** Any custom mappings the user configured in `tour_price_tiers.bokun_categories` or the three `*_bokun_mapping` tables are permanently deleted.

Approve to enter build mode and execute in this order: (1) migration → (2) delete files → (3) rewrite resolver + checkout function → (4) rewrite booking form + Studio wiring → (5) tests → (6) Playwright smoke.
