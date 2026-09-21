# YES experiences PORTUGAL — Brand Asset Kit

This folder contains the official redistributable logo files for
**YES experiences PORTUGAL**, organized by format and variant.

## Folder layout

```
public/brand/
├── README.md              ← this file
├── manifest.json          ← machine-readable index of every variant
├── yes-brand-board.pdf    ← single-page brand-color reference (print-ready)
├── yes-brand-board.png    ← same brand-color reference, hi-res raster
├── svg/                   ← vector master files (recommended for web + print)
├── png/                   ← rasterized exports at @1x / @2x / @3x
├── pdf/                   ← single-page print-ready PDFs
├── eps/                   ← Encapsulated PostScript (legacy print workflows)
└── ai/                    ← Adobe Illustrator-compatible (PDF-based, opens editably)
```

## The brand board

`yes-brand-board.pdf` (and its PNG twin) is the canonical color reference.
It carries the master logo at the top and the full 8-token palette below,
each swatch labelled with **role · hex · CSS token · usage**. Every hex
value on the board is verified at build time against `src/styles.css` —
the build fails if any token drifts. Hand this single page to printers,
designers, or partners as the source of truth.

| Token             | Hex       | Role                            |
| ----------------- | --------- | ------------------------------- |
| `--teal`          | `#295B61` | Primary brand color             |
| `--teal-2`        | `#2A7C82` | Secondary teal (hover, accents) |
| `--gold`          | `#C9A96A` | Accent (rules, dividers)        |
| `--gold-soft`     | `#E1CFA6` | Soft accent (microcopy)         |
| `--charcoal`      | `#2E2E2E` | Primary text / dark surface     |
| `--charcoal-soft` | `#555555` | Secondary text                  |
| `--ivory`         | `#FAF8F3` | Primary background              |
| `--sand`          | `#F4EFE7` | Quiet surface                   |

## Variants (6)

Every variant is delivered with a **fully transparent background**, so the
mark composites onto any surface cleanly.

| File slug                                        | Lockup     | Color         | Recommended use                            |
| ------------------------------------------------ | ---------- | ------------- | ------------------------------------------ |
| `yes-experiences-portugal-centered-full`         | Centered   | Full color    | Default. Light backgrounds (ivory, white). |
| `yes-experiences-portugal-centered-mono-dark`    | Centered   | Mono charcoal | Single-color print, light backgrounds.     |
| `yes-experiences-portugal-centered-mono-light`   | Centered   | Mono ivory    | Reversed, dark backgrounds (charcoal).     |
| `yes-experiences-portugal-horizontal-full`       | Horizontal | Full color    | Headers, signage, wide layouts.            |
| `yes-experiences-portugal-horizontal-mono-dark`  | Horizontal | Mono charcoal | Single-color print, light backgrounds.     |
| `yes-experiences-portugal-horizontal-mono-light` | Horizontal | Mono ivory    | Reversed, dark backgrounds.                |

### Color tokens used

| Role                    | Hex       | CSS token    |
| ----------------------- | --------- | ------------ |
| YES (full)              | `#295B61` | `--teal`     |
| experiences             | `#2E2E2E` | `--charcoal` |
| Accent rules / PORTUGAL | `#C9A96A` | `--gold`     |
| Mono dark               | `#2E2E2E` | `--charcoal` |
| Mono light              | `#FAF8F3` | `--ivory`    |

The teal matches the hero-CTA fill on the live site exactly.

## Format guidance

- **SVG** — use whenever possible. Infinitely scalable, smallest file size,
  text outlines are embedded as paths so no font is required to render.
- **PNG @1x/2x/3x** — for surfaces that don't accept SVG (some email clients,
  legacy CMSes, social avatars). Pick the highest-resolution file the target
  surface supports.
- **PDF** — for print collateral, decks, signage, and hand-off to printers.
  Vector content preserved.
- **EPS** — Encapsulated PostScript, for legacy print workflows that
  specifically require `.eps` (older RIPs, embroidery / signage software).
- **AI** — Adobe Illustrator-compatible. These are PDF-based files that open
  fully editable in Illustrator, Affinity Designer, Inkscape and Sketch.

## Honest note on typographic fidelity

The vector master is **typographically built** from the brand's chosen
display fonts (Kaushan Script for "YES", Cormorant Garamond Italic for
"experiences", Inter Medium for "PORTUGAL") in the brand-token colors. This
matches the codebase's design system and produces a clean, scalable, fully
editable vector master.

It is **not** a 1:1 trace of any prior raster artwork. If your brand
guidelines require a custom-lettered "YES" brushstroke to be preserved
verbatim, supply the original vector source from your designer and the
build pipeline at `/tmp/brand-build/build.py` can be re-run against it.

## Regenerating

The build pipeline lives outside this folder (it's a one-off script, not a
runtime dependency of the site). If you need to regenerate or add new
variants, the source is `/tmp/brand-build/build.py` + `render.py`.

---

© YES Experiences Portugal. All rights reserved.
