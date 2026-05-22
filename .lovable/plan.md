# Studio v5.1 — AI as Cinematic Orchestrator (Conversion-Calibrated)

The Studio adds an AI orchestration layer so it stops feeling like "AI copy attached to a selector" and starts feeling like one continuous emotional thread that knows the traveller. AI = tone + continuity + emotional orchestration only. The catalog still owns every real stop, price, partner, map, and checkout. No AI-generated itineraries. No invented places.

Core principle: when forced to choose between cinematic complexity and emotional clarity/trust, choose clarity and trust. Calm > clever.

## Stack

Single TanStack server fn `composeStudioMoment` in `src/server/studioNarrative.functions.ts`. Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with `LOVABLE_API_KEY` from `process.env`. Two modes: `narrative` and `proposal`. Build on v4.2 — do NOT rewrite existing components.

## Changes

### 1. Expanded affinity profile (`types.ts`, `useStudioState.ts`)
Extend `AffinityProfile` to `{ warmth, intimacy, curiosity, energy, elegance, spontaneity, pacing }`. Add non-persisted refs:
- `decisionSpeed` (median ms between picks)
- `confidence` (0–1, grows with accepted stops and consistent affinity)
- `narrativeStage`: `"invitation" | "recognition" | "emergence" | "reveal"`

Confidence influences recommendation calmness and visible-choice reduction. It does **not** drive automation.

### 2. Optional name memory (new `NameWhisper.tsx`)
Single quiet step between `mood` and `depth`. Copy: *"What should we call you?"* + lowercase italic input + "skip" link. Stored as `travellerName`. Used at most **twice** per session, only in reveal line + proposal subtitle. Never during selection phases. Tracked via non-persisted `nameUsageCount` ref.

### 3. Narrative AI with continuity (`studioNarrative.functions.ts`)
Server fn `composeStudioMoment({ mode, affinity, mood, who, intention, journeyType, travellerName, lastAccepted, lastFragment, narrativeStage, confidence, acceptedCount })` → `{ fragment, sensoryAnchor }`.

System prompt rules:
- 1 sentence, 8–18 words.
- MUST include at least one tangible sensory anchor: object · texture · architecture · weather · gesture · food · sound · material · movement. Returned as `sensoryAnchor`.
- Forbidden vocabulary: "hidden gem", "off the beaten path", "luxury", "unforgettable", "journey of a lifetime", "whispers of", "soul of", any superlative or mystical phrasing.
- AI never names real places, partners, hotels, restaurants, roads.
- Stage shapes voice:
  - `invitation` → distant atmosphere, open
  - `recognition` → emotional resonance, no name
  - `emergence` → specificity + texture
  - `reveal` → intimacy, may use name once
- Continuity: prompt includes `lastFragment` with instruction *"continue the same emotional thread without repeating imagery."*
- `temperature` 0.8, `max_tokens` 60. Post-trim to last sentence ≤18 words.
- Reference tone: Cereal Magazine, Aman Journals, Kinfolk travel essays.

Failure handling (429/402/network): silent fallback to static editorial pool, no toast.

