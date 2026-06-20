/**
 * End-to-end test for `scripts/hero-copy-qa.mjs --report-json-strict`.
 *
 * Spawns the actual script as a subprocess (no mocks) to lock in the CI
 * contract: strict validation must PASS on the unmodified emitter and FAIL
 * with EXIT.RUNTIME_ERROR (3) the moment buildReport's shape diverges from
 * REPORT_SCHEMA. The mutation is applied by writing a forked copy of the
 * script with a single, surgical `targets: targetsOut,` →
 * `targets: targetsOut, _drift: "x",` substitution; the original script on
 * disk is never touched.
 *
 * Network: the script fetches the real production URL. We use --production-only
 * so a single fetch is in play, and we extend the test timeout accordingly.
 * If the network is unavailable the script exits with EXIT.FETCH_ERROR (4)
 * rather than 0/3 — we treat that as an inconclusive run and skip the assert,
 * because the test is about strict-validator behavior, not connectivity.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
// (tmpdir is still used for the report-output dirs in test 1)
import { resolve, join } from "node:path";

const PROJECT_ROOT = resolve(__dirname, "..", "..");
const SCRIPT_PATH = resolve(PROJECT_ROOT, "scripts/hero-copy-qa.mjs");

// EXIT codes mirror the contract documented at the top of the script.
const EXIT_OK = 0;
const EXIT_RUNTIME_ERROR = 3;
const EXIT_FETCH_ERROR = 4;

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runScript(scriptPath: string, args: string[]): RunResult {
  const res = spawnSync("node", [scriptPath, ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    // 60s — production fetch + parse + validate is well under this on a
    // healthy network, but CI runners are sometimes slow to first byte.
    timeout: 60_000,
  });
  return {
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

describe("scripts/hero-copy-qa.mjs --report-json-strict", () => {
  it("passes strict validation against the unmodified emitter", () => {
    const tmp = mkdtempSync(join(tmpdir(), "hero-copy-qa-"));
    try {
      const reportPath = join(tmp, "report.json");
      const { status, stderr } = runScript(SCRIPT_PATH, [
        "--production-only",
        `--report-json=${reportPath}`,
        "--report-json-strict",
      ]);

      if (status === EXIT_FETCH_ERROR) {
        // Network unavailable / production unreachable — strict validation
        // never had a chance to run. Don't assert; skip gracefully.
        console.warn(
          "[hero-copy-qa-script.test] Skipping: production unreachable (EXIT_FETCH_ERROR). stderr:\n" +
            stderr,
        );
        return;
      }

      expect(status, `script exited ${status}; stderr=\n${stderr}`).toBe(EXIT_OK);

      const report = JSON.parse(readFileSync(reportPath, "utf8"));
      expect(report.schema).toBe("hero-copy-qa@1");
      expect(report.exitName).toBe("OK");
      expect(report.mode).toBe("one-shot");
      expect(Array.isArray(report.targets)).toBe(true);
      expect(report.targets.length).toBeGreaterThan(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 90_000);

  it("fails with EXIT_RUNTIME_ERROR when the emitter shape is mutated", () => {
    const tmpReports = mkdtempSync(join(tmpdir(), "hero-copy-qa-mut-"));
    // The mutated script must live in scripts/ so its relative `import
    // "../src/content/hero-copy.ts"` still resolves to the project's source
    // of truth. Putting it under /tmp would break the import path.
    const mutatedScriptPath = resolve(
      PROJECT_ROOT,
      `scripts/.hero-copy-qa.mutated.${process.pid}.${Date.now()}.mjs`,
    );
    try {
      // Surgical mutation: inject an unknown top-level key into the object
      // returned by buildReport. The validator is configured to reject any
      // unknown top-level keys, so this is the minimal change that proves
      // strict actually enforces the schema (rather than always passing).
      const original = readFileSync(SCRIPT_PATH, "utf8");
      const NEEDLE = "targets: targetsOut,";
      expect(
        original.includes(NEEDLE),
        "Test invariant broken: anchor `targets: targetsOut,` not found in script",
      ).toBe(true);
      const mutated = original.replace(
        NEEDLE,
        `targets: targetsOut, _injectedByTest: "should-trip-strict-validator",`,
      );
      writeFileSync(mutatedScriptPath, mutated);

      const reportPath = join(tmpReports, "report.json");
      const { status, stdout, stderr } = runScript(mutatedScriptPath, [
        "--production-only",
        `--report-json=${reportPath}`,
        "--report-json-strict",
      ]);

      if (status === EXIT_FETCH_ERROR) {
        console.warn("[hero-copy-qa-script.test] Skipping mutation case: production unreachable.");
        return;
      }

      expect(
        status,
        `expected EXIT_RUNTIME_ERROR (3); got ${status}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
      ).toBe(EXIT_RUNTIME_ERROR);

      // The strict-validator error message and the offending key must both
      // appear in output (stdout when --report-json=-, otherwise stderr/log).
      const combined = stdout + stderr;
      expect(combined).toMatch(/--report-json-strict/);
      expect(combined).toMatch(/_injectedByTest/);
      expect(combined).toMatch(/unknown top-level key/);
    } finally {
      rmSync(tmpReports, { recursive: true, force: true });
      rmSync(mutatedScriptPath, { force: true });
    }
  }, 90_000);

  it("--report-json-schema prints the strict-validator schema, exits 0, and pins to hero-copy-qa@1", () => {
    // Offline-safe: --report-json-schema must NOT touch the network. We run
    // it without --production-only/--preview-only and still expect EXIT_OK.
    const { status, stdout, stderr } = runScript(SCRIPT_PATH, ["--report-json-schema"]);

    expect(status, `expected EXIT_OK; stderr=\n${stderr}`).toBe(EXIT_OK);

    let parsed: unknown;
    expect(() => {
      parsed = JSON.parse(stdout);
    }, `stdout was not valid JSON:\n${stdout}`).not.toThrow();

    const doc = parsed as { schema?: unknown; shape?: Record<string, unknown> };
    // The whole point of this flag: tests can pin against the schema name
    // emitted by --report-json + --report-json-strict. If buildReport ever
    // bumps to hero-copy-qa@2 without updating consumers, this fails loudly.
    expect(doc.schema).toBe("hero-copy-qa@1");

    // Sanity-check the shape payload so a regression that prints an empty
    // or partial schema doesn't sneak through.
    expect(doc.shape).toBeTypeOf("object");
    expect(Array.isArray(doc.shape?.topKeys)).toBe(true);
    expect(doc.shape?.topKeys).toContain("schema");
    expect(doc.shape?.topKeys).toContain("targets");
    expect(doc.shape?.topKeys).toContain("totals");
    expect(doc.shape?.modes).toEqual(["one-shot", "watch"]);
    expect(doc.shape?.targetStatuses).toContain("drift");
    expect(doc.shape?.targetStatuses).toContain("fetch_failed");
  }, 15_000);
});
