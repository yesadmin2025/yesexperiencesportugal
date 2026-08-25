# YES Studio V3 — Post-P6 Product Audit and P7+ Roadmap

Read-only audit of current main after P6 "Acknowledge once". No code was changed.

## 1. Executive diagnosis

### What is now genuinely excellent

- **Honest, short flow.** `STUDIO_V3_PHASE_ORDER` (curation.ts:2584) plus `isPhaseRelevant` (curation.ts:2528) turn off `occasion`, `considerations`, `language`, `investment`, `destination`, and the split `date`/`pickup`/`guests`. Real asked path is `intro → feeling → who → interests → rhythm → [refinement] → logistics → map → storyboard → confirmation`. That is 5–6 real decisions.
- **Truth discipline is unusually strong.** Curation sources every stop from real Signature data in one region; `refineIntents.ts` only offers an intent when it is executable; `letYesDecide.ts` never infers wine; pricing/Stripe/Travel File paths are isolated and test-guarded.
- **Inference layers exist and work.** `inferGuests`, `studioInheritedIntent`, `studioSemanticMemory`, `adaptiveQuestionAddsValue`, and now `studioAcknowledgement` mean the Studio really does know things without asking.
- **Repetition is solved.** P6 removed the four-times echo of feeling/taste/rhythm and protects the reveal with a 2-signal floor.

### What is still weak

1. **Intelligence is invisible.** All the inference happens silently; the traveller has no moment where the Studio demonstrably *reads them back* in fresh language. The Studio feels short, not smart. `NextTeaser` was nulled in P4, so between choices there is now literally nothing.
2. **The choice screens are still a form in editorial clothing.** `feeling`, `who`, `interests`, `rhythm` are four near-identical grids rendered from the same `PhaseShell` in StudioV3.tsx (2385–2752). Portugal does not appear until `map`. Time-to-first-visual-payoff is 5 taps.
3. **Reveal is fragmented into three screens.** `map` (MapAwakens) → `storyboard` (StoryboardHandoff) → `confirmation` (WhyRouteWorks + OtherDirections + FinalRevealStory). The payoff is spread thin and the traveller crosses two CTAs to see the whole day. `WhyRouteWorks` and `OtherDirections` sit *above* the reveal, explaining before there is anything to explain.
4. **"Let YES decide" is a per-question shortcut, not a mode.** `letYesDecide.ts` resolves one key at a time; tapping it three times still costs three taps and three screens.
5. **No continuity.** State lives only in `sessionStorage` (StudioV3.tsx:756-794). A closed tab loses everything; there is no shareable preview.
6. **Analytics vocabulary is richer than its call-sites.** `studio-analytics.ts` defines `interpretation_viewed`, `moment_kept`, `moment_swapped`, `abandon_by_phase`; several have no or weak call-sites, so per-phase completion and drop-off are not reliably measurable today.
7. **StudioV3.tsx is 5550 lines.** Every slice below pays an orchestration tax until some of it is extracted.

## 2. Target experience (screen by screen)

```text
1  Invitation      one line, one image, one tap. Portugal already breathing.
2  Feeling         emotion grid. On answer, the backdrop shifts to that mood.
3  Who             one tap. Party inferred silently.
4  Interests       inherited themes shown as "already understood", not asked.
5  Rhythm          pacing. Backdrop resolves to a real region.
6  Director's read one short screen: "So — a slow coastal day for two,
                   with the table at the centre." Fresh prose, not labels.
7  Logistics       date + pickup + party, all prefilled, one screen.
8  Your Day        ONE surface: map (or timeline), ordered moments, story,
                   two or three executable refine intents, price revealed
                   after the day is understood.
9  Guest details   short form, price stays visible.
10 Summary         confirmation ledger, Stripe.
```

## 3. Prioritized roadmap

### P7 — Director's Read (highest impact, low risk)

- **Intent.** Convert silent inference into perceived intelligence. This is the single moment where the Studio stops feeling like a form.
- **Problem it solves.** Diagnosis #1. Nothing today speaks back in the Studio's own voice.
- **Behaviour.** After `rhythm` (and after `refinement` when shown), one full-width beat renders 2–3 sentences composed deterministically from `feeling + companions + interests + rhythm + inherited intent`, using a phrase table — never the option labels verbatim, never AI. Auto-advances on tap; also auto-dismissible like `UnderstoodBeat`. Registers with `studioAcknowledgement` so P6 keeps downstream surfaces quiet.
- **Files.** New `directorsRead.ts` (pure composer) + `DirectorsRead.tsx`; `StudioV3.tsx` (render + one new relevance branch); `studioAcknowledgement.ts` (add `directorsRead` to `ACKNOWLEDGEMENT_SURFACE_ORDER`); new test file.
- **Non-goals.** No AI, no new question, no phase-order change beyond inserting one non-blocking beat, no pricing/curation touch.
- **Acceptance.** Deterministic for a given state; never repeats an option label verbatim; skippable in one tap; downstream Logistics/reveal acknowledgements shrink accordingly; ≤2500 ms on screen at 393px without truncation.
- **Tests/analytics.** Pure composer tests over the feeling × rhythm matrix; assert no verbatim label leakage; wire the existing `interpretation_viewed` event to its first real call-site.
- **Risk.** Low. **Depends on** nothing.

### P8 — Unified "Your Day" surface

