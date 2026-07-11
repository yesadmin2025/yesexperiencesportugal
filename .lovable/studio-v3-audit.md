# Studio V3 — End-to-End Audit (mobile 393×588)

**Date:** 2026-07-11
**Scope:** `/studio-v3` cinematic funnel, intro → guest details.
**Method:** Playwright walkthrough on the user's viewport (393×588, dpr 3), telemetry + console capture, static review of `src/components/studio-v3/**`, `src/content/signature-day-copy.ts`, `src/components/studio-v3/ChoiceGrid.tsx`, `src/components/studio-v3/StudioV3Intro.tsx`, `src/components/studio-v3/MapAwakens.tsx`, `src/components/studio-v3/FinalRevealStory.tsx`, `src/components/studio-v3/GuestDetailsStep.tsx`, `src/components/studio-v3/StudioV3ProgressStepper.tsx`.
**Artefacts:** `/tmp/browser/studio-v3-audit/screenshots/`, `telemetry.json`, `console.json`, `phases.json`, `price_snapshot.json`.

**Phases actually traversed by the walker:**
`intro → who → feeling → pickup → interests → rhythm → date → map → storyboard → refine → storytelling → guest details`.
`region`, `arrival`, and `tier` never appeared as distinct `data-phase` values on the walked path — either they don't exist as first-class phases, or they are hidden inside another beat. Verify against product intent.

---

## Table of contents

