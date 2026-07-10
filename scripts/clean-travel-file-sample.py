#!/usr/bin/env python3
"""
Clean the Jennifer Oliver travel file for public sample display.

Approach: plain color-patch redaction (no reconstruction, no inpainting).
For each personal-info string we locate its bounding box with pdfplumber,
rasterize each page to a JPG, and paint a solid rectangle sampled from
the surrounding background over it.

Redacted:
- Cover: YES logo (top block), personalized "· Designed for Jennifer Oliver"
- Interior (p2-22): running header (brand + name), footer (email/site/phone)
- Back (p23): running header, footer, contact block (email/whatsapp/wordmark)
- Any body occurrence of "Jennifer" / "Oliver"

Usage:
  python3 scripts/clean-travel-file-sample.py <source.pdf> <out_dir>
"""
from __future__ import annotations
import os
import sys
import subprocess
import tempfile
from pathlib import Path

import pdfplumber
from PIL import Image

DPI = 150
JPG_QUALITY = 85

# personal-info strings to redact wherever they appear (case-insensitive substring match on line)
LINE_REDACTIONS = [
    "YES EXPERIENCES PORTUGAL · PRIVATE TRAVEL FILE",  # header line
    "yesexperiences.pt",                                # footer line
    "info@yesexperiences.pt",
    "+351 911 889 992",
    "Jennifer Oliver",
    "Designed for Jennifer",
]

# On page 23, extra full-line contact block items
PAGE23_EXTRA = [
    "YES experiences PORTUGAL",
    "EMAIL info@yesexperiences.pt",
    "WHATSAPP +351 911 889 992",
]

# Cover page 1: YES logo band (top of page, above the "PRIVATE CURATED..." eyebrow)
# PDF coords (pdfplumber uses top-left origin, y grows downward)
COVER_LOGO_BOX = (170, 50, 425, 175)   # (x0, y0, x1, y1) in PDF pts — covers logo mark + wordmark
COVER_NAME_BOX = (150, 428, 450, 458)  # covers "14 nights · Designed for Jennifer Oliver" line region


def rasterize_page(pdf_path: str, page_num: int, out_jpg: Path, dpi: int = DPI) -> Image.Image:
    """Rasterize a single 1-indexed page to a JPG file. Returns the PIL image."""
    with tempfile.TemporaryDirectory() as td:
        prefix = os.path.join(td, "p")
        subprocess.run(
            ["pdftoppm", "-jpeg", "-r", str(dpi),
             "-f", str(page_num), "-l", str(page_num),
             pdf_path, prefix],
            check=True, capture_output=True,
        )
        # pdftoppm names files like p-01.jpg / p-1.jpg depending on total pages
        candidates = sorted(Path(td).glob("p-*.jpg"))
        assert candidates, "pdftoppm produced no output"
        img = Image.open(candidates[0]).convert("RGB")
    return img


def sample_bg(img: Image.Image, box_px: tuple[int, int, int, int]) -> tuple[int, int, int]:
    """Sample a background color from just outside the box (prefer above, then left)."""
    x0, y0, x1, y1 = box_px
    W, H = img.size
    candidates = []
    # a strip just above the box
    if y0 - 6 > 0:
        candidates.append(img.crop((max(0, x0), max(0, y0 - 6), min(W, x1), y0 - 1)))
    # strip just below
    if y1 + 6 < H:
        candidates.append(img.crop((max(0, x0), y1 + 1, min(W, x1), min(H, y1 + 6))))
    # strip to the left
    if x0 - 6 > 0:
        candidates.append(img.crop((max(0, x0 - 6), max(0, y0), x0 - 1, min(H, y1))))
    if not candidates:
        return (250, 246, 235)  # ivory fallback
    # average pixel of the largest strip
    strip = max(candidates, key=lambda s: s.size[0] * s.size[1])
    small = strip.resize((1, 1))
    return small.getpixel((0, 0))


def paint_box(img: Image.Image, box_pt: tuple[float, float, float, float], scale: float, pad: int = 2):
    """Paint a solid rectangle over the given PDF-pt box, sampled from surroundings."""
    from PIL import ImageDraw
    x0, y0, x1, y1 = box_pt
    x0 = max(0, int(x0 * scale) - pad)
    y0 = max(0, int(y0 * scale) - pad)
    x1 = min(img.size[0], int(x1 * scale) + pad)
    y1 = min(img.size[1], int(y1 * scale) + pad)
    if x1 <= x0 or y1 <= y0:
        return
    color = sample_bg(img, (x0, y0, x1, y1))
    ImageDraw.Draw(img).rectangle((x0, y0, x1, y1), fill=color)


def line_bbox_for_text(page, needle: str) -> list[tuple[float, float, float, float]]:
    """Return bboxes of full text lines that contain `needle` (case-insensitive).

    Uses word extraction and groups words on the same baseline.
    """
    needle_l = needle.lower()
    words = page.extract_words(use_text_flow=True, keep_blank_chars=False)
    if not words:
        return []

    # group words by ~line (rounded top)
    lines: dict[int, list] = {}
    for w in words:
        key = round(w["top"] / 3) * 3  # 3pt buckets
        lines.setdefault(key, []).append(w)

    hits = []
    for key, ws in lines.items():
        ws.sort(key=lambda w: w["x0"])
        line_text = " ".join(w["text"] for w in ws).lower()
        if needle_l in line_text:
            x0 = min(w["x0"] for w in ws)
            x1 = max(w["x1"] for w in ws)
            y0 = min(w["top"] for w in ws)
            y1 = max(w["bottom"] for w in ws)
            hits.append((x0, y0, x1, y1))
    return hits


def process(pdf_path: str, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            print(f"page {i}...")
            img = rasterize_page(pdf_path, i, out_dir)
            scale = img.size[0] / page.width  # px per pt

            # collect redaction boxes
            boxes: list[tuple[float, float, float, float]] = []
            needles = list(LINE_REDACTIONS)
            if i == 23:
                needles.extend(PAGE23_EXTRA)
            for n in needles:
                boxes.extend(line_bbox_for_text(page, n))

            # cover-specific pixel boxes for logo + personal name line
            if i == 1:
                boxes.append(COVER_LOGO_BOX)
                boxes.append(COVER_NAME_BOX)

            # paint each box (expand a hair for anti-aliased glyph edges)
            for b in boxes:
                # expand horizontally a bit for header/footer full-width bars
                x0, y0, x1, y1 = b
                paint_box(img, (x0 - 4, y0 - 3, x1 + 4, y1 + 3), scale, pad=1)

            out_path = out_dir / f"page-{i:02d}.jpg"
            img.save(out_path, "JPEG", quality=JPG_QUALITY, optimize=True)
            print(f"  wrote {out_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: clean-travel-file-sample.py <source.pdf> <out_dir>")
        sys.exit(1)
    process(sys.argv[1], Path(sys.argv[2]))
