import { test } from "@playwright/test";
import { resetStudioV3State, walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";
test("gd diag", async ({ page }) => {
  test.setTimeout(300000);
  await resetStudioV3State(page);
  await walkToReveal(page);
  await advanceRefineToStorytelling(page);
  const cta = page.getByTestId("studio-v3-final-reveal-continue");
  console.log("CTA_COUNT", await cta.count(), "VIS", await cta.isVisible().catch(()=>false));
  if (await cta.count()) { console.log("CTA_TEXT", (await cta.first().innerText()).trim()); await cta.first().scrollIntoViewIfNeeded(); await cta.first().click({timeout:15000}).catch(e=>console.log("CLICK_ERR", String(e).slice(0,200))); }
  await page.waitForTimeout(4000);
  console.log("PHASE", await page.locator('[data-testid="studio-v3-root"]').getAttribute("data-phase"));
  console.log("GD_VIS", await page.getByTestId("studio-v3-guest-details").isVisible().catch(()=>false));
  console.log("BODY", (await page.locator("body").innerText()).slice(0,400).replace(/\n/g," | "));
});
