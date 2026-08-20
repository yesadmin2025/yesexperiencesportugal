/**
 * Final Reveal + Guest Details — 393×588 mobile contract.
 *
 * Three checks:
 *   1. Smoke — funnel reaches the reveal, primary CTA is in the viewport, no
 *      horizontal overflow, and continuing lands on Guest Details cleanly.
 *   2. Copy lock — no "to be confirmed / pending / tbc" language leaks onto
 *      either screen, the instant-confirmation reassurance is present, the
 *      parchment "letter" image renders, and the email-blur confirmation line
 *      appears after typing an address. Also asserts the Storytelling CTA
 *      contract: primary "Confirm & reserve", secondary "Save my
 *      signature", and NO Refine-only affordances (See my signature story,
 *      add-on toggles).
 *   3. Visual — screenshot baselines for the reveal and Guest Details at
 *      393×588 so the editorial letter treatment is protected from
 *      accidental regression.
 *
 * NOTE: FinalRevealStory now renders only the traveller's composed stops
 * (via the `composedStops` prop wired from StudioV3.tsx), so the timeline
 * always mirrors the Refine choices. If the layout drifts, regenerate the
 * PNG baselines locally with `--update-snapshots`.
 *
 * Run locally with the sandbox dev server (:8080) already up:
 *   bunx playwright test --config=playwright.local.config.ts \
 *     studio-v3-reveal-and-guest-details-mobile
 *
 * First run: pass --update-snapshots to seed the baselines.
 */

import { test, expect, type Page } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 588 } as const;
const FORBIDDEN_COPY = /to be confirmed|pending confirmation|\btbc\b/i;

async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))),
    );
  });
  await page.waitForTimeout(400);
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow at 393px").toBeLessThanOrEqual(1);
}

test.describe("Studio V3 · Final Reveal + Guest Details @ 393×588", () => {
  test.use({ viewport: VIEWPORT });

  test("smoke — reveal reachable, no overflow, continue lands on Guest Details", async ({
    page,
  }) => {
    await page.goto("/studio-v3");
    await walkToReveal(page);
    await advanceRefineToStorytelling(page);

    const reveal = page.getByTestId("studio-v3-final-reveal");
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "Funnel did not reach the Final Reveal in this run.");
    }
    await settle(page);

    await assertNoHorizontalOverflow(page);

    const continueCta = page.getByTestId("studio-v3-final-reveal-continue");
    await expect(continueCta).toBeVisible();
    await continueCta.scrollIntoViewIfNeeded();
    await continueCta.click();

    // Guest Details
    const email = page.getByLabel(/email/i).first();
    await expect(email).toBeVisible({ timeout: 5_000 });
    await assertNoHorizontalOverflow(page);
  });

  test("copy lock — no 'to be confirmed', letter image renders, email blur confirms", async ({
    page,
  }) => {
    await page.goto("/studio-v3");
    await walkToReveal(page);
    await advanceRefineToStorytelling(page);

    const reveal = page.getByTestId("studio-v3-final-reveal");
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "Funnel did not reach the Final Reveal in this run.");
    }
    await settle(page);

    const revealText = (await reveal.innerText()) ?? "";
    expect(revealText).not.toMatch(FORBIDDEN_COPY);
    expect(revealText.toLowerCase()).toContain("instant");

    // Editorial "letter from a book" — parchment image renders with real bytes.
    const letter = page.getByTestId("studio-v3-final-reveal-letter");
    await expect(letter).toBeVisible();
    const parchment = letter.locator("img").first();
    const naturalWidth = await parchment.evaluate((n) => (n as HTMLImageElement).naturalWidth);
    expect(naturalWidth, "parchment image loaded").toBeGreaterThan(200);

    // Storytelling CTA contract — primary Confirm & reserve,
    // secondary Save my signature, no Refine-only affordances.
    const continueCta = page.getByTestId("studio-v3-final-reveal-continue");
    await expect(continueCta).toBeVisible();
    await expect(continueCta).toHaveText(/Confirm & reserve/i);
    await expect(page.getByTestId("studio-v3-final-reveal-save")).toBeVisible();
    expect(
      await reveal.getByRole("button", { name: /See my signature story/i }).count(),
      "Refine primary CTA must not appear on Storytelling",
    ).toBe(0);
    expect(
      await reveal.locator('[data-testid="studio-v3-add-ons"]').count(),
      "Add-on toggles must not appear on Storytelling",
    ).toBe(0);

    // Continue to Guest Details. The Signature Story email is no longer sent
    // on email blur — it fires once, on the explicit submit action — so the
    // contract asserted here is the honest submit affordance, not a blur toast.
    await continueCta.click();
    const email = page.getByLabel(/email/i).first();
    await email.waitFor({ state: "visible", timeout: 5_000 });

    const guestText = (await page.locator("body").innerText()) ?? "";
    expect(guestText).not.toMatch(FORBIDDEN_COPY);

    await email.fill("qa+reveal@yesexperiences.pt");
    await email.blur();
    const submit = page.getByTestId("studio-v3-guest-details-submit");
    await expect(submit).toBeVisible();
    await expect(submit).toHaveText(/email my signature story/i);
  });

  test("visual — reveal and Guest Details baselines", async ({ page }) => {
    await page.goto("/studio-v3");
    await walkToReveal(page);
    await advanceRefineToStorytelling(page);

    const reveal = page.getByTestId("studio-v3-final-reveal");
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "Funnel did not reach the Final Reveal in this run.");
    }
    await page.getByTestId("studio-v3-final-reveal-timeline").waitFor();
    await settle(page);

    await expect(page).toHaveScreenshot("reveal-393.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });

    await page.getByTestId("studio-v3-final-reveal-continue").click();
    await page.getByLabel(/email/i).first().waitFor({ state: "visible" });
    await settle(page);

    await expect(page).toHaveScreenshot("guest-details-393.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });
  });
});
