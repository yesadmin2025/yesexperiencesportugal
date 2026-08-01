#!/usr/bin/env node
/**
 * Thin wrapper around `playwright test` that pins PLAYWRIGHT_BROWSERS_PATH
 * and runs the browser preflight before handing off to the real CLI.
 *
 * Usage: node scripts/playwright-run.mjs [any playwright test args]
 */
import { spawnSync } from "node:child_process";
import { pinBrowsersPath } from "./playwright-env.mjs";

const root = pinBrowsersPath();
console.log(`[playwright] PLAYWRIGHT_BROWSERS_PATH=${root}`);

const pre = spawnSync(process.execPath, ["scripts/check-playwright-libs.mjs"], {
  stdio: "inherit",
  env: process.env,
});
if (pre.status !== 0) process.exit(pre.status ?? 1);

const args = process.argv.slice(2);
const res = spawnSync("bunx", ["playwright", "test", ...args], {
  stdio: "inherit",
  env: process.env,
});
process.exit(res.status ?? 1);
