# Studio V3 — P6 audit and next slice

Read-only audit of current main (HEAD `7f7e93c1f`). Nothing was edited.

## 1. Current-state diagnosis

**The question chain is already short.** `STUDIO_V3_PHASE_ORDER` (`curation.ts:2584-2609`) still lists 20 phases, but `isPhaseRelevant` (`curation.ts:2528-2562`) hard-disables `destination`, `date`, `pickup`, `guests`, `investment`, `occasion`, `considerations`, `language`. What a traveller actually answers is:

```text
intro → feeling → who → interests → rhythm → [refinement ×1] → logistics(date+pickup+party+review)
      → map → storyboard → confirmation → guestDetails → checkoutSummary
```

So P6 is **not** "remove another question" — there is almost nothing safe left to cut. The remaining problem is different:

**The same three facts are re-stated four to five times.** Feeling, top interest and rhythm are surfaced as:
1. the reaction beat after Feeling (`StudioV3.tsx:448-471`)
2. the "Already understood" row on Interests (`StudioV3.tsx:2599-2620`, P5)
3. `UnderstoodSummaryLine` on refinement, and again on Logistics "when" (`StudioV3.tsx:2723`, `LogisticsPhase.tsx:154-158`) — already patched defensively with `acknowledgementShownEarlier` (`StudioV3.tsx:2473`)
4. the reveal's signal pills (`FinalRevealStory.tsx:375-394`), built from the same inputs as `understoodSignals`
5. Date/pickup/party shown in the Logistics review rows (`LogisticsPhase.tsx:259-276`) and repeated verbatim in the reveal facts line (`FinalRevealStory.tsx:358-365`)

That is what makes the flow feel like a questionnaire that keeps reading its own notes back, rather than a director who remembers once and then moves.

**Three parallel mechanisms reason over the identical signal.** `hasExplicitWineIntent` feeds (a) `studioInheritedIntent` pruning, (b) `deriveSemanticMemory` / `addsNewDimension` suppression (`adaptiveQuestions.ts:148-152`), and (c) the wine refinement question's own `wineRelevant` gate (`adaptiveQuestions.ts:159-168`). They agree today, but there is no single contract asserting they cannot diverge.

**The AI advisor is correctly caged.** `useStudioIntentAdvisor` may only reorder — which of the eligible adaptive questions is asked, and refine-chip order (`studioIntentAdvisor.ts:159-222`). It cannot create, gate, or price. No change proposed there.

**Test surface that locks current behaviour:** `studio-reform-flow.test.ts`, `adaptive-questions.test.ts`, `studio-semantic-memory.test.ts`, `studio-p5-inherited-intent.test.ts`, `studio-intent-advisor.test.ts`, `studio-v3-arc-headlines.test.ts`, `progress-stepper.test.tsx`, `reveal-section-order.test.ts`, `final-reveal-signals-*.test.tsx`.

## 2. P6 recommendation — "Acknowledge once"

**One acknowledgement authority for the whole Studio.** Instead of five surfaces each independently re-deriving and re-printing what the traveller said, introduce a deterministic ledger of *what has already been acknowledged on screen*, and let each surface show only what is genuinely new at that moment.

Behaviour:
- A pure module derives, per phase, the set of signals worth acknowledging **minus** those already shown earlier in the session. Derived from state only; no AI, no persistence beyond the session state already held.
- Interests keeps the P5 "Already understood" row (it is the first acknowledgement and it earns its place).
- Refinement and Logistics stop re-printing signals that Interests already showed; if nothing is new, they render nothing (silence, not a placeholder).
- Logistics review keeps date/pickup/party (it is a confirmation of just-entered data), but the reveal facts line and the reveal signal pills drop any signal already acknowledged verbatim earlier — the reveal keeps only the operational facts (region/date/pickup/party) plus signals that first appear there.
- Replaces the ad-hoc `acknowledgementShownEarlier` boolean with the ledger, so the rule is one place instead of a defensive flag.

Why this over the alternatives: cutting another phase would break operational truth (logistics is required) or the locked phase-order tests for no felt gain; contextual microcopy without a ledger just adds a sixth place that says the same thing. This slice is the only one that makes the flow *feel* shorter without asking less.

**Allowed files**
- new `src/components/studio-v3/studioAcknowledgement.ts`
- `src/components/studio-v3/StudioV3.tsx` (wiring + interests/refinement rows)
- `src/components/studio-v3/LogisticsPhase.tsx` (acknowledgement row only)
- `src/components/studio-v3/FinalRevealStory.tsx` (signal pills filtering only)
- new `src/components/studio-v3/__tests__/studio-p6-acknowledge-once.test.ts`
- possible minimal touch: the reveal-narrative signals module, only if pill filtering must happen there to keep `final-reveal-signals-*` in lockstep

**Non-goals (do not touch)**
Pricing, `signatureTourPricing`, `AGE_BAND_PCT`, `resolveJourneyPricing`/`resolvePerPaxEur`, add-on formulas, Stripe edge functions, webhooks, checkout creators, Travel File / booking access, curation route composition, stops, suppliers, maps and map truth, `STUDIO_V3_PHASE_ORDER` and `isPhaseRelevant` (unchanged), the advisor trust boundary, analytics event names, Supabase, generated files, brand audit.

