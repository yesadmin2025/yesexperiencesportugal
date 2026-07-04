
# Homepage polish — declutter, unify, convert

The homepage is going in the right direction but currently stacks ~13 blocks, repeats the Studio CTA three times, mixes three different H2 recipes, and layers four motion systems on top of each other. That's what reads as "too full" on mobile. Below is a focused polish pass — no rebuild, no new features, no changes to Studio, Stripe, Bókun, prices, forms or booking logic.

---

## Guiding principles

- **One idea per screen.** Every section earns its place or gets folded into another.
- **One primary CTA per section.** Studio is the hero product — but we stop repeating it.
- **One typographic rhythm.** All H2s use the same recipe. No mixed weights, no mixed serif vs display.
- **Quieter motion.** Entrance fade + gentle hover lift. Everything else off on mobile.
- **Mobile-first spacing.** `py-20` mobile / `py-28` desktop between chapters, generous negative space.

---

## Current vs new structure

```text
BEFORE (13 surfaces)                    AFTER (7 chapters)
─────────────────────────────           ─────────────────────────────
1  Cinematic hero                       1  Cinematic hero
2  SEO intro line                       2  Trust strip (reviews)
3  Trust strip                          3  Experience Studio (live)
4  FourWaysIn                           4  Signature Experiences
5  WhyYesPillars                        5  Bespoke Travel File
6  Studio + live preview                6  Occasions band
7  Bespoke Travel File                  7  FAQ + Final CTA (merged)
8  Signature Experiences
9  Occasions
10 FAQ
11 Popular searches + "Only on YES"
12 Recognised by guides
13 Email capture + Final CTA
```

Net effect: **~45% fewer surfaces**, no lost content — everything preserved gets a better home.

---

## Section-by-section changes

**1. Hero** — unchanged. `<CinematicHero/>`, HERO_COPY lock stays intact.

**2. Trust strip** — keep `<GuestQuotes/>`. Remove the SEO intro `<p>` above it (line 543–546); its info already lives in meta description and hero support line. Result: hero flows straight into social proof, no filler paragraph.

**3. Why YES → folded into Studio section**
- Delete standalone `<FourWaysIn/>` and `<WhyYesPillars/>` from the homepage (components stay in repo, used elsewhere).
- Move the strongest 3 differentiators (real route drawn live · instant confirmation · local designer on WhatsApp) into a compact 3-item row directly under the Studio headline, replacing the current `Mood / Who / Rhythm` index. This keeps the "why" story but ties it to the product, not to a floating manifesto.

