## Two independent fixes

### A · Signature page (mobile hero + alignment)

**Problem.** `TourImage` on the Signature page uses a fixed 3:2 aspect ratio at every breakpoint. On a 393 px viewport that renders as ~235 px tall, but combined with the ivory placeholder gradient and the section's own top padding, the hero visually dominates the screen and pushes the title, blurb and CTAs below the fold. Content below the hero uses `container-x` (20 px gutters); the hero uses the same container, so the horizontal alignment is already correct — the problem is purely vertical weight.

**Fix.**
- Add responsive ratio support to `src/components/tours/TourImage.tsx`: keep the single-string `ratio` prop, and accept a new `ratioMd` prop. Emit `aspect-[16/9] md:aspect-[3/2]` when `ratioMd` is set. Zero behavior change for existing call sites.
- On `src/routes/tours.$tourId.tsx` (Signature detail hero, ~line 271): set `ratio="16/9"` and `ratioMd="3/2"`. Mobile hero shrinks from ~235 px to ~199 px, freeing ~40 px of vertical space and lifting the title into the initial fold.
- Tighten the hero section rhythm on mobile: `<section className="pb-8">` → `<section className="pt-2 sm:pt-4 pb-8">` and the header spacer `mt-6 sm:mt-8` → `mt-5 sm:mt-8`. The eyebrow above the hero (`ALL SIGNATURE EXPERIENCES`) already gets `container-x py-6` — no change.
- Keep every alignment token intact — same `container-x`, same `max-w-6xl`, same body padding. This is a proportion fix, not a re-layout.

No other Signature routes touched.

### B · Tailor — up to 4 wineries on the wine tour (time-gated)

**Problem.** `src/lib/feasibility.ts` hard-caps wineries at 3. `wineHeritage` blueprint fixes `choice.pickCount: 2` on 5 winery options. Guests can never reach 4 wineries even after skipping the market + tile workshop.

**Rule (agreed with user).** Each winery = **90 min dwell** (already correct in `DWELL_MINIMUM_MIN.winery = 90`) + drive time between stops. A 4th winery is only allowed when enough core stops are removed to keep total experience minutes within `DAY_CAPS.maxExperienceMinutes` (480) and `envelopeMinutes` (600 with drives). This math is already enforced by `evaluateDay`; we just need to raise the hard winery cap and let the guest select a 4th.

**Changes:**

1. **`src/lib/feasibility.ts`** — raise the hard winery cap to 4. Keep the palate-fatigue warning as a soft nudge past 3:
   ```ts
   if (wineries.length > 4) {
     feasible = false;
     warnings.push(`Four wineries is the absolute maximum — palate fatigue past that point.`);
   } else if (wineries.length === 4) {
     warnings.push(`Four wineries is intense — plan a long lunch and light dinner.`);
   }
   ```
   The existing `maxExperienceMinutes: 480` naturally blocks 4 wineries (4×90 = 360 min) unless the guest also skips market/tile/viewpoint — exactly the trade-off the user described.

2. **`src/data/tailorBlueprints.ts`** — mark core stops on `wineHeritage` as skippable so guests can free time for the 4th winery. Add `skippable: true` to the `StopCategory`/`BlueprintStop` type if needed, and set it on:
   - `livramento` (market) → skippable
   - `arrabida-park` (viewpoint) → skippable
   - `azeitao-tiles` (workshop) → skippable
   - `lunch-azeitao` (lunch) → **not skippable** (Wine rule requires lunch when ≥2 wineries)

3. **`wineHeritage.choice.pickCount`** stays 2 (the pre-selected default), but the choice section must allow selecting up to **4**. Add an optional `maxPick: 4` to the blueprint choice type and to `tryToggleChoice`:
   ```ts
   const maxPick = blueprint.choice?.maxPick ?? blueprint.choice?.pickCount ?? Infinity;
   if (next.size > maxPick) {
     toast.error(`Up to ${maxPick} wineries — swap one instead of adding.`);
     return;
   }
   ```
   Wine tour blueprint: `choice.maxPick = 4`.

4. **UI copy** in `src/routes/tours.$tourId.tailor.tsx` winery choice panel (~lines 780-980): change the choice heading on this blueprint from "Choose 2 wineries" → "Choose 2–4 wineries" and add a subline: "A 3rd or 4th winery needs time from somewhere — skip the market or tile factory above."

5. **Feasibility toast** on the 4th-winery add: when `tryToggleChoice` refuses because `evaluateDay` says infeasible, prepend guidance: "That would make ~{Xh} on the ground. Skip the market or tile factory above to fit it."

Other tour blueprints (tiles, cheese, boat, etc.) are unchanged — their `pickCount: 1` and their non-wine core stay locked.

## Verification

- Add unit tests for `evaluateDay` covering: 4 wineries + lunch only = feasible; 4 wineries + lunch + market + tile = infeasible (over 480 min); 5 wineries = hard-fail.
- Manual mobile check at 393 × 852 on `/tours/arrabida-wine-allinclusive`: hero occupies ≤ 210 CSS px, title visible in the first fold.
- Manual on `/tours/arrabida-wine-allinclusive/tailor`: default 2 wineries selected; can add a 3rd (soft warning); adding a 4th requires unchecking market/tile — toast explains why until enough is skipped.
- Typecheck + existing Playwright suites (`checkout-full-flow`, `studio-v3-*`) unaffected.
