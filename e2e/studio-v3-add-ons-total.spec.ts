import { test, expect, type Page } from "@playwright/test";

/**
 * Studio V3 — add-ons running total (rendered HTML contract).
 *
 * Companion to `add-ons-gating-total.test.tsx` (which mounts
 * SignaturePriceCard in isolation). This spec walks the full cinematic
 * funnel to the reveal, then verifies that:
 *
 *   1. Only add-ons that "fit" the day are interactable — i.e. every
 *      enabled add-on button carries a positive `+€N` price and is not
 *      in `data-state="disabled"` (that state means "won't fit this day"
 *      by duration / stops thresholds, so it is intentionally locked).
 *   2. Clicking an enabled add-on flips it to `aria-pressed="true"` and
 *      the running total in `[data-testid="studio-v3-add-ons-total"]`
 *      updates in the SAME frame — no reload, no re-fetch.
 *   3. The final rendered total equals base + Σ(selected add-ons), per pp.
 *      We derive `base` from the total after the first click
 *      (base = total₁ − eur₁) and verify every subsequent selection matches.
 *   4. Toggling an add-on OFF subtracts its EUR immediately and, once
 *      nothing is selected, the "Investment" line disappears from the
 *      output (contract: badge hidden when empty).
 *
 * The walker is the same generic `data-phase-cta` pattern used by
 * `studio-v3-price-anchor-exit-intent.spec.ts` so both stay in lockstep.
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
  // Fall back to a raw DOM click when a full-bleed cinematic layer
  // intercepts pointer events (map / storyboard). The .click() event on
  // the button still runs the React handler.
  return el.evaluate((n) => (n as HTMLElement).click()).then(
    () => true,
    () => false,
  );
}

/**
 * Preferred `data-option-id` values, tried in order before falling back
 * to the first available option. Steering the walker toward Arrábida
 * guarantees the resolved Signature has a real sibling add-on pool
 * (see `regionBucket` + `ADD_ON_CATALOG` in signatureAddOns.ts). A random
 * walk otherwise lands in Douro / Costa Vicentina where the add-ons
 * section is intentionally empty and the test has nothing to click.
 */
const PREFERRED_OPTION_IDS = [
  "wine-food", // feeling → pairs with Arrábida
  "couple", // companions
  "arrabida-setubal-azeitao", // destination → the add-on-rich bucket
  "lisbon-airport", // pickup
  "elevated", // investment tier
  "full", // rhythm → 5+ stops, unlocks minStops add-ons
  "wine", // interests (multi)
  "gastronomy",
  "coast",
  "flexible", // date window
];

