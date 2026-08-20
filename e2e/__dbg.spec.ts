import { test, expect } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";

test.use({ viewport: { width: 393, height: 706 } });
test("debug reveal -> guest details", async ({ page }) => {
  test.setTimeout(180_000);
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE ERR:", m.text()); });
  page.on("pageerror", (e) => console.log("PAGE ERR:", e.message));
  await page.goto("/studio-v3");
  await walkToReveal(page);
  await advanceRefineToStorytelling(page);
  const reveal = page.getByTestId("studio-v3-final-reveal");
  console.log("reveal visible:", await reveal.isVisible().catch(() => false));
  const cta = page.getByTestId("studio-v3-final-reveal-continue");
  console.log("cta visible:", await cta.isVisible().catch(() => false));
  await cta.scrollIntoViewIfNeeded().catch(() => {});
  await cta.click({ timeout: 5000 }).catch((e) => console.log("click fail", e.message));
  await page.waitForTimeout(3000);
  console.log("gd visible:", await page.getByTestId("studio-v3-guest-details").isVisible().catch(() => false));
  console.log("screens:", await page.locator("[data-studio-v3-screen]").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.studioV3Screen)));
  console.log("body text:", (await page.locator("body").innerText()).slice(0, 400));
});
