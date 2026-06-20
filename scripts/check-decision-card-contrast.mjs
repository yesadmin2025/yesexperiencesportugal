#!/usr/bin/env node
/**
 * Decision card contrast checker.
 *
 * For each lifestyle photo behind a homepage decision card, this script
 * simulates the rendered gradient overlay and samples the resulting
 * luminance in the TEXT BAND (where headline + body sit). It then computes
 * the WCAG contrast ratio against white text and warns if any card falls
 * below the target legibility threshold.
 *
 * Run:  node scripts/check-decision-card-contrast.mjs
 * Exits non-zero if any card fails — wire into CI when desired.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---- Targets -------------------------------------------------------------
// White text (#FFFFFF, rel-luminance 1.0). WCAG AA large = 3.0, AA body = 4.5.
// We aim higher because of motion/blur and varied photo content.
const TARGETS = {
  headline: 5.5, // serif H3 — generous safety margin
  body: 4.5, // 14.5px body — WCAG AA
};
const WHITE_REL_LUM = 1.0;

// Text band in normalised card coords (0 = top, 1 = bottom). The card uses
// `justify-end` with p-9 + bottom-anchored content; the headline+body+CTA
// roughly occupy the bottom 38% of the card.
const TEXT_BAND = { top: 0.62, bottom: 1.0 };
// Sub-bands so we can score headline vs body separately.
const HEADLINE_BAND = { top: 0.66, bottom: 0.82 };
const BODY_BAND = { top: 0.82, bottom: 0.96 };

// ---- Cards (mirrors src/routes/index.tsx startPaths) ---------------------
// Each entry's `gradient` mirrors the runtime CSS linear-gradient stops
// (to_top means stop 0% = bottom of card, 100% = top). Alpha values are the
// black overlay opacity at that stop.
const CARDS = [
  {
    slug: "signature",
    file: "src/assets/decision-signature.jpg",
    gradient: [
      { pos: 0.0, alpha: 0.94 },
      { pos: 0.22, alpha: 0.86 },
      { pos: 0.55, alpha: 0.55 },
      { pos: 0.8, alpha: 0.35 },
      { pos: 1.0, alpha: 0.45 },
    ],
  },
  {
    slug: "tailor",
    file: "src/assets/decision-tailor.jpg",
    gradient: [
      { pos: 0.0, alpha: 0.8 },
      { pos: 0.28, alpha: 0.62 },
      { pos: 0.6, alpha: 0.32 },
      { pos: 1.0, alpha: 0.18 },
    ],
  },
  {
    slug: "studio",
    file: "src/assets/decision-studio.jpg",
    gradient: [
      { pos: 0.0, alpha: 0.88 },
      { pos: 0.25, alpha: 0.72 },
      { pos: 0.58, alpha: 0.42 },
      { pos: 0.85, alpha: 0.22 },
      { pos: 1.0, alpha: 0.32 },
    ],
  },
  {
    slug: "moment",
    file: "src/assets/decision-moment.jpg",
    gradient: [
      { pos: 0.0, alpha: 0.78 },
      { pos: 0.22, alpha: 0.62 },
      { pos: 0.55, alpha: 0.42 },
      { pos: 0.8, alpha: 0.4 },
      { pos: 1.0, alpha: 0.55 },
    ],
  },
];

// ---- Helpers -------------------------------------------------------------
/** Linear interpolation of gradient alpha at a given position (0..1, 0=bottom). */
function alphaAt(stops, pos) {
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i],
      b = stops[i + 1];
    if (pos >= a.pos && pos <= b.pos) {
      const t = (pos - a.pos) / (b.pos - a.pos || 1);
      return a.alpha + (b.alpha - a.alpha) * t;
    }
  }
  return stops[stops.length - 1].alpha;
}

