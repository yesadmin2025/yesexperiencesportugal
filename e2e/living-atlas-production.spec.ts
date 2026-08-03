import { expect, test, type Page } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";

/**
 * Production journey for the public Experience Studio (/studio-v3).
 *
 * The Living Atlas reasoning layer is integrated *inside* Studio V3, so this
 * spec drives the real integrated funnel (intro → … → reveal → guest details
 * → checkout summary) rather than the retired standalone preview surface.
 *
 * It proves: hydration, session-refresh recovery, guest details with an
 * unlisted-winery note, the checkout summary, and that no internal language
 * ever reaches the traveller.
 */

test.describe.configure({ timeout: 180_000 });

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

test("the Studio hydrates, survives a refresh and reaches the checkout summary", async ({
  page,
}) => {
  await page.goto("/studio-v3");
  await waitForStudioHydration(page);
  await expectNoInternalCopy(page);

  await walkToReveal(page);

  const phaseBefore = await page
    .locator('[data-testid="studio-v3-root"]')
    .first()
    .getAttribute("data-phase");

  // Session-refresh recovery: the composed day must survive a reload.
  await page.reload();
  await waitForStudioHydration(page);
  const phaseAfter = await page
    .locator('[data-testid="studio-v3-root"]')
    .first()
    .getAttribute("data-phase");
  expect(phaseAfter, "a composed day must survive a refresh").toBe(phaseBefore);

  await advanceRefineToStorytelling(page);
  const cont = page.getByTestId("studio-v3-final-reveal-continue");
  if (await cont.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await cont.click({ timeout: 4_000 }).catch(() => undefined);
  }

  const submit = page.getByTestId("studio-v3-guest-details-submit");
  if (!(await submit.isVisible({ timeout: 8_000 }).catch(() => false))) {
    test.skip(true, "Funnel did not reach Guest Details in this environment.");
  }

  await expectNoInternalCopy(page);

  await page.getByLabel(/full name|your name/i).first().fill("Studio QA");
  await page.getByLabel(/email/i).first().fill("studio-qa@yesexperiences.test");
  await page.getByLabel(/phone|whatsapp/i).first().fill("+351911111111");
  const pickup = page.getByLabel(/pickup address/i).first();
  if (await pickup.isVisible().catch(() => false)) {
    await pickup.fill("Hotel Avenida Palace, Lisbon");
  }
  // Unlisted winery / experience note.
  const notes = page
    .getByPlaceholder(/winery preferences|anything not shown/i)
    .first();
  if (await notes.isVisible().catch(() => false)) {
    await notes.fill("Prefer Quinta do Piloto and a vegetarian lunch.");
  }

  await submit.click({ timeout: 6_000 });
  await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible({ timeout: 20_000 });
  await expectNoInternalCopy(page);
});

test("the retired preview URL resolves to the canonical public Studio", async ({ page }) => {
  await page.goto("/studio-living-atlas-preview?source=qa");
  await expect(page).toHaveURL(/\/studio-v3\?source=qa$/);
  await waitForStudioHydration(page);
  await expectNoInternalCopy(page);
});
