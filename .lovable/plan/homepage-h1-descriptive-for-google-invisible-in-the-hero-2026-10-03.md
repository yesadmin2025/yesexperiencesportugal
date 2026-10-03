# Homepage H1 — descriptive for Google, invisible in the Hero

## Goal
Clear the last failing SEO finding ("Homepage H1 is a slogan, not descriptive") without changing anything the visitor sees in the Hero.

## Approach — same pattern already used on the About page
The About page already solved this exact problem: the real `<h1>` carries a descriptive line, and the slogan renders below it as a styled `h2`, visually identical. We apply the same pattern to the homepage Hero.

## Changes

1. **CinematicHero.tsx** — restructure the heading block:
   - The `<h1>` keeps its position but its content becomes a visually-hidden descriptive line: **"Private Tours & Travel Design in Portugal — YES! Experiences"** (screen-reader + Google only, using a standard `sr-only` style: clipped, 1px, no layout impact).
   - The two slogan lines ("Portugal is the stage. / You write the story.") move into a visually identical element (a `p` or `div` with the same `hero-h1` classes, masks, italic Fraunces styling, and animation timings). Pixel-for-pixel the Hero looks the same.
   - All `data-hero-*` attributes, reveal timings (500ms / 1700ms) and reduced-motion behavior are preserved exactly.

2. **No other routes touched.** About, Experiences, Day Tours etc. already have descriptive H1s.

## What stays locked
- Hero copy, CTAs, subheadline, visuals, motion — unchanged.
- Hero A/B testing (`useHeroVariant`) still drives the visible slogan lines only; the hidden descriptive H1 is constant across variants.
- No pricing, booking, SEO-architecture or route changes. Nothing published without your explicit request.

## Verification
- `hero-copy-byte-exact` and hero visual regression tests still pass (visible text unchanged).
- Heading-structure test: exactly one `<h1>` per page, no skipped levels.
- Playwright check at 390px and desktop: Hero renders identically (screenshot compare), and the DOM H1 reads the descriptive line.
- After the next SEO rescan, the "Homepage and About H1s not descriptive" finding should clear.

## Technical note
Google accepts visually-hidden headings when they match the page's real content (this is the standard `sr-only` accessibility pattern, not cloaking — the text describes the actual service). The hidden line uses wording consistent with the site's existing titles.
