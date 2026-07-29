// P0 regression — Studio V3 audit BLOCKER #4.
//
// Guest Details sticky footer microcopy must fit within its container
// on mobile 393×588 (no ellipsis, no horizontal overflow).

import { test, expect, devices } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";

test.use({
  ...devices["Pixel 5"],
  viewport: { width: 393, height: 588 },
});

test("guest-details footer microcopy does not clip on 393px", async ({ page }) => {
  await page.goto("/studio-v3");
  await walkToReveal(page);
  await advanceRefineToStorytelling(page);

  // Advance from storytelling → guest details.
  const cont = page.getByTestId("studio-v3-final-reveal-continue");
  if (await cont.isVisible().catch(() => false)) {
    await cont.click({ timeout: 4_000 }).catch(() => undefined);
  }

  const bar = page.getByTestId("studio-v3-guest-details-cta-bar");
  await expect(bar).toBeVisible({ timeout: 6_000 });

  const footerP = bar.locator("p").first();
  const text = (await footerP.innerText()).trim();

  expect(text, "footer must not contain an ellipsis").not.toMatch(/[…\u2026]/);
  expect(text).toContain("Secure checkout");
  expect(text).toContain("Final price");

  const overflows = await footerP.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  expect(overflows, `footer text overflows its container (text=${JSON.stringify(text)})`).toBe(
    false,
  );
});
