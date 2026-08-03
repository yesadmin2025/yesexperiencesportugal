import { expect, test, type Page } from "@playwright/test";
import { advanceRefineToStorytelling, STUDIO_ROOT, walkToReveal } from "./studio-v3-walk-to-reveal";

/**
 * Production browser gate for the public Experience Studio (/studio-v3).
 *
 * The first test walks the real integrated funnel. The second restores a
 * complete non-sensitive composition to isolate checkout idempotency and the
 * guideNotes handoff. Neither path is allowed to skip.
 */

test.describe.configure({ timeout: 180_000 });

const STORAGE_KEY = "yes.studio-v3.session.v1";
const GUIDE_NOTE = "Prefer Quinta do Piloto and a vegetarian lunch.";
const FULL_NAME = "Studio V3 Release Test";
const EMAIL = "studio-v3-release@example.com";
const PHONE = "+351 910 000 000";

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

const COMPOSED_STATE = {
  phase: "confirmation",
  feeling: "wine-food",
  companions: "couple",
  occasion: "none",
  dateMode: "exact",
  dateExact: "2026-10-09",
  pickup: "lisbon",
  guests: 2,
  adults: 2,
  minorAges: [],
  interests: ["wine", "gastronomy", "coast"],
  rhythm: "balanced",
  refinement: "wine-cellar-depth",
  considerations: ["none"],
  language: "en",
  investment: "elevated",
  tourId: "arrabida-wine-allinclusive",
  journeyTitle: "Arrábida, cellar stories and the Portuguese table",
  guestsInferred: false,
  guestsPrivateEvent: false,
  firstName: null,
  editedRoutePoints: null,
  destinationIntent: "arrabida-setubal-azeitao",
  pathMode: "guided",
  rerollCount: 0,
  guestDraft: null,
} as const;

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
    await page.getByRole("button", { name: /^Skip$/i }).click();
    await page.getByRole("button", { name: /Compose it with us/i }).click();
    await expect.poll(() => root.getAttribute("data-phase"), { timeout: 15_000 }).not.toBe("intro");
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

async function restoreStudioState(page: Page, state: Record<string, unknown>) {
  await page.goto("/studio-v3");
  await waitForStudioHydration(page);
  await page.evaluate(
    ({ key, value }) => window.sessionStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: state },
  );
  await page.reload();
  return waitForStudioHydration(page);
}

async function readStoredState(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate((key) => {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  }, STORAGE_KEY);
}

async function fillDateIfVisible(page: Page) {
  const date = page.locator('input[type="date"]').first();
  if (!(await date.isVisible().catch(() => false))) return;
  const minimum = await date.getAttribute("min");
  if (minimum) await date.fill(minimum);
}

async function fillGuestDetails(page: Page, note: string) {
  await page.getByLabel(/^Full name/).fill(FULL_NAME);
  await page.getByLabel(/^Email/).fill(EMAIL);
  await page.getByLabel(/Phone \/ WhatsApp/).fill(PHONE);
  await fillDateIfVisible(page);
  await page.getByLabel(/Pickup address \/ hotel/).fill("Hotel Avenida Palace, Lisbon");
  await page.getByPlaceholder(/winery preferences|anything not shown/i).fill(note);
}

async function expectSessionContainsNoPII(page: Page, note: string) {
  const raw = await page.evaluate((key) => window.sessionStorage.getItem(key) ?? "", STORAGE_KEY);
  expect(raw).not.toContain(FULL_NAME);
  expect(raw).not.toContain(EMAIL);
  expect(raw).not.toContain(PHONE);
  expect(raw).not.toContain(note);

  const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  expect(parsed.firstName ?? null).toBeNull();
  expect(parsed.guestDraft ?? null).toBeNull();
}

async function dismissReaction(page: Page) {
  const overlay = page.locator('button[aria-label="Continue"].fixed.inset-0').first();
  if (await overlay.isVisible({ timeout: 500 }).catch(() => false)) {
    await overlay.click({ timeout: 2_000 }).catch(() => undefined);
  }
}

