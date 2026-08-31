import { test } from "@playwright/test";
import { resetStudioV3State, walkToReveal } from "./studio-v3-walk-to-reveal";
test("cta diag", async ({ page }) => {
  test.setTimeout(240000);
  await resetStudioV3State(page);
  await walkToReveal(page);
  const p = page.getByTestId("studio-v3-handoff-primary").first();
  await p.scrollIntoViewIfNeeded();
  const info = await p.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
    const cs = getComputedStyle(el as HTMLElement);
    return { rect: [r.x,r.y,r.width,r.height], disabled: (el as HTMLButtonElement).disabled, pe: cs.pointerEvents, top: top ? `${top.tagName}.${(top as HTMLElement).className}`.slice(0,160) : null };
  });
  console.log("INFO", JSON.stringify(info));
  await p.click({ force: true });
  await page.waitForTimeout(3000);
  console.log("PHASE_AFTER_FORCE", await page.locator('[data-testid="studio-v3-root"]').getAttribute("data-phase"));
});
