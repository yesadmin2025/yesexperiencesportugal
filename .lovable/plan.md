# YES Canonical Signature Implementation — Plan (no code written)

Authority: PDF Bible v1.1 FINAL (binding) > workbook (evidence). Pricing engine untouched except the four authorised Tailor adjustments. Studio, Stripe architecture, checkout flow, animations, design, SEO and analytics are out of scope.

---

## A. What I inspected

**Read this turn:** the PDF (all 46 pages), the audit workbook, `src/data/signatureToursSourceOfTruth.ts`, `src/data/signatureTours.ts`, `src/data/tailorBlueprints.ts`, `src/data/signatureAddOns.ts`, `src/data/signatureTourPricing.ts`, `src/lib/tourContent.ts`, `src/config/pricing.ts`, `supabase/functions/_shared/pricing.ts`, `supabase/functions/create-signature-checkout/index.ts`, `src/routes/tours.$tourId.tailor.tsx`, `docs/signature-source-of-truth.md`.

**Confirmed current state (verified, not assumed):**

- `SIGNATURE_SOURCE_OF_TRUTH` holds populated entries for only 4 of 12 Signatures (`arrabida-boat`, `arrabida-wine-allinclusive`, `azeitao-cheese`, `evora-alentejo`). The other 8 fall back to legacy copy via `getTourContent()`.
- `durationHours` in `signatureTours.ts` disagrees with the PDF on 6 tours (e.g. picnic `6+h` vs canonical `7h30`; Fátima `9–10h` vs `8–9h`; Tomar `9–10h` vs `8–9h`).
- Tailor today has **exactly one** price lever: `principalsRemoved × −5%`, capped at −15% and floored at 70% (`tailorAdjustedPerPax`). There is **no Add-Lunch option** and **no per-winery price**; extra wineries currently route to "manual confirmation" with **zero** price change (`wineExtension` in the Tailor route).
- The Arrábida wine blueprint is `pickMin: 2, pickMax: 4` with a 5-winery pool, priced at €0 for picks 3 and 4.
- `create-signature-checkout` already accepts `principalsRemoved` and a validated `addOns[]` array, so server-side supplements are possible without touching checkout architecture.

---

## B. Change register (issue → correction → file → implementation → validation → risk → test)

### B1. Canonical product data for all 12 Signatures

1. **Issue:** 8 Signatures have no SoT entry; titles, durations, descriptions, highlights, inclusions and itineraries come from legacy editorial copy that the PDF marks as wrong (33 Critical/High findings).
2. **Correction:** Populate a canonical block per Signature exactly as printed in PDF Part 3 (description, highlights, inclusions, exclusions, itinerary with published per-stop timings and stop type).
3. **Files:** `src/data/signatureToursSourceOfTruth.ts` (all 12 blocks), `src/data/signatureTours.ts` (`durationHours`, title, description).
4. **Implementation:** extend the SoT record with the PDF's classification fields the current type lacks — `stopType: "origin" | "core" | "pass-by" | "optional" | "alternative-pool" | "beach-option"`, `admissionIncluded`, `poolId`, `default: boolean`. Inclusions and exclusions stay two separate arrays; nothing is inferred from itinerary presence (PDF 5.2).
5. **Validation:** a data test asserting every tour id has an SoT entry, every itinerary row has a stop type, and no pool has all members flagged default.
6. **Risk:** `getTourContent()` switches 8 tours from `legacy` → `sot`, changing the itinerary rendered on `/tours/$tourId`, the route map, card highlights and the Tailor stop list at once.
7. **Test:** extend `src/lib/stop-parity.ts` checks + a snapshot test per tour for duration/inclusion/exclusion counts.

### B2. Duration corrections

1. **Issue:** 6 durations contradict the source.
2. **Correction:** picnic → `7h30`; Fátima → `8–9h`; Tomar & Coimbra → `8–9h`; Tróia & Comporta → `8–9h`; Sintra & Cascais → `8–10h`; Boat → `6–8h`; Roman Talha → `8–9h`.
3. **Files:** `src/data/signatureTours.ts`, SoT `durationMinutes` (midpoint, rounded to 5 min, per existing convention).
4. **Risk:** `estimatedHours` in the Tailor route derives from `durationHours` text; the feasibility engine and the "day timing" strip shift. Regression test on `parseHours`.

### B3. Conditional meals and admissions

