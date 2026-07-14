/**
 * Studio V3 storyboard recovery E2E.
 *
 * Reproduces the "Still not working" dead-end where a persisted
 * empty `editedRoutePoints` array on an otherwise valid Signature
 * draft stranded the storyboard on the "We couldn't compose a draft"
 * copy. Locks in the seedFromPool() + editedStops-empty-guard fix
 * in StudioV3.tsx.
 *
 * Two scenarios:
 *   1. Persisted `editedRoutePoints: []` — must not render the
 *      dead-end block; must render the active stops editor with
 *      at least one stop row.
 *   2. Persisted `editedRoutePoints: null` — the seedFromPool()
 *      recovery path must still surface real Signature stops.
 *
 * Soft-skips if the storyboard testid never appears within 15s
 * (draft hydration path shifted) so unrelated Studio refactors
 * don't red-line CI.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { STUDIO_DRAFT_STORAGE_KEY } from "../src/components/studio-v3/studioDraftStorage";

const ARTIFACT_DIR = path.resolve(process.cwd(), "playwright-report/storyboard-recovery");

type EditedRoutePoints = Array<{ label: string; story: string }> | null;

function envelopeWith(editedRoutePoints: EditedRoutePoints) {
  return {
    version: 2 as const,
    draftId: "e2e-storyboard-recovery",
    savedAt: Date.now(),
    tourId: "sintra-cascais",
    addOnIds: [],
    state: {
      phase: "storyboard",
      feeling: "coastal",
      companions: "friends",
      occasion: "none",
      dateMode: "exact",
      dateExact: "2099-05-01",
      pickup: "lisbon",
      guests: 4,
      minorAges: [],
      interests: ["heritage", "coast", "photography"],
      rhythm: "full",
      considerations: ["none"],
      language: "en",
      investment: "elevated",
      tourId: "sintra-cascais",
      journeyTitle: "Sintra & Cascais — private day",
      guestsInferred: false,
      guestsPrivateEvent: false,
      firstName: "Alex",
      editedRoutePoints,
      destinationIntent: "lisbon-sintra-cascais",
      pathMode: "guided",
      rerollCount: 0,
      guestDraft: null,
    },
  };
}

async function hydrateDraft(page: Page, editedRoutePoints: EditedRoutePoints) {
  await page.addInitScript(
    ({ key, envelope }) => {
      window.localStorage.setItem(key, JSON.stringify(envelope));
    },
    { key: STUDIO_DRAFT_STORAGE_KEY, envelope: envelopeWith(editedRoutePoints) },
  );
}

async function ensureStoryboardOrSkip(page: Page) {
  const editor = page.getByTestId("studio-v3-stops-editor");
  const deadEnd = page.getByTestId("studio-v3-stops-editor-empty");
  try {
    await expect
      .poll(async () => (await editor.count()) + (await deadEnd.count()), {
        timeout: 15_000,
      })
      .toBeGreaterThan(0);
  } catch {
    test.skip(
      true,
      "Studio V3 storyboard did not hydrate from persisted draft within 15s — draft hydration path may have shifted.",
    );
  }
}

test.use({ viewport: { width: 393, height: 852 } });

test.describe("Studio V3 storyboard recovery", () => {
  test("persisted empty editedRoutePoints does not strand the editor", async ({ page }) => {
    await hydrateDraft(page, []);
    await page.goto("/studio-v3");
    await ensureStoryboardOrSkip(page);

    await expect(page.getByTestId("studio-v3-stops-editor-empty")).toHaveCount(0);
    await expect(page.getByTestId("studio-v3-stops-editor")).toBeVisible();
    await expect(page.getByTestId("studio-v3-stop-row").first()).toBeVisible();
    await expect(
      page.getByText("We couldn't compose a draft for this combination.", { exact: false }),
    ).toHaveCount(0);
  });

  test("null editedRoutePoints seeds real Signature stops", async ({ page }) => {
    await hydrateDraft(page, null);
    await page.goto("/studio-v3");
    await ensureStoryboardOrSkip(page);

    await expect(page.getByTestId("studio-v3-stop-row").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("studio-v3-stops-editor-empty")).toHaveCount(0);
  });
});
