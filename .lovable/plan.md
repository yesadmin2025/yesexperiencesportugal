# Contrast, Readability & Hierarchy Audit — Plan

## Context

Motion, CTA behaviour and micro-interactions were rebuilt in the previous four waves — the motion language is now consistent (`--ease-premium`, `--dur-tap/quick/base/slow`), CTAs suppress hover on touch, links carry `.tap` + `.link-hairline`, Studio hydration uses `.editorial-shimmer`. This plan focuses on the areas **not** yet addressed: **contrast**, **readability**, **visual hierarchy**, and the last small motion/CTA gaps.

## 1. Weaknesses found

### CTAs (residual)
| # | Issue | Where | Sev |
|---|---|---|---|
| CTA-1 | Save-Signature button (Studio v3) uses a hand-rolled `<button>` with `hover:-translate-y-0.5 duration-200` — bypasses `CtaButton`, so it inherits none of the touch/reduced-motion rules and its "hover" fires on tap on mobile. | `StudioV3.tsx:4625–4647` | Med |
| CTA-2 | `TourReviews` / `LandingTourCredibility` eyebrow labels are `text-[10.5px] uppercase charcoal/55` — technically not CTAs, but they read as un-clickable meta and steal weight from the actual CTA below them. | 2 files | Low |
| CTA-3 | Card-level "See tour" arrow links on Signature slides use a lower opacity than the hero CTA — subtle inconsistency in perceived affordance. | `SignatureCarousel.tsx` | Low |

### Contrast
| # | Issue | Where | Sev |
|---|---|---|---|
| C-1 | **~44 instances** of `text-[color:var(--charcoal)]/40` or `/45` on ivory. `charcoal 40%` on `#FAF8F3` ≈ **2.3:1** → fails WCAG AA (needs 4.5:1 for body, 3:1 for ≥18px). Includes input placeholder-icons, secondary metadata, disabled-looking captions. | `AddStopSheet`, `BuilderImage`, `BuilderDebugPanel`, several hero eyebrows | **High** |
| C-2 | `text-[color:var(--ivory)]/40–/55` on dark charcoal (Footer sub-copy, tour dark hero captions) ≈ **3.4–4.1:1** — passes for ≥18px but fails for the small labels it's often applied to. | Footer meta, tour dark hero | Med |
| C-3 | `charcoal/55` on ivory ≈ **3.6:1** — passes only for large text; used site-wide for 10.5–13px eyebrows. Legal per AA for ≥18px, borderline for the sizes actually shipped. | `TourReviews`, `LandingTourCredibility`, several eyebrow rows | Med |
| C-4 | Sunlight-mode risk: on mobile OLED under bright sun, `charcoal 30–40%` and `gold-soft` on ivory both compress to near-invisible. No fallback for `prefers-contrast: more`. | site-wide | Med |

### Readability & typography
| # | Issue | Where | Sev |
|---|---|---|---|
| T-1 | **475 uses** of `text-[10px] / [10.5px] / [11px]` — micro-type is doing too much load-bearing work: eyebrows, meta, trust strips, footer legal, some button labels. Below the 12px "read easily on mobile" floor for anything the user must actually read. | site-wide | High |
| T-2 | `font-light` (Inter 300) on light backgrounds is used for 4 non-decorative surfaces: `SignatureCarousel` body italic, tour hero italic paragraphs, some numeric callouts. Thin weight + off-white bg = low perceived contrast even when hex passes AA. Memory rule `homepage-emphasis` already forbids this on light surfaces — but it survives outside the homepage. | `SignatureCarousel.tsx:278`, `tours.$tourId.tsx:268, 897`, `WhyYesPillars`, `ThreePathsSection` | High |
| T-3 | Line-height on 13–14px body copy is often `leading-[1.4]` or unset — should be `1.55–1.65` for editorial mobile reading. `.hero-cinematic` and homepage bodies are correct; secondary pages are not. | tour pages, Studio meta text | Med |
| T-4 | Eyebrow tracking varies (`0.18em`, `0.22em`, `0.24em`, `0.28em`). Reads as five separate systems on a single scroll. | site-wide | Low |
| T-5 | H2/H3 weight distinction is thin on non-homepage routes — H2 at `font-semibold` (600), H3 also at `font-semibold` (600). Same optical weight, different size. Scan speed suffers. | tour pages, corporate, alentejo, evora routes | Med |

