
# Studio V3 — Minimal Implementation Plan
*Planning only. No code. Reuse-first, copy/state-first, zero new infra.*

---

## 1. Files likely to change

Scoped strictly to `/studio-v3`:

- `src/components/studio-v3/types.ts` — add 1–2 state fields (`journeyTitle`, `composing` flag). No new component types.
- `src/components/studio-v3/StudioV3.tsx` — orchestration only: insert a "composing" interstitial beat, pass title down, route storyboard handoff.
- `src/components/studio-v3/MapAwakens.tsx` — swap "· added for you" italic for a gold dot + accessible whisper on hover/focus; add a small "hold + vignette" CSS state on the final stop (no new component).
- `src/components/studio-v3/curation.ts` — add a pure `composeJourneyTitle(feeling, companions, rhythm, region)` helper. No data model changes.
- `src/components/studio-v3/PhaseShell.tsx` — *optional, minimal*: accept a `mode="interstitial"` prop to render a centered whisper line. If it adds risk, do it inline in `StudioV3.tsx` instead and skip this edit.
- `src/components/studio-v3/StudioV3.tsx` (storyboard block) — wrap existing `RevealInvestment` so it mounts collapsed with the `from €X` line visible. No changes to pricing logic.

That's it. Six files maximum, most edits ≤ 30 lines.

---

## 2. Files that must NOT be touched

- `src/integrations/supabase/*` (client, server, middleware, types)
- `src/components/builder/*`, `src/components/studio-v2/*`, `src/routes/studio-v2.tsx`, `src/routes/builder.tsx`
- `src/data/signatureTours.ts`, `src/data/stopGeo.ts`, `src/data/regionStops.ts` (read-only)
- `src/styles.css`, brand tokens, `tailwind` config
- Any `src/lib/builder*`, `studioNarrative.functions.ts`, pricing logic
- Hero, homepage, routes outside `/studio-v3`
- `src/routeTree.gen.ts` (auto-generated)
- All CI workflows, e2e specs, brand audits
- `RevealInvestment` internals (only wrap/prop it from outside)
- `BuilderMap` / `PremiumMap` internals (consume as-is)

---

## 3. Smallest possible phases

**Phase 1 — Copy + state only (no logic, no new files)**
- Replace "added for you" italic with a gold dot + `aria-label` / tooltip whisper.
- Add `composeJourneyTitle()` (pure function) + render the title in the storyboard handoff header.
- Tighten storyboard handoff copy.
*Risk: near-zero. No motion, no data, no pricing.*

**Phase 2 — One held silence (motion only)**
- Insert ~1.2–1.4s "Composing your Portugal…" beat between Phase 3 (rhythm) and Phase 4 (map), reusing `PhaseShell`'s fade. Pure state machine flag. Honors `prefers-reduced-motion` (skip).

**Phase 3 — Pricing as whisper (presentation only)**
- Mount existing `RevealInvestment` in collapsed state, surface only `from €X per guest`. Expansion stays as-is. No pricing math touched.

**Phase 4 — Map as climax (motion + reuse)**
- Within `MapAwakens`, sequence existing pan/zoom to ease into each stop and hold on the last with a CSS vignette overlay. Reuses `BuilderMap`. If gold-line drawing isn't already trivial via the existing map primitive, **postpone** the line and ship only the pan/hold/vignette.

**Phase 5 — Lead capture (conditional)**
- Only if an existing leads/contacts table or save mechanism exists in Supabase. If not: **stop and report** — do not create a table.

---

## 4. Highest visible impact / lowest risk

**Phase 1.** The named journey ("A slow coast, for two.") is the single biggest perceived-ownership lift, costs almost nothing, and risks nothing. Ship it first and alone.

---

## 5. What can be done with copy/state only

- Journey title generation + render
- "Added for you" → gold dot + whisper
- Storyboard handoff copy tightening
- Collapsed pricing presentation (prop-level)
- Composing interstitial (state flag + existing shell)