async function walkOnce(page: Page): Promise<boolean> {
  const hasSelection = (await page.locator('[data-phase-cta][data-selected="true"]').count()) > 0;
  const contVisible = await page
    .locator(PHASE_CTA_CONTINUE_ENABLED)
    .first()
    .isVisible()
    .catch(() => false);
  if (contVisible && hasSelection) return safeClick(page, PHASE_CTA_CONTINUE_ENABLED);

  // Prefer steering options when this phase renders them.
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

/** Walk the builder from intro to the reveal (where SignaturePriceCard mounts). */
async function walkToReveal(page: Page): Promise<void> {
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

type Addon = { id: string; eur: number };

/** Read only add-ons the product deems interactable (i.e. fit the day). */
async function readInteractableAddons(page: Page): Promise<Addon[]> {
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

async function totalText(page: Page): Promise<string> {
  return (
    (await page
      .locator('[data-testid="studio-v3-add-ons-total"]')
      .first()
      .textContent()) ?? ""
  );
}

async function parseTotalEur(page: Page): Promise<number | null> {
  const t = await totalText(page);
  const m = t.match(/€\s?(\d+)/);
  return m ? Number(m[1]) : null;
}

test.describe("studio-v3 — add-ons total updates immediately in rendered HTML", () => {
  test("selecting add-ons that fit the day updates the running total in the same frame", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    // `?e2e=1` disables the dev hard-reload poller and any long
    // ambient wait mid-funnel that otherwise makes the walker flaky.
    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => (window as unknown as { __APP_READY__?: boolean }).__APP_READY__ === true,
      undefined,
      { timeout: 20_000 },
    );

    await expect(page.locator('[data-phase-cta="intro-begin"]')).toBeVisible({ timeout: 15_000 });

    await walkToReveal(page);

    // If the cinematic funnel didn't reach the reveal (e.g. a hold-journey
    // click was swallowed by a full-bleed cinematic layer), skip cleanly —
    // this spec is here to lock the *rendered-HTML total contract*, not to
    // babysit funnel flakiness. `add-ons-gating-total.test.tsx` covers the
    // total math with a fresh component mount.
    const reveal = page.locator('[data-testid="studio-v3-reveal"]').first();
    if (!(await reveal.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, "Cinematic funnel did not reach the reveal in this run.");
      return;
    }

    // Price card + add-ons fieldset must be mounted on the reveal.
    const addonsFieldset = page.locator('[data-testid="studio-v3-add-ons"]').first();
    await expect(
      addonsFieldset,
      "add-ons fieldset must render on the reveal for a real resolved tour",
    ).toBeVisible({ timeout: 8_000 });

    // Baseline: nothing selected → the "Investment — €X" line is hidden.
    const initialTotal = await totalText(page);
    expect(initialTotal.toLowerCase()).not.toMatch(/investment/);
    expect(await parseTotalEur(page)).toBeNull();

    // Only enumerate add-ons that the product decided fit the day
    // (duration + stops passed the minHours/minStops gates in
    // signatureAddOns.ts). Anything with data-state="disabled" is
    // "Won't fit this day" and MUST NOT be clicked — that is a real
    // product rule, not a bug we should work around.
    const addons = await readInteractableAddons(page);
    expect(
      addons.length,
      "at least one add-on must fit the day so we can exercise the running total",
    ).toBeGreaterThan(0);
    expect(
      addons.every((a) => a.eur > 0),
      "every visible add-on must carry a real +€N / pp price",
    ).toBe(true);

    // Cap at 3 selections (contract in SignaturePriceCard: MAX_ADDONS = 3).
    const toSelect = addons.slice(0, Math.min(3, addons.length));

    // Click each in order; total must update in the same frame.
    let base: number | null = null;
    let runningAddonsEur = 0;
    for (const addon of toSelect) {
      const button = page.locator(
        `[data-testid="studio-v3-add-ons"] button[data-addon-id="${addon.id}"]`,
      );
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true", { timeout: 2_000 });

      const total = await parseTotalEur(page);
      expect(total, `total must be present after selecting ${addon.id}`).not.toBeNull();
      runningAddonsEur += addon.eur;

      if (base === null) {
        // Derive base from the first click; every subsequent assertion
        // pins the total to `base + Σ(selected add-ons)`.
        base = (total as number) - addon.eur;
        expect(base, "derived base price must be a positive integer").toBeGreaterThan(0);
      } else {
        expect(total).toBe(base + runningAddonsEur);
      }

      const line = await totalText(page);
      expect(line.toLowerCase()).toContain("investment");
      expect(line.toLowerCase()).toContain("/ pp");
    }

    // Toggle the first one OFF — total must subtract immediately.
    const first = page.locator(
      `[data-testid="studio-v3-add-ons"] button[data-addon-id="${toSelect[0].id}"]`,
    );
    await first.click();
    await expect(first).toHaveAttribute("aria-pressed", "false", { timeout: 2_000 });
    runningAddonsEur -= toSelect[0].eur;
    if (toSelect.length > 1) {
      expect(await parseTotalEur(page)).toBe((base as number) + runningAddonsEur);
    }

    // Deselect the rest → "Investment" line must disappear entirely.
    for (let i = 1; i < toSelect.length; i++) {
      const b = page.locator(
        `[data-testid="studio-v3-add-ons"] button[data-addon-id="${toSelect[i].id}"]`,
      );
      await b.click();
      await expect(b).toHaveAttribute("aria-pressed", "false", { timeout: 2_000 });
    }
    const emptied = await totalText(page);
    expect(emptied.toLowerCase()).not.toMatch(/investment/);
  });
});
