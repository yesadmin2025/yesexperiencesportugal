
# Studio Builder → Intelligent Luxury Configurator

Goal: turn the current Studio from a decorative, mood-led flow into a guided consultation that captures meaningful traveler data, scores it into a structured profile, and produces operationally feasible, premium itineraries — without losing the cinematic restraint of the brand.

This plan re-architects the Studio in 5 stages, adds a real scoring + recommendation engine on top of existing region/stop data, and keeps AI scoped to where it actually adds value (profile inference, suggestion copy, draft assembly) — never as a chatbot or generic prose generator.

---

## 1. Principles (non-negotiable)

- Studio = guided consultation, not form, not quiz, not Typeform.
- Tone: calm, intelligent, editorial, concierge — never poetic, never SaaS.
- AI is invisible and operational: it scores, weights, drafts. It does not narrate emotions.
- Every selection must produce structured data, not just visuals.
- Every recommendation must be feasibility-checked (drive time, caps, opening days, season).
- Mobile-first (393px). One decision per screen, max 5–6 options.
- Motion: soft fades, layered reveals, ≤220ms. No bounce, no parallax, no flashy hover.
- Honors existing guardrails: brand palette, Typography v3, brand guardrails, booking truth model (TEST MODE), no-invention rule.

---

## 2. Five-stage flow (replaces current Drift sequence)

Each stage = one screen, progressive reveal, with a compact "consultation rail" on the side showing what's been understood so far (chip summary, not a form recap).

### Stage 1 — Travel Intent
Q: *How should Portugal feel?*
Options (image-led cards, single-select with optional secondary): Relaxed & scenic · Elegant & cultural · Food-led & local · Social & celebratory · Romantic & intimate · Coastal & cinematic.
→ writes `intent.atmosphere`, seeds `pace`, `social_energy`, `culture_interest`, `food_interest`.

### Stage 2 — Group Profile
Q: *Who is this experience designed for?*
Collect: group composition (adults/children/teens), occasion (none, anniversary, birthday, honeymoon, corporate, celebration), mobility/accessibility, decision style (decisive / collaborative / surprise-me), luxury expectation (refined / elevated / ultra).
→ writes `group.*`, `comfort.*`, `occasion`.

### Stage 3 — Rhythm & Flow
Q: *How full should the day feel?*
Options: Light & spacious · Balanced · Rich but relaxed · Maximize the day.
→ writes `pacing.stopDensity`, `pacing.driveTolerance`, `pacing.lunchDuration`, `pacing.transitionBuffer`.

### Stage 4 — Experience Priorities
Q: *What would make the experience feel complete?*
Multi-select with weighting (drag to rank OR tap-twice = "must"): Vineyard lunch · Coastal scenery · Architecture · Hidden villages · Photography · Quiet luxury · Wellness · Boat · Local gastronomy · Wine cellar · Heritage.
→ writes `priorities[]` with weights 0–100.

### Stage 5 — Operational Constraints
Compact, elegant: pickup location, accommodation area (autocomplete on Lisbon/Cascais/Comporta/Évora/etc.), cruise window if any, dietary, hard time constraints, accessibility.
→ writes `ops.*`. Required before reveal.

Transition copy (between stages): short, professional.
- After Stage 1: *Understood. Let's shape the rhythm.*
- After Stage 2: *Now balancing pace, comfort and flow.*
- After Stage 3: *Aligning priorities to that rhythm.*
- After Stage 4: *Final logistics, then the design.*

---

## 3. Profile Engine (structured output)

Single normalized object built progressively, persisted via existing `useStudioState` / Drift session.

```ts
TravelerProfile {
  archetype: 'slow_luxury_couple' | 'celebration_group' | 'cultural_explorer'
           | 'food_led_duo' | 'family_refined' | 'corporate_curated' | ...
  pace: 'relaxed' | 'balanced' | 'rich' | 'full'
  social_energy: 0–100
  culture_interest: 0–100
  food_interest: 0–100
  coastal_affinity: 0–100
  wellness_affinity: 0–100
  driveToleranceMin: number          // hard cap per hop
  stopDensityTarget: number          // stops/day
  group: { adults, children, teens, mobility, occasion, decisionStyle, luxuryTier }
  priorityWeights: Record<PriorityKey, number>
  ops: { pickup, accommodationArea, cruiseWindow?, dietary[], hardConstraints[], accessibility[] }
  confidence: Record<string, number> // already supported by composer
}
```

Archetype is derived (not asked) from intent + group + pacing. Used to tint copy, sort suggestions, and prefill upsells.

---

## 4. Recommendation + Itinerary Engine

Build on top of existing `composer.ts` / `REGION_STOPS` / `REGION_RULES` — do NOT replace them.

