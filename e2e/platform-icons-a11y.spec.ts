import { test, expect } from "@playwright/test";

/**
 * Accessibility contract for platform / social icon links.
 *
 * Verifies that icon-only links carry an accessible name (aria-label)
 * and are keyboard-focusable across the footer, mobile nav, and
 * individual partner pages.
 */

test("footer platform icons expose aria-labels and focus rings", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const partners = ["Viator", "GetYourGuide", "Tripadvisor"];
  for (const label of partners) {
    const link = page.locator(`footer [aria-label="Also listed on ${label}"]`).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", `/partners/${label.toLowerCase()}`);
    await link.focus();
    await expect(link).toBeFocused();
  }

  const socials = ["Instagram", "Facebook", "Tripadvisor", "WhatsApp"];
  for (const label of socials) {
    const link = page.locator(`footer [aria-label="${label}"]`).first();
    await expect(link).toBeVisible();
    await link.focus();
    await expect(link).toBeFocused();
  }
});

test("mobile nav social icons expose aria-labels", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 780 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // The menu is rendered client-side after the hamburger click.
  // We verify the icons are present in the initial markup by forcing the
  // menu open through React state, which is more reliable than headless
  // pointer events on the fixed header button.
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('header button'));
    const menuBtn = buttons.find((b) =>
      (b.getAttribute("aria-label") ?? "").toLowerCase().includes("menu"),
    ) as HTMLButtonElement | undefined;
    menuBtn?.click();
  });

  const mobileNav = page.locator("#mobile-nav").first();
  await expect(mobileNav).toBeVisible();

  for (const label of ["WhatsApp", "Instagram", "Tripadvisor"]) {
    const link = mobileNav.locator(`[aria-label="${label}"]`).first();
    await expect(link).toBeVisible();
  }
});

test("partner page 'Also listed on' links expose aria-labels", async ({ page }) => {
  await page.goto("/partners/viator", { waitUntil: "domcontentloaded" });

  for (const label of ["GetYourGuide", "Tripadvisor"]) {
    const link = page.locator(`[aria-label="Also listed on ${label}"]`).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", `/partners/${label.toLowerCase()}`);
  }
});
