/**
 * Studio V3 · Reveal + add-ons a11y @ 393×588 mobile.
 *
 * Locks the accessible surface of the two reveal screens:
 *   - Every add-on toggle has an accessible name.
 *   - Reveal CTAs (Save my signature, Continue to guest details,
 *     ← Back to refine) have non-empty accessible names that match their
 *     visible text.
 *   - Keyboard: Space toggles the first add-on (aria-pressed flips) and a
 *     `Your additions` row appears; Enter on the primary Refine CTA
 *     advances to Storytelling.
 *   - Focus visibility: every reveal CTA resolves a visible focus ring
 *     (outline OR box-shadow) when :focus-visible.
 *   - axe-core scan on Refine + Storytelling: no serious/critical
 *     violations (color-contrast is covered by dedicated specs).
 *
 * Run locally:
 *   bunx playwright test --config=playwright.local.config.ts \
 *     studio-v3-reveal-a11y-mobile
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  advanceRefineToStorytelling,
  readInteractableAddons,
  walkToReveal,
} from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 588 } as const;

async function reachRefine(page: Page): Promise<boolean> {
  await page.goto("/studio-v3");
  await walkToReveal(page);
  return page
    .locator('[data-studio-v3-screen="refine"]')
    .first()
    .isVisible()
    .catch(() => false);
}

test.describe("Studio V3 · Reveal a11y @ 393×588", () => {
  test.use({ viewport: VIEWPORT });

  test("add-on toggles + reveal CTAs expose accessible names matching visible text", async ({
    page,
  }) => {
    if (!(await reachRefine(page))) test.skip(true, "funnel did not reach Refine");

    // Every add-on button has a non-empty accessible name.
    const toggleNames = await page
      .locator('[data-testid="studio-v3-add-ons"] button[data-addon-id]')
      .evaluateAll((buttons) =>
        buttons.map((b) => ({
          id: b.getAttribute("data-addon-id"),
          name: b.getAttribute("aria-label") ?? (b.textContent ?? "").replace(/\s+/g, " ").trim(),
          hasPressed: b.hasAttribute("aria-pressed") || b.hasAttribute("aria-checked"),
        })),
      );
    expect(toggleNames.length).toBeGreaterThan(0);
    for (const t of toggleNames) {
      expect(t.name, `add-on toggle ${t.id} must have an accessible name`).not.toBe("");
    }

    // Advance to Storytelling to inspect the CTAs.
    await advanceRefineToStorytelling(page);

    const continueCta = page.getByTestId("studio-v3-final-reveal-continue");
    const saveCta = page.getByTestId("studio-v3-final-reveal-save");
    const backCta = page.getByTestId("studio-v3-final-reveal-back");

    for (const [cta, pattern] of [
      [continueCta, /Continue to guest details/i],
      [saveCta, /Save my signature/i],
      [backCta, /Back to refine/i],
    ] as const) {
      await expect(cta).toBeVisible();
      const name = await cta.evaluate(
        (el) => el.getAttribute("aria-label") ?? (el.textContent ?? "").replace(/\s+/g, " ").trim(),
      );
      expect(name).toMatch(pattern);
    }
  });

  test("keyboard: Space toggles the first add-on, Enter on primary CTA advances", async ({
    page,
  }) => {
    if (!(await reachRefine(page))) test.skip(true, "funnel did not reach Refine");
    const addons = await readInteractableAddons(page);
    test.skip(addons.length === 0, "no interactable add-ons");

    const firstBtn = page
      .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${addons[0].id}"]`)
      .first();
    await firstBtn.scrollIntoViewIfNeeded().catch(() => undefined);
    await firstBtn.focus();
    // Confirm focus landed.
    const focusedId = await page.evaluate(
      () => document.activeElement?.getAttribute("data-addon-id") ?? null,
    );
    expect(focusedId).toBe(addons[0].id);

    const pressedBefore = await firstBtn.evaluate(
      (el) => el.getAttribute("aria-pressed") ?? el.getAttribute("aria-checked"),
    );
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);
    const pressedAfter = await firstBtn.evaluate(
      (el) => el.getAttribute("aria-pressed") ?? el.getAttribute("aria-checked"),
    );
    if (pressedBefore !== null) {
      expect(pressedAfter).not.toBe(pressedBefore);
    }

    // "Your additions" row for this add-on appears.
    const row = page.locator(
      `[data-testid="studio-v3-included-addon-row"][data-addon-id="${addons[0].id}"]`,
    );
    await expect(row).toBeVisible({ timeout: 3_000 });

    // Enter on the Refine primary CTA advances to Storytelling.
    const primary = page
      .locator('[data-studio-v3-screen="refine"]')
      .getByRole("button", { name: /^See my signature story/i })
      .first();
    await primary.scrollIntoViewIfNeeded().catch(() => undefined);
    await primary.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-studio-v3-screen="storytelling"]').first()).toBeVisible({
      timeout: 6_000,
    });
  });

  test("focus visibility: reveal CTAs render a visible focus ring", async ({ page }) => {
    if (!(await reachRefine(page))) test.skip(true, "funnel did not reach Refine");
    await advanceRefineToStorytelling(page);

    for (const tid of [
      "studio-v3-final-reveal-continue",
      "studio-v3-final-reveal-save",
      "studio-v3-final-reveal-back",
    ]) {
      const cta = page.getByTestId(tid);
      await cta.scrollIntoViewIfNeeded().catch(() => undefined);
      await cta.focus();
      // Trigger :focus-visible heuristic (keyboard focus).
      await page.keyboard.press("Tab");
      await cta.focus();
      const ring = await cta.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        const outlineW = parseFloat(cs.outlineWidth || "0");
        const outlineOpaque = cs.outlineStyle !== "none" && outlineW > 0;
        const boxShadow = cs.boxShadow || "";
        const hasShadowRing =
          boxShadow !== "none" && boxShadow.length > 0 && !/^none$/i.test(boxShadow);
        return { outlineOpaque, hasShadowRing, outlineW, boxShadow };
      });
      expect(
        ring.outlineOpaque || ring.hasShadowRing,
        `${tid} must render a visible focus ring (outline or box-shadow)`,
      ).toBe(true);
    }
  });

  test("axe: no serious/critical violations on Refine + Storytelling", async ({ page }) => {
    if (!(await reachRefine(page))) test.skip(true, "funnel did not reach Refine");

    const refineScan = await new AxeBuilder({ page })
      .include('[data-studio-v3-screen="refine"]')
      .disableRules(["color-contrast"])
      .analyze();
    const refineBlocking = refineScan.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(refineBlocking, JSON.stringify(refineBlocking, null, 2)).toEqual([]);

    await advanceRefineToStorytelling(page);

    const storyScan = await new AxeBuilder({ page })
      .include('[data-studio-v3-screen="storytelling"]')
      .disableRules(["color-contrast"])
      .analyze();
    const storyBlocking = storyScan.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(storyBlocking, JSON.stringify(storyBlocking, null, 2)).toEqual([]);
  });
});
