
# UX & Conversion Audit — YES Experiences

Scope: subtle refinements only. Preserve the editorial/cinematic palette, typography v3, and canonical primitives (`CtaButton`, `EditorialCard`, `Eyebrow`, `SectionTitle`). No visual redesign, no new components, no palette change.

---

## 1. Current weaknesses

### CTAs
- **Two competing "primary" affordances**: `hairline` variant (opacity 80→100 hover, thin gold rule) is used heavily on hero, EntryScreen, and cards. On mobile in daylight it reads as static text, not a button — poor click affordance despite the underlying `<button>`/`<Link>`.
- **Arrow micro-interaction is hover-only**. On touch there is no analogue — no `:active` press feedback, no idle magnetic pull. Users on mobile (the entire declared user base for this project) never see the gold arrow slide.
- **Focus ring uses `--charcoal` on primary** (line 73 CtaButton.tsx) which sits on `--teal` — visible but not brand-aligned; secondary/ghost variants ring on `--gold` in some places. Inconsistent.
- **Long transition duration** (500ms) on hover slide feels sluggish for tap feedback; should split: 180ms tap-press, 320ms hover slide.
- **`min-h-[46px]` on size `sm`** and `hairline` (no min-height) violate the 44×44 rule when `hairline` is the only affordance (EntryScreen "Start from a signature").
- **Signature cards / Five Ways / EditorialCard**: entire card is likely not click-wrapped in a single `<Link>` — CTA lives inside as a text link; users must aim at small target.

### Animations
- **Two entry systems co-exist**: `.reveal` / `.reveal-stagger` (transform + opacity, IntersectionObserver) AND `.section-enter` (opacity-only) AND ad-hoc inline `animation: studioV3RiseIn ...` in ChoiceGrid. Timing/easing drift.
- **Timing inconsistency**: 220ms (choice tiles), 300ms (defaults), 380–520ms (curtain), 500ms (CTA), 700ms (gold sweep), 1100–2400ms (Prologue). No shared scale.
- **Easing drift**: `ease-out`, `ease-in-out`, `cubic-bezier(0.23,1,0.32,1)` all present. Choose one editorial easing and one snap easing.
- **PrologueScene** auto-advances at 3200ms — long dwell with no visible skip hint. Feels like a template intro on slow mobile.
- **CurtainRise 1900ms hold** blocks the reveal; user cannot dismiss.
- **Stagger cadence** in ChoiceGrid (`60 + i * 45ms`) with 8 tiles = 420ms — acceptable, but each phase re-runs the stagger on every mount which feels heavy on back-navigation.

### Contrast & readability
- **Whisper subtitles** in ChoiceGrid use `color-mix(charcoal 62%, transparent)` on `--ivory` — borderline AA at 12px italic.
- **Hairline CTA at `opacity 80%`** on `--ivory` reduces contrast to ~4.1:1 for uppercase 11px — below AA for small text.
- **`--charcoal-soft` body text** (used broadly per memory) needs verification against `--ivory` and `--sand` surfaces; light-on-light memory note in the audit brief matches an observed risk.
- **Video/image overlays**: PrologueScene uses `from-black/55 via-black/25 to-black/65`. The mid-band 25% is where the italic whisper sits — risky under bright imagery. Should be min 40% at whisper baseline.
- **`text-[color:var(--charcoal)]/85`** on EntryScreen serif italic — 15% opacity drop on already-italic serif hurts scan speed.
- **Georgia italic at 12px** in choice whispers — sub-optimal x-height for the smallest label on mobile.

### Typography / hierarchy
- **Homepage H2 exception (font-medium/500)** is intentional per memory but combined with italic emphasis span it can appear lighter than surrounding body strong tags. Verify none dropped to font-light.
- **Choice tile label 14px semibold** vs whisper 12px italic — 2px delta is thin; scan-time hierarchy is muted.
- **Line-height on serif italic paragraphs** ranges 1.28–1.35 — tight on 393px viewport.
- **Multiple eyebrow sizes**: 10.5px (EntryScreen, CurtainRise) vs 11px (memory canonical) — pick one.