**4. Studio section (formerly #3 Builder)**
- Keep left rail + live preview layout.
- Remove the `MessageCircle "About 90 seconds…"` line — it duplicates the trust microcopy that already lives inside the CTA cluster.
- Keep exactly one CTA: **Start designing**.

**5. Signature Experiences** — keep as-is structurally (real Viator tours), just tighten:
- Reduce mobile carousel card width from 84vw → 80vw so the next card peeks more clearly.
- Remove "Swipe to explore" hint (visible ghost card already implies scroll).
- Keep the single **See every Signature** ghost CTA at the bottom.

**6. Bespoke Travel File** — unchanged. Recently regenerated PDF thumbnails stay.

**7. Occasions band** — unchanged. `EditorialCard` primitive already carries the correct rhythm.

**8. FAQ + Final CTA merge**
- Delete section 7b (Popular searches + chip row + "Only on YES" callout, lines 932–1057). This block is the biggest source of clutter: it repeats the Studio pitch a third time, competes with the Occasions band, and buries the FAQ. The internal-link SEO value moves into the Footer as a compact link column so we don't lose the SEO surface area.
- Remove `<RecognisedByGuides/>` from homepage (component keeps living on About/other routes where it fits the reading flow better).
- Delete the inline `<InlineEmailCapture/>` from the Final CTA section — the exit-intent capture stays and is enough on the homepage.
- Final CTA stays: gold rule + card + two CTAs (**Open the Studio** primary, **Write to a Local** ghost).

---

## Typography unification

All homepage H2s currently mix three recipes. Standardize on ONE via a local `H2` helper (no new global primitive needed):

```text
Recipe (mobile → desktop):
  font-display  font-medium
  text-[1.8rem] sm:text-[2.1rem] md:text-[2.95rem]
  leading-[1.12] md:leading-[1.02]
  tracking-[-0.014em]
  text-[color:var(--charcoal)]
  italic emphasis span: font-serif italic font-normal text-[color:var(--teal)]
```

Apply to: Studio, Signatures, Occasions, Final CTA. The oversized `text-[3.8rem]` on Studio + Final CTA drops to the shared `2.95rem` — reads more editorial, less shouty on mobile.

Body copy stays Inter, `text-[14.5px] md:text-[16px]`, `leading-[1.7]`, `text-[color:var(--charcoal-soft)]`.

Retire on the homepage only: `.he-pull`, `.bridge-whisper`, `.kw` (already logged in memory) and any leftover `serif` class on non-hero copy — use `font-display` or `font-serif` explicitly.

---

## Motion reduction

Currently on the homepage: `.reveal`, `.reveal-stagger`, `.section-enter`, `.he-stagger`, `.he-parallax`, `.he-parallax-counter`, `.he-image-cinema`, `.he-image-rise`, `.he-card-lift`, `motion-safe:animate-[shimmer]`, `home-motion` controller, `useEffect` parallax loop.

Keep on the homepage:
- Entrance fade + translateY 12px via `.reveal` (single class, single duration ~450ms).
- Hover lift `-2px` + shadow on Signature cards.
- Image zoom 1.03 on card hover.
- Cinematic hero unchanged.

Remove on the homepage:
- `.he-parallax` / `.he-parallax-counter` and its `useEffect` (lines ~495–533).
- Skeleton shimmer on Signature card images — real images load fast enough via `loading="lazy"` + solid `--sand` placeholder.
- `.reveal-stagger` on the CTA cluster (feels twitchy on mobile).

Result: one entrance effect, one hover effect, no parallax on the homepage. Reduced-motion still honored globally.

---

## Rhythm & spacing

- Section vertical padding: standardize on `py-20 md:py-28` for content sections, `py-16 md:py-24` for the trust strip.
- Alternate `--ivory` and `--sand` backgrounds only. No third surface color.
- One `<hr>`-style gold rule between chapters via existing `he-section-rule` — keep it, but drop the `he-trust-rule` variant so the top of the page opens quieter.
- All sections use `container-x` and `max-w-6xl mx-auto` for the inner grid — no more mixed `max-w-2xl` / `max-w-5xl` / `max-w-6xl`.

---

## Conversion hygiene

- **CTA count on homepage:** currently 9 primary CTAs. After polish: 5 (Hero → Signatures, Studio → Start designing, Signature card → Reserve, Occasions → per-card, Final → Open the Studio + Write to a Local). Each CTA has a distinct job.
- Keep instant-confirmation language exactly where TEST MODE allows it.
- No new copy, no invented facts, no new imagery — everything reuses existing approved assets.

---

## What we're NOT touching

- Studio (route, logic, pricing, DNA, map).
- Stripe / Bókun / checkout / prices / forms / booking logic.
- Signature tour data (`signatureTours`, Viator meta).
- Hero copy lock (HERO_COPY, HERO_COPY_VERSION).
- Footer, nav, global tokens in `src/styles.css`.
- Any route outside `/`.

---

## Files touched (frontend + presentation only)

```text
src/routes/index.tsx        primary edit — remove FourWaysIn, WhyYesPillars,
                            popular-searches block, RecognisedByGuides,
                            InlineEmailCapture; unify H2s; drop parallax
                            useEffect; tighten motion classes.
src/components/Footer.tsx   add compact "Popular searches" link column so
                            SEO internal links survive the homepage cut.
```

No new components, no new dependencies, no schema changes.

---

## Verification before shipping

1. Typecheck (`tsgo`) — must pass.
2. Playwright screenshot at 393×588 (mobile viewport user actually uses) — confirm 7 chapters, no orphaned dividers, no clipped H2, CTAs reachable.
3. Playwright screenshot at 1280×1800 — confirm rhythm still reads editorially, no empty bands.
4. Manual check: HERO_COPY_VERSION header still emitted, hero copy lock intact, `/#studio` and `/#signatures` anchors still resolve.

Ready to build on approval.
