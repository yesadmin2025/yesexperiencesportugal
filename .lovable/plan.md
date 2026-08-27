# Experience Studio V3 — final polish audit (product design + interaction intelligence)

Audit performed against current `main` (`e7afc95ae`) by reading the live source, not
prior plans. Every claim below is backed by a file read. No code was changed.

## Already solved — do not re-open

- **Repeated final total on the refine surface.** Both totals still render in the DOM,
  but `studioMobileA11y.css:40-67` makes them mutually exclusive (party total before
  add-ons, resolved total after) and hides the ledger's third total row. Protected by
  `studio-price-echo-contract.test.ts`. Working as intended.
- **Acknowledgement echo across screens.** `studioAcknowledgement.ts` is a real
  deterministic theme ledger across `interests → refinement → directorsRead →
  logistics → reveal`, with a 2-signal floor on the reveal. It paraphrases themes and
  never echoes raw option labels.
- **Combinatorial intelligence exists** in `directorsRead.ts:172-263` (feeling +
  companions + up to 2 interests + rhythm) and `revealNarrative.ts:114-173`.
- **Reaction pacing ceilings** (`StudioV3.tsx:4911-4917`), CTA non-competition on the
  Your Day surface (single primary + Save), truthful confirmation, checkout retry-in-place,
  route authority chain, price-after-value ordering, delegation take-back logic.
- **Route/stop *labels*** are not duplicated: legend shows labels only, timeline is an
  overview by design (`UnifiedYourDayRoute.tsx:12-14`).

---

## Ranked remaining issues

### 1. Reaction beats echo the option label the traveller just tapped — HIGH value, LOW risk

- **File:** `src/components/studio-v3/StudioV3.tsx:1460-1500`, `:1638`, `:1787`, `:1899`
- **Current:** Every reaction overlay caption/message is built from `getOptionLabel(...)`
  of the answer just given: `Atmosphere · Coastal`, `` `${destLabel} enters the story` ``,
  the pickup label, the investment label. These reactions are outside the
  `studioAcknowledgement` ledger entirely, so the one surface the traveller sees
  *immediately after answering* is the one that parrots them most literally.
- **Why it matters:** This is the exact "questionnaire confirming your click" feeling the
  product intent forbids, and it is the first impression of Studio intelligence.
- **Smallest safe change:** Route the reaction message through the existing
  `studioSemanticMemory` paraphrase vocabulary instead of the raw label, and drop the
  `Atmosphere · <Label>` caption pattern in favour of the paraphrased theme. No new copy
  system, no state change, no new module — reuse `understoodSignals` phrasing.
- **Risk:** Low (presentational strings only).
- **Protected by:** `studio-p6-acknowledge-once.test.ts`, `studio-semantic-memory.test.ts`,
  `studio-p4-faster-intelligence.test.tsx`.
- **New contract:** unit test asserting no reaction message/caption contains a verbatim
  `FEELINGS`/`DESTINATION_INTENTS`/`PICKUPS` option label.

### 2. `contextualTeaser` intelligence is computed and then thrown away — HIGH value, LOW risk

- **Files:** `StudioV3.tsx:395-451` (60 lines of combination-aware copy),
  `PhaseChrome.tsx:100-111` (`NextTeaser` returns `null` since P4)
- **Current:** 13 call sites render `<NextTeaser>{contextualTeaser(...)}</NextTeaser>`;
  the component renders nothing. The only genuinely combination-aware per-phase copy in
  the funnel is invisible.
- **Why it matters:** The middle of the funnel (Who → Feeling → Interests → Rhythm) is
  where the traveller decides whether the Studio is "thinking". Right now that stretch is
  silent between beats. P4 was right that a persistent "Next…" copy layer was clutter —
  but deleting the signal entirely is why the middle feels flat.
- **Smallest safe change:** Do not resurrect `NextTeaser`. Instead pass the
  `contextualTeaser` line as the *footer line of the reaction overlay* that already
  plays after that phase, so it appears once inside an existing cinematic beat with zero
  new layout. Delete the dead `UnderstoodSummaryLine` (`PhaseChrome.tsx:24-46`, zero
  importers) in the same pass.
- **Risk:** Low. Keeps P4's "no recurring copy layer" contract intact.
- **Protected by:** `studio-p4-faster-intelligence.test.tsx` (must stay green —
  `NextTeaser` stays silent), `phase-shell-anticipation.test.tsx`.
- **New contract:** unit test that the reaction overlay carries the contextual line and
  that `NextTeaser` still renders nothing.

### 3. Delegated mode is invisible after the tap — HIGH value, LOW risk

- **Files:** `StudioV3.tsx:2873`, `:2903`, `:1754-1761`; `types.ts:354`
- **Current:** After "Yes, design it for me", a one-line acknowledgement shows on the
  same card, then the flow advances. `decidedForMe` is written to state but **never
  rendered anywhere** (verified: no read outside logic). The traveller never sees which
  tastes and pace YES chose, and there is no visible way to take them back.
- **Why it matters:** This is precisely item 6 — delegation currently reads as *skipping
  questions*, not as concierge authorship. Reversibility exists in code
  (`takeBackDelegatedDimension`) but has no affordance.
