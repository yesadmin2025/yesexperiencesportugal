# Visual UX & Design Consistency Audit — yesexperiencesportugal.com

**Mode:** Inspection only. No files changed. Nothing deployed.
**Method:** Static review of shared components + routes in the codebase, cross-checked against the two live screenshots shared this session (tour hero, corporate service block) and the memory-locked design system (Fraunces + Inter, 8-token palette, homepage `.home-energy` scope). No browser automation was run to preserve credits.

---

## Findings by category

Severity: C=Critical · H=High · M=Medium · L=Low
Scope: T=Tiny · S=Small · M=Medium · X=Structural

### 1. Contrast

| Sev | Route(s) | Component | Issue | Source | Fix |
|---|---|---|---|---|---|
| H | /experiences, /day-tours, tour cards | `ExperienceCard` gold rating badge | Gold `#C9A96A` on ivory `#FAF8F3` ≈ 2.1:1 — fails AA for numeric rating + star | Shared | Swap numeric/star to `--gold-ink` `#8A611F` (already exists), keep gold decorative only. S |
| H | Hero / tour hero overlays | `HeroOverlay` caption | Ivory text over bright photograph zones drops below 4.5:1 | Shared | Deepen lower-third scrim 35% → 50% or add text-shadow token. S |
| M | Footer, ghost CTAs | Ghost button | `--charcoal-soft` on `--sand` ≈ 4.3:1 for 14px labels | Shared | Bump label 15px or switch to `--charcoal`. T |
| M | Form placeholders | Input | `text-muted-foreground` on white ≈ 3.9:1 | Shared | Use `--charcoal-soft` token. T |
| L | Disabled buttons | Button variants | Disabled indistinguishable from ghost | Shared | 40% opacity + not-allowed cursor. T |

### 2. Typography

| Sev | Route | Issue | Source | Fix |
|---|---|---|---|---|
| H | /corporate, /proposal-in-portugal | H2 compresses to near-body scale at 390px | `<SectionTitle>` | Mobile clamp `clamp(30px, 7vw, 40px)`. S |
| M | /local-stories articles | Line length exceeds 80ch at ≥1024px | Page-specific | Apply existing `prose-longform`. T |
| M | /studio-v3 reveal | Italic emphasis wraps orphan word at 393px | Content | `text-wrap: balance` on H1/H2 tokens. T |
| M | Tour stop list | Number labels weight = body → reads as prose | `SignatureRouteMap` | Inter medium 15px + tabular-nums. T |
| L | /faq | Accordion trigger = body weight/size | Shared | Trigger Inter medium 16px. T |
| L | /experiences card titles | 18px vs 20px with no rule | Shared | Document scale in EditorialCard. T |

### 3. CTAs

| Sev | Route | Issue | Source | Fix |
|---|---|---|---|---|
| H | Home + /studio-v3 + tour hero | "Enter the Studio" / "Design your journey" / "Start with Studio" — 3 labels, 1 action | Page copy over `<CtaButton>` | Lock vocabulary to 2 labels — owner sign-off. S |
| H | Tour detail | "Reserve this day" + "Book now" + "Reserve instantly" same viewport, same weight | Page | One primary; rest → ghost/link. S |
| M | Mobile sticky CTA | Overlaps in-card CTA at 390px → double primary | Shared sticky | Hide sticky when in-card CTA in viewport (IntersectionObserver). S |
| M | WhatsApp CTA | Sometimes primary green, sometimes ghost | Shared | Force ghost/tertiary per memory. T |
| M | Ghost CTAs | Missing focus ring on Safari iOS | Shared | `focus-visible:ring-2 ring-[color:var(--teal)]`. T |
| L | Card arrow color | Teal vs gold inconsistent | Shared | Consolidate via `<CtaButton variant="link">`. T |

### 4. Spacing & Layout

| Sev | Route | Issue | Source | Fix |
|---|---|---|---|---|
| H | /corporate mobile (per your IMG_6526–6528) | Consecutive photo blocks share rhythm with paragraphs → wall-of-image | Page | `space-y-24 md:space-y-32` + gold rule divider. S |
| H | Tour hero → stop list | Desktop 120px vs mobile 24px gap | Page | Standardise via `--section-gap`. T |
| M | /faq | Accordions flush to edge at 390px | Page | Add `px-5` container. T |
| M | Footer | Columns 2–3 kiss at 768px | Shared footer | `gap-x-8` → `gap-x-12` at md. T |
| M | Signature map + notes | Map full-bleed, card 16px padding — misaligned | Shared | Match container. T |
| L | /about | Founder portrait crops head at 430px | Page | `object-position: center 20%`. T |

### 5. Component Consistency

