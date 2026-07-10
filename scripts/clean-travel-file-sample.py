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
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

SRC = Path("public/travel-file-sample/sample.pdf")

# Warm-ivory tokens sampled from the brand palette + cover artwork.
IVORY = Color(0xFA / 255, 0xF8 / 255, 0xF3 / 255)   # --ivory  #FAF8F3
SAND  = Color(0xEF / 255, 0xE6 / 255, 0xD4 / 255)   # cover ivory frame
SUNSET = Color(0xE9 / 255, 0xD3 / 255, 0xB0 / 255)  # sampled sunset tone under "14 nights"
CHARCOAL = Color(0x2E / 255, 0x2E / 255, 0x2E / 255)  # --charcoal
CHARCOAL_SOFT = Color(0x5A / 255, 0x5A / 255, 0x5A / 255)

PAGE_W, PAGE_H = 595.276, 841.89  # A4


def _base_canvas() -> tuple[canvas.Canvas, BytesIO]:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H))
    return c, buf


def build_header_overlay() -> PageObject:
    """Full-width ivory strip along the top ~28pt — hides the running
    'YES EXPERIENCES PORTUGAL · PRIVATE TRAVEL FILE · JENNIFER OLIVER
    ... SEPTEMBER 2026' line on every interior page."""
    c, buf = _base_canvas()
    c.setFillColor(IVORY)
    # Header text runs at top≈22.9→29.9pt from the page top.
    # In reportlab coords (y from bottom), that is 812.0→819.0. Give it a
    # generous 6pt safety margin above and below so no glyph tails survive.
    c.rect(0, PAGE_H - 40, PAGE_W, 40, stroke=0, fill=1)
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def build_cover_overlay() -> PageObject:
    """Cover is one flattened image with the logo and client name baked
    into the raster. Cover the logo block (top ivory frame — matches the
    surrounding tone), and the "· Designed for Jennifer Oliver" tail
    (sunset tone), then rewrite the meta line without the name."""
    c, buf = _base_canvas()

    # ── 1. Kill the logo block sitting inside the top ivory frame.
    # Approximate PDF coords derived from the cover raster (A4 @ 100dpi).
    c.setFillColor(SAND)
    c.rect(120, PAGE_H - 200, PAGE_W - 240, 175, stroke=0, fill=1)

    # ── 2. Kill the "14 nights · Designed for Jennifer Oliver" line and
    # rewrite it, tone-matched to the sunset area behind it.
    band_y = PAGE_H - 460  # ~top=456pt in PDF space
    band_h = 30
    c.setFillColor(SUNSET)
    c.rect(150, band_y, PAGE_W - 300, band_h, stroke=0, fill=1)

    # Rewrite: "14 nights · Private Portugal journey"
    c.setFillColor(CHARCOAL)
    c.setFont("Helvetica", 14)
    replacement = "14 nights  \u00b7  Private Portugal journey"
    tw = c.stringWidth(replacement, "Helvetica", 14)
    c.drawString((PAGE_W - tw) / 2, band_y + 10, replacement)

    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def build_page23_overlay(header_overlay: PageObject) -> PageObject:
    """Same header strip as every other page, plus an ivory box over the
    'YES experiences PORTUGAL' wordmark near the middle."""
    c, buf = _base_canvas()
    # Header
    c.setFillColor(IVORY)
    c.rect(0, PAGE_H - 40, PAGE_W, 40, stroke=0, fill=1)
    # Wordmark: extracted words sit at top=240.8→258.8, x0=185.7 → x1=409.6.
    # Reportlab y_bottom = 842 - 258.8 = 583.2, height ≈ 24 (padded).
    c.setFillColor(IVORY)
    c.rect(150, PAGE_H - 265, PAGE_W - 300, 30, stroke=0, fill=1)
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def main() -> None:
    assert SRC.exists(), f"missing {SRC}"
    reader = PdfReader(str(SRC))
    writer = PdfWriter()

    header = build_header_overlay()
    cover  = build_cover_overlay()
    page23 = build_page23_overlay(header)

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
