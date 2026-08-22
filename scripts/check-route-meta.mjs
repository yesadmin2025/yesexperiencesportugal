#!/usr/bin/env node
/**
 * check-route-meta.mjs — publish-gate validation for per-route head() metadata.
 *
 * Prevents the SEO regressions that keep resurfacing in scans:
 *   1. Duplicate <title> across distinct routes (the studio redirect family).
 *   2. Duplicate og:title / og:description across distinct routes.
 *   3. Missing description / og:title / og:description on indexable routes.
 *
 * Static, dependency-free parse of src/routes/*.tsx. Values built from
 * template literals or variables are treated as DYNAMIC: they count as
 * "present" but are excluded from duplicate comparison, since they resolve
 * per-param at runtime.
 *
 * Runs in predev / prebuild. Exits non-zero on any violation.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROUTES_DIR = join(process.cwd(), "src", "routes");

/** Route files that legitimately carry no head() metadata. */
const EXEMPT_PATTERNS = [
  /^__root\.tsx$/,
  /^api[./]/, // server routes / raw HTTP handlers
  /^admin[./]/, // authenticated internal tooling
  /^_authenticated[./]/,
  /\[\.\]/, // sitemap[.]xml and friends
  /^\$\.tsx$/, // splat / not-found
];

const DYNAMIC = Symbol("dynamic");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** Extract the balanced `head:` option body from a route module source. */
function extractHeadBlock(source) {
  const start = source.search(/\bhead\s*:\s*\(/);
  if (start === -1) return null;
  const open = source.indexOf("{", source.indexOf("=>", start));
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

/** Read a string-literal value, or DYNAMIC when it is computed. */
function readValue(raw) {
  const trimmed = raw.trim();
  const literal = /^(["'])((?:\\.|(?!\1).)*)\1$/.exec(trimmed);
  if (literal) return literal[2].replace(/\\(["'])/g, "$1");
  return DYNAMIC;
}

function findTitle(head) {
  const m = /\btitle\s*:\s*(`[^`]*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^,}\n]+)/.exec(head);
  return m ? readValue(m[1]) : null;
}

function findMeta(head, kind, key) {
  const re = new RegExp(
    `${kind}\\s*:\\s*["']${key}["']\\s*,\\s*content\\s*:\\s*(\`[^\`]*\`|"(?:\\\\.|[^"])*"|'(?:\\\\.|[^'])*'|[^,}\\n]+)`,
  );
  const m = re.exec(head);
  return m ? readValue(m[1]) : null;
}

const files = walk(ROUTES_DIR)
  .map((f) => relative(ROUTES_DIR, f))
  .filter((f) => !EXEMPT_PATTERNS.some((p) => p.test(f)))
  .sort();

const errors = [];
const routes = [];

for (const file of files) {
  const source = readFileSync(join(ROUTES_DIR, file), "utf8");
  if (!/createFileRoute\s*\(/.test(source)) continue;

  const head = extractHeadBlock(source);
  if (!head) {
    errors.push(`${file}: route has no head() metadata — add title, description and og tags.`);
    continue;
  }

  const noindex = /content\s*:\s*["'][^"']*noindex/.test(head);
  const entry = {
    file,
    noindex,
    title: findTitle(head),
    description: findMeta(head, "name", "description"),
    ogTitle: findMeta(head, "property", "og:title"),
    ogDescription: findMeta(head, "property", "og:description"),
  };
  routes.push(entry);

  const required = noindex
    ? ["title", "description"]
    : ["title", "description", "ogTitle", "ogDescription"];
  for (const field of required) {
    if (entry[field] == null) errors.push(`${file}: missing ${field}.`);
  }
}

// Duplicate detection across literal (non-dynamic) values only.
const FIELD_LABELS = {
  title: "title",
  description: "description",
  ogTitle: "og:title",
  ogDescription: "og:description",
};

for (const [field, label] of Object.entries(FIELD_LABELS)) {
  const seen = new Map();
  for (const route of routes) {
    const value = route[field];
    if (typeof value !== "string" || value.length === 0) continue;
    const bucket = seen.get(value) ?? [];
    bucket.push(route.file);
    seen.set(value, bucket);
  }
  for (const [value, owners] of seen) {
    if (owners.length > 1) {
      errors.push(`duplicate ${label} "${value}" shared by: ${owners.join(", ")}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`\n✖ route meta check failed (${errors.length} issue(s)):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nEvery route needs its own title/description/og pair. See head-meta rules.\n");
  process.exit(1);
}

console.log(`✔ route meta check passed — ${routes.length} routes, no duplicate or missing tags.`);
