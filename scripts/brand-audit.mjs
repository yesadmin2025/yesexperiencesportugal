#!/usr/bin/env node
/**
 * Build-time brand color scanner.
 *
 * Walks src/ for .tsx/.ts/.css/.json files, extracts every hex code
 * (#rgb / #rrggbb), and writes a JSON report to src/generated/brand-audit.json.
 *
 * The /brand-qa page imports that report and renders it. Run automatically
 * on `bun dev` and `bun build` via the prebuild/predev hooks.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT_DIR = join(SRC, "generated");
const OUT_FILE = join(OUT_DIR, "brand-audit.json");

const APPROVED = {
  teal: "#295B61",
  "teal-2": "#2A7C82",
  gold: "#C9A96A",
  "gold-soft": "#E1CFA6",
  ivory: "#FAF8F3",
  sand: "#F4EFE7",
  charcoal: "#2E2E2E",
  "charcoal-soft": "#6B6B6B",
};
const APPROVED_SET = new Set(Object.values(APPROVED).map((h) => h.toLowerCase()));

// Allowed neutrals + framework defaults that aren't brand drift.
const ALLOWLIST_RAW = ["#000", "#000000", "#fff", "#ffffff", "#1f1f1f", "#ccc"];
const ALLOWLIST = new Set(ALLOWLIST_RAW.map((h) => normalize(h)));

const EXTS = new Set([".tsx", ".ts", ".css", ".json"]);
const SKIP_DIRS = new Set(["generated", "node_modules", "components/ui"]);
const SKIP_FILES = new Set(["routeTree.gen.ts"]);

const HEX = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

function normalize(h) {
  let s = h.toLowerCase();
  if (s.length === 4)
    s =
      "#" +
      s
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("");
  return s;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(SRC, p);
    if (SKIP_DIRS.has(name) || SKIP_DIRS.has(rel)) continue;
    if (SKIP_FILES.has(name)) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(p))) out.push(p);
  }
  return out;
}

const findings = [];
let scanned = 0;

for (const file of walk(SRC)) {
  scanned++;
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    let m;
    HEX.lastIndex = 0;
    while ((m = HEX.exec(line)) !== null) {
      const raw = m[0];
      const norm = normalize(raw);
      const approved = APPROVED_SET.has(norm);
      const allowlisted = ALLOWLIST.has(norm);
      findings.push({
        file: relative(ROOT, file),
        line: i + 1,
        col: m.index + 1,
        raw,
        normalized: norm,
        snippet: line.trim().slice(0, 160),
        status: approved ? "approved" : allowlisted ? "allowlisted" : "mismatch",
      });
    }
  });
}

const counts = {
  total: findings.length,
  approved: findings.filter((f) => f.status === "approved").length,
  allowlisted: findings.filter((f) => f.status === "allowlisted").length,
  mismatch: findings.filter((f) => f.status === "mismatch").length,
};

const body = {
  filesScanned: scanned,
  approvedPalette: APPROVED,
  allowlist: [...ALLOWLIST],
  counts,
  findings,
};

mkdirSync(OUT_DIR, { recursive: true });

// Keep the artifact deterministic: `generatedAt` only moves when the audit
// result actually changes. Otherwise every prebuild produced a timestamp-only
// diff, which buried real findings in commit noise.
let generatedAt = new Date().toISOString();
try {
  const previous = JSON.parse(readFileSync(OUT_FILE, "utf8"));
  const { generatedAt: previousStamp, ...previousBody } = previous;
  if (previousStamp && JSON.stringify(previousBody) === JSON.stringify(body)) {
    generatedAt = previousStamp;
  }
} catch {
  /* no previous report — first run */
}

const report = { generatedAt, ...body };
const serialized = JSON.stringify(report, null, 2);

// PROTECTED ARTIFACT CONTRACT.
// `src/generated/brand-audit.json` is a committed, byte-protected artifact.
// A normal `predev` / `prebuild` run must therefore NEVER write it: the audit
// runs in CHECK mode and only reports. Regenerating the committed baseline is
// an explicit, deliberate act: `bun run brand:audit -- --write`.
const WRITE = process.argv.includes("--write");
let drifted = false;
try {
  drifted = readFileSync(OUT_FILE, "utf8") !== serialized;
} catch {
  drifted = true; // no artifact yet
}

if (WRITE) {
  writeFileSync(OUT_FILE, serialized);
} else if (drifted) {
  console.log(
    `[brand-audit] report drift vs committed artifact (line numbers / files scanned). ` +
      `Not written — run \`bun run brand:audit -- --write\` to refresh it deliberately.`,
  );
}

const tag = counts.mismatch === 0 ? "PASS" : "MISMATCH";
console.log(
  `[brand-audit] ${tag} — scanned ${scanned} files, ${counts.total} hex refs ` +
    `(${counts.approved} approved, ${counts.allowlisted} allowlisted, ${counts.mismatch} mismatch). ` +
    `Report: ${relative(ROOT, OUT_FILE)}`,
);
