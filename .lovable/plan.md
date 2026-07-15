# Story Output → Narrative Mode

Turn the Final Reveal (FinalRevealStory.tsx) from a numbered chapter list into a single flowing editorial narrative. Structural change only — no pricing/logic/data changes.

## What changes

**File:** `src/components/studio-v3/FinalRevealStory.tsx` (only file touched)

### 1. Title
Replace the current `REVEAL_TITLE` italic line + journey subtitle with:

> **Your private day in {region}**

Region resolved from `state.destinationIntent` → friendly label (Arrábida, Sintra & the Atlantic Coast, Alentejo, Douro, Lisbon, or a graceful fallback "Portugal" when unknown). Region-label helper added locally to the file (pure, no new module).

Keep the small meta line (date · pickup · guests) unchanged directly below the title.

### 2. Intro paragraph
Add one deterministic 2-sentence intro immediately under the title/meta, built from `state.feeling` + companions + region — same restraint rules as `compose-live-story` (no invented places/partners/prices, ≤ 280 chars, no exclamations). Deterministic template, no server call — the AI intro already lives elsewhere in the flow; here we want zero-latency guaranteed copy so the reveal never blanks.

### 3. Body: narrative, not a list
Replace the `<ol>` of chapter items with a single `<div>` of `<p>` paragraphs — one paragraph per stop, joined with editorial connectives that rotate by index:

- 1st stop: *"You'll start your day in {label}. {story}"*
- middle stops: *"Then continue towards {label}…"*, *"Along the way, {label}…"*, *"As the afternoon opens, {label}…"*, *"Later, {label}…"* (rotated, never repeating the same opener twice in a row)
- last stop: *"To close the day, {label}. {story}"*

Rules enforced:
- No `Stop 1 / Chapter I / roman numerals / bullets / <li>`
- No visible label header — the label is folded into the sentence
- If a stop has no `story` copy, the connective sentence stands alone (no empty paragraph)

### 4. Add-ons woven into the story
Selected add-ons no longer render as pseudo-chapters at the end. Instead, each selected add-on becomes an *italic inline paragraph* inserted after the stop that best matches its theme, falling back to "before the day closes" position when no match. Copy pattern:

> *"Because you've chosen the {addon.label}, this is where your day opens to {themed continuation}."*

Themed continuation is a small deterministic map keyed by add-on id/keyword (boat/sea → "the sea", helicopter → "the coast from above", private chef → "a long, quiet table", photographer → "moments you'll keep", etc.), with a neutral fallback ("something quieter and made just for you"). No invented facts, no prices in the sentence — price stays in the collapsible inclusions block below (unchanged).

If no add-ons are selected: nothing is inserted — the story reads clean.

### 5. Removed
- `ROMAN` array + `romanFor()` helper
- `<ol>` / `<li>` structure and roman-numeral gutter span
- `· your addition` micro-label
- `addOnBeats` array

### 6. Preserved unchanged
- Parchment letter card frame, image, gradient
- Meta line (date · pickup · guests)
- `INSTANT_CONFIRMATION` reassurance line
- Collapsible "See what's included" details block (inclusions list + add-on price rows + total)
- CTAs (Continue / Save / Back)
- `data-testid="studio-v3-final-reveal"`, `data-studio-v3-screen="storytelling"`, `data-testid="studio-v3-final-reveal-letter"` — kept so existing e2e specs still resolve
- `data-testid="studio-v3-final-reveal-timeline"` — kept on the new narrative wrapper (rebound to the `<div>` container) so timeline-count assertions still pass by counting `<p>` children instead of `<li>`

## Verification
- Build + typecheck pass
- Manual walkthrough on 393×588: title reads "Your private day in {region}", one flowing block of paragraphs, no numerals, no bullets, add-on sentence italicized inline when toggled
- Toggle add-ons on/off → paragraphs appear/disappear in place; pricing card unaffected
- Existing reveal e2e specs (`studio-v3-reveal-*`) still find their testids

## Out of scope
- No changes to StudioV3 refine surface, pricing card, guest details, checkout
- No new server functions or AI calls (deterministic copy only)
- No new files, no dependency changes
