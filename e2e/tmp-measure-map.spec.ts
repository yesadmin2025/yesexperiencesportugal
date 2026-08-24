import { test, expect } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";

test.use({ viewport: { width: 393, height: 706 } });

test("map stage measurement", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/studio-v3");
  await walkToReveal(page, { stopAtMoments: true });
  await page.waitForTimeout(3500);
  const stage = page.getByTestId("studio-v3-your-day-stage");
  if (await stage.count()) {
    const b = await stage.boundingBox();
    const mode = await stage.getAttribute("data-your-day-mode");
    console.log("MEASURE_MAP", JSON.stringify({ h: b?.height, mode }));
    await page.screenshot({ path: "/tmp/browser/map-393.png" });
  } else console.log("MEASURE_MAP none");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log("MEASURE_OVERFLOW", overflow);
  expect(overflow).toBeLessThanOrEqual(1);
});
