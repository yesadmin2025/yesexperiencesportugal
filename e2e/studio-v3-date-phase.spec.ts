import { test, expect, type Page } from "@playwright/test";

/**
 * Studio V3 — Phase 2 date selection smoke test.
 *
 * Walks the composer from the intro through feeling → who → occasion
 * into the date phase, then exercises each operational date mode
 * (exact / flexible / undecided) and confirms the flow advances to the
 * pickup phase. Also verifies the native date input disables past dates
 * via its `min` attribute (today, ISO yyyy-mm-dd).
 *
 * Lives under /studio-v3 only — homepage, Studio V2, builder, route
 * logic and backend are untouched.
 */

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Walk intro + feeling + who + occasion → land on date phase. */
async function walkToDatePhase(page: Page) {
  await page.goto("/studio-v3");

  // Intro: Begin → Skip name
  await page.getByRole("button", { name: /^Begin$/ }).click();
  await page.getByRole("button", { name: /^Skip$/ }).click();

  // Feeling
  await expect(page.getByText(/Portugal to feel\?/i)).toBeVisible();
  await page.getByRole("button", { name: /Coastal escape/i }).click();

  // Who
  await expect(page.getByText(/Who is/i)).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: /^Solo/i }).click();

  // Occasion
  await expect(page.getByText(/reason behind it\?/i)).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: /Just because/i }).click();

  // Date phase
  await expect(page.getByText(/When should/i)).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/this unfold\?/i)).toBeVisible();
}

test.describe("Studio V3 — date phase", () => {
  test("native date input disables past dates (min = today ISO)", async ({ page }) => {
    await walkToDatePhase(page);
    const input = page.locator('input[type="date"][aria-label="Choose a date"]');
    await expect(input).toHaveCount(1);
    await expect(input).toHaveAttribute("min", todayIso());
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
    const input = page.locator('input[type="date"][aria-label="Choose a date"]');

    // Pick a date ~30 days in the future to stay in range.
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, "0");
    const dd = String(future.getDate()).padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}`;

    // The input is .sr-only so use fill() (Playwright bypasses visibility
    // for form fields) and dispatch a native input/change.
    await input.evaluate((el, value) => {
      const i = el as HTMLInputElement;
      i.value = value;
      i.dispatchEvent(new Event("input", { bubbles: true }));
      i.dispatchEvent(new Event("change", { bubbles: true }));
    }, iso);

    await expect(page.getByText(/Where does/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/the day begin\?/i)).toBeVisible();
  });
});
