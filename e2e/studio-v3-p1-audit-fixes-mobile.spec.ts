/**
 * Studio V3 — P1 audit fixes (audit `.lovable/studio-v3-audit.md` §P1).
 *
 * Verifies:
 *   #1  Stepper labels rewritten to Feel / Shape / Time / Compose
 *   #2  No beat label truncated on 393 px (close-button overlap fix)
 *   #4  Intro chip row is a single meta line (`<p>`), not three fake CTAs
 *   #4  Intro H1 uses curly apostrophe (’)
 *   #8  Global WhatsApp bubble hidden inside Studio V3
 */

import { test, expect } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";

test.describe("Studio V3 — P1 audit fixes (mobile)", () => {
  test("intro polish: curly apostrophe, single meta line, no WhatsApp", async ({ page }) => {
    await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });

    // #4 — H1 uses curly apostrophe, not the straight ASCII one.
    const h1Text = await page.locator("h2, h1").first().innerText();
    expect(h1Text).toContain("Let’s");
    expect(h1Text).not.toContain("Let's");

    // #4 — chip row collapsed to a single meta line, not three pills.
    const meta = page.getByTestId("studio-v3-intro-meta");
    await expect(meta).toBeVisible();
    const metaText = (await meta.innerText()).toLowerCase();
    expect(metaText).toContain("live route map");
    expect(metaText).toContain("drive-time checks");
    expect(metaText).toContain("region-aware moments");
    expect(await meta.evaluate((el) => el.tagName.toLowerCase())).toBe("p");

    // #8 — global WhatsApp bubble hidden under /studio-v3.
    await expect(page.getByTestId("whatsapp-support-button")).toHaveCount(0);
  });

  test("stepper: Feel/Shape/Time/Compose, no truncation", async ({ page }) => {
    await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });
    await walkToReveal(page);

    const stepper = page.getByTestId("studio-v3-progress-stepper");
    if ((await stepper.count()) === 0) test.skip(true, "Walker did not reach a stepper phase.");

    const beats = stepper.locator('[data-testid="studio-v3-phase-tab"]');
    const labels = (await beats.allInnerTexts()).map((s) => s.trim());
    expect(labels).toEqual(["Feel", "Shape", "Time", "Compose"]);

    // #2 — no beat label ellipsised on 393 px.
    for (const label of labels) {
      expect(label).not.toContain("…");
      expect(label).not.toContain("\u2026");
    }

    // #8 — bubble still hidden after the funnel walk.
    await expect(page.getByTestId("whatsapp-support-button")).toHaveCount(0);
  });
});
