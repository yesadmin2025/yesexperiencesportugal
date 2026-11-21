import { expect, test, type Page } from "@playwright/test";

/**
 * Production browser gate for the public Experience Studio (/studio).
 *
 * The deep checkout test restores a complete, non-sensitive Studio composition
 * from sessionStorage. That is the same public recovery path used after a
 * refresh, but avoids making checkout verification depend on cinematic timing,
 * Mapbox or a long generic funnel walker.
 */

test.describe.configure({ timeout: 180_000 });

const STORAGE_KEY = "yes.studio-v3.session.v1";
const GUIDE_NOTE = "Prefer Quinta do Piloto and a vegetarian lunch.";

// A fixed date eventually becomes invalid and makes the booking smoke fail for
// a calendar reason unrelated to the Studio. Keep it comfortably beyond the
// three-day Lisbon-time lead without weakening production date validation.
function futureLisbonBookingDate(daysAhead = 21): string {
  const future = new Date(Date.now() + daysAhead * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(future);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

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
  dateExact: futureLisbonBookingDate(),
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
  // Restore a tab-scoped, non-sensitive draft BEFORE React/TanStack hydration,
  // as happens for a returning customer. Post-hydration writes can race with
  // the app's own state persistence and are flaky on slower CI viewports.
  // The one-time marker ensures a later reload genuinely tests persistence:
  // the test cannot secretly re-seed a lost draft after the first navigation.
  await page.addInitScript(
    ({ key, value }) => {
      const seeded = "__yes_studio_p0_seed_once";
      if (window.sessionStorage.getItem(seeded) === "1") return;
      window.sessionStorage.setItem(key, JSON.stringify(value));
      window.sessionStorage.setItem(seeded, "1");
    },
    { key: STORAGE_KEY, value: state },
  );
  await page.goto("/studio", { waitUntil: "domcontentloaded" });
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
  // P12 deliberately resumes checkout-adjacent legacy phases at the unified
  // Your Day surface so a returning traveller regains context before details.
  await expect(root).toHaveAttribute("data-phase", "storyboard");
  await expectNoInternalCopy(page);

  // Prove the browser really committed the resumed draft to the session
  // before reloading. The persistence effect runs after the visible phase
  // render; without this barrier a fast desktop runner can reload too early.
  await expect
    .poll(
      async () =>
        page.evaluate((key) => {
          const raw = window.sessionStorage.getItem(key);
          if (!raw) return null;
          try {
            return (JSON.parse(raw) as { phase?: string }).phase ?? null;
          } catch {
            return null;
          }
        }, STORAGE_KEY),
      { timeout: 15_000 },
    )
    .toBe("storyboard");
  await page.reload();
  await waitForStudioHydration(page);
  await expect(root).toHaveAttribute("data-phase", "storyboard", { timeout: 15_000 });

  // P8 retired the standalone reveal CTA inside the main funnel. The unified
  // Your Day surface owns the canonical handoff into Guest Details.
  await page.getByTestId("studio-v3-handoff-primary").click();
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
  // Guest preferences are deliberately collapsed by default in the public UI.
  await page.getByTestId("studio-v3-guest-details-optional-toggle").click();
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
  await expect(page).toHaveURL(/\/studio(?:\?|$)/);
});

test("adaptive refinement appears only for a genuine supported direction", async ({ page }) => {
  // Arrábida offers both honest coastal directions: water and wild beaches.
  // The current public journey collects Logistics before the optional
  // Director; test the Director directly rather than assuming the old order.
  const relevant = {
    ...COMPOSED_STATE,
    phase: "refinement",
    rhythm: "balanced",
    feeling: "coastal",
    interests: ["coast", "gastronomy"],
    refinement: null,
    destinationIntent: "arrabida-setubal-azeitao",
    questionHistory: [],
  };
  await restoreStudioState(page, relevant);
  const root = page.locator('[data-testid="studio-v3-root"]').first();
  await expect(root).toHaveAttribute("data-phase", "refinement");
  await expect(page.getByTestId("studio-v3-refinement")).toBeVisible({ timeout: 10_000 });

  // A destination bound to a single real Signature must never fabricate the
  // same optional choice. Validate the canonical phase decision itself.
  const { isPhaseRelevant } = await import("../src/components/studio-v3/curation");
  const fixedDestination = { ...relevant, destinationIntent: "alentejo-evora-wine" };
  expect(isPhaseRelevant("refinement", fixedDestination as Parameters<typeof isPhaseRelevant>[1])).toBe(false);
});

test("the retired preview URL resolves to the canonical public Studio", async ({ page }) => {
  await page.goto("/studio-living-atlas-preview?source=qa");
  await expect(page).toHaveURL(/\/studio\?source=qa$/);
  await waitForStudioHydration(page);
  await expectNoInternalCopy(page);
});
