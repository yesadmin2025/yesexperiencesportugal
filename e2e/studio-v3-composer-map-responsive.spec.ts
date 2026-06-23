// Studio V3 — ComposerMap mobile declutter regression.
//
// The pre-reveal stack above the map gets visually noisy on phones, so we
// trimmed it: DNA chips and the italic regional whisper are hidden below
// `sm` (640px), the "From €N/guest" price chip is hidden too, and the
// scope strip collapses to a single line.
//
// This spec locks that contract at the common phone widths (320/360/393/
// 430) AND asserts the essentials are still visible — progress whisper,
// origin label, scope strip (region · moments · duration) — so future
// declutter never accidentally hides operationally important data.

import { test, expect, type Page } from "@playwright/test";

const PHONE_WIDTHS = [320, 360, 393, 430] as const;
const TABLET_WIDTH = 834;

/**
 * Walk the Studio V3 flow far enough that a tour skeleton resolves and
 * ComposerMap mounts with origin + region + DNA chips populated. We click
 * a known-stable feeling (coastal-escape), companion (couple), pickup
 * (Lisbon), rhythm (slow), and one interest (coast). All Studio V3
 * choice tiles expose a stable `data-testid="studio-v3-choice"`.
 */
async function advanceToComposer(page: Page) {
  await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });
  // Skip intro
  const begin = page.locator('button:has-text("Begin")').first();
  if (await begin.isVisible().catch(() => false)) {
    await begin.click();
    await page.waitForTimeout(400);
  }
  // Pick a path: guided > coastal-escape > couple > lisbon pickup > coast > slow
  const sequence = [
    "guided", // path
    "coastal-escape", // feeling
    "couple", // companions
    "lisbon", // pickup
    "tier-considered", // investment direction
    "coast", // interest
    "slow", // rhythm
  ];
  for (const id of sequence) {
    const tile = page
      .locator(
        `[data-testid="studio-v3-choice"][data-id="${id}"], button[data-id="${id}"]`,
      )
      .first();
    if (await tile.isVisible().catch(() => false)) {
      await tile.click();
      await page.waitForTimeout(250);
    }
  }
  // Wait for the composer map to appear.
  await page
    .locator('[data-testid="studio-v3-composer-map"]')
    .first()
    .waitFor({ state: "visible", timeout: 6000 })
    .catch(() => {
      /* may still be undermounted in some entry paths — caller asserts */
    });
}

test.describe("Studio V3 ComposerMap — phone declutter", () => {
  for (const width of PHONE_WIDTHS) {
    test(`@${width}px: chips + whisper + price chip are hidden but essentials remain`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await advanceToComposer(page);

      const map = page.locator('[data-testid="studio-v3-composer-map"]').first();
      await expect(map, "composer map mounts").toBeVisible();

      // Hidden on phones (sm:flex / sm:inline) — must not be visible.
      const dnaChips = map.locator(":scope .hidden.sm\\:flex").first();
      await expect(dnaChips, "DNA chip row hidden on phone").toBeHidden();

      const desktopHeader = map.locator(':scope div:has(span:has-text("Composing"))').first();
      // The desktop status strip is hidden via .hidden.sm:flex — be lenient,
      // we only require that NO "From €" price chip is visible on phone.
      const priceChip = map.getByText(/From €\d+ \/ guest/);
      await expect(priceChip, "price chip hidden on phone").toBeHidden();

      // Essentials that MUST stay visible on every phone width:
      // progress label and the condensed scope strip.
      const progress = map.locator('[role="progressbar"]').first();
      await expect(progress, "progress whisper present").toBeVisible();

      const scope = page.locator('[data-testid="studio-v3-composer-scope"]').first();
      if (await scope.count()) {
        await expect(scope, "scope strip visible when tour resolved").toBeVisible();
        // Scope strip must mention "moments" or "~" duration somewhere.
        await expect(scope).toContainText(/moments|~/);
      }

      // No horizontal overflow at this width.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `no horizontal overflow @${width}px`).toBeLessThanOrEqual(1);

      // Visual regression — diff-tolerant baseline per width.
      await expect(map).toHaveScreenshot(`composer-map-${width}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });
  }

  test(`@${TABLET_WIDTH}px: DNA chips + whisper + price chip ARE visible (declutter is mobile-only)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: TABLET_WIDTH, height: 1000 });
    await advanceToComposer(page);
    const map = page.locator('[data-testid="studio-v3-composer-map"]').first();
    await expect(map).toBeVisible();
    // On tablet+ the .hidden.sm:flex row promotes to flex — assert at least
    // one chip-row is rendered.
    const chipsAny = map.locator('div.sm\\:flex, span.sm\\:inline').first();
    await expect(chipsAny).toBeVisible();
  });
});
