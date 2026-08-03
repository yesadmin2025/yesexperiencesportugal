import { expect, test, type Page } from "@playwright/test";
import {
  advanceRefineToStorytelling,
  STUDIO_ROOT,
  walkToReveal,
} from "./studio-v3-walk-to-reveal";

test.describe.configure({ timeout: 180_000 });

const SESSION_KEY = "yes.studio-v3.session.v1";
const INTERNAL_COPY = [
  "Living Atlas",
  "Stripe sandbox",
  "sandbox",
  "Isolated preview",
  "skeleton unresolved",
  "missing coordinates",
  "engine error",
  "route unavailable",
];

async function waitForStudioHydration(page: Page) {
  await expect(page.getByTestId("living-atlas-app")).toHaveAttribute("data-hydrated", "true", {
    timeout: 45_000,
  });
  const root = page.locator(STUDIO_ROOT).first();
  await expect(root).toBeVisible({ timeout: 20_000 });
  return root;
}

async function startStudio(page: Page) {
  const root = await waitForStudioHydration(page);
  if ((await root.getAttribute("data-phase")) === "intro") {
    await page.getByRole("button", { name: /^Begin$/i }).click();
    await expect
      .poll(() => root.getAttribute("data-phase"), { timeout: 15_000 })
      .not.toBe("intro");
  }
  return root;
}

async function expectNoInternalCopy(page: Page) {
  const body = (await page.locator("body").innerText()).toLowerCase();
  for (const term of INTERNAL_COPY) {
    expect(body, `customer-facing copy must not contain "${term}"`).not.toContain(
      term.toLowerCase(),
    );
  }
}

async function readStoredState(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate((key) => {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  }, SESSION_KEY);
}

async function fillDateIfVisible(page: Page) {
  const date = page.locator('input[type="date"]').first();
  if (!(await date.isVisible().catch(() => false))) return;
  const minimum = await date.getAttribute("min");
  if (minimum) await date.fill(minimum);
}

test("the integrated Studio reaches checkout, restores the day and keeps PII out of session", async ({
  page,
}) => {
  await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
  const root = await startStudio(page);
  await expectNoInternalCopy(page);

  await walkToReveal(page);
  await expect(root).toHaveAttribute("data-phase", "storyboard", { timeout: 30_000 });
  await expect(page.locator('[data-studio-v3-screen="refine"]')).toBeVisible();
  await expect(page.getByTestId("studio-v3-travel-file-reasons")).toBeVisible();
  expect(await page.getByTestId("studio-v3-other-direction").count()).toBeLessThanOrEqual(2);

  const beforeRefresh = await readStoredState(page);
  expect(beforeRefresh?.phase).toBe("storyboard");
  expect(beforeRefresh?.refinement).toBeTruthy();

  await page.reload({ waitUntil: "domcontentloaded" });
  const restoredRoot = await waitForStudioHydration(page);
  await expect(restoredRoot).toHaveAttribute("data-phase", "storyboard", { timeout: 20_000 });
  await expect(page.locator('[data-studio-v3-screen="refine"]')).toBeVisible();

  const afterRefresh = await readStoredState(page);
  expect(afterRefresh?.phase).toBe("storyboard");
  expect(afterRefresh?.refinement).toBe(beforeRefresh?.refinement);

  await advanceRefineToStorytelling(page);
  await expect(page.getByTestId("studio-v3-final-reveal")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("studio-v3-living-atlas-reasons")).toBeVisible();
  expect(await page.getByTestId("studio-v3-other-direction").count()).toBeLessThanOrEqual(2);
  await expectNoInternalCopy(page);

  await page.getByTestId("studio-v3-final-reveal-continue").click();
  await expect(page.getByTestId("studio-v3-guest-details")).toBeVisible({ timeout: 15_000 });

  const fullName = "Studio V3 Release Test";
  const email = "studio-v3-release@example.com";
  const phone = "+351 910 000 000";
  const preference =
    "Prefer Quinta do Piloto, or another winery not listed in the Studio, and vegetarian lunch.";

  await page.getByLabel(/^Full name/).fill(fullName);
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/Phone \/ WhatsApp/).fill(phone);
  await fillDateIfVisible(page);
  await page.getByLabel(/Pickup address \/ hotel/).fill("Lisbon release-gate hotel");
  await page
    .getByPlaceholder(/Winery preferences|anything not shown in the Studio/i)
    .fill(preference);

  await page.getByTestId("studio-v3-guest-details-submit").click();
  await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("studio-v3-checkout-summary-stops")).toBeVisible();
  await expectNoInternalCopy(page);

  const persistedRaw = await page.evaluate(
    (key) => window.sessionStorage.getItem(key) ?? "",
    SESSION_KEY,
  );
  expect(persistedRaw).not.toContain(fullName);
  expect(persistedRaw).not.toContain(email);
  expect(persistedRaw).not.toContain(phone);
  expect(persistedRaw).not.toContain(preference);

  const persisted = persistedRaw ? (JSON.parse(persistedRaw) as Record<string, unknown>) : {};
  expect(persisted.firstName ?? null).toBeNull();
  expect(persisted.guestDraft ?? null).toBeNull();
});

test("an irrelevant adaptive refinement is skipped instead of becoming another form step", async ({
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
          firstName: null,
          guestDraft: null,
        }),
      );
    },
    { key: SESSION_KEY },
  );

  await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
  const root = await waitForStudioHydration(page);
  await expect(root).toHaveAttribute("data-phase", "rhythm", { timeout: 15_000 });

  await page.locator('[data-option-id="balanced"]').click();
  await expect(root).not.toHaveAttribute("data-phase", "refinement", { timeout: 8_000 });
  await expect
    .poll(() => root.getAttribute("data-phase"), { timeout: 15_000 })
    .toMatch(/occasion|date|considerations|language|map|storyboard/);

  const stored = await readStoredState(page);
  expect(stored?.refinement ?? null).toBeNull();
});

test("the retired preview URL resolves to the canonical public Studio", async ({ page }) => {
  await page.goto("/studio-living-atlas-preview?source=qa", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/studio-v3\?source=qa$/);
  await waitForStudioHydration(page);
  await expect(page.getByTestId("living-atlas-app")).toHaveAttribute("data-studio", "v3");
  await expectNoInternalCopy(page);
});