1. **Issue:** lunch renders as a normal itinerary chapter on 7 Signatures where it is excluded; Cristo Rei admission shown as included.
2. **Correction:** every excluded meal chapter is labelled "lunch, own expense"; Cristo Rei marked optional with admission excluded.
3. **Files:** SoT data + the chapter renderer in `src/components/tours/*` and `src/lib/tailor-chapters.ts`.
4. **Validation:** a lint test failing if a chapter labelled lunch is not either in `included[]` or flagged own-expense.

### B4. Alternative pools not concatenated

1. **Issue:** Sintra palace candidates, Évora wineries, the Azulejo winery trio and the Arrábida winery pool all render as guaranteed sequential stops.
2. **Correction:** pools render as "selected from" with the required pick count (Sintra: one palace + wine **or** two palaces; Évora: exactly 2 wineries; Azulejo: exactly 1 winery; Arrábida Wine: 2 by default, max 4 via Tailor).
3. **Files:** `src/data/tailorBlueprints.ts` (`choice.pickMin/pickMax`), SoT `poolId`, the itinerary/map renderers.
4. **Risk:** `SignatureRouteMap` currently draws every pool member; drawing only defaults changes route geometry and drive-time estimates.

### B5. Tailor rules — the only authorised pricing changes

1. **Issue:** no lunch add-on exists; extra wineries are free; no dependency rules.
2. **Correction (per PDF 6.2):**
  - Arrábida Wine (`arrabida-wine-allinclusive`) defaults to **2 wineries + lunch included**; 3rd winery **+€20 pp**; 4th winery **+€20 pp** and **blocked until a stop is removed**; hard max 4.
  - Boat (`arrabida-boat`): Add Lunch **+€35 pp**; only the *Sesimbra Coastal Boat Tour* option exposed.
  - Picnic (`wild-beaches-picnic`): remove-stop only, **no Add Lunch**.
  - All other Signatures: Add Lunch **+€35 pp** and remove-stop.
  - Remove a stop: **−5%** each (existing SSOT behaviour, unchanged).
3. **Files:** new `src/data/tailorRules.ts` (per-product rule object: `lunchAddOnEligible`, `lunchPricePerPaxEur: 35`, `wineryMin/Max`, `extraWineryPricePerPaxEur: 20`, `fourthWineryRequiresRemoval: true`, `removableStopIds`), consumed by `src/routes/tours.$tourId.tailor.tsx`; `src/data/tailorBlueprints.ts` for pool bounds; `supabase/functions/create-signature-checkout/index.ts` + `supabase/functions/_shared/pricing.ts` for the server-side mirror.
4. **Implementation:** the two supplements are **additive per-person amounts applied after** the percentage reduction, exactly as the PDF prints them (`final = tailorAdjustedPerPax(direct, removed) + 20×extraWineries + 35×lunch`). They are sent as validated `addOns[]` line items so Stripe totals equal the displayed total; `tailorAdjustedPerPax` itself is **not modified**.
5. **Validation:** 4th winery toggle disabled with an inline reason until `principalsRemoved ≥ 1`; removing that stop later re-checks and drops the 4th winery if the guest re-adds the stop; selection can never exceed 4; Picnic never renders the lunch control.
6. **Risk:** the operational floor (70%) and −15% cap interact with the supplements; keeping supplements outside the floor calculation preserves the existing engine.
7. **Test:** extend `src/__tests__/tailor-pricing.test.ts` with the six PDF 6.2 assertions, plus an E2E in `e2e/` walking Arrábida Wine 2→3→4 wineries and asserting the ChargeSummaryLine, the party total and the Stripe line items agree.

### B6. Price-preview and booking summary

1. **Issue:** `ChargeSummaryLine` and `FinalDetailsDialog.priceQuote` hardcode `addOnsEur: 0`.
2. **Correction:** feed the real supplement total so the "Final price" line, the breakdown tooltip and the receipt list "3rd winery +€20 pp", "Add lunch +€35 pp", "2 stops removed −10%".
3. **Files:** `src/routes/tours.$tourId.tailor.tsx`, `src/components/checkout/ChargeSummaryLine.tsx` (props only), `src/routes/booking-receipt.tsx`.
4. **Risk:** existing checkout price-parity E2E (`e2e/checkout-price-parity.spec.ts`) must be extended, not bypassed.

### B7. Studio isolation