### Mobile
- **393×588 viewport** (current preview) — hero and Studio phases fit, but tap zones around hairline CTAs sit close together (EntryScreen has two hairline CTAs side-by-side).
- **No `:active` scale** on hairline variant → no tap confirmation.
- **Sticky/floating CTA presence** unknown; if absent on long routes (Signature, Builder), primary CTA falls below fold after scroll.

---

## 2. Recommended motion system (single source of truth)

Add to `src/styles.css` under a `@theme` extension (tokens only, no visual change until adopted):

```
--dur-tap:      140ms   /* press feedback */
--dur-quick:    200ms   /* hover state change, color, opacity */
--dur-base:     320ms   /* arrow slide, translateY reveal */
--dur-slow:     560ms   /* section entry, curtain */
--ease-out:     cubic-bezier(0.22, 1, 0.36, 1)   /* editorial standard */
--ease-inout:   cubic-bezier(0.65, 0, 0.35, 1)   /* symmetric transitions */
--ease-snap:    cubic-bezier(0.34, 1.2, 0.64, 1) /* tap release, muted */
--lift-hover:   -2px
--lift-press:   0
```

Behaviour patterns:
- Hover on filled CTA: 200ms color + 320ms arrow slide (translateX 8px), 200ms lift -2px.
- Tap: 140ms scale(0.985) + arrow slide 4px, release with `--ease-snap`.
- Section entry: opacity 0→1 + translateY 12px, 560ms, staggered 60ms per child, max 4 children staggered (rest fade together).
- Reduced motion: all durations 0ms, opacity-only.

---

## 3. Contrast adjustments (targeted, keep palette)

| Where | Current | Change |
|---|---|---|
| Hairline CTA idle | opacity 80% charcoal | opacity 100%, use `--charcoal` full; reserve 80% for `:hover` reversal is unnecessary — instead pair with a persistent 1px gold underline that thickens on hover |
| ChoiceGrid whisper | charcoal @ 62% | 72% (measured to hit 4.5:1 on `--ivory`) |
| EntryScreen serif italic body | charcoal @ 85% | 95% |
| PrologueScene overlay mid-band | black/25 | black/40 at 60% viewport height (text band) |
| Focus ring on primary CTA | `--charcoal` | `--gold` @ 2px + 2px ivory offset — consistent across variants |
| Body text on `--sand` surfaces | audit needed | ensure `--charcoal` full (no softs) for paragraph copy |

No hex changes, no palette shift.

---

## 4. Typography refinements

- Choice tile label: 14px → 15px semibold Montserrat; whisper stays 12px italic but lift to 12.5px on ≥640px.
- Serif italic paragraphs on mobile: line-height 1.28 → 1.38.
- Eyebrow: canonicalise to 11px / tracking 0.24em / font-semibold across EntryScreen, CurtainRise, Studio phases — align to `<Eyebrow>` primitive; migrate hand-rolled spans.
- Never render marketing paragraph copy under 15px on mobile.
- Enforce `font-weight ≥ 500` for any text on `--ivory`/`--sand`; no `font-light` on light surfaces (matches existing memory `homepage-emphasis`).

---

## 5. CTA behaviour patterns

- **Primary/ghost**: keep KineticArrow; add `:active` translateX(4px) + scale(0.985) at 140ms.
- **Hairline**: upgrade tap affordance — persistent thin gold underline (1px, 60% opacity), thickens to 100% + widens on hover/focus/active. Add `:active` opacity flash to 100% with 140ms.
- **Card CTAs (Signature / Five Ways / Editorial)**: wrap the whole card in a single `<Link>` (or `role="link"` with a full-bleed absolute anchor) so the entire tile is the tap target; keep the inline label + arrow as visual affordance. Preserve keyboard-only focus outline on the wrapper.
- **Loading state (Studio checkout, Builder submit)**: already spinner via `CtaButton`; add a `data-cta-loading` shimmer on the label (1px opacity pulse @ 1.2s) so long waits feel alive.
- **Tap feedback**: add `@media (hover: none)` block so hover styles apply on `:active` on touch — users see arrow slide on press.

