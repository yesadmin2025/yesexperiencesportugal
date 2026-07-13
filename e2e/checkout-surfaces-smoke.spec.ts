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
    await expect(dateInput).toBeVisible({ timeout: 15_000 });
    // React-controlled <input type="date"> — Playwright's fill() can no-op
    // in some Chromium builds, so set the value via the native property
    // setter and dispatch the input event React listens for.
    const iso = tomorrowISO();
    await dateInput.evaluate((el, value) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, iso);

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
    await page.goto(`/studio-v3`, { waitUntil: "domcontentloaded" });

    // Studio v3 is a long cinematic scroll — just assert first-fold
    // renders cleanly and at least one primary CTA is available.
    await page.waitForLoadState("networkidle").catch(() => undefined);
    const anyCta = page
      .getByRole("button")
      .filter({ hasText: /Begin|Start|Design|Continue|Reserve/i })
      .first();
    await expect(anyCta).toBeVisible({ timeout: 20_000 });

    await expectNoErrorCopy(page);
  });
});
