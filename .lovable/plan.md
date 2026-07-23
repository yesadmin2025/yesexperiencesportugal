
# Conversion, Pricing, Tailor, Studio & Checkout Audit — Phase 1 (audit only)

Per your answers this pass is **audit-only**. No code, data, DB, or copy will change. Deliverable is a written report + tables + annotated screenshots. Implementation waits for a second explicit approval.

Design locks (hero, hero video, hero copy/CTAs, palette, typography, homepage order, five-paths section, Signature card design, approved animations, nav) are treated as untouchable throughout.

---

## What I will audit

**Signature pages** (`src/routes/tours.$tourId.tsx`)
- price shown on card vs product vs Tailor vs Studio vs checkout
- "From €X" origin (must be lowest currently bookable tier)
- inclusions/exclusions vs Viator source of truth
- rating badge, gallery, hero, sticky CTA behaviour

**Tailor** (`src/routes/tours.$tourId.tailor.tsx`, `src/data/tailorBlueprints.ts`)
- removable vs locked components
- current price math on removal / add-on / restore
- regional coherence (must stay inside the Signature's region)
- age-band price rows (adult / youth / child / infant) present + correct

**Studio V3** (`src/routes/studio-v3.tsx`, `src/components/studio-v3/*`, `src/lib/studio-v3/composerPricing.ts`)
- whether it composes an original day or silently returns a Signature
- module data completeness (region, coords, duration, price, capacity, compatibility)
- incompatible-region behaviour
- pricing parity with reveal → checkout

**Availability / composition / pickup** (`SimpleBookingForm`, `CompositionField`, checkout drawers)
- date + guest + pickup persistence between steps
- pickup field contrast, label, disabled/active/error states
- 24h lead-time rule, unavailable-date recovery

**Checkout** (`create-signature-checkout` edge fn, `BrandedCheckoutDrawer`, `CheckoutSummary`, `PriceBreakdownRows`)
- itinerary/removed/added items shown correctly
- final total = per-pax × age bands + add-ons − tailor reduction
- inclusions from Bókun → clientIncluded → nothing (already the server contract)
- payment failure, expired session, NaN/€0 guards

**Confirmation** (`booking-confirmed.tsx`) — data parity with checkout.

**EN vs PT** — every route above, both locales.

**Desktop vs iPhone 393-wide vs Android narrow** — Playwright probes for readability, sticky CTA overlap, WhatsApp overlap, keyboard occlusion, horizontal scroll.

**Analytics** — presence of the 17 events you listed; confirm no PII in payloads.

---

## How I will run it

1. **Static read** of the pricing chain: `signatureTours.ts` → `signatureToursViator.ts` (`priceTiersEUR`) → `signatureTourPricing.ts` (`resolvePerPaxEur`, age bands) → `tailor.tsx` → `useResolvedJourney` → checkout edge fn → confirmation. Flag every place a price is computed or hard-coded outside this chain.
2. **DB read** of `tour_price_tiers` runtime overrides to catch card ≠ product mismatches.
3. **Playwright probes** on localhost across the QA matrix scenarios (1 adult / 2 adults / 2 + child / max group; unchanged / 1 removed / 3 removed / restored / add-on; one-region Studio / incompatible Studio; successful checkout; failed payment; unavailable date; pickup manual / later). Screenshots for each.
4. **Contrast + a11y** pass on pickup field, CTAs, disabled states (WCAG AA).

---

## Deliverables (Phase 1)

Saved under `docs/audit-2026-07/`:

1. `report.md` — every issue with **Severity · Route · Component · Repro · Proposed fix**.
2. `pricing-table.md` — for every tour × tier: current site price, `platformPrice` (= current site price, per your answer), proposed `directBookingPrice = platform × 0.85`, `minimumOperationalPrice = directBookingPrice × 0.70`, current "From €" vs proposed "From €".
3. `tailor-formula.md` — exact formula with worked examples per tour, floor checks, list of components classified as "principal / removable" vs "descriptive / non-discounting" per Signature blueprint.
4. `studio-findings.md` — list of Studio behaviours that violate "compose, don't return"; module-data gaps (missing coords, capacity, compatibility).
5. `checkout-screens/` — annotated PNGs before any change, per scenario, EN + PT, mobile + desktop.
6. `files-to-change.md` — exact file list that Phase 2 would touch (nothing edited yet).
7. `ssot-proposal.md` — proposed shape of the single pricing config (types, where it lives, migration path from `signatureToursViator.priceTiersEUR` + `tour_price_tiers` runtime overrides, without breaking the current age-band engine).

---

## Locked answers driving the report

- **platformPrice** = current live site price for each tier (no scraping, no new manual field required for Phase 1).
- **directBookingPrice** = `platformPrice × 0.85`, rounded to whole EUR only if the result still yields ≥ 15% off.
- **minimumOperationalPrice** = `directBookingPrice × 0.70` (Tailor removals cannot cross this floor).
- **Studio modules** derived from existing Signature stops (`regionStops.ts`, `stopOperational.ts`, `stopGeo.ts`), no new module catalogue.
- **Audit-only now.** No SSOT scaffolding, no price changes, no Tailor/Studio refactor, no copy edits in this pass.

## Out of scope this pass

Hero, homepage sections, five-paths, Signature card visuals, palette, typography, nav, animations, any route not technically broken. Implementation (Phases 2–5: SSOT, 15% direct discount, Tailor 5% engine, Studio composer, pickup redesign, checkout polish, tracking, QA matrix) is proposed in `files-to-change.md` and waits for your explicit go.

## Technical detail

- Report will cite exact file:line for each finding.
- Age-band engine (`AGE_BAND_PCT` + server mirror in `supabase/functions/_shared/pricing.ts`) is already SSOT-shaped — the report will note it as the pattern to extend, not replace.
- Playwright runs headless against `http://localhost:8080`; screenshots stored under `/tmp/browser/audit-*` and copied into `docs/audit-2026-07/checkout-screens/`.
- No writes to Supabase, no edge fn deploys, no publish.
