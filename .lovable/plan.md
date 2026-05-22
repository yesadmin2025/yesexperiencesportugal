# Hero Rebuild — Cinematic Editorial Plan

## Emotional direction
"You are entering a private, cinematic journey through Portugal."
Slow, warm, observational. A24-meets-luxury-travel-editorial. Restraint over spectacle. The viewer should feel held, not sold to.

## Video concept

**Approach: real cinematic footage only — no AI-generated video.**

Two options for sourcing (pick one at approval):
- **Option A — Curated stock**: 4–5 short clips from premium libraries (Artgrid, Filmsupply, or Pexels/Coverr for free-tier). Hand-picked for warm golden-hour tones, soft handheld motion, human moments.
- **Option B — Hybrid**: 1 anchor real clip + subtle Ken Burns/parallax on 2–3 still editorial photographs (real photography, not AI). Lighter weight, even more editorial.

**Mood**: golden hour, soft contrast, slightly desaturated, grain-friendly. Natural light only. No drone showreels, no time-lapses, no fast cuts.

**Pacing**: each scene holds 6–8s. One slow crossfade between scenes (1.2s). Total loop ~30s. Footage plays at 0.85× for a quiet, contemplative cadence.

## Scene sequence (4 scenes)

1. **Light** — sun filtering through a window onto an old tile wall or linen curtain. Intimate, still.
2. **Land** — wide coastal cliff or vineyard at golden hour, slow handheld drift. Sense of place.
3. **Human** — hands pouring wine, breaking bread, or a quiet local gesture. Close, tactile.
4. **Path** — empty cobblestone street or trail leading away, soft footsteps implied. Invitation.

Sequence reads as a short film: light → place → people → invitation.

## Typography

- **Headline**: serif, warm muted gold (`#C9A96A` / `--gold`), not white. Georgia or Cormorant Garamond italic for emphasis lines, regular for anchor lines.
- **Eyebrow / CTA**: Inter, uppercase, 0.28em tracking, ivory at 65% opacity.
- **Size**: clamp(28px, 5.4vw, 58px) — slightly smaller than current, more editorial.
- **Weight**: 400 only. No bold. Letterspacing tight (-0.012em) on serif.
- **Shadow**: subtle `0 1px 24px rgba(0,0,0,0.4)` for legibility, never a dark overlay band.

## Text sequence & timing

Reduce from 10 phrases to **5 phrases** — less is more.

1. "Portugal, slowly." *(top-left, 5.5s)*
2. "Hidden chapters, written by those who live them." *(center-left, 6s)*
3. "A private day. A celebration. A journey." *(center, 6s)*
4. "Yours to live." *(lower-right, 5s)*
5. "Begin writing." *(center, 5s — holds until CTAs reveal)*

**Per-phrase timing**:
- Fade in: 1600ms (slower, more cinematic)
- Hold: 4000–4500ms
- Fade out: 1200ms
- Gap: 800ms

**Motion**: opacity + 6px translateY only. No parallax on text. Each phrase anchors to a different quadrant (editorial film-title style). One phrase visible at a time.

**Subtle parallax on video**: ±12px Y on scroll, capped. Reduced-motion: disables all motion, shows scene 5 + CTAs immediately.

## CTAs (revealed after sequence)

Two minimal buttons, identical to current refined treatment but recolored:
- `[ Build Your Journey ]` — solid ivory bg, charcoal text
- `[ Explore Experiences ]` — ghost, gold-tinted border `rgba(201,169,106,0.4)`, ivory text

Squared corners, 0.28em tracking, Inter. No glassmorphism.

## Overlay & grading

- Single radial vignette `rgba(0,0,0,0.15) → rgba(0,0,0,0.42)`.
- Video filter: `saturate(0.88) contrast(1.04) brightness(0.82)` — warmer, slightly faded film stock.
- Optional faint film grain overlay (CSS noise, 4% opacity) — only if approved.

## Performance & constraints

- One `<video>` at a time, `preload="metadata"`, muted/loop/playsinline.
- Total video weight target: ≤ 8 MB across all clips (or Option B: ≤ 3 MB).
- Poster image for instant paint.
- All existing `HERO_COPY` / `HERO_PHRASES` data probes preserved so e2e locks pass — `HERO_PHRASES` updated in `src/content/hero-copy.ts` (5 entries) and copy locks updated in sync.
- No new dependencies.

## Open questions for approval

1. **Sourcing**: Option A (curated stock clips) or Option B (hybrid: 1 clip + still photography with Ken Burns)?
2. **Phrase copy**: approve the 5 phrases above, or refine wording?
3. **Film grain overlay**: include or skip?
4. **Update e2e copy locks**: confirm OK to update `HERO_PHRASES` (this will require updating `hero-copy.ts` and the byte-exact tests).

Awaiting your approval before touching any code or generating assets.