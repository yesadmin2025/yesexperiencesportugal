## Three tracks, one rollout

### Track A — Accessibility & keyboard tests (MobileBeatReveal + CTAs)

New file: `src/components/studio-v3/__tests__/mobile-beat-reveal-a11y.test.tsx`

Coverage:
1. **Dialog semantics** — root has `role="dialog"`, `aria-modal="true"`, `aria-labelledby` wired to the beat title, `aria-describedby` to the narration paragraph.
2. **Focus trap** — on open, focus lands on the close button; Tab cycles only between Close ↔ Continue/Reveal CTA; Shift+Tab reverses; Escape closes and returns focus to the originating beat trigger.
3. **Map moment** — when the gold-pin constellation animates in, the decorative SVG is `aria-hidden="true"` and an off-screen `aria-live="polite"` region announces the current beat ("Region chosen: Arrábida").
4. **Reduced motion** — with `prefers-reduced-motion: reduce`, pin animation collapses to instant fade, tested via mocked media query.
5. **Theme parity** — `it.each(["light","dark"])` asserts: visible focus ring token (`--ring`) resolves to a non-transparent color, close icon button has accessible name in both themes, contrast of title vs surface ≥ 4.5:1 (computed via `getContrast` helper).
6. **Close affordance** — confirm modal exit via (a) Close button click, (b) Escape key, (c) backdrop click only when `state.phase === "feeling"` (no progress); when progress exists, `window.confirm` is invoked.

Extend existing `progress-stepper-a11y.test.tsx` with a focus-return test after MobileBeatReveal closes.

### Track B — Add-on micro-interactions + running total

Edit `src/components/studio-v3/SignaturePriceCard.tsx`:
- Each add-on chip becomes a `role="checkbox"` button with three visual states: `idle`, `pending` (200ms optimistic delay with a subtle shimmer on the checkmark slot only — scoped, ≤220ms, respects reduced-motion), `checked` (gold check icon scales 0→1 in 160ms, label weight 500).
- Disable other unselected chips when 3 are selected; show inline helper "Up to 3 add-ons" in `--charcoal-soft`.
- Running total uses a `useDeferredValue` + `requestAnimationFrame` swap so the number updates smoothly without layout jump; surrounding `<output aria-live="polite">` announces "Total per guest: €175".
- Tokens only — no hardcoded colors. New utility classes added to `src/styles.css` under a `.addon-chip` scope.

New test file: `src/components/studio-v3/__tests__/add-on-microinteractions.test.tsx`
- Click → chip enters `data-state="pending"` → resolves to `data-state="checked"` within ≤250ms (fake timers).
- Running total recomputes on every selection across both themes (`it.each`), matches `base + Σ(selected)` per pp, and the `<output>` text matches.
- Selecting a 4th chip is blocked (`aria-disabled="true"`) and total does not change.
- Deselecting re-enables previously disabled chips.

### Track C — Studio structure plan (bible × reference site)

The reference site (customwebsitedesigns.org) ships an 11-step Studio with five ideas worth porting — adapted to our no-invention rule and real Signature data.

| Idea from reference | What it adds | How we adapt with our truth |
|---|---|---|
| **Story / Timeline / Map tabs** in the live panel | Lets the user choose how to feel the journey | Reuse `LivingJourneyPanel` (story prose) + new `Timeline` view (real `resolvedTour.stops[]` with hours) + existing `ComposerMap` — three tabs, same data, no new stops |
| **Smart Recommendation card** ("Most couples add…") | One soft upsell that increases AOV without feeling salesy | Drive from `signatureAddOns.ts`: pick the highest-relevance add-on for the resolved region, show as a single dismissible suggestion above the chip list — never invented, always from a sibling Signature |
| **Experience Quality affirmation** (92%) | Confidence-builder near the price | Replace the % gimmick with a 3-line **"Why this works"** block derived from the resolved tour's `inclusions` (rhythm/pacing/coverage). No invented score. |
| **Investment line with footnote** (`€145/guest · Party of 2 · €290 total`) | Removes pricing ambiguity | Already partially in `SignaturePriceCard` — add party total + a single ivory footnote line listing what's included (real `included[]` from Signature) |
| **Step counter** ("Step 1 of 11 · 9%") | Sense of progress | Our `StudioV3ProgressStepper` already does Region→Rhythm→Dates→Compose (4 beats) — keep 4, but show "Beat 2 of 4 · halfway there" copy underneath for the same reassurance without inflating steps |

What we **do NOT** copy from the reference:
- 11-step funnel (violates "guided not asked")
- Stock Unsplash imagery (violates real-image rule)
- "Premium Class Private Route" + "Quality Score 92%" superlatives (violates no-invention)
- Generic "Wine & Gastronomy / Coast & Nature" tag soup as primary nav inside Studio (we use rhythm + region beats instead)

**Phased rollout (after Tracks A+B ship):**
1. **Phase S1 — Live panel tabs.** Add `view: "story" | "timeline" | "map"` tab control inside `LivingJourneyPanel`; timeline pulls only from `resolvedTour.stops`. New file: `TimelineView.tsx`.
2. **Phase S2 — Smart suggestion.** Promote one add-on from `selectSignatureAddOns()` into a `SuggestedAddOn` card above the chip fieldset; dismissible; respects the 3-max cap.
3. **Phase S3 — Why this works.** New 3-bullet block in `SignaturePriceCard` driven by `resolvedTour.inclusions`/`pacingNote`. Pure data, zero copy invention.
4. **Phase S4 — Party total + inclusions footnote.** Extend price card with `× guests` total and ivory `<footer>` listing real `included[]`.
5. **Phase S5 — "Halfway there" reassurance line** under stepper, copy from a small dictionary keyed by phase.

Each phase ships behind no flag (small surface), with its own test file, and respects all existing brand/motion guardrails (≤220ms, no parallax, no glassmorphism, scoped tokens).

### Order of work
1. Track A (a11y) — ~1 file
2. Track B (micro-interactions + total) — 1 component edit + 1 test file + scoped CSS
3. Track C — only after you approve; each phase is a separate request