No Tailor rule enters Studio. `getSignatureOptionalAddOns` keeps reading blueprint `optional[]` only; the new `tailorRules.ts` is imported by the Tailor route and the checkout function exclusively. A route-import test asserts no `studio-v3` module imports `tailorRules`.

---

## C. Files expected to change

- `src/data/signatureToursSourceOfTruth.ts` (12 canonical blocks + widened type)
- `src/data/signatureTours.ts` (titles, durations, descriptions)
- `src/data/tailorBlueprints.ts` (pool bounds, locks, boat option)
- `src/data/tailorRules.ts` (**new**)
- `src/routes/tours.$tourId.tailor.tsx`
- `src/lib/tailor-chapters.ts`, `src/lib/tourContent.ts` (own-expense + pool flags)
- `src/components/checkout/ChargeSummaryLine.tsx` (props)
- `src/routes/booking-receipt.tsx`
- `supabase/functions/create-signature-checkout/index.ts`, `supabase/functions/_shared/pricing.ts`
- `src/content/signature-card-moments.ts` (highlights that assert excluded lunch)
- Tests: `src/__tests__/tailor-pricing.test.ts`, new `src/data/__tests__/canonical-signatures.test.ts`, new `e2e/tailor-canonical-rules.spec.ts`

## D. Inspected, no change required

`src/config/pricing.ts`, `src/data/signatureTourPricing.ts`, `src/hooks/use-tour-price-tiers.ts`, `src/lib/feasibility.ts`, `src/lib/tailored-policy.ts`, all `studio-v3` components, `stripe-webhook`, `src/components/SignatureRouteMap.tsx` (behaviour follows the data change; no logic edit expected).

---

## E. Ambiguities — need your decision before implementation

1. **Removal cap.** The engine caps reductions at −15% (3 stops) with a 70% floor. The PDF states "−5% per removed stop" with no cap. Keep the existing cap, or allow unlimited −5% steps?
2. **Arrábida Wine baseline.** PDF 6.2 says "defaults to 2 wineries **and lunch included**", but the same chapter's mandatory corrections say lunch is option-dependent and the count is "2 or 3 by option". I will follow 6.2 (fixed 2 + lunch included) unless you say otherwise.
3. **Supplement order of operations.** I propose `(direct × removal%) + supplements`. Confirm supplements should not be discounted by removals.
4. **Product-code mapping conflict.** Repo docs record `tiles-workshop` → P4 *Golf & Wine* and `evora-alentejo` → P6 *Setúbal Wine*, while the PDF labels P4 *Azulejo, Wine & Sesimbra* and P6 *Évora & Alentejo Wine*. I will follow the PDF's content and keep the existing route ids (SEO history), but confirm the live Viator products match the PDF.
5. **Boat "Sesimbra Coastal Boat Tour" only.** Confirm the other boat variants should be removed from the UI entirely rather than shown as unavailable.
6. **Lunch supplier reality.** €35 pp lunch on 9 Signatures — is that a single confirmed operator rate across all regions, or per-region?

---

## F. Implementation sequence

1. Widen the SoT type and land canonical data for all 12 Signatures (content only, no pricing).
2. Corrected durations, titles and descriptions.
3. Own-expense meal labelling and optional-admission flags.
4. Alternative-pool modelling and map/itinerary rendering.
5. `tailorRules.ts` + Tailor UI controls and dependency validation.
6. Server-side supplement mirror in the checkout function.
7. Price-preview, summary and receipt wiring.
8. Unit + E2E regression, mobile (393px) and desktop (1280px) visual pass.

## G. Acceptance checklist (PDF Part 6) — pass/fail at delivery

Content: correct title/duration/region/description · highlights supported · inclusions vs exclusions classified · canonical itinerary order · pools not concatenated · conditional meals not universal.
Tailor: Arrábida defaults 2 wineries + lunch · 3rd = +€20 pp · 4th = +€20 pp and blocked until a stop is removed · never >4 wineries · each removal exactly −5% · lunch exactly €35 pp · Picnic has no lunch option · Boat exposes only Sesimbra Coastal Boat Tour · no Tailor rule in Studio.
Regression: total moves only on authorised actions · participant count affects only per-person add-ons · checkout summary shows the final configuration · no broken routes or concatenated labels · desktop and mobile intact · no new console errors.

Nothing ships until you approve, and I will not publish while any Critical or High item is open.

