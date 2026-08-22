# Studio V3 — Deep Audit + Reform Plan

Scope: Studio V3 only (`src/components/studio-v3/*`, `src/lib/studio-v3/*`, `/studio-v3` route). No changes to the rest of the site or global checkout beyond what Studio continuity requires.

---

## Part 1 — Diagnosis (verified against current code)

### What the flow actually is today

Verified `PHASE_ORDER` in `StudioV3.tsx`:

```text
intro → who → feeling → destination → pickup → guests → investment →
interests → rhythm → refinement → occasion → date → considerations →
language → map → storyboard → confirmation(finalReveal) →
guestDetails → checkoutSummary
```

`isPhaseRelevant()` in `curation.ts` already hard-skips `occasion`,
`considerations`, `language`; skips `guests` when inferable; and on
`pathMode: "fast"` also skips `date` + `investment`. `refinement` asks at
most one adaptive question. So the real asked sequence is roughly 8–9
questions on the standard path, 6 on the fast path — but `TOTAL_STEPS = 14`
and the stepper claims "Beat n of 4" over a different grouping, so the
progression the traveller sees does not match the flow they walk.

### (A) Technical problems

1. **Two competing progress models.** `TOTAL_STEPS = 14` vs. the 4-beat
   `STUDIO_V3_ProgressStepper`, whose `beatIndexForPhase` maps 13 phases
   onto 4 labels. Beat 1 ("Feel") covers feeling+destination+pickup+guests;
   Beat 2 ("Shape") covers interests+rhythm+investment. Progress is not honest.
2. **Order drift risk.** `PHASE_ORDER` must stay aligned with `LINEAR_ORDER`
   in `curation.ts` (comment in code says so); two lists, one guard — a real
   dead-end source.
3. **The reveal is Signature-resolution, not composition.** Confirmed in
   `docs/audit-2026-07/studio-findings.md` (S-1…S-6) and
   `composerAdapter.ts`: `composeStudioJourney` exists and defaults on, but
   pricing/checkout/map still run through `resolveStudioV3Route` +
   `resolvePerPaxEur`. Two truth paths coexist.
4. **Reveal fragility.** `validateResolvedSignature()` treats
   `tour-missing-image` as a validation failure alongside missing stops —
   an image problem can degrade a reveal whose text is perfectly valid.
   Text-first rendering is not guaranteed.
5. **Map is representational, not geographic.** `MapAwakens` /
   `StudioV3SignatureMap` render `PortugalSilhouette` + `EditorialMap`
   projection. No real drive times/distances in the Studio surface, while
   the project already has real map + routing components elsewhere.
6. **Typography leaks.** `CreationBeat.tsx` and the `builder/v3` reveal
   components still specify Georgia/Montserrat inline, against the approved
   two-family system (Fraunces + Inter).
7. **Analytics is nearly blind.** Only `studio_started` is emitted via
   `trackEvent` from the Studio; the rest is internal
   `recordStudioV3*` telemetry. There is no per-phase funnel with drop-off.
8. **`StudioV3.tsx` is 5,196 lines** — the reveal, pricing, phase machine and
   checkout handoff all live in one module, which is why regressions recur.

### (B) UX problems

- Question order is logistics-heavy too early: `pickup` and `guests` land at
  positions 5–6, before taste is even expressed. Pickup is a chore; asking it
  before desire is built is where the American traveller's energy drops.
- `investment` (tier) sits before `interests` — money before desire.
- `date` sits at position 12, after refinement — logistics arrive twice,
  split apart, which reads as "another form".
- Feeling (9 options) and Interests (10 options) are both large grids —
  choice overload at the two most emotional moments.
- "Surprise me / You decide" is not a first-class state anywhere.
- Refine is stop-card based, not story-based: it invites configuration, not
  curation.
- Storyboard → finalReveal → guestDetails → checkoutSummary is four screens
  after the decision is emotionally made; the last mile is long.

