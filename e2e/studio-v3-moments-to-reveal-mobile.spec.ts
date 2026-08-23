// Studio V3 — moments-stepper → final reveal, mobile 393px.
//
// Locks the blocker that used to strand the walkthrough on "Your day":
//   • the moments reel always reaches a completed state (deterministic
//     fallback in MapAwakens), it never loops,
//   • the explicit CTA "See my signature story" is clickable,
//   • `[data-testid="studio-v3-final-reveal"]` mounts, is visible and holds
//     essential text within 2500 ms of that click,
//   • the same holds with every image request blocked (images are
//     progressive enhancement, never a dependency).

import { test, expect, devices, type Page } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";

test.use({ ...devices["Pixel 5"], viewport: { width: 393, height: 588 } });
test.setTimeout(120_000);

async function revealFromRefine(page: Page): Promise<number> {
  const refine = page.locator('[data-studio-v3-screen="refine"]');
  await expect(refine, "walk did not reach Your Day / Refine").toBeVisible({ timeout: 20_000 });

  const cta = refine.getByTestId("studio-v3-handoff-primary").first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAccessibleName(/see my signature story/i);
  await cta.scrollIntoViewIfNeeded();
  await cta.click();

  const started = Date.now();
  const reveal = page.getByTestId("studio-v3-final-reveal");
  await expect(reveal).toBeVisible({ timeout: 2500 });
  const elapsed = Date.now() - started;

  const text = (await reveal.innerText()).trim();
  expect(text.length, `reveal text too short: ${JSON.stringify(text.slice(0, 80))}`).toBeGreaterThan(
    40,
  );
  return elapsed;
}

test("moments complete, then the signature story reveals in <=2.5s", async ({ page }) => {
  await page.goto("/studio-v3");
  await walkToReveal(page, { stopAtMoments: true });

  // The moments surface must reach a completed state on its own and offer an
  // interactive continue throughout — no reel that has to be babysat.
  const momentsBlock = page.getByTestId("studio-v3-moments-continue");
  await expect(momentsBlock).toBeVisible({ timeout: 20_000 });
  const holdCta = page.locator('[data-phase-cta="hold-journey"]').first();
  await expect(holdCta).toBeEnabled();
  await expect(momentsBlock).toHaveAttribute("data-moments-complete", "true", { timeout: 20_000 });

  await holdCta.click();
  const elapsed = await revealFromRefine(page);
  expect(elapsed).toBeLessThanOrEqual(2500);

  // Essential content: price/summary surface and a forward CTA.
  await expect(page.getByTestId("studio-v3-final-reveal-continue")).toBeVisible();
  const revealText = await page.getByTestId("studio-v3-final-reveal").innerText();
  expect(revealText).toMatch(/€\s?\d/);
});

test("same reveal contract with every image blocked", async ({ page }) => {
  await page.route("**/*.{png,jpg,jpeg,webp,avif,gif,svg}", (route) => route.abort());
  await page.goto("/studio-v3");
  await walkToReveal(page);

  const elapsed = await revealFromRefine(page);
  expect(elapsed).toBeLessThanOrEqual(2500);
  await expect(page.getByTestId("studio-v3-final-reveal-continue")).toBeVisible();
});

test("the moments reel does not loop back to its first moment", async ({ page }) => {
  await page.goto("/studio-v3");
  await walkToReveal(page, { stopAtMoments: true });

  const momentsBlock = page.getByTestId("studio-v3-moments-continue");
  await expect(momentsBlock).toBeVisible({ timeout: 20_000 });

  await expect(momentsBlock).toHaveAttribute("data-moments-complete", "true", { timeout: 16_000 });
  // Once complete it stays complete: no restart cycle.
  await page.waitForTimeout(4_000);
  await expect(momentsBlock).toHaveAttribute("data-moments-complete", "true");
});
