/**
 * Plan §E budget lock — the primary continuation CTA on the Signature
 * reveal must sit within ≤ 6 mobile viewport heights (393×588) from the
 * top of the reveal page. Enforced via the `presentationCtaViewports`
 * dataset key stamped by `usePresentationCtaBudget`.
 *
 * The spec skips when the funnel doesn't reach the reveal — this file is
 * about the budget contract, not funnel QA (`studio-v3-reveal-*` specs
 * own that).
 */

import { expect, test } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";

const MOBILE = { width: 393, height: 588 } as const;

test.use({ viewport: MOBILE });

test("presentation CTA sits within 6 mobile viewports", async ({ page }) => {
  await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });

  await walkToReveal(page);

  const reveal = page.locator('[data-testid="studio-v3-reveal"]').first();
  const reached = await reveal.isVisible({ timeout: 4_000 }).catch(() => false);
  test.skip(!reached, "walker did not reach the reveal in this run");

  // Give the reveal a beat to paint + the probe two rAFs to stamp the dataset.
  await page.waitForFunction(
    () => document.documentElement.dataset.presentationCtaViewports != null,
    undefined,
    { timeout: 5_000 },
  );

  const raw = await page.evaluate(
    () => document.documentElement.dataset.presentationCtaViewports ?? "",
  );
  const viewports = Number(raw);
  expect(Number.isFinite(viewports), `dataset value not numeric: "${raw}"`).toBe(true);
  expect(viewports, "primary CTA above the plan §E 6-viewport budget").toBeLessThanOrEqual(6);
});
