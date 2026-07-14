
# Studio journey — revised plan (audit-first, no invention)

Nothing in the codebase or database has been modified. This plan reports evidence, flags what is missing, and stops for owner decisions where required by the rules.

---

## A. Pricing rules recovered

Evidence gathered:

- `src/data/signatureTourPricing.ts` — the only pricing resolver. `resolvePerPaxEur(tour, guests)` clamps `guests` to `[1..8]` and returns a **single per-person EUR** value from `tour_price_tiers.tiers` (jsonb map `{ "1": eur, ..., "8": eur }`), else the `priceFrom` anchor. **No age-tier logic exists.**
- `supabase.public.tour_price_tiers` — columns `tour_id text`, `tiers jsonb`, `updated_at`, `updated_by`. Live rows checked; every row shape is `{ "1"..."8": <adult EUR> }`. No child/youth/infant keys, no age bands. 12 tour rows in DB; ~14 tours in code — some Signature tours have no tier row and fall back to `priceFrom`.
- `src/data/signatureToursViator.ts` — mirrors the same `priceTiersEUR: {1..8: number}` shape used to seed `tour_price_tiers`. No child pricing field.
- `src/data/signatureAddOns.ts` — add-ons priced as `pricePctOfBase` (fraction of base per-pax anchor) with `pricingUnit ∈ per_person | per_group | per_vehicle | fixed`. No child pricing.
- `supabase/functions/create-signature-checkout/index.ts` — server-side authoritative today: re-reads `tour_price_tiers` from Supabase, multiplies `eurPerPax * guests`, adds validated add-on line items. Enforces `guests ∈ [1..12]` and rejects amounts < €50. **It has no concept of minors.**
- `rg -in "child|infant|minor|youth|age.?band"` across `src/data`, `src/lib`, `supabase/` returned zero pricing hits. Historical migrations and git-tracked files show no removed child-pricing scheme.
- Prior chat memory / project memory (`mem://` index) contains no age-band rules.

**Verdict:** the owner-approved pricing source of truth today prices per **adult** only. There is **no recoverable child/youth/infant band, no discount rule, no minimum age**. Per the correction, "count minors as pax" is unacceptable — so **composition collection stops here** until §D is answered.

---

## B. Active Bókun runtime touchpoints

Full sweep (`rg -in "bokun|bókun" src supabase`, DB schema check):

- **Database:** the Bókun schema was already dropped in migration `20260714201407_*` (columns removed from `bookings`, `stripe_webhook_events`, related mapping table `tour_bokun_mapping` dropped with CASCADE). Runtime schema audit in the previous turn confirmed zero remaining bokun tables/columns/functions/policies/triggers.
- **Runtime code:** zero active `.ts`/`.tsx`/edge-function code paths call Bókun. Verified:
  - No frontend availability calls, product IDs, availability IDs, hooks, or shared modules reference Bókun runtime.
  - `supabase/functions/*` (checkout, stripe-webhook, stripe-session-status, signature-checkout, builder-checkout) contain no Bókun calls.
  - `src/lib/checkout/inclusions.ts` — only **comments** describe an old server priority "Bókun → clientIncluded → nothing". The current server (`create-signature-checkout/index.ts`) uses **only `clientIncluded`** — no Bókun fetch. The comments are stale.
- **Textual residue only (safe to remove in a follow-up cleanup, non-functional):**
  - `src/data/tailorBlueprints.ts` — 3 doc-comment mentions.
  - `src/lib/checkout/inclusions.ts` + its test — comments only.
  - `src/routes/experiences.tsx:156` — one code comment.
  - Historical migration SQL files (must not be rewritten; they encode already-applied history).

**Verdict:** No Bókun runtime request occurs. No user-facing feature depends on Bókun. Dormant migrations remain (as allowed). No replacement work is required for §B. A textual scrub is optional and out of scope for this plan.

---

## C. Route, stop and add-on data audit

### C.1 Stops

