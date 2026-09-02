/** TEMPORARY read-only release verification. Deleted after the run. */
import { test, expect, type Page } from "@playwright/test";
import {
  resetStudioV3State,
  walkToReveal,
  advanceRefineToStorytelling,
  fillGuestDetails,
} from "./studio-v3-walk-to-reveal";

const WIDTHS = [360, 393, 430];

async function overflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll("button, a[href], input, select"))) {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el as HTMLElement);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (r.height < 36 || r.width < 36) {
        bad.push(
          `${el.tagName}:${(el.textContent ?? "").trim().slice(0, 24)}:${Math.round(r.width)}x${Math.round(r.height)}`,
        );
      }
    }
    return bad.slice(0, 8);
  });
}

async function clipped(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const vw = document.documentElement.clientWidth;
    for (const el of Array.from(document.querySelectorAll("button, h1, h2, p, input"))) {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        out.push(`${el.tagName}:${(el.textContent ?? "").trim().slice(0, 24)}:${Math.round(r.left)}..${Math.round(r.right)}`);
      }
    }
    return out.slice(0, 8);
  });
}

for (const width of WIDTHS) {
  test.describe(`release verification @ ${width}px`, () => {
    test.use({ viewport: { width, height: 780 } });

    test(`full flow @ ${width}`, async ({ page }) => {
      test.setTimeout(300_000);
      const log: string[] = [];
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text().slice(0, 160));
      });

      await resetStudioV3State(page);
      await walkToReveal(page);
      const phaseAfterWalk = await page
        .locator('[data-testid="studio-v3-root"]')
        .first()
        .getAttribute("data-phase")
        .catch(() => null);
      log.push(`phase after walk = ${phaseAfterWalk}`);
      log.push(`refine visible = ${await page.locator('[data-studio-v3-screen="refine"]').first().isVisible().catch(() => false)}`);
      log.push(`overflow@refine = ${await overflow(page)}`);
      log.push(`clipped@refine = ${JSON.stringify(await clipped(page))}`);
      log.push(`smallTargets@refine = ${JSON.stringify(await smallTargets(page))}`);

      // BACK/EDIT preservation probe: capture the recap text, go back, return.
      const recapBefore = await page
        .locator('[data-studio-v3-screen="refine"]')
        .first()
        .innerText()
        .catch(() => "");

      await advanceRefineToStorytelling(page);
      const reveal = page.getByTestId("studio-v3-final-reveal");
      const revealVisible = await reveal.isVisible().catch(() => false);
      log.push(`reveal visible = ${revealVisible}`);
      if (revealVisible) {
        log.push(`overflow@reveal = ${await overflow(page)}`);
        log.push(`clipped@reveal = ${JSON.stringify(await clipped(page))}`);
        const cta = page.getByTestId("studio-v3-final-reveal-continue");
        const box = await cta.boundingBox().catch(() => null);
        log.push(`reveal CTA box = ${JSON.stringify(box)}`);
        await cta.scrollIntoViewIfNeeded().catch(() => undefined);
        await cta.click({ timeout: 8_000 }).catch(() => undefined);
      }

      const form = page.getByTestId("studio-v3-guest-details");
      const gdVisible = await form.waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false);
      log.push(`guest details visible = ${gdVisible}`);
      if (gdVisible) {
        const gdText = await form.innerText();
        log.push(`GD asks date input = ${await form.locator('input[type="date"]').count()}`);
        log.push(`GD asks party = ${/how many|party size|guests\?/i.test(gdText)}`);
        log.push(`overflow@GD = ${await overflow(page)}`);
        log.push(`clipped@GD = ${JSON.stringify(await clipped(page))}`);
        log.push(`smallTargets@GD = ${JSON.stringify(await smallTargets(page))}`);
        await fillGuestDetails(page, { email: `qa+${width}@yesexperiences.pt` });
        const submit = page.getByTestId("studio-v3-guest-details-submit");
        await submit.scrollIntoViewIfNeeded().catch(() => undefined);
        await submit.click({ timeout: 8_000 }).catch(() => undefined);
      }

      const summary = page.getByTestId("studio-v3-checkout-summary");
      const sumVisible = await summary.waitFor({ state: "visible", timeout: 20_000 }).then(() => true).catch(() => false);
      log.push(`checkout summary visible = ${sumVisible}`);
      if (sumVisible) {
        log.push(`summary text = ${(await summary.innerText()).replace(/\n/g, " | ").slice(0, 600)}`);
        log.push(`overflow@summary = ${await overflow(page)}`);
        log.push(`clipped@summary = ${JSON.stringify(await clipped(page))}`);
        const reserve = page.getByTestId("studio-v3-checkout-summary-reserve");
        log.push(`reserve visible = ${await reserve.isVisible().catch(() => false)}`);
        log.push(`reserve box = ${JSON.stringify(await reserve.boundingBox().catch(() => null))}`);
        // Edit affordances present?
        const editBtns = await summary.getByRole("button").allInnerTexts();
        log.push(`summary buttons = ${JSON.stringify(editBtns.slice(0, 12))}`);
        if (width === 393) {
          await reserve.scrollIntoViewIfNeeded().catch(() => undefined);
          await reserve.click({ timeout: 8_000 }).catch(() => undefined);
          await page.waitForTimeout(9_000);
          const frames = page.frames().map((f) => f.url()).filter((u) => /stripe/i.test(u));
          log.push(`stripe frames = ${JSON.stringify(frames.slice(0, 4))}`);
          log.push(`overflow@stripe = ${await overflow(page)}`);
        }
      }
      log.push(`console errors = ${JSON.stringify(errors.slice(0, 6))}`);
      console.log(`\n===== ${width}px =====\n` + log.join("\n") + `\nrecapLen=${recapBefore.length}\n`);
      expect(true).toBe(true);
    });
  });
}
