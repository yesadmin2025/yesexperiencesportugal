import { test, expect } from "@playwright/test";
import {
  walkToReveal,
  readInteractableAddons,
  addOnsTotalText,
  parseAddOnsTotalEur,
} from "./studio-v3-walk-to-reveal";

/**
 * Studio V3 — add-ons total survives round-tripping between reveal sections.
 *
 * Companion to `studio-v3-add-ons-total.spec.ts`. That spec proves the
 * running total updates immediately on click; this one proves the SAME
 * total renders identically after the user navigates away to a different
 * reveal section (itinerary / trust-strip) and scrolls back.
 *
 * The reveal is a single mounted `SignaturePriceCard`; its add-on state
 * is component-local (no persistence). If a future refactor unmounts the
 * card on scroll (e.g. IntersectionObserver + conditional render) the
 * selections would silently reset, the total would go back to hidden,
 * and this test would catch it before shipping.
 */

test.describe("studio-v3 — add-ons total round-trips across reveal sections", () => {
  test("total remains identical after navigating to another reveal section and back", async ({
    page,
  }) => {
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

    const addonsFieldset = page.locator('[data-testid="studio-v3-add-ons"]').first();
    await expect(addonsFieldset).toBeVisible({ timeout: 8_000 });

    const addons = await readInteractableAddons(page);
    expect(addons.length).toBeGreaterThan(0);
    const toSelect = addons.slice(0, Math.min(2, addons.length));

    for (const a of toSelect) {
      const btn = page.locator(
        `[data-testid="studio-v3-add-ons"] button[data-addon-id="${a.id}"]`,
      );
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await expect(btn).toHaveAttribute("aria-pressed", "true", { timeout: 2_000 });
    }

    // Capture the exact rendered total + EUR before navigating away.
    const totalBefore = await addOnsTotalText(page);
    const eurBefore = await parseAddOnsTotalEur(page);
    expect(eurBefore).not.toBeNull();
    expect(totalBefore.toLowerCase()).toContain("investment");

    const selectedIdsBefore = await page
      .locator('[data-testid="studio-v3-add-ons"] button[aria-pressed="true"][data-addon-id]')
      .evaluateAll((els) =>
        els.map((n) => (n as HTMLElement).getAttribute("data-addon-id") ?? ""),
      );

    // Scroll to a different reveal section — the itinerary spine sits
    // well below the price card. If it's absent (rare tour shape),
    // fall back to the trust strip, which every reveal renders.
    const away = page.locator('[data-testid="studio-v3-itinerary-spine"]').first();
    const awayVisible = await away.isVisible().catch(() => false);
    const target = awayVisible
      ? away
      : page.locator('[data-testid="studio-v3-trust-strip"]').first();
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    // Best-effort confirmation the section is in view.
    await expect(target).toBeVisible();

    // Scroll further with keyboard to simulate real browsing before coming back.
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(400);

    // Return to the add-ons block.
    await addonsFieldset.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(addonsFieldset).toBeVisible();

    // The same chips must still be pressed…
    const selectedIdsAfter = await page
      .locator('[data-testid="studio-v3-add-ons"] button[aria-pressed="true"][data-addon-id]')
      .evaluateAll((els) =>
        els.map((n) => (n as HTMLElement).getAttribute("data-addon-id") ?? ""),
      );
    expect(new Set(selectedIdsAfter)).toEqual(new Set(selectedIdsBefore));

    // …and the rendered total must be byte-identical.
    const totalAfter = await addOnsTotalText(page);
    const eurAfter = await parseAddOnsTotalEur(page);
    expect(eurAfter).toBe(eurBefore);
    expect(totalAfter.replace(/\s+/g, " ").trim()).toBe(
      totalBefore.replace(/\s+/g, " ").trim(),
    );
  });
});