---

## 6. Affected components / files

Low-risk (token/style-only):
- `src/styles.css` — add motion tokens; tighten reduced-motion; adjust `.section-enter`, `.reveal*` to shared tokens.
- `src/components/ui/CtaButton.tsx` — split hover/tap durations, focus-ring to gold, hairline underline, `@media (hover:none)` mirror.

Medium-risk (behavioural):
- `src/components/ui/EditorialCard.tsx` — full-card link wrap.
- `src/components/studio-v3/ChoiceGrid.tsx` — whisper contrast, label size, unified stagger.
- `src/components/studio-v2/scenes/PrologueScene.tsx` — dwell 3200→2200ms, overlay 25→40%, visible "tap to continue" hint at 1800ms.
- `src/components/studio-v3/CurtainRise.tsx` — hold 1500→1100ms, allow tap-dismiss.
- `src/components/builder/EntryScreen.tsx` — replace duplicate hairline pair with primary + hairline.

Higher-risk (touches multiple routes):
- Signature card / Five Ways card usage across `experiences.tsx`, `index.tsx`, tour routes — full-card link wrap.
- Any hand-rolled eyebrow spans → `<Eyebrow>` primitive migration.

---

## 7. Complexity

| Change | Complexity |
|---|---|
| Motion tokens in `styles.css` | Low |
| CtaButton tap/focus refinements | Low |
| Whisper + eyebrow contrast/size | Low |
| Prologue/Curtain timing + dismiss | Low |
| Hairline underline affordance | Low |
| EntryScreen dual-CTA fix | Low |
| Full-card link wrap (EditorialCard, Signature, Five Ways) | Medium |
| Unified reveal system (retire `.section-enter` OR `.reveal` duality) | Medium |
| Eyebrow primitive migration site-wide | Medium |
| Sticky mobile CTA on long routes (if adopted) | Medium |

No High-complexity items required to hit the goal.

---

## 8. Recommended sequence (max conversion impact first)

1. **CtaButton tap feedback + focus-ring unification + hairline underline** — every CTA on the site benefits immediately; touch users finally see press feedback. (Low)
2. **Hairline contrast fix (opacity 80→100 + persistent gold rule)** — biggest daylight-readability win on mobile. (Low)
3. **Full-card link wrap on Signature + Five Ways + EditorialCard** — measurable CTR lift, no visual change. (Medium)
4. **Motion tokens + retire duration drift** — locks the "premium calm" feel and simplifies every future change. (Low)
5. **Prologue / Curtain dwell trim + tap-dismiss** — reduces perceived friction to first Studio choice. (Low)
6. **ChoiceGrid whisper contrast + label 15px** — Studio scan speed, direct on conversion path. (Low)
7. **EntryScreen dual-CTA hierarchy fix** — Builder entry currently has no visual primary. (Low)
8. **Eyebrow primitive migration** — housekeeping, unlocks future consistency. (Medium)

---

## 9. Performance safety

- All changes are CSS-only or single-node JSX edits — zero JS bundle impact.
- Motion tokens reduce runtime style computation (shared CSS vars instead of inline `style={{ animation: ... }}`).
- Full-card link wraps are a DOM structure change, not a new dependency.
- Reduced-motion contract (`__tests__/animation-contract-regression.test.ts`) already enforced — will extend, not weaken.
- No new fonts, no new images, no new libs. LCP / CLS / INP unaffected or slightly improved (fewer nested transitions on tap).

---

Awaiting approval to implement — I will proceed in the sequence above and stop after each low-risk batch for you to review on mobile.
