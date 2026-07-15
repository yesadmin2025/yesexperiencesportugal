
## What's actually happening (audit)

The user's diagnosis is correct. Confirmed by reading the source:

**Smoking gun — `src/components/studio-v3/curation.ts` line 1387:**

```ts
// STRICT containment: pool = primary tour's own stops only.
const rawPool: PoolStop[] = primary.stops.map((s) => ({ … }));
```

`curateJourney()` picks ONE Signature via `pickPrimaryTour()` and then draws every route point from that Signature's own `stops[]`. `resolveStudioV3Route()` returns that subset. Every consumer (`useResolvedJourney`, `ComposerMap`, `SignatureDayReveal`, `SignaturePriceCard`, `CheckoutSummary`, `FinalRevealStory`) is wired to it. So Studio is by design a Signature editor.

Pricing follows suit — `useResolvedJourney` calls `findTour(state.tourId)` and drives totals from Signature tier tables. Reveal → checkout parity is enforced against the Signature, not against a composed day.

Add-ons already exist in `src/data/signatureAddOns.ts` (region-bucketed, 15 approved add-ons across the country) and are surfaced in `SignaturePriceCard`, but they were pushed under a lifted-state ribbon and are not the "Make it even more yours" section the brief calls for.

Regional inventory beyond the Signature stops already exists in `src/data/regionStopPool.ts` — **62 approved optional stops** distributed across the 6 real regions (Arrábida-Setúbal 18, Alentejo-Évora 14, Sintra-Cascais 8, Comporta-Tróia 7, Fátima-Nazaré-Óbidos 5, Tomar-Coimbra 5, "other" 5). It's already read on the Refine swap accordion (`StudioV3.tsx:3134` `selectReplacementCandidates`) — but only as a **swap pool** on existing slots. It is not the composition source, and it is not exposed as a "browse & add" surface.

Route-leg bug: `getStudioV3RouteLegs` trusts whatever `{lat,lng}` the caller passes. Composed points go through `stopCoords`/`stopGeo` lookup — a stop label that doesn't resolve gets a `null` coord and is either dropped OR (in some code paths) falls back to a distant tour anchor, which produces the 187 km Sintra→"Park…" leg the user screenshotted.

Responsive: the Refine section is rendered inside the "Unified Signature card" (`StudioV3.tsx:3564`) whose grid promotes to two columns at `lg:` — on typical laptop widths this leaves the journey column ~380px and text wraps word-by-word.

---

## Correction — build a real Studio generator (no Signature template)

### Phase A · Break the Signature-template dependency

1. Rename the current `curateJourney` → `curateSignatureDraft` (internal) and mark it *not* the Studio composition source. Keep it only for the legacy code path guarded behind an env/flag until Phase C is verified.
2. Add `composeStudioJourney()` in a new `src/lib/studio-v3/compose-journey.ts`:
   - **Inputs**: full answer set (feeling, companions, rhythm, interests, pickup, occasion, minorAges, considerations, investment, destinationIntent, dateExact).
   - **Region resolution**: `resolveRegion(pickup, destinationIntent, feeling, interests)` → `RegionId`. Uses existing `regionRules.ts`. Returns `{ region, confidence, reason }`.
   - **Inventory**: `union(REGION_STOP_POOL[region].filter(active), regionalSignatureStops[region])` deduped by semantic key. Signature stops keep their narrative; regional-pool stops keep their `notes`/`type`. Every inventory item carries `{ durationMin, coords, type, suitsInterests, suitsRhythm, suitsCompanions, suitsInvestment, source }`.
   - **Scoring** per stop, all soft signals visible to logs but never to the customer:
     - +interest match (per matched `suitsInterests` × weight)
     - +companion fit / −family-only for adult couple / −romantic-only for corporate/family
     - +rhythm fit (`suitsRhythm.includes(rhythm)`)
     - +investment fit
     - +geographic fit vs pickup (haversine)
     - closure-on-date and operational-hours gates ⇒ hard drop with recorded reason
     - one-of-group dedupe
   - **Time budget**: `TIME_BUDGET[rhythm] × investmentDelta` in minutes. Greedy fill by score, subtracting `durationMin + travelMinutes(previous → candidate)` from budget. Travel minutes come from a haversine estimate at compose time and are replaced by real OSRM legs at reveal (existing server fn).
   - **Winery rule**: when interests include `wine`, allow up to 4 winery-type stops within budget; do not inherit any Signature's winery count.
   - **Coast/culture routing**: if interests exclude `heritage`/`monuments` and include `coast`, palace/monument stops are strongly demoted; if interests exclude `coast`, no forced beach stop.
   - **Output**: `{ region, moments: Moment[], reasoning: { matchedPreferences, regionCompatibility, durationCompatibility, per-stop reasons }, estMinutes, coordsResolvedFor: Set<stopId> }`.
