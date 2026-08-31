import { test } from "@playwright/test";
import { resetStudioV3State, walkToReveal } from "./studio-v3-walk-to-reveal";
test("cta wait", async ({ page }) => {
  test.setTimeout(240000);
  const errs: string[] = [];
  page.on("console", m => { if (m.type()==="error") errs.push(m.text().slice(0,200)); });
  page.on("pageerror", e => errs.push("PAGEERROR "+String(e).slice(0,200)));
  await resetStudioV3State(page);
  await walkToReveal(page);
  const p = page.getByTestId("studio-v3-handoff-primary").first();
  for (let i=0;i<12;i++) {
    const st = await p.evaluate((el)=>({d:(el as HTMLButtonElement).disabled, t:(el as HTMLElement).innerText.trim().slice(0,40), overlay: !!document.querySelector('[data-testid="studio-v3-compose-overlay"]')}));
    console.log("T"+i*5, JSON.stringify(st));
    if (!st.d) break;
    await page.waitForTimeout(5000);
  }
  console.log("ERRS", JSON.stringify(errs.slice(0,6)));
});