### Visual hierarchy
| # | Issue | Where | Sev |
|---|---|---|---|
| H-1 | Trust strips (RNAAT, Tripadvisor, "24h response") sometimes rendered at the same weight and color as CTA microcopy — the eye gets two "primary" cues in the same block. | hero + tour pages | Med |
| H-2 | Ghost CTAs and text-link CTAs live in the same row with almost identical weight — user can't tell which is the primary action. Especially visible on `/tours/$tourId` where "Reserve" (primary) and "Talk to us" (ghost) share the same visual pitch. | tour + landing pages | Med |
| H-3 | Section eyebrows (`Signature`, `Tailored`, `Builder`, etc.) all render at the same size/color regardless of section importance — no "you are in the main path" signal. | site-wide sections | Low |

### Animation (residual, small)
| # | Issue | Where | Sev |
|---|---|---|---|
| A-1 | 2 remaining `ease-in-out` on infinite atmospheric animations (Studio breathe, region pulse) — acceptable for infinite loops but inconsistent with the "one language" rule. | `PhaseShell.tsx` inline `<style>` | Low |
| A-2 | Hero-keyframe library still has 9 variants — 3–4 of them appear unreferenced after the last refactor. Ship cost is trivial; maintenance cost isn't. | `styles.css:1726–1945` | Low |

## 2. Improvements per category

### CTAs
- **CTA-1** Replace the Save-Signature `<button>` with `<CtaButton variant="ghost" size="sm" icon={null}>` — inherits touch suppression, reduced-motion, focus-ring, error-nudge in one line.
- **CTA-2/3** Standardize all "read more / see tour" text links to the `hairline` variant of `CtaButton`. Kill hand-rolled arrow rows in cards.
- Introduce a `data-role="primary"` convention on the intended primary CTA in each section — used to add a whisper `ctaRimBreathe` (already exists) only on the true primary. Solves H-2 without visual noise.

### Contrast (fixes C-1, C-2, C-3, C-4)
- **New tokens** in `styles.css`:
  - `--text-muted: color-mix(in oklab, var(--charcoal) 62%, transparent)` → ~5.1:1 on ivory. Replaces `charcoal/55` on ≤13px surfaces.
  - `--text-subtle: color-mix(in oklab, var(--charcoal) 48%, transparent)` → ~3.6:1, use ONLY on ≥18px labels.
  - `--text-icon: color-mix(in oklab, var(--charcoal) 55%, transparent)` → for icon glyphs.
  - `--text-on-dark-muted: color-mix(in oklab, var(--ivory) 78%, transparent)` → ~7.0:1 on charcoal.
- Sweep `charcoal/40`, `charcoal/45`, `charcoal/55` → the new tokens based on size.
- Add `@media (prefers-contrast: more)` block that promotes all muted tokens to full `--charcoal` / `--ivory`. Zero cost when not requested.
- Placeholder icons (`AddStopSheet`, search fields): move from `/40` to `/60`.

### Readability & typography (fixes T-1, T-2, T-3, T-4, T-5)
- **Micro-type floor**: raise all load-bearing labels below 12px to 12px. Keep 10.5–11px only for decorative eyebrows above sentence-case titles (never for content the user must read).
- **Ban `font-light` on light surfaces** globally — replace with `font-normal` (400) or `font-medium` (500) depending on role. `SignatureCarousel` overlay body → normal + tracking-tight; tour hero italic → normal Georgia italic (already legible at 400).
- **Line-height token**: `--lh-read: 1.6` for 12–15px body, `--lh-tight: 1.35` for headings. Apply via a `.editorial-body` utility so we stop stamping arbitrary values.
- **Eyebrow tracking lock**: single canonical `.eyebrow` class already exists (`<Eyebrow>` primitive per memory) — enforce it everywhere; delete the 4 rogue tracking values.
- **H2/H3 differentiation**: H2 → `font-semibold` (600) + `--text-primary` (charcoal 100%); H3 → `font-medium` (500) + `--text-muted`. Same on mobile.

