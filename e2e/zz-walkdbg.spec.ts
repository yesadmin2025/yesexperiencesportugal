import { test } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";
test("dbg", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/studio-v3");
  await walkToReveal(page);
  const phase = await page.locator('[data-testid="studio-v3-root"]').first().getAttribute("data-phase").catch(()=>null);
  const refine = await page.locator('[data-studio-v3-screen="refine"]').first().isVisible().catch(()=>false);
  console.log("PHASE", phase, "REFINE", refine);
});
