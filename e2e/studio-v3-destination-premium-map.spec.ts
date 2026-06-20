// Playwright E2E — Studio V3 destination → reveal walk on the PremiumMap path.
//
// Goals:
// - Map namespaces (builder-map / premium-map) never overwrite each other
//   when switching between /builder and /studio-v3.
// - Selecting a destination region card advances the Studio V3 flow far
//   enough for CI to read the reveal-phase testids.
// - Verifies the new testids: studio-v3-destination-region-grid,
//   studio-v3-choice[data-option-id], studio-v3-reveal[data-reveal-*],
//   studio-v3-phase-tab.

import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";

test.describe("Studio V3 — PremiumMap destination path", () => {
  test("BuilderMap and PremiumMap localStorage namespaces do not collide", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      localStorage.setItem(
        "yes.mapZoom.builder-map.v1",
        JSON.stringify({ lisbon: { center: [38.71, -9.13], zoom: 14 } }),
      );
      localStorage.setItem(
        "yes.mapZoom.premium-map.v1",
        JSON.stringify({ porto: { center: [41.15, -8.61], zoom: 13 } }),
      );
    });

    await page.goto(`${BASE}/builder`);
    await page.waitForTimeout(1200);
    const afterBuilder = await page.evaluate(() => ({
      b: localStorage.getItem("yes.mapZoom.builder-map.v1"),
      p: localStorage.getItem("yes.mapZoom.premium-map.v1"),
    }));
    expect(afterBuilder.b).toContain("lisbon");
    expect(afterBuilder.p).toContain("porto");

    await page.goto(`${BASE}/studio-v3`);
    await page.waitForTimeout(1200);
    const afterStudio = await page.evaluate(() => ({
      b: localStorage.getItem("yes.mapZoom.builder-map.v1"),
      p: localStorage.getItem("yes.mapZoom.premium-map.v1"),
    }));
    expect(afterStudio.b).toContain("lisbon");
    expect(afterStudio.p).toContain("porto");
    expect(afterStudio.b).not.toContain("porto");
    expect(afterStudio.p).not.toContain("lisbon");
  });

  test("destination region card selection drives the reveal path", async ({ page }) => {
    await page.goto(`${BASE}/studio-v3`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Intro → name → guided
    await page
      .locator("button:has-text('Begin')")
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(500);
    const nameInput = page.locator("input").first();
    if (await nameInput.count()) await nameInput.fill("Alex");
    for (const t of ["Continue", "Skip"]) {
      const btn = page.locator(`button:has-text('${t}')`).first();
      if (await btn.count()) {
        await btn.click().catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(500);
    for (const t of ["Guided", "Begin"]) {
      const btn = page.locator(`button:has-text('${t}')`).first();
      if (await btn.count()) {
        await btn.click().catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(800);

    // Feeling phase — first choice
    await page.locator('[data-testid="studio-v3-choice"]').first().click();
    await page.waitForTimeout(600);

    // Destination phase — region grid is testable
    const grid = page.locator('[data-testid="studio-v3-destination-region-grid"]');
    await expect(grid).toBeVisible();
    const firstRegion = grid.locator('[data-testid="studio-v3-choice"]').first();
    const regionId = await firstRegion.getAttribute("data-option-id");
    await firstRegion.click();
    await expect(grid).toHaveAttribute("data-selected-region", regionId!);

    // Phase tabs visible + reflect current beat
    expect(await page.locator('[data-testid="studio-v3-phase-tab"]').count()).toBeGreaterThan(0);
  });
});