- `src/data/signatureTours.ts` `TourStop` shape: `{ label, story, imageTheme, image?, focal? }`. **No coordinates**, **no dwell minutes**, **no opening days/hours**, **no morning/afternoon constraint**, **no removable/replaceable flag**, **no add-on anchor.**
- Coordinates are resolved at runtime by `lookupStopGeo(label)` from `src/data/stopGeo.ts` / `stopCoords.ts` — a **string-match lookup**. Any label drift silently returns null and the stop drops off the map.
- `REGION_STOP_POOL` (`src/data/regionStopPool.ts`) is the only source for replacement candidates; it uses region keys, not per-tour eligibility.
- Dwell time and time-of-day windows do not exist in the data. `use-route-leg-minutes` and `src/lib/studio/timing.ts` estimate durations from stop count + region defaults.

### C.2 Route legs

- Approved routing provider is **Mapbox Directions**, cached in `public.builder_route_cache` (see `src/lib/studio-v2/routing.server.ts`; the client reads via `use-route-leg-minutes.ts`). This is a real driving-route source — **not** straight-line, **not** AI estimates. Good news: leg distance + drive minutes are already trustworthy when the pipeline is used.
- Total-duration display in Studio V3 does NOT consistently pipe Mapbox minutes into the storytelling/summary/Stripe metadata; it uses region rhythm defaults in several code paths (`summarizeDay` in `src/lib/studio/timing.ts`). Convergence gap.

### C.3 Add-ons

Two sources coexist and disagree in shape:

- **Code catalog** `src/data/signatureAddOns.ts` (`ADD_ON_CATALOG`): fields `id, label, blurb, pricePctOfBase, pricingUnit, sourceTourId, minStops?, minHours?, durationMinutes, lisbonSubRegion?, conflictsWith?`.
- **DB table** `public.tour_available_add_ons` (13 active rows) + parent `public.booking_add_ons` (`id, label, pricing_unit, unit_eur, active, inclusion_ids, description, scope, tour_id, add_on_id, active, sort_order`). This carries **unit EUR** and a per-tour eligibility list.

Neither source encodes: **region**, **physical location / anchor stop coordinates**, **capacity**, **time-of-day restriction**, **availability / manual-confirmation flag**, or explicit **route impact minutes** beyond `durationMinutes`. Compatibility filtering today is only:
- Region bucket + Lisbon sub-region (Tejo north/south) in code.
- `conflictsWith` inclusion tags to avoid duplicating what a Signature already delivers.
- `tour_available_add_ons` eligibility in DB — currently unused by the Studio V3 refine surface.

**Verdict:** Approved routing provider exists (Mapbox + cache). Approved coordinate source for stops exists via `stopGeo` but is fragile. Approved dwell/hours/time-window/anchor/capacity/availability data **does not exist**. Approved per-tour add-on eligibility exists but is not wired to the Studio.

---

## D. Owner decisions still missing (blocking)

Implementation of traveller composition, Stripe re-pricing and add-on compatibility cannot proceed until each of these is answered by the owner. Do not implement anything below the line without written decisions here.

D1. **Age bands and pricing rule per band** — for every Signature tour:
   - Adult age (default 18+?).
   - Youth band (e.g. 12–17): % of adult, or fixed EUR, or same as adult?
   - Child band (e.g. 3–11): % of adult, fixed EUR, or free?
   - Infant band (0–2): free, seat-charge only, or excluded?
   - Whether bands vary per tour (e.g. wine tastings adults-only; some suppliers charge full adult from 12).
   - Whether children/infants count toward `guests` for tier resolution (currently tier 1..8 uses total pax).
   - Minimum age or "not suitable for children" restrictions per tour (some tours may be adults-only entirely).

D2. **Add-on child pricing** — do add-ons follow the same age-band rule, always adult-priced, or unit-specific (per_group / per_vehicle stay flat regardless)?

D3. **Group-size vs tier** — with mixed adults + children, does the pricing tier lookup use `adults + minors` (current behaviour) or `adults only` or `chargeable pax`?

D4. **Add-on eligibility fields we must add** — confirm which of these owner-approved facts exist and where to sourced from (per add-on):
   - anchor stop label or GPS point,
   - real duration and time-of-day window (morning/afternoon/either),
   - real capacity limit (e.g. boats),
   - manual-confirmation vs instant,
   - which specific tour ids it may attach to (beyond region).

