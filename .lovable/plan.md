# Mobile polish audit — 393×850 (iPhone 14/15)

Method: real Playwright captures at 393px of `/`, `/experiences`, `/studio-v3`, `/portugal-travel-designer`, `/about`, `/corporate`, `/local-stories`, `/sintra-day-tour-from-lisbon`, `/press`, plus targeted source reads of the header/FAB/eyebrow primitives. Reveal-on-scroll blanks in mid/bottom captures are a test artefact (IntersectionObserver doesn't fire on programmatic scrollTo) — those are **not** reported as issues.

Priority key: **P0** = users see it now, hurts trust/conversion · **P1** = visible on most sessions, easy win · **P2** = polish.

---

## 0. Systemic (affects every page)

| # | Issue | Priority | Smallest fix | Files | Safe? |
|---|---|---|---|---|---|
| S1 | Floating WhatsApp FAB (48×48, bottom-4/right-4) overlaps last line of body copy on `/portugal-travel-designer`, `/sintra-day-tour-from-lisbon`, `/local-stories`, `/tours/$tourId` (visible in captures — text runs behind the teal disc). | **P0** | Add `pb-24 md:pb-0` (or `scroll-pb-24`) on the `<main>` wrapper inside `SiteLayout`, so every route reserves 96 px below the fold for the FAB. One-line change, zero layout risk elsewhere. | `src/components/SiteLayout.tsx` | Safe. |
| S2 | Missing routes: `/moments` and `/faq` return **404** (audit brief listed both). | **P1** | Confirm intent with product — either (a) create the two routes, or (b) remove any stale nav/footer links. No mobile-polish fix needed until (a/b) decided. | audit only | Safe (no code change in this audit). |
| S3 | Console: repeated React hydration warnings ("A tree hydrated but some attributes … didn't match") on every page in Playwright run. Not a visible layout bug, but noisy and can mask real issues. | **P2** | Out of scope of a *polish* audit — file a follow-up "hydration mismatch sweep". | (investigation) | N/A. |

---

## 1. Homepage `/`

| # | Issue | Priority | Smallest fix | Files | Safe? |
|---|---|---|---|---|---|
| H1 | Hero above the fold at 393×588 shows only the road image + `YES` logo + burger — no headline, eyebrow or CTA visible without scrolling. Real users on 5.4–6.1" phones lose the value prop at first paint. | **P1** | Reduce hero min-height on mobile only (e.g. `min-h-[86svh]` → `min-h-[78svh]` at `<sm`) and drop hero top padding by one step so the eyebrow/headline peek above the fold. Do **not** change desktop. | `src/routes/index.tsx` hero section | Safe — copy-scoped, no layout re-flow elsewhere. |
| H2 | FAB overlaps footer/last card on scroll (see S1). | P0 | See S1. | — | — |

Nothing else visible above-the-fold is broken on mobile.

---

## 2. Experiences `/experiences`

| # | Issue | Priority | Smallest fix | Files | Safe? |
|---|---|---|---|---|---|
| E1 | Nothing critical above the fold. Filter chips (`PHOTOS · FAST · CRISP`) are legible, cards render clean. | — | — | — | — |
| E2 | FAB overlap on last card (see S1). | P0 | See S1. | — | — |

---

## 3. Studio `/studio-v3`

| # | Issue | Priority | Smallest fix | Files | Safe? |
|---|---|---|---|---|---|
| ST1 | Hero uses ~40% top padding of empty space before the `— STUDIO` eyebrow (large blank at top of viewport on 393×850). | **P2** | Reduce the hero's top spacing on mobile (`pt-24` → `pt-14` at `<sm`), keep desktop. | `src/routes/studio-v3.tsx` (hero block) | Safe. |
| ST2 | `BEGIN →` CTA is a light pill on a dark image with only ~4:1 contrast at the arrow — legible but the arrow color could sit stronger. | P2 | No change; within brand rules. | — | Safe. |

---

## 4. Travel Designer `/portugal-travel-designer`

| # | Issue | Priority | Smallest fix | Files | Safe? |
|---|---|---|---|---|---|
| TD1 | Secondary CTA "SEE THE 10-DAY REFERENCE ROUTE" wraps to two lines with the gold arrow floating in the empty corner of line 2 — reads unbalanced. | **P1** | Shorten label to `SEE THE 10-DAY ROUTE` on mobile (or add `whitespace-nowrap text-[10.5px] sm:text-[11px]` so it fits one line). Copy-only change. | `src/routes/portugal-travel-designer.tsx` (hero CTA block) | Safe. |
| TD2 | Body copy under the CTAs runs behind the WhatsApp FAB ("guides, cars and trusted partners along the…" is clipped). | **P0** | Covered by S1. | — | — |

---

## 5. About `/about`

Clean. H1 balances (`meaningful Portugal.` wraps naturally), eyebrow contrast fine, no overlap above the fold. Only issue is the systemic FAB at bottom (S1). No page-specific fix.

---

## 6. Corporate `/corporate`

| # | Issue | Priority | Smallest fix | Files | Safe? |
|---|---|---|---|---|---|
| C1 | Eyebrow `TEAM BUILDING & CORPORATE RETREATS` wraps to two lines and the gold flank rules stay on the first line — the second line ("RETREATS") floats without its rule, breaking the eyebrow symmetry that's canonical elsewhere. | **P1** | Shorten to `TEAM BUILDING · RETREATS` (or `CORPORATE RETREATS`) so the eyebrow stays on one line at 393 px. Pure copy change on the `<Eyebrow>` node. | `src/routes/corporate.tsx` | Safe. |
| C2 | Region copy still reads "*Lisbon, Sintra, the Arrábida coast and the Alentejo*" — inconsistent with the nationwide messaging just shipped on Press/Footer. | **P1** | Swap that fragment for "*across Portugal — from Lisbon and Sintra to the Arrábida coast, the Alentejo, the Douro and beyond*". Line 93 of `corporate.tsx`. Content only, no layout impact. | `src/routes/corporate.tsx` L93 | Safe. |

---

## 7. Moments

Route does not exist (see S2). No polish work possible until route/link resolved.

---

## 8. Local Stories `/local-stories`

| # | Issue | Priority | Smallest fix | Files | Safe? |
|---|---|---|---|---|---|
| LS1 | Second article card ("Arrábida vs Sintra: Which Day Trip Is Right for You?") title sits directly behind the WhatsApp FAB near the fold. | **P0** | Covered by S1 (page-level `pb-24`). | — | — |
| LS2 | Article H2s are `text-3xl`-ish on 393 px and eat a lot of vertical space; the two-line title is 6 lines of type before the excerpt. | P2 | Step titles down one Tailwind size on `<sm` (`text-3xl` → `text-2xl sm:text-3xl`). | `src/routes/local-stories.tsx` card component | Safe. |

---

## 9. Individual tour pages (sampled `/sintra-day-tour-from-lisbon`, applies to all 7 landing routes)

| # | Issue | Priority | Smallest fix | Files | Safe? |
|---|---|---|---|---|---|
| T1 | Secondary CTA "SEE THE SINTRA & CASCAIS SIGNATURE" wraps to two lines with the arrow orphaned — same shape as TD1. | **P1** | Shorten mobile label ("SEE THE SIGNATURE" or "OPEN THE SIGNATURE") or add `text-[10.5px] sm:text-[11px]` so one line fits. Applies to the 7 tour landing routes that share the same hero pattern. | `src/routes/sintra-…`, `arrabida-…`, `alentejo-…`, `evora-…`, `private-wine-…`, `arrabida-wine-…`, `evora-alentejo-…` | Safe — copy-only. |
| T2 | Body copy in the "Why early" section runs behind the FAB. | **P0** | Covered by S1. | — | — |
| T3 | H1 is `text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl` on the dynamic `/tours/$tourId` route — 2rem (32px) is reasonable on 393px but the italic emphasis ("without the queues") can push to 4 lines on the longer titles ("Private Alentejo Wine Tour From Lisbon — a slow day"). | P2 | Shorten line-height only (`leading-[1.02]` → `leading-[1.08]`) on `<sm`, no size change. | `src/routes/tours.$tourId.tsx` L265 | Safe. |

---

## 10. FAQ

Route does not exist (see S2).

---

## 11. Press `/press`

| # | Issue | Priority | Smallest fix | Files | Safe? |
|---|---|---|---|---|---|
| P1 | Eyebrow `PRESS & BRAND KIT` renders very pale on ivory and its left gold flank rule is clipped at the container edge on 393 px. Contrast reads ~2.5:1 (below WCAG AA). | **P1** | Two-part: (a) confirm the shared `<Eyebrow>` primitive isn't rendering at reduced opacity on this route (no `tone="muted"` prop passed); (b) add `overflow-visible` or lose the left flank on `<sm`. Smallest fix: pass `flank={false}` on mobile via the existing primitive prop (no CSS edit). | `src/routes/press.tsx` (eyebrow node), possibly `src/components/ui/Eyebrow.tsx` | Safe — uses existing primitive knobs. |
| P2 | Partnership card CTA "BECOME A REFERRAL PARTNER →" wraps to a second line on 393 px and the arrow orphans. | **P2** | Shorten to `BECOME A PARTNER →` in `PARTNERSHIP_LANES[0].cta`. Copy-only. | `src/routes/press.tsx` | Safe. |
| P3 | The three partnership cards stack full-width with 20px internal padding — plenty of breathing room, no clipping. | — | — | — | — |

---

## 12. Footer

Footer not captured cleanly (test artefact). Source read shows single-column stack at `<md`, sensible spacing, no known overflow. No changes proposed in this audit; re-check after S1 lands and the FAB no longer sits over the final footer row.

---

## Summary — recommended execution order

1. **S1** (one-line SiteLayout padding) — unblocks 6 of the 10 page-specific findings.
2. **C2** + **C1** (Corporate copy + eyebrow) — 2 min, brand consistency win.
3. **TD1** + **T1** (CTA label shortening across designer + 7 tour pages) — 5 min, uses same fix pattern.
4. **P1** (Press eyebrow contrast/flank) — small primitive prop tweak.
5. **H1** + **ST1** (hero top-padding trims) — cosmetic.
6. **LS2** + **T3** (heading size/leading trims) — cosmetic.
7. **S2** (moments/faq routes) — needs product decision, not polish.

Every fix above is copy/spacing/prop-only — no new sections, no redesign, no dependency changes, no schema. All safe to ship independently.
