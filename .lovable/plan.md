## Goal

Reuse the existing Bókun client, authentication, product mappings and API infrastructure. Do not create a new Bókun integration. Extend the current calls to retrieve and persist the actual option, rate, pricing-category and category-price data already available through the connected Bókun account.

&nbsp;

Extend pricing so every visible surface, quote, and Stripe checkout supports **Adult / Youth / Child** (with Infant = free where Bokun defines it) — and treat **Bokun `pricingCategories**` as the single source of truth. `tour_price_tiers` becomes a mirror of Bokun, not a hand-maintained anchor.

Today `tour_price_tiers.tiers` is a flat `{ "1".."8": eurPerPax }` map (adults only). `stripe-webhook` and `test-webhook-simulate` blindly pick `slot.pricingCategories?.[0]` and send all guests as that one category. Nothing on the site collects or prices children/youth.

## Scope (this pass)

Signature + Tailored flows only. Studio V3 commercial pricing (separate catalogue in `_shared/studioCommercialPricing.ts`) is out of scope — noted as follow-up.

## Technical plan

### 1. Data model — tiers keyed by age band

Migration: reshape `tour_price_tiers.tiers` from `{guests: eur}` to:

```json
{
  "adult":  { "1": 279, "2": 215, ..., "8": 159 },
  "youth":  { "1": 200, ... },     // optional; omit if Bokun has no youth cat
  "child":  { "1": 140, ... },     // optional
  "infant": 0                       // scalar or omit
}
```

Plus new columns:

- `bokun_categories jsonb` — `{ adult: {id, title}, youth?: {...}, child?: {...}, infant?: {...} }` captured from Bokun.
- `synced_from_bokun_at timestamptz`.

Backfill: wrap existing tier maps under `adult`. Keep GRANTs and policies.

### 2. Bokun sync as source of truth

New Edge Function `sync-bokun-pricing` (admin-only, callable from `/admin/pricing`, and idempotent so it can run on a cron):

- For each row in `tour_bokun_mapping`, call Bokun activity + a probe availability to read `pricingCategories` (id, title, minAge, maxAge).
- Classify each category into `adult | youth | child | infant` by title + age band (`Adult`, `Youth`/`Teen` 12–17, `Child` 3–11, `Infant` 0–2 — configurable table `bokun_category_aliases`).
- Read per-tier EUR per pax from Bokun's pricing schedule (or from category default price where schedules are per-category-flat) and upsert into `tour_price_tiers` under the new shape. Persist `bokun_categories`.
- Return a diff report for admin review.

Manual override still allowed via `/admin/pricing`, but the editor shows Bokun value alongside override and flags drift.

### 3. Shared pricing helper

New `src/lib/pricing/ageBandPricing.ts` + `supabase/functions/_shared/ageBandPricing.ts` (mirror) exporting:

```ts
type GuestMix = { adults: number; youths: number; children: number; infants: number };
type PriceBreakdown = {
  lines: Array<{ band: 'adult'|'youth'|'child'|'infant'; qty: number; unitEur: number; subtotalEur: number }>;
  totalEur: number;
  billableGuests: number; // adults+youths+children (infants excluded)
};
resolveBandedPrice(tiers, mix): PriceBreakdown
```

Tier lookup per band uses `billableGuests` bucket (same 1..8 scheme). Missing band falls back to adult tier * band multiplier only if configured; otherwise the band is disallowed and UI hides it.

### 4. Quote endpoint + `useResolvedSignature`

- Extend the resolved-signature contract: `guestMix` replaces raw `guests`; `pricing.breakdown` uses `PriceBreakdown`.
- Backward compat: if caller sends only `guests`, treat as `adults`.
- `create-signature-checkout`:
  - Accept `guestMix` in body (validated, sums must be ≥1 and match Bokun's min/max).
  - Resolve `eurPerPax` per band from `tour_price_tiers`; compute `total_eur` server-side.
  - Emit one Stripe line item per non-empty band with `unit_amount`, `quantity`, and `product_data.name = "<Tour> — <Adult|Youth|Child>"`. Infant line only if `unit_amount > 0`.
  - Stripe metadata: `adults, youths, children, infants, total_eur, bands_json`.

### 5. Bokun reserve — one `pricingCategoryBookings` entry per band

In `stripe-webhook` and `test-webhook-simulate`:

- Read `mapping.bokun_categories` (or the fresh slot's `pricingCategories`) and build one `pricingCategoryBookings` entry per band using the ids captured during sync, quantities from Stripe metadata.
- Remove the "first pricing category" shortcut. If a required band's category is missing on the slot → `needs_review` with explicit reason.

### 6. UI — collect and show the mix

- `GuestPicker` (used by Signature detail, Tailored, Guest details step): add Youth and Child steppers, with age-range helper text sourced from `bokun_categories`. Hide bands the tour does not offer.
- `SignaturePriceCard`, `CheckoutSummary`, `GuestDetailsStep` summary, `FinalRevealStory` price line: render the `PriceBreakdown` lines + total from `useResolvedSignature`. Kill any remaining `eurPerPax * guests` client math.
- Empty-band lines are omitted; infant line shows "Infants (0–2) — free" when applicable.

### 7. Admin `/admin/pricing`

- Tier editor grid becomes 3 rows (Adult/Youth/Child) × 8 columns, plus Infant scalar.
- "Sync from Bokun" button → calls `sync-bokun-pricing`, shows diff, requires confirm.
- Displays `synced_from_bokun_at` and any drift badges.

### 8. Tests

- Vitest: `ageBandPricing.test.ts` (band math, empty bands, infant free, missing-band guard).
- Vitest: `useResolvedSignature.banded.test.ts`.
- Edge test: `create-signature-checkout` returns correct `line_items` for mixed groups; rejects invalid mixes.
- Edge test: `sync-bokun-pricing` classifies canonical Bokun payloads (fixtures for arrabida-wine, wild-beaches, fatima-nazare).
- Playwright: extend the golden Signature/Tailored walkthrough to book 2 adults + 1 youth + 1 child; assert Stripe session `line_items` count and metadata.

### 9. Rollout

1. Migration + backfill (no behaviour change; adult-only rows still work).
2. Ship helper + resolved-signature contract with back-compat.
3. Ship sync function; run once against production; review diff; apply.
4. Ship checkout + webhook changes behind a per-tour `banded_pricing_enabled` flag on `tour_bokun_mapping` (default false).
5. Enable per tour after Bokun categories confirmed.
6. Flip UI steppers on for enabled tours.

## Non-goals

- Studio V3 commercial catalogue (separate follow-up).
- Bokun availability-level dynamic pricing (season/day-of-week) — captured as future work; current tiers stay group-size based.
- Currency other than EUR.

## Deliverables

Migration, `sync-bokun-pricing` function, shared `ageBandPricing`, updated `useResolvedSignature` + `create-signature-checkout` + `stripe-webhook` + `test-webhook-simulate`, updated `GuestPicker` and 5 visible price surfaces, updated `/admin/pricing`, Vitest + Playwright suites, plan.md entry.