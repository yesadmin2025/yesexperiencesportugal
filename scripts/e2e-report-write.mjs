#!/usr/bin/env node
/**
 * Convert a Playwright JSON report into the compact summary consumed by
 * /admin/e2e-report.
 *
 * Usage: node scripts/e2e-report-write.mjs /tmp/e2e-core-group.json
 * Output: src/generated/e2e-last-run.json
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const input = process.argv[2] ?? "/tmp/e2e-core-group.json";
const OUT = path.resolve("src/generated/e2e-last-run.json");

if (!existsSync(input)) {
  console.error(`[e2e-report] no JSON report at ${input} — skipping summary write.`);
  process.exit(0);
}

/** @type {any} */
let report;
try {
  report = JSON.parse(readFileSync(input, "utf8"));
} catch (err) {
  console.error(`[e2e-report] unreadable JSON report: ${String(err)}`);
  process.exit(0);
}

const tests = [];

function walkSuite(suite, filePath) {
  const file = suite.file ?? filePath ?? "";
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const last = (test.results ?? []).at(-1) ?? {};
      const errors = (last.errors ?? [])
        .map((e) => (e.message ?? "").replace(/\u001b\[[0-9;]*m/g, "").trim())
        .filter(Boolean);
      tests.push({
        file: file.replace(/^.*?e2e\//, "e2e/"),
        title: spec.title,
        status: test.status ?? last.status ?? "unknown",
        durationMs: last.duration ?? 0,
        retries: Math.max(0, (test.results ?? []).length - 1),
        errors: errors.slice(0, 3),
      });
    }
  }
  for (const child of suite.suites ?? []) walkSuite(child, file);
}

for (const suite of report.suites ?? []) walkSuite(suite);

const counts = tests.reduce((acc, t) => {
  acc[t.status] = (acc[t.status] ?? 0) + 1;
  return acc;
}, {});

const summary = {
  generatedAt: new Date().toISOString(),
  startedAt: report.stats?.startTime ?? null,
  durationMs: Math.round(report.stats?.duration ?? tests.reduce((n, t) => n + t.durationMs, 0)),
  total: tests.length,
  passed: counts.expected ?? counts.passed ?? 0,
  failed: (counts.unexpected ?? 0) + (counts.failed ?? 0),
  flaky: counts.flaky ?? 0,
  skipped: counts.skipped ?? 0,
  tests,
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(summary, null, 2)}\n`);
console.log(
  `[e2e-report] wrote ${path.relative(process.cwd(), OUT)} — ${summary.passed} passed, ${summary.failed} failed, ${summary.total} total.`,
);
