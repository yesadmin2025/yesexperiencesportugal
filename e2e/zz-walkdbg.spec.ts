import { test } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";
test("dbg", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/studio-v3");
  await walkToReveal(page);
  const root = page.locator('[data-testid="studio-v3-root"]').first();
  console.log("PHASE", await root.getAttribute("data-phase").catch(()=>null));
  const info = await page.evaluate(() => Array.from(document.querySelectorAll('[data-phase-cta],[data-option-id]')).map(e => ({
    tag: e.tagName, cta: e.getAttribute('data-phase-cta'), opt: e.getAttribute('data-option-id'),
    sel: e.getAttribute('data-selected'), dis: e.getAttribute('data-phase-cta-disabled'),
    txt: (e.textContent||'').trim().slice(0,40)
  })));
  console.log(JSON.stringify(info, null, 1));
});