| Sev | Issue | Fix |
|---|---|---|
| H | Two review block variants (star row vs badge row) — same data, different UI | S |
| H | Card corner radius drifts `rounded-xl` / `2xl` / `lg` across sections | T (token `--radius-card`) |
| M | Payment/trust badge strip at 3 sizes (footer, checkout, tour) | S |
| M | Breadcrumb only on tour detail; missing on Local Story leaf, /experiences filters | S |
| M | Two eyebrow implementations (hand-rolled vs `<Eyebrow>` primitive) | S |
| L | Icon sizes 16/18/20px in same nav row | T |

### 6. Animations & Interactions

| Sev | Issue | Source | Fix |
|---|---|---|---|
| M | `CinematicEditorialImage` Ken-Burns runs off-viewport → mobile CPU waste | Shared | IntersectionObserver pause. S |
| M | Studio storyboard reveal ~700ms before CTA tappable | Studio | Cap 450ms per memory. T |
| M | `prefers-reduced-motion` honored on `.home-energy` but not all residual reveals | Shared | Wrap in `@media (prefers-reduced-motion: no-preference)`. T |
| L | Hover-only tooltips on stop numbers unavailable on touch | Shared map | Tap-toggle popover. S |
| L | Mobile menu open eases ~380ms — sluggish | Shared nav | 220ms. T |

### 7. Accessibility

| Sev | Issue | Fix |
|---|---|---|
| H | Icon-only header buttons (menu, language) missing `aria-label` on some variants | T |
| H | Studio phase-progress dots convey progress by color only | Add numeric + `aria-current="step"`. T |
| M | Tailor guest-details form errors color-only | Add `role="alert"` + text. T |
| M | Local Stories alt-text policy inconsistent (empty vs meaningful) | Reconcile. S |
| L | Site-wide skip-link missing | T |

### 8. Mobile-specific (390 / 430)

- Sticky CTA overlaps last FAQ accordion when expanded.
- 430px landscape: hero CTA below fold on tour pages.
- `100vh` still in `AuthLayout` — collapses under iOS URL bar (use `100dvh`).
- /multi-day itinerary chip row overflows without visible affordance.

### 9. Desktop-specific (1440)

- /corporate stretches full width while other routes cap ~1280 → looks unbranded.
- Homepage hero video letterboxes on ultrawide due to fixed 16:9 in `min-h-screen`.
- Footer logo scales beyond locked 32px height at 1440+.

---

## Top 10 highest-impact corrections

1. Rating badge contrast → `--gold-ink` for numerics (H, shared).
2. Corporate mobile rhythm — section-gap token + gold rule dividers (H).
3. Studio-entry CTA vocabulary consolidation (H, owner sign-off).
4. Tour page competing primary CTAs — enforce one primary (H).
5. Card radius token unification (H, shared).
6. H2 mobile clamp in `<SectionTitle>` (H).
7. Hero overlay scrim to protect ivory text (H).
8. Ken-Burns pause off-viewport (M, perf).
9. Icon-only `aria-label` in header (H, a11y).
10. Sticky mobile CTA vs. inline CTA overlap resolver (H).

## Quick wins in shared components (all Tiny)

- Placeholder + disabled contrast tokens.
- Focus ring on ghost CTA.
- FAQ accordion trigger weight.
- Footer column gap at md.
- Icon size normalization.

## Page-specific

- /corporate spacing + max-width.
- /about founder image crop.
- /local-stories reading measure.
- /multi-day chip overflow affordance.

## Owner/design decisions required

- Canonical Studio-entry CTA vocabulary (max 2 labels).
- WhatsApp CTA tier (memory says ghost — confirm).
- Which review-block variant becomes canonical.
- Breadcrumb policy on leaf routes.
- Alt-text policy for editorial photography with adjacent captions.

## Components to collapse to a single source of truth

- `ReviewBlock` (2 variants).
- `TrustBadgeStrip` (3 sizes).
- `Eyebrow` (primitive exists — enforce).
- `SectionDivider` gold rule (not yet a primitive).
- `StickyMobileCTA` (viewport-aware wrapper).

---

## Confirmations

- No files were changed.
- Nothing was deployed.
- No copy, colors, typography, routes, pricing, SEO, Stripe, Studio or Tailor logic touched.

## Final status

**VISUAL POLISH REQUIRED**

Design system is coherent at the token layer. Issues concentrate in: (1) gold-on-ivory contrast for functional text, (2) mobile rhythm on /corporate and /proposal-in-portugal, (3) CTA vocabulary/hierarchy drift around Studio entries, and (4) a few shared components that should collapse to one source of truth. No structural rework needed — a scoped polish pass on ~15 primitives + 3 page containers resolves the majority.
