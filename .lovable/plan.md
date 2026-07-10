# Fix the cover — minimal edits only

You're right. On the cover I should have only:

1. Removed the YES logo block at the top.
2. Removed the client's name.
3. Left the footer's website/email alone (they're already correct per `business-nap`).

Instead I redrew the meta line in Helvetica, which broke the typography ("Septem ber", wrong font, boxed background). That gets reverted.

## What changes in `scripts/clean-travel-file-sample.py`

Cover page (page 1) — keep two ivory rectangles, delete the redrawn text:

- **Rect 1 (logo)** — unchanged, ivory strip over the top ~145pt band.
- **Rect 2 (client name)** — cover the meta line (Designed for Jennifer Oliver") with a single ivory rectangle. Keep the dates .**Do NOT redraw anything.** 

Remove all `setFont` / `drawString` / `stringWidth` calls from `build_cover_overlay()`. Result: cover shows the original "Portugal / Beyond the Postcards" wordmark, then whitespace, then the original info card and original footer — nothing rewritten.

Interior pages (2–22) and page 23 wordmark redaction: **unchanged** — those overlays worked correctly.

## Rerun + QA

- `python3 scripts/clean-travel-file-sample.py` against the current sample.
- `pdftoppm -jpeg -r 150 -f 1 -l 1` and visually confirm: no logo, no name, no boxed/redrawn text, original fonts intact above and below the erased strip, footer untouched.
- Regenerate `page-01.jpg` preview only (other previews unchanged).

## Out of scope (explicitly not touching)

- Footer website / email / phone — already correct, no edits.
- Interior page header strip — already correct.
- Page 23 wordmark cover — already correct.
- Flip-book / lightbox / `/multi-day` UI — no changes.

## Note on re-running

The redaction script overlays on top of the current `sample.pdf`. Since the current file already has my bad overlay baked in, I'll re-run from the original. If the original isn't recoverable from disk, I'll ask you to re-upload the untouched 23-page PDF before applying the minimal overlay — safer than stacking overlays on the broken cover.