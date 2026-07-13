import { test, expect, type Page } from "@playwright/test";

const STORAGE_KEY = "yes.studio.v3.draft.v1";

const phases = ["feeling", "destination", "who", "occasion", "date"] as const;

function draftForPhase(phase: (typeof phases)[number]) {
  return {
    version: 2,
    draftId: `e2e-refresh-${phase}`,
    savedAt: Date.now(),
    state: {
      phase,
      feeling: "coastal",
      companions: null,
      occasion: null,
      dateMode: null,
      dateExact: null,
      pickup: null,
      guests: 2,
      minorAges: [],
      interests: [],
      rhythm: null,
      considerations: [],
      language: null,
      investment: null,
      tourId: null,
      journeyTitle: null,
      guestsInferred: false,
      guestsPrivateEvent: false,
      firstName: "Ana",
      editedRoutePoints: null,
      destinationIntent: "no-preference",
      pathMode: "guided",
      rerollCount: 0,
      guestDraft: null,
    },
    tourId: null,
    addOnIds: [],
  };
}

async function seed(page: Page, phase: (typeof phases)[number]) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(draftForPhase(phase))] as const,
  );
}

test.describe("Studio V3 refresh per phase", () => {
  test.use({ viewport: { width: 393, height: 800 } });

  for (const phase of phases) {
    test(`refresh at ${phase} restores same phase and fires toast at most once`, async ({ page }) => {
      await seed(page, phase);
      await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
      const root = page.getByTestId("studio-v3-root");
      await expect(root).toHaveAttribute("data-phase", phase);
      await expect(page.getByText("Draft restored", { exact: true })).toBeVisible();

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(root).toHaveAttribute("data-phase", phase);
      await expect(page.getByText("Draft restored", { exact: true })).toHaveCount(0);
    });
  }
});
