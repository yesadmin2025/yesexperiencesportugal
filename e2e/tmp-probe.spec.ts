import { test } from "@playwright/test";
test("probe", async ({ page }) => {
  page.on("console", (m) => console.log("CONSOLE", m.type(), m.text().slice(0, 200)));
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 300)));
  await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Begin" }).click();
  await page.waitForTimeout(2500);
  console.log("PHASE", await page.locator('[data-testid="studio-v3-root"]').first().getAttribute("data-phase").catch(() => null));
});
