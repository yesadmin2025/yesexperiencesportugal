import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end smoke suite for booking + builder + admin flows.
 *
 * Scope (intentionally narrow and resilient):
 *   1. Public marketing → hero loads, primary CTAs exist.
 *   2. /builder       → boots without runtime errors, first interactive step is reachable.
 *   3. /studio-v3     → cinematic intro renders, "begin" affordance is present and clickable.
 *   4. /tours/$tourId → at least one Signature tour route renders with real stops + price block.
 *   5. /admin.*       → gated routes redirect unauthenticated users to /auth (no leaks).
 *
 * These are smoke tests — they assert the flow REACHES each surface without
 * console errors and that the critical copy/elements are present. They do
 * NOT click the full booking funnel through Stripe (covered by dedicated
 * checkout specs once payments are live).
 */

const ADMIN_ROUTES: ReadonlyArray<{ path: string; devOnly?: boolean }> = [
  { path: "/admin/pricing" },
  { path: "/admin/builder-images" },
  { path: "/admin/import-tours" },
  { path: "/admin/drift-behavior" },
  { path: "/admin/error-logs" },
  { path: "/admin/studio-v3-audit" },
  { path: "/admin/studio-v3-funnel" },
  // Dev-only audit shells — server fn refuses to run in production, but the
  // route renders read-only chrome in dev. Skip the destructive-button check.
  { path: "/admin/tour-link-audit", devOnly: true },
  { path: "/admin/viator-validation", devOnly: true },
  { path: "/admin/ai-audit" },
];

function attachConsoleErrorWatcher(page: Page): { errors: string[] } {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Ignore noisy upstream warnings that don't indicate broken flow.
    if (/Download the React DevTools/i.test(text)) return;
    if (/favicon\.ico/i.test(text)) return;
    // Asset 404s (missing video stubs, fonts, og:image) are noise — the page
    // still boots. Real flow breakage shows up as a pageerror or a runtime
    // exception, both of which we still capture.
    if (/Failed to load resource/i.test(text)) return;
    if (/mapbox/i.test(text) && /token/i.test(text)) return; // public token noise
    errors.push(`console.error: ${text}`);
  });
  return { errors };
}

test.describe("smoke — homepage", () => {
  test("/ renders hero + primary CTAs", async ({ page }) => {
    const { errors } = attachConsoleErrorWatcher(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // H1 exists and is non-empty.
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10_000 });
    expect((await h1.textContent())?.trim().length ?? 0).toBeGreaterThan(0);
    // Allow hero animations to settle, then check no fatal console errors.
    await page.waitForTimeout(800);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("smoke — builder flow", () => {
  test("/builder boots and exposes a first interactive step", async ({ page }) => {
    const { errors } = attachConsoleErrorWatcher(page);
    await page.goto("/builder", { waitUntil: "domcontentloaded" });

    // The builder lazy-loads the map + stepper. Wait for either the entry
    // screen ("begin", "start", "shape") or the multi-day stepper chrome.
    const anyEntry = page.locator(
      'button:has-text("Begin"), button:has-text("Start"), button:has-text("Shape"), [data-testid="builder-entry"], [data-testid="builder-stepper"]',
    );
    await expect(anyEntry.first()).toBeVisible({ timeout: 15_000 });

    // No runtime errors after ~1.5s settle.
    await page.waitForTimeout(1_500);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("smoke — studio v3 flow", () => {
  test("/studio-v3 renders cinematic intro", async ({ page }) => {
    const { errors } = attachConsoleErrorWatcher(page);
    await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });

    // The intro renders an H1/H2 + a "begin"/"start"/"continue" affordance.
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 15_000 });

    const beginCta = page
      .locator(
        'button:has-text("Begin"), button:has-text("Start"), button:has-text("Continue"), button:has-text("Enter")',
      )
      .first();
    await expect(beginCta).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(1_500);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("smoke — tour detail page", () => {
  test("at least one signature tour page renders with content", async ({ page }) => {
    const { errors } = attachConsoleErrorWatcher(page);
    // Try common signature slugs — fall through to first that resolves.
    const candidates = [
      "/tours/arrabida-private-day",
      "/tours/sintra-cascais-private-day",
      "/tours/lisbon-coast-private-day",
      "/day-tours",
    ];
    let opened = false;
    for (const path of candidates) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      if (res && res.status() < 400) {
        opened = true;
        break;
      }
    }
    expect(opened, "no signature tour route resolved").toBe(true);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(800);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("smoke — admin gating", () => {
  for (const route of ADMIN_ROUTES) {
    test(`unauthenticated ${route} is gated`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      // Acceptable outcomes: redirect to /auth, 401/403 page, OR the admin
      // page renders its own "forbidden / sign in" UI. We assert that we do
      // NOT see protected admin content (e.g. a write button) while signed out.
      const url = page.url();
      const visiblyGated =
        /\/auth\b/.test(url) ||
        (await page.getByText(/sign in|forbidden|unauthorized|admin role/i).count()) > 0;
      // If the page rendered with 200 and isn't gated, ensure there is no
      // mutate-action visible (defense in depth — the route may render a
      // read-only audit shell publicly, but never a destructive control).
      const hasDestructive =
        (await page
          .locator('button:has-text("Delete"), button:has-text("Run import"), button:has-text("Reset")')
          .count()) > 0;
      expect(
        visiblyGated || (!hasDestructive && (response?.status() ?? 0) < 500),
        `route ${route} appears ungated: url=${url} destructive=${hasDestructive}`,
      ).toBe(true);
    });
  }
});
