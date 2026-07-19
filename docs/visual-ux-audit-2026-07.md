# Visual UX & Design Consistency Audit — 2026-07-19

**Scope:** Live production site `https://yesexperiencesportugal.com`.
**Mode:** Read-only. No files edited. Nothing deployed.
**Method:** Shared-component source review + prior audit deltas + spot-check of representative routes at 390 / 768 / 1440 CSS px. One screenshot reused per shared component. `prefers-reduced-motion` pass confirmed on `/` and `/experiences`.

Findings that the current codebase already fixes vs. the live deployment are marked **[fixed in repo, pending deploy]**.

---

## 1 · Findings table

| # | Severity | Route | VP | Component | Issue | Likely source | Recommendation | Scope |
|---|---|---|---|---|---|---|---|---|
| 1 | High | all | all | `AmbientLandscapeReveal` / `CinematicEditorialImage` | Ken-Burns keeps animating when off-screen on lower-tier mobiles | shared | `IntersectionObserver` gate (as already applied to `GuestMomentsStrip`) | Small |
| 2 | High | `/tours/*` | 390 | Sticky "Reserve" bar | Overlaps `WhatsAppFab` on iOS home indicator | shared | Add `safe-area-inset-bottom` and `pb-[env(safe-area-inset-bottom)]` | Tiny |
| 3 | High | `/experiences`, `/day-tours` | 390 | Rating badge (gold star + number) | ~2.1:1 contrast before fix; **[fixed in repo, pending deploy]** via `--gold-ink` | shared | Deploy | — |
| 4 | High | `/tours/*/tailor` | 390 | Price row "€…/Adult" | Ambiguous between per-person and party total | page | **[fixed in repo, pending deploy]** — split "per person" vs "party total" | — |
| 5 | Med | `/local-stories/*` | 1024 | Article body | Line length > 90ch on wide viewports | page | `prose-longform` (68ch) — **[fixed in repo]** | — |
| 6 | Med | `/studio-v3` | 390 | Progress dots | Color-only progress state | shared | Add numeral + `aria-current="step"` | Small |
| 7 | Med | `/corporate`, `/proposal-in-portugal` | 768 | Editorial image strip | Slight vertical rhythm drift between service blocks | page | Normalize to `py-24 md:py-32` | Tiny |
| 8 | Med | `/`, `/multi-day` | 390 | Hero H1 | Orphan word wrap on 390 | shared `SectionTitle` | `text-balance` on H1 (already used on H2) | Tiny |
| 9 | Med | `/tours/*` | 390 | Primary CTAs | Competing "Reserve" + "Tailor" of equal weight | page | **[fixed in repo]** — Tailor demoted to gold text link | — |
| 10 | Med | `/faq` | 768 | Accordion | Chevron rotates without transition; hit area 32px | shared | `min-h-11`, add 150ms rotate | Tiny |
| 11 | Med | `/contact` | 390 | Form labels | Placeholder-as-label pattern in two fields | page | Persistent floating label | Small |
| 12 | Med | site | all | Focus ring | Not visible on `--gold` outline buttons on ivory | shared button | Use `outline-offset-2 outline-[color:var(--teal)]` | Tiny |
| 13 | Low | `/about` | 1440 | Body copy | Paragraphs > 78ch | page | Apply `prose-longform` | Tiny |
| 14 | Low | `/experiences` | 768 | Card grid gap | Inconsistent 20/24px between rows | page | Standardize `gap-6` | Tiny |
| 15 | Low | Footer | 390 | Payment badges | Slightly desaturated vs header lockup | shared | Match rendered opacity | Tiny |
| 16 | Low | site | all | Image alt text | Some decorative images have descriptive alt | shared | `alt=""` on decorative | Small |
| 17 | Low | `/studio-v3` | 390 | Modal close btn | Icon-only, verified `aria-label` present | shared | none | — |
| 18 | Low | `/tours/*` | 390 | Review sort dropdown | Focus outline clipped by `overflow-hidden` parent | shared `TourReviews` | Remove `overflow-hidden` on wrapper | Tiny |

Reduced motion: respected everywhere (all Ken-Burns and reveal utilities gate on `prefers-reduced-motion: reduce`).

---

## 2 · Grouped summaries

**Contrast** — one systemic High (rating badge) already fixed in repo; residual: focus ring visibility on gold outline buttons (#12).
**Typography** — H1 orphan wrap on 390 (#8); reading measure on wide desktop (#5, #13).
**CTAs** — primary/secondary conflict fixed in repo (#9); safe-area overlap remains (#2).
**Spacing & layout** — corporate/proposal cadence drift (#7); card gap inconsistency (#14).
**Component consistency** — Reserve bar and review sort share source-of-truth issues but different symptoms (#2, #18).
**Animations & interactions** — Ken-Burns viewport gating still needed on the two ambient reveal components (#1); accordion transition polish (#10).
**Accessibility** — focus rings (#12), decorative alt cleanup (#16), color-only step state (#6).
**Mobile-specific** — #1, #2, #3, #8, #10, #11, #17.
**Desktop-specific** — #5, #7, #13, #14.

---

## 3 · Top-10 highest-impact corrections

1. Deploy repo fixes (#3, #4, #5, #9) — mostly polish and truth wins.
2. Viewport-gate remaining ambient reveals (#1).
3. Safe-area padding on sticky Reserve bar (#2).
4. Focus-visible ring on gold outline buttons (#12).
5. `text-balance` on H1 (#8).
6. Numeric label on Studio step dots (#6).
7. Normalize corporate/proposal vertical rhythm (#7).
8. Review-sort dropdown focus clipping (#18).
9. Accordion tap target + rotate transition (#10).
10. Floating labels on `/contact` form (#11).

## 4 · Quick wins on shared components

- `SectionTitle` — add `text-balance` at H1 default.
- `CtaButton` (outline variant) — add `focus-visible` ring.
- `AmbientLandscapeReveal`, `CinematicEditorialImage` — `IntersectionObserver` pause.
- Sticky mobile Reserve wrapper — `env(safe-area-inset-bottom)`.
- `TourReviews` sort wrapper — drop `overflow-hidden`.

## 5 · Page-specific issues

- `/contact` — floating labels (#11).
- `/corporate`, `/proposal-in-portugal` — section rhythm (#7).
- `/experiences` — card gap consistency (#14).
- `/about`, `/local-stories/*` — reading measure (#5, #13).

## 6 · Items requiring owner/design decision

- Whether Studio step dots keep pure-color state (fastest) or gain numerals/labels (best accessibility).
- Whether the sticky Reserve bar coexists with `WhatsAppFab` or one hides when the other is visible.
- Whether "Book now" and "Reserve this day" should collapse into a single label site-wide.

## 7 · Components that should become a single source of truth

- Sticky mobile Reserve bar (currently inlined per tour route).
- Payment/trust badge row (footer + checkout drawer render similar but not identical variants).
- Ambient landscape reveal — one primitive, two thin skins today.

## 8 · Confirmations

- No files were changed by this audit.
- Nothing was deployed by this audit.

---

## Final status

**VISUAL POLISH REQUIRED**

No systemic UX inconsistencies. The remaining items are targeted, mostly shared-component polish, and several are already addressed in the current repo awaiting deploy.
