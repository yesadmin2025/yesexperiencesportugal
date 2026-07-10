# Travel Designer PDF — clean the real file, keep all 23 pages, add mobile lightbox

The existing `public/travel-file-sample/sample.pdf` is the real 23-page travel file. We keep it verbatim — all 23 pages, all the later logistics/appendix pages the user wants preserved — and only strip the two things that make it feel personal/cheap:

1. The running header on every page: `YES EXPERIENCES PORTUGAL · PRIVATE TRAVEL FILE · JENNIFER OLIVER … SEPTEMBER 2026`
2. The `YES experiences PORTUGAL` wordmark on the final page(s).

The homepage flip-book stays in sync and every page becomes tappable to open full-screen readable on mobile.

## 1. Redact the existing PDF (no re-typesetting)

New script: `scripts/clean-travel-file-sample.py` (Python + `pypdf` + `reportlab`).

- Load `public/travel-file-sample/sample.pdf` (23 pages, A4 595×842pt).
- For every page, stamp an ivory-coloured filled rectangle over the top header band (top ~40pt strip, full width) using a reportlab overlay merged via `pypdf.PageObject.merge_page`. This wipes the "JENNIFER OLIVER" + "YES EXPERIENCES PORTUGAL · PRIVATE TRAVEL FILE" line on every page in one pass, without touching body copy or the footer.
- Detect the wordmark(s) on the closing pages by extracting page text and, if it contains `YES experiences PORTUGAL`, stamp an ivory rectangle over that region (identified by its y-coordinate via `pdfplumber`'s `extract_words`). No logo image is embedded in the PDF, so no image removal is needed — the wordmark is text.
- Preserve the footer (`yesexperiencesportugal.com · info@yesexperiencesportugal.com · +351 911 889 992 · —N—`) untouched. It's already the correct brand contact block from `src/config/business-nap.ts` and the user only asked to fix the *header* website/email presentation — which was actually the top header, now fully removed.
- Write to `public/travel-file-sample/sample.pdf` (overwrite in place; the old file was hand-uploaded, no history to preserve).
- Regenerate the six preview JPGs from the cleaned PDF via `pdftoppm -jpeg -r 150 -f N -l N` so `page-01.jpg` … `page-06.jpg` reflect the new headerless look. Kept as 6 previews so the flip-book animation stays fast; the "Open full PDF" CTA below the flip-book carries the user to the complete 23-page document including the later pages.

Add `scripts/clean-travel-file-sample.py` to `package.json` as `pdf:clean` so re-running is one command.

### QA (mandatory before commit)

- `pdftoppm -jpeg -r 150` every page of the cleaned PDF to `/tmp/qa/`, view each with `code--view`, confirm:
  - no "JENNIFER OLIVER" anywhere,
  - no `YES experiences PORTUGAL` wordmark on the closing pages,
  - top of every page is clean ivory with no leftover glyph fragments,
  - footer, body copy, tables, day cards, and the final logistics/appendix pages are untouched,
  - page count still 23.
- Iterate on the rectangle y-coords until every page is clean.

## 2. Homepage + `/multi-day` flip-book — tap to open, full-screen readable

`src/components/home/RecentJourney.tsx` currently renders each preview as a small `<img>` with no way to enlarge — unreadable at 393px. Add:

- Wrap the main flip page and each thumbnail in a `<button>` that opens a new `PageLightbox` component.
- `PageLightbox` = `role="dialog" aria-modal="true"`, ivory backdrop, one page rendered `max-h-[100dvh] object-contain`, pinch-to-zoom via `touch-action: pinch-zoom`, swipe left/right between pages, ← / → / Esc keyboard shortcuts, 44×44 close button top-right, page counter bottom-centre. Reuses existing `usePrefersReducedMotion()`.
- Add a secondary CTA immediately under the flip-book: **"Open the full 15-day PDF"** → `/travel-file-sample/sample.pdf` in a new tab. This is what carries the user to the later logistics/appendix pages the flip-book doesn't preview.
- Same behaviour on `/multi-day` since it imports the same six preview images.

No other homepage/multi-day copy or layout changes.

## 3. Out of scope

- No re-typesetting of the PDF, no font swap, no cover redesign — the real document is what makes this proof credible.
- No PDF.js in-browser viewer — image lightbox + "Open full PDF" is lighter and reads better on mobile.
- No localisation of the PDF to PT.
- No changes to the `.asset.json` wrappers (the files live in `public/` and are already served directly).

## Technical notes

- `pypdf` + `reportlab` + `pdfplumber` are all pure-Python and safe in the sandbox; no Node/Chrome dependency.
- Redaction here is a *visual* overlay, not a text-layer scrub. That's the right trade-off for a public marketing sample: the client's name no longer renders on screen or in "copy text" from the app-side viewer for casual readers, and re-typesetting the whole 23-page dossier for that would risk breaking the very later pages the user wants preserved. If the user later asks for true PII scrubbing (removing text from the content stream), that's a follow-up.
- Everything else in the flip-book UI (motion, keyboard, thumbnails, aria) stays exactly as it is today.