### 4. Sparsity budget
AI fires at most **4 times per session**:
1. recognition stage entry
2. after second accepted stop (becomes the next chip's eyebrow)
3. reveal line
4. proposal title + subtitle (one call, `mode: 'proposal'`)

Tracked in session-scoped ref. `prefers-reduced-motion` → always fallback, no calls.

### 5. Recommendation confidence ramp (`EmergingChips.tsx`, `StudioStageV3.tsx`)
- **Diversity penalty**: if last two accepted stops share a tag, downweight that tag ×0.4.
- **Card-count ramp**: as `confidence` rises, suggestions shrink 2 → 1 card.
- **Copy ramp**: *"You might also love"* → *"This feels right next"* → *"This follows naturally"*. Never *"We've chosen this for you."*
- **No auto-accept**. No countdown timer. No dark-pattern automation. Only quieter visual emphasis (slightly stronger gold rim, softer magnetic hover, calmer wording). User always picks.

### 6. Editorial reveal with breathing room (`JourneyReveal.tsx`, `MemoryCard.tsx`)
Two beats:
- **Beat 1 (proposal arrival, ~1.5–2s)**: ONLY hero imagery + proposal title + proposal subtitle + atmosphere. No stops, no CTA, no controls, no map, no chips.
- **Beat 2 (itinerary emerges gradually)**: Stops fade in as a quiet numbered serif list — no card chrome, no tag pills, no chips. Editorial column layout. Map stays behind a "See the route" disclosure. CTA + Adjust appear last.

This is the memory-imprint moment. Cinema needs breathing room.

### 7. Proposal identity — `proposalTitle` + `proposalSubtitle`
Generated once when entering reveal phase (`mode: 'proposal'`). Cached in state, never regenerated.
- `proposalTitle`: 2–5 words, editorial, plausible. Shape examples: *"Between Salt and Vines"*, *"The Atlantic Table"*, *"A Slow Tide Through Alentejo"*.
- `proposalSubtitle`: 8–14 words, may include name once.
- Banned tone: mystical, fantasy, excessive metaphor, abstract luxury prose.

### 8. Place anchoring (cultural texture)
Without naming exact locations, fragments and fallback pools draw from a Portugal-anchored sensory vocabulary: azulejos, Atlantic cliffs, ferry crossings, pine forests, salt pans, vineyard lunches, candlelit taverns, river air, tiled markets, stone villages, tiled cafés. Added to the prompt as a "vocabulary palette" hint (not "use these names" — "this is the world").

### 9. Multi-day exclusivity (`MultiDayConcierge.tsx`)
Separate prompt voice: private travel editor — assured, intimate, less cinematic, no superlatives. Eyebrow stays "By invitation". Closing line may use name once. Feels rare, composed by hand, quietly expensive.

### 10. AI safety / brand (preserved)
- AI never invents places, partners, hotels, restaurants, itineraries, prices.
- AI provides tone, continuity, proposal identity, emotional composition only.
- All operational truth comes from catalog data.
- Sensory anchor logged to `console.debug` in dev for QA.

## Files

**New**
- `src/components/builder/v3/NameWhisper.tsx`
- `src/server/studioNarrative.functions.ts`

**Edited**
- `src/components/builder/types.ts` — extend `AffinityProfile`, add `NarrativeStage`, `StudioProposal`
- `src/hooks/useStudioState.ts` — v3 persistence key, name + proposal persistence, decision-speed/confidence/stage derivations, AI budget ref
- `src/hooks/useStudioLocale.ts` — name-step copy + per-stage Portugal-anchored fallback pools (PT/EN/ES/FR)
- `src/components/builder/v3/StudioStageV3.tsx` — orchestrate NameWhisper, narrative beats, diversity + confidence ramp, fire `composeStudioMoment` at the 4 budget points, gate reveal on proposal generation, two-beat reveal sequencing
- `src/components/builder/v3/CinematicChoices.tsx` — emit advance hook for NameWhisper insertion
- `src/components/builder/v3/NarrativeBeat.tsx` — accept AI text + stage prop
- `src/components/builder/v3/JourneyReveal.tsx` — Beat 1: proposal title/subtitle only on hero
- `src/components/builder/v3/MemoryCard.tsx` — Beat 2: editorial column, no chip chrome until Adjust
- `src/components/builder/v3/EmergingChips.tsx` — confidence-driven copy + card-count, sensory-anchor eyebrow, no auto-accept
- `src/components/builder/v3/MultiDayConcierge.tsx` — AI body line in private-editor voice
- `src/start.ts` — verify `attachSupabaseAuth` registered (no-op if already present)

## Out of scope
- No DB schema changes — name + proposal persist in localStorage only.
- No new tables, routes, or edge functions.
- No streaming UI — fragments are short and awaited.
- No new locales beyond PT/EN/ES/FR.
- No changes to booking, pricing, catalog, or Mapbox layer.
- No auto-accept, countdown, or pressure UX.
