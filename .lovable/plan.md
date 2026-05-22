# Studio v4.1 — Cinematic Decision Engine (Refinement Pass)

## Core principle (top of plan)

The Studio is **not a form replacement**. It is an emotionally intelligent cinematic decision engine that guides high-end travelers toward booking with minimal cognitive friction.

Every interaction must: reduce effort · imply intelligence · feel remembered · increase confidence toward the CTA.

The flow gets **calmer and more curated as it progresses**, not busier.

---

## 1. Journey-type step (replaces JourneyDepth)

Insert after **Mood**, before **Who**.

- Headline: **"How do you want to experience Portugal?"**
- Sub (one line, Georgia italic): *"every story has its own rhythm."*
- Two cards only:
  - **A single unforgettable day** — instant builder path
  - **A journey over several days** — concierge path (premium, NOT fallback)

No "disappear into Portugal" / mystical phrasing.

---

## 2. Multi-day = elevated, not handoff

When user picks multi-day, do **not** drop into the existing `TripTypeEntry` concierge sheet. Build a dedicated cinematic concierge transition inside the Studio:

- Same full-bleed video stage continues (no modal pop, no chrome change).
- Headline: **"Journeys like this are shaped by hand."**
- Sub: *"A private designer takes what you've just shared and composes the days with you."*
- Show **emotional memory chips** of what they already chose (mood + who, as small gold-underlined pills) — proves the system *remembers*.
- Primary CTA: **"Begin with a designer"** → opens WhatsApp prefilled with mood/who context, OR an in-Studio inline form (name + email + one-line wish) that posts to existing `builderJourneys` server fn.
- Ghost CTA: "Or build a single day instead" (returns to flow).
- Trust micro-row: "Hand-composed · Private call · No template itineraries."

Tone: white-glove, invitation-only, **more** premium than the instant path.

---

## 3. Emotional continuity & memory

Add a single `affinityProfile` derived in `useStudioState` from all selections:

```ts
{ warmth: 0–1, depth: 0–1, energy: 0–1, intimacy: 0–1 }
```

Used to influence — without new UI:

- **Imagery**: `CinematicChoices` cards swap video/poster based on prior Mood (mood-keyed map per card).
- **Motion pacing**: transition duration scales with `depth` (slow mood → 720ms; energetic → 480ms).
- **Microcopy tone**: `useStudioLocale` returns one of 2 variants per phase based on `warmth` (e.g., calm vs. vivid).
- **Ambient overlay tint**: `AmbientStage` overlay color shifts subtly (warmer charcoal for romantic/slow; cooler for curious/energetic).
- **Suggestion weighting**: `EmergingChips` ranking already planned — driven by `affinityProfile`, not raw tags.

No "personalization banner". The user *feels* it, never reads about it.

---

## 4. Decision-fatigue reduction (calmer over time)

Choice density decreases monotonically:

| Phase | Visible choices |
|------|---|
| Mood | 4 |
| Journey type | 2 |
| Who | 4 |
| Intention | 3 (was 4 — drop the weakest based on affinity) |
| Emerging suggestions (1st) | 2 |
| Emerging suggestions (2nd+) | 1 strong recommendation + small "explore another" link |
| Final reveal | 1 primary CTA |

After the 2nd accepted stop, `EmergingChips` switches from "pick one of N" to **single hero recommendation card** with copy like *"This feels right next."* — a "guided curation" mode flagged by `state.acceptedStops.length >= 2`.

---

## 5. Final reveal — editorial first, map on demand

Rewrite `MemoryCard.tsx` order (single column, mobile-first):

1. **Hero image** (first stop, full-bleed, gradient mask)
2. **Emotional title** — e.g., *"A slow day along the Arrábida coast"* (derived from region + mood)
3. **Editorial itinerary** — 3–5 stops as quiet typographic list: `09:30 · Name · one sensory line`. No icons, no cards, no map pins.
4. **Sensory narrative** — one short paragraph composed from accepted blurbs (server fn already exists: `builderChapter.functions`).
5. **Primary CTA**: "Reserve this day · €X" (Stripe embedded inline below CTA on click — no redirect, no modal).
6. **Trust row** (single line, micro): "Instant confirmation · Local guide · Flex cancellation."
7. **Ghost link**: "View route on map" → expands inline `LivingMap` below. Map is **never** above the CTA.
8. **Secondary**: "Talk to concierge" (WhatsApp, ghost).

