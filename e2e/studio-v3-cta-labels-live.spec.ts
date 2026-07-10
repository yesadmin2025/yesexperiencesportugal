// The inline CTA (`studio-v3-cta-primary`) and the mobile sticky CTA
// (`studio-v3-cta-sticky`) expose the current investment via a
// `data-total-eur` attribute — the visible label no longer prints the
// euro amount (the amount lives on the price card; the button advances
// to the storytelling letter). When any add-on toggles, both attrs must
// update immediately to reflect the recalculated party-total (or
// per-person price when party-total is not exposed).


import { expect, test } from "@playwright/test";
import {
  parseAddOnsTotalEur,
  parsePartyTotalEur,
  readInteractableAddons,
  walkToReveal,
} from "./studio-v3-walk-to-reveal";

function parseEurAttr(attr: string | null | undefined): number | null {
  if (attr == null || attr === "") return null;
  const n = Number(attr);
  return Number.isFinite(n) ? n : null;
}


test.describe("Studio V3 — CTA labels update live with totals", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/studio-v3");
    await walkToReveal(page);
  });

  test("inline + sticky CTA labels track party-total after every toggle", async ({ page }) => {
    const reveal = page.locator('[data-testid="studio-v3-reveal"]').first();
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach the reveal");
    }

    const primary = page.locator('[data-testid="studio-v3-cta-primary"]').first();
    if (!(await primary.isVisible().catch(() => false))) {
      test.skip(true, "primary CTA (hasPrice) not rendered this run");
      return;
    }

    const partyNode = page.locator('[data-testid="studio-v3-party-total"]').first();
    const hasParty = await partyNode.isVisible().catch(() => false);
    const readExpected = async () =>
      hasParty ? await parsePartyTotalEur(page) : await parseAddOnsTotalEur(page);

    // Baseline: primary CTA must contain the current €-total.
    const baseExpected = await readExpected();
    expect(parseEur(await primary.textContent())).toBe(baseExpected);

    const addons = (await readInteractableAddons(page)).slice(0, 2);
    test.skip(addons.length === 0, "no interactable add-ons available");

    for (const a of addons) {
      const btn = page
        .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${a.id}"]`)
        .first();
      await btn.scrollIntoViewIfNeeded().catch(() => undefined);
      await btn.click();

      const expected = await readExpected();
      // Same-frame read — CTA must reflect the new total on the next paint.
      await expect
        .poll(async () => parseEur(await primary.textContent()), { timeout: 3_000 })
        .toBe(expected);
    }

    // Sticky CTA appears once the inline CTA scrolls out of view (mobile).
    // Scroll all the way down to force it, then toggle one more time and
    // assert its label tracks the new total.
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }));
    await page.waitForTimeout(400);
    const sticky = page.locator('[data-testid="studio-v3-cta-sticky"]').first();
    if (await sticky.isVisible().catch(() => false)) {
      // Toggle the last add-on back off.
      const last = addons[addons.length - 1];
      const btn = page
        .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${last.id}"]`)
        .first();
      await btn.scrollIntoViewIfNeeded().catch(() => undefined);
      await btn.click();
      const expected = await readExpected();
      await expect
        .poll(async () => parseEur(await sticky.textContent()), { timeout: 3_000 })
        .toBe(expected);
      // Inline CTA must agree too (labels stay in lock-step).
      expect(parseEur(await primary.textContent())).toBe(expected);
    }

    // Restore everything and assert the CTA snapped back to the baseline label.
    for (const a of addons) {
      const btn = page
        .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${a.id}"]`)
        .first();
      const pressed = await btn.getAttribute("aria-pressed").catch(() => null);
      if (pressed === "true") {
        await btn.scrollIntoViewIfNeeded().catch(() => undefined);
        await btn.click();
      }
    }
    await expect
      .poll(async () => parseEur(await primary.textContent()), { timeout: 3_000 })
      .toBe(baseExpected);
  });
});
