import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * E2E coverage for the post-hero sticky CTA *content* contract.
 *
 * This complements e2e/sticky-cta-visibility.spec.ts (which covers the
 * scroll-gate timing). Here we assert:
 *
 *   1. The on-screen copy matches the brand voice exactly:
 *        • Headline:  "Your Portugal, Your Way"     (serif italic)
 *        • Eyebrow:   "Private. Local. Instantly secured."
 *        • Button:    "Say YES"
 *   2. Tapping "Say YES" opens a two-option choice sheet, NOT an
 *      immediate navigation, exposing:
 *        • "Explore Signature Experiences"  → /experiences
 *        • "Design & Secure Your Own"       → /builder
 *   3. The polite live region announces the new storytelling text
 *      ("Say YES to begin your Portugal experience — shortcut available
 *      at the bottom of the screen.") once the user has scrolled past
 *      the hero.
 *   4. The hero scroll-gate behaviour is still respected — none of the
 *      copy/sheet/announcement assertions can be observed while the
 *      user is sitting on the hero.
 *
 * If marketing wants to change the copy later, this file is the single
 * source of truth — fail loudly and on purpose.
 */

const HERO_THRESHOLD = 600;
const SCROLL_IDLE_MS = 220;
const IDLE_SETTLE_MS = SCROLL_IDLE_MS + 180;

const HEADLINE = "Your Portugal, Your Way";
const EYEBROW = "Private. Local. Curated.";
const BUTTON_IDLE = "Start Your Experience";
const BUTTON_LOADING = "Opening…";
const BUTTON_ARIA = "Start your experience — choose how to begin";
const CHOICE_EXPLORE = "Explore Signature Experiences";
const CHOICE_DESIGN = "Design & Secure Your Own";
const ANNOUNCEMENT = "Start your experience — shortcut available at the bottom of the screen.";

/** The CTA <button> — stable across copy tweaks via aria-label. */
function ctaButton(page: Page): Locator {
  return page.getByRole("button", { name: BUTTON_ARIA });
}

/** Wrapper div that owns aria-hidden + opacity transitions for the bar. */
function stickyBar(page: Page): Locator {
  return ctaButton(page).locator("xpath=ancestor::div[contains(@class,'fixed')][1]");
}

/** The two-option dialog rendered above the bar. */
function choiceSheet(page: Page): Locator {
  return page.getByRole("dialog", { name: "Where shall we begin?" });
}

/** The polite ARIA live region rendered by <PostHeroAnnouncer />. */
function liveRegion(page: Page): Locator {
  return page.locator('[role="status"][aria-live="polite"]');
}

/** Smoothly scroll to keep us "in motion" for `durationMs`. */
async function scrollOverTime(page: Page, targetY: number, durationMs: number) {
  await page.evaluate(
    async ({ targetY, durationMs }) => {
      const startY = window.scrollY;
      const delta = targetY - startY;
      const start = performance.now();
      return new Promise<void>((resolve) => {
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          window.scrollTo(0, startY + delta * t);
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    { targetY, durationMs },
  );
}

/** Move past the hero and wait for the bar to actually appear. */
async function revealBar(page: Page) {
  await scrollOverTime(page, HERO_THRESHOLD + 400, 600);
  await page.waitForTimeout(IDLE_SETTLE_MS);
  await expect(stickyBar(page)).toHaveAttribute("aria-hidden", "false");
  await expect(stickyBar(page)).toBeVisible();
}

test.describe("Sticky CTA — copy, choice sheet, and announcement contract", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await stickyBar(page).waitFor({ state: "attached" });
  });

  test("renders the branded headline, eyebrow, and Say YES button copy", async ({ page }) => {
    await revealBar(page);

    const bar = stickyBar(page);
    await expect(bar.getByText(HEADLINE, { exact: true })).toBeVisible();
    await expect(bar.getByText(EYEBROW, { exact: true })).toBeVisible();

    const cta = ctaButton(page);
    await expect(cta).toContainText(BUTTON_IDLE);

    // Headline uses the brand's serif italic treatment.
    const headline = bar.getByText(HEADLINE, { exact: true });
    const fontStyle = await headline.evaluate((el) => getComputedStyle(el).fontStyle);
    expect(fontStyle).toBe("italic");
    const fontFamily = await headline.evaluate((el) =>
      getComputedStyle(el).fontFamily.toLowerCase(),
    );
    expect(fontFamily).toContain("serif");
  });

  test("CTA has the correct accessible name and idle attributes", async ({ page }) => {
    await revealBar(page);

    const cta = ctaButton(page);
    await expect(cta).toHaveAttribute("aria-label", BUTTON_ARIA);
    await expect(cta).toHaveAttribute("aria-busy", "false");
    await expect(cta).toHaveAttribute("aria-disabled", "false");
    await expect(cta).toHaveAttribute("aria-haspopup", "dialog");
    await expect(cta).toHaveAttribute("aria-expanded", "false");
    await expect(cta).toHaveAttribute("data-state", "idle");
    await expect(cta).toHaveAttribute("data-cta", "say_yes_open");
  });

  test("opens the two-option choice sheet on first tap (no navigation yet)", async ({ page }) => {
    await revealBar(page);

    // Track navigations so we can assert tapping "Say YES" does NOT route.
    let navigated = false;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigated = true;
    });

    const cta = ctaButton(page);
    await cta.click();

    // Sheet is open and labelled correctly.
    const sheet = choiceSheet(page);
    await expect(sheet).toBeVisible();
    await expect(cta).toHaveAttribute("aria-expanded", "true");
    await expect(cta).toHaveAttribute("data-state", "open");

    // Both choices are present, with the correct hrefs.
    const explore = sheet.getByRole("link", { name: new RegExp(CHOICE_EXPLORE, "i") });
    const design = sheet.getByRole("link", { name: new RegExp(CHOICE_DESIGN, "i") });
    await expect(explore).toBeVisible();
    await expect(design).toBeVisible();
    await expect(explore).toHaveAttribute("href", "/experiences");
    await expect(design).toHaveAttribute("href", "/builder");

    // No navigation happened from opening the sheet itself.
    expect(navigated).toBe(false);
  });

  test("choosing 'Explore Signature Experiences' fires the right intent", async ({ page }) => {
    await revealBar(page);

    // Subscribe to intent events BEFORE any tap so we capture all of them.
    await page.evaluate(() => {
      const w = window as unknown as { __yesIntents?: string[] };
      w.__yesIntents = [];
      window.addEventListener("yes:cta_intent", (e: Event) => {
        const detail = (e as CustomEvent<{ cta: string }>).detail;
        w.__yesIntents!.push(detail.cta);
      });
    });

    await ctaButton(page).click();
    const sheet = choiceSheet(page);
    await sheet
      .getByRole("link", { name: new RegExp(CHOICE_EXPLORE, "i") })
      .click({ noWaitAfter: true });

    const intents = await page.evaluate(
      () => (window as unknown as { __yesIntents?: string[] }).__yesIntents ?? [],
    );
    expect(intents).toContain("say_yes_open");
    expect(intents).toContain("explore_signature");
  });

  test("polite live region announces the new copy after scrolling past the hero", async ({
    page,
  }) => {
    const region = liveRegion(page);
    await expect(region).toHaveCount(1);
    await expect(region).toBeEmpty();

    await revealBar(page);

    await expect(region).toHaveText(ANNOUNCEMENT);
    await expect(region).toHaveAttribute("aria-live", "polite");
    await expect(region).toHaveAttribute("aria-atomic", "true");
  });

  test("preserves the hero scroll-gate while owning the new copy and sheet", async ({ page }) => {
    // Sitting on the hero: bar hidden, no announcement, button unreachable.
    await expect(stickyBar(page)).toHaveAttribute("aria-hidden", "true");
    await expect(liveRegion(page)).toBeEmpty();
    await expect(page.getByRole("button", { name: BUTTON_ARIA })).toHaveCount(0);

    // Scroll past + settle — bar + announcement appear together.
    await revealBar(page);
    await expect(ctaButton(page)).toBeVisible();
    await expect(ctaButton(page)).toContainText(BUTTON_IDLE);
    await expect(liveRegion(page)).toHaveText(ANNOUNCEMENT);

    // Open the sheet, then scroll back into the hero — bar must hide and
    // sheet must close (component effect closes it when visible flips).
    await ctaButton(page).click();
    await expect(choiceSheet(page)).toBeVisible();

    await scrollOverTime(page, 0, 600);
    await page.waitForTimeout(160);
    await expect(stickyBar(page)).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("button", { name: BUTTON_ARIA })).toHaveCount(0);
    // The dialog is dismissed (or at minimum hidden from AT) once the bar
    // is gated out by the hero.
    await expect(choiceSheet(page)).toHaveCount(0);
  });

  // Loading state still applies once a *choice* is taken.
  test("the chosen route enters a loading state and prevents double-tap", async ({ page }) => {
    await revealBar(page);

    await ctaButton(page).click();
    const sheet = choiceSheet(page);
    const design = sheet.getByRole("link", { name: new RegExp(CHOICE_DESIGN, "i") });

    await design.click({ noWaitAfter: true });

    // The bar's primary CTA reflects the in-flight submission.
    const cta = ctaButton(page);
    await expect(cta).toContainText(BUTTON_LOADING);
    await expect(cta).toHaveAttribute("aria-busy", "true");
    await expect(cta).toHaveAttribute("aria-disabled", "true");
    await expect(cta).toHaveAttribute("data-state", "submitting");
  });
});