Remove from this view: language switcher, narration controls, floating cards, overlay poetic text.

---

## 6. Loading / transition copy (grounded intelligence)

Replace **"Portugal está a responder…"** with rotating, phase-aware copy in `useStudioLocale`:

- After mood+who+intent → **"Curating your day"**
- After first accepted stop → **"Shaping the rhythm"**
- Before final reveal → **"Your story is taking shape"**

PT/EN/ES/FR variants. Max 3 words. No ellipsis mysticism.

Transitions imply work, not waiting: subtle progress arc on the Sparkles glyph (stroke-dasharray draw), not a pulse.

---

## 7. Quieter language switcher

- Auto-detect from `navigator.language` on first mount (already partial — enforce).
- Collapsed: single 16px globe glyph, top-right, `--ivory)/60`. No flag, no label.
- Expand on tap to a small popover (4 codes).
- **Hidden entirely** during `feel`, `journey-type`, `who`, `intent`, and the reveal interlude. Reappears in `journey` and `booking` phases.

---

## 8. EmergingChips evolution (explicit → guided)

Two modes inside one component:

- **Mode A — Exploration** (`acceptedStops.length < 2`): up to 2 emotional cards, "tap what calls you."
- **Mode B — Guided** (`acceptedStops.length >= 2`): one hero recommendation card, no header, copy: *"This feels right next."* + small ghost link "show another." Tapping the link rotates through the ranked list, never shows a grid.

The visual language shifts from "choose" to "confirm."

---

## 9. Transitions = intelligence, not decoration

- Drop all decorative blur-only waits. Every interstitial must show a **derived artifact** (e.g., the affinity verb evolving: *"slow → quiet → coastal"*) or a **progress mark** (stroke draw).
- `JourneyReveal` becomes shorter (1.2s, was 1.9s) and shows 2 affinity words derived from selections fading in sequentially before resolving to the loading verb.
- Remove `backdrop-blur-2xl` from interludes; replace with `backdrop-blur-md` + a single drawn gold arc.

---

## 10. Carry-over refinements from prior plan

Still applied (unchanged): reduce overlay blur ~40% in `AmbientStage`, mobile chrome progressive reveal, tactile CTA easing + soft gold glow, minimal "YES" wordmark during cinematic phases → full lockup from `reveal` onward, auto-derived pace (no UI), `LivingMap` mounts only when explicitly invoked (now only on "View route" tap).

---

## Files touched

- `src/components/builder/types.ts` — `JourneyType = "day" | "multi"`, `AffinityProfile`
- `src/hooks/useStudioState.ts` — `journeyType`, derived `affinityProfile`, auto-pace
- `src/hooks/useStudioLocale.ts` — new headline, loading verbs, tone variants (×4 langs)
- `src/components/builder/v3/CinematicChoices.tsx` — Journey-type step, mood-adaptive imagery, intention cut to 3, tactile press, motion duration from affinity
- `src/components/builder/v3/StudioStageV3.tsx` — phase order, quiet language switcher, minimal YES, multi-day cinematic concierge branch
- `src/components/builder/v3/MultiDayConcierge.tsx` *(new, small)* — in-Studio elevated concierge moment with memory chips
- `src/components/builder/v3/AmbientStage.tsx` — overlay/blur reduction, affinity tint
- `src/components/builder/v3/EmergingChips.tsx` — exploration vs guided modes, affinity ranking
- `src/components/builder/v3/JourneyReveal.tsx` — shorter, derived affinity words, drawn arc
- `src/components/builder/v3/MemoryCard.tsx` — editorial reveal, CTA above map, inline Stripe, on-demand map
- `src/components/builder/v3/ItineraryRibbon.tsx` — hidden until ≥2 stops
- `src/components/builder/v3/LivingMap.tsx` — mounts on explicit "View route" only
- `src/components/ui/CtaButton.tsx` — tactile easing + soft gold glow

## Will NOT do

- No new routes, no homepage edits, no parallax/glassmorphism outside homepage.
- No invented multi-day itineraries — multi-day stays human-composed (premium concierge, not fallback).
- No real stop names before `reveal`.
- No business-logic / schema / Stripe / Supabase changes.
- No A/B testing infra, no analytics rewiring.

Approve and I'll implement in one focused pass.