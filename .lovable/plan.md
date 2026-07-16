## Goal

Fix the hero copy bug shown in the screenshot, standardize the homepage's motion system across every public page (elevated, editorial, non-bouncy), sharpen the hero CTAs for conversion, and stop image repetition across pages by mapping the existing image library to page-specific contexts.

---

## 1. Hero duplication fix (the screenshot bug)

**Bug:** `src/components/home/CinematicHero.tsx` renders the second phrase twice — once combined inside the `<h1>` (line 167 → `{HERO_PHRASES[0]} {HERO_PHRASES[1]}`) and again as a `<p>` below (line 187 → `{HERO_PHRASES[1]}`). Result on mobile: "Portugal is the stage. You write the story." followed by a repeated "You write the story."

**Fix:** restore the intended two-line stanza — `<h1>` shows only `HERO_PHRASES[0]` ("Portugal is the stage."), `<p>` shows only `HERO_PHRASES[1]` ("You write the story."). Keep the existing `line1` / `line2` staggered reveal timings (already wired). Zero copy changes, zero token changes.

Also verify `EntryScreen.tsx` (Builder) isn't affected — it uses its own string, no change needed.

---

## 2. Standardize page animations on the homepage system

**Rule:** every public marketing route uses the SAME primitive as the homepage — `data-motion="fade-up"` markup + the `home-motion.ts` controller booted via `useMarketingMotion()`. No new animation library, no framer-motion sprinkles, no per-page custom systems.

**Elevate the values (single source of truth, applied to homepage AND all pages):**
- Entry: `opacity 0 → 1`, `translateY(22px → 0)`, `filter: blur(6px → 0)`, `380ms` `cubic-bezier(0.22, 0.61, 0.36, 1)` (editorial ease, no overshoot, no bounce).
- Section eyebrow → title → body → CTA cascade: 90ms stagger, capped at 360ms on fast devices / 240ms on low-power (existing tuning in `home-motion.ts`).
- Card grids: 100ms stagger, capped at 400ms.
- Hover: lift `-3px`, shadow deepen, `220ms` ease-out. No scale > 1.02. No spring.
- Image reveal: subtle 1.04 → 1.0 scale over 600ms paired with fade — replaces the current static image loads on Signature / Local Stories / About.
- `prefers-reduced-motion`: short-circuits to instant reveal (already implemented, keep).
- Marketing scope (`html[data-motion-scope="marketing"]`): keep the current 8px / 220ms cap so non-home routes stay restrained; but bump the homepage scope to the elevated values above so home stays the most alive.

**Wire-up work (24 routes missing the hook):**
Add `useMarketingMotion()` to: `experiences`, `day-tours`, `multi-day`, `tours.$tourId`, `tours.$tourId.tailor`, `about`, `contact`, `reviews`, `press`, `corporate`, `proposal-in-portugal`, `portugal-tours`, `luxury-tours-portugal`, `private-tours-portugal`, `local-stories.index`, `local-stories.$slug`, `itineraries.10-day-private-portugal-tour`, and all `pt.*` mirrors of the above.

**Auto-tagging (in `home-motion.ts`):** extend the existing `.home-energy` heading/card auto-tagger to also run under `[data-motion-scope="marketing"]` so pages get the same rhythm without hand-tagging every h2/eyebrow/card. Selector list unchanged (h2, h3, eyebrow, lead, `.he-card-lift`, etc.).

**Forbidden (guardrails, unchanged):** parallax off-homepage, glassmorphism, blobs, shimmer, bounce, spring, autoplay carousels.

---

## 3. Hero CTA elevation (conversion, still editorial)

Two CTAs stay ("Open the Studio" primary, "Choose Your Experience" ghost) — the memory-locked pair. Changes are craft only, no copy invention:

- **Primary CTA ("Open the Studio"):** promote from ghost outline to a solid gold-fill button (`--gold` bg, `--charcoal` text), 48px height on mobile (currently ~40px), gold-sheen sweep on hover (already scoped in `.home-energy`), 220ms ease-out. Meets 44×44 tap target.
- **Secondary CTA ("Choose Your Experience"):** demote to a lighter ghost — ivory text, hairline gold underline, arrow ramp on hover. Removes the current competing gold-fill treatment visible in the screenshot where both CTAs read at the same weight.
- Vertical order + wording: unchanged.
- Reveal: keep the existing `composed` delay so CTAs appear after the stanza settles (~1200ms), but shorten from current cubic to the standardized 380ms editorial ease for consistency with rest of site.

---

## 4. Stop image repetition — page-specific image assignment

**Problem:** several routes reuse the same 3–4 hero/section images (owner photos, Arrábida viewpoint, winery group) even when the page context is different (Corporate, Proposals, Local Stories, About).

**Fix (data-only, no new images):** build one small manifest `src/content/page-image-map.ts` that assigns from the existing library (`src/assets/owner-photos/*`, `src/assets/tours/*`, `public/tours/*`, hero clips) to each route by context tag:

| Context tag | Pool draws from |
| --- | --- |
| celebration / proposal | `tasting-cake-moment`, `wine-cheers-arch`, `couple-vineyard` |
| corporate / group | `winery-group-orange-tree`, `arrabida-viewpoint-group` |
| craft / artisan | `ceramic-painter-plate`, `potter-wheel-azeitao`, `cork-harvesters-alentejo` |
| wine / gastronomy | `couple-vineyard`, `wine-cheers-arch`, Azeitão scene clips |
| coast / nature | Arrábida / Cabo da Roca / hidden cove scene stills |
| local stories editorial | rotate by slug hash so each article gets a distinct image |

Each page pulls from its tag pool with a route-stable selector (no duplicates within a page, no repeat between adjacent pages in the nav). Also runs through the existing `vite-imagetools` `?format=webp&quality=82` pipeline where imports aren't already using asset.json pointers — elevates perceived quality without a re-shoot.

Explicitly OUT of scope: generating new images, replacing Signature-tour real operation images (memory: real-operation only), touching Viator-sourced imagery.

---

## 5. Files touched (summary)

- `src/components/home/CinematicHero.tsx` — hero duplication fix + CTA weight swap.
- `src/lib/home-motion.ts` — extend auto-tagger to `[data-motion-scope="marketing"]`, bump values.
- `src/styles.css` — update `data-motion` transition tokens (blur+380ms+editorial ease), homepage-scope override.
- `src/hooks/use-marketing-motion.ts` — no signature change.
- 24 public route files — add `useMarketingMotion()` call (one line each).
- `src/content/page-image-map.ts` (new) + swap image imports on `about`, `corporate`, `proposal-in-portugal`, `local-stories.$slug`, `press`, and PT mirrors.

## 6. Verification

- Playwright: capture home hero at 393×588 — assert single "You write the story." rendering.
- Playwright: scroll each of `/experiences`, `/day-tours`, `/multi-day`, `/tours/[first]`, `/about`, `/local-stories`, `/reviews`, `/corporate` — assert `html.motion-ready` present and `[data-motion].motion-in` count > 0 after scroll.
- Visual: screenshot before/after on 3 sample pages to confirm elevated feel with no bounce.
- Existing e2e (`hero-copy-byte-exact`, `hero-cinematic-attrs`, `homepage-structure`, `studio-v3-p0-*`, typography regression) must still pass — no token, copy, or Studio changes.
