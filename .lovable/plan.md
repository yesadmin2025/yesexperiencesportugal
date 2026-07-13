## What's wrong

1. **Southwest Vicentine Coast is missing from the backend.** It exists in code (`signatureTours.ts`, `signatureRegistry.ts`, `signatureToursViator.ts`) but there is **no row** in `imported_tours` and **no row** in `tour_price_tiers`. Result: `booking-quote` cannot produce a manual quote for it → the booking widget on `/tours/southwest-vicentine-coast` returns `unavailable` and the checkout button never lights up. Nine of the ten Signature tours are backed; this one slipped through.

2. **Checkout smoothness across Studio / Signature / Tailor.** All three surfaces already funnel through the same edge function (`create-signature-checkout`) — that half is unified. But because Southwest has no tiers row, the manual short-circuit in `booking-quote` never fires for it, so Studio recommendations and Tailor adjustments that resolve to Southwest also fail silently. Same failure mode, three entry points.

## Fix

### 1. Add Southwest to the database (insert, no schema change)

Use the Viator tiers already documented in `src/data/signatureToursViator.ts` (line 1067–1068):

```
Per-pax EUR by group size: 2-3 → €359, 4-6 → €299, 7-8 → €239. Min 2 pax.
```

Two inserts:

- **`imported_tours`** — one row mirroring the shape of the other 10 (id `southwest-vicentine-coast`, title, region `alentejo`, region_label `Southwest Alentejo · Costa Vicentina`, duration `fullday`, duration_hours `9–10`, price_from `239`, theme `Coastal`, blurb/stops/highlights copied from `signatureTours.ts`, `image_url` = the first gallery entry). Booking-quote reads adult tiers from `tour_price_tiers`; `imported_tours` is what unlocks visibility in admin/reporting and keeps the tour count consistent (10 → 11, matching the copy in the previous work).
- **`tour_price_tiers`** — `tour_id = 'southwest-vicentine-coast'`, `tiers = {"2":359,"3":359,"4":299,"5":299,"6":299,"7":239,"8":239}`, `banded_pricing_enabled = false`, `pricing_mode = NULL` (same shape as `arrabida-boat`).

The existing manual-pricing branch in `booking-quote` (Adult 100 / Youth 80 / Child 50 / Infant 0) will then work for Southwest with no code change. `create-signature-checkout` also needs no change — it already trusts the signed quote token.

### 2. Checkout smoothness pass (all three surfaces)

Single-surface audit and light fixes only — no re-architecture:

- **Signature** (`/tours/:id#book`, `BandedSignatureBookingForm`):
  - Confirm the "Instant confirmation" copy + no Bókun readiness gate is live for all 11 tours.
  - Verify the CTA is enabled the moment a valid quote returns (no spinner stuck on stale `readiness`).
- **Tailor** (`/tours/:id/tailor`, sends to `create-signature-checkout`):
  - Same quote path; confirm the tailored add-ons/adjustments pass through `guestDetails` cleanly and the price line matches the quote token.
- **Studio v3** (`/studio` → recommendation → checkout, uses `create-signature-checkout` in `mode: "quote"` then `mode: "create-session"`):
  - Confirm the recommended tour resolves through `signatureRegistry` (Southwest now included) and the quote → session hop shows no intermediate error toast.
- **One shared polish item** if any surface shows it: replace any generic "Something went wrong" on a `booking-quote` failure with a specific "This date isn't available — try another" (manual mode: any future date is available, so this should now be near-zero occurrence).

Builder checkout (`create-builder-checkout`) is a different product (custom-built itineraries) and is **out of scope** for this pass — say so explicitly in the response so you know we didn't touch it.

### 3. Verification (browser + edge)

- `curl` `booking-quote` for `southwest-vicentine-coast` with `{ adults: 2, minorAges: [] }` → expect €718 total, `available`, `pricing_source: "manual_viator_tiers"`, zero Bókun HTTP calls.
- Same for `{ adults: 2, minorAges: [8, 0] }` → expect €359 + €359 + €179.50 + €0 = €897.50.
- Playwright: load `/tours/southwest-vicentine-coast#book`, pick 2 adults + a future date, click through to Stripe sandbox → confirm PaymentIntent id + `pricing_source` metadata.
- Playwright: `/tours/arrabida-boat/tailor` → quote → Stripe.
- Playwright: `/studio` → complete a short session that resolves to Southwest → quote → Stripe.
- Confirm no `no_commercial_mapping` errors in edge logs across the three runs.

## Files touched

- **DB inserts** (via `supabase--insert`): `public.imported_tours`, `public.tour_price_tiers` — one row each.
- **Code**: none expected. Any polish item found during the smoothness pass is a small copy/state edit in the specific surface's component and will be listed in the final report.