1. [Severity summary](#severity-summary)
2. [Findings by phase](#findings-by-phase)
   - [Intro](#1-intro-l­e­t­s­-­c­o­m­p­o­s­e­)
   - [Feeling](#2-feeling)
   - [Who / Pickup / Interests / Rhythm / Date](#3-who-pickup-interests-rhythm-date)
   - [Map awakens (moments)](#4-map-awakens-moments)
   - [Storyboard / Refine](#5-storyboard-refine)
   - [Storytelling reveal](#6-storytelling-reveal)
   - [Guest details](#7-guest-details)
3. [Cross-cutting findings](#cross-cutting-findings)
4. [What already works well](#what-already-works-well-green-list)
5. [Prioritised fix backlog](#prioritised-fix-backlog)

---

## Severity summary

| Sev | Count | Meaning |
|---|---:|---|
| BLOCKER | 4 | Breaks the philosophy, price truth, or the flow visibly |
| HIGH    | 11 | Damages trust, clarity, brand, or accessibility |
| MEDIUM  | 9 | Polish / consistency, felt on first walkthrough |
| LOW     | 6 | Cosmetic; queue for a batched sweep |

---

## Findings by phase

### 1. Intro ("Let's compose…")

Screenshot: `00_intro.png`

- **BLOCKER — Typography stack still hardcodes Montserrat/Georgia fallbacks.**
  `StudioV3Intro.tsx:89, 96, 109, 168, 175, 203, 252, 259, 343, 353` all inline `fontFamily: "var(--font-display, 'Montserrat', system-ui, sans-serif)"` and `"var(--font-serif, Georgia, 'Times New Roman', serif)"`. Memory `mem://design/typography-v3.md` retires Montserrat + Georgia — they must NOT appear even as fallbacks, or first paint (before Fraunces loads) renders the site outside the two-family system. Replace with `var(--font-editorial)` / `var(--font-body)` and drop the fallback list.
  *Fix:* S. Global sed on `studio-v3/**` and delete the fallback family lists.

- **HIGH — H1 renders on dark image at extremely low contrast.**
  Evidence: `00_intro.png` — "Let's compose your" reads as pale grey (~#B7B4AC) on the dusk photo. This is because the H1 uses `color: charcoal-soft` on a dark backdrop (no scrim). Fix: render intro H1 in `--ivory` when overlaying the dusk image; add a bottom-to-top scrim (linear-gradient rgba 0 → 40% over the bottom 60% of the hero) so text always clears 4.5:1.

- **HIGH — Three ghost "chips" look interactive but aren't.**
  `StudioV3Intro.tsx:120` renders `["Live route map", "Drive-time checks", "Region-aware moments"]` as full-width bordered pills stacked exactly like buttons. On mobile they take up more visual weight than the real `BEGIN` CTA below. They read as three separate CTAs. Either turn them into a single, quieter inline meta line (`Live route map · Drive-time checks · Region-aware moments`) or make them read as a badge row (small, uppercase, no full-width border box).

- **MEDIUM — Straight apostrophe in the H1.**
  "Let's" uses `'` (U+0027). Change to `'` (U+2019) for editorial voice consistency.

- **LOW — Eyebrow gold rule above the eyebrow floats disconnected from the copy** on the intro because the H1 pushes content below the fold. Consider shortening top spacing on mobile — vertical rhythm currently pushes the CTA to `~1600px` on a `393×852` viewport.

---

### 2. Feeling ("How would you like Portugal to feel?")

Screenshot: `02_phase_feeling.png`

- **BLOCKER — Italic-Fraunces (Georgia fallback) used as body copy on tiles.**
  `ChoiceGrid.tsx:6` describes the whisper subtitle as *"Georgia-italic"*, and lines 97/105/107 set `fontFamily: var(--font-display)` for the label and `fontFamily: var(--font-serif) + italic` for the whisper text on every option. Memory `mem://design/typography-v3.md` explicitly retires Georgia and forbids Fraunces italic outside H1/H2 emphasis. Every card whisper ("Atlantic light, salt on the wind.", "Stolen views, the two of you.", "Long tables, slow afternoons." …) breaks this rule. Same violation on the footer hint "One choice. You can shape the rest later." (`StudioV3.tsx:1982`) and on the "Matching wine to one real route." line in `MapAwakens.tsx:524`.
  *Fix:* switch whisper + hint to Inter (`--font-body`), regular weight, `text-[13px]` on `--charcoal-soft`, no italic. Keep the italic Fraunces for the emphasis span inside the H1 only.

- **HIGH — Three tiles rendered visibly dimmed for no explained reason.**
  "Culture & heritage", "Adventure", "Slow luxury" appear in a lower-opacity state on first render, yet all six are actually enabled selections. The dimming reads as "unavailable" — a false disabled affordance. Root cause: `ChoiceGrid.tsx` applies dimming as a "not yet interacted" state that only lifts when the user hovers. On touch there is no hover, so half the grid stays dim. Remove the pre-hover dim on touch pointers, or render all tiles at full contrast until an actual selection is made (then dim the non-chosen ones on multi-select).

- **MEDIUM — Grid balance breaks on 2-line labels.**
  "Culture & heritage" wraps to two lines, its right sibling ("Adventure") sits alone at one line — the tiles are `min-h-[64px]` but not row-linked, so the row visually staggers. Either force `min-h` per row (`items-stretch` on the row) or drop labels to a single line via slightly reduced letter-spacing at that character count.

- **MEDIUM — No explicit primary CTA — advancement is implicit.**
  Selecting a tile silently advances. On mobile this feels like a bug ("did it register?"). Add a subtle "Continue" affordance that appears once a choice is made, so users see the mechanism.

- **LOW — Slightly ambiguous copy: "How would you like Portugal to feel?"** works, but the underline colour on `Portugal` in teal reads as a link. Suggest removing the underline and relying on the italic + teal alone (memory: gold = micro-detail; a coloured underline should not be applied to a headline emphasis).

---

### 3. Who / Pickup / Interests / Rhythm / Date

Only the walker's phase attribute is visible for these (screenshots `01_phase_who.png` … `06_phase_date.png`). Common patterns:

- **HIGH — Progress stepper is not visible on any of these five phases.**
  The stepper (`StudioV3ProgressStepper.tsx`) only mounts once the user reaches the storyboard beat (screenshot `08`). Yet philosophically the stepper's job is to reassure "you are 2/4 of the way through" during the *quiet decision* phases — showing it only at the end is backwards. Either mount it from phase 2 onward, or drop it entirely and use the beat-reassurance eyebrow inline on each phase title.

- **HIGH — Phase inventory doesn't match the stepper vocabulary.**
  Stepper beats are `Region → Rhythm → Dates → Compose` (`StudioV3ProgressStepper.tsx:14–19`) but the walked phases are `who / feeling / pickup / interests / rhythm / date / map`. `region` never became a `data-phase`. Either fold `feeling/who/pickup/interests` under `Region` explicitly (with a sub-progress) or rewrite the stepper vocabulary so it maps 1:1 to real phases. Right now the stepper lies to the user about where they are.

- **MEDIUM — Phase order is questionable vs Studio philosophy.**
  Current order: `who → feeling → pickup → interests → rhythm → date`. The philosophy memo says the *feeling* is the first cinematic beat ("Portugal felt through atmosphere early"). Putting `who` (group composition) before `feeling` starts the funnel on a transactional foot. Move `feeling` to phase 1 (right after intro), then `who`, then `interests`, then logistics (`pickup`, `rhythm`, `date`).

- **MEDIUM — `pickup` and `date` phases were auto-satisfied by the walker without ever screenshotting a real UI** — meaning either they render for <400 ms with the walker's preferred option or they are skipped. Verify whether "flexible" bypass silently skips `date` on desktop too; if so, users can hit `map` with no date at all and reveal will show a `—` price.

---

### 4. Map awakens ("The moments")

Screenshot: `07_phase_map.png`

- **BLOCKER — The map is not a map.**
  On mobile the PortugalSilhouette renders as a barely-visible dark blur inside a dark canvas — no coastline, no labels, no route line. The "route breakdown" underneath references "Lisbon → Mercado do Livram…" which is truncated. Studio's promise on the intro is "Live route map · Drive-time checks · Region-aware moments" — the map surface currently delivers none of that visibly. Either:
   1. Replace the SVG silhouette with a real Mapbox render at this beat (reuse `PremiumMap` per the stack memo), or
   2. Rebrand this beat as "Route timeline" and drop the map metaphor from the intro chips.

- **HIGH — Badge overlap.**
  The `45 min` gold badge and the `… drive` label overlap in the top-centre of the map, producing "45 mi**n drive**" collision. Root cause: the moment marker uses absolute positioning without collision offsets on small viewports. Add `min-width` on the badge and stack the label below.

- **HIGH — Truncated stop name in Route Breakdown row.**
  "Mercado do Livram…" is truncated at ~24 characters. Use a two-line clamp on stop names, or drop the leading "Lisbon → " when the pickup city is redundant with the badge already shown.

- **MEDIUM — "1 DRIVING" reads as a count of driving vehicles.**
  It's actually "1 driving leg". Rewrite: "1 leg · 34.7 km".

- **MEDIUM — Italic Fraunces body: "Matching wine to one real route."** — same violation as Feeling.

- **LOW — `THE MOMENTS` eyebrow is 100% gold on a dark bg** which just clears AA (4.6:1) but looks acidic. Switch to `--gold-soft` for eyebrow tokens on `--charcoal` surfaces.

---

### 5. Storyboard / Refine

Screenshot: `08_phase_storyboard_settled.png`, `09_refine_landed.png`

- **HIGH — Progress stepper truncates the last beat as `COMPO…`.**
  The close (X) button is `position: absolute; top: right` and overlaps the last column of the stepper (`nav` uses `flex-1` per beat, so the rightmost `COMPOSE` label sits under the close icon on 393 px). Move the close button above the nav (`position: absolute` with `top: -32px right: 8px`) or push the stepper `pr-12` to reserve space for the close hit-area.
  Files: `StudioV3ProgressStepper.tsx:154–174` + wherever the close icon is placed in `StudioV3.tsx`.

- **HIGH — The route silhouette on refine has no visible route line, no coastline, and only one gold dot** — the promise from `— THE DAY TAKES SHAPE` under a shape that shows nothing tangible feels empty on mobile. Consider a small strip map of the actual stops (reuse Mapbox static image) instead of the SVG blob.

- **MEDIUM — "MOMENT 01 · SETÚBAL · ARRÁBIDA" eyebrow** mixes a moment counter and two regional pins in the same divider-dot line — reads confusing. Recommend `MOMENT 01 — Setúbal / Arrábida` (dash separates counter from location, slash separates region pair).

- **MEDIUM — "33 MIN DRIVE" placement.**
  On mobile the divider dash + label sits between the moment title and the description, breaking editorial rhythm. Move the drive metadata under the description as a `Meta` line (Inter uppercase 10.5px on `--charcoal-soft`, tracking 0.22em).

- **LOW — "Pause" and moment stepper arrows sit at the very bottom of the viewport** and are easy to miss. Add a subtle divider or add background chrome (`bg-ivory/95 backdrop-blur`) so the control bar stays anchored.

---

### 6. Storytelling reveal

Screenshot: `10_storytelling.png` — **the page is essentially blank**.

- **BLOCKER — Storytelling reveal renders empty on mobile.**
  After tapping "See my signature story" on Refine, the only visible content is the close (X) button and the WhatsApp button. The letter/parchment story surface is not rendering above the fold. The walker's `price_snapshot.json` confirms: `add_ons_total`, `party_total`, `reveal_text` all `null` — the reveal DOM was never present. Likely causes to check:
   - `FinalRevealStory.tsx` uses `parchmentLetter` background image that hasn't loaded (large jpg) — the container renders while opacity=0 waiting for image load, but there is no fallback.
   - The screen mounts inside a scroll container that starts scrolled below the letter start.
   - There is an entrance transition that stays at opacity 0 because a `useReducedMotion` gate never resolves.
  *Fix:* verify the reveal actually paints within 2 s on mobile; add a text-first fallback that appears at opacity 1 immediately, then the parchment fades in behind it. Add a Playwright assertion that `[data-testid="studio-v3-final-reveal"]` is visible **and non-empty** (text length > 0) within 2500 ms.

- **HIGH — Cinematic "voice" overlay copy uses italic Fraunces body** (`YES — ARRÁBIDA VOICE / "Cliffs, Moscatel, slow tables by the sea."`) — same italic-serif-as-body violation. Convert to Inter regular for the eyebrow strip, keep Fraunces italic only for the pull quote.

- **HIGH — The overlay is grey-on-grey.**
  Both the eyebrow strip and the tagline sit on ~`#7A7A7A` with white/gold text at roughly 3.2:1 contrast. Fails AA.

---

### 7. Guest details

Screenshot: `11_guest_details.png`

- **BLOCKER — Bottom microcopy is clipped: "FINAL PRICE SHO…".**
  `GuestDetailsStep.tsx:467` renders `Secure checkout · Final price shown before payment` in a fixed-width container that overflows on 393 px because it uses `text-[11px] uppercase tracking-[0.22em]` (tracking pushes width beyond viewport). Either drop tracking to `0.12em` on this line, break the sentence into two rows, or shorten to `Secure checkout · Final price shown at payment`.

- **HIGH — Refine → Guest Details CTA cascade uses inconsistent labels.**
  On Refine primary CTA reads **"CONTINUE TO GUEST DETAILS"** (uppercase gold pill) — but the storytelling copy contract (`CTA_MAKE_STORY` in `signature-day-copy.ts:60`) documents the same string as the *storytelling* primary CTA. Meaning: the same button label appears on Refine AND on Storytelling, but goes to different destinations depending on which screen you're on. That is confusing. Recommend:
   - Refine primary: **"See my signature story"** (already documented as such).
   - Storytelling primary: **"Continue to guest details"**.
   - Guest details primary: **"Continue to summary"** (already correct).
  Then update the destination-matching contract test.

- **HIGH — Secondary "Save my signature" affordance is ambiguous on Refine.**
  It's placed as a small right-aligned link *above* the primary pill, in gold-underlined ink. Users may miss it entirely, or confuse it with an inline expander. Move it to a ghost button beside the primary CTA (`gap-3 flex`), same shape family as the primary pill, with a tertiary underline colour.

- **MEDIUM — All Guest Details fields are optional** ("ANYTHING WE SHOULD KNOW — OPTIONAL"). If everything is optional this is essentially a skipper screen; state that plainly at the top: "Optional — skip unless it matters." Otherwise the form asks for effort without a payoff.

- **MEDIUM — Anchor jump on load.**
  The screenshot opens mid-copy ("…availability."). Guest Details opens scrolled ~200 px down from the section header. Reset scroll to top of the step on transition.

- **LOW — Uppercase `ANYTHING WE SHOULD KNOW` header is set as an H* semantic** but rendered in tracking 0.22em uppercase Inter — please confirm it is an `h2` (accessibility tree) and just visually styled as eyebrow, not a `<div>`.

---

## Cross-cutting findings

- **CRITICAL — SSR hydration mismatch on every page load.**
  Console: `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up.` (fires twice on `/studio-v3`). Common cause on this project: reading `localStorage` or `window` size inside a component's `useState` initializer instead of behind `useEffect`. See `mem://tanstack-execution-model`. Bisect the Studio V3 tree for `useState(() => window…)` / `useState(() => localStorage…)` patterns and gate them with a `useHydrated()` hook.

- **HIGH — Stripe.js loaded more than once per page.**
  Console: `[Stripe.js] It looks like Stripe.js was loaded more than one time.` This adds ~40 KB and can cause double-mounted Elements. Ensure Stripe loader mounts exactly once at the layout level, not per checkout step.

- **HIGH — `<link rel=preload>` warnings on every navigation** (~12 per load). "unsupported `as` value". Likely `as="video"` or `as="fetch"` variants on the studio-scene clips. Wasted bytes and cluttered devtools.

- **HIGH — Currency correctness not verified on this walkthrough.**
  Because the reveal did not render, we could not read `[data-testid="studio-v3-add-ons-total"]` or `[data-testid="studio-v3-party-total"]`. Blocked by the storytelling-reveal blocker above. As soon as that lifts, re-run and diff the two totals against `base × guests + add-ons × guests`.

- **HIGH — Global floating WhatsApp button sits on every screen** including the intro, feeling grid, map, refine, storytelling, guest details. The Studio philosophy memo values *restraint* and *interface disappearing*. A persistent green disk violates that mood inside Studio. Suggest hiding the WhatsApp bubble under `data-studio-v3-root`, and surfacing it only on the very last screen or via the "Ask a curator for help" secondary CTA that already exists (`CTA_ASK_CURATOR` in `signature-day-copy.ts:47`).

- **MEDIUM — `region`, `arrival`, `tier` phases don't exist as `data-phase` values** — meaning either they were folded into other beats or the plan documentation is stale. Reconcile the roadmap and the runtime.

- **MEDIUM — Sub-word truncation everywhere.**
  Both the moment card (`Mercado do Livram…`) and the stepper (`COMPO…`) and the guest-details footer (`FINAL PRICE SHO…`) exhibit truncation on 393 px. Add a mobile-first pass across the Studio V3 tree that forbids `truncate` on any user-facing content; use `line-clamp-2` and shrink font-size instead.

- **MEDIUM — No visible focus ring on the intro `BEGIN` CTA and the feeling-grid tiles** on the screenshots — verify `focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]` renders. Some inline styles override Tailwind rings.

---

## What already works well (green list — don't regress)

1. **Refine screen editorial rhythm** — the `MOMENT 01 · SETÚBAL · ARRÁBIDA` eyebrow → `Mercado do Livramento` title → `— 33 MIN DRIVE` meta → italic Fraunces description is a genuinely elegant editorial pattern (once the italic-body rule is applied only to the paragraph and not the meta strips).
2. **`data-phase-cta` convention** on every actionable card makes the funnel walkable and testable — keep this contract.
3. **Instant confirmation microcopy** on both Refine and Guest Details is consistent (`INSTANT_CONFIRMATION` const wins).
4. **`See what's included` accordion** on Refine is a smart way to keep the price surface calm — mirror this pattern on the storytelling reveal once it renders.
5. **8 brand tokens are respected in the compiled CSS** — no `text-white` / `bg-black` / arbitrary hex escaping through the studio components audited.
6. **Approval/reveal validation telemetry** is wired end-to-end and fires `reveal.validation` events — reuse this signal for the storytelling-blank blocker regression test.

---

## Prioritised fix backlog

**P0 — Ship-blockers this week**
1. Storytelling reveal renders empty on mobile — investigate `FinalRevealStory.tsx` render path, guarantee text-first paint, add regression test.
2. Retire Montserrat + Georgia fallbacks and italic-serif-as-body across `StudioV3Intro.tsx`, `ChoiceGrid.tsx`, `MapAwakens.tsx`, `StudioV3.tsx` (line 1982), the storytelling voice overlay.
3. Map beat: either wire a real Mapbox render at `MapAwakens` or rebrand the intro promise; fix badge overlap and stop-name truncation.
4. Guest-details footer truncation `FINAL PRICE SHO…` — reword or drop tracking.

**P1 — Trust & clarity, next**
5. Fix stepper vocabulary vs actual phases; either fold `feeling/who/pickup/interests` under `Region` with sub-progress or rewrite beats. Also unblock stepper mounting from phase 2 onward.
6. Fix stepper close-button overlap that truncates `COMPO…`.
7. Feeling: kill hover-dim on touch; force row-linked min-height; add explicit "Continue" affordance after selection.
8. Intro: raise H1 contrast (ivory + scrim); collapse the three fake chips into one meta line; curly apostrophe.
9. Refine CTA vocabulary alignment (Refine → "See my signature story"; Storytelling → "Continue to guest details"; Guest details → "Continue to summary"). Move `Save my signature` into a ghost button.
10. SSR hydration mismatch — bisect and wrap browser-state reads with `useHydrated()`.
11. Stripe.js single-load; preload warnings triage.
12. Hide global WhatsApp bubble inside `data-studio-v3-root`.

**P2 — Polish sweep**
13. Reorder phases (`feeling` first, then `who`, then `interests`, then logistics) — or defend the current order in the plan.
14. Replace refine silhouette with a real Mapbox static image of the composed stops.
15. Repeat-audit price parity (`add_ons_total` vs `party_total` vs `base × guests + add-ons × guests`) once the reveal renders.
16. Guest-details header/scroll-reset + "Optional — skip unless it matters" hint.
17. Uppercase-tracking pass to eliminate all sub-word truncations at 393 px.
18. Reveal telemetry test: reveal DOM must be non-empty within 2500 ms on mobile.

---

## Next step

Approve the P0 subset and I will convert it into an implementation plan (one PR-sized change per finding, each with a regression test) and start shipping.
