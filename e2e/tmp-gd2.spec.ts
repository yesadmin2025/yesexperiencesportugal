import { test } from "@playwright/test";
import { resetStudioV3State, walkToReveal, fillGuestDetails } from "./studio-v3-walk-to-reveal";
test("seam", async ({ page }) => {
  test.setTimeout(300000);
  await resetStudioV3State(page);
  await walkToReveal(page);
  for (let i=0;i<5;i++){
    const gd = page.getByTestId("studio-v3-guest-details");
    if (await gd.isVisible().catch(()=>false)) break;
    const p = page.getByTestId("studio-v3-handoff-primary").first();
    if (!(await p.isVisible().catch(()=>false))) { console.log("NO_PRIMARY at", await page.locator('[data-testid="studio-v3-root"]').getAttribute("data-phase")); break; }
    console.log("PRIMARY", (await p.innerText()).trim());
    await p.scrollIntoViewIfNeeded(); await p.click({timeout:15000}).catch(e=>console.log("ERR",String(e).slice(0,120)));
    await page.waitForTimeout(2500);
    console.log("PHASE", await page.locator('[data-testid="studio-v3-root"]').getAttribute("data-phase"));
  }
  const gd = page.getByTestId("studio-v3-guest-details");
  console.log("GD_VIS", await gd.isVisible().catch(()=>false));
  if (await gd.isVisible().catch(()=>false)) { await fillGuestDetails(page); console.log("FILLED_OK"); }
  console.log("CANVASES", await page.locator('[data-testid="studio-living-canvas"]:visible').count());
});
