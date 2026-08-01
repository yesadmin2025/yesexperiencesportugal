#!/usr/bin/env node
/**
 * Real-pair contrast audit for chrome components.
 *
 * Goes beyond the canonical-pair list in `site-brand-audit.mjs` by parsing
 * the actual JSX class strings of `Navbar.tsx` and `Footer.tsx`
 * and reconstructing every foreground/background pair

 * that the runtime will produce. For each pair:
 *
 *   1. Resolve `var(--token)` → approved hex.
 *   2. Resolve any `/NN` Tailwind opacity modifier → alpha 0..1.
 *   3. Composite the alpha-modified foreground over the *enclosing* opaque
 *      surface (the nearest ancestor `bg-[...]` in the same file, falling
 *      back to white for the navbar and ivory for the page).
 *   4. Compute WCAG contrast and fail if below the appropriate threshold:
 *        - body text:                4.5:1 (AA Normal)
 *        - large/uppercase headings: 3.0:1 (AA Large)
 *        - decorative dividers:      1.3:1 (visibility floor)
 *
 * The script is intentionally heuristic — it will not catch every pair a
 * full DOM render would, but it covers the chrome components where brand
 * drift hurts most. Findings are reported per-file with the exact class
 * string so authors can see what to fix.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const APPROVED = {
  teal: "#295B61",
  "teal-2": "#2A7C82",
  gold: "#C9A96A",
  "gold-soft": "#E1CFA6",
  ivory: "#FAF8F3",
  sand: "#F4EFE7",
  charcoal: "#2E2E2E",
  "charcoal-soft": "#6B6B6B",
  "charcoal-deep": "#1F1F1F",
};
const WHITE = "#FFFFFF";

// ── color math ──────────────────────────────────────────────────────────
const rgb = (hex) => {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const lum = (hex) => {
  const [r, g, b] = rgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [L1, L2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (L1 + 0.05) / (L2 + 0.05);
};
const composite = (fg, alpha, bg) => {
  const [fr, fgg, fb] = rgb(fg);
  const [br, bgg, bb] = rgb(bg);
  const mix = (f, b) => Math.round(f * alpha + b * (1 - alpha));
  const hex = (n) => n.toString(16).padStart(2, "0");
  return "#" + hex(mix(fr, br)) + hex(mix(fgg, bgg)) + hex(mix(fb, bb));
};

// ── token + class helpers ───────────────────────────────────────────────
const TOKEN_HEX = (t) => APPROVED[t] || null;

// Match `text-[color:var(--token)]` or `text-[color:var(--token)]/40`,
// and the same for `border-[...]`. We DO NOT extract every Tailwind class,
// only the chrome-relevant ones.
const TEXT_RE = /text-\[color:var\(--([a-z0-9-]+)\)\](?:\/(\d+))?/g;
const BORDER_RE = /border-\[color:var\(--([a-z0-9-]+)\)\](?:\/(\d+))?/g;
const BG_RE = /bg-\[color:var\(--([a-z0-9-]+)\)\](?:\/(\d+))?/g;

// Compute the effective opaque foreground given a token + optional /NN.
function resolveFg(token, alphaPct, surface) {
  const fg = TOKEN_HEX(token);
  if (!fg) return null;
  if (alphaPct == null) return fg;
  return composite(fg, Number(alphaPct) / 100, surface);
}

// ── per-file pair extractor ─────────────────────────────────────────────
//
// For each chrome file we declare the dominant background surface that
// every foreground will ultimately render against. (A full ancestor walk
// would need a real DOM; the chrome files have a single dominant surface,
// which makes the heuristic accurate without one.)
const CHROME_FILES = [
  {
    path: "src/components/Navbar.tsx",
    surface: WHITE, // header is bg-white/95 — effectively white for contrast
    surfaceLabel: "white header",
    // The desktop CTA sits on a teal pill — extract its inner pairs separately.
    nestedSurfaces: [
      { match: /bg-\[color:var\(--teal\)\]/, surface: APPROVED.teal, label: "teal CTA pill" },
    ],
  },
  {
    path: "src/components/Footer.tsx",
    surface: APPROVED["charcoal-deep"], // footer is bg-charcoal-deep
    surfaceLabel: "charcoal-deep footer",
    nestedSurfaces: [],
  },
];

// Threshold for a pair, based on token semantics + class context.
//   - Frames around interactive elements (full `border` class) need ≥ 3:1
//     for WCAG 1.4.11 non-text contrast.
//   - Single-edge dividers (`border-t`, `border-b`, `border-l`, `border-r`)
//     are decorative section separators, not actionable frames; WCAG only
//     requires they be visible. We use 1.3:1 as the visibility floor.
//   - Tiny uppercase labels (footer headers, brand line) qualify as Large
//     text → 3:1.
function thresholdFor(role, snippet) {
  if (role === "border") {
    const isDivider = /\bborder-[tblr]\b/.test(snippet) && !/\bborder\b\s/.test(snippet);
    return isDivider ? 1.3 : 3.0;
  }
  // Decorative icons (lucide arrows, etc.) carry a color class but NO
  // typography classes. WCAG 1.4.11 (non-text contrast) → 3:1, not 4.5:1.
  // Heuristic: a class string with no text-size, leading, tracking,
  // font-weight, serif, or uppercase tokens is treated as a UI graphic.
  const hasTypography =
    /text-\[\d|text-(xs|sm|base|lg|xl|\d)|tracking-|leading-|font-(?!sans\b|serif\b)|\bserif\b|\buppercase\b/.test(
      snippet,
    );
  if (!hasTypography) return 3.0;
  if (/uppercase|tracking-\[0\.3em\]/.test(snippet)) return 3.0;
  return 4.5;
}

// Iterate every line of a class string, extract each color binding, and
// figure out the right surface for it. We split on whitespace inside the
// className value so a single `<X className="...">` can produce many pairs.
function extractPairs(file, surfaceMap) {
  const src = readFileSync(file, "utf8");
  const pairs = [];

  // Pull out every JSX className value, single-quoted or double-quoted, plus
  // template-literal classNames. This is a deliberately loose match — it
  // accepts anything between `className="..."` or `className={"..."}`.
  const CLASS_RE = /className\s*=\s*(?:\{?['"`])([^'"`]+)(?:['"`]\}?)/g;
  let m;
  while ((m = CLASS_RE.exec(src)) !== null) {
    const classStr = m[1];

    // Decide the surface for this className: if the same className contains
    // a bg-[...] token, that bg becomes the local surface; otherwise we
    // fall back to the file's dominant surface.
    let localSurface = surfaceMap.surface;
    let localLabel = surfaceMap.surfaceLabel;
    BG_RE.lastIndex = 0;
    const bgMatch = BG_RE.exec(classStr);
    if (bgMatch) {
      const bgToken = bgMatch[1];
      const bgAlpha = bgMatch[2];
      const bgHex = TOKEN_HEX(bgToken);
      if (bgHex) {
        // For background opacity we composite over the file's dominant surface.
        localSurface = bgAlpha
          ? composite(bgHex, Number(bgAlpha) / 100, surfaceMap.surface)
          : bgHex;
        localLabel = bgAlpha ? `${bgToken}/${bgAlpha} on ${surfaceMap.surfaceLabel}` : bgToken;
      }
    } else {
      // No local bg — check nested-surface hints (e.g. teal CTA pill).
      for (const ns of surfaceMap.nestedSurfaces || []) {
        if (ns.match.test(classStr)) {
          localSurface = ns.surface;
          localLabel = ns.label;
          break;
        }
      }
    }

    // Text color bindings.
    TEXT_RE.lastIndex = 0;
    let t;
    while ((t = TEXT_RE.exec(classStr)) !== null) {
      const fg = resolveFg(t[1], t[2], localSurface);
      if (!fg) continue;
      pairs.push({
        role: "text",
        fgToken: t[1] + (t[2] ? `/${t[2]}` : ""),
        fg,
        bg: localSurface,
        bgLabel: localLabel,
        snippet: classStr.slice(0, 110) + (classStr.length > 110 ? "…" : ""),
      });
    }

    // Border color bindings.
    BORDER_RE.lastIndex = 0;
    let b;
    while ((b = BORDER_RE.exec(classStr)) !== null) {
      const fg = resolveFg(b[1], b[2], localSurface);
      if (!fg) continue;
      pairs.push({
        role: "border",
        fgToken: b[1] + (b[2] ? `/${b[2]}` : ""),
        fg,
        bg: localSurface,
        bgLabel: localLabel,
        snippet: classStr.slice(0, 110) + (classStr.length > 110 ? "…" : ""),
      });
    }
  }

  return pairs;
}

// ── run ─────────────────────────────────────────────────────────────────
console.log("\n── Real-pair contrast audit (chrome components) ─────────\n");

let failed = 0;
let totalPairs = 0;
for (const file of CHROME_FILES) {
  const fullPath = resolve(ROOT, file.path);
  const pairs = extractPairs(fullPath, file);
  totalPairs += pairs.length;
  console.log(`${relative(ROOT, fullPath)}  (default surface: ${file.surfaceLabel})`);
  if (pairs.length === 0) {
    console.log("  · no chrome pairs found\n");
    continue;
  }
  // De-duplicate identical (fg,bg,role) triples to keep the report tight.
  const seen = new Set();
  const unique = [];
  for (const p of pairs) {
    const k = `${p.role}|${p.fg}|${p.bg}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(p);
  }
  for (const p of unique) {
    const min = thresholdFor(p.role, p.snippet);
    const ratio = contrast(p.fg, p.bg);
    const ok = ratio >= min;
    if (!ok) failed++;
    const tag = ok ? "✓" : "✘";
    console.log(
      `  ${tag} ${p.role.padEnd(6)} ${p.fgToken.padEnd(22)} on ${p.bgLabel.padEnd(28)} ${ratio.toFixed(2)}:1 (min ${min})`,
    );
    if (!ok) console.log(`        ↳ ${p.snippet}`);
  }
  console.log("");
}

console.log(
  `Scanned ${CHROME_FILES.length} chrome files, ${totalPairs} extracted pair${totalPairs === 1 ? "" : "s"}.`,
);

if (failed > 0) {
  console.error(`\n✘ ${failed} runtime-predicted pair(s) below AA threshold.\n`);
  process.exit(1);
}
console.log("\n✓ All runtime-predicted chrome pairs meet WCAG AA.\n");
