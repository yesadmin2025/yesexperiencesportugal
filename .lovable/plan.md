# Signature booking — adults + minor ages across the full flow

## Current state (audit)

Already correct:

- `Composition.tsx` — collects `adults` + per-child ages (Studio V3).
- `signatureTourPricing.ts` — owner-approved bands (adult 100% / youth 11–17 75% / child 3–10 50% / infant 0–2 free); `ageBand()`; `resolvePerPaxEur()` per real Viator tier via `tour_price_tiers`.
- `useResolvedJourney` — single source of truth for Studio V3.
- Edge function `create-signature-checkout` — already accepts `adults` + `minorAges[]`, rejects out-of-band ages, prices from `tour_price_tiers` server-side.

Gaps (what this fix closes):

1. **SimpleBookingForm** (Signature listing + `/tours/$tourId` "reserve as-is") — `guests` stepper only, no minors, sends only `guests` to the edge fn → minors silently billed as adults.
2. `**/tours/$tourId/tailor**` — `guests` stepper only; same problem.
3. **FinalDetailsDialog** (used by both flows above) — `guests` field only.
4. **GuestDetailsStep** (Studio V3 recap) — `guests` re-entry despite upstream Composition already having the truth.
5. **BrandedCheckoutDrawer** — summary shows `X guest(s)`, no adults/minors breakdown.
6. `**/checkout/$token**` — legacy resume form still uses `guests` only.
7. `**booking-confirmed**` — displays `guests` only.
8. **Edge fn legacy fallback** — when `adults`/`minorAges` absent, treats every seat as adult. Once all clients send composition, tighten to reject requests without it (with a short compat window keyed by a flag from callers).

## Changes

### Shared traveller-composition primitive

New `src/components/booking/CompositionField.tsx` — extract the adults + minor-age UI from `studio-v3/Composition.tsx` into a reusable field:

- Adults stepper (min 1, max 12).
- "Travelling with children?" toggle; per-minor age input (0–17 integer).
- Emits `{ adults: number; minorAges: number[] }`; `isComplete` false while any minor age is empty.
- Same brand tokens, 44×44 tap targets, visible focus.
- `Composition.tsx` re-exports for backwards compatibility.

### Shared client helper

New `src/lib/checkout/composition.ts`:

- `type TravellerComposition = { adults: number; minorAges: number[] }`
- `totalGuests(c)` → `adults + minorAges.length`
- `formatCompositionSummary(c)` → e.g. `"4 guests · 2 adults · children aged 8 and 13"`
- `hydrateLegacyComposition(saved)` — accepts `{guests}` OR `{adults,minorAges}`; migrates the former to `{adults: n, minorAges: []}` (compat only; not used for new quotes without explicit user confirmation via the field).

### Entry points updated

`**SimpleBookingForm**` — replace `guests` stepper with `<CompositionField>`; block "Continue" while composition incomplete; on submit send `{adults, minorAges, guests: adults+minorAges.length, priceFromEur}` to `create-signature-checkout`; update GA add-to-cart/begin-checkout `quantity` = total headcount.

`**/tours/$tourId/tailor**` — same swap; keep add-on pipeline unchanged; propagate composition into the FinalDetailsDialog `initial`.

`**FinalDetailsDialog**` — accept `initial.adults`/`initial.minorAges`; render `<CompositionField>` (replaces raw `guests` stepper); return `{adults, minorAges, tourDate, language, pickupAddress}`; block submit on missing age. Callers stop passing `guests` in isolation.

**Studio V3 `GuestDetailsStep**` — drop the `guests` re-entry; pre-populate and reuse the upstream `useResolvedJourney` composition, showing a read-only recap ("2 adults · children aged 8, 13 · Edit") with an Edit CTA that scrolls to Composition. No double capture.

`**BrandedCheckoutDrawer` summary** — accept `adults`/`minorAges`; show `formatCompositionSummary()` line instead of bare `X guests`. Total math unchanged (per-pax × headcount + add-ons) since server is source of truth, but if `adults`/`minorAges` provided the drawer displays band-priced per-pax breakdown from server response (fallback to current display if absent).

`**/checkout/$token**` resume flow — hydrate composition via `hydrateLegacyComposition`; if legacy `{guests}` only, force the user through `<CompositionField>` before re-quoting (never silently re-quote adult-priced).

`**booking-confirmed**` — display composition line from the stored booking record.

### Persistence

- `StudioV3State` already carries `adults`/`minorAges` — no schema change.
- `studio_v3_leads` / draft rows: no migration needed (JSON payload). Add `adults`/`minorAges` when saving from the new forms.
- Bookings written by the edge fn already store the composition on the metadata; verify the fields are read in `booking-confirmed`.

### Server-side (edge function)

`supabase/functions/create-signature-checkout/index.ts`:

- Keep age-band pricing exactly as-is (owner-approved on 2026-07-14 — no invention).
- **Tighten legacy fallback**: require `adults` + `minorAges` when caller sends `X-Composition-Required: 1` header (all updated clients will send it). Missing/incomplete → HTTP 422 with explicit `{error: "composition_required"}`. Old callers without the header keep the current adult-only path for one release only.
- **Missing tier data**: current fallback uses `priceFromEur` anchor even with minors. Change: when composition contains minors AND `tour_price_tiers` row is absent for the tour, return HTTP 409 `{error: "owner_data_missing", detail: "Child pricing not yet configured for <tourId>"}` — do NOT silently apply anchor. Anchor fallback stays allowed for adults-only bookings.
- Stripe metadata: add `adults`, `minor_ages` (comma-joined), `headcount`.

### Verification

Playwright script under `/tmp/browser/booking-composition/`:

1. `/tours/porto-douro-yacht-experience` → SimpleBookingForm: adults=2 only → continue → confirm quote uses adult price × 2.
2. Same tour: adults=2 + one 8yo → continue → drawer shows composition line + server total reflects 50% child band.
3. Add multiple minors of different ages; leave one age blank → Continue disabled; screenshot state.
4. Back/forward navigation preserves composition.
5. Tailor flow: enter composition on `/tours/.../tailor`, transition into checkout drawer → composition line unchanged, no re-entry.
6. Studio V3: verify GuestDetailsStep shows recap (not stepper); reveal + summary + Stripe metadata all match.
7. Missing tier data: temporarily point at a tour with no `tour_price_tiers` row + minor age → expect HTTP 409, no charge.
8. Contract test on the edge fn: POST `{adults:2, minorAges:[8,13]}` returns headcount 4 and priced 2×adult + 1×child(50%) + 1×youth(75%).

## Report deliverables (post-implementation)

1. Files changed.
2. Signature entry points updated (list).
3. Pricing source: `public.tour_price_tiers` (server) + `signatureToursViator.priceTiersEUR` (display); age bands from `signatureTourPricing.ts` (owner-approved 2026-07-14).
4. Tours missing approved minor pricing (query `tour_price_tiers` for signature ids without rows).
5. Test results from the Playwright + contract runs above.
6. Confirmation that no new age rule was invented — bands unchanged.

On every signature on the signature page should have the rating 

## Out of scope

Studio V3 already-shipped Composition/pricing/useResolvedJourney; Bokun handoff (booking still stops at Stripe today); redesign of any Signature page; email template copy beyond adding composition line to confirmation.