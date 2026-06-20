import { test, expect, type Page } from "@playwright/test";

/**
 * Studio V3 — Phase 2 date selection smoke test.
 *
 * Walks the composer from the intro through feeling → who → occasion
 * into the date phase, then exercises each operational date mode
 * (exact / flexible / undecided) and confirms the flow advances to the
 * pickup phase.
 *
 * Uses the inline shadcn Calendar — the native iOS `<input type="date">`
 * popover was replaced because it dismissed itself before the traveller
 * could confirm a day.
 */

/** Walk intro + feeling + who + occasion → land on date phase. */
async function walkToDatePhase(page: Page) {
  await page.goto("/studio-v3");

  await page.getByRole("button", { name: /^Begin$/ }).click();
  await page.getByRole("button", { name: /^Skip$/ }).click();

  await expect(page.getByText(/Portugal to feel\?/i)).toBeVisible();
  await page.getByRole("radio", { name: /Coastal escape/i }).click();

  await expect(page.getByText(/Who is/i)).toBeVisible({ timeout: 8000 });
  await page.getByRole("radio", { name: /^Solo/i }).click();

  await expect(page.getByText(/reason behind it\?/i)).toBeVisible({ timeout: 8000 });
  await page.getByRole("radio", { name: /Just because/i }).click();

  await expect(page.getByText(/When should/i)).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/this unfold\?/i)).toBeVisible();
}

test.describe("Studio V3 — date phase", () => {
  test("calendar renders inline (not a fading popover)", async ({ page }) => {
    await walkToDatePhase(page);
    await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
  });

  test("flexible advances to pickup phase", async ({ page }) => {
    await walkToDatePhase(page);
    await page.getByRole("button", { name: /I'm flexible/i }).click();
    await expect(page.getByText(/Where does/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/the day begin\?/i)).toBeVisible();
  });

  test("undecided advances to pickup phase", async ({ page }) => {
    await walkToDatePhase(page);
    await page.getByRole("button", { name: /I don't know yet/i }).click();
    await expect(page.getByText(/Where does/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/the day begin\?/i)).toBeVisible();
  });

  test("exact date selection advances to pickup phase", async ({ page }) => {
    await walkToDatePhase(page);

    // Pick a day ~30 days out. react-day-picker renders day buttons with
    // a `data-day` attribute holding the locale date string.
    const future = new Date();
    future.setDate(future.getDate() + 30);
    future.setHours(0, 0, 0, 0);

    // Advance months in the calendar header until the target month is shown,
    // then click the day. The Calendar may start on the current month.
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const targetMonth = new Date(future.getFullYear(), future.getMonth(), 1);
    const monthsForward = Math.max(
      0,
      (targetMonth.getFullYear() - currentMonth.getFullYear()) * 12 +
        (targetMonth.getMonth() - currentMonth.getMonth()),
    );
    for (let i = 0; i < monthsForward; i++) {
      await page.getByRole("button", { name: /go to the next month/i }).click();
    }

    const dayLabel = future.toLocaleDateString();
    await page.locator(`button[data-day="${dayLabel}"]`).first().click();

    await expect(page.getByText(/Where does/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/the day begin\?/i)).toBeVisible();
  });
});
