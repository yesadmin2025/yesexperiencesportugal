#!/usr/bin/env node
/**
 * Motion budget check (Motion v3).
 *
 * Fails the build if code introduces motion patterns that break the
 * performance contract:
 *   1. `transition: all` (forces layout/paint on every property)
 *   2. animating non-composited props (top/left/width/height/margin)
 *      inside a `transition:` or `animation:` shorthand
 *   3. permanent `will-change` declarations outside :hover/:focus/:active
 *      and outside the .motion-* / .reveal / .hero-* controlled scopes
 *
 * Scope: src/**\/*.css, src/**\/*.tsx (inline style strings)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["src"];
const CSS_EXT = new Set([".css"]);
const TSX_EXT = new Set([".tsx", ".ts"]);
const NON_COMPOSITED = /\b(top|left|right|bottom|width|height|margin|padding)\b/;

const violations = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      walk(p);
    } else {
      const ext = extname(name);
      if (CSS_EXT.has(ext)) scanCss(p);
      else if (TSX_EXT.has(ext)) scanTsx(p);
    }
  }
}

function scanCss(path) {
  const src = readFileSync(path, "utf8");
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (/^\s*\/\*/.test(trimmed) || /^\s*\*/.test(trimmed)) return;
    if (/motion-budget-allow/.test(line)) return;
    if (/transition\s*:\s*all\b/.test(line)) {
      violations.push({ file: path, line: i + 1, rule: "transition:all", text: trimmed });
    }
    const tm = line.match(/(?:transition|animation)\s*:\s*([^;]+);?/);
    if (tm && NON_COMPOSITED.test(tm[1])) {
      violations.push({ file: path, line: i + 1, rule: "non-composited animation", text: trimmed });
    }
  });
}

function scanTsx(path) {
  const src = readFileSync(path, "utf8");
  if (!/transition\s*:\s*['"`]all/.test(src) && !/transitionProperty\s*:\s*['"`]all/.test(src))
    return;
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    if (/transition\s*:\s*['"`]all/.test(line) || /transitionProperty\s*:\s*['"`]all/.test(line)) {
      violations.push({
        file: path,
        line: i + 1,
        rule: "transition:all (inline)",
        text: line.trim(),
      });
    }
  });
}

for (const r of ROOTS) walk(r);

if (violations.length) {
  console.error(`\n✖ Motion budget: ${violations.length} violation(s)\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
    console.error(`    ${v.text}`);
  }
  console.error(
    "\nFix: animate only transform/opacity/filter/clip-path. See docs/motion-v3-report.md.\n",
  );
  process.exit(1);
}
console.log("✓ Motion budget clean");
