import { expect, test } from "@playwright/test";
import { resetStudioV3State, walkToReveal } from "./studio-v3-walk-to-reveal";

test.use({ viewport: { width: 393, height: 852 } });

test("composed day offers an unconfirmed WhatsApp share without guest details", async ({ page }) => {
  test.setTimeout(120_000);
  await resetStudioV3State(page);
  await walkToReveal(page, { preferredOptionIds: ["wine", "gastronomy", "wine-cellar-depth"] });
  const reaction = page.locator('button[aria-label="Continue"].fixed.inset-0').first();
  if (await reaction.isVisible().catch(() => false)) await reaction.click();
  await page.waitForTimeout(1500);
  const share = page.getByTestId("studio-v3-share-whatsapp");
  await share.scrollIntoViewIfNeeded();
  await expect(share).toBeVisible();
  const href = await share.getAttribute("href");
  expect(href).toBeTruthy();
  const url = new URL(href ?? "");
  expect(url.hostname).toBe("wa.me");
  expect(url.searchParams.get("text")).toContain("Day idea — not a confirmed reservation.");
  await share.screenshot({ path: "/tmp/browser/oct18/studio-share.png" });
});