#!/usr/bin/env python3
"""Redact personal details + logo from the public Travel Designer sample PDF.

Cover page (page 1) is a flattened raster — we rasterize it, pixel-edit
only two zones (logo band and the "Designed for Jennifer Oliver" tail),
then replace page 1 with the edited image. Interior pages 2–22 get an
ivory strip over the running header. Page 23 gets a teal strip over the
"YES experiences PORTUGAL" wordmark. Nothing else is touched.

Idempotent — safe to re-run.

Run: `python3 scripts/clean-travel-file-sample.py`
"""
from __future__ import annotations
import subprocess, tempfile
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter, PageObject
from reportlab.lib.colors import Color
from reportlab.pdfgen import canvas


SRC = Path("public/travel-file-sample/sample.pdf")

IVORY_INTERIOR = Color(0xFA / 255, 0xF8 / 255, 0xF3 / 255)
TEAL           = Color(0x29 / 255, 0x5B / 255, 0x61 / 255)

PAGE_W, PAGE_H = 595.276, 841.89  # A4 pt


def _canvas() -> tuple[canvas.Canvas, BytesIO]:
    buf = BytesIO()
    return canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H)), buf


def build_header_overlay() -> PageObject:
    """Ivory strip over the top ~40pt on interior pages (running header)."""
    c, buf = _canvas()
    c.setFillColor(IVORY_INTERIOR)
    c.rect(0, PAGE_H - 40, PAGE_W, 40, stroke=0, fill=1)
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def build_page23_overlay() -> PageObject:
    """Ivory header strip + teal patch over the wordmark on the final page."""
    c, buf = _canvas()
    c.setFillColor(IVORY_INTERIOR)
    c.rect(0, PAGE_H - 40, PAGE_W, 40, stroke=0, fill=1)
    c.setFillColor(TEAL)
    c.rect(80, PAGE_H - 270, PAGE_W - 160, 40, stroke=0, fill=1)
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def build_cover_page() -> PageObject:
    """Rasterize page 1 at 300 dpi, erase logo + client-name line via
    content-aware pixel copy (no drawn text, no visible boxes), then
    return a fresh PDF page containing the edited image."""
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(
            ["pdftoppm", "-jpeg", "-jpegopt", "quality=94", "-r", "300",
             "-f", "1", "-l", "1", str(SRC), f"{td}/p"],
            check=True,
        )
        img = Image.open(f"{td}/p-01.jpg").convert("RGB")

    W, H = img.size  # ≈ 2480 x 3508 for A4 @ 300dpi
    # Helpers: convert PDF top-down pt to pixel y.
    def py(pt_top_down: float) -> int:
        return int(round(pt_top_down * H / PAGE_H))

    # Measured from the 300dpi raster of the original cover:
    #   logo YES glyphs        pdf y  84–115
    #   eyebrow "PRIVATE …"    pdf y ~180–210 (gold, low contrast)
    #   Portugal title         pdf y 235–323
    #   Beyond the Postcards   pdf y 408–418
    #   gold rule              pdf y 432–439
    #   dates line             pdf y 505–544  (KEEP)
    #   "14 nights · Designed for Jennifer Oliver"  pdf y 578–592 (ERASE)
    #   info card starts       pdf y ~619

    # ── Zone A: LOGO only. Pure ivory zone above the eyebrow — flat fill.
    ivory = img.getpixel((int(W * 0.12), py(30)))
    draw = ImageDraw.Draw(img)
    frame_pad = py(38)
    draw.rectangle([frame_pad, py(55), W - frame_pad, py(155)], fill=ivory)

    # ── Zone B: erase "14 nights · Designed for Jennifer Oliver" line.
    #    Verified via cropped inspection: name line sits at pdf y ≈ 432–452
    #    (dates "September 8 — September 22, 2026" is just above at ≈ 405–425).
    #    Use OpenCV inpainting so the sunset gradient reconstructs seamlessly.
    arr = np.array(img)
    mask = np.zeros(arr.shape[:2], dtype=np.uint8)
    mask[py(428):py(456), py(120):W - py(120)] = 255
    inpainted = cv2.inpaint(
        cv2.cvtColor(arr, cv2.COLOR_RGB2BGR), mask, 8, cv2.INPAINT_TELEA
    )
    img = Image.fromarray(cv2.cvtColor(inpainted, cv2.COLOR_BGR2RGB))






    # ── Rebuild page 1: single-image PDF page at A4.
    img_buf = BytesIO()
    img.save(img_buf, format="JPEG", quality=92, optimize=True)
    img_buf.seek(0)

    c, buf = _canvas()
    from reportlab.lib.utils import ImageReader
    c.drawImage(ImageReader(img_buf), 0, 0, width=PAGE_W, height=PAGE_H)
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def main() -> None:
    assert SRC.exists(), f"missing {SRC}"
    cover_page = build_cover_page()  # rasterize + edit BEFORE opening writer
    reader = PdfReader(str(SRC))
    writer = PdfWriter()

    header = build_header_overlay()
    page23 = build_page23_overlay()
    last = len(reader.pages) - 1

    for i, page in enumerate(reader.pages):
        if i == 0:
            writer.add_page(cover_page)
        elif i == last:
            page.merge_page(page23)
            writer.add_page(page)
        else:
            page.merge_page(header)
            writer.add_page(page)

    with open(SRC, "wb") as f:
        writer.write(f)
    print(f"wrote {SRC} — {len(reader.pages)} pages")


if __name__ == "__main__":
    main()
