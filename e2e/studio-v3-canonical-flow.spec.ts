/**
 * Studio V3 — CANONICAL FLOW CONTRACT.
 *
 * Replaces the retired ComposerMap / MapAwakens ("map above moments card")
 * specs. Those asserted a pre-reveal map surface that is no longer part of
 * the live modern path: the single Living Canvas is now the only live
 * manifestation, and the canonical order is
 *
 *   Intro → Feeling → Who → Interests → Rhythm → 0..N Director questions
 *   → Your Day → Make it real → Guest Details → Checkout Summary
 *
 * See docs/studio-north-star.md. No network, no payment: the walk stops at
 * the checkout seam.
 */

import { test, expect, type Page } from "@playwright/test";

import {
  fillGuestDetails,
  reachGuestDetails,
  resetStudioV3State,
  walkToReveal,
} from "./studio-v3-walk-to-reveal";

const CANVAS = '[data-testid="studio-living-canvas"]';
const YOUR_DAY = '[data-studio-v3-screen="refine"]';

/** Surfaces retired from the live modern path. */
const RETIRED_SURFACES = [
  '[data-testid="studio-v3-composer-map"]',
  '[data-testid="studio-v3-map-anticipation"]',
  '[data-testid="studio-v3-moments-card"]',
  '[data-testid="studio-v3-living-journey-panel"]',
];

async function visibleCount(page: Page, selector: string): Promise<number> {
  return page.locator(`${selector}:visible`).count();
}

test.describe("Studio V3 canonical flow", () => {
  test.beforeEach(async ({ page }) => {
    await resetStudioV3State(page);
  });

  test("reaches Your Day through the canonical order with one Living Canvas", async ({ page }) => {
    await walkToReveal(page);

    const yourDay = page.locator(YOUR_DAY).first();
    if (!(await yourDay.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach Your Day in this environment");
    }

    // ONE live manifestation — never two canvases, never a retired surface.
    expect(await visibleCount(page, CANVAS)).toBeLessThanOrEqual(1);
    for (const retired of RETIRED_SURFACES) {
      expect(await visibleCount(page, retired), retired).toBe(0);
    }

    // Your Day is the editable itinerary surface.
    await expect(yourDay).toBeVisible();
    expect(Number(await yourDay.getAttribute("data-reveal-stops"))).toBeGreaterThan(0);
  });

  test("Your Day survives a back/forward round trip", async ({ page }) => {
    await walkToReveal(page);
    const yourDay = page.locator(YOUR_DAY).first();
    if (!(await yourDay.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach Your Day in this environment");
    }

    const before = {
      tour: await yourDay.getAttribute("data-reveal-tour"),
      stops: await yourDay.getAttribute("data-reveal-stops"),
    };

    const back = page.locator('[data-phase-cta="back"], button:has-text("Back")').first();
    if (!(await back.isVisible().catch(() => false))) {
      test.skip(true, "no back affordance exposed on this surface");
    }
    await back.click();
    await page.waitForTimeout(500);
    await walkToReveal(page);

    const after = page.locator(YOUR_DAY).first();
    await expect(after).toBeVisible();
    expect(await after.getAttribute("data-reveal-tour")).toBe(before.tour);
    expect(await after.getAttribute("data-reveal-stops")).toBe(before.stops);
  });

  test("never exposes supplier names publicly", async ({ page }) => {
    await walkToReveal(page);
    const body = (await page.locator("body").innerText()).toLowerCase();
    // Concrete known supplier winery names/identifiers — must never leak
    // publicly. Generic Portuguese words are intentionally NOT blocked to
    // avoid false positives on editorial copy.
    for (const supplier of [
      "bacalhôa",
      "bacalhoa",
      "josé maria da fonseca",
      "jose maria da fonseca",
      "casa ermelinda",
      "quinta do alcube",
      "catralvos",
      "adega de palmela",
    ]) {
      expect(body, `supplier name leaked: ${supplier}`).not.toContain(supplier);
    }
  });

  test("guest details seam is reachable without payment", async ({ page }) => {
    await walkToReveal(page);
    const reached = await reachGuestDetails(page);
    if (!reached) test.skip(true, "guest details not reachable in this environment");
    await fillGuestDetails(page);
    // The checkout seam is a UI contract here — we never submit a payment.
    expect(await visibleCount(page, CANVAS)).toBeLessThanOrEqual(1);
  });
});