No logic, no schema, no APIs.

---

## 6. What requires real logic changes

- Phase 4 map choreography (sequenced pan/zoom/hold) — touches `MapAwakens` motion code.
- Any gold-line route drawing if not already supported by `BuilderMap` — **postpone** unless trivial.
- Phase 5 lead save — requires confirming an existing table first.

---

## 7. Postpone

- Gold polyline between stops (unless `BuilderMap` already exposes it)
- Save / share / return-to-journey
- Sound, haptics, video transitions
- Any new analytics events beyond what already fires
- Expanding choice grids, new phases, new questions
- Lead capture until storage is confirmed

---

## 8. Credit-saving build strategy

1. **One phase per turn.** Never bundle phases — each phase ships, is verified visually, then the next is scoped.
2. **Copy/state before motion before logic.** Cheapest edits first; they often satisfy the brief on their own.
3. **Edit, don't create.** No new components unless a phase literally cannot be expressed as props/state on an existing one.
4. **No speculative refactors.** Leave `RevealInvestment`, `BuilderMap`, `curation.ts` scoring untouched in Phase 1.
5. **Stop conditions written into each phase.** E.g. "if gold line isn't a one-prop change on BuilderMap, skip it." Prevents rabbit holes.
6. **Reuse existing tokens, fonts, motion primitives.** Zero `styles.css` edits.
7. **No CI/test churn.** Changes stay inside `/studio-v3`, which has no dedicated guard workflows — avoids triggering hero/homepage/typography regressions.
8. **Verify with a single preview check per phase**, not a full audit pass.

---

## 9. Final single build prompt — Phase 1 only

> **Phase 1 — Studio V3: name the journey + quiet authorship signal (copy/state only).**
>
> Scope strictly to these files. No new components. No new files. No schema. No pricing changes. No motion changes. No map changes.
>
> 1. **`src/components/studio-v3/curation.ts`** — add a pure helper `composeJourneyTitle({ feeling, companions, rhythm, region })` returning a short sentence-case title like *"A slow coast, for two."* Use a small lookup table keyed by `feeling` for the noun phrase, by `companions` for the suffix, by `rhythm` for the adjective. Sentence case, ends with a period, ≤ 38 chars. No external calls, no AI, no randomness — deterministic.
>
> 2. **`src/components/studio-v3/types.ts`** — add `journeyTitle: string | null` to `StudioV3State` and `INITIAL_STATE`.
>
> 3. **`src/components/studio-v3/StudioV3.tsx`** — when advancing from `map` → `storyboard`, compute the title via the helper (using the resolved tour's `region`) and store it in state. In `StoryboardHandoff`, render the title above the existing `{region} is waiting.` headline as a Georgia-italic teal line with the existing eyebrow spacing. No other changes.
>
> 4. **`src/components/studio-v3/MapAwakens.tsx`** — replace the existing `"· added for you"` italic span with a single 6px gold dot (`var(--gold)`), `aria-label="Chosen for the way you travel"`, and a `title` tooltip with the same whisper. Keep layout, no motion changes.
>
> Constraints:
> - Reuse existing tokens (`--gold`, `--teal`, `--charcoal`, `--font-serif`, `--font-display`).
> - No new dependencies. No new files. No `styles.css` edits.
> - Honor `prefers-reduced-motion` (nothing new animated here, but verify nothing regresses).
> - Mobile-first; 44×44 touch targets unchanged; 4.5:1 contrast maintained.
> - Do not touch `RevealInvestment`, `BuilderMap`, pricing, or any file outside `src/components/studio-v3/`.
>
> Verify by loading `/studio-v3` in the mobile preview and walking through Feeling → Who → Rhythm → Map → Storyboard. Confirm the title renders, the gold dot replaces the italic, and no other behavior changed.

---

**Net effect of this plan:** 4 phases shippable in ≤ 4 turns, ~6 files touched total, zero new infra, zero risk to production routes, and the highest-emotion change (named journey) lands in Phase 1.
