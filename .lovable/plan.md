## Goal

&nbsp;

Premmium look 

Match what you did on your phone: cover personal info with plain color patches, show **all 23 pages** on the site as clickable, zoomable thumbnails, and **remove the "Open the full PDF" button** entirely.

## 1. Redaction script — simplified

Rewrite `scripts/clean-travel-file-sample.py` to stop reconstructing anything. For each area, just paint a solid rectangle in the surrounding background color (ivory on light pages, teal on dark pages). No inpainting, no OpenCV, no pasted gradient strips.

Areas covered on every page:

- YES logo (top of cover, top-left header on interior pages, wordmark on back page)
- Guest name (after "Designed for" on cover; anywhere else it appears)
- Email address (wherever it appears)
- Website URL (wherever it appears)
- Phone number if present

Same technique you used: sample the surrounding background color, drop a rectangle over the personal detail, leave everything else untouched (dates, itinerary, photos, layout — all preserved).

## 2. Regenerate all page previews

Rasterize the cleaned 23-page PDF to `public/travel-file-sample/page-01.jpg` … `page-23.jpg` at readable resolution. Delete `sample.pdf` from `public/` since it's no longer linked.

## 3. Inline gallery — all 23 pages

Update `src/components/home/RecentJourney.tsx` and `src/routes/multi-day.tsx`:

- Replace the 6-page flip-book with a scrollable/grid gallery of all 23 pages.
- Each page is a tappable thumbnail.
- Tap opens the existing full-screen lightbox at that page.
- Lightbox gets prev/next arrows + swipe to move through all 23.
- **Remove** the "Open the full 15-day PDF" / "Open Sample Travel File" buttons and their handlers.
- Remove `samplePdfUrl` / `samplePdf` constants.

## 4. Technical notes

- Script uses `pypdf` + `Pillow` only (no cv2). Coordinates measured against the original 23-page PDF, applied once per run against the untouched original — never re-stacked on prior output.
- Gallery keeps current editorial styling (ivory frame, gold rule, Fraunces eyebrow). Mobile: single column of full-width page cards. Desktop: 3-up grid.
- Lightbox reuses existing `PageLightbox`, extended with `index` state and keyboard/swipe navigation across all 23 pages.

No other pages, copy, or brand tokens change.