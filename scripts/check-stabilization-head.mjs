#!/usr/bin/env node
/**
 * Pre-test gate: the working checkout must sit ON TOP OF (or exactly at) the
 * target stabilization commit before the Studio V3 core E2E group is trusted.
 *
 * Platform auto-commits above the target are fine — they are descendants.
 * A checkout that does NOT contain the target commit aborts with exit 1.
 *
 * Target resolution order:
 *   1. --commit <sha> / STABILIZATION_COMMIT env
 *   2. .lovable/stabilization-commit (first non-comment line)
 *
 * Usage:
 *   node scripts/check-stabilization-head.mjs
 *   node scripts/check-stabilization-head.mjs --commit 652a4f5
 *   STABILIZATION_COMMIT=652a4f5 node scripts/check-stabilization-head.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const TARGET_FILE = ".lovable/stabilization-commit";

function git(args) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  return { status: r.status ?? 1, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}

function resolveTarget() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--commit");
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  if (process.env.STABILIZATION_COMMIT) return process.env.STABILIZATION_COMMIT;
  if (existsSync(TARGET_FILE)) {
    const line = readFileSync(TARGET_FILE, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("#"));
    if (line) return line.split(/\s+/)[0];
  }
  return null;
}

const target = resolveTarget();
if (!target) {
  console.error(
    `[head-gate] ABORT — no target stabilization commit. Set STABILIZATION_COMMIT, pass --commit <sha>, or create ${TARGET_FILE}.`,
  );
  process.exit(1);
}

const head = git(["rev-parse", "HEAD"]);
if (head.status !== 0) {
  console.error(`[head-gate] ABORT — not a git checkout: ${head.err}`);
  process.exit(1);
}

const targetFull = git(["rev-parse", `${target}^{commit}`]);
if (targetFull.status !== 0) {
  console.error(
    `[head-gate] ABORT — target commit ${target} is not present in this checkout (fetch main first).`,
  );
  process.exit(1);
}

const ancestor = git(["merge-base", "--is-ancestor", targetFull.out, head.out]);
const status = git(["status", "--porcelain"]);

console.log(`[head-gate] target : ${targetFull.out}`);
console.log(`[head-gate] HEAD   : ${head.out}`);
if (status.out) {
  console.log(`[head-gate] working tree is DIRTY:\n${status.out}`);
} else {
  console.log("[head-gate] working tree clean");
}

if (ancestor.status !== 0) {
  console.error(
    "[head-gate] ABORT — HEAD does not contain the target stabilization commit. Do not reconcile by editing files; fetch/checkout main.",
  );
  process.exit(1);
}

if (head.out === targetFull.out) {
  console.log("[head-gate] OK — HEAD is exactly the target commit.");
} else {
  const ahead = git(["rev-list", "--count", `${targetFull.out}..${head.out}`]);
  console.log(`[head-gate] OK — HEAD is ${ahead.out} commit(s) above the target.`);
  const log = git(["log", "--oneline", `${targetFull.out}..${head.out}`]);
  if (log.out) console.log(log.out.replace(/^/gm, "           "));
}