### Visual hierarchy (fixes H-1, H-2, H-3)
- Trust strips → dimmer weight (`--text-subtle`, all-caps, tracking-wide) so they never compete with CTAs.
- Section eyebrows unchanged in style, but the true "primary path" eyebrow (`Design & Book` / `Studio`) gets a subtle gold hairline underneath — a persistent version of the `link-hairline` treatment, at 60% opacity.
- Primary vs ghost CTA gap: increase the visual weight delta — primary keeps solid teal + shadow, ghost drops to a **hairline-only** treatment (no border box) when it appears next to a primary in the same row. Prevents "two identical buttons" ambiguity.

### Animation (residual)
- Tokenize `studioV3Breathe` and `studioV3RegionPulse` easing to `cubic-bezier(0.22, 0.61, 0.36, 1)` (or keep `ease-in-out` if that reads better on infinite loops — accept as a documented exception).
- Prune unreferenced hero keyframes after grep audit.

## 3. Recommended animation system (already partly shipped)

| Concern | Duration | Easing |
|---|---|---|
| Hover color/opacity swap | `var(--dur-quick)` 200ms | `var(--ease-premium)` |
| Tap press/release | `var(--dur-tap)` 140ms | `var(--ease-snap)` |
| Arrow slide, small translate, hover lift | `var(--dur-base)` 320ms | `var(--ease-premium)` |
| Section entry, reveal, phase swap | `var(--dur-slow)` 560ms | `var(--ease-premium)` |
| Image parallax / hero zoom | 1100ms | `var(--ease-premium)` |
| Reveal stagger between siblings | 70ms increment, cap 380ms | inherited |
| Infinite atmospheric loop (breathe, pulse) | 6–14s | `ease-in-out` (accepted exception) |

Behaviour patterns:
- Never animate on touch what already animates on tap.
- Never delay a CTA visibility for aesthetic entry — CTAs are opacity-0 → opacity-1 in ≤200ms, no `translateY` on primary conversion buttons.
- Every keyframe collapses to opacity-only under `prefers-reduced-motion`.

## 4. Contrast adjustments (where + why)

| Change | Where | Why |
|---|---|---|
| `charcoal/40` → `--text-icon` (55%) | placeholders, icon glyphs (`AddStopSheet`, `BuilderImage`, `BuilderDebugPanel`) | Icon shape carries meaning; must be visible in sunlight |
| `charcoal/45` → `--text-subtle` (48%) or `--text-muted` (62%) depending on size | ~10 spots in Studio/builder | AA compliance on small labels |
| `charcoal/55` → `--text-muted` (62%) for ≤13px | `TourReviews`, `LandingTourCredibility`, most eyebrows | Bumps 3.6:1 → ~5.1:1, still calm |
| `ivory/40–/55` on charcoal → `--text-on-dark-muted` (78%) | Footer sub-copy, tour dark hero captions | Consistent 7:1 on dark backgrounds |
| `prefers-contrast: more` promotion block | new global rule | Silent a11y improvement, zero visual cost |

## 5. Typography adjustments

| Change | Where | Why |
|---|---|---|
| Raise load-bearing text below 12px → 12px | anywhere the user must read to decide (trust strips, tour meta, form helpers) | Mobile floor |
| Ban `font-light` on light surfaces globally | `SignatureCarousel`, `tours.$tourId`, `WhyYesPillars`, `ThreePathsSection` | Perceived contrast, matches homepage memory rule |
| `.editorial-body` utility (16px / 1.6 / normal) for body paragraphs | tour pages, corporate, alentejo, evora, sintra routes | Scanning speed |
| H2 semibold + charcoal 100%, H3 medium + `--text-muted` | site-wide non-homepage | Clearer scan pyramid |
| Consolidate eyebrow tracking to canonical `.eyebrow` / `<Eyebrow>` | 4 rogue tracking values | One system |

