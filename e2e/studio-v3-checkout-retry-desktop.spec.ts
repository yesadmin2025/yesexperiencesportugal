import { expect, test, type Page } from "@playwright/test";

/**
 * Studio V3 · checkout recovery @ 1440px.
 *
 * A temporary create-checkout failure must never eject the traveller from the
 * summary or lose the quote/details they just reviewed. The same Reserve CTA
 * becomes an explicit retry and may safely create one fresh request.
 *
 * No Stripe session is created and no payment is taken in this test.
 */

// Match the production journey budget; individual checkout assertions stay bounded.
test.describe.configure({ timeout: 180_000 });

const STORAGE_KEY = "yes.studio-v3.session.v1";

// Avoid a calendar regression caused solely by an expired fixture date.
function futureLisbonDate(daysAhead = 28): string {
  const target = new Date(Date.now() + daysAhead * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(target);
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${date.year}-${date.month}-${date.day}`;
}

const COMPOSED_STATE = {
  phase: "confirmation",
  feeling: "wine-food",
  companions: "couple",
  occasion: "none",
  dateMode: "exact",
  dateExact: futureLisbonDate(),
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

async function restoreStudioState(page: Page) {
  // Restore a returning traveller's composition before hydration, as in
  // living-atlas-production.spec.ts. Avoid racing the persistence effect.
  await page.addInitScript(
    ({ key, value }) => {
      const seeded = "__yes_studio_retry_seed_once";
      if (window.sessionStorage.getItem(seeded) === "1") return;
      window.sessionStorage.setItem(key, JSON.stringify(value));
      window.sessionStorage.setItem(seeded, "1");
    },
    { key: STORAGE_KEY, value: COMPOSED_STATE },
  );
  await page.goto("/studio", { waitUntil: "domcontentloaded" });
  await waitForStudioHydration(page);
  // Ensure the composition genuinely persisted before refreshing; never re-seed.
  await expect.poll(
    () => page.evaluate((key) => {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return null;
      try { return (JSON.parse(raw) as { phase?: string }).phase ?? null; }
      catch { return null; }
    }, STORAGE_KEY),
    { timeout: 15_000 },
  ).toBe("storyboard");
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForStudioHydration(page);
}

async function reachCheckoutSummary(page: Page) {
  const root = page.locator('[data-testid="studio-v3-root"]').first();
  await restoreStudioState(page);
  await expect(root).toHaveAttribute("data-phase", "storyboard");

  const handoff = page.getByTestId("studio-v3-handoff-primary");
  await expect(handoff).toBeVisible({ timeout: 10_000 });
  await expect(handoff).toBeEnabled({ timeout: 10_000 });
  await expect(handoff).toHaveAttribute("data-day-certified", "true", { timeout: 10_000 });
  await handoff.click({ timeout: 10_000 });
  await expect(root).toHaveAttribute("data-phase", "guestDetails", { timeout: 10_000 });

  await page
    .getByLabel(/full name|your name/i)
    .first()
    .fill("Studio Retry");
  await page.getByLabel(/email/i).first().fill("studio-retry@yesexperiences.test");
  await page
    .getByLabel(/phone|whatsapp/i)
    .first()
    .fill("+351922222222");

  const pickup = page.getByLabel(/pickup address/i).first();
  if (await pickup.isVisible().catch(() => false)) {
    await pickup.fill("Hotel Avenida Palace, Lisbon");
  }

  await page.getByTestId("studio-v3-guest-details-submit").click();
  await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible({ timeout: 20_000 });
  await expect(root).toHaveAttribute("data-phase", "checkoutSummary");
  return root;
}

test("checkout creation failure stays retryable without losing the reviewed state", async ({
  page,
}) => {
  let checkoutInvocations = 0;

  await page.route(/\/functions\/v1\/create-signature-checkout(?:\?|$)/, async (route) => {
    checkoutInvocations += 1;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "temporary checkout failure" }),
    });
  });

  const root = await reachCheckoutSummary(page);
  const summary = page.getByTestId("studio-v3-checkout-summary");
  const total = page.getByTestId("studio-v3-checkout-summary-total");
  const reserve = page.getByTestId("studio-v3-checkout-summary-reserve");
  const error = page.getByTestId("studio-v3-checkout-summary-error");
  const totalBefore = (await total.textContent())?.trim() ?? "";

  expect(totalBefore).not.toBe("");
  await expect(summary).toContainText("Studio Retry");
  await expect(summary).toContainText("studio-retry@yesexperiences.test");
  await expect(summary).toContainText("+351922222222");

  await reserve.click();
  await expect.poll(() => checkoutInvocations, { timeout: 10_000 }).toBe(1);
  await expect(error).toBeVisible({ timeout: 10_000 });
  await expect(error).toContainText("Your details and total are still here");
  await expect(root).toHaveAttribute("data-phase", "checkoutSummary");
  await expect(total).toHaveText(totalBefore);
  await expect(summary).toContainText("Studio Retry");
  await expect(reserve).toHaveText(/try secure checkout again/i);

  await reserve.click();
  await expect.poll(() => checkoutInvocations, { timeout: 10_000 }).toBe(2);
  await expect(error).toBeVisible({ timeout: 10_000 });
  await expect(root).toHaveAttribute("data-phase", "checkoutSummary");
  await expect(total).toHaveText(totalBefore);
  await expect(summary).toContainText("studio-retry@yesexperiences.test");
  await expect(reserve).toHaveText(/try secure checkout again/i);
  await expect(page.getByTestId("studio-v3-checkout-summary-stripe-inline")).toHaveCount(0);
  await expect(page).toHaveURL(/\/studio(?:\?|$)/);
});
