## Slice B closure — low-credit patch

Fix four Slice B gaps discovered during review, add three targeted tests, run typecheck + full suite. No Slice A work.

### 1. Composition-aware readiness (`src/hooks/use-category-aware-checkout-ready.ts`)

Replace the "≥1 confirmed category" check with a composition-driven rule that reuses the existing strict resolver.

- Change hook signature to `useCategoryAwareCheckoutReadyFor(tourId, composition)`.
- Compute `const r = resolveCompositionAgainstCategories(composition, readiness.bokunCategories)`.
- `ready` = `r.unsupportedAges.length === 0` AND `r.categoryBookings.length > 0` AND every booked category has `mappingStatus === "confirmed"` (guaranteed by the resolver, re-asserted for defense).
- Return `{ ready, loading, reason, unsupportedAges, categoryBookings }` with `reason ∈ "not-ready" | "unsupported-age" | "no-categories"`.
- Update the three call sites (`routes/tours.$tourId.tailor.tsx`, `StudioV3.tsx`, and the new Signature guard below) to pass composition and to render the "unsupported age" block when `reason === "unsupported-age"`.

Concrete example: `{ adults: 2, minorAges: [0] }` on a tour with only a confirmed Adult category → `unsupportedAges: [0]` → `ready = false`, no Stripe.

### 2. Public Signature flow — block legacy checkout for minors

`BandedSignatureBookingForm.tsx` already uses composition + server quote + `unavailable.unresolvedAges`, so the flow is correct there. The gap is the legacy adult-only `SimpleBookingForm.tsx` still used elsewhere.

- In `SimpleBookingForm.tsx`, import the new hook and if `composition.minorAges.length > 0` (or route arrives with any minor state), call `useCategoryAwareCheckoutReadyFor(tourId, composition)`; when not ready, disable the Reserve button and render the `unsupported-age` / `no-categories` message. Adult-only bookings keep the legacy path unchanged.
- Confirm `tours.$tourId.tsx` chooses `BandedSignatureBookingForm` whenever readiness has any confirmed category (already the case) and only falls back to `SimpleBookingForm` for pure adult-only legacy tours — add the same minor-guard fallback there so mixed-family compositions can never reach the legacy Stripe path.

### 3. Wire `filterSignatureCandidatesForAges` into real Studio generation

Studio's itinerary comes from `resolveStudioV3Route()` → `pickPrimaryTour()` inside `src/components/studio-v3/curation.ts`. The filter must run before ranking.

- Extend `resolveStudioV3Route` input with optional `composition?: TravellerComposition` and `readinessMap?: Record<string, TourBokunReadiness>`.
- Extend `pickPrimaryTour` / `pickPrimaryTourWithFit` with an optional `ageFilter?: (candidates: SignatureTour[]) => { compatible, excluded }` param and apply it right after the merged candidate pool is built, before scoring. When `compatible.length === 0`, propagate an `unsupportedAges` signal in the return value (new field `unsupportedAges: number[]`) and skip picking a tour.
- In `StudioV3.tsx`, call `useTourBokunReadiness()` at the top of the component, pass `state.composition` (adults + minorAges) and the readiness map into the `resolveStudioV3Route` useMemo, and:
  - if `resolved.unsupportedAges?.length`, short-circuit — do NOT compose route points, do NOT call the quote hook, render the same `unsupported-age` block used by the checkout guard, and disable "Continue" in the guests phase.
- Commercial identity stays `studio-v3-private-full-day` — no change to the pricing key.

### 4. Server-resolved band labels in the picker

`BandedSignatureBookingForm` already builds `resolvedMinors` from `quote.quote.basePricing.lines[].label`. Do the same in:

- `SimpleTailorForm.tsx` — pipe the server quote already used for pricing into a `resolvedMinors` array, pass to the picker.
- `routes/tours.$tourId.tailor.tsx` inline picker — same.
- `StudioV3.tsx` guests picker — feed from `resolved.quote.basePricing` when available; otherwise leave undefined so the picker just shows "Age N" (never a client-guessed band).

