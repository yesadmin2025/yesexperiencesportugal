import { test } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";
test.setTimeout(120000);
test("probe", async ({ page }) => {
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 400)));
  await page.goto("/studio-v3");
  await walkToReveal(page);
  const cta = page.locator('[data-studio-v3-screen="refine"]').getByTestId("studio-v3-handoff-primary").first();
  console.log("cta visible", await cta.isVisible().catch(()=>false), await cta.count());
  await cta.scrollIntoViewIfNeeded();
  await cta.click({ timeout: 5000 });
  await page.waitForTimeout(4000);
  console.log("PHASE", await page.locator('[data-testid="studio-v3-root"]').first().getAttribute("data-phase").catch(()=>null));
  console.log("reveal count", await page.getByTestId("studio-v3-final-reveal").count());
});
