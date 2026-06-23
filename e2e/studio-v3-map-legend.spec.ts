// Studio V3 — Map journey legend contract.
//
// Reuses the reveal walkthrough harness to drive Studio V3 to the
// Storyboard/Reveal where the SignatureMap renders with multiple real
// segments. Then, across phone/tablet/desktop viewports, asserts:
//
//   • the legend chip is visible once a multi-segment route exists
//   • `data-leg-legend-value` ALWAYS equals the visible chip text
//     (single source of truth — `legendText`)
//   • the legend text matches the `~Xh Ym · Z km` shape
//   • zooming the viewport (mobile/tablet/desktop) never desyncs the
//     attribute from the rendered children
//
// Locks the contract from the previous turn: E2E can synchronize
// against `data-leg-legend-value` and trust it.

import { test, expect, type Page } from "@playwright/test";

const LEGEND_TEXT_RE = /^~\s?(\d+\s?min|\d+h(\s\d+m)?)\s·\s\d+(\.\d+)?\s?km$/;

const PHASE_CTA_PRIMARY = '[data-phase-cta]:not([data-selected="true"])';
const PHASE_CTA_CONTINUE_ENABLED =
  '[data-phase-cta="continue"]:not([data-phase-cta-disabled="true"])';
const STUDIO_ROOT = '[data-testid="studio-v3-root"]';

