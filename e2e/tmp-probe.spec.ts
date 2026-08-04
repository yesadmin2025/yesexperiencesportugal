import { test } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";
test("probe", async ({ page }) => {
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 400)));
  page.on("console", (m) => { if (m.type()==="error") console.log("CONSOLE-ERR", m.text().slice(0,300)); });
  await page.goto("/studio-v3");
  await walkToReveal(page);
  console.log("PHASE-after-walk", await page.locator('[data-testid="studio-v3-root"]').first().getAttribute("data-phase").catch(()=>null));
  await advanceRefineToStorytelling(page);
  console.log("PHASE-after-refine", await page.locator('[data-testid="studio-v3-root"]').first().getAttribute("data-phase").catch(()=>null));
});
