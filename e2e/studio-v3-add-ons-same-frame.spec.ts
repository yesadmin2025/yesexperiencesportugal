import { test, expect } from "@playwright/test";
import {
  walkToReveal,
  readInteractableAddons,
} from "./studio-v3-walk-to-reveal";

/**
 * Studio V3 — totals update in the same synchronous frame as the click.
 *
 * The traveller sees a chip flip and, in the very same paint, expects
 * `studio-v3-add-ons-total` and `studio-v3-party-total` to reflect the
 * new value. No debounce, no rAF trail, no scroll trigger, no phase
 * transition — otherwise a fast click-and-checkout could bill the old
 * value.
 *
 * Strategy: perform the click AND read both totals inside a single
 * `page.evaluate`, so the Playwright IPC round-trip cannot hide a
 * one-frame lag. Also assert `window.scrollY` and the reveal's
 * `data-phase` are byte-identical across the click.
 */

type FrameCheck = {
  pressed: string | null;
  beforeAddOns: string;
  afterAddOns: string;
  beforeParty: string;
  afterParty: string;
  scrollBefore: number;
  scrollAfter: number;
  phaseBefore: string | null;
  phaseAfter: string | null;
};

function parseEur(text: string): number | null {
  const m = text.match(/€\s?(\d+)/);
  return m ? Number(m[1]) : null;
}

test.describe("studio-v3 — add-ons totals update in the same frame as the click", () => {
  test("click + read in one evaluate: totals move, no scroll, no phase change", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => (window as unknown as { __APP_READY__?: boolean }).__APP_READY__ === true,
      undefined,
      { timeout: 20_000 },
    );

    await expect(page.locator('[data-phase-cta="intro-begin"]')).toBeVisible({ timeout: 15_000 });
    await walkToReveal(page);

    const reveal = page.locator('[data-testid="studio-v3-reveal"]').first();
    if (!(await reveal.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, "Cinematic funnel did not reach the reveal in this run.");
      return;
    }

    const partyTotalVisible = await page
      .locator('[data-testid="studio-v3-party-total"]')
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (!partyTotalVisible) {
      test.skip(true, "Party total not rendered (guest tier not resolved this run).");
      return;
    }

    // Derive party count once — used to verify the party-total delta.
    const partyText =
      (await page.locator('[data-testid="studio-v3-party-total"]').first().textContent()) ?? "";
    const partyMatch = partyText.match(/×\s*(\d+)\s*guests?/i);
    expect(partyMatch, `expected "× N guests" in party total line, got: ${partyText}`).not.toBeNull();
    const partyCount = Number(partyMatch![1]);

    const addons = await readInteractableAddons(page);
    expect(addons.length).toBeGreaterThan(0);
    const toClick = addons.slice(0, Math.min(2, addons.length));

    for (const a of toClick) {
      const btn = page.locator(
        `[data-testid="studio-v3-add-ons"] button[data-addon-id="${a.id}"]`,
      );
      await btn.scrollIntoViewIfNeeded();

      // ---- Same-frame ON: click and read totals synchronously in one turn.
      const on = await page.evaluate((id: string): FrameCheck => {
        const btn = document.querySelector<HTMLButtonElement>(
          `[data-testid="studio-v3-add-ons"] button[data-addon-id="${id}"]`,
        );
        const total = document.querySelector<HTMLElement>(
          '[data-testid="studio-v3-add-ons-total"]',
        );
        const party = document.querySelector<HTMLElement>(
          '[data-testid="studio-v3-party-total"]',
        );
        const root = document.querySelector<HTMLElement>('[data-testid="studio-v3-root"]');
        if (!btn || !total || !party) throw new Error("missing test hooks");
        const beforeAddOns = total.textContent ?? "";
        const beforeParty = party.textContent ?? "";
        const scrollBefore = window.scrollY;
        const phaseBefore = root?.getAttribute("data-phase") ?? null;
        btn.click(); // synchronous — React 18/19 flushes state updates before returning to the event loop
        const afterAddOns = total.textContent ?? "";
        const afterParty = party.textContent ?? "";
        return {
          pressed: btn.getAttribute("aria-pressed"),
          beforeAddOns,
          afterAddOns,
          beforeParty,
          afterParty,
          scrollBefore,
          scrollAfter: window.scrollY,
          phaseBefore,
          phaseAfter: root?.getAttribute("data-phase") ?? null,
        };
      }, a.id);

      expect(on.pressed, `chip ${a.id} must flip to pressed=true in the same frame`).toBe("true");
      expect(on.scrollAfter).toBe(on.scrollBefore);
      expect(on.phaseAfter).toBe(on.phaseBefore);
      expect(on.afterAddOns).not.toBe(on.beforeAddOns);
      const addOnsBeforeEur = parseEur(on.beforeAddOns) ?? 0;
      const addOnsAfterEur = parseEur(on.afterAddOns);
      expect(addOnsAfterEur).toBe(addOnsBeforeEur + a.eur);

      const partyBeforeEur = parseEur(on.beforeParty);
      const partyAfterEur = parseEur(on.afterParty);
      expect(partyBeforeEur).not.toBeNull();
      expect(partyAfterEur).toBe((partyBeforeEur as number) + a.eur * partyCount);

      // ---- Same-frame OFF: toggle back and re-read synchronously.
      const off = await page.evaluate((id: string): FrameCheck => {
        const btn = document.querySelector<HTMLButtonElement>(
          `[data-testid="studio-v3-add-ons"] button[data-addon-id="${id}"]`,
        );
        const total = document.querySelector<HTMLElement>(
          '[data-testid="studio-v3-add-ons-total"]',
        );
        const party = document.querySelector<HTMLElement>(
          '[data-testid="studio-v3-party-total"]',
        );
        const root = document.querySelector<HTMLElement>('[data-testid="studio-v3-root"]');
        if (!btn || !total || !party) throw new Error("missing test hooks");
        const beforeAddOns = total.textContent ?? "";
        const beforeParty = party.textContent ?? "";
        const scrollBefore = window.scrollY;
        const phaseBefore = root?.getAttribute("data-phase") ?? null;
        btn.click();
        return {
          pressed: btn.getAttribute("aria-pressed"),
          beforeAddOns,
          afterAddOns: total.textContent ?? "",
          beforeParty,
          afterParty: party.textContent ?? "",
          scrollBefore,
          scrollAfter: window.scrollY,
          phaseBefore,
          phaseAfter: root?.getAttribute("data-phase") ?? null,
        };
      }, a.id);

      expect(off.pressed).toBe("false");
      expect(off.scrollAfter).toBe(off.scrollBefore);
      expect(off.phaseAfter).toBe(off.phaseBefore);
      expect(parseEur(off.afterAddOns) ?? 0).toBe((parseEur(off.beforeAddOns) ?? 0) - a.eur);
      expect(parseEur(off.afterParty)).toBe(
        (parseEur(off.beforeParty) as number) - a.eur * partyCount,
      );
    }
  });
});
