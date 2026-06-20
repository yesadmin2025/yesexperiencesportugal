#!/usr/bin/env node
/**
 * Pre-flight: verify the Playwright Chromium headless shell can resolve
 * its system libraries (libglib, libnss, libdbus, libatk, etc.) before
 * tests boot. On sandboxes / minimal containers the bundled binary
 * silently exits with `error while loading shared libraries: libglib-2.0.so.0`
 * and the test run dies with `Target page, context or browser has been closed`.
 *
 * This script:
 *   1. Resolves the Chromium binary Playwright will use
 *      (PLAYWRIGHT_CHROMIUM_PATH if set, else the cached headless shell).
 *   2. Runs `ldd` against it and surfaces every "not found" line.
 *   3. Suggests two remediations: install system deps with
 *      `bunx playwright install --with-deps chromium`, or point
 *      PLAYWRIGHT_CHROMIUM_PATH at a system Chromium (/bin/chromium).
 *
 * It NEVER fails the run — CI runners (ubuntu-latest with `--with-deps`)
 * have all libs and don't need warnings; local sandboxes get an actionable
 * heads-up instead of an opaque crash.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function findHeadlessShell() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH && existsSync(process.env.PLAYWRIGHT_CHROMIUM_PATH)) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  const cacheRoot = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(cacheRoot)) return null;
  const dirs = readdirSync(cacheRoot).filter((d) => d.startsWith("chromium-headless-shell-"));
  for (const d of dirs) {
    const bin = join(cacheRoot, d, "chrome-headless-shell-linux64", "chrome-headless-shell");
    if (existsSync(bin)) return bin;
  }
  const chromiumDirs = readdirSync(cacheRoot).filter((d) => d.startsWith("chromium-"));
  for (const d of chromiumDirs) {
    const bin = join(cacheRoot, d, "chrome-linux", "chrome");
    if (existsSync(bin)) return bin;
  }
  return null;
}

function main() {
  const bin = findHeadlessShell();
  if (!bin) {
    // Nothing to check — install hasn't run yet. Quiet exit.
    return;
  }

  const ldd = spawnSync("ldd", [bin], { encoding: "utf8" });
  if (ldd.status !== 0 || !ldd.stdout) return;

  const missing = ldd.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.endsWith("=> not found"));

  if (missing.length === 0) return;

  const banner = "═".repeat(64);
  console.warn(`\n${banner}`);
  console.warn("⚠️  Playwright Chromium is missing system libraries:");
  console.warn(banner);
  for (const m of missing) console.warn("   " + m);
  console.warn(banner);
  console.warn("Fix one of:");
  console.warn("  • bunx playwright install --with-deps chromium   (CI / Debian / Ubuntu)");
  console.warn(
    "  • export PLAYWRIGHT_CHROMIUM_PATH=/bin/chromium  (sandboxes with system Chromium)",
  );
  console.warn(`${banner}\n`);
  // Non-blocking — never exit non-zero from this check.
}

main();