The plan is approved subject to the following binding clarifications. Update the plan accordingly before writing code.

1. REMOVAL CAP AND PRICING FLOOR

Keep the existing pricing utility behaviour exactly as currently implemented:

- itinerary-stop removal discount: −5% per removed stop;

- maximum accumulated itinerary-stop discount: −15%;

- existing 70% pricing floor remains unchanged.

Do not alter or rewrite these pricing protections.

2. ARRÁBIDA WINE BASELINE AND TAILOR RULES

There is no ambiguity.

The binding product decision is:

- the default Signature includes exactly 2 wineries;

- lunch is included by default;

- the customer may remove lunch in Tailor;

- removing lunch applies a fixed discount of €15 per person;

- lunch removal is a separate Tailor action and must not also trigger the −5% itinerary-stop removal discount;

- the 3rd winery costs +€20 per person;

- the 4th winery costs an additional +€20 per person;

- maximum 4 wineries;

- adding the 4th winery requires at least one other eligible itinerary stop to be removed;

- removing lunch does not satisfy the requirement for adding the 4th winery;

- each eligible itinerary stop removed applies the existing −5% rule, subject to the existing −15% cap and 70% pricing floor;

- Arrábida Wine must not display an “Add Lunch” option because lunch is already included by default.

This overrides older Viator wording, workbook content and current implementation logic.

3. ORDER OF PRICE OPERATIONS

Confirmed calculation order:

existing Signature price

minus the authorised itinerary-stop removal percentage

minus €15 per person if lunch is removed from Arrábida Wine

plus the applicable per-person Tailor supplements.

The €20 winery supplements and €35 lunch supplements must not be reduced by itinerary-stop removal discounts.

Participant count multiplies all per-person adjustments:

- extra winery: +€20 per person;

- Add Lunch: +€35 per person;

- Arrábida Wine lunch removal: −€15 per person.

The Arrábida Wine lunch-removal discount must remain separate from the percentage-based stop-removal calculation.

4. PRODUCT CODES AND ROUTE IDS

Keep all existing website route IDs for continuity.

Do not change Viator product codes or external product mappings merely because repository documentation and PDF labels appear inconsistent.

Implement the canonical content against the existing YES route IDs.

Record any unresolved product-code mismatch separately in the final report, but do not modify external mappings without explicit approval.

5. BOAT OPTIONS

Confirmed:

- only the Sesimbra Coastal Boat Tour may remain;

- all other boat variants must be removed entirely from the customer-facing UI;

- do not display them as unavailable, disabled or alternative options;

- Add Lunch is +€35 per person;

- Remove Stop follows the existing −5% logic and existing cap/floor.

6. PICNIC

Confirmed:

- Remove Stop: −5% per eligible itinerary stop, subject to the existing cap and floor;

- do not display an Add Lunch option;

- the picnic already includes lunch.

7. ALL REMAINING SIGNATURES

For every Signature classified by the PDF as “All remaining Signatures”:

- Add Lunch: +€35 per person;

- Remove Stop: −5% per eligible itinerary stop, subject to the existing cap and floor.

Do not create regional lunch prices or delay implementation for supplier-rate confirmation.

8. EXACT FILE IDENTIFICATION

Before implementation, replace vague references such as:

