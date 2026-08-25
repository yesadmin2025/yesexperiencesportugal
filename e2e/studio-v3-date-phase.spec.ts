// Studio V3 — date selection inside the consolidated Logistics beat.
//
// Since the logistics reform, date / pickup / party live in ONE `data-phase`
// ("logistics") with progressive disclosure moments (when → where → who →
// review). This spec walks to the "when" moment and exercises each
// operational date mode (exact / flexible / undecided), asserting the beat
// advances to "where" each time.

import { test, expect, devices, type Page } from "@playwright/test";

test.use({ ...devices["Pixel 5"], viewport: { width: 393, height: 780 } });
test.setTimeout(200_000);

const phase = (page: Page) => page.locator("[data-phase]").first().getAttribute("data-phase");
const moment = (page: Page) =>
  page.locator("[data-logistics-moment]").first().getAttribute("data-logistics-moment");

/** Click via the DOM so cinematic overlays can never intercept the pointer. */
async function domClick(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el || (el as HTMLButtonElement).disabled) return false;
    el.click();
    return true;
  }, selector);
}

/** Walk intro → first choice of each desire phase → land on logistics/"when". */
async function walkToWhenMoment(page: Page) {
  await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });
  await expect.poll(() => phase(page), { timeout: 30_000 }).toBe("intro");

  for (let i = 0; i < 40; i++) {
    if ((await phase(page)) === "logistics") break;
    if (await domClick(page, '[data-phase-cta^="intro-"]')) {
      await page.waitForTimeout(600);
      continue;
    }
    await domClick(page, '[data-testid="studio-v3-choice"]');
    await page.waitForTimeout(250);
    await domClick(page, 'button[data-phase-cta="continue"]');
    await page.waitForTimeout(700);
  }

  await expect.poll(() => phase(page), { timeout: 30_000 }).toBe("logistics");
  // P7: clear the non-blocking Director's Read beat before the logistics moments.
  await domClick(page, '[data-testid="studio-v3-directors-read-continue"]');
  await expect.poll(() => moment(page), { timeout: 15_000 }).toBe("when");
}

async function continueFromWhen(page: Page) {
  await domClick(page, 'button[data-phase-cta="continue"]');
  await expect.poll(() => moment(page), { timeout: 15_000 }).toBe("where");
}

test.describe("Studio V3 — date selection (logistics · when)", () => {
  test("calendar renders inline (not a fading popover)", async ({ page }) => {
    await walkToWhenMoment(page);
    await expect(page.locator('[data-slot="calendar"]').first()).toBeVisible();
  });

  test("flexible advances to the pickup moment", async ({ page }) => {
    await walkToWhenMoment(page);
    expect(await domClick(page, 'button[data-phase-cta="date-secondary"]')).toBe(true);
    await continueFromWhen(page);
  });

  test("undecided advances to the pickup moment", async ({ page }) => {
    await walkToWhenMoment(page);
    const undecided = page
      .locator('button[data-phase-cta="date-secondary"]')
      .filter({ hasText: /don't know yet/i })
      .first();
    await undecided.evaluate((el) => (el as HTMLElement).click());
    await continueFromWhen(page);
  });

  test("exact date selection advances to the pickup moment", async ({ page }) => {
    await walkToWhenMoment(page);

    // Pick a day ~30 days out; react-day-picker exposes `data-day` with the
    // locale date string. Advance months in the header when needed.
    const future = new Date();
    future.setDate(future.getDate() + 30);
    future.setHours(0, 0, 0, 0);

    const current = new Date();
    const monthsForward = Math.max(
      0,
      (future.getFullYear() - current.getFullYear()) * 12 + (future.getMonth() - current.getMonth()),
    );
    for (let i = 0; i < monthsForward; i++) {
      await domClick(page, 'button[class*="rdp"][aria-label*="next month" i]');
      await page.waitForTimeout(200);
    }

    const dayLabel = future.toLocaleDateString();
    await page
      .locator(`button[data-day="${dayLabel}"]`)
      .first()
      .evaluate((el) => (el as HTMLElement).click());

    await continueFromWhen(page);
  });
});
