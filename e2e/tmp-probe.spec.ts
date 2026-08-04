import { test } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";
test("probe", async ({ page }) => {
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 400)));
  await page.goto("/studio-v3");
  await walkToReveal(page);
  const refine = page.locator('[data-studio-v3-screen="refine"]');
  console.log("refine count", await refine.count());
  const btns = refine.locator("button");
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    console.log("BTN", i, JSON.stringify((await btns.nth(i).innerText()).slice(0,60)), await btns.nth(i).isVisible());
  }
});
