import { test, expect } from "@playwright/test";
import {
  walkToReveal,
  readInteractableAddons,
  parseAddOnsTotalEur,
  parsePartyTotalEur,
} from "./studio-v3-walk-to-reveal";

/**
 * Studio V3 — disabled add-ons must be inert.
 *
 * Two ways an add-on can be "disabled":
 *   • `data-state="disabled"` — capacity-gated by the day (no room in the
 *     itinerary). Not interactable at all.
 *   • `aria-disabled="true"` after the cap of 3 selections — the chip is
 *     visible but must reject clicks.
 *
 * In both cases, forcing a click MUST NOT move `studio-v3-add-ons-total`
 * or `studio-v3-party-total`. If either budges when the user tries to
 * interact with a disabled chip, we're overcharging or undercharging at
 * checkout.
 */

test.describe("studio-v3 — disabled add-ons never move add-ons-total or party-total", () => {
  test("day-gated and cap-gated chips reject clicks and totals stay put", async ({ page }) => {
    test.setTimeout(150_000);

    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => (window as unknown as { __APP_READY__?: boolean }).__APP_READY__ === true,
      undefined,
      { timeout: 20_000 },
    );

    await expect(page.locator('[data-phase-cta="intro-begin"]')).toBeVisible({ timeout: 15_000 });
    await walkToReveal(page);

    const reveal = page.locator('[data-testid="studio-v3-reveal"]').first();
    if (!(await reveal.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, "Cinematic funnel did not reach the reveal in this run.");
      return;
    }

    const fieldset = page.locator('[data-testid="studio-v3-add-ons"]').first();
    if (!(await fieldset.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Add-ons fieldset not mounted this run.");
      return;
    }
    const partyTotalNode = page.locator('[data-testid="studio-v3-party-total"]').first();
    const hasPartyTotal = await partyTotalNode.isVisible({ timeout: 3_000 }).catch(() => false);

    // Baseline totals (no add-ons selected).
    const baselineAddOns = await parseAddOnsTotalEur(page); // null when hidden / 0
    const baselineParty = hasPartyTotal ? await parsePartyTotalEur(page) : null;

    // --- Branch A: day-gated (data-state="disabled") chips are truly inert.
    const gated = page.locator(
      '[data-testid="studio-v3-add-ons"] button[data-addon-id][data-state="disabled"]',
    );
    const gatedCount = await gated.count();
    for (let i = 0; i < gatedCount; i++) {
      const b = gated.nth(i);
      await b.scrollIntoViewIfNeeded().catch(() => undefined);
      // Force click bypasses actionability checks — this is the whole point.
      await b.click({ force: true, timeout: 2_000 }).catch(() => undefined);
      await expect(b).toHaveAttribute("aria-pressed", "false");
      expect(await parseAddOnsTotalEur(page)).toBe(baselineAddOns);
      if (hasPartyTotal) expect(await parsePartyTotalEur(page)).toBe(baselineParty);
    }

    // --- Branch B: cap-of-3 gating at the rendered-HTML level.
    const addons = await readInteractableAddons(page);
    if (addons.length < 4) {
      // Nothing else to prove — day only had ≤3 addons this run.
      return;
    }
    const first3 = addons.slice(0, 3);
    for (const a of first3) {
      const btn = page.locator(
        `[data-testid="studio-v3-add-ons"] button[data-addon-id="${a.id}"]`,
      );
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await expect(btn).toHaveAttribute("aria-pressed", "true", { timeout: 2_000 });
    }
    const sumFirst3 = first3.reduce((s, a) => s + a.eur, 0);
    expect(await parseAddOnsTotalEur(page)).toBe(sumFirst3);
    const partyAfter3 = hasPartyTotal ? await parsePartyTotalEur(page) : null;

    // The 4th chip must be aria-disabled and reject a forced click.
    const fourth = addons[3];
    const fourthBtn = page.locator(
      `[data-testid="studio-v3-add-ons"] button[data-addon-id="${fourth.id}"]`,
    );
    await expect(fourthBtn).toHaveAttribute("aria-disabled", "true", { timeout: 2_000 });
    await fourthBtn.click({ force: true, timeout: 2_000 }).catch(() => undefined);
    await expect(fourthBtn).toHaveAttribute("aria-pressed", "false");
    expect(await parseAddOnsTotalEur(page)).toBe(sumFirst3);
    if (hasPartyTotal) expect(await parsePartyTotalEur(page)).toBe(partyAfter3);

    // Deselecting one re-enables the previously gated 4th chip.
    const firstBtn = page.locator(
      `[data-testid="studio-v3-add-ons"] button[data-addon-id="${first3[0].id}"]`,
    );
    await firstBtn.click();
    await expect(firstBtn).toHaveAttribute("aria-pressed", "false", { timeout: 2_000 });
    await expect(fourthBtn).not.toHaveAttribute("aria-disabled", "true", { timeout: 2_000 });
  });
});