### (C) Psychology / conversion problems

- **Effort before payoff.** Portugal is not *felt* until `destination` and
  the partial reveal; the first two screens ask before they give.
- **Price anxiety placed early** (`investment` tier at step 7) creates
  budget framing before value framing. Classic conversion killer.
- **No visible interpretation moment.** The system never says, in the
  traveller's own terms, "here is what I understood" before composing.
  Without that, personalisation feels like data entry, not being read.
- **No honest end-in-sight.** Dishonest progress increases abandonment more
  than a longer, honest one.
- **Reveal has no scarcity/ownership language** ("your day", "held for you").

### (D) Differentiating opportunities

1. **Interpretation beat**: one generated-from-facts sentence after taste
   ("You're leaning toward a slow Atlantic day — wine, sea, long tables").
2. **Curator's trust path**: "Let YES decide" answers any question and is
   treated as a signal, not a gap — a premium-travel behaviour no
   configurator has.
3. **Composed day with operational truth**: real drive times between real
   stops, "wineries may vary, nothing is skipped" honesty line.
4. **Story-shaped refine**: "more ocean / less wine / slower / more
   romantic" as four intents, not per-stop configuration.
5. **Reveal as an artefact**: shareable/printable day the traveller wants to
   send to their partner before booking.

---

## Part 2 — The IDEAL YES STUDIO FLOW

Six real phases + reveal + close. Each row: goal · ask · inferred · shown · CTA · exit.

| # | Phase | Psychological goal | Ask | System infers (never asks) | Shows | CTA |
|---|---|---|---|---|---|---|
| 1 | **Invitation** | Imagine, don't fill | none | returning draft, locale, currency | one line + moving Portugal | `Begin` |
| 2 | **Feeling** | First real decision, emotional | 5 evocative choices (down from 9) | candidate regions, likely rhythm bias | subtle "I'm getting the feeling" ack | `Continue` |
| 3 | **Who** | Context in one tap | couple / family / friends / company | guests count, occasion, kid-energy, tier floor | who-shaped copy | `Continue` |
| 4 | **Taste** | Desire, not spec | up to 3 of 6 + **Let YES decide** | interests weighting, add-on eligibility | growing "your day is forming" | `Continue` |
| 5 | **Rhythm** | Emotional pacing | slow / balanced / full | stop count, duration, start time, drive budget | rhythm in words, not numbers | `Shape my day` |
| 6 | **Make it real** | Only-now logistics | date (or *flexible*) + pickup + confirm guests | everything already known is pre-filled and shown as editable chips | "we need only this to make it real" | `Compose my day` |
| — | **Interpretation beat** | "YES understood me" | none | one fact-derived sentence | 2.5s beat, skippable | auto |
| 7 | **Your day** (composition + map + refine, one surface) | Ownership | keep / swap / remove per moment; 4 intents (more ocean, less wine, slower, more romantic) | recompute, re-price, re-route silently | real map, order, drive times, moments | `See my signature story` |
| 8 | **Story / reveal** | "THIS is my day" | none | narrative from real stops only | text-first story, price as a calm line | `Continue to guest details` |
| 9 | **Guest details** | Low-friction | name, email, phone; optional marked | pre-filled from state | reassurance + total | `Continue to summary` |
| 10 | **Summary / checkout** | No surprise | confirm | full breakdown in accordion | audit-able total | `Reserve` |

Progression label: **FEEL → TASTE → SHAPE → YOUR DAY**, mapped 1:1 to the phases above (no more 14-vs-4 mismatch).

Question count: **8 → 5 required**, with logistics collapsed into one screen.

---

## Part 3 — Implementation plan (staged, each stage shippable)

**Stage 1 — Flow reorder + honest progress**
- Single source of order: delete duplicate list, export one `PHASE_ORDER`
  from `curation.ts` and import it in `StudioV3.tsx`.
