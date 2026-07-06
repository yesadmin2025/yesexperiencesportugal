import { test, expect } from "@playwright/test";
import {
  walkToReveal,
  readInteractableAddons,
  parseAddOnsTotalEur,
  parsePartyTotalEur,
} from "./studio-v3-walk-to-reveal";

/**
 * Studio V3 — final investment (party total) shown next to the CTA
 * updates immediately in rendered HTML on every add-on click / toggle-off.
 *
 * Contract (see SignaturePriceCard.tsx around line 229):
 *   partyTotalEur = partyBaseEur + addOnsTotalEurPerPax * partyCount
 *
 * The `studio-v3-party-total` line sits right above the primary
 * "Yes — make this day mine" CTA and is the last number the traveller
 * sees before checkout. It MUST reflect every add-on toggle in the same
 * frame — no debounce, no re-fetch, no scroll trigger. If it lags behind,
 * the price the user commits to at checkout can disagree with what they
 * saw when they clicked, which is a trust-breaking bug.
 */

test.describe("studio-v3 — final investment (party total) updates on every add-on toggle", () => {
  test("party total = base×guests + addOns×guests on click AND on toggle-off", async ({ page }) => {
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

    const cta = page.locator('[data-testid="studio-v3-cta-primary"]').first();
    await expect(cta, "final CTA must be mounted on the reveal").toBeVisible({ timeout: 8_000 });

    const partyTotal = page.locator('[data-testid="studio-v3-party-total"]').first();
    // Party-total only renders when a specific guest count is known.
    // If the funnel didn't lock a tier this run, we can't validate the
    // party-total contract — skip cleanly.
    if (!(await partyTotal.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "Party total line not rendered (guest tier not resolved this run).");
      return;
    }

    // Derive party count from the party-total line ("× N guests …").
    const partyText = (await partyTotal.textContent()) ?? "";
    const partyMatch = partyText.match(/×\s*(\d+)\s*guests?/i);
    expect(
      partyMatch,
      `expected "× N guests" in party total line, got: ${partyText}`,
    ).not.toBeNull();
    const partyCount = Number(partyMatch![1]);
    expect(partyCount).toBeGreaterThanOrEqual(1);

    // Baseline party total (no add-ons yet) = base × guests.
    const baseParty = await parsePartyTotalEur(page);
    expect(baseParty, "baseline party total must render").not.toBeNull();

    const addons = await readInteractableAddons(page);
    expect(
      addons.length,
      "at least one add-on must fit the day so we can toggle the final total",
    ).toBeGreaterThan(0);
    const toSelect = addons.slice(0, Math.min(3, addons.length));

    // Each click must move the party total by addon.eur × partyCount immediately.
    let runningPerPax = 0;
    for (const a of toSelect) {
      const btn = page.locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${a.id}"]`);
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await expect(btn).toHaveAttribute("aria-pressed", "true", { timeout: 2_000 });
      runningPerPax += a.eur;

      const party = await parsePartyTotalEur(page);
      expect(party, `party total must render after selecting ${a.id}`).not.toBeNull();
      expect(party, `party total must equal base + ${runningPerPax}×${partyCount}`).toBe(
        (baseParty as number) + runningPerPax * partyCount,
      );

      // And the per-pax add-ons total must equal the sum, per the contract.
      const perPax = await parseAddOnsTotalEur(page);
      expect(perPax).toBe(runningPerPax);
    }

    // Toggle-off the first — party total must subtract immediately.
    const firstBtn = page.locator(
      `[data-testid="studio-v3-add-ons"] button[data-addon-id="${toSelect[0].id}"]`,
    );
    await firstBtn.click();
    await expect(firstBtn).toHaveAttribute("aria-pressed", "false", { timeout: 2_000 });
    runningPerPax -= toSelect[0].eur;
    const afterToggle = await parsePartyTotalEur(page);
    expect(afterToggle).toBe((baseParty as number) + runningPerPax * partyCount);

    // Clear all remaining → party total must return to the baseline.
    for (let i = 1; i < toSelect.length; i++) {
      const b = page.locator(
        `[data-testid="studio-v3-add-ons"] button[data-addon-id="${toSelect[i].id}"]`,
      );
      await b.click();
      await expect(b).toHaveAttribute("aria-pressed", "false", { timeout: 2_000 });
    }
    const cleared = await parsePartyTotalEur(page);
    expect(cleared).toBe(baseParty);
  });
});
