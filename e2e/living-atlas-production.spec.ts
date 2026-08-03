import { expect, test, type Page } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";

/**
 * P0 production journey for the public Experience Studio (/studio-v3).
 *
 * The reasoning layer is integrated *inside* Studio V3, so this spec drives
 * the real integrated funnel: intro → composition → adaptive refinement →
 * Refine/Travel File → refresh recovery → final reveal → guest details →
 * checkout summary.
 *
 * This journey must never skip: it either passes or fails, on desktop and
 * on mobile Chromium. It also proves the tab-scoped session snapshot never
 * contains personal data.
 */

test.describe.configure({ timeout: 420_000 });

const STUDIO_SESSION_KEY = "yes.studio-v3.session.v1";

const GUEST = {
  name: "Amelia Vasconcelos",
  email: "studio-qa@yesexperiences.test",
  phone: "+351911222333",
  pickup: "Hotel Avenida Palace, Lisbon",
  wineryNote: "Prefer Quinta do Piloto and a vegetarian lunch.",
};

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
  await expect(page.locator('[data-testid="studio-v3-root"]').first()).toBeVisible({
    timeout: 45_000,
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

async function readSessionSnapshot(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.sessionStorage.getItem(key), STUDIO_SESSION_KEY);
}

async function expectSessionHasNoPii(page: Page) {
  const raw = await readSessionSnapshot(page);
  expect(raw, "the Studio must persist a composition snapshot").not.toBeNull();
  const value = raw as string;
  for (const secret of [GUEST.name, GUEST.email, GUEST.phone, GUEST.pickup, GUEST.wineryNote]) {
    expect(value, `session snapshot must not contain "${secret}"`).not.toContain(secret);
  }
  const parsed = JSON.parse(value) as { firstName?: unknown; guestDraft?: unknown };
  expect(parsed.firstName ?? null).toBeNull();
  expect(parsed.guestDraft ?? null).toBeNull();
}

async function beginStudio(page: Page) {
  const begin = page.getByRole("button", { name: /^Begin$/ }).first();
  await expect(begin).toBeVisible({ timeout: 30_000 });
  await begin.click();
  await waitForStudioHydration(page);
}

async function currentPhase(page: Page): Promise<string | null> {
  return page.locator('[data-testid="studio-v3-root"]').first().getAttribute("data-phase");
}

test("the Studio composes a day, survives a refresh and reaches the checkout summary", async ({
  page,
}) => {
  await page.goto("/studio-v3?e2e=1");
  await expectNoInternalCopy(page);

  await beginStudio(page);
  // The walker answers the composition questions, including the adaptive
  // wine refinement, and lands on the Refine / Travel File screen.
  await walkToReveal(page);

  const refine = page.locator('[data-studio-v3-screen="refine"]').first();
  await expect(refine).toBeVisible({ timeout: 45_000 });

  // Reasons must be shown — the traveller is told why this day works.
  await expect(page.getByTestId("studio-v3-travel-file-reasons").first()).toBeVisible({
    timeout: 20_000,
  });

  // Alternatives stay differentiated and strictly limited.
  const alternatives = page.getByTestId("studio-v3-other-direction");
  expect(await alternatives.count()).toBeLessThanOrEqual(2);


  // Session-refresh recovery: the composed day must survive a reload.
  const phaseBefore = await currentPhase(page);
  await page.reload();
  await waitForStudioHydration(page);
  await expect
    .poll(async () => currentPhase(page), {
      timeout: 30_000,
      message: "a composed day must survive a refresh",
    })
    .toBe(phaseBefore);
  await expect(page.locator('[data-studio-v3-screen="refine"]').first()).toBeVisible({
    timeout: 45_000,
  });


  await advanceRefineToStorytelling(page);

  const continueCta = page.getByTestId("studio-v3-final-reveal-continue");
  await expect(continueCta).toBeVisible({ timeout: 45_000 });
  await expectNoInternalCopy(page);
  await continueCta.click();

  const submit = page.getByTestId("studio-v3-guest-details-submit");
  await expect(submit).toBeVisible({ timeout: 30_000 });
  await expectNoInternalCopy(page);

  await page.getByLabel(/full name/i).first().fill(GUEST.name);
  await page.getByLabel(/^email/i).first().fill(GUEST.email);
  await page
    .getByLabel(/phone \/ whatsapp/i)
    .first()
    .fill(GUEST.phone);
  await page
    .getByLabel(/pickup address/i)
    .first()
    .fill(GUEST.pickup);
  await page.getByPlaceholder(/winery preferences|anything not shown/i).first().fill(
    GUEST.wineryNote,
  );

  // A tour date is required and must respect the booking lead time, so always
  // set one comfortably in the future.
  const dateInput = page.locator('input[type="date"]').first();
  await expect(dateInput).toBeVisible({ timeout: 10_000 });
  const future = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
  await dateInput.fill(future);


  await submit.scrollIntoViewIfNeeded();
  await submit.click();


  const summary = page.getByTestId("studio-v3-checkout-summary");
  await expect(summary).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("studio-v3-checkout-summary-stops")).toBeVisible({
    timeout: 20_000,
  });
  await expectNoInternalCopy(page);

  // The personal data just entered must never reach sessionStorage.
  await expectSessionHasNoPii(page);
});

test("only a relevant adaptive refinement is asked", async ({ page }) => {
  // Seed a wine-led Arrábida composition just before the refinement beat, so
  // the branch under test is deterministic instead of walk-order dependent.
  await page.goto("/studio-v3?e2e=1");
  await page.evaluate(
    ({ key, state }) => window.sessionStorage.setItem(key, JSON.stringify(state)),
    {
      key: STUDIO_SESSION_KEY,
      state: {
        phase: "rhythm",
        feeling: "wine-food",
        companions: "couple",
        destinationIntent: "arrabida-setubal-azeitao",
        interests: ["wine", "gastronomy"],
        adults: 2,
        minorAges: [],
        guests: 2,
      },
    },
  );
  await page.reload();
  await waitForStudioHydration(page);

  // Answer the rhythm beat and continue into the adaptive question.
  const rhythm = page.locator('[data-option-id="full"]').first();
  if (await rhythm.isVisible().catch(() => false)) await rhythm.click();
  const cont = page
    .locator('[data-phase-cta="continue"]:not([data-phase-cta-disabled="true"])')
    .first();
  if (await cont.isVisible().catch(() => false)) await cont.click();

  await expect
    .poll(async () => currentPhase(page), { timeout: 20_000 })
    .not.toBe("rhythm");

  // Wine interests may only surface the wine branch — never coast, hands-on
  // or local-life questions the traveller never signalled.
  if ((await currentPhase(page)) === "refinement") {
    await expect(page.locator('[data-option-id^="wine-"]').first()).toBeVisible({
      timeout: 10_000,
    });
    expect(await page.locator('[data-option-id^="coast-"]').count()).toBe(0);
    expect(await page.locator('[data-option-id^="hands-"]').count()).toBe(0);
    expect(await page.locator('[data-option-id^="local-"]').count()).toBe(0);
  }
  await expectNoInternalCopy(page);
});


test("the retired preview URL resolves to the canonical public Studio", async ({ page }) => {
  await page.goto("/studio-living-atlas-preview?source=qa");
  await expect(page).toHaveURL(/\/studio-v3\?source=qa$/);
  await expect(page.getByRole("button", { name: /^Begin$/ }).first()).toBeVisible({
    timeout: 45_000,
  });
  await expectNoInternalCopy(page);
});
