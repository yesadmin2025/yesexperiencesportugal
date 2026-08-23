# Experience Studio — North Star (non-negotiable)

The Studio is **cinematic discovery**, not a configurator, quiz or planner.
Every change is judged against the principles below before it ships.

## Principles

1. **Desire before logistics.** Emotion, company and taste are asked first.
   Date, pickup and party exist only to make the day real — never as a gate
   in front of desire.
2. **Fewer questions, more inference.** If the Studio can derive it, it must
   not ask it. `destination`, `investment`, `occasion`, `considerations` and
   `language` are inferred or deferred, never blocking phases.
3. **Honest progress.** The visible progress model is `FEEL → TASTE → SHAPE
   → YOUR DAY` and maps 1:1 onto real phase groups. No inflated totals.
4. **"Let YES decide" is a decision, not a gap.** It commits a real,
   deterministic value derived from the traveller's own answers.
5. **No invention, ever.** Stops, partners, inclusions, prices, drive times
   and itineraries come from real project data. AI is voice only.
6. **Pricing truth is untouchable.** Composition and reveal may present the
   validated composition; the financial handoff stays anchored to the current
   Signature/pricing truth path.
7. **Text first, images as enhancement.** A missing image never blocks the
   reveal. The reveal must render meaningful text fast on mobile.
8. **Mobile-first at 393px.** No truncation, no overlap, 44×44 targets,
   visible focus, CTAs never covering content.
9. **Two families only.** Fraunces for editorial emphasis, Inter for UI/meta.
   No Georgia, no Montserrat.

## Phase model (source of truth)

`STUDIO_V3_PHASE_ORDER` in `src/components/studio-v3/curation.ts` is the ONLY
ordering. `isPhaseRelevant` decides what is actually asked.

```text
intro → feeling → who → interests → rhythm → [refinement*] → logistics
      → map → storyboard → confirmation (reveal) → guestDetails → checkoutSummary
```

`* refinement` is at most one adaptive question, asked only when it can still
move the recommendation.

Kept in the array for hydration of saved states/deep links, never asked:
`destination`, `date`, `pickup`, `guests`, `investment`, `occasion`,
`considerations`, `language`.

- `logistics` is one screen: date (exact / flexible / undecided) + pickup +
  party, all prefilled from what is already known and editable.
- Progress beats live in `StudioV3ProgressStepper.tsx`
  (`Feel`, `Taste`, `Shape`, `Your day`).

## Analytics

`src/lib/studio-analytics.ts` is the only place Studio product events are
named. It routes through the existing funnel writer where a funnel event
already exists (no double counting) and to GA4 otherwise.

## The reveal is never a trap

The moments/map surface (`MapAwakens.tsx`) autoplays a reel, but its continue
CTA (`[data-phase-cta="hold-journey"]`) is ALWAYS interactive. Emphasis ramps
when the reel completes; the door is never locked. Gating it behind reel
completion previously stalled the journey whenever autoplay did not run
(paused tab, reduced motion, one moment, slow mount).

The interpretation beat (`UnderstoodBeat.tsx`) is a short, skippable
full-screen overlay between logistics and the composed day. It must always
dismiss itself, and it must never be the only way forward.

Regression cover:
- `e2e/studio-v3-no-moments-loop-mobile.spec.ts` — CTA interactive on mount,
  reveal paints within 2500 ms of the final Refine action, and still paints
  with every image request blocked.
- `e2e/studio-v3-let-yes-decide-mobile.spec.ts` — handing feeling / interests /
  rhythm to "Let YES decide" plus a flexible date still composes a real day.

## Last mile

`CheckoutSummary` scrolls itself to the top on mount, so the summary never
opens mid-scroll with the price line off-screen. The guest-details CTA reads
"Continue to summary" — it names the next screen, not a side effect.