D5. **Stop-level operational data** — per stop: coordinates (canonical, no label lookup), dwell minutes, opening days/hours by season, removable Y/N, replaceable Y/N (and by whom), add-on anchor Y/N. Owner must supply this dataset (spreadsheet or admin form) or approve extracting from Viator/existing internal notes.

D6. **Story-email consent copy** — approved wording of the explicit submit button (proposed: **"Continue and email my Signature story"**) and confirmation that no marketing consent is bundled.

D7. **Optional but recommended** — approval to store the read-only journey revision hash inside the existing `email_send_log.metadata` jsonb (no schema change) rather than a new column.

---

## E. Corrected implementation phases (executed only after D is answered)

Each phase is gated. Do not start a phase until the prior phase's owner approval + verification passes.

### E0 — Pricing source of truth (blocks everything else)
- Extend `tour_price_tiers.tiers` jsonb (or add a sibling column `age_bands jsonb`) with owner-decided age bands (D1). Non-destructive: existing `{1..8}` adult tiers keep working.
- Rewrite `resolvePerPaxEur` to accept `{ adults, minorAges[] }` and return `{ lines: [{ label, unitEur, qty, ageBand }], totalEur }`. Zero fallback to adult price for minors — throw if a band is missing.
- Server (`create-signature-checkout`) becomes the single authority: accepts only `{ tourId, adults, minorAges[], addOns[{id, qty}], dateExact, pickupLabel, environment }` and independently recomputes every line. **Client-supplied prices removed** (`priceFromEur`, add-on `priceEur`, `includedItems`). Reject checkout if any line unresolved.
- Tests: `signatureTourPricing.age-bands.test.ts` (unit), `create-signature-checkout.test.ts` (integration) covering "child missing band → reject", "adults+children mixed → itemised total", "add-on child rule".

### E1 — Composition capture UI
- `StudioV3State` extended: `adults: number | null; minorAges: number[]`. `guests` becomes derived. Load/save signature payloads backfill legacy `guests` as `{ adults: guests, minorAges: [] }`.
- Replace `GuestStepper` with `GroupComposition` (44×44 controls, per-minor age input, validation blocks advance).
- `guests` phase guard prevents advancing to `map` (Reveal) until composition validates against the age bands from E0 (e.g. adults-only tours reject minors up-front).

### E2 — Shared journey state + revision id
- New hook `useResolvedJourney(state)` returns `{ tour, orderedStops, addOns, priceLines, totalEur, durationMinutes, adults, minorAges, dateExact, pickup, journeyRevision }`.
- `journeyRevision = sha1(tourId|orderedStopIds|addOnIds|dateExact|pickup|adults|minorAges.sorted)`.
- Storytelling (`FinalRevealStory`/confirmation), `GuestDetailsStep` recap, `CheckoutSummaryStep`, story-email snapshot, Stripe metadata all consume `useResolvedJourney`. No other resolver is called downstream. Dev-only invariant: summary total === server-quoted total (added to E4).

### E3 — Refine convergence + add-on compatibility
- Only after D4/D5 land the missing add-on/stop fields (E3a data work). Then filter add-ons through the real compatibility predicate (region, anchor stop present in current route, capacity ≥ chargeable pax, time-of-day OK, day-of-week OK). Auto-deselect on incompatibility with a calm toast.
- Stop removal/replacement + add-on toggles write to shared state; every subsequent phase re-derives via `useResolvedJourney`. Removed stops never re-appear downstream (test).

### E4 — Checkout: summary above Stripe on one page
- `checkoutSummary` phase becomes a single page: mobile stacked (summary → Stripe Embedded); desktop two-column with summary sticky-visible. Retire the `BrandedCheckoutDrawer` from the Studio V3 path (kept for other entry points).
- Client sends only approved inputs (see E0). Server re-computes and returns Stripe `clientSecret`. Summary displays the server-returned `priceLines`, not client-computed values (dev assertion fails the render if client-derived total drifts from server total).

