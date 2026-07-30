import { defineConfig, devices } from "@playwright/test";

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
