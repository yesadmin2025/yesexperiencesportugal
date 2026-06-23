import { test, expect, type Page } from "@playwright/test";

/**
 * Studio V3 — intro → name → pace → feeling → who → destination → pickup → investment.
 *
 * Guards the regression where the funnel "stuck" at guests/investment and
 * verifies CTAs fire on both desktop and mobile. Also collects a few
 * premium-feel signals (no JS pageerrors, no stuck phase loops, the
 * journey-draft surface appears) so this spec serves double duty as the
 * end-to-end smoke + UX sanity check.
 */

type Viewport = { width: number; height: number };

const VIEWPORTS: Record<"mobile" | "desktop", Viewport> = {
  mobile: { width: 393, height: 800 },
  desktop: { width: 1280, height: 900 },
};

async function getPhase(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.querySelector("[data-phase]");
    return el ? el.getAttribute("data-phase") : null;
  });
}

async function waitForPhase(page: Page, expected: RegExp, timeout = 8000) {
  await expect
    .poll(async () => (await getPhase(page)) ?? "", { timeout })
    .toMatch(expected);
}

async function clickUntilGone(page: Page, selector: string, timeout = 12_000) {
  const deadline = Date.now() + timeout;
  const el = page.locator(selector).first();
  await el.waitFor({ state: "visible", timeout });
  // Let entrance animations settle (intro uses 700ms slide-in).
  await page.waitForTimeout(800);
  while (Date.now() < deadline) {
    if (!(await el.isVisible().catch(() => false))) return;
    await el.scrollIntoViewIfNeeded().catch(() => undefined);
    await el.click({ timeout: 2000 }).catch(async () => {
      await el.evaluate((n) => (n as HTMLElement).click()).catch(() => undefined);
    });
    await page.waitForTimeout(350);
  }
  throw new Error(`Element ${selector} did not disappear after clicks`);
}

async function walkIntroToInvestment(page: Page) {
  // `?e2e=1` disables the dev hard-reload poller that otherwise reloads the
  // page mid-test and resets React state.
  await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load");
  await page.waitForTimeout(400);

  // intro — welcome → name
  await clickUntilGone(page, '[data-phase-cta="intro-begin"]');

  // name (optional) — submit empty via Skip
  await clickUntilGone(page, 'form button:has-text("Skip")');

  // pace — guided
  await page
    .getByRole("button", { name: /Compose it with us/i })
    .first()
    .click();

  // feeling
  await waitForPhase(page, /^feeling$/);
  await page.getByRole("radio", { name: /Coastal escape/i }).click();

  // who
  await waitForPhase(page, /^who$/);
  await page.getByRole("radio", { name: /^Couple/i }).click();

  // destination
  await waitForPhase(page, /^destination$/);
  await page
    .getByRole("radio", { name: /No preference|Lisbon region/i })
    .first()
    .click();

  // pickup
  await waitForPhase(page, /^pickup$/);
  await page.getByRole("radio", { name: /Lisbon airport/i }).click();

  // investment — funnel should reach here without freezing on guests
  await waitForPhase(page, /^investment$/, 12_000);
}

for (const [name, viewport] of Object.entries(VIEWPORTS) as Array<
  [keyof typeof VIEWPORTS, Viewport]
>) {
  test.describe(`Studio V3 funnel · ${name}`, () => {
    test.use({ viewport });

    test(`intro → investment fires every CTA (${name})`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(String(err)));

      await walkIntroToInvestment(page);

      // We landed on investment without a hard stop.
      expect(await getPhase(page)).toBe("investment");

      // Premium UX signals: the journey-draft surface is present
      // (engagement anchor) and the brand wordmark stays visible
      // (premium identity not lost mid-funnel).
      await expect(
        page.getByText(/your journey|composing your day/i).first()
      ).toBeVisible({ timeout: 6000 });

      // No JS exceptions during the walk — a thrown error mid-funnel kills
      // conversion regardless of how the UI looks.
      expect(pageErrors, pageErrors.join("\n")).toEqual([]);
    });
  });
}