## 3. Acceptance criteria + focused tests

Criteria
- No signal string is rendered twice across Interests → refinement → Logistics → reveal for the same state.
- Removing all duplicates never removes the *only* acknowledgement — every traveller with at least one explicit signal sees it exactly once.
- Operational facts (date, pickup, party, region) are exempt: they may appear in both Logistics review and the reveal.
- When nothing new exists for a surface, it renders nothing — no empty container, no filler copy.
- Back-navigation and changing Feeling recompute the ledger deterministically; no stale acknowledgements.
- Phase order, gating, stepper beats, reveal section order and locked headline copy are byte-identical to today.
- Keyboard, focus order, 44×44 targets and analytics unchanged.

Tests (`studio-p6-acknowledge-once.test.ts`)
- same state → union of acknowledged signals across all surfaces has no duplicates
- single-signal state → that signal appears exactly once, on Interests
- signal that first becomes true at refinement → appears at refinement, not repeated at reveal
- operational facts still appear at both Logistics review and reveal
- empty acknowledgement set → surface returns nothing
- changing feeling recomputes with no stale entries
- ledger never mutates `state.interests` or any state field

Plus existing suites must stay green: the semantic-memory, adaptive-question, P5, advisor, arc-headline, stepper and reveal-section-order files, the Studio V3 unit suite, and `bunx tsgo --noEmit`. No brand audit.

## 4. Checkout / payment findings (separate)

**Neither checkout creator requests any payment method at all.**

- `supabase/functions/create-signature-checkout/index.ts:426-483` builds `sessionParams` with `mode: "payment"`, `locale`, `submit_type`, `billing_address_collection`, `phone_number_collection`, `allow_promotion_codes`, `custom_text`, `consent_collection`, `payment_intent_data`, `metadata`. There is **no** `payment_method_types` and **no** `automatic_payment_methods`.
- `supabase/functions/create-builder-checkout/index.ts:129-155` — same: `mode: "payment"`, `ui_mode: "embedded_page"`, no `payment_method_types`, no `automatic_payment_methods`.
- A repo-wide search for `payment_method_types`, `automatic_payment_methods`, `payment_method_options`, `payment_method_configuration` returns **zero** hits in `supabase/functions`, `src/lib` and `src/routes`.
- Studio, Signature and Tailor all funnel into `create-signature-checkout` (`StudioV3.tsx`, `GuestDetailsStep.tsx`, `tours_.$tourId.tailor.tsx`, `SimpleBookingForm.tsx`, `FinalDetailsDialog.tsx`); only the Builder uses the second creator. The two diverge in `ui_mode` and metadata, **not** in payment methods.
- `supabase/functions/_shared/stripe.ts:12-17` prefers `STRIPE_RESTRICTED_API_KEY` (`rk_live_…`) over `STRIPE_LIVE_API_KEY` in live mode.
- `src/components/trust/PaymentMethodsRow.tsx:7,77-132` advertises PayPal, Klarna, Multibanco, MB WAY, Revolut Pay, Apple Pay and Google Pay to guests — a promise the session parameters do not make.

**Likely reason only card appears:** because no methods are specified, Stripe Checkout falls back entirely to the account's **dashboard payment-method configuration for live mode**. If only card is enabled/activated there (Multibanco, MB WAY, Klarna and PayPal each need explicit activation, and some require business-country/currency eligibility review), Checkout shows card only — exactly the symptom reported. Contributing possibilities worth confirming, in likelihood order:
1. live-mode payment methods not activated on the Stripe account (most likely — matches "sandbox shows more, live shows card")
2. the restricted key's payment-method-configuration permissions, if it cannot read the configuration
3. per-method eligibility rules at run time (currency, amount, customer country) silently filtering methods out

This is a Stripe **account configuration** matter first, a code matter second. A future code slice could set `automatic_payment_methods: { enabled: true }` (or an explicit `payment_method_configuration`) so behaviour is declared in code rather than inherited — but that must be its own reviewed slice, and it will still surface nothing that is not enabled on the account. No Stripe call was made and no payment code was read for modification.

## 5. Risks and dependencies

- **Test coupling.** `final-reveal-signals-*.test.tsx` asserts rendered pills match the narrative module exactly; filtering at the component would break that lockstep. Filter in the signals module, or update both together.
- **Over-silencing.** Aggressive de-duplication could leave a surface blank where the traveller expected reassurance. The "exactly once" test is the guard; if a surface reads too empty in review, prefer keeping the first occurrence and cutting later ones, never the reverse.
- **Stepper fragility.** `beatIndexForPhase` returns `null` for unmapped phases and hides the stepper — P6 does not change phase identity, so this stays safe, but any later merge must update that switch.
- **Three-gate divergence.** Inherited intent, semantic memory and adaptive gating agree today by construction; P6 could add a cheap contract test asserting they cannot disagree for the wine/coast/faith/hands-on themes.
- **Dependency:** none outside the Studio; no migration, no backend, no Stripe change.

Nothing implemented. Approve to proceed with P6, or redirect.
