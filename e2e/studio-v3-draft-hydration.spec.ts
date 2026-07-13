import { test, expect } from "@playwright/test";

const STORAGE_KEY = "yes.studio.v3.draft.v1";

const draft = {
  version: 2,
  draftId: "e2e-hydration-draft",
  savedAt: 1,
  state: {
    phase: "feeling",
    feeling: "coastal",
    companions: null,
    occasion: null,
    dateMode: null,
    dateExact: null,
    pickup: null,
    guests: null,
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

async function seedDraft(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(draft)] as const,
  );
}

test.describe("Studio V3 draft hydration", () => {
  test.use({ viewport: { width: 393, height: 800 } });

  test("restores deterministically and acknowledges once per tab session", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await seedDraft(page);

    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    const root = page.getByTestId("studio-v3-root");
    await expect(root).toHaveAttribute("data-phase", "feeling");
    await expect(page.getByText("Draft restored", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Coastal escape/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(root).toHaveAttribute("data-phase", "feeling");
    await expect(page.getByText("Draft restored", { exact: true })).toHaveCount(0);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    await expect(root).toHaveAttribute("data-phase", "feeling");
    await expect(page.getByText("Draft restored", { exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("a new browser context may acknowledge the same draft once", async ({ page }) => {
    await seedDraft(page);
    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-v3-root")).toHaveAttribute("data-phase", "feeling");
    await expect(page.getByText("Draft restored", { exact: true })).toBeVisible();
  });
});
