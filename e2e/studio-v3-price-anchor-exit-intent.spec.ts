import { test, expect, type Page } from "@playwright/test";

/**
 * Batch C — validates:
 *   1. The price anchor hint ("Drops to €X / pp with N guests") renders on
 *      the reveal with REAL data attributes pulled from `priceTiersEUR`.
 *   2. Clicking it opens the guest picker (selection state changes).
 *   3. The exit-intent rescue modal arms after ~8s, triggers on
 *      `visibilitychange:hidden`, exposes a `wa.me/` Save link, persists
 *      dismissal in `sessionStorage` under `sv3-exit-intent-dismissed=1`,
 *      and does not re-open after dismissal.
 *   4. The full questionnaire (incl. language) is reachable end-to-end.
 *
 * Reuses the same generic walker convention (`data-phase-cta`) used by
 * `studio-v3-reveal-walkthrough.spec.ts` so the two tests stay in lockstep.
 */

const PHASE_CTA_PRIMARY = '[data-phase-cta]:not([data-selected="true"])';
const PHASE_CTA_CONTINUE_ENABLED =
  '[data-phase-cta="continue"]:not([data-phase-cta-disabled="true"])';
const STUDIO_ROOT = '[data-testid="studio-v3-root"]';

async function currentPhase(page: Page): Promise<string | null> {
  const root = page.locator(STUDIO_ROOT).first();
  if ((await root.count()) === 0) return "intro";
  return root.getAttribute("data-phase", { timeout: 2_000 }).catch(() => null);
}

async function dismissReactionOverlay(page: Page): Promise<boolean> {
  const overlay = page.locator('button[aria-label="Continue"].fixed.inset-0').first();
  if (await overlay.isVisible({ timeout: 200 }).catch(() => false)) {
    await overlay.click({ timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(350);
    return true;
  }
  return false;
}

async function walkOnce(page: Page): Promise<boolean> {
  const hasSelection = (await page.locator('[data-phase-cta][data-selected="true"]').count()) > 0;
  const cont = page.locator(PHASE_CTA_CONTINUE_ENABLED).first();
  const contVisible = await cont.isVisible().catch(() => false);
  if (contVisible && hasSelection) {
    await cont.click({ timeout: 2_000 });
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
        await nonContinue.click({ timeout: 2_000 });
        return true;
      }
    }
    await choice.click({ timeout: 2_000 });
    return true;
  }
  if (contVisible) {
    await cont.click({ timeout: 2_000 });
    return true;
  }
  return false;
}

async function walkToReveal(page: Page): Promise<Set<string>> {
  const seen = new Set<string>();
  let lastPhase: string | null = null;
  let stuck = 0;
  for (let i = 0; i < 40; i++) {
    await dismissReactionOverlay(page);
    const phase = await currentPhase(page);
    if (phase) seen.add(phase);

    if (phase === "storyboard" || phase === "map") {
      await dismissReactionOverlay(page);
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
        const isDisabled = await nextMoment.isDisabled({ timeout: 200 }).catch(() => true);
        if (!isDisabled) {
          await nextMoment.click({ timeout: 1_000 }).catch(() => undefined);
        }
        await page.waitForTimeout(400);
      }
      await page.waitForTimeout(900);
      if (await holdInteractive().catch(() => false)) {
        await hold.click({ timeout: 4_000 }).catch(() => undefined);
        await page.waitForTimeout(1_600);
      }
      if ((await currentPhase(page)) === "storyboard") break;
    }

    const clicked = await walkOnce(page);
    if (!clicked) {
      await page.waitForTimeout(700);
      if (!(await walkOnce(page))) break;
    }
    await page.waitForTimeout(700);
    if (phase && phase === lastPhase) stuck++;
    else stuck = 0;
    lastPhase = phase;
    if (stuck > 4) break;
  }
  return seen;
}

test.describe("studio-v3 — price anchor + exit-intent + full question coverage", () => {
  test("anchor hint renders with real tier data, exit-intent modal persists dismissal, language phase reached", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => (window as unknown as { __APP_READY__?: boolean }).__APP_READY__ === true,
      undefined,
      { timeout: 20_000 },
    );

    // Clean any prior dismissal so the modal can arm in this run.
    await page.evaluate(() => {
      try {
        sessionStorage.removeItem("sv3-exit-intent-dismissed");
      } catch {
        /* noop */
      }
    });

    await expect(page.locator('[data-phase-cta="intro-begin"]')).toBeVisible({ timeout: 15_000 });

    const seenPhases = await walkToReveal(page);

    // Full questionnaire coverage — language must have been reached.
    // eslint-disable-next-line no-console
    console.log("[anchor-spec] phases seen:", Array.from(seenPhases).join(" → "));
    expect(seenPhases.has("language"), "language phase must appear in the funnel").toBe(true);

    const reveal = page.locator('[data-testid="studio-v3-reveal"]').first();
    await expect(reveal).toBeVisible({ timeout: 10_000 });

    // ─── 1. Price anchor renders with REAL tier data ─────────────────────
    const anchor = page.locator('[data-testid="studio-v3-anchor-hint"]').first();
    await expect(anchor, "anchor hint visible on reveal").toBeVisible({ timeout: 6_000 });
    const tierAttr = await anchor.getAttribute("data-anchor-tier");
    const eurAttr = await anchor.getAttribute("data-anchor-eur");
    expect(tierAttr, "anchor must carry resolved tier").toMatch(/^\d+$/);
    expect(eurAttr, "anchor must carry resolved EUR price").toMatch(/^\d+$/);
    expect(Number(eurAttr)).toBeGreaterThan(0);
    await expect(anchor).toContainText(/Drops to\s+€\d+\s+\/\s+pp with/i);

    // ─── 2. Clicking the anchor opens the guest picker ───────────────────
    await anchor.click();
    await page.waitForTimeout(350);
    // Picker open == at least one tier button rendered & guest-related copy.
    const pickerOpen = await page
      .locator('button:has-text("guests"), button:has-text("guest")')
      .count();
    expect(pickerOpen, "guest picker should open after anchor tap").toBeGreaterThan(0);

    // ─── 3. Exit-intent: arm wait then trigger via visibilitychange ──────
    // Modal arms after 8s on the reveal — wait, then flip visibility.
    await page.waitForTimeout(8_500);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const modal = page.locator('[data-testid="studio-v3-exit-intent"]').first();
    await expect(modal, "exit-intent modal opens on hidden visibility").toBeVisible({
      timeout: 3_000,
    });

    // WhatsApp Save link is present and points at wa.me
    const wa = modal.locator('a[href^="https://wa.me/"]').first();
    await expect(wa).toBeVisible();
    await expect(wa).toContainText(/Save on WhatsApp/i);

    // Dismiss via "Keep exploring" — must persist dismissal in sessionStorage.
    await modal.getByRole("button", { name: /keep exploring/i }).click();
    await expect(modal).toBeHidden({ timeout: 2_000 });
    const dismissed = await page.evaluate(() =>
      sessionStorage.getItem("sv3-exit-intent-dismissed"),
    );
    expect(dismissed, "dismissal must persist in sessionStorage").toBe("1");

    // ─── 4. Re-trigger visibilitychange — modal must stay closed ────────
    await page.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(400);
    await expect(modal, "modal must not re-open once dismissed").toBeHidden();
  });
});
