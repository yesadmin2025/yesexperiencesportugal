## Plan — swap uploaded PDF in as new base, then fix it

### 1 · Adopt upload as the new source

- Copy `user-uploads://Jennifer_Oliver_Travel_File_FINAL_PREMIUM-2.pdf` → `public/travel-file-sample/sample.pdf` (overwrite).
- Keep filename `sample.pdf` — every consumer (`/multi-day`, homepage `RecentJourney`, existing `.asset.json`) already points at that path/URL name.

### 2 · Re-apply the text patch to pages 2–23

- Run the same `pikepdf` script as before against the new file:
  - `yesexperiences.pt` → `yesexperiencesportugal.com`
  - `info@yesexperiences.pt` → `info@yesexperiencesportugal.com`
- Verify with `pdftotext | grep -Fc` → 0 hits old, 24 hits new domain, 23 hits new email.
- Pages 2–23 only; page 1 is a raster image and has no text objects to patch.

### 3 · Pixel-edit the cover (page 1)

The cover is a single embedded JPEG (1054×1492, high-res this time). Edit in Pillow, re-embed with `pikepdf`:

1. Extract cover JPEG with `pdfimages -j`.
2. **Footer strip** — sample the ivory background under the old footer line, paint a clean rectangle over `yesexperiences.pt · info@yesexperiences.pt · +351 911 889 992`, redraw the same three-item footer with gold `·` separators using the new domain/email in the same serif-ish face at the same size and vertical position.
3. **Logo block** — paint over the old script `yes experiences PORTUGAL` mark, composite the canonical `public/brand/svg/yes-experiences-portugal-centered-full.svg` (rasterized via `cairosvg` at 3× for crispness) in the same slot at matching width and baseline.
4. Re-embed the edited JPEG onto object 8's stream (`pikepdf`), preserving all other page content (frame, hero photo, "Portugal / Beyond the Postcards", date, DATES/ROUTE/TRANSPORT/STATUS card).
5. Linearize output.

### 4 · Route table on page 4 (best-effort)

Attempt a content-stream nudge to shift the "Costa Vicentina" and "Lisbon — Return via Coast" row baselines down ~14pt so cells stop overlapping. If the stream is too tangled to edit safely, leave that page and flag it in the report — that's a source-file design defect and the honest fix is re-exporting page 4 from the original tool.

### 5 · Regenerate previews + refresh assets

- Render pages 1–6 at existing preview resolution (match current `page-0N.jpg` dimensions) with `pdftoppm`.
- Overwrite `public/travel-file-sample/page-01.jpg … page-06.jpg`.
- Re-upload the new `sample.pdf` and pages 2–6 as Lovable assets (page-01 has no `.asset.json`, just the file swap). Update the six `.asset.json` files.

### 6 · Verify (visual QA, mandatory)

- `pdftotext` sweep → 0 old-domain / 0 old-email hits.
- Render all 23 pages at 150dpi to `/tmp/qa/`, inspect: cover (correct logo + new footer, layout intact), page 4 (table overlap), page 23 (final contact block), plus one page per section.
- Compare page-01.jpg to the uploaded reference visually — confirm hero image, "Portugal / Beyond the Postcards", date, and info card are untouched; only the logo and footer changed.

### Out of scope

- Rebuilding the PDF from scratch, changing typography, hero image, colors, or the date block.
- Editing HTML routes (already source-of-truth from `business-nap.ts`).
- Brand PDFs under `public/brand/` — already audited clean, no changes.

### Risk to flag

The cover cover-photo font on the original PDF is a Cormorant/Playfair-like serif that we don't have the exact file for. The re-drawn footer will use the closest available system serif (Playfair/EB Garamond) at the same size — at cover viewing distance this reads as identical, but a side-by-side of just the footer strip would show the swap. If pixel-perfect font match matters, the cleaner path is you exporting a single corrected cover page from the design tool and I splice only that page.
