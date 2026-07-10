#!/usr/bin/env python3
"""
Redact personal details + logo wordmark from the public Travel Designer
sample PDF, in place.

Source of truth: `public/travel-file-sample/sample.pdf` is a real 23-page
private travel file. We keep every page — including the later logistics /
appendix pages — and only strip:

  1. The running header on pages 2–23:
       "YES EXPERIENCES PORTUGAL · PRIVATE TRAVEL FILE · JENNIFER OLIVER ...
        SEPTEMBER 2026"
  2. On the flattened cover (page 1, one big raster image): the YES logo
     block at the top and the "Designed for Jennifer Oliver" tail on the
     14-nights line — both baked into the image, so covered with tone-
     matched overlays and one clean rewritten line.
  3. The "YES experiences PORTUGAL" wordmark near the middle of the final
     page (page 23).

Everything else — body copy, tables, day cards, contact footer — is
untouched.

Run: `python3 scripts/clean-travel-file-sample.py`
"""
from __future__ import annotations
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter, PageObject
from reportlab.lib.colors import Color
from reportlab.pdfgen import canvas

SRC = Path("public/travel-file-sample/sample.pdf")

# Tones sampled from the raster cover + brand palette.
IVORY_INTERIOR = Color(0xFA / 255, 0xF8 / 255, 0xF3 / 255)  # --ivory  #FAF8F3
IVORY_COVER    = Color(250 / 255, 245 / 255, 239 / 255)     # cover inner frame — sampled
TEAL           = Color(0x29 / 255, 0x5B / 255, 0x61 / 255)  # --teal (final-page band)
CHARCOAL_SOFT  = Color(0x5A / 255, 0x5A / 255, 0x5A / 255)

PAGE_W, PAGE_H = 595.276, 841.89  # A4


def _base_canvas() -> tuple[canvas.Canvas, BytesIO]:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H))
    return c, buf


def build_header_overlay() -> PageObject:
    """Full-width ivory strip along the top ~40pt — hides the running
    'YES EXPERIENCES PORTUGAL · PRIVATE TRAVEL FILE · JENNIFER OLIVER
    ... SEPTEMBER 2026' line on every interior page."""
    c, buf = _base_canvas()
    c.setFillColor(IVORY_INTERIOR)
    c.rect(0, PAGE_H - 40, PAGE_W, 40, stroke=0, fill=1)
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def build_cover_overlay() -> PageObject:
    """The cover is one flattened image with the logo + client name baked
    into the raster. Both target areas sit inside the ivory frame at the
    top of the page (sampling confirmed pixel tone ≈ #FAF5EF), so a
    full-width ivory rectangle blends seamlessly."""
    c, buf = _base_canvas()

    # ── 1. Logo block — top of the ivory frame, edge-to-edge inside the
    # decorative border. Raster y ≈ 40–235 ⇒ PDF y ≈ 673–813.
    c.setFillColor(IVORY_COVER)
    c.rect(55, 670, PAGE_W - 110, 145, stroke=0, fill=1)

    # ── 2. Meta line — erases the "Designed for Jennifer Oliver" line
    # (and the redundant date line above the info card) with a single
    # ivory rectangle. No text is redrawn: the dates already appear in
    # the DATES row of the info card immediately below, so removing the
    # whole meta strip is the cleanest option and preserves the original
    # typography above ("Beyond the Postcards") and below (info card).
    c.setFillColor(IVORY_COVER)
    c.rect(140, 390, PAGE_W - 280, 60, stroke=0, fill=1)


    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]



def build_page23_overlay() -> PageObject:
    """Same header strip as every other page, plus a teal-tone box over
    the 'YES experiences PORTUGAL' wordmark that sits on the dark teal
    band near the middle of the final page."""
    c, buf = _base_canvas()
    c.setFillColor(IVORY_INTERIOR)
    c.rect(0, PAGE_H - 40, PAGE_W, 40, stroke=0, fill=1)
    # Wordmark words sit at top=240.8→258.8pt.  reportlab y_bottom ≈ 583,
    # height ≈ 22 (padded). Match the surrounding teal band, not ivory.
    c.setFillColor(TEAL)
    c.rect(80, PAGE_H - 270, PAGE_W - 160, 40, stroke=0, fill=1)
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]



def main() -> None:
    assert SRC.exists(), f"missing {SRC}"
    reader = PdfReader(str(SRC))
    writer = PdfWriter()

    header = build_header_overlay()
    cover  = build_cover_overlay()
    page23 = build_page23_overlay()

    for i, page in enumerate(reader.pages):
        if i == 0:
            page.merge_page(cover)
        elif i == len(reader.pages) - 1:
            page.merge_page(page23)
        else:
            page.merge_page(header)
        writer.add_page(page)

    with open(SRC, "wb") as f:
        writer.write(f)
    print(f"wrote {SRC} — {len(reader.pages)} pages")


if __name__ == "__main__":
    main()