3. `resolveStudioV3Route` returns `{ skeletonTourKey: null }` when composed by the new engine; downstream code stops assuming a tour anchor.
4. `useResolvedJourney` splits into two branches — `signatureId`-driven (Signature Tailor) or `composed`-driven (Studio). Studio branch computes price from **per-moment base rates + regional day rate + per-add-on** (see Phase D), not from a Signature tier table.

### Phase B · Refine surface rebuild

Replace the current `RefineAccordion` block with a real information architecture on the reveal page:

1. **Your day** — condensed timeline chip strip (existing `TimelineView`, kept).
2. **Why this fits you** — natural sentence generated from `reasoning.matchedPreferences` ("A slow coast day for two, tuned to wine and the sea, from Cascais.").
3. **Your journey** — ordered moment cards (`RefineStopCard`), each with reorder/remove and a "Replace" action.
4. **Refine the day** — new `<AddMomentSheet />` that opens a bottom sheet / side drawer with:
   - Category tabs derived from actual inventory (`taste, wine, coast, culture, craft, nature, slow`) — only tabs that have candidates for this region + this journey render.
   - Each candidate card: title, one-line why-it-fits, `+durationMin`, `+priceImpact`, availability status, `Add` control.
   - Adding runs the same time-budget check; overflow shows "Adds ~1h 20m — replace another moment or extend the day" with actionable choices, no silent behaviour.
5. **Make it even more yours** — dedicated `<AddOnsPanel />` reusing `signatureAddOns.ts`, filtered by resolved region + composed journey compatibility (respects `conflictsWith` inclusion tags of composed moments; today those tags come from Signature `included[]` — extend `deriveInclusionTags` to also accept composed-moment tags).
6. **Live investment** — one server-authoritative total (existing `SignaturePriceCard` billing surface, wired to the composed pricing).
7. **Continue to your story** — existing primary CTA.

Delete the "Add one more moment" ghost button — replaced by the discovery sheet above.

### Phase C · Route sanity

1. In `composeStudioJourney`, drop any candidate whose coords are missing at compose time (record a `no-geo` rejection) — nothing without coords ever reaches leg calculation.
2. In `getStudioV3RouteLegs`, add a defensive haversine sanity check: if a leg exceeds `REGION_MAX_LEG_KM[region]` (Sintra-Cascais 30, Arrábida 40, Alentejo 90, Comporta 40, Douro 60, Fátima-Nazaré 40), drop that leg from display and log `route-leg.sanity-reject` — do not render the number. Prevents the 187 km Sintra leg the user saw.
3. Invalidate `builder_route_cache` rows tied to Studio v3 session composition (cache key derived from ordered `stopId[]` — changes automatically when composition changes).

### Phase D · Composed pricing (no Signature tier inheritance)

New in `src/data/studioComposedPricing.ts`:

- `REGION_DAY_RATE_EUR_PER_PAX[region]` — approved regional day rates (source: existing Signature "from" anchors averaged by region, treated as day rate not tour rate). If we don't have a defensible number for a region, that region is **not composable yet** — Studio returns `needs-human-refinement` and routes to Contact for that region, per §13.
- `STOP_UPCHARGE_EUR_PER_PAX[stopId]` — only for approved stops with a real per-person upcharge (wine tasting rooms, ticketed sites). Everything else defaults to 0. All values must be sourced from `src/data/regionStopPool.ts` `notes` or `src/data/signatureTours.ts` inclusions; no invented numbers.
- Add-on pricing keeps its existing derivation.
- Age-band pricing for minors reuses the existing rules from `signatureTourPricing.ts` (band factors are agnostic to Signature vs composed).

Every value ships with an inline citation comment. Any region without full data ⇒ Studio surfaces the fallback (`Tailor-made by YES`) — no fabricated pricing.

### Phase E · Responsive fix

- `StudioV3.tsx:3564` unified card: change the shell from a two-column grid at `lg:` to a `grid-cols-[minmax(0,1fr)_320px]` with `min-w-0` on the journey column and `shrink-0` on the sticky price rail (per the responsive-layout guidance). Journey card body gets `max-w-none` + real prose measure (68ch cap).
- Mobile stays single column, price rail collapses into the existing bottom-sheet ribbon.