async function dismissReactionOverlay(page: Page): Promise<void> {
  const overlay = page.locator('button[aria-label="Continue"].fixed.inset-0').first();
  if (await overlay.isVisible({ timeout: 200 }).catch(() => false)) {
    await overlay.click({ timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

async function currentPhase(page: Page): Promise<string | null> {
  const root = page.locator(STUDIO_ROOT).first();
  if ((await root.count()) === 0) return "intro";
  return root.getAttribute("data-phase").catch(() => null);
}

async function walkOnce(page: Page): Promise<boolean> {
  const hasSelection = (await page.locator('[data-phase-cta][data-selected="true"]').count()) > 0;
  const cont = page.locator(PHASE_CTA_CONTINUE_ENABLED).first();
  const contVisible = await cont.isVisible().catch(() => false);
  if (contVisible && hasSelection) {
    await cont.click({ timeout: 2_000 }).catch(() => undefined);
    return true;
  }
  const choice = page.locator(PHASE_CTA_PRIMARY).first();
  if (await choice.isVisible().catch(() => false)) {
    const kind = await choice.getAttribute("data-phase-cta");
    if (kind === "continue") {
      const nonContinue = page
        .locator('[data-phase-cta]:not([data-phase-cta="continue"]):not([data-selected="true"])')
        .first();
      if (await nonContinue.isVisible().catch(() => false)) {
        await nonContinue.click({ timeout: 2_000 }).catch(() => undefined);
        return true;
      }
    }
    await choice.click({ timeout: 2_000 }).catch(() => undefined);
    return true;
  }
  if (contVisible) {
    await cont.click({ timeout: 2_000 }).catch(() => undefined);
    return true;
  }
  return false;
}

async function driveToReveal(page: Page): Promise<void> {
  await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => (window as unknown as { __APP_READY__?: boolean }).__APP_READY__ === true,
    undefined,
    { timeout: 20_000 },
  );
  await expect(page.locator('[data-phase-cta="intro-begin"]')).toBeVisible({ timeout: 15_000 });

  let stuck = 0;
  let last: string | null = null;
  for (let i = 0; i < 45; i++) {
    await dismissReactionOverlay(page);
    const phase = await currentPhase(page);

    if (phase === "map" || phase === "storyboard") {
      const hold = page.locator('[data-phase-cta="hold-journey"]').first();
      const nextMoment = page.locator('button[aria-label="Next moment"]').first();
      const holdInteractive = () =>
        hold.evaluate((el) => {
          const wrap = el.closest("[aria-hidden]");
          const aria = wrap?.getAttribute("aria-hidden");
          const cs = wrap ? window.getComputedStyle(wrap as Element) : null;
          return aria !== "true" && cs?.pointerEvents !== "none" && cs?.opacity !== "0";
        });
      for (let j = 0; j < 30; j++) {
        if (await holdInteractive().catch(() => false)) break;
        const disabled = await nextMoment.isDisabled({ timeout: 200 }).catch(() => true);
        if (!disabled) await nextMoment.click({ timeout: 1_000 }).catch(() => undefined);
        await page.waitForTimeout(380);
      }
      await page.waitForTimeout(900);
      if (await holdInteractive().catch(() => false)) {
        await hold.click({ timeout: 4_000 }).catch(() => undefined);
        await page.waitForTimeout(1_400);
      }
      if ((await currentPhase(page)) === "storyboard") break;
    }

    if (!(await walkOnce(page))) {
      await page.waitForTimeout(600);
      if (!(await walkOnce(page))) break;
    }
    await page.waitForTimeout(600);

    if (phase && phase === last) stuck++;
    else stuck = 0;
    last = phase;
    if (stuck > 4) break;
  }

  await expect(page.locator('[data-testid="studio-v3-reveal"]').first()).toBeVisible({
    timeout: 10_000,
  });
}

/** Read the legend chip's `data-leg-legend-value` AND the rendered text,
 *  return both for equality assertion. */
async function readLegend(
  page: Page,
): Promise<{ attr: string | null; text: string | null; visible: boolean } | null> {
  const chip = page.locator("[data-leg-legend-value]").first();
  if ((await chip.count()) === 0) return null;
  const visible = await chip.isVisible().catch(() => false);
  const attr = await chip.getAttribute("data-leg-legend-value");
  // Normalize the visible text: collapse whitespace so " ·  " == " · ".
  const text = (await chip.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  return { attr, text, visible };
}

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 720 },
  { name: "mobile-393", width: 393, height: 800 },
  { name: "tablet-834", width: 834, height: 1100 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

test.describe("Studio V3 — map journey legend (data-leg-legend-value contract)", () => {
  for (const vp of VIEWPORTS) {
    test(`@${vp.name}: legend attribute matches visible chip across the reveal`, async ({
      page,
    }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await driveToReveal(page);

      // Wait for SignatureMap inside the reveal to mount its legend chip.
      // Multi-segment reveals always produce a legend; allow up to 8s.
      const legendChip = page.locator("[data-leg-legend-value]").first();
      await expect(legendChip, "legend chip mounts in reveal").toBeVisible({ timeout: 8_000 });

      const reading = await readLegend(page);
      expect(reading, "legend reading available").not.toBeNull();
      expect(reading!.visible, "legend visible on reveal").toBe(true);

      // 1. Attribute must equal rendered chip text (single source of truth).
      expect(
        reading!.attr,
        "data-leg-legend-value must equal the visible chip text",
      ).toBe(reading!.text);

      // 2. Attribute must match the editorial legend shape: `~X min · Y km`
      //    or `~Xh Ym · Y km`.
      expect(reading!.attr ?? "", "legend matches `~time · km` shape").toMatch(LEGEND_TEXT_RE);

      // 3. Sanity: km > 0 and minutes > 0 — never a phantom "0 min · 0 km".
      const km = Number(
        await page.locator("[data-journey-km]").first().getAttribute("data-journey-km"),
      );
      const min = Number(
        await page.locator("[data-journey-min]").first().getAttribute("data-journey-min"),
      );
      expect(km, "journey km > 0").toBeGreaterThan(0);
      expect(min, "journey minutes > 0").toBeGreaterThan(0);

      // 4. Accessibility contract — the legend must expose an accessible
      //    name describing the journey, be a live polite region, and the
      //    decorative inner spans must be aria-hidden so AT only reads the
      //    composed label once.
      const wrapper = page.locator('[data-testid="studio-v3-map-legend"]').first();
      await expect(wrapper).toHaveAttribute("role", "status");
      await expect(wrapper).toHaveAttribute("aria-live", "polite");
      await expect(wrapper).toHaveAttribute("aria-atomic", "true");
      const wrapperLabel = await wrapper.getAttribute("aria-label");
      expect(wrapperLabel ?? "", "wrapper aria-label describes journey").toMatch(
        /Approximate total journey:.*driving,.*km\.?$/,
      );

      const chip = page.locator("[data-leg-legend-value]").first();
      await expect(chip).toHaveAttribute("role", "group");
      const chipLabel = await chip.getAttribute("aria-label");
      expect(chipLabel, "chip aria-label matches wrapper aria-label").toBe(wrapperLabel);

      // Inner spans (gold minutes, separator, km) must be hidden from AT
      // so the composed accessible label is announced exactly once.
      const innerSpansHidden = await chip.evaluate((el) =>
        Array.from(el.querySelectorAll(":scope > span")).every(
          (s) => s.getAttribute("aria-hidden") === "true",
        ),
      );
      expect(innerSpansHidden, "decorative inner spans are aria-hidden").toBe(true);

      // Accessible-name lookup by role must find the chip.
      const byRole = page.getByRole("status", { name: /Approximate total journey/i }).first();
      await expect(byRole).toBeVisible();

      // 5. Resize to a smaller viewport mid-flight — attribute and text

      //    must STILL match. This guards against future refactors that
      //    cache the attribute separately from children.
      const shrink = vp.width > 400 ? { width: 360, height: 800 } : { width: 430, height: 900 };
      await page.setViewportSize(shrink);
      await page.waitForTimeout(400);
      const after = await readLegend(page);
      expect(after, "legend still present after resize").not.toBeNull();
      expect(after!.attr, "attribute still matches text after viewport change").toBe(
        after!.text,
      );
      expect(after!.attr ?? "", "shape preserved after resize").toMatch(LEGEND_TEXT_RE);
    });
  }
});
