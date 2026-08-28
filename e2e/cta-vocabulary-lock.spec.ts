/**
 * CTA vocabulary lock.
 *
 * The approved CTA strings are the ONLY conversion labels allowed on
 * public surfaces. If a legacy string (Tailor this Signature, Continue
 * draft, Design & Book) resurfaces on any surveyed route, this suite
 * fails so we catch the regression before ship.
 *
 * Locked strings:
 *   - "Check availability & reserve"   (Signature marketing entry)
 *   - "Reserve this day"                (Signature booking card primary)
 *   - "Tailor this day"                 (Signature secondary)
 *   - "Review route & price"            (Studio V3 step 1 — future)
 *   - "Reserve securely"                (Studio V3 / bespoke final)
 *   - "Resume your draft"               (Studio draft return)
 */

import { test, expect, type Page } from "@playwright/test";
import { LEGACY_CTAS } from "./copy-parity-constants";

async function assertNoLegacyLabels(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  const bodyText = await page.locator("body").innerText();
  for (const legacy of LEGACY_CTAS) {
    expect(bodyText, `Legacy CTA "${legacy}" found on ${url}`).not.toContain(legacy);
  }
}

const SIGNATURE_ROUTES = [
  "/",
  "/experiences",
  "/tours/arrabida-wine-allinclusive",
  "/tours/arrabida-wine-allinclusive/tailor",
  "/sintra-day-tour-from-lisbon",
  "/evora-private-tour-from-lisbon",
  "/private-wine-tour-lisbon",
  "/alentejo-wine-tour-from-lisbon",
  "/arrabida-day-trip-from-lisbon",
];

test.describe("CTA vocabulary lock", () => {
  for (const route of SIGNATURE_ROUTES) {
    test(`no legacy CTA labels on ${route}`, async ({ page }) => {
      await assertNoLegacyLabels(page, route);
    });
  }

  test("home surfaces the new Signature primary", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /check availability & reserve/i }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /tailor this day/i }).first()).toBeVisible();
  });
});
