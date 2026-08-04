// P0 regression — Studio V3 audit BLOCKER #1.
//
// Storytelling reveal (`FinalRevealStory`, phase=confirmation) must paint
// non-empty content within 2500 ms on mobile 393×588 and expose the
// party-total / add-ons-total testids. Extends walkToReveal with a click
// through Refine → Storytelling.

import { test, expect, devices } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";

test.use({
  ...devices["Pixel 5"],
  viewport: { width: 393, height: 588 },
});

// The walk to Refine drives the whole cinematic funnel and is slower than the
// default budget on cold CI machines. The assertion that matters — the reveal
// painting within 2500 ms — stays untouched below.
test.setTimeout(120_000);


test("storytelling reveal renders non-empty within 2500ms on mobile", async ({ page }) => {
  await page.goto("/studio-v3");
  await walkToReveal(page);
  await advanceRefineToStorytelling(page);

  const reveal = page.getByTestId("studio-v3-final-reveal");
  await expect(reveal).toBeVisible({ timeout: 2500 });

  const text = (await reveal.innerText()).trim();
  expect(
    text.length,
    `reveal innerText was too short: ${JSON.stringify(text.slice(0, 80))}`,
  ).toBeGreaterThan(40);

  // Timeline chapters must render at least one moment (roman numeral + label).
  const timeline = page.getByTestId("studio-v3-final-reveal-timeline");
  await expect(timeline).toBeVisible();
  const chapterCount = await timeline.locator("li").count();
  expect(chapterCount).toBeGreaterThan(0);
});
