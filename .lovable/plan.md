# Viator SoT ↔ Site Reconciliation

Goal: guarantee every Signature tour's overview, highlights, inclusions/exclusions, itinerary, and midpoint durations on the site match the live Viator product page, and are surfaced everywhere through `getTourContent(tourId)`.

## Scope

All 12 Signature tours in `src/data/signatureToursSourceOfTruth.ts` (SoT) vs. their live Viator URLs, plus every UI consumer already migrated to `getTourContent`.

## Steps

1. **Refresh SoT from Viator (source of truth pass)**
  - Run the existing `/admin/sot-refresh` batch (Firecrawl + Gemini extractor) for all 12 tours, sequential with backoff.
  - Persist updated `overview`, `highlights`, `included`, `excluded`, `itinerary[]` (with `durationMinutes`), and `totalDurationMinutes` into `signatureToursSourceOfTruth.ts`.
  - Diff before/after; log any tour where extraction confidence is low for manual review.
2. **Manual verification pass (per tour)**
  - Open each Viator URL, spot-check: title of each itinerary stop, order, inclusions list, exclusions, meeting point, duration.
  - Correct any Gemini extraction slips directly in the SoT file.
  - Confirm 11/11 tours have `sotStatus: 'verified'`.
3. **Consumer coverage audit**
  - Re-run existing guardrail tests:
    - `tour-content-direct-reads.test.ts`
    - `tour-content-getter-usage.test.ts`
    - `signature-tour-schema-lock.test.ts`
  - Grep for any surface still rendering legacy fields (emails, PDFs, JSON-LD builders, checkout confirmation, Studio final reveal, Tailor summary, `og`/meta descriptions).
  - Route every remaining consumer through `getTourContent(tourId)`; extend the getter-usage test to include newly-touched files.
4. **Cross-surface propagation checks**
  - Signature detail route: overview, highlights, itinerary, inclusions/exclusions blocks.
  - Tailor route: itinerary editor + summary + price recompute basis.
  - Studio V3 final reveal: story snapshot + inclusions.
  - Checkout: `inclusions.ts` + booking confirmation email templates.
  - JSON-LD `Product`/`TouristTrip` structured data on tour pages.
  - Homepage + `/experiences` (+ `pt.experiences`) highlight chips.
  - PT locale overlay: ensure translations still merge on top of SoT (no English leak, no stale itinerary).
5. **Validation**
  - `bunx vitest run` for the three guardrail tests + any updated ones.
  - Playwright spot-check on 2 tours: verify itinerary bullets and inclusions on the live preview match Viator.
  - Manual visual QA on mobile viewport for one wine tour + one coastal tour.
6. **Report**
  - Write `docs/sot-viator-reconciliation-YYYY-MM.md` listing per-tour diffs applied and any Viator ambiguities left for the operator to confirm.

## Technical notes

- No schema changes; SoT file is the only data mutation.
- PT overlay merging in `tour-i18n.ts` stays exempt (already approved).
- If Firecrawl rate-limits, fall back to per-tour manual paste into SoT rather than blocking the batch.
- No changes to pricing, motion, or design tokens.

## Out of scope

- Adding new tours.
- Changing itinerary/inclusions copy beyond what Viator publishes.
- Translating new SoT content to PT (separate follow-up if English deltas are large).