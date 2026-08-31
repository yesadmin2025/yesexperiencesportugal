import { test, expect } from "@playwright/test";
import { walkToReveal, resetStudioV3State } from "./studio-v3-walk-to-reveal";

test("probe reserve gate", async ({ page }) => {
  test.setTimeout(180_000);
  await resetStudioV3State(page);
  await walkToReveal(page);
  const reveal = page.getByTestId("studio-v3-reveal");
  console.log("reveal visible:", await reveal.isVisible().catch(() => false));
  const primary = page.getByTestId("studio-v3-handoff-primary");
  console.log("primary count:", await primary.count());
  if (await primary.count()) {
    console.log("blocked attr:", await primary.first().getAttribute("data-reserve-blocked"), "verdict:", await primary.first().getAttribute("data-reserve-time-verdict"));
  }
  console.log("reason:", await page.getByTestId("studio-v3-reserve-blocked-reason").innerText().catch(() => "<none>"));
  const dbg = await page.evaluate(() => (window as any).__studioDebug ?? null);
  console.log("dbg:", JSON.stringify(dbg));
  expect(true).toBe(true);
});
