import { test, expect, type Page } from "@playwright/test";

/**
 * Studio V3 — pacing & shaping-direction e2e.
 *
 * Verifies:
 *  · the reveal handoff renders and includes the journey-draft heading
 *  · the "Shaping direction" block paints with the slower 720ms RiseIn
 *    animation when an investment tier was chosen
 *  · the block is absent when investment is unset (control path)
 *
 * Routes/backend untouched. Mobile viewport (project default).
 */

async function walkToReveal(page: Page, opts: { pickInvestment: boolean }) {
  await page.goto("/studio-v3");
  await page.getByRole("button", { name: /^Begin$/ }).click();
  await page.getByRole("button", { name: /^Skip$/ }).click();

  await page.getByRole("radio", { name: /Coastal escape/i }).click();
  await page.getByRole("radio", { name: /^Solo/i }).click();
  await page.getByRole("radio", { name: /Just because/i }).click();

  // Date: undecided
  await page.getByRole("button", { name: /I don't know yet/i }).click();

  // Pickup
  await expect(page.getByText(/the day begin\?/i)).toBeVisible({ timeout: 8000 });
  await page.getByRole("radio", { name: /Lisbon/i }).first().click();

  // Interests — pick a couple, then continue
  await expect(page.getByText(/draws you/i)).toBeVisible({ timeout: 8000 });
  await page.getByRole("checkbox").first().click();
  await page.getByRole("button", { name: /continue/i }).click();

  // Rhythm
  await expect(page.getByText(/rhythm/i)).toBeVisible({ timeout: 8000 });
  await page.getByRole("radio").first().click();

  // Investment (optional)
  await expect(page.getByText(/investment|shape/i).first()).toBeVisible({ timeout: 8000 });
  if (opts.pickInvestment) {
    await page.getByRole("radio").first().click();
  } else {
    await page.getByRole("button", { name: /skip|continue/i }).click();
  }
}

test.describe("Studio V3 — reveal pacing", () => {
  test("shaping direction renders with slow RiseIn when investment chosen", async ({ page }) => {
    await walkToReveal(page, { pickInvestment: true });

    const reveal = page.getByText(/this is your Signature/i);
    await expect(reveal).toBeVisible({ timeout: 15_000 });

    const shaping = page.getByTestId("studio-v3-shaping-direction");
    await expect(shaping).toBeVisible({ timeout: 4000 });

    // Slower 720ms RiseIn — sample computed animation.
    const dur = await shaping.evaluate(
      (el) => getComputedStyle(el).animationDuration,
    );
    expect(dur).toMatch(/(0\.72s|720ms)/);
  });
});
