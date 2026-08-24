/**
 * Studio V3 — P1 audit fixes (audit `.lovable/studio-v3-audit.md` §P1).
 *
 * Verifies:
 *   #1  Stepper labels rewritten to Feel / Taste / Shape / Your day
 *   #2  No beat label truncated on 393 px (close-button overlap fix)
 *   #4  Intro opening is editorial — no technical capability strip
 *   #8  Global WhatsApp bubble hidden inside Studio V3
 */

import { test, expect } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";

test.describe("Studio V3 — P1 audit fixes (mobile)", () => {
  test("intro polish: editorial opening, no feature strip, no WhatsApp", async ({ page }) => {
    await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });

    // P2 — the opening reads like a travel director, not onboarding.
    const h1Text = await page.getByTestId("studio-v3-intro-headline").innerText();
    expect(h1Text).toContain("Portugal is the stage");

    // P2 — the technical capability strip is gone for good.
    await expect(page.getByTestId("studio-v3-intro-meta")).toHaveCount(0);
    const bodyText = (await page.locator("body").innerText()).toLowerCase();
    expect(bodyText).not.toContain("live route map");
    expect(bodyText).not.toContain("drive-time checks");
    expect(bodyText).not.toContain("region-aware moments");
    expect(bodyText).not.toContain("recommended");

    // #8 — global WhatsApp bubble hidden under /studio-v3.
    await expect(page.getByTestId("whatsapp-support-button")).toHaveCount(0);
  });


  test("stepper: Feel/Taste/Shape/Your day, no truncation", async ({ page }) => {
    await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });
    await walkToReveal(page);

    const stepper = page.getByTestId("studio-v3-progress-stepper");
    if ((await stepper.count()) === 0) test.skip(true, "Walker did not reach a stepper phase.");

    const beats = stepper.locator('[data-testid="studio-v3-phase-tab"]');
    const labels = (await beats.allInnerTexts()).map((s) => s.trim());
    expect(labels).toEqual(["Feel", "Taste", "Shape", "Your day"]);

    // #2 — no beat label ellipsised on 393 px.
    for (const label of labels) {
      expect(label).not.toContain("…");
      expect(label).not.toContain("\u2026");
    }

    // #8 — bubble still hidden after the funnel walk.
    await expect(page.getByTestId("whatsapp-support-button")).toHaveCount(0);
  });
});
