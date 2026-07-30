import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Same asset-import stub the main config installs: specs import app modules
// that import images, which Node can't parse. Register once for the collector
// process and again via NODE_OPTIONS for every worker.
const e2eDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "e2e");
register(pathToFileURL(path.join(e2eDir, "asset-esm-hook.mjs")).href);
process.env.NODE_OPTIONS =
  `${process.env.NODE_OPTIONS ?? ""} --import ${pathToFileURL(path.join(e2eDir, "register-asset-hook.mjs")).href}`.trim();

// Local config that targets the already-running dev server on :8080.
// The default playwright.config.ts boots its own server on :5173, which
// collides with vite's actual port (8080) in this sandbox.
//
// Point Playwright at the sandbox-installed Chromium (rev 1194) to avoid
// requiring `playwright install` for the runner-bundled revision.
const CHROMIUM_PATH = "/opt/ms-playwright/chromium-1194/chrome-linux/chrome";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8080",
    trace: "off",
    launchOptions: { executablePath: CHROMIUM_PATH },
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 5"],
        launchOptions: { executablePath: CHROMIUM_PATH },
      },
    },
  ],
});
