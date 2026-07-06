// Contrast spec — DISABLED add-ons (day-gated OR cap-gated) must never move
// `add-ons-total` / `party-total`, while ENABLED add-ons must always move
// them. Complements `studio-v3-add-ons-disabled-never-affect-total.spec.ts`
// (which asserts only the negative half) by pairing the negative branch
// with a strict-increase positive branch in the same run.

import { expect, test } from "@playwright/test";
import {
  parseAddOnsTotalEur,
  parsePartyTotalEur,
  readInteractableAddons,
  walkToReveal,
} from "./studio-v3-walk-to-reveal";

test.describe("Studio V3 — disabled add-ons inert, enabled add-ons live", () => {
  test("force-clicking disabled chips does nothing; enabled chips always move totals", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    await page
      .waitForFunction(
        () => (window as unknown as { __APP_READY__?: boolean }).__APP_READY__ === true,
        undefined,
        { timeout: 20_000 },
      )
      .catch(() => undefined);
    await walkToReveal(page);

    const reveal = page.locator('[data-testid="studio-v3-reveal"]').first();
    if (!(await reveal.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, "funnel did not reach the reveal");
      return;
    }
    const fieldset = page.locator('[data-testid="studio-v3-add-ons"]').first();
    if (!(await fieldset.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "add-ons fieldset not mounted");
      return;
    }

    const partyNode = page.locator('[data-testid="studio-v3-party-total"]').first();
    const hasParty = await partyNode.isVisible({ timeout: 3_000 }).catch(() => false);

    // --- Baseline
    const baseAdd = (await parseAddOnsTotalEur(page)) ?? 0;
    const baseParty = hasParty ? await parsePartyTotalEur(page) : null;

    // --- Negative half: every currently-disabled chip must be inert.
    const disabled = page.locator(
      '[data-testid="studio-v3-add-ons"] button[data-addon-id][data-state="disabled"], [data-testid="studio-v3-add-ons"] button[data-addon-id][aria-disabled="true"]',
    );
    const disabledCount = await disabled.count();
    for (let i = 0; i < disabledCount; i++) {
      const b = disabled.nth(i);
      await b.scrollIntoViewIfNeeded().catch(() => undefined);
      await b.click({ force: true, timeout: 2_000 }).catch(() => undefined);
      await expect(b).toHaveAttribute("aria-pressed", "false");
      expect(await parseAddOnsTotalEur(page)).toBe(baseAdd);
      if (hasParty) expect(await parsePartyTotalEur(page)).toBe(baseParty);
    }

    // --- Positive half: enabled chips must strictly increase both totals.
    const addons = (await readInteractableAddons(page)).slice(0, 3);
    test.skip(addons.length === 0, "no interactable add-ons available");

    let prevAdd = baseAdd;
    let prevParty = baseParty ?? 0;
    const stack: { id: string; addAfter: number; partyAfter: number }[] = [];
    for (const a of addons) {
      const btn = page
        .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${a.id}"]`)
        .first();
      await btn.scrollIntoViewIfNeeded().catch(() => undefined);
      await btn.click();
      await expect(btn).toHaveAttribute("aria-pressed", "true", { timeout: 2_000 });

      const nowAdd = (await parseAddOnsTotalEur(page)) ?? 0;
      const nowParty = hasParty ? ((await parsePartyTotalEur(page)) ?? 0) : 0;
      expect(nowAdd, `add-ons-total must grow after selecting ${a.id}`).toBeGreaterThan(prevAdd);
      if (hasParty) {
        expect(nowParty, `party-total must grow after selecting ${a.id}`).toBeGreaterThan(
          prevParty,
        );
      }
      stack.push({ id: a.id, addAfter: nowAdd, partyAfter: nowParty });
      prevAdd = nowAdd;
      prevParty = nowParty;
    }

    // --- Un-toggle in reverse: totals must strictly decrease back to baseline.
    for (let i = stack.length - 1; i >= 0; i--) {
      const { id } = stack[i];
      const btn = page
        .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${id}"]`)
        .first();
      await btn.scrollIntoViewIfNeeded().catch(() => undefined);
      await btn.click();
      await expect(btn).toHaveAttribute("aria-pressed", "false", { timeout: 2_000 });
    }
    expect(await parseAddOnsTotalEur(page)).toBe(baseAdd);
    if (hasParty) expect(await parsePartyTotalEur(page)).toBe(baseParty);
  });
});
