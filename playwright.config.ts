import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
// Pin PLAYWRIGHT_BROWSERS_PATH before Playwright resolves any browser.
// Importing has the side effect of setting the env var for this process
// and every worker it spawns.

import { pinBrowsersPath, resolveChromiumExecutable } from "./scripts/playwright-env.mjs";

pinBrowsersPath();
const CHROMIUM_PATH = resolveChromiumExecutable();

// Specs import real app modules, which in turn import images. Node can't parse
// a JPEG as JavaScript, so we install a stub hook that resolves asset imports
// to their URL string — once here for the process that collects the tests, and
// again via NODE_OPTIONS for every worker process that runs them.
const e2eDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "e2e");
register(pathToFileURL(path.join(e2eDir, "asset-esm-hook.mjs")).href);
process.env.NODE_OPTIONS =
  `${process.env.NODE_OPTIONS ?? ""} --import ${pathToFileURL(path.join(e2eDir, "register-asset-hook.mjs")).href}`.trim();

/**
 * Playwright config for E2E tests.
 *
 * • Boots the project's vite dev server on a fixed port so tests are
 *   self-contained — no manual `bun run dev` required.
 * • Runs against Chromium at a mobile-ish viewport by default.
 * • Single worker locally — these tests scroll the same page, parallel
 *   workers don't add value and just compete for the dev server.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  // Pre-flight: warn if the Playwright Chromium binary is missing system
  // libs (libglib, libnss, …) so headless-shell crashes get a clear hint
  // instead of an opaque "browser has been closed" trace.
  globalSetup: "./e2e/global-setup.ts",
  // Reporters: console output (github on CI / list locally), HTML report
  // for trace/diff drill-down on CI, and the custom CTA parity summary
  // that writes a per-viewport pass/fail + deltas table to
  // $GITHUB_STEP_SUMMARY, stdout, and playwright-report/. Defining all
  // reporters here (rather than via --reporter on the CLI) means the
  // workflow can't accidentally drop the parity summary by passing its
  // own --reporter flag.
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
        ["./e2e/reporters/cta-parity-summary.ts"],
      ]
    : [["list"], ["./e2e/reporters/cta-parity-summary.ts"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    // Prefer a Chromium that can actually launch on this host. On CI this
    // resolves to undefined and Playwright uses its own download; in nix-based
    // sandboxes it picks the library-patched build instead of the downloaded
    // one (which fails on missing libglib).
    launchOptions: CHROMIUM_PATH ? { executablePath: CHROMIUM_PATH } : undefined,
  },
  // Snapshot config — visual regression tests. A 0.2% pixel-diff budget
  // tolerates sub-pixel font rendering jitter without hiding real layout
  // breakage; an 8-pixel max diff per channel keeps anti-aliasing noise
  // from registering as a regression.
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      threshold: 0.15,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "tablet-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 834, height: 1112 } },
    },
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } },
    },
    {
      name: "desktop-1440-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:8080",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
