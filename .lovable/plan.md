# Launch: full Bókun mapping, family pricing, Studio eligibility (v2 — approved)

Same contract as the previous plan, with the four final execution rules integrated. Approving this switches me to build mode and I'll execute end-to-end.

## Four final rules (override previous plan where conflicting)

**R1 — Readiness is per-composition, not per-age-range.** Drop the "0–17 coverage" gate. A tour is bookable when: every returned Bókun category on the mapped option/rate is `confirmed` or explicitly classified (`unsupported`, `unmapped`, `ambiguous`), AND every selected traveller age resolves to exactly one valid category OR to a structured `unsupported_age`. Adults-only, child-from-6, no-infants, single-child-band, no-youth — all valid. Adult bookings must never be blocked by missing Youth/Child/Infant.

**R2 — Pre-Stripe hard blocks; `needs_review` only for post-payment surprises.** Before creating the Stripe session, block with structured errors: `unsupported_age`, `category_not_ready`, `slot_unavailable`, `capacity_exceeded`, `quote_stale`, `add_on_invalid`, `mapping_mismatch`. `needs_review` is reserved for post-payment races/external failures only — never a normal public-checkout outcome.

**R3 — Provisional Bókun reserve/hold before Stripe.** Flow: live quote → revalidate exact slot → provisional Bókun reserve/hold → create Stripe session (store `bokunReservationId` on the quote) → on payment success, confirm THAT reservation (idempotent). Webhook never creates a second booking. Abandoned payments: allow hold to expire or release. Idempotency on: repeat checkout clicks, repeat Stripe webhooks, repeat Bókun confirm. Products that cannot support reserve/hold are reported explicitly and NOT marked instant-confirm-ready.

**R4 — Instant-confirmation copy is server-gated.** Show instant-confirm wording only after the server has verified mapping, option, rate, slot, categories, capacity, live Bókun base, DB add-ons, and provisional reserve. Before that: neutral "Checking live price and availability…". On any failure: matching unavailable state + Stripe blocked. Launch readiness requires a real Bókun reserve/confirm (or sandbox equivalent), not a mocked webhook.

## Everything else from the approved plan stands

- Canonical 12-tour Signature registry (`src/lib/tours/signatureRegistry.ts`), including explicit `southwest-vicentine-coast`.
- `sync-all-bokun-pricing` iterates the registry, returns `{tourId, ok, productId, optionId, rateId, warnings, categoryCount, confirmedCount, suggestedCount, unsupportedCount, unmappedCount, categories}` per tour.
- Category states: `confirmed | suggested | unsupported | unmapped | ambiguous`. No €0 fallback for missing bands.
- Shared `TravellerComposition` (already scaffolded) + universal `<TravellerCompositionPicker />` wired into Signature, Tailored, Studio V3. Browser never classifies.
- Any minor → live category-aware quote or explicit `unsupported_age`. No adult-priced mixed families.
- Studio V3 order: basic details → Who is travelling → preferences → eligibility filter → itinerary gen → refine → date/slot → live base quote → DB add-ons → Final Signature → checkout.
- Studio pricing always uses `commercialProductKey = 'studio-v3-private-full-day'`. Code guard rejects any Studio quote resolving to a Signature mapping. Skeleton is synced/reported like Signature.
- Hard eligibility filter (not ranking): `allAgesSupported && capacityAvailable && operationallyCompatible && requiredEquipmentAvailable`.
- `TravellerSuitability` metadata (min/max age, infantsAllowed, childSeat, stroller, longWalking, capacityCountsAll, incompatibilityReasons) on Signature templates, activities, stops, workshops, add-ons.
- Compatible itinerary swap preserves the Bókun base quote and price.
- Add-ons filtered by suitability + capacity + equipment + active + has DB price. `create-signature-checkout` re-reads add-on prices from DB immediately before Stripe.
- `pricingRevision` vs `itineraryRevision` split — itinerary-only changes preserve base quote, add-on prices, checkout availability; only signed itinerary snapshot updates.
- Single server-authoritative signed quote across Signature summary, Tailored summary, Studio Final Signature, Guest Details, Checkout Summary, Stripe, booking record. Enforced equality: `visible = stored = Stripe = booking = live Bókun base + DB add-ons`. Traveller picker qty = stored category qty = Bókun reservation qty.
- Reservation parity: every `slot.pricingCategories?.[0]` shortcut removed; `pricingCategoryBookings` built from resolved categories, Infant included at qty>0 even when €0.
- Pre-reserve checks (per R2) run before Stripe: age→category, category on slot, qty matches quote, capacity incl. infants, product/option/rate/availability match, Stripe = quote, add-ons use current DB prices.

## Tests (must pass before completion report)

1. Registry vs mappings vs mirrors comparison; explicit assertion on `southwest-vicentine-coast`.
2. Adults-only tour (e.g. Adult-only product): 2A checkout allowed; 2A + child → `unsupported_age`.
3. Child-from-6 tour: 2A + child(8) checkout allowed; 2A + infant(0) → `unsupported_age`.
4. Mixed family per public tour (2A + [15,8,0]): correct categories, capacity=5, infant free only when Bókun returns €0, visible=Stripe.
5. Every public Signature: live category-aware quote, product/option/rate verified, age mapping verified, total parity, provisional reserve returns an ID.
6. Studio infant filter: incompatible activities excluded pre-generation.
7. Studio compatible replacement: base price unchanged.
8. No late failure: every displayed Studio itinerary supports all selected ages.
9. No Signature leakage: Studio quotes never resolve to a Signature `tour_bokun_mapping` row.
10. Add-on tamper: server uses DB price.
11. Stripe parity: base + add-ons = visible = Stripe = confirmed reservation total.
12. Idempotency: duplicate checkout POST → single reservation; duplicate Stripe webhook → single confirm; duplicate Bókun confirm → same booking.
13. Instant-confirm copy: hidden until full server verification; unavailable states render on each failure code.

## Completion report (section O)

Return: canonical registry, `southwest-vicentine-coast` result, per-tour product/option/rate, category IDs + age ranges, mapping status, unsupported-age gaps (as valid config, not failures), sync-all result per tour, Studio skeleton mapping, files changed, actual test results, browser screenshots, visible totals, Stripe test totals, Bókun reservation category payloads, and any mapping still blocking launch.

## Execution order

1. Registry + audit + `sync-all-bokun-pricing`; capture the report.
2. Category state model + composition-based readiness (R1); wire picker across surfaces.
3. Single server quote + add-on authority + reservation parity + pre-Stripe hard blocks (R2).
4. Provisional reserve/hold before Stripe + idempotent confirm (R3).
5. Studio skeleton + sequence + eligibility filter + suitability metadata + compatible replacement.
6. Revision split.
7. Server-gated instant-confirm copy + unavailable states (R4).
8. All tests, then completion report.
