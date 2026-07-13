## Goal

Three related fixes across the Signature detail page and the Tailor flow so wine tours behave correctly on mobile and cards/CTAs never overflow.

---

## 1 · Tailor — up to 4 wineries, with clear "what gets skipped" feedback

Current state (already partially in place):
- Wine blueprint (`src/data/tailorBlueprints.ts` → `wineHeritage`) already exposes `choice.pickCount: 2, maxPick: 4` and a pool of 5 wineries.
- Feasibility engine (`src/lib/feasibility.ts`) already caps wineries at 4 and evaluates dwell + drive time against a 10h envelope with a 90 min winery dwell.
- Tailor UI (`src/routes/tours.$tourId.tailor.tsx`) refuses a 3rd/4th winery via a toast when the day overflows, but the toast is generic — it doesn't tell the user **which** core stop to skip to make room.

Changes:
- In `tryToggleChoice`, when the addition is a `winery` and would push the day over the envelope, auto-compute the smallest skippable core stop (market → viewpoint → tile factory, lunch last) whose removal would make the plan feasible, and surface a targeted message: *"Skip the market to add a 3rd winery"* with an inline "Skip it" action that flips `skippedCore` and adds the winery in one step.
- Show a persistent hint under the winery pool: *"2 wineries fit as-is · 3rd needs 1 skip · 4th needs 2 skips"* driven by `projectFeasibility`, not a hardcoded string. Recompute per selection so it always mirrors the true engine.
- Mark **lunch** (`lunch-azeitao`) as `skippable: true` — the user confirmed lunch is skippable (and it's only included on this Signature; everything else becomes an add-on). Add copy under the toggle: *"Included on this Signature. Skip to add a 4th winery."*
- Do NOT change the 4-winery hard cap, the 90-minute dwell, or the boat/monument rules.

---

## 2 · Lunch inclusion model + add-on catalog for wine tour

- Set `lunch-azeitao.skippable = true` in `wineHeritage`.
- Add a short "What's included" note on the Tailor summary strip for this Signature: *"Lunch in Azeitão included. Cristo Rei, Sesimbra Castle available as optional add-ons."*
- No changes to pricing logic — skipping lunch does not credit money back (already the current model). Optional stops stay as `optional[]` and continue to feed the server-side quote through the existing `summaryStops` path fixed last turn.

---

## 3 · Mobile-safe container & CTA sizing (site-wide)

Root cause of overflow: several CTA rows and card headers still use `flex flex-wrap` with wide fixed-min children (icons + long labels) that push containers past the 393px viewport.

Changes:
- In `src/styles.css`, tighten `.container-x` on ≤400px viewports: `padding-inline: 16px` (currently ~24px) and ensure `max-width: 100vw` + `overflow-x: clip` on the section wrapper it's used in, so no descendant can widen the page.
- Add a shared utility `.cta-stack` = `grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center` and apply it to CTA rows on `experiences.tsx`, `pt.experiences.tsx`, `tours.$tourId.tsx`, `tours.$tourId.tailor.tsx` sticky footer, and the Signature card block. Buttons inside get `w-full sm:w-auto min-w-0` and labels `truncate`.
- Audit header rows that combine an icon/avatar + heading + trailing widget (per the responsive-layout rule) and convert to `grid-cols-[minmax(0,1fr)_auto]` on mobile.

---

## 4 · Signature detail page — mobile alignment parity with desktop

`src/routes/tours.$tourId.tsx` hero already uses `TourImage ratio="16/9" ratioMd="3/2"`, but on 393px the section still feels off because:
- Top padding is `pt-24` (breadcrumb) then `pt-2` on the hero — no consistent rhythm; desktop reads better because the wider viewport hides the gap.
- H1 uses `text-[2rem]` mobile which combined with `max-w-3xl` (no effect at 393px) sits flush-left while the eyebrow above has different left inset.
- The meta strip below the H1 wraps into 3 lines and pushes the CTA out of the fold.

Changes (frontend only):
- Match desktop hero rhythm on mobile: change hero section wrapper to `pt-3 sm:pt-4 pb-6 sm:pb-8`, breadcrumb section to `pt-20 pb-2`.
- Bring H1 mobile to `text-[1.75rem] leading-[1.1]`, tighten `mt-3 → mt-2.5`, blurb `mt-3 text-[14.5px]`.
- Convert the meta strip to `grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-2` so region/duration/rating pair up on mobile instead of stacking to 3 rows.
- Apply the new `.cta-stack` to the primary "Tailor" / "Book" CTA row so both fit the viewport.
- Verify with Playwright at 393×588 and 360×640 that hero, H1, meta and first CTA are all visible above the fold and nothing horizontally scrolls.

---

## Files touched

- `src/data/tailorBlueprints.ts` — lunch skippable, footnote copy.
- `src/routes/tours.$tourId.tailor.tsx` — smart winery-add feedback + inline "skip it" action, live 2/3/4 hint.
- `src/routes/tours.$tourId.tsx` — mobile hero rhythm, H1 sizing, meta grid, CTA stack.
- `src/routes/experiences.tsx`, `src/routes/pt.experiences.tsx` — apply `.cta-stack` to signature cards.
- `src/styles.css` — `.container-x` mobile padding, `.cta-stack` utility, `overflow-x: clip` guard.

## Validation

- New Vitest for `projectFeasibility` proving: 2 wineries feasible; 3 wineries requires exactly one core skip suggestion; 4 wineries requires two; lunch skippable is honored.
- Playwright script at 393×588: navigate to `/tours/arrabida-wine-allinclusive`, screenshot hero + H1 + CTA; then `/tours/arrabida-wine-allinclusive/tailor`, add wineries 3 and 4 and confirm the targeted skip toast + inline action; assert `document.documentElement.scrollWidth === clientWidth` (no horizontal overflow).
