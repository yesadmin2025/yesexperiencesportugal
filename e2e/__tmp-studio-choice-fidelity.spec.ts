/** TEMPORARY evidence spec — choice fidelity at 393px. Deleted after the run. */
import { test, expect, type Page } from "@playwright/test";
import { resetStudioV3State, advanceIntro } from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 800 } as const;

async function phaseOf(page: Page): Promise<string | null> {
  return page
    .locator("[data-phase]")
    .first()
    .getAttribute("data-phase")
    .catch(() => null);
}

async function doLogistics(page: Page) {
  const cta = page.locator('button[data-phase-cta="continue"]').first();
  for (let step = 0; step < 8; step++) {
    const days = page.locator(
      '[data-testid="studio-v3-logistics"] button[data-day]:not([disabled])',
    );
    const dayCount = await days.count().catch(() => 0);
    if (dayCount > 0) {
      await days
        .nth(Math.min(6, dayCount - 1))
        .click({ force: true, timeout: 4_000 })
        .catch(() => undefined);
    }
    const where = page.locator(
      'section[aria-label="Where the day begins"] [data-testid="studio-v3-choice"]',
    );
    if (await where.first().isVisible().catch(() => false)) {
      await where.first().click({ timeout: 4_000 }).catch(() => undefined);
    }
    if (!(await cta.isEnabled().catch(() => false))) return;
    await cta.click({ timeout: 4_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    if ((await phaseOf(page)) !== "logistics") return;
  }
}

async function clickKeyword(page: Page, re: RegExp): Promise<boolean> {
  const opts = page.locator(
    '[data-option-id]:not([data-selected="true"]), [data-phase-cta]:not([data-phase-cta="continue"])',
  );
  const n = Math.min(await opts.count().catch(() => 0), 24);
  for (let i = 0; i < n; i++) {
    const el = opts.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const txt = (await el.innerText().catch(() => "")) ?? "";
    if (re.test(txt)) {
      await el.click({ timeout: 3_000 }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

async function clickFirstOption(page: Page): Promise<boolean> {
  const opts = page.locator(
    '[data-option-id]:not([data-selected="true"]), [data-phase-cta]:not([data-phase-cta="continue"]):not([data-selected="true"])',
  );
  const first = opts.first();
  if (!(await first.isVisible().catch(() => false))) return false;
  await first.click({ timeout: 3_000 }).catch(() => undefined);
  return true;
}

async function runProfile(page: Page, keyword: RegExp) {
  await resetStudioV3State(page);
  const matched: string[] = [];
  for (let i = 0; i < 40; i++) {
    if (
      await page
        .locator('[data-studio-v3-screen="refine"]')
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      break;
    }
    const phase = await phaseOf(page);
    if (phase === "intro") {
      await advanceIntro(page);
      await page.waitForTimeout(400);
      continue;
    }
    if (phase === "logistics") {
      await doLogistics(page);
      await page.waitForTimeout(400);
      continue;
    }
    const hit = await clickKeyword(page, keyword);
    if (hit) matched.push((await phaseOf(page)) ?? "?");
    else await clickFirstOption(page);
    const cont = page.locator('button[data-phase-cta="continue"]:not([disabled])').first();
    if (await cont.isVisible().catch(() => false)) {
      await cont.click({ timeout: 3_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(700);
  }

  const refine = page.locator('[data-studio-v3-screen="refine"]').first();
  await expect(refine).toBeVisible({ timeout: 20_000 });
  // Certification runs async (driving times) — wait for the gate to settle.
  await refine
    .getByTestId("studio-v3-handoff-primary")
    .first()
    .and(page.locator(':not([disabled])'))
    .waitFor({ timeout: 40_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1500);
  const dayText = (await refine.innerText().catch(() => "")) ?? "";
  const primary = refine.getByTestId("studio-v3-handoff-primary").first();
  const certified = await primary.getAttribute("data-day-certified").catch(() => null);
  const disabled = await primary.isDisabled().catch(() => true);
  return { dayText, certified, disabled, matched };
}

test.describe("TMP choice fidelity @393", () => {
  test.use({ viewport: VIEWPORT });

  test("cheese-led day", async ({ page }) => {
    test.setTimeout(180_000);
    const r = await runProfile(page, /cheese|hands|craft|make/i);
    console.log("CHEESE debug:", await page.locator('[data-tmp-debug]').first().getAttribute('data-tmp-debug').catch(() => null));
    console.log("CHEESE blocked:", await page.locator('[data-reserve-blocked], [data-testid*="blocked"]').allInnerTexts().catch(() => []));
    console.log("CHEESE matched phases:", r.matched.join(","));
    console.log("CHEESE certified:", r.certified, "disabled:", r.disabled);
    console.log("CHEESE day:\n" + r.dayText.slice(0, 2500));
  });

  test("wine-led day", async ({ page }) => {
    test.setTimeout(180_000);
    const r = await runProfile(page, /wine|vineyard|cellar|taste/i);
    console.log("WINE certified:", r.certified, "disabled:", r.disabled);
    console.log("WINE day:\n" + r.dayText.slice(0, 2500));
  });

  test("heritage-led day", async ({ page }) => {
    test.setTimeout(180_000);
    const r = await runProfile(page, /heritage|history|roman|monast|palace|castle/i);
    console.log("HERITAGE certified:", r.certified, "disabled:", r.disabled);
    console.log("HERITAGE day:\n" + r.dayText.slice(0, 2500));
  });
});
