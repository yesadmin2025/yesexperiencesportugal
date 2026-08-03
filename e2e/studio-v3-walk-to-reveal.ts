// Shared cinematic-funnel walker for Studio V3 E2E specs. Extracted from
// `studio-v3-add-ons-total.spec.ts` so the "walk to reveal" logic stays
// in lockstep across specs that only care about behaviour ON the reveal
// (price card, add-ons total, summary/CTA, exit-intent, …).
//
// Contract:
//   - `walkToReveal(page)` drives the builder from intro until the reveal
//     is mounted (or gives up after a bounded number of steps).
//   - Callers check `[data-testid="studio-v3-reveal"]` visibility and
//     `test.skip(...)` when the funnel didn't reach it — this file is
//     about lightning-in-a-bottle reveal-side contracts, not funnel QA.

import type { Page } from "@playwright/test";

export const PHASE_CTA_PRIMARY = '[data-phase-cta]:not([data-selected="true"])';
export const PHASE_CTA_CONTINUE_ENABLED =
  '[data-phase-cta="continue"]:not([data-phase-cta-disabled="true"])';
export const STUDIO_ROOT = '[data-testid="studio-v3-root"]';

async function currentPhase(page: Page): Promise<string | null> {
  const root = page.locator(STUDIO_ROOT).first();
  if ((await root.count()) === 0) return "intro";
  return root.getAttribute("data-phase", { timeout: 2_000 }).catch(() => null);
}

