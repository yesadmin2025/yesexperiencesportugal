# YES Studio — Audit and Next-Phase Roadmap (plan only)

Base inspected: main at `41aa0068c` (post pricing closure). No code, data or deployment changes in this pass.

## 0. What is already good and must be preserved

- Phase truth is centralised: `STUDIO_V3_PHASE_ORDER` + `isPhaseRelevant` in `curation.ts` already suppress occasion, considerations, language, investment, destination, date, pickup, guests, map, confirmation. The visible flow is genuinely short.
- P6–P10 work holds: acknowledge-once ledger, unified `storyboard` Your Day, value-before-price, delegation with take-back, route authority.
- Pricing truth is now server-authoritative: exact-tier fail-closed, principal-removal whitelist, canonical add-on identity, instant-confirmation copy.
- Price tiers already live in Supabase (`tour_price_tiers`) with an admin editor at `/admin/pricing`.

## 1. Studio experience audit

### Asked vs. declared
Declared 21 phases; actually asked: `intro → feeling → who → interests → rhythm → [refinement] → logistics → storyboard → guestDetails → checkoutSummary`. That is 6 questions max. The problem is no longer question count — it is **beat weight and causality**.

### Findings
- **Weight concentration.** `StudioV3.tsx` is 5,930 lines and `curation.ts` 3,591; `SignaturePriceCard.tsx` 1,639 and `StudioV3SignatureMap.tsx` 1,251. Any Studio change is high-blast-radius, and the initial route chunk is large.
- **Causality gap.** Feeling / who / interests / rhythm each play a reaction beat, but the day itself (map, moments, duration) is not visible until `storyboard`. The traveller answers into a black box and only then sees a day. This is the main reason it still reads as a configurator.
- **Logistics still precedes desire payoff.** Date + pickup + party sit between the last taste question and the reveal. Emotionally the reveal should arrive first, logistics second, as a confirmation of a day already felt.
- **Copy overload at the seams.** Reaction beats, Director's Read, unified Your Day story, WhyRouteWorks and the price card each restate the same rationale in different words.
- **Refine is buried.** Swaps exist (`RefineAccordion`, `RefineStopCard`, route authority) but only after the reveal, so authorship reads as "editing YES's plan", not "I made this".

### Ideal interaction model (no rhythm/stop-count changes)
1. **Persistent living day strip** from the first answer: a thin, always-present map + moment rail that mutates on every meaningful choice. Pins appear/dim, duration counter moves, one moment card flips. Rhythm keeps driving `RHYTHM_STOP_COUNT` and dwell exactly as today.
2. **Delta micro-confirmation** instead of prose: on each answer, one line + one visible change ("Coast added · 2 moments moved"), replacing the current longer reaction copy.
3. **Reveal earlier**: storyboard renders straight after rhythm/refinement; logistics becomes an inline "make it real" block inside Your Day, prefilled, not a gate.
4. **Ask / infer / skip**: ask feeling, who, interests, rhythm; infer destination, investment, occasion (already done); make refinement explicitly skippable with visible cost ("skip — YES decides"); defer language and considerations to guest details.
5. **Authorship gestures inside the reveal**: swap a moment, drop a moment, reorder pace — each with a before/after delta chip and undo. Only from real curated candidates.

Mobile: 393px first, one primary action per screen, map strip ≤ 30vh, no gamified counters or badges.

## 2. Conversion audit — Signature / Tailor / Studio / checkout

### Concrete duplication and friction found
- Age/child explanation appears in at least five surfaces: `PriceBreakdownRows.tsx`, `PerPersonBands.tsx`, `ChargeSummaryLine.tsx` ("add an age for every child so we can price honestly"), `FinalDetailsDialog.tsx`, `BrandedCheckoutDrawer.tsx` ("age-based pricing" + composition sentence).
- Trust/cancellation repeats: `TrustStrip.tsx` renders on three placements and is repeated again inside the drawer.
- `tours_.$tourId.tailor.tsx` is 2,179 lines and carries its own price explanation surface distinct from `SignaturePriceCard`, so Signature and Tailor say the same things differently.
- Studio `CheckoutSummary.tsx` (547) restates itinerary, guests and price already shown on Your Day.