/** sRGB channel → linear. */
function toLinear(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG. */
function relLum(r, g, b) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio between two relative luminances. */
function contrastRatio(L1, L2) {
  const hi = Math.max(L1, L2),
    lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Composite a black overlay (alpha a) over an sRGB pixel and return the
 * resulting relative luminance. (Black has rgb 0,0,0.)
 */
function overlaidLum(r, g, b, a) {
  const rr = r * (1 - a);
  const gg = g * (1 - a);
  const bb = b * (1 - a);
  return relLum(rr, gg, bb);
}

/** Sample a band, returning {min, mean, max} contrast vs white. */
async function sampleBand(file, gradient, band) {
  const img = sharp(resolve(ROOT, file));
  const meta = await img.metadata();
  const W = meta.width,
    H = meta.height;
  const top = Math.floor(H * band.top);
  const bottom = Math.floor(H * band.bottom);
  const region = await img
    .extract({ left: 0, top, width: W, height: bottom - top })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = region;
  const ch = info.channels; // 3 or 4

  let minC = Infinity,
    maxC = -Infinity,
    sum = 0,
    n = 0;
  // Sample on a coarse grid to keep it fast.
  const step = 4;
  for (let y = 0; y < info.height; y += step) {
    // Position in card coords (0 = bottom of CARD, gradient assumes to_top)
    const cardY = (top + y) / H; // 0..1 from top of card
    const gradPos = 1 - cardY; // bottom-up for `to_top` gradient
    const a = alphaAt(gradient, gradPos);
    for (let x = 0; x < info.width; x += step) {
      const i = (y * info.width + x) * ch;
      const L = overlaidLum(data[i], data[i + 1], data[i + 2], a);
      const c = contrastRatio(WHITE_REL_LUM, L);
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
      sum += c;
      n++;
    }
  }
  return { min: minC, mean: sum / n, max: maxC, samples: n };
}

// ---- Run -----------------------------------------------------------------
const COLOR = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

let failed = 0;
console.log(
  `${COLOR.bold}Decision card contrast check${COLOR.reset} ` +
    `${COLOR.dim}(white text vs gradient-overlaid photo)${COLOR.reset}\n`,
);
console.log(
  `Targets: headline ≥ ${TARGETS.headline.toFixed(1)}:1, ` +
    `body ≥ ${TARGETS.body.toFixed(1)}:1 (worst-pixel)\n`,
);

for (const card of CARDS) {
  const head = await sampleBand(card.file, card.gradient, HEADLINE_BAND);
  const body = await sampleBand(card.file, card.gradient, BODY_BAND);

  const headOk = head.min >= TARGETS.headline;
  const bodyOk = body.min >= TARGETS.body;
  const ok = headOk && bodyOk;
  if (!ok) failed++;

  const tag = ok ? `${COLOR.green}PASS${COLOR.reset}` : `${COLOR.red}FAIL${COLOR.reset}`;
  const fmt = (v, target) => {
    const c = v >= target ? COLOR.green : v >= target * 0.85 ? COLOR.yellow : COLOR.red;
    return `${c}${v.toFixed(2)}:1${COLOR.reset}`;
  };

  console.log(
    `${tag}  ${COLOR.bold}${card.slug.padEnd(10)}${COLOR.reset} ${COLOR.dim}${card.file}${COLOR.reset}`,
  );
  console.log(
    `       headline  worst ${fmt(head.min, TARGETS.headline)}  ` +
      `mean ${head.mean.toFixed(2)}:1  best ${head.max.toFixed(2)}:1`,
  );
  console.log(
    `       body      worst ${fmt(body.min, TARGETS.body)}  ` +
      `mean ${body.mean.toFixed(2)}:1  best ${body.max.toFixed(2)}:1`,
  );

  if (!headOk) {
    const deficit = TARGETS.headline - head.min;
    const suggest = Math.min(0.95, alphaAt(card.gradient, 0.25) + 0.04 + deficit * 0.03);
    console.log(
      `       ${COLOR.yellow}⚠ headline below threshold by ${deficit.toFixed(2)}:1 — ` +
        `try increasing bottom-band alpha toward ~${suggest.toFixed(2)}${COLOR.reset}`,
    );
  }
  if (!bodyOk) {
    const deficit = TARGETS.body - body.min;
    console.log(
      `       ${COLOR.yellow}⚠ body below threshold by ${deficit.toFixed(2)}:1 — ` +
        `darken stops in the 0–25% range or shift mid stop down${COLOR.reset}`,
    );
  }
  console.log();
}

if (failed > 0) {
  console.log(`${COLOR.red}${COLOR.bold}✖ ${failed} card(s) failed contrast.${COLOR.reset}`);
  process.exit(1);
} else {
  console.log(`${COLOR.green}${COLOR.bold}✔ All cards meet legibility thresholds.${COLOR.reset}`);
}
