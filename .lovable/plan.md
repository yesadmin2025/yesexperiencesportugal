# Bring the site alive — image fixes + motion pass

Two things are broken:

1. **Duplicates & wrong images** — Corporate and Moments (`/proposal-in-portugal`) still share hero/card photos with the homepage and with each other, and Moments uses `sintra-cascais/estates.jpg` + `troia-comporta/beach.jpg` — neither reads as "proposal / celebration / family moment".
2. **Motion feels dead** — outside the homepage, most sections have no reveal, no hover zoom, no route-draw. Local Stories, Corporate, Moments, Proposals, About all feel static.

## 1. Image swaps — Corporate & Moments (Proposals)

Deterministic rule: **the homepage keeps first claim** on any shared photo. Every other page uses a different asset from the approved bank. No stock, no invention — only assets already in `src/assets/`.

### Corporate (`src/routes/corporate.tsx` + `src/routes/pt.corporate.tsx`)
Currently: card 1 = `quinta-group` (also on homepage), card 2 = `sintra-cascais/estates` (also on Moments + planning), card 3 = `arrabida-viewpoint-group` (also on planning). All three collide.

- Card 1 "Executive & Incentive" → `@/assets/tours/azeitao-cheese/…` team-table image (Corporate-exclusive, feels like a working group at a table).
- Card 2 "Off-sites & Retreats" → `@/assets/tours/evora-alentejo/…` (Alentejo landscape reads as retreat, not shared with Moments).
- Card 3 "Client Hosting & VIP" → keep `arrabida-viewpoint-group.jpg` (discreet group) — release it from planning instead (see §Planning below).
- `og:image` for both EN + PT corporate → the new card 3 photo (kept discreet framing).
- PT corporate currently uses `arrabida-wine-allinclusive/lunch.jpg` (shared with homepage) and `fatima-nazare-obidos/nazare.jpg` — realign to match the EN swap set for parity.

### Moments / Proposals (`src/routes/proposal-in-portugal.tsx`)
Currently: `exp-romantic` + `sintra-cascais/estates` + `troia-comporta/beach`. The last two are generic and shared elsewhere.

- Card 1 "Proposals" → keep `exp-romantic.jpg` (approved, thematic).
- Card 2 "Celebrations" → `@/assets/guests/chocolate-cake-tasting.jpg` (celebration moment, currently only used in planning — swap planning to a different guest photo).
- Card 3 "Family & Friends" → `@/assets/guests/vineyard-couple.jpg` released to Moments; homepage keeps first claim so we'll use `@/assets/tours/wild-beaches-picnic/…` instead (picnic reads as family/friends day).
- `og:image` → `exp-romantic.jpg` (unchanged; on-theme).

### Planning fallout (to keep the "first claim" rule honest)
- `plan.best-time-to-visit-portugal` → swap the freed `arrabida-viewpoint-group` slot to `tomar-coimbra` or `arrabida-boat` hero.
- `plan.portugal-wine-and-gastronomy` → swap the freed `chocolate-cake-tasting` slot to `edit-winery.jpg`.
- Update `.lovable/image-duplication-report.json` after the swap and re-run `scripts/scan-image-duplicates.mjs` to confirm Corporate + Moments no longer appear in the duplicate list.

Nothing on the homepage moves.

## 2. Site-wide motion pass ("feel alive, even in Local Stories")

Homepage motion stays scoped to `.home-energy` (memory rule). For the rest of the site, extend the **existing** editorial motion vocabulary — no new libraries, no parallax, no bounce — so every section breathes.

Coverage sweep across: `local-stories.index.tsx`, `local-stories.$slug.tsx`, `corporate.tsx` + `pt.corporate.tsx`, `proposal-in-portugal.tsx`, `about.tsx` + `pt.about.tsx`, `experiences.tsx`, `multi-day.tsx`, all `plan.*.tsx`, `travel-designer.tsx`.

For each page, verify and add where missing:

- **`.reveal` / `.reveal-stagger`** on every top-level `<section>` and every `<article>` inside grids (fade + 12–16px rise ≤220ms, IntersectionObserver already wired).
- **`.editorial-zoom`** utility on every editorial `<figure>`/image wrapper (scale 1.03, 700ms, reduced-motion safe). Currently only on `EditorialCard`, `RelatedExperiencesRail`, PlanningDestination hero, About founder. Extend to:
  - Local Stories index cards + article hero + inline figures
  - Corporate + PT Corporate block images (currently hand-rolled `hover:scale-[1.03]` — swap to `.editorial-zoom` for consistency)
  - Moments/Proposals block images
  - Experiences / Multi-day inline figures
  - Travel Designer figures
- **Gold-rule + eyebrow reveal cadence** — where a section has `Eyebrow → SectionTitle → gold-rule`, wrap in `.reveal-stagger` so the three land in sequence.
- **CTA micro-motion** — `CtaButton` already has hover ramp; audit that every page uses `<CtaButton>` (not raw `<a>`). Fix any strays in Local Stories and plan pages.
- **Long-form paragraphs** on Local Stories article body → apply `.reveal` per paragraph block so scrolling feels alive without becoming showy.

All additions respect `prefers-reduced-motion`.

## 3. Verification

- Re-run `node scripts/scan-image-duplicates.mjs` and confirm Corporate + Moments are no longer in the duplicate list; commit the new report.
- Add one Playwright assertion to `e2e/motion-perf.spec.ts` (or a small new spec) that visits `/local-stories`, `/corporate`, `/proposal-in-portugal` and asserts at least N `.reveal`/`.editorial-zoom` nodes are present (guards against future regression).
- `bunx tsgo --noEmit` must pass.

## Out of scope

- No homepage changes.
- No new photography, no stock, no AI-generated images.
- No new motion primitives beyond `.reveal`, `.reveal-stagger`, `.editorial-zoom`, `CtaButton` ramp, `EditorialMap` route-draw.
- No copy changes (only alt text where the image swaps).