### Phase F · Verification (five scenarios required by §15.14)

Automated composition test in `src/components/studio-v3/__tests__/compose-journey.test.ts`:

| Scenario | Region | Expected shape |
|---|---|---|
| Adult couple · wine + local food · slow | Arrábida-Setúbal | 2–3 wineries + 1 tasting table, no palace, no beach forced |
| Family with 2 minors · nature + coast · balanced | Sintra-Cascais | Cabo da Roca / Azenhas + 1 family-safe walk, no wine, no fado |
| Coast-focused couple · immersive | Comporta-Tróia | Ferry + Comporta beach + Roman ruins if fits, no inland heritage |
| Culture couple · balanced · no wine | Alentejo-Évora | Évora historic + Roman temple + one village, no winery stops |
| Same region (Sintra-Cascais), heritage-heavy vs coast-heavy | — | Two materially different `moments[]` arrays, asserts overlap ≤ 1 stop |

Test asserts each composed journey is not equal to any Signature `stops[]` in that region (guards against regression to template).

---

## Report deliverable (per §15)

After Phase F, the assistant will post:

1. Why Studio was Signature-cloning (line-for-line quote from `curation.ts:1387`).
2. Prior generation source: `curateJourney` → `pickPrimaryTour().stops`.
3. Removed dependencies: `useResolvedJourney` → `findTour` fallback, `resolveJourneyPricing` on tier tables for Studio, `Signature stops as final journey` in `resolveStudioV3Route`.
4. Regional inventory sources: `REGION_STOP_POOL` (62 stops), `signatureTours.stops` (~250 stops), `signatureAddOns` (15 add-ons).
5. Inventory available per region (table).
6. Add-on data source: `SIGNATURE_ADD_ONS` (region-bucketed by `regionBucket()`).
7. Missing inventory: any region below composition threshold gets flagged, not fabricated.
8. How answers now drive picks: scoring formula + per-stop `reasoning`.
9. Add/replace filtering rules.
10. Winery flex rules.
11. Route bug — cause (missing coord fallback + no sanity guard) and fix.
12. Responsive bug — cause (`lg:grid-cols-2` on the unified card with no `min-w-0`) and fix.
13. Files changed.
14. Test output for the 5 scenarios.
15. Diff-of-stops proving none equal a Signature.

---

## Out of scope (explicitly not touched)

- Signature booking flow, Signature Tailor, Signature price tiers.
- Homepage, About, Corporate, Proposal, Multi-day, Builder, Journal.
- Stripe, Supabase schema (uses existing tables), email templates.
- Brand tokens, typography, motion primitives.
- Studio Intro / Phase 0 / Phase 1 cinematic — only composition + Refine + reveal wiring changes.

---

## Files expected to change

**New**
- `src/lib/studio-v3/compose-journey.ts` — composition engine
- `src/data/studioComposedPricing.ts` — regional day + upcharge data
- `src/components/studio-v3/AddMomentSheet.tsx` — discovery drawer
- `src/components/studio-v3/AddOnsPanel.tsx` — "Make it even more yours" surface
- `src/components/studio-v3/WhyThisFitsYou.tsx` — reasoning ribbon
- `src/components/studio-v3/__tests__/compose-journey.test.ts` — 5-scenario suite

**Edited**
- `src/components/studio-v3/curation.ts` — `resolveStudioV3Route` delegates to composer; legacy `curateJourney` renamed + flagged
- `src/components/studio-v3/useResolvedJourney.ts` — dual pricing branch
- `src/components/studio-v3/StudioV3.tsx` — reveal IA rebuild, responsive shell
- `src/components/studio-v3/RefineAccordion.tsx` — split into 3 (Your Journey / Refine / Add-ons)
- `src/components/studio-v3/SignaturePriceCard.tsx` — accepts composed pricing shape
- `src/components/studio-v3/CheckoutSummary.tsx` — same
- `src/lib/studio-v3/route-legs.functions.ts` — per-region max-leg sanity guard
- `src/data/regionStopPool.ts` — activate any inactive stops that already carry operator-confirmed data (no new stops, no invented data)

**Not edited (guardrail)**
- `src/data/signatureTours.ts`, `src/data/signatureTourPricing.ts` — Signature product owns these.
- `src/routes/signature*.tsx`, `src/routes/tour.$slug.tsx` — Signature booking untouched.
