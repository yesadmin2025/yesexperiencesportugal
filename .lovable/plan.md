## Bókun-authoritative pricing, availability & guest categories — one coherent model

Bókun becomes the upstream source for availability, categories, ages, prices, capacity and reservation quantities across Signature, Tailored and Studio V3. The DB mirror is for previews and admin comparison only. No downstream stage rebuilds the price.

Runtime precedence (enforced everywhere):
`bokun-live quote → active manual override → synced mirror (preview) → code default (placeholder)`.

Delivered in 3 phases behind a per-tour `banded_pricing_enabled` flag. UI stays off until Phase B tests pass.

---

### Phase A — Data + live-quote foundation (no UI activation)

**A1. Shared category model + schema.** Migration adds to `tour_price_tiers`:

- `synced_tiers jsonb`, `override_tiers jsonb null`, `override_metadata jsonb null`
- `pricing_mode text check in ('flat','date-dependent','slot-dependent','inconsistent')`
- `bokun_categories jsonb` reshaped to `MappedBokunPricingCategory[]` — `{bokunCategoryId, bokunTitle, minAge?, maxAge?, uiBand: adult|youth|child|infant|other, countsTowardCapacity, normallyFree, mappingStatus: confirmed|suggested|unmapped}`
- `banded_pricing_enabled boolean default false`, `synced_from_bokun_at`, `source_version`
- Backfill: move current `tiers` → `synced_tiers`; unchanged reads keep working via a view/normaliser.

New `tour_bokun_option_mapping (tour_id, bokun_product_id, bokun_option_id, bokun_rate_id null)` to bind option/rate, not just product. GRANTs to `authenticated` (SELECT) + `service_role`, RLS admin-only writes.

**A2. Bókun client audit + reuse.** In `supabase/functions/_shared/bokun.ts`: keep auth/HTTP helpers; add strongly-typed helpers for `activity + options + rates + categories`, `availability slot`, and `price-catalog for (product, option, rate, date, slot)`. Return real IDs, ages, unit prices, currency, capacity, available qty, extras — no inference from activity metadata alone.

**A3. `sync-bokun-pricing` rewrite (safe, additive).**

- Load existing option/rate mapping + previously confirmed category mappings; never reclassify a confirmed row.
- Probe representative dates to detect `pricingMode`; if variance across dates/slots → mark date/slot-dependent, do NOT flatten.
- Emit dry-run diff: tour, product, option, rate, category, ageRange, prevSynced, newSynced, override, pricingMode, mappingConfidence, warnings.
- Write only `synced_tiers` + `bokun_categories` + `pricing_mode` + `synced_from_bokun_at`. Never touch `override_tiers`.
- Ambiguous categories stored `mappingStatus:'suggested'` or `'unmapped'` — not auto-confirmed.

**A4. New `bokun-quote` edge function (server live quote).**
Input: `{internalProductKey, bokunProductId?, bokunOptionId?, bokunRateId?, availabilityId?, date, startTime?, guestMix, selectedAddOns[], signatureRevision?}`.
Server: validates mapping → revalidates slot → resolves per-category unit prices for that exact slot → computes `pricingPartySize` via product rule (`all_participants` vs `billable_participants`) → resolves Bókun extras + approved external add-ons server-side → signs a `quoteToken` (HMAC, ~10 min TTL) binding `{productId, optionId, rateId, availabilityId, date, startTime, categoryIds+qty, addOns, totalEur, revision}` → returns `LivePriceBreakdown`. No Stripe in quote mode.

**A5. Shared pricing contract + parity tests.** Keep `src/lib/pricing/ageBandPricing.ts` and `supabase/functions/_shared/ageBandPricing.ts`; add category-aware fields (band + bokunCategoryId + ageRange + countsTowardCapacity). Add fixtures suite (adult-only, adult+child, adult+youth+child, free infant, paid infant, total vs billable bucket, override, missing category, date-dependent, rounding, capacity) — run identically in Vitest and Deno test; assert byte-equivalent normalised results.

---

### Phase B — Checkout + booking correctness (flag still off)

**B1. `create-signature-checkout` becomes quote-verifying.** Client sends `{quoteToken, currentRevision, guestDetails}` only — no prices. Server: verify signature+expiry → revalidate exact slot + each category availability → recompute total from Bókun → if drift, reject with `quote_stale`. Only then create Stripe session with one line item per non-empty paid category (`"<Tour> — Adult × 2"`, etc.). Infants omitted from paid lines when €0 but present in Stripe metadata + booking. Metadata: `{adults,youths,children,infants,totalParticipants,pricingCategoryIds,availabilityId,optionId,rateId,quoteRevision,totalEur}` (compact, within Stripe 500-char limits).

**B2. `stripe-webhook` — remove single-category path.** Delete `slot.pricingCategories?.[0]` fallback (line 266). Build `pricingCategoryBookings: [{pricingCategoryId, quantity}]` per non-zero band from metadata; include infant even at €0. Capacity check uses `totalParticipants`. If required category absent from the exact slot → `booking.status='needs_review'`, do NOT convert to Adult, do NOT swap slot. Same product/option/rate/availability/category IDs verified pre-Stripe.

