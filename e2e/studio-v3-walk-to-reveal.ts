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
    await page.waitForTimeout(350);
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
    .evaluate((n) => (n as HTMLElement).click())
    .then(
      () => true,
      () => false,
    );
}

// Steering picks — see the sibling spec for the rationale (Arrábida is
// the add-on-rich region, Full rhythm unlocks minStops add-ons, …).
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
    const sel = `[data-option-id="${id}"]:not([data-selected="true"])`;
    if (
      await page
        .locator(sel)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return safeClick(page, sel);
    }
  }

  const choice = page.locator(PHASE_CTA_PRIMARY).first();
  if (await choice.isVisible().catch(() => false)) {
    const kind = await choice.getAttribute("data-phase-cta");
    if (kind === "continue") {
      const nc = '[data-phase-cta]:not([data-phase-cta="continue"]):not([data-selected="true"])';
      if (
        await page
          .locator(nc)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        return safeClick(page, nc);
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
  for (let i = 0; i < 40; i++) {
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
}

export type Addon = { id: string; eur: number };

export async function readInteractableAddons(page: Page): Promise<Addon[]> {
  const buttons = page.locator(
    '[data-testid="studio-v3-add-ons"] button[data-addon-id]:not([data-state="disabled"])',
  );
  const count = await buttons.count();
  const out: Addon[] = [];
  for (let i = 0; i < count; i++) {
    const b = buttons.nth(i);
    const id = (await b.getAttribute("data-addon-id")) ?? "";
    const text = (await b.textContent()) ?? "";
    const m = text.match(/\+€(\d+)/);
    if (id && m) out.push({ id, eur: Number(m[1]) });
  }
  return out;
}

export async function addOnsTotalText(page: Page): Promise<string> {
  return (
    (await page.locator('[data-testid="studio-v3-add-ons-total"]').first().textContent()) ?? ""
  );
}

export async function parseAddOnsTotalEur(page: Page): Promise<number | null> {
  const t = await addOnsTotalText(page);
  const m = t.match(/€\s?(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Party-total "investment" line — visible on the price card next to the
 *  guest-count multiplier. Reflects base×guests + addOns×guests. */
export async function parsePartyTotalEur(page: Page): Promise<number | null> {
  const node = page.locator('[data-testid="studio-v3-party-total"]').first();
  if (!(await node.isVisible().catch(() => false))) return null;
  const text = (await node.textContent()) ?? "";
  const m = text.match(/€\s?(\d+)/);
  return m ? Number(m[1]) : null;
}