- src/components/tours/*

- itinerary/map renderers

with the exact files and component names that will be edited.

The revised plan must list every expected file modification precisely.

9. DATA AUTHORITY

The PDF Bible v1.1 FINAL remains binding.

The workbook is supporting evidence only.

Legacy copy, repository documentation, current website content and Viator wording must not override an explicit newer business decision contained in the PDF or this clarification.

10. IMPLEMENTATION SAFETY

Implementation must be completed in this order:

Phase 1:

- canonical data and types;

- titles, durations and descriptions;

- inclusions, exclusions and itineraries.

Phase 2:

- alternative pools;

- conditional and own-expense elements;

- route-map behaviour.

Phase 3:

- Tailor rules and UI dependencies;

- Arrábida Wine lunch-removal control and €15-per-person discount;

- fourth-winery dependency validation.

Phase 4:

- server-side checkout validation;

- price summary and receipt parity.

Phase 5:

- unit tests, E2E tests and responsive regression testing.

Do not publish automatically.

11. REQUIRED ARRÁBIDA WINE TESTS

Tests must confirm:

- default state contains 2 wineries and lunch;

- removing lunch subtracts exactly €15 per person;

- removing lunch does not apply an additional −5%;

- removing lunch does not unlock the 4th winery;

- the 3rd winery adds exactly €20 per person;

- the 4th winery adds another €20 per person;

- the 4th winery remains blocked until an eligible itinerary stop is removed;

- no configuration exceeds 4 wineries;

- the displayed price, checkout total, Stripe line items and receipt all match;

- re-adding lunch restores the €15-per-person amount;

- re-adding the removed itinerary stop automatically invalidates or removes the 4th winery.

After implementation, provide:

- every file changed;

- every test run;

- pass/fail results;

- unresolved warnings;

- screenshots of the relevant Tailor states on mobile and desktop;

- confirmation that Studio, Stripe architecture, SEO, animations and unrelated routes were not changed.

Return the revised final plan first. Do not write code until I explicitly approve it.

The plan is approved subject to the following binding clarifications. Update the plan accordingly before writing code.

1. REMOVAL CAP AND PRICING FLOOR

Keep the existing pricing utility behaviour exactly as currently implemented:

- removal discount: −5% per removed stop;

- maximum accumulated removal discount: −15%;

- existing 70% pricing floor remains unchanged.

Do not alter or rewrite these pricing protections.

Update the acceptance criteria so they do not imply unlimited −5% reductions.

2. ARRÁBIDA WINE BASELINE

There is no ambiguity.

The binding product decision is:

- the default Signature includes exactly 2 wineries;

- lunch is included; but can be removed in tailor 

- the 3rd winery costs +€20 per person;

- the 4th winery costs an additional +€20 per person;

- maximum 4 wineries;

- the 4th winery requires at least one other eligible stop to be removed.

This overrides older Viator option-dependent wording and older workbook content.

3. ORDER OF PRICE OPERATIONS

Confirmed formula:

existing Signature price

minus the authorised removal percentage

plus the applicable per-person Tailor supplements.

The €20 winery supplements and €35 lunch supplement must not be reduced by the stop-removal discount.

Participant count multiplies the per-person supplements only.

4. PRODUCT CODES AND ROUTE IDS

Keep all existing website route IDs for continuity.

Do not change Viator product codes or external product mappings merely because the repository documentation and PDF labels appear inconsistent.

Implement the canonical content against the existing YES route IDs.

Record any unresolved product-code mismatch separately in the final report, but do not modify external mappings without explicit approval.

5. BOAT OPTIONS

Confirmed:

- only the Sesimbra Coastal Boat Tour may remain;

- all other boat variants must be removed entirely from the customer-facing UI;

- do not display them as unavailable, disabled or alternative options;

- Add Lunch is +€35 per person;

- Remove Stop follows the existing −5% logic and existing cap/floor.

6. LUNCH RULE

The €35 per-person lunch amount is a binding Tailor business rule for every Signature classified by the PDF as “All remaining Signatures”.

Do not delay implementation for supplier-rate confirmation and do not create region-specific lunch prices.

Picnic must never display Add Lunch.

Roman wine never displays add lunch 

Boat uses its specific Add Lunch rule.

7. EXACT FILE IDENTIFICATION

Before implementation, replace vague references such as:

- src/components/tours/*

- “itinerary/map renderers”

with the exact files and component names that will be edited.

The revised plan must list every expected file modification precisely.

8. DATA AUTHORITY

The PDF Bible v1.1 FINAL remains binding.

The workbook is supporting evidence only.

Legacy copy, repository documentation, current website content and Viator wording must not override an explicit newer business decision contained in the PDF.

9. IMPLEMENTATION SAFETY

Implementation must be completed in this order:

Phase 1:

- canonical data and types;

- titles, durations, descriptions;

- inclusions, exclusions and itineraries.

Phase 2:

- alternative pools;

- conditional and own-expense elements;

- route-map behaviour.

Phase 3:

- Tailor rules and UI dependencies.

Phase 4:

- server-side checkout validation;

- price summary and receipt parity.

Phase 5:

- unit tests, E2E tests and responsive regression testing.

Do not publish automatically.

After implementation, provide:

- every file changed;

- every test run;

- pass/fail results;

- unresolved warnings;

- screenshots of the relevant Tailor states on mobile and desktop;

- confirmation that Studio, Stripe architecture, SEO, animations and unrelated routes were not changed.

Return the revised final plan first. Do not write code until I explicitly approve it.