/**
 * Resolve a usable Playwright browsers root and pin it into the environment.
 *
 * Order of preference:
 *   1. An existing PLAYWRIGHT_BROWSERS_PATH that actually contains browsers.
 *   2. /opt/ms-playwright (sandbox / CI images ship browsers here).
 *   3. ~/.cache/ms-playwright (default `playwright install` location).
 *
 * Importing this module has the side effect of setting
 * process.env.PLAYWRIGHT_BROWSERS_PATH so every worker Playwright spawns
 * inherits the same root — no caller can forget the pin.
 */
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function hasBrowsers(root) {
  if (!root || !existsSync(root)) return false;
  try {
    return readdirSync(root).some((d) => d.startsWith("chromium"));
  } catch {
    return false;
  }
}

export function resolveBrowsersPath() {
  const candidates = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    "/opt/ms-playwright",
    join(homedir(), ".cache", "ms-playwright"),
  ];
  for (const c of candidates) {
    if (hasBrowsers(c)) return c;
  }
  // Nothing installed yet — default to the standard cache dir so the
  // preflight installer has a deterministic target.
  return join(homedir(), ".cache", "ms-playwright");
}

/**
 * Resolve a Chromium executable that can actually launch here.
 *
 * Sandboxes (nix-based images) ship Chromium builds whose shared libraries
 * are patched into /nix/store; a freshly downloaded Playwright build has no
 * such patching and dies with `libglib-2.0.so.0: cannot open shared object
 * file`. So we prefer a known-good system/nix build and only fall back to the
 * downloaded one.
 */
export function resolveChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH && existsSync(process.env.PLAYWRIGHT_CHROMIUM_PATH)) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  const nixRoot = "/nix/store";
  if (existsSync(nixRoot)) {
    try {
      const dir = readdirSync(nixRoot).find((d) => d.endsWith("-playwright-chromium"));
      if (dir) {
        const bin = join(nixRoot, dir, "chrome-linux", "chrome");
        if (existsSync(bin)) return bin;
      }
    } catch {
      /* fall through */
    }
  }
  for (const bin of ["/bin/chromium", "/usr/bin/chromium", "/usr/bin/google-chrome"]) {
    if (existsSync(bin)) return bin;
  }
  return undefined;
}

export function pinBrowsersPath() {
  const root = resolveBrowsersPath();
  process.env.PLAYWRIGHT_BROWSERS_PATH = root;
  return root;
}

export default pinBrowsersPath;
