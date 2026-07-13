## Problem

On the `/experiences` (Signature Tours) listing page at 393px width, every card's title, meta row, blurb and second CTA are visibly clipped on the right side (see uploaded screenshots). The whole page has horizontal overflow.

## Root cause

Each card's CTA row uses:

```
<div className="mt-5 flex flex-col xs:flex-row gap-2.5">
  <CtaButton>Check availability & reserve</CtaButton>
  <CtaButton>Tailor this day</CtaButton>
</div>
```

`xs` is defined in `src/styles.css` as `--breakpoint-xs: 380px`. At 393px the row flips to `flex-row`, and the two full-label buttons (`CHECK AVAILABILITY & RESERVE` + `TAILOR THIS DAY`) don't fit side-by-side. They push the article — and therefore the whole grid/page — wider than the viewport, which is why the titles ("Arrábida Private Wine Tour from L…", "Southwest Vicentine Coast — Secre…"), the review row, the blurb and even the second CTA all appear cut off on the right edge. It's one overflow bug, not many.

The blank second card image in screenshot 2 is the normal `TourImage` blur-up placeholder while lazy-loading below the fold — not a separate bug.

## Fix

Keep the CTAs stacked on mobile and only go side-by-side once there is real room for both labels. Two small edits, EN + PT parity:

1. `src/routes/experiences.tsx` — change the CTA row on each card from  
   `flex flex-col xs:flex-row gap-2.5` → `flex flex-col sm:flex-row gap-2.5`.
2. `src/routes/pt.experiences.tsx` — same change on the mirrored card (currently `xs:flex-row` too).

That restores vertical stacking on phones (≤639px), which removes the horizontal overflow and re-aligns titles, star row, blurb, meta strip and both CTAs inside the viewport. Tablets (`sm:` = 640px+) and desktop keep the two-column CTA row unchanged.

No business logic, data, tokens, or Signature detail pages are touched — this is purely presentation.

## Verification

- Manual check at 393×852 on `/experiences` and `/pt/experiences`: no horizontal scroll, titles/reviews/blurb/meta/CTAs all fully visible inside each card.
- Spot check at 640px+ that the two CTAs still sit side-by-side as before.
- `tsgo` typecheck.