- New order: `intro → feeling → who → interests → rhythm → refinement? →
  logistics(date+pickup+guests) → map/refine → reveal → guestDetails →
  checkoutSummary`. `investment` becomes inferred (from who + rhythm +
  taste) and no longer a phase; the tier remains available as an edit chip
  inside price disclosure.
- Rewrite `beatIndexForPhase` + `STUDIO_V3_BEATS` to the 4 honest beats.
- Back/edit preserved (existing `advance/back` guards keep working since
  they read the shared order).

**Stage 2 — "Let YES decide" as a first-class answer**
- Add `"decide-for-me"` as a valid value on feeling / interests / rhythm in
  `types.ts`; curation maps it to the strongest inference rather than a gap.
- Analytics event `surprise_me_selected`.

**Stage 3 — Logistics consolidation**
- One `logistics` phase component combining date (with explicit *flexible*),
  pickup and guest confirmation, pre-filled from inferences and shown as
  editable chips. Never re-ask a known field. Flexible date must carry
  explicit copy into the reveal (never an empty date).

**Stage 4 — Interpretation beat + composition**
- Reuse `revealNarrative.ts` to produce the single interpretation sentence
  from real inputs only.
- Wire `composeFromState` / `priceComposedJourney` as the reveal + pricing
  source where the composed journey validates, with the existing Signature
  path as an explicit, labelled fallback ("Prefer our ready-made version?").

**Stage 5 — Map that earns its place**
- Replace the silhouette map inside the composition/reveal with the real
  geographic map component already used for Signature routes, showing order,
  route line and real drive times; static lightweight snapshot in the reveal,
  interactive only in the composition surface. Fix 393px collisions.

**Stage 6 — Reveal robustness**
- Render text/structure first; images are progressive enhancement.
- Downgrade `tour-missing-image` from a reveal-blocking failure to a
  presentation fallback.
- Test: `[data-testid="studio-v3-final-reveal"]` exists, is visible and
  contains text with images blocked, within 2.5s on mobile.

**Stage 7 — Price without shock**
- Reveal shows "Estimated for N guests" + one "what can change this" line;
  full breakdown in an accordion; parity with existing pricing rules
  (no new pricing logic, no invented prices).

**Stage 8 — Typography + mobile 393px**
- Remove inline Georgia/Montserrat from `CreationBeat.tsx` and the
  `builder/v3` reveal components; Fraunces/Inter tokens only.
- Pass over truncation, stepper/close overlap, overflow, card heights,
  focus-visible, fixed CTA obscuring text.

**Stage 9 — Analytics funnel**
- `studio_enter`, `phase_view`, `choice_selected`, `surprise_me_selected`,
  `logistics_completed`, `composition_generated`, `map_viewed`,
  `moment_kept|swapped|removed`, `story_reveal_viewed`, `price_expanded`,
  `guest_details_started|completed`, `back_navigation`, `abandon_by_phase`.
  One helper in the Studio, no redundant duplication of existing telemetry.

**Stage 10 — Docs + QA**
- `docs/studio-north-star.md`: what the Studio is, is not, and the
  non-negotiable principles; update `docs/studio-living-atlas-architecture.md`
  to the new phase model.
- E2E: happy path, Surprise me, back/edit, remove moment, flexible date,
  image failure, 393px, multi-guest pricing.

### Technical notes
- `StudioV3.tsx` (5,196 lines) is split only where a stage requires it
  (logistics phase, reveal surface) — no speculative refactor.
- No new colors, fonts or dependencies. Existing tokens and map/pricing
  modules are reused.
- Pricing rules, Signature source-of-truth and the no-invention rule are
  untouched; composition may only use stops from the resolved tour's own data.

### Needs a business decision (flagged, not assumed)
- Whether the investment tier may be fully inferred, or must stay visible as
  an explicit choice for high-ticket qualification.
- Whether the composed-journey path may drive checkout, or must keep routing
  through the Signature checkout until pricing sign-off.
