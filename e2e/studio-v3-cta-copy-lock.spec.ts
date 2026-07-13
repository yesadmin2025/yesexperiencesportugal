import { test, expect } from "@playwright/test";

/**
 * The CTA vocabulary is locked. Any primary CTA in Studio V3 MUST match
 * one of the approved labels below. This complements the vitest
 * cta-vocabulary-lock by asserting it at runtime, not from source strings.
 */

const APPROVED = [
  /^continue$/i,
  /^see the journey$/i,
  /^reveal my journey$/i,
  /^confirm.*(details|journey)/i,
  /^review .*details$/i,
  /^reserve/i,
  /^next/i,
];

test.describe("Studio V3 — CTA copy lock", () => {
  test.use({ viewport: { width: 393, height: 800 } });

  test("primary CTA label matches the approved vocabulary at every visible phase", async ({
    page,
  }) => {
    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    const root = page.getByTestId("studio-v3-root");
    await expect(root).toBeVisible();

    for (let step = 0; step < 20; step++) {
      const cta = page.getByTestId("studio-v3-primary-cta").first();
      if (!(await cta.isVisible().catch(() => false))) break;
      const label = (await cta.textContent())?.trim() ?? "";
      const ok = APPROVED.some((rx) => rx.test(label));
      expect(ok, `Unapproved CTA label "${label}"`).toBe(true);
      await cta.click().catch(() => undefined);
      await page.waitForTimeout(150);
    }
  });
});
