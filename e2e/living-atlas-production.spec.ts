import { expect, test, type Page } from "@playwright/test";

/**
 * Production browser gate for the public Experience Studio (/studio-v3).
 *
 * The deep checkout test restores a complete, non-sensitive Studio composition
 * from sessionStorage. That is the same public recovery path used after a
 * refresh, but avoids making checkout verification depend on cinematic timing,
 * Mapbox or a long generic funnel walker.
 */

test.describe.configure({ timeout: 180_000 });

const STORAGE_KEY = "yes.studio-v3.session.v1";
const GUIDE_NOTE = "Prefer Quinta do Piloto and a vegetarian lunch.";

const INTERNAL_COPY = [
  "Living Atlas",
  "Stripe sandbox",
  "sandbox",
  "Isolated preview",
  "skeleton",
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
  firstName: "Studio",
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
  await expect(page.locator('[data-testid="studio-v3-root"]').first()).toBeVisible({
    timeout: 20_000,
  });
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
  await waitForStudioHydration(page);
}

async function dismissReaction(page: Page) {
  const overlay = page.locator('button[aria-label="Continue"].fixed.inset-0').first();
  if (await overlay.isVisible({ timeout: 500 }).catch(() => false)) {
    await overlay.click({ timeout: 2_000 }).catch(() => undefined);
  }
}

test("a restored composition reaches Guest Details and checkout exactly once", async ({ page }) => {
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

  await restoreStudioState(page, COMPOSED_STATE);
  const root = page.locator('[data-testid="studio-v3-root"]').first();
  await expect(root).toHaveAttribute("data-phase", "confirmation");
  await expectNoInternalCopy(page);

  // Prove the restored composition survives another real refresh.
  await page.reload();
  await waitForStudioHydration(page);
  await expect(root).toHaveAttribute("data-phase", "confirmation");

  await page.getByTestId("studio-v3-final-reveal-continue").click();
  await expect(root).toHaveAttribute("data-phase", "guestDetails", { timeout: 10_000 });
  const submit = page.getByTestId("studio-v3-guest-details-submit");
  await expect(submit).toBeVisible({ timeout: 10_000 });

  await page
    .getByLabel(/full name|your name/i)
    .first()
    .fill("Studio QA");
  await page.getByLabel(/email/i).first().fill("studio-qa@yesexperiences.test");
  await page
    .getByLabel(/phone|whatsapp/i)
    .first()
    .fill("+351911111111");
  const pickup = page.getByLabel(/pickup address/i).first();
  if (await pickup.isVisible().catch(() => false)) {
    await pickup.fill("Hotel Avenida Palace, Lisbon");
  }
  const notes = page.getByPlaceholder(/winery preferences|anything not shown/i).first();
  await expect(notes).toBeVisible();
  await notes.fill(GUIDE_NOTE);

  await submit.click();
  await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible({ timeout: 20_000 });
  await expect(root).toHaveAttribute("data-phase", "checkoutSummary");
  await expectNoInternalCopy(page);

  // The tab-scoped session key is composition-recovery only: it must never
  // carry personal data. The guide note travels in the checkout payload
  // (asserted below), not in browser storage.
  const stored = await page.evaluate((key) => window.sessionStorage.getItem(key), STORAGE_KEY);
  expect(stored).not.toContain(GUIDE_NOTE);
  expect(stored).not.toContain("Studio QA");
  expect(stored).not.toContain("studio-qa@yesexperiences.test");
  expect(stored).not.toContain("+351911111111");
  expect(stored).not.toContain("Hotel Avenida Palace, Lisbon");

  const parsedStored = JSON.parse(stored ?? "{}") as Record<string, unknown>;
  expect(parsedStored.guestDraft).toBeNull();
  expect(parsedStored.firstName).toBeNull();
  // Non-personal composition answers still survive.
  expect(parsedStored.phase).toBe("checkoutSummary");
  expect(parsedStored.tourId).toBe("arrabida-wine-allinclusive");
  expect(parsedStored.feeling).toBe("wine-food");
  expect(parsedStored.rhythm).toBe("balanced");
  expect(parsedStored.interests).toEqual(["wine", "gastronomy", "coast"]);

  const reserve = page.getByTestId("studio-v3-checkout-summary-reserve");
  await expect(reserve).toBeVisible();
  await reserve.click();
  // A fast second tap must not produce another server invocation. The button
  // normally becomes a branded pending skeleton before this attempt completes.
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
  const root = page.locator('[data-testid="studio-v3-root"]').first();
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
  await expectNoInternalCopy(page);
});
