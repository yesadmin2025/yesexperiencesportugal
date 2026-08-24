#!/usr/bin/env node
/**
 * Resolve (and optionally run) the historical Studio V3 "core group" of
 * Playwright specs.
 *
 * The group is declared once here by intent, resolved against what actually
 * exists on disk, printed, and only then handed to Playwright — so a renamed
 * spec surfaces as an explicit resolution error instead of a silent
 * "0 tests ran".
 *
 * Usage:
 *   node scripts/studio-v3-core-group.mjs                 # print resolution only
 *   node scripts/studio-v3-core-group.mjs --run           # print, then run
 *   node scripts/studio-v3-core-group.mjs --run -- --headed
 *
 * Flags:
 *   --run             run the resolved group after printing
 *   --json            print machine-readable resolution
 *   --check-head      run scripts/check-stabilization-head.mjs first (aborts on drift)
 *
 * When run with --run, results are written to src/generated/e2e-last-run.json
 * (see scripts/e2e-report-write.mjs) for the /admin/e2e-report page.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const E2E_DIR = path.resolve("e2e");

/**
 * Intent-level declaration. `id` is a stable slug; `expectedTests` is the
 * historical per-file test count (used to explain aggregate drift, never to
 * invent numbers).
 */
export const CORE_GROUP = [
  { id: "studio-v3-p0-storytelling-reveal-mobile", expectedTests: 1 },
  { id: "studio-v3-no-moments-loop-mobile", expectedTests: 2 },
  { id: "studio-v3-let-yes-decide-mobile", expectedTests: 1 },
  { id: "studio-v3-mobile-guest-to-checkout", expectedTests: 1 },
  { id: "studio-v3-reveal-and-guest-details-mobile", expectedTests: 3 },
  { id: "studio-v3-cta-navigation-mobile", expectedTests: 4 },
];

export const EXPECTED_TOTAL_TESTS = CORE_GROUP.reduce((n, s) => n + s.expectedTests, 0);

function specFiles() {
  if (!existsSync(E2E_DIR)) return [];
  return readdirSync(E2E_DIR).filter((f) => f.endsWith(".spec.ts"));
}

/** Resolve one declared id to an on-disk spec path. */
function resolveOne(id, files) {
  const exact = `${id}.spec.ts`;
  if (files.includes(exact)) return { id, file: path.join("e2e", exact), match: "exact" };

  // Tolerate small renames: same tokens, different order/separators.
  const tokens = id.split("-").filter(Boolean);
  const near = files.filter((f) => tokens.every((t) => f.includes(t)));
  if (near.length === 1) return { id, file: path.join("e2e", near[0]), match: "fuzzy" };
  if (near.length > 1) {
    return { id, file: null, match: "ambiguous", candidates: near.map((f) => path.join("e2e", f)) };
  }
  return { id, file: null, match: "missing", candidates: [] };
}

export function resolveCoreGroup() {
  const files = specFiles();
  const resolved = CORE_GROUP.map((s) => ({ ...resolveOne(s.id, files), ...s }));
  return {
    resolved,
    files: resolved.filter((r) => r.file).map((r) => r.file),
    problems: resolved.filter((r) => !r.file),
    expectedTotalTests: EXPECTED_TOTAL_TESTS,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const passthroughAt = argv.indexOf("--");
  const flags = passthroughAt === -1 ? argv : argv.slice(0, passthroughAt);
  const passthrough = passthroughAt === -1 ? [] : argv.slice(passthroughAt + 1);

  const result = resolveCoreGroup();

  if (flags.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("[core-group] resolved Studio V3 core group:");
    for (const r of result.resolved) {
      const label = r.file ?? `UNRESOLVED (${r.match})`;
      console.log(`  - ${label}  (${r.expectedTests} test${r.expectedTests === 1 ? "" : "s"})`);
      if (!r.file && r.candidates?.length) {
        console.log(`      candidates: ${r.candidates.join(", ")}`);
      }
    }
    console.log(
      `[core-group] ${result.files.length}/${CORE_GROUP.length} files resolved · historical aggregate ${EXPECTED_TOTAL_TESTS} tests`,
    );
  }

  if (result.problems.length) {
    console.error(
      `[core-group] ABORT — could not resolve: ${result.problems.map((p) => p.id).join(", ")}`,
    );
    process.exit(1);
  }

  if (!flags.includes("--run")) return;

  if (flags.includes("--check-head")) {
    const gate = spawnSync(process.execPath, ["scripts/check-stabilization-head.mjs"], {
      stdio: "inherit",
      env: process.env,
    });
    if (gate.status !== 0) process.exit(gate.status ?? 1);
  }

  const jsonOut = path.resolve("/tmp/e2e-core-group.json");
  const args = [
    "playwright",
    "test",
    "--config=playwright.local.config.ts",
    "--project=mobile-chromium",
    "--timeout=200000",
    "--reporter=list,json",
    ...result.files,
    ...passthrough,
  ];
  console.log(`[core-group] bunx ${args.join(" ")}`);
  const run = spawnSync("bunx", args, {
    stdio: "inherit",
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: jsonOut },
  });

  spawnSync(process.execPath, ["scripts/e2e-report-write.mjs", jsonOut], {
    stdio: "inherit",
    env: process.env,
  });

  process.exit(run.status ?? 1);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