### E5 — Story email: submit-only, revision-scoped
- Delete `onEmailBlur` from `GuestDetailsStep` and its wiring in `StudioV3.tsx`. No blur send. No checked-by-default consent.
- New explicit primary CTA on Guest Details: **"Continue and email my Signature story"** (owner-approved copy per D6). Clicking it advances to checkout AND enqueues the email once. Failure toasts a retry that re-invokes the same server fn.
- `sendSignatureStoryEmail` idempotency key becomes `signature-story-${sha1(email|tourId|journeyRevision)}` — `journeyRevision` is passed from client but included **only inside the existing key hash** (no new DB column, unless D7 is approved to write it into `email_send_log.metadata`).
- Snapshot payload sent to the email builder = `useResolvedJourney(state)` — same object powering Storytelling on screen. Never calls a new AI resolver.

### E6 — Verification suite
- Vitest: composition validation, age-band pricing math, refine → downstream re-derivation, revision hash stability, email submit-only + dedupe.
- Playwright (mobile, per project rule): full path Preferences → Map Reveal → Refine (remove stop + add add-on) → Storytelling → Guest Details submit → summary-above-Stripe → server total matches summary total. Second run with same inputs: no second email; back-nav + refine + resubmit: exactly one new email with new revision.
- Regression tests: no Bókun runtime request (network intercept in Playwright).

---

## F. Exact files and database objects proposed

Nothing modified now. Proposed touch list once D is answered:

**Frontend / shared code**
- `src/components/studio-v3/types.ts` — `StudioV3State` gains `adults`, `minorAges`, derives `guests`.
- `src/components/studio-v3/StudioV3.tsx` — remove `onEmailBlur` wiring, mount `useResolvedJourney`, gate `map` advance on composition, wire new checkout page.
- `src/components/studio-v3/GuestStepper.tsx` → replaced by new `GroupComposition.tsx`.
- `src/components/studio-v3/GuestDetailsStep.tsx` — remove blur callback; add explicit "Continue and email my Signature story" CTA; show composition recap with "Edit" back-link.
- `src/components/studio-v3/CheckoutSummary.tsx` — rebuild as single-page summary-above-Stripe layout consuming server `clientSecret` directly.
- `src/components/studio-v3/curation.ts`, `src/lib/studio/timing.ts` — read composition; use Mapbox leg minutes for total duration.
- `src/data/signatureTourPricing.ts` — new signature returning itemised `priceLines` with age bands. No adult fallback for minors.
- `src/data/signatureAddOns.ts` + `public.tour_available_add_ons`/`booking_add_ons` — add owner-approved compatibility fields (D4).
- `src/lib/studio-v3/save-signature.functions.ts` / `load-signature.functions.ts` — persist + backfill composition.
- `src/lib/emails/sendSignatureStoryEmail.functions.ts` — accept `journeyRevision`; new idempotency key; snapshot payload from shared state only.
- `src/components/studio-v3/signatureStorySnapshot.ts` — consume `useResolvedJourney` output; never invents facts.
- `src/components/checkout/BrandedCheckoutDrawer.tsx` — kept, but Studio V3 stops importing it.
- Tests as listed in E6.

**Server (edge functions)**
- `supabase/functions/create-signature-checkout/index.ts` — remove client price/inclusion inputs; recompute everything from DB; require `adults` + `minorAges`; reject unresolved lines; add `journey_revision` to metadata.
- `supabase/functions/stripe-webhook/index.ts` — persist `adults` and `minor_ages` into `bookings.notes`/existing jsonb metadata field (no schema change) using webhook metadata.

**Database (proposals only, non-destructive)**
- `tour_price_tiers` — extend `tiers` jsonb shape (or add `age_bands jsonb`) per D1. Backfill script for existing 12 rows + insert rows for tours currently missing tiers (owner supplies EUR).
- `tour_available_add_ons` / `booking_add_ons` — add owner-approved columns for anchor, capacity, time window, availability, per-tour eligibility (D4). All non-null-with-default so existing rows stay valid.
- No new columns on `email_send_log`. Revision lives inside the existing idempotency key. Optional D7: write revision into existing `email_send_log.metadata` jsonb.

**Not touched**
- `src/integrations/supabase/*` (auto-generated).
- Historical Bókun migrations.
- Any Signature tour copy, hero image, or catalogue entry.

---

## G. Confirmation

No file has been modified. No database row has been modified. No migration has been enqueued. This plan is read-only exploration + a revised proposal. Implementation waits on the owner decisions in section D.
