# Motion & Micro-interaction Polish — Plan

## Current state (what already exists)

Motion tokens (`src/styles.css`):
- `--ease-premium: cubic-bezier(0.22, 0.61, 0.36, 1)` (canonical)
- `--dur-tap 140` / `--dur-quick 200` / `--dur-base 320` / `--dur-slow 560`
- `--ease-snap` for muted tap release

CTA system (`src/components/ui/CtaButton.tsx`):
- primary / ghost / ghostDark / hairline with locked arrow-ramp
- hover `-translate-y-2px` + shadow, `active:scale-[0.985]`, kinetic arrow with gold glow
- loading (spinner + `aria-busy`), error (nudge keyframe), reduced-motion honored
- optional `ctaRimBreathe` / `ctaAttentionHalo` for high-intent moments

Reveal system: `.reveal` IntersectionObserver with dedicated tests, homepage-only `.home-energy` (parallax, sheen, sequenced reveal, all reduced-motion safe).

Hero: 9 named keyframes (`heroFade*`, `heroEnterFrom*`, `heroEnterRiseSoft`, `heroEnterLiftPrimary`, `heroEnterFadeOnly`, `heroEnterFadeWide`).

Verdict: the system is already premium and coherent. What follows is polish, not overhaul.

---

## 1. Current issues found

| # | Issue | Where | Severity |
|---|---|---|---|
| I1 | Two easing "sources of truth" quietly compete: `--ease-premium` (0.22, 0.61, 0.36, 1) is set as canonical, but many older rules still use bare `ease`, `ease-out`, or `cubic-bezier(0.16, 1, 0.3, 1)` inline. Movement feels almost-consistent — the 5% that isn't reads as "template stiffness". | `styles.css` (~15 offenders), a few components | Medium |
| I2 | Hero keyframe library is 9 variants deep. Most homepage scenes use 2–3. Extras add cognitive/maintenance load and small perf cost (unused rules still ship). | `styles.css:1726–1945` | Low |
| I3 | Hover lift is `-2px` on CTAs but `-3px` on some homepage cards; card hover shadow easing is `ease-out`, CTA is `--ease-premium`. Subtle desync when the eye moves button→card. | homepage cards (`EditorialCard`, `SignatureCarousel`) | Medium |
| I4 | Nav links have color hover (`hover:text-teal`, 300ms), no arrow / underline. Fine, but the CTA in the nav (`Design & Book`) uses full kinetic treatment — the jump from "silent link" to "kinetic button" is abrupt for a header row that should feel like one system. | `Navbar.tsx` | Low |
| I5 | Footer link hover is instant color swap only (`transition-colors 300ms`). No tap feedback on mobile — link fires with no acknowledgment before the route change. | `Footer.tsx`, other text-link surfaces | Low |
| I6 | Studio flow has spinners (loader states) but the transition between phases relies on component swap without a shared fade token. Feels harder than the rest of the site. | Studio v3 components | Medium |
| I7 | Tap feedback on mobile is missing on non-CTA tap targets: nav items, footer links, tour cards, popular-search chips. iOS/Android users get no press acknowledgment (only the CTA scales). | site-wide anchor + card surfaces | Medium |
| I8 | `.reveal` uses one entry preset (fade+translateY). Adjacent siblings reveal identically — no stagger, so a 4-card row feels like a curtain, not a sequence. Homepage `home-energy` has stagger; the rest of the site does not. | non-homepage sections | Low |
| I9 | Ghost-CTA border color is `--teal 55%` on ivory. On hover it fills to solid teal — the border-to-fill transition passes through a muddy mid-frame because border color and background are on different transitions. | `CtaButton.tsx` `ghost` variant | Low |
| I10 | `active:scale-[0.985]` is subtle — good — but the primary CTA also lifts `-2px` on hover; on mobile the "hover" state fires on tap (sticky :hover), then scale fires, then route change. Three motions in ~250ms feels busy. | CTA primary on touch | Medium |
| I11 | No visible focus-move animation for keyboard users beyond the ring — the ring appears, but the arrow doesn't slide on `:focus-visible`. Keyboard users get less feedback than mouse users. | `CtaButton.tsx` (arrow only slides on `group-hover`) | Low |

---

## 2. Micro-interaction improvements (subtle, on-brand)

### A. Text links (nav, footer, in-body)
- Add a **hairline underline** that fades in on hover/focus over `--dur-quick`, using `gold-soft` at 55% opacity. Not a marketing underline — a whisper of a rule. Applies uniformly to Navbar links, Footer links, in-body `<a>`.
- Add `active:opacity-70` (`--dur-tap`) so mobile users get press feedback.

### B. Cards (EditorialCard, Signature, Tour tiles)
- Standardize hover: `-2px` lift (match CTA), `--ease-premium`, `--dur-base`. Shadow travels on the same curve. Kills I3.
- Image inside card: `scale(1.02)` over `--dur-slow` on card hover (already close on some cards — make it uniform).
- On tap (`:active`), card scales `0.994` for `--dur-tap` — the same "material" gesture as the CTA.

### C. Arrows (CTA + card CTAs + "See more" chips)
- Arrow translate distance already varies (4–8px). Lock to `translateX(4px)` for card CTAs, `translateX(6px)` for primary CTAs, both over `--dur-base`. One rhythm.
- Trigger on `:focus-visible` in addition to `:hover` (fixes I11).

### D. Nav
- Add the hairline underline (§A) to nav links so the header row's `Design & Book` CTA no longer looks like a bolt-on.
- Active route: gold-soft underline (persistent) instead of only teal text color. Reinforces "you are here" without a heavier treatment.

