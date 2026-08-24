import { test, expect } from "@playwright/test";
import { reachGuestDetails, fillGuestDetails } from "./studio-v3-walk-to-reveal";

test.use({ viewport: { width: 393, height: 706 } });

test("measure map stage + total vs sticky bar", async ({ page }) => {
  test.setTimeout(240_000);
  if (!(await reachGuestDetails(page))) test.skip(true, "no funnel");
  await fillGuestDetails(page);
  await page.getByTestId("studio-v3-guest-details-submit").click();
  const summary = page.getByTestId("studio-v3-checkout-summary");
  await expect(summary).toBeVisible({ timeout: 15000 });
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(800);
  const box = await page.evaluate(() => {
    const bar = document.querySelector('[data-testid="studio-v3-checkout-summary-cta-bar"]')!.getBoundingClientRect();
    const els = Array.from(document.querySelectorAll('[data-testid="studio-v3-checkout-summary"] *'));
    const totalEl = els.find((e) => e.children.length === 0 && e.textContent?.trim() === "Total")!;
    const row = totalEl.parentElement!.getBoundingClientRect();
    return { barTop: bar.top, barH: bar.height, rowBottom: row.bottom, gap: bar.top - row.bottom,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  console.log("MEASURE_SUMMARY", JSON.stringify(box));
});
