/**
 * Checkout surfaces smoke — Signature / Tailored / Builder (Studio v3)
 * across mobile + desktop viewports.
 *
 * Guarantees, on every push:
 *   1. Each surface renders without any user-visible error copy
 *      ("unavailable", "Something went wrong", "No manual pricing…",
 *       "Checkout unavailable", …).
 *   2. The primary Reserve / Continue CTA is present and enabled once
 *      the natural inputs (date / travellers) are provided.
 *   3. Signature booking-quote returns a live € total for the picked
 *      date (proves pricing wiring end-to-end, no Bókun flake).
 *
 * Runs under every Playwright project defined in `playwright.config.ts`
 * (mobile-chromium, tablet-chromium, desktop-chromium) — so mobile and
 * desktop are both covered by the same spec.
 *
 * Deliberately stops short of typing a Stripe test card — the embedded
 * Stripe iframe is asserted separately by `bokun-checkout-coverage.spec.ts`
 * at the edge-function layer, which is far more deterministic than
 * driving Stripe Elements in CI.
 */
import { expect, test, type Page } from "@playwright/test";

const SIGNATURE_TOUR = "sintra-cascais";

// Any of these strings appearing on the page means the checkout is
// broken for a real user — the point of this smoke is to fail loudly
// if any surface starts rendering error copy.
const ERROR_COPY = [
  "Something went wrong",
  "Checkout unavailable",
  "No manual pricing tiers configured",
  "Live quote unavailable",
  "Unavailable right now",
  "Failed to fetch",
  "TypeError",
];

async function expectNoErrorCopy(page: Page) {
  const body = await page.locator("body").innerText();
  for (const needle of ERROR_COPY) {
    expect(body, `page should not contain error copy: ${needle}`).not.toContain(needle);
  }
}

function tomorrowISO() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 2);
  return d.toISOString().slice(0, 10);
}

test.describe("Signature checkout surface", () => {
  test("loads, prices live, and shows enabled Reserve CTA", async ({ page }) => {
    await page.goto(`/tours/${SIGNATURE_TOUR}`, { waitUntil: "domcontentloaded" });

    const dateInput = page.getByTestId("booking-date-input");
    const reserveCta = page.getByTestId("reserve-cta");
    await expect(dateInput).toBeVisible({ timeout: 15_000 });
    // Wait for React hydration to finish — the reserve CTA is rendered
    // by the same component that owns the date state, so once it's
    // present the input's onChange is wired. Filling before hydration
    // sets the DOM value but never reaches React state.
    await expect(reserveCta).toBeVisible({ timeout: 15_000 });
    // Small settle to guarantee event listeners are attached.
    await page.waitForTimeout(250);

    const iso = tomorrowISO();
    await dateInput.fill(iso);
    await expect(dateInput).toHaveValue(iso);

    // Wait for the live-quote panel to resolve to a € total (proves
    // booking-quote returned an `available` quote).
    const summary = page.getByTestId("booking-summary");
    await expect(summary).toContainText(/€\s?\d/, { timeout: 20_000 });

    const cta = page.getByTestId("reserve-cta");
    await expect(cta).toBeEnabled();
    await expect(cta).toContainText(/Reserve/);

    // Trust copy present.
    await expect(page.getByText(/Instant confirmation/i).first()).toBeVisible();
    await expect(page.getByText(/Secure checkout/i).first()).toBeVisible();

    await expectNoErrorCopy(page);
  });
});

test.describe("Tailored checkout surface", () => {
  test("loads and exposes an enabled Reserve CTA", async ({ page }) => {
    await page.goto(`/tours/${SIGNATURE_TOUR}/tailor`, { waitUntil: "domcontentloaded" });

    // The Tailor form ships with prefilled defaults — the Reserve CTA
    // must be reachable and enabled without any user interaction.
    const cta = page.getByRole("button", { name: /Reserve securely/i }).first();
    await expect(cta).toBeVisible({ timeout: 20_000 });
    await expect(cta).toBeEnabled();

    await expect(page.getByText(/Instant confirmation/i).first()).toBeVisible();
    await expect(page.getByText(/Secure checkout/i).first()).toBeVisible();

    await expectNoErrorCopy(page);
  });
});

test.describe("Builder (Studio v3) checkout surface", () => {
  test("loads without error copy and exposes a primary CTA", async ({ page }) => {
    // Studio v3 fires continuous background requests (map tiles, scene
    // media, IO probes) so networkidle never resolves inside the default
    // 30s test timeout — bump this test only.
    test.setTimeout(60_000);
    await page.goto(`/studio-v3`, { waitUntil: "domcontentloaded" });

    const beginCta = page.getByRole("button", { name: /^Begin/i }).first();
    await expect(beginCta).toBeVisible({ timeout: 30_000 });
    await expect(beginCta).toBeEnabled();

    await expectNoErrorCopy(page);
  });
});