## 6. Affected components / files

- `src/styles.css` — new tokens (`--text-muted`, `--text-subtle`, `--text-icon`, `--text-on-dark-muted`), `.editorial-body` utility, `prefers-contrast: more` block, prune unreferenced hero keyframes.
- `src/components/ui/CtaButton.tsx` — add `data-role="primary"` breathe hook (already partly there via `.cta-breathe`).
- `src/components/studio-v3/StudioV3.tsx` — replace hand-rolled Save button with `CtaButton`.
- `src/components/SignatureCarousel.tsx` — body italic weight; card CTA to hairline.
- `src/components/TourReviews.tsx`, `src/components/LandingTourCredibility.tsx` — swap muted tokens.
- `src/components/builder/AddStopSheet.tsx`, `BuilderImage.tsx`, `BuilderDebugPanel.tsx` — placeholder + icon opacity.
- `src/components/Footer.tsx` — dark-surface text tokens.
- `src/components/home/WhyYesPillars.tsx`, `home/ThreePathsSection.tsx` — numeric callout weight.
- `src/routes/tours.$tourId.tsx`, `alentejo-*`, `evora-*`, `sintra-*`, `arrabida-*`, `corporate.tsx`, `press.tsx` — H2/H3 weight, italic weight, `.editorial-body` adoption.
- `src/components/studio-v3/PhaseShell.tsx` — atmospheric easing token (or document exception).

## 7. Implementation complexity

| Group | Complexity | Risk |
|---|---|---|
| New color/type tokens + `prefers-contrast` block | **Low** | none — additive |
| Save-Signature button swap | **Low** | none |
| Contrast sweep on ~44 charcoal/40/45/55 sites | **Medium** | low — token swap via targeted `sed`, per-file verification |
| Ban `font-light` on light surfaces (~6 files) | **Low** | none |
| Micro-type floor raise | **Medium** | medium — 475 hits, needs judgement per site to distinguish decorative from load-bearing |
| H2/H3 weight sweep | **Medium** | low |
| `.editorial-body` utility + adoption on secondary routes | **Medium** | low |
| Eyebrow tracking consolidation | **Low** | low |
| Primary/ghost weight-delta rule | **Low** | low |
| Hero keyframe prune | **Low** | low — audit references first |
| PhaseShell easing token (or exception) | **Low** | none |

## 8. Implementation order (max conversion impact first)

**Wave A — Contrast & readability (highest a11y + conversion lift, lowest risk):**
1. Add `--text-muted / --text-subtle / --text-icon / --text-on-dark-muted` tokens + `prefers-contrast: more` block.
2. Sweep `charcoal/40 → --text-icon`, `charcoal/45 → --text-subtle`, `charcoal/55 → --text-muted` where size ≤13px.
3. Sweep `ivory/40–/55` → `--text-on-dark-muted`.
4. Ban `font-light` on light surfaces (6 sites).

**Wave B — Type floor & body rhythm:**
5. `.editorial-body` utility + adoption on tour/corporate/regional routes.
6. Raise load-bearing sub-12px text to 12px (start with tour pages — highest conversion routes).
7. H2 semibold + primary color, H3 medium + muted.

**Wave C — CTA hierarchy:**
8. Save-Signature → `CtaButton` swap.
9. Primary vs ghost weight-delta rule (ghost → hairline when adjacent to primary).
10. Trust strips → `--text-subtle`.

**Wave D — Consolidation & cleanup:**
11. Eyebrow tracking consolidation via `<Eyebrow>` primitive.
12. Hero keyframe prune + PhaseShell easing token.

Wave A alone lifts perceived quality and passes WCAG AA on the 44 offending surfaces. Waves A+B combined are the largest scanning-speed improvement. Wave C sharpens the "next action" cue — that's the direct conversion move. Wave D is polish.

---

Reply with the wave(s) you want (e.g. "Wave A", "Wave A+B", or "all") and I'll execute.
