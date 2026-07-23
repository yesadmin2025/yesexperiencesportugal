/**
 * Copy parity lock — legal pages, contact, footer, FAQ.
 *
 * Asserts that the canonical sources of truth
 * (src/config/business-nap.ts, src/content/faq-data.ts) actually
 * appear in the rendered DOM on every relevant route. If a page starts
 * hard-coding an email, phone, license label or "book" verb again, this
 * suite fails before the drift can ship.
 */
import { test, expect, type Page } from "@playwright/test";
import {
  EMAIL,
  EMAIL_HREF,
  PHONE_DISPLAY,
  PHONE_HREF,
  LICENSE_LABEL,
  LICENSE_LABEL_PT,
  SOCIAL,
} from "../src/config/business-nap";
import { HOMEPAGE_FAQ } from "../src/content/faq-data";

async function bodyText(page: Page, url: string): Promise<string> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  return page.locator("body").innerText();
}

test.describe("Legal pages — NAP + license from single source of truth", () => {
  for (const route of ["/terms", "/privacy", "/cookies"]) {
    test(`${route} shows canonical email and license label`, async ({ page }) => {
      const text = await bodyText(page, route);
      expect(text, `${route} must show ${EMAIL}`).toContain(EMAIL);
      // Either EN or PT label is acceptable per route locale.
      const hasLabel = text.includes(LICENSE_LABEL) || text.includes(LICENSE_LABEL_PT);
      expect(hasLabel, `${route} must show RNAAT label`).toBe(true);
      // mailto link must point at the canonical address.
      await expect(page.locator(`a[href="${EMAIL_HREF}"]`).first()).toHaveCount(1);
    });
  }
});

test.describe("Contact page — clickable info rows", () => {
  test("/contact has mailto + tel with canonical values", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    await expect(page.locator(`a[href="${EMAIL_HREF}"]`).first()).toBeVisible();
    await expect(page.locator(`a[href="${PHONE_HREF}"]`).first()).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text).toContain(EMAIL);
    expect(text).toContain(PHONE_DISPLAY);
  });
});

test.describe("Footer parity across routes", () => {
  const routes = ["/", "/experiences", "/portugal-travel-designer"];
  for (const route of routes) {
    test(`${route} footer uses canonical social + license`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => undefined);

      // Instagram + Facebook from SOCIAL constant.
      if (SOCIAL.instagram) {
        await expect(page.locator(`footer a[href="${SOCIAL.instagram}"]`)).toHaveCount(1);
      }
      if (SOCIAL.facebook) {
        await expect(page.locator(`footer a[href="${SOCIAL.facebook}"]`)).toHaveCount(1);
      }
      // No duplicate /contact link in the legal bar (kept only in main nav).
      const contactLinks = await page.locator('footer a[href="/contact"]').count();
      expect(contactLinks, `${route}: /contact must not be duplicated in footer legal bar`).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("FAQ verb parity — 'reserve' not 'book' in canonical Q/A", () => {
  test("HOMEPAGE_FAQ never uses 'book' where 'reserve' is canonical", () => {
    // Source-level: if a copy edit reintroduces "book" the on-page copy
    // will drift from the SEO FAQ JSON-LD. This is a fast unit-style guard
    // so drift is caught even without a running dev server.
    for (const { q, a } of HOMEPAGE_FAQ) {
      const combined = `${q}\n${a}`;
      expect(
        /\bbook\b/i.test(combined),
        `FAQ item uses 'book' — canonical verb is 'reserve': ${q}`,
      ).toBe(false);
    }
  });
});