test("the integrated Studio walks from intro to checkout and restores the composed day", async ({
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
  expect(beforeRefresh?.firstName ?? null).toBeNull();
  expect(beforeRefresh?.guestDraft ?? null).toBeNull();

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
  await fillGuestDetails(page, GUIDE_NOTE);
  await page.getByTestId("studio-v3-guest-details-submit").click();

  await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("studio-v3-checkout-summary-stops")).toBeVisible();
  await expectNoInternalCopy(page);
  await expectSessionContainsNoPII(page, GUIDE_NOTE);
});

test("a restored composition hands guideNotes to checkout exactly once without persisting them", async ({
  page,
}) => {
  const checkoutBodies: string[] = [];
  let checkoutInvocations = 0;

  await page.route(/\/functions\/v1\/create-signature-checkout(?:\?|$)/, async (route) => {
    checkoutInvocations += 1;
    checkoutBodies.push(route.request().postData() ?? "");
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        clientSecret: "cs_test_studio_browser_gate",
        publishableKey: "pk_test_studio_browser_gate",
      }),
    });
  });

  const root = await restoreStudioState(page, COMPOSED_STATE);
  await expect(root).toHaveAttribute("data-phase", "confirmation");
  await expectNoInternalCopy(page);

  await page.reload();
  await waitForStudioHydration(page);
  await expect(root).toHaveAttribute("data-phase", "confirmation");

  await page.getByTestId("studio-v3-final-reveal-continue").click();
  await expect(root).toHaveAttribute("data-phase", "guestDetails", { timeout: 10_000 });
  await fillGuestDetails(page, GUIDE_NOTE);
  await page.getByTestId("studio-v3-guest-details-submit").click();

  await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible({ timeout: 20_000 });
  await expect(root).toHaveAttribute("data-phase", "checkoutSummary");
  await expectNoInternalCopy(page);
  await expectSessionContainsNoPII(page, GUIDE_NOTE);

  const reserve = page.getByTestId("studio-v3-checkout-summary-reserve");
  await expect(reserve).toBeVisible();
  await reserve.click();
  await reserve.click({ timeout: 750 }).catch(() => undefined);

  await expect.poll(() => checkoutInvocations, { timeout: 10_000 }).toBe(1);
  expect(checkoutBodies.join("\n")).toContain(GUIDE_NOTE);
  await expect(page).toHaveURL(/\/studio-v3(?:\?|$)/);
});

test("adaptive refinement appears only when it can change a supported direction", async ({
  page,
}) => {
  const relevant = {
    ...COMPOSED_STATE,
    phase: "rhythm",
    rhythm: null,
    feeling: "coastal",
    interests: ["coast"],
    refinement: null,
    destinationIntent: "arrabida-setubal-azeitao",
  };
  await restoreStudioState(page, relevant);
  const root = page.locator(STUDIO_ROOT).first();
  await page.locator('[data-option-id="balanced"]').click();
  await dismissReaction(page);
  await expect(page.getByTestId("studio-v3-refinement")).toBeVisible({ timeout: 10_000 });
  await expect(root).toHaveAttribute("data-phase", "refinement");

  const fixedDestination = {
    ...relevant,
    destinationIntent: "alentejo-evora-wine",
  };
  await page.evaluate(
    ({ key, value }) => window.sessionStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: fixedDestination },
  );
  await page.reload();
  await waitForStudioHydration(page);
  await page.locator('[data-option-id="balanced"]').click();
  await dismissReaction(page);
  await expect
    .poll(async () => root.getAttribute("data-phase"), { timeout: 10_000 })
    .not.toBe("rhythm");
  await expect(root).not.toHaveAttribute("data-phase", "refinement");
  await expect(page.getByTestId("studio-v3-refinement")).toHaveCount(0);
});

test("the retired preview URL resolves to the canonical public Studio", async ({ page }) => {
  await page.goto("/studio-living-atlas-preview?source=qa");
  await expect(page).toHaveURL(/\/studio-v3\?source=qa$/);
  await waitForStudioHydration(page);
  await expect(page.getByTestId("living-atlas-app")).toHaveAttribute("data-studio", "v3");
  await expectNoInternalCopy(page);
});
