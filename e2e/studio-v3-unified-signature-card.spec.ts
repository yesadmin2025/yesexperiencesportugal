// E2E — Unified "Your Signature" card.
//
// Locks in the reveal refactor that collapsed the map / story / stops-editor /
// DNA / shaping / price / add-ons islands into ONE cohesive card
// (`data-testid="studio-v3-signature-card"`), AND proves that add-on toggles
// still update `add-ons-total` + `party-total` immediately in the rendered
// HTML — including after expanding/collapsing any of the reveal's
// collapsible sections (Swap pool, Add-moment pool).
//
// Companion to:
//   - studio-v3-add-ons-total.spec.ts           (per-click delta)
//   - studio-v3-add-ons-same-frame.spec.ts      (same-frame update)
//   - studio-v3-add-ons-round-trip.spec.ts      (nav round-trip parity)
//
// This spec asserts the *layout invariant* (single card, QualityScore gone
// from reveal) that the other specs assume implicitly.

import { expect, test } from "@playwright/test";
import {
  parseAddOnsTotalEur,
  parsePartyTotalEur,
  readInteractableAddons,
  walkToReveal,
} from "./studio-v3-walk-to-reveal";

const REVEAL = '[data-testid="studio-v3-reveal"]';
const CARD = '[data-testid="studio-v3-signature-card"]';

test.describe("Studio V3 — unified Signature card", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/studio-v3");
    await walkToReveal(page);
  });

  test("renders exactly one cohesive card containing map, story, add-ons, totals — and no Quality Score", async ({
    page,
  }) => {
    const reveal = page.locator(REVEAL).first();
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach the reveal");
    }

    const card = page.locator(CARD).first();
    await expect(card).toBeVisible();
    expect(await page.locator(CARD).count()).toBe(1);

    // Every scattered island must now live inside the card.
    await expect(card.locator('[data-testid="studio-v3-reveal-map"]')).toBeVisible();
    await expect(card.locator('[data-testid="studio-v3-story-of-day"]')).toBeVisible();
    await expect(card.locator('[data-testid="studio-v3-add-ons"]')).toBeVisible();
    await expect(card.locator('[data-testid="studio-v3-add-ons-total"]')).toBeVisible();
    await expect(card.locator('[data-testid="studio-v3-party-total"]')).toBeVisible();

    // Editor is guarded — some regions can resolve with zero editable stops.
    const editor = card.locator('[data-testid="studio-v3-stops-editor"]');
    if ((await editor.count()) > 0) {
      await expect(editor.first()).toBeVisible();
    }

    // QualityScore is intentionally dropped from the reveal.
    expect(await reveal.locator('[data-testid="studio-v3-quality-score"]').count()).toBe(0);

    await card.screenshot({ path: "/tmp/browser/unified-card/card.png" });
  });

  test("add-on toggles update totals immediately in the HTML", async ({ page }) => {
    const reveal = page.locator(REVEAL).first();
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach the reveal");
    }

    const card = page.locator(CARD).first();
    await expect(card).toBeVisible();

    const baselineAdd = (await parseAddOnsTotalEur(page)) ?? 0;
    const baselineParty = (await parsePartyTotalEur(page)) ?? 0;

    const addons = (await readInteractableAddons(page)).slice(0, 2);
    test.skip(addons.length === 0, "no interactable add-ons available in this region");

    let prevAdd = baselineAdd;
    let prevParty = baselineParty;
    for (const a of addons) {
      const btn = page
        .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${a.id}"]`)
        .first();
      await btn.scrollIntoViewIfNeeded().catch(() => undefined);
      await btn.click();

      const nowAdd = (await parseAddOnsTotalEur(page)) ?? 0;
      const nowParty = (await parsePartyTotalEur(page)) ?? 0;

      expect(nowAdd, `add-ons-total must grow after selecting ${a.id}`).toBeGreaterThan(prevAdd);
      expect(nowParty, `party-total must grow after selecting ${a.id}`).toBeGreaterThan(prevParty);

      prevAdd = nowAdd;
      prevParty = nowParty;
    }

    // Toggle both back off — totals must return to baseline.
    for (const a of addons) {
      const btn = page
        .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${a.id}"]`)
        .first();
      await btn.scrollIntoViewIfNeeded().catch(() => undefined);
      await btn.click();
    }

    expect(await parseAddOnsTotalEur(page)).toBe(baselineAdd);
    expect(await parsePartyTotalEur(page)).toBe(baselineParty);
  });

  test("totals stay live after expanding/collapsing reveal sections", async ({ page }) => {
    const reveal = page.locator(REVEAL).first();
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach the reveal");
    }

    const card = page.locator(CARD).first();
    await expect(card).toBeVisible();

    const baselineAdd = (await parseAddOnsTotalEur(page)) ?? 0;
    const baselineParty = (await parsePartyTotalEur(page)) ?? 0;

    // 1) Select one add-on, remember the moved totals.
    const [first] = await readInteractableAddons(page);
    test.skip(!first, "no interactable add-ons available");
    const addBtn = page
      .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${first.id}"]`)
      .first();
    await addBtn.scrollIntoViewIfNeeded().catch(() => undefined);
    await addBtn.click();
    const movedAdd = (await parseAddOnsTotalEur(page)) ?? 0;
    const movedParty = (await parsePartyTotalEur(page)) ?? 0;
    expect(movedAdd).toBeGreaterThan(baselineAdd);
    expect(movedParty).toBeGreaterThan(baselineParty);

    // 2) Expand/collapse the Swap pool on the first stop, if present.
    const swap = card.locator('button[aria-label^="Swap "]').first();
    if (await swap.isVisible().catch(() => false)) {
      await swap.scrollIntoViewIfNeeded().catch(() => undefined);
      await swap.click();
      await expect(card.locator('[data-testid="studio-v3-swap-pool"]').first()).toBeVisible();
      expect(await parseAddOnsTotalEur(page)).toBe(movedAdd);
      expect(await parsePartyTotalEur(page)).toBe(movedParty);

      await swap.click();
      await expect(card.locator('[data-testid="studio-v3-swap-pool"]')).toHaveCount(0);
      expect(await parseAddOnsTotalEur(page)).toBe(movedAdd);
      expect(await parsePartyTotalEur(page)).toBe(movedParty);
    }

    // 3) Expand/collapse the Add-a-moment pool, if present.
    const addMoment = card
      .locator('[data-testid="studio-v3-add-moment"] button[aria-expanded]')
      .first();
    if (await addMoment.isVisible().catch(() => false)) {
      await addMoment.scrollIntoViewIfNeeded().catch(() => undefined);
      await addMoment.click();
      await expect(card.locator('[data-testid="studio-v3-add-pool"]').first()).toBeVisible();
      expect(await parseAddOnsTotalEur(page)).toBe(movedAdd);
      expect(await parsePartyTotalEur(page)).toBe(movedParty);

      await addMoment.click();
      await expect(card.locator('[data-testid="studio-v3-add-pool"]')).toHaveCount(0);
      expect(await parseAddOnsTotalEur(page)).toBe(movedAdd);
      expect(await parsePartyTotalEur(page)).toBe(movedParty);
    }

    // 4) Toggle the add-on off — totals return to baseline.
    await addBtn.scrollIntoViewIfNeeded().catch(() => undefined);
    await addBtn.click();
    expect(await parseAddOnsTotalEur(page)).toBe(baselineAdd);
    expect(await parsePartyTotalEur(page)).toBe(baselineParty);

    await card.screenshot({ path: "/tmp/browser/unified-card/after-toggles.png" });
  });
});