- **Smallest safe change:** On the Director's Read beat (and/or the Your Day header),
  render a quiet single line naming the delegated dimensions using existing labels —
  e.g. "Chosen for you: coast and table, at an unhurried pace" — with one ghost
  "Adjust" action that navigates back to the delegated phase. No new state, no change to
  `studioDelegation.ts` decision logic.
- **Risk:** Low (read-only presentation of existing state + existing navigation).
- **Protected by:** `studio-p10-delegation.test.ts` (38 assertions),
  `studio-v3-let-yes-decide-mobile.spec.ts`, `studio-p7-directors-read.test.tsx`.
- **New contract:** unit test that delegated dimensions are named exactly once and that
  the Adjust action routes to the delegated phase; browser test that delegated mode
  surfaces the line and that Adjust restores explicit choice.

### 4. Stop story prose is printed twice on one scroll — MEDIUM value, LOW risk

- **Files:** `FinalRevealStory.tsx:73-80, 250-266` (embeds `s.story` into narrative
  sentences) and `StudioV3.tsx:4506-4515` (renders the same `s.story` verbatim under each
  stop card), both from the same source array, ~one screen apart.
- **Why it matters:** The single largest block of literal repetition left on the Your Day
  surface, and it undercuts the reveal's editorial weight — the letter says it, then the
  list says it again word for word.
- **Smallest safe change:** In the editable stop list only, suppress `s.story` when that
  same story already appears in the inline narrative, keeping label + composer rationale
  (which is genuinely new information). Purely presentational; the story text stays in
  state, in the snapshot, and at checkout.
- **Risk:** Low–Medium. Touches the reveal surface, which has snapshot coverage.
- **Protected by:** `reveal-section-order.test.ts`, `your-day-surface.test.tsx`,
  `studio-v3-p0-storytelling-reveal-mobile.spec.ts`,
  `studio-v3-unified-signature-card-visual.spec.ts` (visual snapshot will need review).
- **New contract:** unit test that no stop's story string renders twice in the storyboard tree.

### 5. Checkout summary has no localized edits for date / guests / stops — MEDIUM value, LOW risk

- **File:** `CheckoutSummary.tsx:189-196, 233-257, 359-368`
- **Current:** Only guest identity has an `Edit` link; date, guests, stops and add-ons are
  read-only rows, so correcting a date means the generic top "Back" or the guest-details
  form.
- **Why it matters:** The stated recap contract is a localized edit per logical area. It is
  the last confidence moment before payment; a read-only row with a wrong date creates
  abandonment rather than a correction.
- **Smallest safe change:** Add a quiet text "Edit" affordance on the date/guests rows that
  calls the existing `onEditGuestDetails` handler, and on the stops row one that returns to
  the storyboard phase. Reuses existing navigation only — no new state, no new phase.
- **Risk:** Low. No pricing, Stripe or snapshot change.
- **Protected by:** `checkout-confirmation-honesty.test.ts`,
  `studio-v3-mobile-guest-to-checkout.spec.ts`, `studio-v3-checkout-retry-desktop.spec.ts`.
- **New contract:** unit test that each recap area exposes exactly one edit affordance
  routing to the correct phase, and that state survives the round trip.

### 6. `SignaturePriceCard` non-competition depends on three separate boolean gates — LOW value, LOW risk (hardening only)

- **Files:** `SignaturePriceCard.tsx:1353, 1428, 1461`, `FinalRevealStory.tsx:488, 678`
- **Current:** No competing primary CTA today. But the card ships a full second CTA stack
  plus a sticky mobile CTA that are only suppressed by `isRefine`/`inline` flags across
  two files. A future edit that forgets one gate produces two primaries instantly.
- **Smallest safe change:** No UI change. Add a regression test that asserts exactly one
  primary CTA in the storyboard tree.
- **Risk:** None.

### 7. Orphaned components — no action recommended

`DesignedForYou`, `DayAtGlance`, `RefineAccordion` are built, tested and exported from
`src/index.ts` but not mounted in the live tree. Mounting them would re-add surface area to
a page we are trying to compress. Recommendation: leave them; revisit only with explicit
product intent.

---

## Recommended single implementation batch

**Batch A — "The Studio thinks out loud" (items 1, 2, 3, plus the item 6 test).**

These four share one theme (make intelligence and authorship *felt* in the middle of the
funnel), touch only presentational strings and read-only renders of existing state, add no
new modules, and carry no pricing, route, snapshot or checkout exposure. Concretely:

1. Paraphrase reaction copy through the existing semantic vocabulary; remove verbatim
   option-label echoes.
2. Move the already-computed `contextualTeaser` line into the existing reaction beat;
   delete the dead `UnderstoodSummaryLine`; keep `NextTeaser` silent.
3. Surface delegated dimensions once with a single quiet "Adjust" action.
4. Add the single-primary-CTA regression test.

Items 4 and 5 are both worth doing, but each touches a snapshot-covered surface (reveal
visual snapshot; checkout flow) and should be a separate, individually validated batch so a
visual diff is never mixed with copy changes.

Validation for Batch A: focused P4/P6/P7/P10 suites, the full
`src/components/studio-v3` + `src/lib/studio-v3` Vitest run, `bunx tsgo --noEmit`, and the
mobile 393×852 plus desktop 1440×900 browser specs. No deploy.
