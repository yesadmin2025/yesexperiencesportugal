import { expect, test, type Page } from "@playwright/test";

/**
 * Mobile browser contracts for two Studio journeys that unit coverage alone
 * cannot prove:
 *   1. a mixed-age family can edit its composition from Logistics review and
 *      the exact adult/minor split survives the round trip;
 *   2. a traveller who delegated Taste can navigate backwards, change a
 *      personal answer, and keep operational facts while delegated taste is
 *      recomputed rather than becoming stale.
 *
 * These tests restore only non-sensitive Studio composition state through the
 * same tab-scoped recovery channel used by the production P0 gate, then use
 * the real UI for every edit/navigation assertion.
 */

test.describe.configure({ timeout: 120_000 });

const STORAGE_KEY = "yes.studio-v3.session.v1";

const BASE_STATE = {
  phase: "logistics",
  feeling: "coastal",
  companions: "family",
  occasion: "family-day",
  dateMode: "flexible",
  dateExact: null,
  pickup: "lisbon",
  guests: 4,
  adults: 2,
  minorAges: [13, 8],
  interests: ["coast", "nature"],
  rhythm: "balanced",
  refinement: null,
  considerations: ["child-seats"],
  language: "en",
  investment: "elevated",
  tourId: null,
  journeyTitle: null,
  guestsInferred: false,
  guestsPrivateEvent: false,
  firstName: null,
  editedRoutePoints: null,
  destinationIntent: "arrabida-setubal-azeitao",
  pathMode: "guided",
  rerollCount: 0,
  decidedForMe: [],
  delegationMode: null,
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

async function storedStudioState(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate((key) => {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  }, STORAGE_KEY);
}

async function logisticsMoment(page: Page) {
  return page.getByTestId("studio-v3-logistics").getAttribute("data-logistics-moment");
}

async function enterLogisticsReview(page: Page) {
  const root = page.locator('[data-testid="studio-v3-root"]').first();
  await expect(root).toHaveAttribute("data-phase", "logistics");

  // P7 deliberately occupies the Logistics slot with a one-tap Director's
  // Read before the practical moments mount. A restored valid state should
  // honour that layer rather than bypass it just for browser tests.
  const logistics = page.getByTestId("studio-v3-logistics");
  if (!(await logistics.isVisible())) {
    await expect(page.getByText("The director's read", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }

  await expect(logistics).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => logisticsMoment(page)).toBe("review");
}

async function backOneStudioPhase(page: Page): Promise<string> {
  const root = page.locator('[data-testid="studio-v3-root"]').first();
  const from = await root.getAttribute("data-phase");
  expect(from).not.toBeNull();

  const back = page.getByTestId("studio-v3-back");
  await expect(back).toBeVisible({ timeout: 10_000 });
  await back.click();

  await expect.poll(() => root.getAttribute("data-phase"), { timeout: 15_000 }).not.toBe(from);

  const to = await root.getAttribute("data-phase");
  expect(to).not.toBeNull();
  return to!;
}

test("mixed-age family survives edit → review with exact composition", async ({ page }) => {
  await restoreStudioState(page, { ...BASE_STATE });
  await enterLogisticsReview(page);

  const guestReview = page.locator('[data-review-row="who"]');
  await expect(guestReview).toContainText("4 guests (2 adults, 2 children)");

  await page.getByRole("button", { name: "Edit guests" }).click();
  await expect.poll(() => logisticsMoment(page)).toBe("who");

  const minors = page.getByRole("list", { name: "Minor travellers" });
  await expect(minors.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("group", { name: "Age of child 1" })).toContainText("13");
  await expect(page.getByRole("group", { name: "Age of child 2" })).toContainText("8");
  await expect(page.getByText("Youth · 75%", { exact: true })).toBeVisible();
  await expect(page.getByText("Child · 50%", { exact: true })).toBeVisible();

  // Change both adult count and one minor age through the real 44px controls.
  await page.getByRole("button", { name: "Increase guest count" }).click();
  await page.getByRole("button", { name: "Increase age of child 2" }).click();
  await expect(page.getByRole("group", { name: "Age of child 2" })).toContainText("9");

  await page.locator('button[data-phase-cta="continue"]').click();
  await expect.poll(() => logisticsMoment(page)).toBe("review");
  await expect(page.locator('[data-review-row="who"]')).toContainText(
    "5 guests (3 adults, 2 children)",
  );

  const stored = await storedStudioState(page);
  expect(stored.adults).toBe(3);
  expect(stored.guests).toBe(5);
  expect(stored.minorAges).toEqual([13, 9]);
});

test("delegation survives real Back navigation and recomputes after a personal back-edit", async ({
  page,
}) => {
  await restoreStudioState(page, {
    ...BASE_STATE,
    interests: ["coast", "photography"],
    rhythm: "slow",
    decidedForMe: ["interests", "rhythm"],
    delegationMode: "yes-designs",
  });
  await enterLogisticsReview(page);

  const root = page.locator('[data-testid="studio-v3-root"]').first();

  // Review → who → where → when are local Logistics moments. The fourth Back
  // leaves Logistics through the real phase-navigation handler.
  for (const expected of ["who", "where", "when"] as const) {
    await page.getByTestId("studio-v3-back").click();
    await expect.poll(() => logisticsMoment(page)).toBe(expected);
  }
  await page.getByTestId("studio-v3-back").click();
  await expect
    .poll(() => root.getAttribute("data-phase"), { timeout: 15_000 })
    .not.toBe("logistics");

  // Active delegation does not hide Taste when travelling backwards. Rhythm
  // and Interests remain real, revisitable surfaces so the traveller can take
  // control back. Walk one completed phase transition at a time, rather than
  // firing Back repeatedly while the 280ms exit animation is still active.
  const visitedPhases: string[] = [];
  for (let i = 0; i < 10; i++) {
    const phase = await root.getAttribute("data-phase");
    if (phase === "feeling") break;
    visitedPhases.push(await backOneStudioPhase(page));
  }
  await expect(root).toHaveAttribute("data-phase", "feeling", { timeout: 15_000 });
  expect(visitedPhases).toContain("rhythm");
  expect(visitedPhases).toContain("interests");

  const beforeEdit = await storedStudioState(page);
  expect(beforeEdit.delegationMode).toBe("yes-designs");
  expect(beforeEdit.decidedForMe).toEqual(expect.arrayContaining(["interests", "rhythm"]));
  expect(beforeEdit.dateMode).toBe("flexible");
  expect(beforeEdit.pickup).toBe("lisbon");
  expect(beforeEdit.minorAges).toEqual([13, 8]);

  // Change a traveller-owned answer. The production handler must recompute
  // delegated taste from the new feeling rather than keeping stale values.
  await page.locator('[data-option-id="hidden"]').click();

  await expect
    .poll(async () => (await storedStudioState(page)).feeling, { timeout: 10_000 })
    .toBe("hidden");
  const afterEdit = await storedStudioState(page);
  expect(afterEdit.delegationMode).toBe("yes-designs");
  expect(afterEdit.decidedForMe).toEqual(expect.arrayContaining(["interests", "rhythm"]));

  // Operational facts and exact family composition are never delegated and
  // therefore must survive the personal back-edit unchanged.
  expect(afterEdit.dateMode).toBe("flexible");
  expect(afterEdit.pickup).toBe("lisbon");
  expect(afterEdit.adults).toBe(2);
  expect(afterEdit.guests).toBe(4);
  expect(afterEdit.minorAges).toEqual([13, 8]);

  // At least one delegated taste value must be recomputed from the new feeling
  // instead of remaining the exact stale pair restored above.
  expect(JSON.stringify({ interests: afterEdit.interests, rhythm: afterEdit.rhythm })).not.toBe(
    JSON.stringify({ interests: ["coast", "photography"], rhythm: "slow" }),
  );
});