async function dismissReactionOverlay(page: Page): Promise<void> {
  const overlay = page.locator('button[aria-label="Continue"].fixed.inset-0').first();
  if (await overlay.isVisible({ timeout: 200 }).catch(() => false)) {
    await overlay.click({ timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(250);
  }
}

async function safeClick(page: Page, sel: string): Promise<boolean> {
  const el = page.locator(sel).first();
  if (!(await el.isVisible().catch(() => false))) return false;
  await el.scrollIntoViewIfNeeded().catch(() => undefined);
  const clicked = await el.click({ timeout: 2_000 }).then(
    () => true,
    () => false,
  );
  if (clicked) return true;
  return el
    .evaluate((node) => (node as HTMLElement).click())
    .then(
      () => true,
      () => false,
    );
}

// Steering picks — Arrábida is the add-on-rich region, Full rhythm unlocks
// minStops add-ons, and the adaptive wine answer keeps the new refinement
// phase deterministic instead of relying on the first generic option.
const PREFERRED_OPTION_IDS = [
  "wine-food",
  "couple",
  "arrabida-setubal-azeitao",
  "lisbon-airport",
  "elevated",
  "full",
  "wine",
  "gastronomy",
  "coast",
  "wine-cellar-depth",
  "coast-clifftop-views",
  "flexible",
];

async function walkOnce(page: Page): Promise<boolean> {
  const hasSelection = (await page.locator('[data-phase-cta][data-selected="true"]').count()) > 0;
  const contVisible = await page
    .locator(PHASE_CTA_CONTINUE_ENABLED)
    .first()
    .isVisible()
    .catch(() => false);
  if (contVisible && hasSelection) return safeClick(page, PHASE_CTA_CONTINUE_ENABLED);

  for (const id of PREFERRED_OPTION_IDS) {
    const selector = `[data-option-id="${id}"]:not([data-selected="true"])`;
    if (
      await page
        .locator(selector)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return safeClick(page, selector);
    }
  }

  const choice = page.locator(PHASE_CTA_PRIMARY).first();
  if (await choice.isVisible().catch(() => false)) {
    const kind = await choice.getAttribute("data-phase-cta");
    if (kind === "continue") {
      const nonContinue =
        '[data-phase-cta]:not([data-phase-cta="continue"]):not([data-selected="true"])';
      if (
        await page
          .locator(nonContinue)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        return safeClick(page, nonContinue);
      }
    }
    return safeClick(page, PHASE_CTA_PRIMARY);
  }
  if (contVisible) return safeClick(page, PHASE_CTA_CONTINUE_ENABLED);
  return false;
}

export async function walkToReveal(page: Page): Promise<void> {
  let lastPhase: string | null = null;
  let stuck = 0;
  for (let i = 0; i < 44; i++) {
    await dismissReactionOverlay(page);
    const phase = await currentPhase(page);

    if (phase === "storyboard" || phase === "map") {
      await dismissReactionOverlay(page);
      const hold = page.locator('[data-phase-cta="hold-journey"]').first();
      const nextMoment = page.locator('button[aria-label="Next moment"]').first();
      const holdInteractive = () =>
        hold.evaluate((el) => {
          const wrap = el.closest("[aria-hidden]");
          const aria = wrap?.getAttribute("aria-hidden");
          const styles = wrap ? window.getComputedStyle(wrap as Element) : null;
          return aria !== "true" && styles?.pointerEvents !== "none" && styles?.opacity !== "0";
        });
      for (let j = 0; j < 30; j++) {
        if (await holdInteractive().catch(() => false)) break;
        const isDisabled = await nextMoment.isDisabled({ timeout: 200 }).catch(() => true);
        if (!isDisabled) {
          await nextMoment.click({ timeout: 1_000 }).catch(() => undefined);
        }
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(650);
      if (await holdInteractive().catch(() => false)) {
        await hold.click({ timeout: 4_000 }).catch(() => undefined);
        await page.waitForTimeout(1_200);
      }
      if ((await currentPhase(page)) === "storyboard") break;
    }

    const clicked = await walkOnce(page);
    if (!clicked) {
      await page.waitForTimeout(350);
      if (!(await walkOnce(page))) break;
    }
    await page.waitForTimeout(450);
    if (phase && phase === lastPhase) stuck++;
    else stuck = 0;
    lastPhase = phase;
    if (stuck > 4) break;
  }
}

export type Addon = { id: string; eur: number };

export async function readInteractableAddons(page: Page): Promise<Addon[]> {
  const buttons = page.locator(
    '[data-testid="studio-v3-add-ons"] button[data-addon-id]:not([data-state="disabled"])',
  );
  const count = await buttons.count();
  const out: Addon[] = [];
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const id = (await button.getAttribute("data-addon-id")) ?? "";
    const text = (await button.textContent()) ?? "";
    const match = text.match(/\+€(\d+)/);
    if (id && match) out.push({ id, eur: Number(match[1]) });
  }
  return out;
}

export async function addOnsTotalText(page: Page): Promise<string> {
  return (
    (await page.locator('[data-testid="studio-v3-add-ons-total"]').first().textContent()) ?? ""
  );
}

export async function parseAddOnsTotalEur(page: Page): Promise<number | null> {
  const text = await addOnsTotalText(page);
  const match = text.match(/€\s?(\d+)/);
  return match ? Number(match[1]) : null;
}

/** Party-total "investment" line — visible on the price card next to the
 *  guest-count multiplier. Reflects base×guests + addOns×guests. */
export async function parsePartyTotalEur(page: Page): Promise<number | null> {
  const node = page.locator('[data-testid="studio-v3-party-total"]').first();
  if (!(await node.isVisible().catch(() => false))) return null;
  const text = (await node.textContent()) ?? "";
  const match = text.match(/€\s?(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * After `walkToReveal` lands on Refine (phase=storyboard), advance to
 * Storytelling (phase=confirmation) by clicking the Refine primary CTA.
 * Shared across mobile reveal / navigation / a11y specs so the transition
 * stays in lockstep.
 */
export async function advanceRefineToStorytelling(
  page: import("@playwright/test").Page,
): Promise<void> {
  const refine = page.locator('[data-studio-v3-screen="refine"]');
  await refine.first().waitFor({ state: "visible", timeout: 15_000 });

  // Stable production contract: the Refine primary CTA always carries
  // data-testid="studio-v3-handoff-primary". Label fallbacks exist only for
  // older builds ("Continue" / "See my signature story").
  const byTestId = refine.getByTestId("studio-v3-handoff-primary").first();
  const refineCta = (await byTestId.count().catch(() => 0))
    ? byTestId
    : refine.getByRole("button", { name: /^(Continue|See my signature story)/i }).first();

  await refineCta.waitFor({ state: "visible", timeout: 15_000 });
  await refineCta.scrollIntoViewIfNeeded();
  await refineCta.click({ timeout: 10_000 });
  await page.getByTestId("studio-v3-final-reveal").waitFor({ timeout: 20_000 });
}
