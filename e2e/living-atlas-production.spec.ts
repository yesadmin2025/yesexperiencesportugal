import { expect, test, type Page } from "@playwright/test";
import {
  advanceRefineToStorytelling,
  STUDIO_ROOT,
  walkToReveal,
} from "./studio-v3-walk-to-reveal";

test.describe.configure({ timeout: 180_000 });

const SESSION_KEY = "yes.studio-v3.session.v1";
const INTERNAL_COPY = [
  "Stripe sandbox",
  "Isolated preview",
  "missing coordinates",
  "engine error",
  "route unavailable",
  "skeleton unresolved",
];

async function waitForStudio(page: Page) {
  const root = page.locator(STUDIO_ROOT).first();
  await expect(root).toBeVisible({ timeout: 45_000 });
  await expect
    .poll(() => root.getAttribute("data-phase"), { timeout: 45_000 })
    .not.toBeNull();
  return root;
}

async function assertCustomerCopyIsClean(page: Page) {
  const body = page.locator("body");
  for (const phrase of INTERNAL_COPY) {
    await expect(body).not.toContainText(phrase, { ignoreCase: true });
  }
}

async function readStoredState(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate((key) => {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  }, SESSION_KEY);
}

async function fillDateIfEditable(page: Page) {
  const date = page.locator('input[type="date"]').first();
  if (!(await date.isVisible().catch(() => false))) return;
  const minimum = await date.getAttribute("min");
  if (minimum) await date.fill(minimum);
}

test("integrated Studio V3 reaches checkout and restores its intelligent composition", async ({
  page,
}) => {
  await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForStudio(page);
  await walkToReveal(page);

  const refine = page.locator('[data-studio-v3-screen="refine"]').first();
  await expect(refine).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("studio-v3-travel-file-reasons")).toBeVisible();

  const alternatives = page.getByTestId("studio-v3-other-direction");
  expect(await alternatives.count()).toBeLessThanOrEqual(2);

  const beforeRefresh = await readStoredState(page);
  expect(beforeRefresh).not.toBeNull();
  expect(beforeRefresh?.phase).toBe("storyboard");
  expect(beforeRefresh?.refinement).toBeTruthy();

  await page.reload({ waitUntil: "domcontentloaded" });
  const restoredRoot = await waitForStudio(page);
  await expect(restoredRoot).toHaveAttribute("data-phase", "storyboard", { timeout: 20_000 });
  await expect(page.locator('[data-studio-v3-screen="refine"]').first()).toBeVisible();

  const afterRefresh = await readStoredState(page);
  expect(afterRefresh?.phase).toBe("storyboard");
  expect(afterRefresh?.refinement).toBe(beforeRefresh?.refinement);

  await advanceRefineToStorytelling(page);
  await expect(page.getByTestId("studio-v3-final-reveal")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("studio-v3-living-atlas-reasons")).toBeVisible();
  expect(await page.getByTestId("studio-v3-other-direction").count()).toBeLessThanOrEqual(2);
  await assertCustomerCopyIsClean(page);

  await page.getByTestId("studio-v3-final-reveal-continue").click();
  await expect(page.getByTestId("studio-v3-guest-details")).toBeVisible({ timeout: 15_000 });

  await page.getByLabel(/^Full name/).fill("Studio V3 Release Test");
  await page.getByLabel(/^Email/).fill("studio-v3-release@example.com");
  await page.getByLabel(/Phone \/ WhatsApp/).fill("+351 910 000 000");
  await fillDateIfEditable(page);
  await page.getByLabel(/Pickup address \/ hotel/).fill("Lisbon release-gate hotel");
  await page
    .getByPlaceholder("Winery preferences or anything not shown in the Studio")
    .fill("Prefer Quinta do Piloto, or another winery not listed in the Studio, and vegetarian lunch.");

  await page.getByTestId("studio-v3-guest-details-submit").click();
  await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("studio-v3-checkout-summary-stops")).toBeVisible();
  await assertCustomerCopyIsClean(page);
});

test("irrelevant adaptive refinement is skipped rather than becoming another form step", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key }) => {
      window.sessionStorage.setItem(
        key,
        JSON.stringify({
          phase: "rhythm",
          feeling: "romance",
          companions: "couple",
          destinationIntent: "alentejo-evora-wine",
          pickup: "lisbon",
          guests: 2,
          adults: 2,
          minorAges: [],
          interests: [],
          rhythm: null,
          refinement: null,
          considerations: [],
          pathMode: "guided",
        }),
      );
    },
    { key: SESSION_KEY },
  );

  await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
  const root = await waitForStudio(page);
  await expect(root).toHaveAttribute("data-phase", "rhythm", { timeout: 15_000 });

  await page.locator('[data-option-id="balanced"]').click();
  await expect(root).not.toHaveAttribute("data-phase", "refinement", { timeout: 8_000 });
  await expect
    .poll(() => root.getAttribute("data-phase"), { timeout: 15_000 })
    .toMatch(/occasion|date|considerations|language|map|storyboard/);

  const stored = await readStoredState(page);
  expect(stored?.refinement ?? null).toBeNull();
});

test("the former Living Atlas preview redirects to the single canonical Studio", async ({ page }) => {
  await page.goto("/studio-living-atlas-preview?source=qa", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/studio-v3\?source=qa$/);
  await waitForStudio(page);
  await expect(page.locator(STUDIO_ROOT).first()).toBeVisible();
  await expect(page.getByTestId("living-atlas-app")).toHaveCount(0);
  await assertCustomerCopyIsClean(page);
});