**B3. `test-webhook-simulate` — same rewrite.** Fix lines 110/220 to iterate all requested categories.

**B4. Studio V3 commercial mapping.** Introduce `commercialProductKey` (`studio-v3-private-full-day`, `studio-v3-half-day`, `studio-v3-multi-day`). Bind to a real Studio Bókun product where mapped; otherwise availability & pricing = `pending-review`. Explicit ban: never fall through to azeitao-cheese / arrabida-wine / nearest Signature.

**B5. Availability status states.** `available | pending-review | unavailable`. "Instant confirmation" copy suppressed when boat/supplier/category is pending or slot unvalidated.

---

### Phase C — UI (staged per-tour rollout)

**C1. `<GuestCompositionPicker />**` — one shared component driven by resolved `bokunCategories`:

- Renders only supported bands (adult / youth / child / infant); hides missing bands.
- Age helper text sourced from confirmed Bókun `minAge/maxAge`, never hard-coded.
- Emits `GuestMix {adults, youths, children, infants}` used everywhere.

**C2. Placement.**

- Signature (`SimpleBookingForm`) + Tailored (`SimpleTailorForm` upgrade): after date + experience, before final price.
- Studio V3: composition captured after questionnaire (early enough for vehicle/capacity), price only after itinerary+date+slot+live quote resolved. Sequence: questionnaire → Who is travelling → refine → date/slot → live quote → Final Signature → Guest Details → Stripe.

**C3. `useBokunQuote(input)` hook** — invokes `bokun-quote`, holds `{status, breakdown, quoteToken, expiresAt}`, auto-invalidates on any input change (guests/date/slot/add-ons/revision). Same breakdown rendered by SimpleBookingForm, FinalDetailsDialog, studio-v3 GuestDetailsStep, Final Investment card. No component may compute `eurPerPax × guests` when mixed categories exist.

**C4. `/admin/pricing` upgrade.** Add:

- Category mapping panel per tour: confirm / reject / edit `uiBand` for each Bókun category; shows ageRange + `mappingStatus`.
- Side-by-side columns: Synced (Bókun) · Override · Effective preview.
- Pricing-mode badge + last-sync timestamp + unmapped/date-dependent warnings.
- Override editor writes `override_tiers` + `override_metadata {createdBy, reason, createdAt, expiresAt?}`; visibly labelled "OVERRIDE".
- Per-tour `banded_pricing_enabled` toggle (locked until adult confirmed + all required categories mapped + webhook parity green).

**C5. Rollout gate.** A tour cannot be enabled unless: Adult mapped + all required categories present + `pricing_mode` known + a passing end-to-end test booking (quote → Stripe test → webhook `pricingCategoryBookings` verified).

---

### Test matrix (Phase A→B gate + Phase C activation gate)

- Mixed party 2A/1Y/1C/1I → website = quote = Stripe = webhook quantities; infant free but in capacity.
- Slot missing Child → `needs_review`, no Adult substitution.
- Two dates different prices → mode = `date-dependent`; preview shows "from"; charge = selected date's live value.
- Slot swap after quote → old token invalid, refuses booking.
- Studio guest-mix change post-Refine → old quote discarded, itinerary retained, new quote issued.
- Contract-parity suite: browser + edge pricing modules on identical fixtures.

### Files touched (indicative)

Edge: `_shared/bokun.ts`, `_shared/ageBandPricing.ts`, `sync-bokun-pricing/index.ts`, `create-signature-checkout/index.ts`, `stripe-webhook/index.ts`, `test-webhook-simulate/index.ts`, new `bokun-quote/index.ts`.
Frontend: `src/lib/pricing/ageBandPricing.ts`, `src/hooks/use-tour-price-tiers.ts`, new `use-bokun-quote.ts`, new `components/booking/GuestCompositionPicker.tsx` + `LivePriceBreakdown.tsx`, edits to `SimpleBookingForm.tsx`, `SimpleTailorForm.tsx`, `checkout/FinalDetailsDialog.tsx`, `studio-v3/GuestDetailsStep.tsx` + Final Signature, `routes/admin.pricing.tsx`.
Migrations: schema extension + `tour_bokun_option_mapping` + `banded_pricing_enabled` flag.

### Non-goals in this plan

- No new Bókun integration; reuse existing auth/client.
- No browser-side Bókun calls.
- No hidden "last write wins" — overrides are explicit and labelled.
- No compression of real Bókun categories into 4 hard-coded bands at storage layer.
- No going live on any tour before the rollout gate above is green.

### Completion report shape (returned at end of build)

Bókun endpoints reused · product/option/rate/category mappings · pricing modes per tour · ambiguous categories · manual overrides · files/migrations · tests passed · first product enabled · Stripe mixed-line result · webhook booking payload · Studio behaviour · remaining config.

Phase A start 