1. **Region selection** — extend `pickRegion()` to use `priorityWeights` (wine→Arrábida/Alentejo, heritage→Lisbon-coast/Centro, coastal→Arrábida/Comporta, etc.) instead of mood-only.
2. **Stop scoring** — extend `affinityScore()` to consume `priorityWeights` and `archetype` (not just style/energy/social/companions). Confidence map already supported.
3. **Feasibility pass** — already enforced (kindCaps, maxHop, dayBudget). Add: respect `ops.cruiseWindow`, `ops.pickup`, `accessibility` (filter stops with `accessibility: 'limited'`).
4. **Match score per itinerary** — return 0–100 with breakdown (fit, pacing, logistics) shown discreetly in the reveal.
5. **Smart suggestions** — generate 2–3 contextual upsells with rationale, e.g.
   *"Most relaxed couples in Arrábida add a vineyard lunch at golden hour."*
   Pulled from `REGION_STOPS` tagged `upsell_tags`, not invented.
6. **Alternatives** — produce one "lighter" and one "richer" variant of the same day, swappable in the reveal.

### Experience metadata extension
Add (additive, non-breaking) to `RegionStop`:
```ts
upsellTags?: ('boat'|'sunset'|'private-lunch'|'photographer'|'sommelier'|...)[]
luxuryTier?: 'refined'|'elevated'|'ultra'
idealFor?: ('couple'|'family'|'group'|'corporate'|'solo')[]
```
Backfill on the existing curated stops only — never invent new stops.

---

## 5. AI usage (scoped, structured)

Used ONLY in these 4 places, all via existing `driftEngine.functions.ts` / `studioNarrative.functions.ts` patterns with structured JSON outputs (tool calling, no free prose):

1. **Profile inference** — when answers are ambiguous, infer missing dimensions + confidence (already partially in place via `inference.ts`).
2. **Archetype labeling** — short internal label, never shown raw.
3. **Suggestion rationale copy** — one sentence, ≤120 chars, professional. Schema-enforced.
4. **Reveal subtitle** — one sentence summarizing the design (e.g. *"A coastal, slow-paced day around Arrábida with a vineyard lunch."*). NOT poetic.

Hard bans: no chatbot, no generated multi-paragraph stories, no emotional narration, no invented stops/partners/prices.

---

## 6. Final reveal (replaces current reveal final)

Editorial, one screen, no scroll-jacking. Sections:

1. **Title + one-line summary** (AI-generated, schema-enforced).
2. **Itinerary timeline** — real stops with timing, drive minutes, dwell, total day length. Re-uses `PremiumMap` / `BuilderMap`.
3. **Match score + breakdown** (Fit · Pacing · Logistics).
4. **Smart upsells** (2–3, with rationale and concierge-confirm pricing per booking-truth-model).
5. **Lighter / Richer variants** toggle.
6. **CTAs (already polished)**: book · save · refine. WhatsApp optional, not primary.

Internal structured output (saved + sent to ops):
```json
{
  "archetype": "slow_luxury_couple",
  "pace": "relaxed",
  "priorityWeights": { "wine": 88, "coastal": 70 },
  "recommendedRegions": ["arrabida"],
  "maxDriveBetweenStops": 45,
  "itinerary": [...],
  "matchScore": 87,
  "upsells": [...]
}
```

---

## 7. Implementation phases

**Phase A — Engine + data (no UI change)**
- Extend `TravelerProfile` types + `useStudioState`.
- Extend `RegionStop` metadata (additive fields, backfill curated stops).
- Extend `composer.ts`: priority-weighted scoring, archetype boost, ops constraints, match-score breakdown, alternatives generator.
- Unit tests under `src/lib/drift/__tests__` (extend existing suite).

**Phase B — 5-stage flow refactor**
- Refactor `StudioDrift.tsx` into 5 named stages backed by the new profile object. Keep existing motion primitives, headline/eyebrow components, and brand tokens. No new design system.
- Add consultation rail (compact chip summary, right side on desktop, top on mobile).
- Replace mood-only Stage 1 with the 6-option intent grid; rewrite copy per spec.
- Add Stage 5 (operational constraints) — currently missing.

**Phase C — Reveal v2**
- Rebuild reveal final around itinerary timeline + match score + upsells + variants.
- Wire AI subtitle + suggestion rationale via structured serverFn (extend `studioNarrative.functions.ts`).

**Phase D — Polish + QA**
- Mobile pass at 393px for every stage.
- Reduced-motion pass.
- A11y: 44×44 targets, visible focus, 4.5:1.
- Telemetry: extend `telemetry.ts` with stage completion + match score.

---

## 8. Out of scope (explicit)

- No new tours/stops/partners invented.
- No payments changes (TEST MODE stays).
- No homepage / Signature / Tailored changes.
- No replacement of Mapbox, Supabase, or the existing builder engine — only extensions.
- No chatbot UI.

---

## 9. Open question (1)

Should the 5-stage flow REPLACE the current `/studio-drift` prototype in place, or ship as `/studio-drift-v2` for A/B against current Drift before swapping? Recommendation: ship as v2 behind the existing variant hook (`useStudioVariant`) so we can compare conversion before retiring v1.
