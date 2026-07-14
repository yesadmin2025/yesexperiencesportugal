#!/usr/bin/env node
/**
 * scan-image-duplicates.mjs
 *
 * Full-site image duplication scan. Walks src/routes, src/components,
 * src/content, and reports every image asset that is imported from more
 * than one call-site — grouped by asset, with each usage's file:line
 * and the surrounding role heuristic (og:image / hero / card / gallery).
 *
 * Emits Markdown to stdout and JSON to .lovable/image-duplication-report.json.
 *
 * Run: `node scripts/scan-image-duplicates.mjs`
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src/routes", "src/components", "src/content"];
const EXT = /\.(t|j)sx?$/;
const IMG_IMPORT = /import\s+(\w+)\s+from\s+["']([^"']+\.(?:jpg|jpeg|png|webp|avif)(?:\.asset\.json)?)["']/g;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p, out);
    else if (EXT.test(name)) out.push(p);
  }
  return out;
}

/** Guess the role a given import is playing based on nearby JSX/usage. */
function roleFor(src, ident) {
  const usageRe = new RegExp(`\\b${ident}\\b`, "g");
  const usages = [];
  let m;
  while ((m = usageRe.exec(src))) {
    if (usages.length > 8) break;
    const before = src.slice(Math.max(0, m.index - 120), m.index);
    const after = src.slice(m.index, m.index + 120);
    const ctx = (before + after).toLowerCase();
    let role = "usage";
    if (/og:image|ogimg|ogImg/.test(ctx)) role = "og:image";
    else if (/hero\b/.test(ctx)) role = "hero";
    else if (/gallery/.test(ctx)) role = "gallery";
    else if (/card|editorial/.test(ctx)) role = "card";
    usages.push(role);
  }
  return usages;
}

function lineOf(src, offset) {
  return src.slice(0, offset).split("\n").length;
}

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
/** @type {Map<string, {file:string; line:number; ident:string; roles:string[]}[]>} */
const byAsset = new Map();

for (const file of files) {
  const src = readFileSync(file, "utf8");
  IMG_IMPORT.lastIndex = 0;
  let m;
  while ((m = IMG_IMPORT.exec(src))) {
    const [, ident, spec] = m;
    // Normalise: strip trailing .asset.json since both forms reference the
    // same physical image bank entry.
    const key = spec.replace(/\.asset\.json$/, "");
    const arr = byAsset.get(key) ?? [];
    arr.push({
      file: relative(ROOT, file),
      line: lineOf(src, m.index),
      ident,
      roles: roleFor(src, ident),
    });
    byAsset.set(key, arr);
  }
}

const duplicates = [...byAsset.entries()]
  .filter(([, uses]) => uses.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

const report = {
  scannedFiles: files.length,
  totalAssets: byAsset.size,
  duplicatedAssets: duplicates.length,
  duplicates: duplicates.map(([asset, uses]) => ({ asset, uses })),
};

try { mkdirSync(join(ROOT, ".lovable"), { recursive: true }); } catch {}
writeFileSync(
  join(ROOT, ".lovable/image-duplication-report.json"),
  JSON.stringify(report, null, 2),
);

// Markdown to stdout.
const lines = [];
lines.push(`# Image duplication report`);
lines.push(``);
lines.push(`- Files scanned: **${files.length}**`);
lines.push(`- Unique image assets imported: **${byAsset.size}**`);
lines.push(`- Assets imported from 2+ call sites: **${duplicates.length}**`);
lines.push(``);
if (duplicates.length === 0) {
  lines.push(`✓ No duplicated imports detected.`);
} else {
  for (const [asset, uses] of duplicates) {
    lines.push(`## \`${asset}\` — ${uses.length} usages`);
    for (const u of uses) {
      const roles = u.roles.length ? ` _(${[...new Set(u.roles)].join(", ")})_` : "";
      lines.push(`- \`${u.file}:${u.line}\` → \`${u.ident}\`${roles}`);
    }
    lines.push(``);
  }
}
process.stdout.write(lines.join("\n") + "\n");
