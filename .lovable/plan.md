## Goal
Remove the visible "Photos / Fast / Crisp" image-quality toggle from the `/experiences` page in production. No other layout or visual change. Keep the locked brand palette untouched.

## What I found
- `src/routes/experiences.tsx` imports and renders `<ImageQualityToggle />` at lines 9 and 87–89.
- The same toggle is also rendered on `/day-tours` (`src/routes/day-tours.tsx` lines 7 and 69), but the user request is scoped to `/experiences` only.
- The toggle lives in `src/components/ImageQualityToggle.tsx` and is backed by `src/hooks/use-image-quality.ts`.

## Proposed change
1. In `src/routes/experiences.tsx`:
   - Remove `import { ImageQualityToggle } from "@/components/ImageQualityToggle";`
   - Remove the `<div className="flex justify-end mb-6"><ImageQualityToggle /></div>` block above the tour grid.
   - This removes the visible labels from the `/experiences` production page while leaving the underlying component and hook intact for other routes or dev use.

## Guardrails
- No layout changes beyond removing the toggle row.
- No palette, typography, or component styling changes.
- No effect on image loading logic or the `useImageQuality` hook itself; images continue to load at their existing quality.

## Note
The same toggle is still present on `/day-tours`. If you want it removed there too, I can add that as a one-line addition to this plan.