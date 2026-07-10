
## Goal

Every PDF the site serves must reflect the current brand contacts:

- Website: `yesexperiencesportugal.com` (currently `yesexperiences.pt`)
- Email: `info@yesexperiencesportugal.com` (currently `info@yesexperiences.pt`)
- Phone: `+351 911 889 992` (already correct)

Source of truth: `src/config/business-nap.ts` (`EMAIL`, `PHONE_DISPLAY`).

## Scope

**Primary — the "travel design" file**
`public/travel-file-sample/sample.pdf` (23 pages). It's used two ways:
1. Download link on `/multi-day` (`src/routes/multi-day.tsx`).
2. Rendered as `page-01.jpg … page-06.jpg` on `/multi-day` and the homepage `RecentJourney` section.

Every page footer reads:
`yesexperiences.pt · info@yesexperiences.pt · +351 911 889 992`
and the final contact block (page 23) repeats the wrong web + email.

**Secondary — brand PDFs under `public/brand/`**
- `yes-brand-board.pdf`
- 6 logo-pack PDFs (`yes-experiences-portugal-*.pdf`)

`pdftotext` sweep shows no `yesexperiences.pt`/old email strings inside any of them — they're vector logo/board pages. Audit confirms nothing to patch. I'll re-run the sweep at fix time and note the result; no re-issuance needed unless something turns up.

## Approach — In-place text patch (approved)

Use `pikepdf` (qpdf backend) to rewrite the two strings inside the PDF's content streams while preserving layout, xref, fonts, embedded logo, and page geometry. Fastest path, keeps the existing design pixel-identical, only fixes text. The logo currently embedded stays as-is — matches "in-place text patch only" choice.

Replacements (applied to every page + the page-23 contact block):
- `yesexperiences.pt` → `yesexperiencesportugal.com`
- `info@yesexperiences.pt` → `info@yesexperiencesportugal.com`

The new strings are longer than the originals. In content streams, PDF text is drawn with `Tj`/`TJ` operators on literal strings — length changes are safe (they don't affect xref because pikepdf regenerates the xref on save). Kerning of the footer line will shift slightly to the right; if that pushes past the page margin on any page, I'll adjust the footer's starting x-offset for that content stream, or fall back to shortening spacing between the `·` separators. QA (below) verifies this per page.

## Steps

1. **Script** `/tmp/patch_travel_pdf.py` using `pikepdf`:
   - Open `public/travel-file-sample/sample.pdf`.
   - For each page, walk content streams and any Form XObjects; decode, replace both literal strings (handle both `(...)` and `<...>` hex-encoded literals; sample PDF uses parenthesized literals per `pdftotext` output but the script handles both defensively).
   - Save to same path (linearized, deterministic).
2. **Verify text**: `pdftotext -layout` → grep for `yesexperiences.pt` and `info@yesexperiences.pt`. Expected: zero hits. Grep for `yesexperiencesportugal.com` and `info@yesexperiencesportugal.com`. Expected: hits on every page footer + page-23 contact block.
3. **Visual QA (mandatory)**: render all 23 pages with `pdftoppm -jpeg -r 120` to `/tmp/qa/`, view each with `code--view`, look specifically for:
   - Footer text clipped at right margin (new string is 8 chars longer).
   - Overlap with page-number `— N —`.
   - Any other page furniture disturbed.
   If any page fails, patch that page's content stream to shift/rescale the footer line and re-verify.
4. **Regenerate the 6 preview JPGs** used on `/multi-day` and homepage `RecentJourney`:
   - Render pages 1–6 of the patched PDF at the current preview resolution (match the dimensions of the existing `public/travel-file-sample/page-0N.jpg`) with `pdftoppm`.
   - Overwrite `public/travel-file-sample/page-01.jpg … page-06.jpg`.
   - Re-upload each as a Lovable asset (`lovable-assets create`) so `src/assets/travel-file-sample/page-0N.jpg.asset.json` points at the new CDN URL. `page-01` currently uses a `/public` URL only (no `.asset.json` in `RecentJourney`/`multi-day` imports), so it just needs the file replaced.
5. **Brand PDF audit**: re-run `pdftotext` sweep over `public/brand/*.pdf`; if any references surface, apply the same patch. Otherwise note "no text to fix" in the reply.
6. **Report**: list files changed, QA findings, and confirm all footers on all 23 pages plus the preview JPGs show the new domain/email.

## Out of scope (per your answers)

- Rebuilding the PDF from scratch or changing typography.
- Swapping the embedded logo (you chose "in-place text patch only" — the current logo stays; if you also want the logo replaced I'd need option 1 or 2 instead).
- Editing any HTML/route pages — those already use `EMAIL`/`PHONE_DISPLAY` from `business-nap.ts`.