### E. Mobile tap feedback (site-wide)
- Single utility (e.g. `.tap`) → `active:opacity-70 active:scale-[0.994] transition duration-[var(--dur-tap)]`. Apply to: nav items, footer links, popular-search chips, tour cards, FAQ toggles.

### F. CTA on touch (fixes I10)
- Suppress hover lift on touch devices via `@media (hover: none)`. Keep only `active:scale-[0.985]` + color swap. Removes the 3-motion cascade on mobile.

### G. Ghost CTA border→fill (fixes I9)
- Add `transition-property: background-color, color, border-color, transform, box-shadow` so all four ease in on the same curve. No more muddy mid-frame.

### H. Studio phase transitions
- Wrap phase swaps in a shared 240ms fade (`--dur-base`, `--ease-premium`), out→in. One token, whole flow.
- Loading state: replace any spinner-only moments with a subtle text-shimmer over the placeholder line — matches the editorial voice better than a spinner. Fall back to spinner under reduced-motion.

---

## 3. Animation system recommendations

Consolidate to one motion language. Everything already lives in tokens — the fix is enforcement, not new tokens.

| Concern | Token to use | Applies to |
|---|---|---|
| Hover color/opacity swap | `--dur-quick` + `--ease-premium` | links, chip fills |
| Tap press/release | `--dur-tap` + `--ease-snap` | any tappable element |
| Arrow slide, small translate, hover lift | `--dur-base` + `--ease-premium` | CTAs, cards, arrows |
| Section entry, curtain, phase swap | `--dur-slow` + `--ease-premium` | reveal, Studio phase |
| Image parallax / zoom-in | 1100ms + `--ease-premium` | hero, card images |

Additional rules:
- **Ban bare `ease` / `ease-out`** in new code. Sweep the 15 offenders in `styles.css` to `var(--ease-premium)`.
- **Retire unused hero keyframes**. Audit which of the 9 are actually referenced; delete the rest (I2). Zero visual change, smaller CSS.
- **Stagger for reveal**: opt-in `data-reveal-stagger="1"` on a parent → children get `animation-delay: calc(var(--i) * 80ms)`. Homepage keeps its bespoke sequencing; other sections get a lightweight equivalent.
- **Universal reduced-motion guarantee**: any new keyframe must ship with a `@media (prefers-reduced-motion: reduce)` collapse to opacity-only. There are already ~10 blocks — pattern is set, keep it.

---

## 4. Where each change is applied

| Change | Files |
|---|---|
| Hairline underline utility + adoption | `src/styles.css` (new `.link-hairline`), `Navbar.tsx`, `Footer.tsx`, in-body `<a>` sweep |
| Tap utility + adoption | `src/styles.css` (new `.tap`), `Navbar.tsx`, `Footer.tsx`, `EditorialCard`, `SignatureCarousel`, popular-search chips |
| Card hover normalization | `EditorialCard.tsx`, `SignatureCarousel.tsx`, tour tile components |
| Arrow slide distance lock + `:focus-visible` | `CtaButton.tsx` |
| Ghost CTA transition-property fix | `CtaButton.tsx` |
| Hover-lift suppression on touch | `CtaButton.tsx` (media query wrapper) |
| Easing sweep (bare `ease` → token) | `src/styles.css` (~15 rules) |
| Hero keyframe cleanup | `src/styles.css:1726–1945` + component references |
| Reveal stagger opt-in | `src/styles.css`, `.reveal` observer (no logic change, CSS custom prop only) |
| Studio phase fade token | Studio v3 phase wrapper |
| Shimmer loading state | Studio v3 loading surfaces |

---

## 5. Implementation complexity

| Change | Complexity | Risk |
|---|---|---|
| Hairline underline utility | XS | none |
| Tap utility | XS | none |
| CTA `:focus-visible` arrow slide | XS | none |
| Ghost CTA transition-property | XS | none |
| Hover-lift suppression on touch | XS | none |
| Card hover normalization | S | low — visual regression on 3–4 card variants; screenshot check |
| Easing sweep (bare `ease` → token) | S | low — pure token swap, motion timing shifts by ~20ms in a few places |
| Nav underline + active state | S | low |
| Reveal stagger opt-in | S | low — additive only |
| Studio phase fade | S | medium — needs to route through a shared wrapper; check for state loss on unmount |
| Hero keyframe cleanup | M | medium — need to prove no reference before deletion; requires ref audit |
| Shimmer loading in Studio | M | medium — needs skeleton geometry for each load surface |

Nothing here regresses Core Web Vitals: no new blocking JS, no additional layout shifts, all animations remain GPU-friendly (transform/opacity only), and every keyframe collapses under `prefers-reduced-motion`.

---

## 6. Recommended order (max impact first)

**Wave 1 — Coherence pass (highest perceived-quality lift, lowest risk):**
1. Easing sweep in `styles.css` (I1).
2. Hover-lift suppression on touch for CTA (I10).
3. Ghost CTA transition-property (I9).
4. Arrow slide on `:focus-visible` (I11).
5. Card hover normalization to match CTA rhythm (I3).

**Wave 2 — Micro-interaction adoption (biggest UX signal for mobile users):**
6. Tap utility + apply to nav, footer, cards, chips (I5, I7).
7. Hairline underline utility + apply to nav and footer links (I4, I5).
8. Nav active-state gold underline (I4).

**Wave 3 — Structural cleanup:**
9. Reveal stagger opt-in (I8).
10. Hero keyframe audit + prune (I2).

**Wave 4 — Studio polish:**
11. Studio phase fade token (I6).
12. Shimmer loading surfaces (I6).

Waves 1 + 2 together are ~1 focused session and deliver the majority of the felt improvement. Waves 3–4 are lower urgency and can wait.

---

Approve the whole plan, or name the waves you want (e.g. "Wave 1 + Wave 2 only") and I'll execute.
