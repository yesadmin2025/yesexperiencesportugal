## Goal

Give every Signature tour image the same premium frame — one consistent **3:2** aspect ratio, `object-cover`, and a subtle **blur-up placeholder** — without swapping any URLs yet. When you later drop real brand photos into `public/tours/<id>/` and populate `localGallery`, they inherit this exact frame with zero further work.

No brand colors change. No AI-generated imagery introduced. Copy untouched.

## Scope

1. **`/tours/$tourId` — hero + gallery**
   - Cover image goes from its current ratio to **3:2**, `object-cover`, blur-up on load.
   - Gallery grid tiles all rendered at **3:2** (currently mixed via `getTourGallery`), same blur-up.
2. **`/experiences` — Signature card grid**
   - Cards move from **4:5 → 3:2**. This is a deliberate site-wide proportion change; grid density stays the same (`sm:grid-cols-2 lg:grid-cols-3`), cards get shorter and wider. The Southwest Vicentine Coast card is included here (it's just one entry in this grid).
3. **Homepage Signature preview cards**
   - Same 3:2 + blur-up frame as `/experiences`, so the home preview and the collection page read as one system.

Out of scope: Studio, Builder, Local Stories, Moments, hero videos.

## Approach

**One shared component** — extend the existing `BuilderImage` primitive pattern into a lighter, tour-focused `<TourImage>` in `src/components/tours/TourImage.tsx`:

- Fixed aspect via `aspect-[3/2]` (Tailwind arbitrary ratio).
- `object-cover` + `object-center` on the `<img>`.
- Blur-up: sand-tone gradient placeholder + `filter: blur(6px) scale(1.02)` on the `<img>` until `onLoad` fires, then fades to sharp in ~220ms (matches the motion contract already used by `BuilderImage`).
- `loading="lazy"` + `decoding="async"` for gallery/card tiles; `priority` prop opts the hero into eager load + `fetchpriority="high"`.
- Accepts the same `{ src, srcSet, sizes }` shape returned by `useImportedTourImages().resolveImg` so the `/api/img` proxy + srcset pipeline keeps working — nothing about image *sourcing* changes.
- Works for both tacdn URLs today and future `public/tours/<id>/*.webp` uploads tomorrow.

**Wiring points** (three files edited, one file added):

1. `src/components/tours/TourImage.tsx` — new primitive.
2. `src/routes/tours.$tourId.tsx` — hero `<img>` → `<TourImage priority ratio="3/2">`; gallery map → `<TourImage>` per photo.
3. `src/routes/experiences.tsx` — card cover `<img>` → `<TourImage>`; container class `aspect-[4/5]` → `aspect-[3/2]`.
4. Homepage Signature preview card component (whichever file renders it in `src/components/home/...`) — same swap.

## What stays untouched

- All `media.tacdn.com` URLs, the `/api/img` proxy, `resolveImg` sizing logic, `signatureTours.ts`, `signatureToursViator.ts`, `tour-gallery.ts`.
- Brand tokens: `--teal #295B61`, `--teal-2 #2A7C82`, `--gold #C9A96A`, `--ivory #FAF8F3`, `--sand #F4EFE7`, `--charcoal #2E2E2E`.
- Typography, spacing, motion tokens.
- CTAs, copy, JSON-LD, canonicals, SEO.

## Follow-up (not this task)

When you upload real photos to `public/tours/<id>/` and populate each tour's `localGallery` in `signatureToursViator.ts` (per `public/tours/README.md`), they render through the same `<TourImage>` — no further code change needed. That's the point of doing the frame first.

## Verification

- Read the three edited routes back to confirm no leftover `aspect-[4/5]` on Signature cards and no raw `<img>` for tour media.
- `bun run build` — must exit 0.
- Playwright screenshot pass on `/experiences`, `/tours/arrabida-wine-allinclusive`, and homepage at 393×588 (mobile, current viewport) + 1280×1800 to confirm the 3:2 frame, blur-up transition, and that no image is stretched or letterboxed.