### Single decision hierarchy (all three surfaces)
Main surface answers exactly five things, in this order:
1. What am I getting — title, 1 line, 3 moment chips.
2. When — date + start.
3. For how many — "4 guests · 2 adults, 2 children" with an Edit affordance.
4. Total — **total first**, per-guest as secondary muted line.
5. What happens on Reserve — one line: "Instant confirmation by email. Secure payment by Stripe."

Everything else moves behind two disclosures only: **"How this price works"** (tiers, age bands, direct-price advantage, Tailor credits/supplements) and **"What's included / cancellation"**. Amounts and math unchanged.

### CTA and payment handoff
- One primary CTA per screen. Labels: Signature `Reserve this day` → Studio `Continue to guest details` → `Continue to summary` → `Pay securely`.
- Sticky CTA on mobile shows total + label only, never explanations; never covers content (existing budget test stays the gate).
- Stripe takes over at the summary, embedded, after guest details validate. No extra interstitial.
- Target path: Signature 3 screens (card → guest details → summary/Stripe); Studio 4 (Your Day → guest details → summary → Stripe).

## 3. Admin / CMS architecture roadmap

Today: pricing tiers, photos, reviews, imported tours, builder images are DB-backed; **Signature content, add-on catalog, Tailor rules and Studio taxonomy are code-owned** (`signatureTours.ts`, `signatureToursSourceOfTruth.ts`, `signatureAddOns.ts`, `tailorRules.ts`, `tailorBlueprints.ts`, `tailorStopPricing.ts`, `livingAtlasTaxonomy.ts`).

### Migrate to DB (editable)
| Table | Owns |
|---|---|
| `signature_products` | title, subtitle, region, duration, description, status, ordering/featured, SEO fields, tailor_eligible |
| `signature_stops` | ordered stops, duration, notes, customer label, `pricing_class` (principal / descriptive / locked / dedicated-credit), `is_locked` |
| `signature_inclusions` | included / excluded / pickup rules |
| `signature_media` | hero + gallery refs (reuse `tour-photos`) |
| `add_on_catalog` | label, category, pricing rule (pct/fixed), unit, duration, eligible tours/regions, max selections, active |
| `tailor_rule_sets` | lunch supplement/removal, winery ladder pickMin/pickMax, credit caps, customer labels |
| `studio_taxonomy` | feelings, interests, rhythms, adaptive question copy, destination intents (copy + weights only) |
| `availability_closures` | scope (global / tour / add-on), date or range, recurrence, reason, capacity, internal note |
| `content_versions` + `admin_audit_log` | draft/publish, diff, rollback, who changed what |

### Stays code-owned (safety/algorithm)
Curation scoring, route authority, rhythm→stop-count mapping, principal-credit semantics, exact-tier fail-closed rules, server add-on identity, checkout math. Admin edits **data**, never contracts.

### Anti-dual-truth rule
One resolver per domain (`resolveSignatureProduct`, `resolveAddOnCatalog`, `resolveTailorRules`) that reads DB and falls back to the code seed only when a row is absent, plus a parity test asserting DB rows validate against the code schema. Code files become seed + schema, not runtime truth.

### Availability — critical gap
`src/lib/availability.ts` reads `tour_operating_rules` **client-side only**; `create-signature-checkout` contains no availability check (verified: no `blackout` / `weekday` / `min_lead` reference in the function or shared modules). A closed date can be booked by replaying a request. Availability must become server-authoritative and fail closed, sharing the same `availability_closures` source as the ops dashboard.

### RLS / authorization
All new tables: `GRANT` explicitly; public read limited to published rows; writes only via `has_role(auth.uid(),'admin')`; drafts never readable by `anon`; audit log insert-only.

