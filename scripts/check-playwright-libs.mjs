#!/usr/bin/env node
/**
 * Playwright preflight.
 *
 *   1. Pin PLAYWRIGHT_BROWSERS_PATH (see scripts/playwright-env.mjs).
 *   2. Ensure a Chromium build AND a `chrome-headless-shell` binary exist.
 *      If either is missing, install them once (lockfile-guarded so parallel
 *      workers can't race) via `bunx playwright install`.
 *   3. Warn — never fail — when the resolved binary is missing system libs
 *      (libglib, libnss, …), which otherwise surfaces as an opaque
 *      "Target page, context or browser has been closed".
 *
 * Wired as Playwright `globalSetup` and as the first step of
 * scripts/playwright-run.mjs.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pinBrowsersPath } from "./playwright-env.mjs";

const ROOT = pinBrowsersPath();

function dirsStartingWith(prefix) {
  if (!existsSync(ROOT)) return [];
  try {
    return readdirSync(ROOT).filter((d) => d.startsWith(prefix));
  } catch {
    return [];
  }
}

function findChromium() {
  for (const d of dirsStartingWith("chromium-")) {
    // "chrome-linux" = classic build, "chrome-linux64" = Chrome for Testing.
    for (const sub of ["chrome-linux", "chrome-linux64"]) {
      const bin = join(ROOT, d, sub, "chrome");
      if (existsSync(bin)) return bin;
    }
  }
  return null;
}

function findHeadlessShell() {
  // Playwright has used two directory namings over time.
  for (const prefix of ["chromium_headless_shell-", "chromium-headless-shell-"]) {
    for (const d of dirsStartingWith(prefix)) {
      const bin = join(ROOT, d, "chrome-headless-shell-linux64", "chrome-headless-shell");
      if (existsSync(bin)) return bin;
    }
  }
  return null;
}

function install(targets) {
  const lock = join(ROOT, ".yes-preflight-install.lock");
  mkdirSync(ROOT, { recursive: true });
  if (existsSync(lock)) {
    // Another worker is installing; give it a moment and move on.
    return;
  }
  writeFileSync(lock, String(process.pid));
  try {
    console.log(`[playwright preflight] installing: ${targets.join(", ")}`);
    const res = spawnSync("bunx", ["playwright", "install", ...targets], {
      stdio: "inherit",
      env: process.env,
    });
    if (res.status !== 0) {
      console.error(
        `[playwright preflight] \`playwright install ${targets.join(" ")}\` failed ` +
          `(exit ${res.status}). Install manually or set PLAYWRIGHT_BROWSERS_PATH ` +
          `to a directory that already has the browsers.`,
      );
      process.exit(1);
    }
  } finally {
    rmSync(lock, { force: true });
  }
}

function warnMissingLibs(bin) {
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
}

function main() {
  console.log(`[playwright preflight] browsers root: ${ROOT}`);

  // Always install both together: `playwright install` prunes browsers it
  // wasn't asked for, so a partial install would delete the other one.
  if (!findChromium() || !findHeadlessShell()) {
    install(["chromium", "chromium-headless-shell"]);
  }

  const chromium = findChromium();
  const shell = findHeadlessShell();
  console.log(`[playwright preflight] chromium: ${chromium ?? "MISSING"}`);
  console.log(`[playwright preflight] headless shell: ${shell ?? "MISSING"}`);

  const bin = process.env.PLAYWRIGHT_CHROMIUM_PATH || shell || chromium;
  if (bin && existsSync(bin)) warnMissingLibs(bin);
}

main();

export default async function globalSetup() {
  // Playwright imports this file for globalSetup; main() has already run at
  // import time, so there is nothing left to do here.
}
