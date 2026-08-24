import { test, devices } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";

test.use({ ...devices["Pixel 5"], viewport: { width: 393, height: 800 } });
test.setTimeout(180_000);

test("capture your day + reveal", async ({ page }) => {
  await walkToReveal(page);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/browser/reveal/yourday.png" });
  const cta = page.getByTestId("studio-v3-handoff-primary").first();
  await cta.scrollIntoViewIfNeeded();
  await cta.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/browser/reveal/reveal-top.png" });
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/browser/reveal/reveal-mid.png" });
});
