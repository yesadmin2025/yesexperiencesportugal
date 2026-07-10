## Goal

Three tightly-scoped changes at the 393px mobile viewport:

1. **Final Reveal → editorial "letter from a book"** with a shared parchment illustration at the top.
2. **Adjustments (Refine) page → decluttered** — collapse per-stop button rows, merge duplicated add-on chips, single primary CTA.
3. **Playwright spec** at 393×588: smoke + copy lock + visual baselines for Final Reveal and Guest Details.

No changes to routing, pricing, curation logic, email/PDF flows, or Studio state machine.

---

## 1. Final Reveal — editorial letter treatment

File: `src/components/studio-v3/FinalRevealStory.tsx`

- Generate one shared parchment/letter illustration (warm ivory paper grain, faint gold rule, subtle wax-seal accent, no text baked in) via `imagegen--generate_image` at `src/assets/studio-v3/reveal-letter-parchment.jpg` (premium tier, 1200×800).
- New wrapper `<article class="reveal-letter">` around the existing hero + timeline:
  - Full-bleed parchment image top (aspect 5:3), 24px negative margin under the app top gutter.
  - Content below sits on a layered ivory card with a hairline gold border, generous 32px inner padding, one gold rule (`<span class="h-px w-16 bg-gold/70">`) separating hero from chapters.
  - Chapters (`<ol>`) restyled as book paragraphs: drop-cap on first chapter (Fraunces, 40px), no bullet dots, chapter numeral as small-caps roman-ish gold marker (`I.`, `II.`) instead of `01`.
  - Body copy tightened to `max-w-[52ch]`, `[text-wrap:pretty]`, `leading-[1.7]`.
- Keep existing eyebrow, title, meta strip, inclusions `<details>`, and the three CTAs — no logic changes.
- Reduced-motion safe: fade only, no transforms.

Result: the reveal reads like a page from a bound book, not an admin summary.

---

## 2. Adjustments (Refine) — declutter

Scope: the refinement UI shown inside the Reveal on mobile (rendered via `RefineAccordion` + inline stops editor inside `StudioV3.tsx`; `RefineStopCard.tsx` already exists but isn't wired in for the main path — we wire it in and prune duplicates).

Four fixes, in order:

**a. Repeating add/remove buttons on every stop → single card + one action menu**
- Wire `RefineStopCard` into `StudioV3.tsx`'s refine list (replace the inline `[#][title][icons…]` row).
- Collapse the 4-icon toolbar (Earlier / Later / Swap / Remove) into a single 44×44 "Edit" button that opens a small popover with the four actions. Disabled states preserved.
- Keeps a11y labels; removes the 4-button repetition that reads as clutter on 393px.

**b. Add-on chips / accordions duplicated → one "Enhance your day" section**
- Locate the two surfaces that currently render add-ons on the reveal (add-on chips row + accordion inside SignaturePriceCard flow) and consolidate into a single collapsed section `<details data-testid="studio-v3-enhance">` above inclusions.
- Chip-style toggles, one row, wraps to two — no repeated titles/prices in a second card.

**c. Too many CTAs at bottom → one primary + one text link**
- Keep primary "Make this my story in Portugal" as the only filled CTA.
- "Save my signature" demoted to a small underlined text link right-aligned above the primary.
- "Back to refine" stays as tertiary ← link.
- Removes visual competition; the eye lands on the continuation CTA.

**d. Overlapping text over map / price ribbon**
- Audit z-index + spacing between `RunningInvestmentRibbon`, `ComposerMap`, and stop cards at 393px.
- Ribbon becomes non-overlapping: give the map wrapper `pb-[64px]` when the ribbon is visible; ribbon uses `bg-ivory/95 backdrop-blur` so any residual overlap remains readable.
- Add `min-w-0` + `truncate` to stop titles inside map callouts (currently overflow at 393px).

No copy changes beyond removing duplicates. No pricing math touched.

---

## 3. Playwright spec — 393×588, Full coverage

New file: `e2e/studio-v3-reveal-and-guest-details-mobile.spec.ts`
Baseline dir: `e2e/__baselines__/studio-v3-reveal-mobile/`

Uses existing `playwright.local.config.ts` (Pixel 5 project already close to 393px; override viewport to exactly `{width: 393, height: 588}`).

Scenarios (single spec, three `test()` blocks):

1. **Smoke — walk to Final Reveal → Guest Details**
   - Reuse `e2e/studio-v3-walk-to-reveal.ts` helper to reach the reveal.
   - Assert: no horizontal scroll (`document.documentElement.scrollWidth <= 393`).
   - Assert: primary CTA `[data-testid=studio-v3-final-reveal-continue]` in viewport.
   - Click continue → land on Guest Details.
   - Assert: email input visible, no horizontal scroll, primary CTA in viewport.

2. **Copy lock**
   - No occurrence of `/to be confirmed|pending confirmation|tbc/i` on either screen.
   - Instant-confirmation reassurance line present on reveal.
   - Parchment image renders: `img[alt*="letter" i]` has non-zero natural size.
   - On email blur with a valid address, "Your Signature Story is on its way to your inbox" appears within 2s.

3. **Visual baselines**
   - `expect(page).toHaveScreenshot('reveal-393.png', { maxDiffPixelRatio: 0.02 })` after reveal settle (wait for `[data-testid=studio-v3-final-reveal-timeline]` + 400ms).
   - Same for Guest Details: `guest-details-393.png`.
   - Fonts + images awaited via `document.fonts.ready` and `img.decode()` on the parchment.
   - Baselines committed under `e2e/__baselines__/studio-v3-reveal-mobile/`.

Not wired into CI in this pass — runnable locally via `bunx playwright test --config=playwright.local.config.ts studio-v3-reveal-and-guest-details-mobile`. CI hookup can come in a follow-up so the first baseline doesn't fail on unrelated machines.

---

## Files touched

- **New:** `src/assets/studio-v3/reveal-letter-parchment.jpg` (generated), `e2e/studio-v3-reveal-and-guest-details-mobile.spec.ts`, `e2e/__baselines__/studio-v3-reveal-mobile/*.png`.
- **Edited:** `src/components/studio-v3/FinalRevealStory.tsx`, `src/components/studio-v3/StudioV3.tsx` (wire RefineStopCard, consolidate add-ons, collapse CTAs, ribbon spacing), `src/components/studio-v3/RefineStopCard.tsx` (collapse toolbar into single "Edit" popover), `src/components/studio-v3/ComposerMap.tsx` (min-w-0 / truncate on callouts).
- **Not touched:** curation, pricing, Stripe, email/PDF, Studio state machine, routing.

## Verification

- `bunx tsgo --noEmit`
- Playwright run of the new spec locally to generate baselines and confirm the three tests pass.
- Screenshot at 393×588 via Playwright to visually confirm the letter treatment and decluttered refine section before wrapping up.