## 4. Analytics and experimentation

Existing: `analytics-events.ts` taxonomy plus `studio_v3_funnel_events` with GA mirror. Missing: reserve-intent on Signature/Tailor, Stripe session created, payment success/failure keyed to session, add-on attach, Tailor rule usage, availability-block exits, price-unavailable/contact exits, refine/swap usage, delegation usage.

Proposed spine (one name per step, source + device + tour on every event):
`view_product → reserve_intent → guest_details_start → guest_details_valid → checkout_session_created → payment_success | payment_failed`, plus Studio `studio_start → beat_view → beat_answer → refine_used → delegation_used → reveal_seen`.

Dashboard metrics: start rate, per-beat completion and drop, refine/delegation usage, back-navigation rate, guest-details abandonment, checkout-start rate, payment success, add-on attach rate, Tailor usage, availability-exit rate, conversion by device/source/tour. No scarcity or urgency patterns.

## 5. Performance and design system

Risks: `StudioV3.tsx` 5.9k lines + `curation.ts` 3.6k in the Studio entry chunk; two large map components; hero/scene video; per-surface duplicated price components.

Plan: split curation/scoring into lazily-imported modules, lazy-load the map behind the living-day strip with a static pin fallback, memoise curation results per state hash, and share one `DecisionSurface` primitive (header / facts / total / CTA / disclosure) used by Signature, Tailor and Studio so density, spacing and sticky behaviour are defined once.

## 6. Implementation plan

**QUICK WINS (low risk, presentational)**
1. Collapse duplicated age/trust/cancellation copy into two disclosures; one primary CTA per screen; total-first hierarchy.
2. CTA label alignment across Signature / Tailor / Studio.
3. Add missing funnel events (reserve intent, session created, payment result, add-on attach).

**STRUCTURAL**
4. `DecisionSurface` primitive + adopt in Signature, Tailor, Studio summary.
5. Persistent living-day strip and delta micro-confirmations; reveal before logistics; logistics inline in Your Day.
6. Studio bundle split and map lazy-load.
7. Admin/CMS phase 1: `signature_products` / `signature_stops` / `signature_media` with resolver + parity tests, draft/publish, audit log.
8. Admin/CMS phase 2: add-on catalog and Tailor rule sets behind the same resolver pattern.

**HIGH RISK (own phase, own gates)**
9. Server-authoritative availability (`availability_closures` + fail-closed checkout) — must land before Admin can close dates.
10. Any change touching curation scoring or route authority.

**DO NOT TOUCH YET**
Pricing math, tier values, age bands, rhythm→stop-count, principal-credit semantics, Stripe/webhook/idempotency, Travel File paid-only guard, generated files.

Regression gates for every phase: `tsgo --noEmit`, pricing/checkout suites, full Studio/lib suite, Playwright at 393×852 and 1440×900 with zero page errors and no overflow, CTA-viewport budget, and no-deploy until explicitly approved.

## Inspected

`src/components/studio-v3/*` (StudioV3, curation, SignaturePriceCard, CheckoutSummary, GuestDetailsStep, MapAwakens, FinalRevealStory, LivingJourneyPanel, StudioV3SignatureMap), `src/components/checkout/*`, `src/routes/` (studio-v3, tours.$tourId, tours_.$tourId.tailor, checkout.$token, admin.*), `src/data/` (signatureTours, signatureToursSourceOfTruth, signatureToursViator, signatureTourPricing, signatureAddOns, tailorRules, tailorBlueprints, tailorStopPricing, tierMonotonicityAudit), `src/lib/availability.ts`, `src/lib/analytics-events.ts`, `src/lib/studio-v3-funnel.ts`, `supabase/functions/create-signature-checkout/index.ts`, `supabase/functions/_shared/*`, tables `tour_price_tiers`, `tour_operating_rules`, `studio_v3_funnel_events`, `bookings`.
