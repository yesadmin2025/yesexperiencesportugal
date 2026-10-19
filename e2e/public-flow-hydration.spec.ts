import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 393, height: 852 } });

test("public route hydration and internal navigation do not race editorial motion", async ({ page }) => {
  test.setTimeout(120_000);
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|server rendered/i.test(message.text())) failures.push(message.text());
  });
  for (const path of ["/experiences", "/portugal-travel-designer", "/proposal-in-portugal", "/contact"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1200);
    expect(failures, path).toEqual([]);
  }
  await page.goto("/");
  const consent = page.getByRole("button", { name: "Essential only", exact: true });
  if (await consent.isVisible()) await consent.click();
  await page.locator('[data-hero-field="secondaryCta"]').click();
  await expect(page).toHaveURL(/\/experiences$/);
  await page.waitForTimeout(1200);
  expect(failures).toEqual([]);
});

test("Studio first choice works and survives refresh without an opening loop", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.locator('[data-testid="studio-v3-root"]')).toHaveAttribute("data-phase", "feeling", { timeout: 20_000 });
  await page.locator('[data-option-id="wine-food"]').click();
  await expect(page.locator('[data-testid="studio-v3-root"]')).not.toHaveAttribute("data-phase", "intro");
  await page.reload();
  await expect(page.locator('[data-testid="studio-v3-root"]')).not.toHaveAttribute("data-phase", "intro", { timeout: 20_000 });
  await expect(page.locator('[data-option-id="wine-food"]')).toHaveAttribute("data-selected", "true");
});