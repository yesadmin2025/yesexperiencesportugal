#!/usr/bin/env node
// Fail-fast CSS brace/paren/bracket balance check.
// Catches missing "}" like the routeFadeIn regression before Tailwind's
// compiler produces its cryptic "Missing closing }" build error.
import { readFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOTS = ["src"];
const EXT = /\.(css|pcss|scss)$/i;

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else if (EXT.test(entry.name)) out.push(p);
  }
  return out;
}

// Strip comments and string literals so their braces don't count.
function sanitize(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

function checkBalance(src) {
  const pairs = { "}": "{", ")": "(", "]": "[" };
  const stack = [];
  let line = 1,
    col = 0;
  const openLines = new Map(); // index -> {line, col, ch}
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "\n") {
      line++;
      col = 0;
      continue;
    }
    col++;
    if (c === "{" || c === "(" || c === "[") {
      stack.push({ ch: c, line, col });
    } else if (c === "}" || c === ")" || c === "]") {
      const top = stack.pop();
      if (!top || top.ch !== pairs[c]) {
        return {
          ok: false,
          reason:
            `Unexpected '${c}' at line ${line}:${col}` +
            (top ? ` (opened '${top.ch}' at ${top.line}:${top.col})` : ""),
        };
      }
    }
  }
  if (stack.length) {
    const t = stack[stack.length - 1];
    return { ok: false, reason: `Unclosed '${t.ch}' opened at line ${t.line}:${t.col}` };
  }
  return { ok: true };
}

let failed = 0;
for (const root of ROOTS) {
  try {
    statSync(root);
  } catch {
    continue;
  }
  const files = await walk(root);
  for (const f of files) {
    const src = sanitize(readFileSync(f, "utf8"));
    const r = checkBalance(src);
    if (!r.ok) {
      console.error(`\u001b[31m[css-braces] ${relative(process.cwd(), f)}: ${r.reason}\u001b[0m`);
      failed++;
    }
  }
}
if (failed) {
  console.error(`\n[css-braces] ${failed} file(s) failed brace balance check.`);
  process.exit(1);
}
console.log("[css-braces] All CSS files balanced.");