Delete any client-side Youth/Child/Infant inference if found during the edit (grep confirms none remains outside the resolver).

### 5. Tests (append only; keep existing suite intact)

New file `src/__tests__/sliceB.closure.test.tsx`:

1. Adult confirmed + no Infant category: `{ adults: 2, minorAges: [0] }` against `[adult confirmed]` → hook returns `ready=false, reason="unsupported-age", unsupportedAges=[0]`; a rendered `<button data-testid="reserve">` stays `disabled`.
2. Public Signature with a minor cannot use legacy checkout: render `SimpleBookingForm` with composition `{ adults: 1, minorAges: [8] }` and a readiness that has no matching confirmed child category — assert Reserve is disabled and the unsupported-age block renders; assert no `fetch`/`createBookingQuoteSession` call is made on click.
3. Studio integration — candidate filtering feeds real generation: stub `useTourBokunReadiness` so tour A has no infant category and tour B does; drive `resolveStudioV3Route` with a composition including age 0 whose feeling maps to `[A, B]`. Assert the returned `tour.id === B` and `filtered` contains A with reason `unsupported-age-composition`.
4. Studio — no compatible candidate: same setup where BOTH A and B lack infant category → `resolved.unsupportedAges` includes `0`, `tour` is null / skeleton unset, and StudioV3 does not call the quote hook (spy on `fetchStudioQuote`).

Then run the whole existing suite (`bunx vitest run`) and `tsgo` typecheck.

### Technical notes

- Do NOT touch the server resolver `supabase/functions/_shared/travellerComposition.ts` — the client mirror in `src/lib/pricing/travellerComposition.ts` already matches.
- No refactor of `curation.ts` scoring, no changes to Studio commercial pricing key, no visual redesign.
- No new UI copy strings other than the existing unsupported-age block already introduced in Slice B (reuse it).

### Deliverable / completion report

After implementation the response will include only: files changed; corrected readiness rule; Signature wiring result; actual Studio-generation fallback result (with the filtered tour ids from the test log); full `vitest` output; `tsgo` output; and one 393px screenshot only if the picker/error block UI changed.

**APPROVED — APPLY THREE SMALL CORRECTIONS AND BUILD**

Proceed with the Slice B closure now. Do not return another plan.

**1. Readiness must cover every traveller exactly once**

Do not use only:

categoryBookings.length > 0

Use:

const totalParticipants =

  composition.adults + composition.minorAges.length;

&nbsp;

const resolvedQuantity =

  result.categoryBookings.reduce(

    (sum, line) => sum + line.quantity,

    0

  );

&nbsp;

const adultQuantity =

  result.categoryBookings

    .filter(line => line.uiBand === "adult")

    .reduce((sum, line) => sum + line.quantity, 0);

&nbsp;

ready =

  result.unsupportedAges.length === 0 &&

  resolvedQuantity === totalParticipants &&

  adultQuantity === composition.adults &&

  result.categoryBookings.every(

    line => line.mappingStatus === "confirmed"

  );

Use equivalent fields if the existing resolver returns different property names.

No traveller may be missing or counted twice.

**2. Do not call hooks conditionally**

In SimpleBookingForm, call:

useCategoryAwareCheckoutReadyFor(...)

unconditionally.

Use an enabled option or ignore its result for adult-only legacy checkout.

Do not place the hook inside:

if (composition.minorAges.length > 0)

**3. Separate loading from unsupported ages in Studio**

When the readiness map is still loading or a candidate has no loaded readiness record:

category readiness loading

→ do not generate yet

→ do not label unsupported_age

Only return unsupported_age after the readiness data has loaded and confirmed that no candidate supports the selected ages.

Use:

loading / category_not_ready

for missing data, and:

unsupported_age

only for an actual age incompatibility.

Implement the rest of the proposed plan unchanged, run the full test suite and typecheck, then return the concise completion report.

&nbsp;

Com isto, sim, aprova. O plano fecha a Slice B sem começar outra obra pública, e impede que “temos uma categoria qualquer” seja confundido com “todos os seres humanos desta reserva foram corretamente classificados”.