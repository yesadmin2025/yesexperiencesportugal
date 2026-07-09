# Uniform 3:2 Card Image Crop

**Goal:** Every card image across the Signature grid (homepage + carousel), `/experiences`, and Local Stories renders inside the identical `aspect-[3/2]` frame with `object-fit: cover`, at all breakpoints. Brand tokens untouched.

## Current state (audit)

| Surface | File | Current frame |
|---|---|---|
| Homepage Signature grid | `src/routes/index.tsx:672` | `aspect-[4/5]` |
| Signature carousel cards | `src/components/SignatureCarousel.tsx:250` | `aspect-[4/5]` |
| `/experiences` cards | `src/routes/experiences.tsx` (via `TourImage`) | `3/2` ✅ already |
| Local Stories index cards | `src/routes/local-stories.tsx:158,169` | `aspect-[4/5]` |
| `TourImage` primitive default | `src/components/tours/TourImage.tsx` | `3/2` ✅ |

Only three surfaces are out of spec — all currently `4/5`.

## Changes

1. **`src/routes/index.tsx`** (Signature block, line ~672)  
   `aspect-[4/5]` → `aspect-[3/2]` on the card `<Link>` wrapper. Image already `object-cover` via inner `<img>`; keep focal-point styling.

2. **`src/components/SignatureCarousel.tsx`** (line ~250)  
   `aspect-[4/5]` → `aspect-[3/2]` on the `editorial-card` wrapper. Verify inner `<img>` uses `object-cover` (it does) and no fixed heights fight the ratio. Adjust any absolutely-positioned overlays (title/eyebrow) only if they visibly clip in the shorter frame — reposition, do not restyle colors.

3. **`src/routes/local-stories.tsx`** (lines ~158 and ~169 skeleton)  
   Both `aspect-[4/5]` → `aspect-[3/2]`. Keep shadow/hover treatment.

4. **Sweep guard:** `rg "aspect-\[4/5\]"` across `src/components` + `src/routes` after edits to confirm no remaining card-image `4/5` frames in the three target surfaces. Non-card usages (e.g. builder step illustrations, StudioLivePreview portrait, RecentJourney flipcard `3/4`) are out of scope and stay as-is.

## Out of scope / preserved

- Brand palette, gold rules, typography, motion timings — unchanged.
- Hero images (`16/9`), builder/studio scene illustrations, map previews, avatar/portrait frames — unchanged.
- No new components, no ratio prop churn (`TourImage` default already `3/2`).

## Verification

- Grep confirms zero `aspect-[4/5]` in the three target files after edits.
- Visual check on mobile (393px) and desktop of `/`, `/experiences`, `/local-stories` — every card image is the same landscape crop, no letterboxing, no distortion.