- **Intent.** One payoff, not three.
- **Problem.** Diagnosis #3.
- **Behaviour.** Merge `map` + `storyboard` + `confirmation` into a single scrolling surface: map-or-timeline (already truth-gated by `yourDayMapTruth.ts`), ordered moments, story, refine intents, then price. `WhyRouteWorks` moves *below* the moments as a one-line confidence cue. `OtherDirections` becomes a quiet footer link, not a pre-reveal fork. Legacy phases stay in `STUDIO_V3_PHASE_ORDER` for hydration and redirect into the unified surface.
- **Files.** `StudioV3.tsx`, `MapAwakens.tsx`, `StoryboardHandoff`, `FinalRevealStory.tsx`, `curation.ts` (relevance only).
- **Non-goals.** No change to composition, map truth rules, pricing, or the CheckoutSummary handoff.
- **Acceptance.** Reveal paints within existing 2500 ms budget; the `no-moments-loop` and `let-yes-decide` e2e specs still pass unchanged; one CTA from day to guest details.
- **Risk.** Medium-high — largest test surface. **Depends on** P7 shipping first (so the pre-reveal beat exists) and on extracting reveal rendering out of StudioV3.tsx.

### P9 — Price after value

- **Intent.** Editorial price reveal following the day, not preceding it.
- **Behaviour.** `RunningInvestmentRibbon` stays quiet ("Investment takes shape with your day") until the unified surface renders the composed day, then the canonical total resolves in place with the existing `InvestmentDelta` pulse. Pricing math untouched.
- **Files.** `RunningInvestmentRibbon.tsx`, `StudioV3.tsx` (visibility condition only).
- **Risk.** Low. **Depends on** P8.

### P10 — "Let YES decide" as a delegation mode

- **Intent.** Make trust a first-class path.
- **Behaviour.** A single "Let YES design it" affordance on the Feeling screen resolves feeling, interests and rhythm together via existing `letYesDecide.ts` deciders, jumps straight to the Director's Read (which then explains every decision made on the traveller's behalf), and each decision remains one tap to change.
- **Files.** `letYesDecide.ts` (add a whole-state resolver over the existing per-key deciders), `StudioV3.tsx`, `directorsRead.ts`.
- **Acceptance.** Delegated path composes the same real day the manual path would; every delegated value is named and reversible.
- **Risk.** Low-medium. **Depends on** P7.

### P11 — Funnel observability

- **Intent.** Be able to measure and later A/B test.
- **Behaviour.** Give every declared `StudioAnalyticsEvent` a real call-site or delete it; emit `phase_view` on every rendered phase including the new beats; emit `abandon_by_phase` on unload.
- **Files.** `studio-analytics.ts`, `StudioV3.tsx`, funnel writer.
- **Risk.** Low, but must not double-count through `VIA_FUNNEL`. **Depends on** P7/P8 landing so phase names are stable.

### P12 — Continuity (draft resume + share)

- **Intent.** Remove the cost of leaving.
- **Behaviour.** Promote the existing session snapshot to a durable draft keyed by an opaque id, resumable by link. No PII in the draft, no login. Share link renders a read-only preview of the composed day only.
- **Files.** StudioV3 persistence block, a new server function, one new table with RLS + GRANTs.
- **Non-goals.** No email capture gate, no account.
- **Risk.** Medium — first slice here that touches the backend. **Depends on** P8 (stable day shape).

### Not recommended as a stage

- **B) A general next-best-question engine.** The flow is already 5–6 questions with one adaptive slot. A general engine adds machinery and unpredictability with almost no question left to optimise. Keep `adaptiveQuestions.ts` as-is.
- **C) Progressive map morphing per choice.** Real geography before a resolved Signature would either be fake or expensive. P7's mood backdrop gets 80% of the feeling at 5% of the cost.
- **J) Post-reveal "one more thing".** Only revisit once add-on attach rates are measurable (post-P11), and only for enhancements already in the catalog.

## 4. Analytics / experimentation

Per-phase funnel: `phase_view` → `choice_selected` → `logistics_completed` → `composition_generated` → `story_reveal_viewed` → `guest_details_started` → `guest_details_completed`. Completion rate by phase and median time-per-phase are the two headline metrics. Reuse the existing hero A/B harness pattern for Studio copy variants — vary copy only, never composition, pricing or truth.

## 5. Do not build

Fake scarcity, countdowns, streaks, progress bars that lie, autoplay audio, a second competing product surface, per-stop upsell chips, AI-written itinerary facts, a login wall, chat input as the primary interface, gamified badges, or any parallax/glass effect outside the homepage scope.

## 6. Recommended first slice

**P7 — Director's Read.** Highest perceived-intelligence gain per line changed, no dependency, no truth surface touched.

- **Allowed files:** new `src/components/studio-v3/directorsRead.ts`, new `src/components/studio-v3/DirectorsRead.tsx`, `src/components/studio-v3/StudioV3.tsx`, `src/components/studio-v3/studioAcknowledgement.ts`, new `src/components/studio-v3/__tests__/studio-p7-directors-read.test.ts`.
- **Test plan:** pure composer determinism; no verbatim option-label echo; acknowledgement themes registered so Logistics/reveal de-duplicate; beat is skippable and never blocking; full Studio V3 unit suite + `bunx tsgo --noEmit`.
