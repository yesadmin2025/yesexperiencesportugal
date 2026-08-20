import { test, expect, type Page } from "@playwright/test";

/**
 * Hero CTA typography & spacing contract — "One Breath" hero.
 *
 * The hero was redesigned around a single held clip, a centred italic
 * stanza and two delayed CTAs. The old eyebrow/H1/subheadline stack no
 * longer exists, so this spec locks what the current design actually
 * promises:
 *   • both CTAs carry the approved labels
 *   • labels stay uppercase and never regress to leading-none
 *   • each CTA is a comfortable tap target (>= 44px tall on mobile)
 *   • the two CTAs keep a breathable gap
 *
 * Pixel snapshots of the CTA group live in `hero-visual-regression.spec.ts`.
 */

const ROUTE = "/?hero=last";

async function gotoHero(page: Page) {
  await page.goto(ROUTE);
  // The visible cinematic stanza (decorative phrases) settles first…
  const stanza = page.locator('[data-hero-stanza="true"]');
  await expect(stanza).toBeVisible();
  // …then the delayed CTA group fades in.
  const primary = page.getByRole("link", { name: "Design your day", exact: true });
  await expect(primary).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector("[data-hero-composed]") as HTMLElement | null;
      return !!el && getComputedStyle(el).opacity === "1";
    },
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(250);
}

function ctas(page: Page) {
  return {
    primary: page.getByRole("link", { name: "Design your day", exact: true }),
    secondary: page.getByRole("link", { name: "Explore Signature Experiences", exact: true }),
  };
}

test.describe("Hero CTA — typography & spacing contract", () => {
  test("CTA labels are uppercase, breathable and comfortably tall", async ({ page }) => {
    await gotoHero(page);
    const { primary, secondary } = ctas(page);

    for (const cta of [primary, secondary]) {
      await expect(cta).toBeVisible();

      const styles = await cta.evaluate((el) => {
        const cs = getComputedStyle(el as HTMLElement);
        return {
          lineHeight: cs.lineHeight,
          fontSize: parseFloat(cs.fontSize),
          textTransform: cs.textTransform,
          height: (el as HTMLElement).getBoundingClientRect().height,
        };
      });

      const lh =
        styles.lineHeight === "normal" ? styles.fontSize * 1.2 : parseFloat(styles.lineHeight);
      const ratio = lh / styles.fontSize;
      expect(
        ratio,
        `CTA line-height ratio should be > 1.3 (got ${ratio.toFixed(2)})`,
      ).toBeGreaterThan(1.3);

      expect(styles.textTransform).toBe("uppercase");

      expect(
        styles.height,
        `CTA should be a comfortable tap target (got ${styles.height.toFixed(1)}px)`,
      ).toBeGreaterThanOrEqual(43.5);
    }
  });

  test("two CTA buttons keep a comfortable gap between them", async ({ page }) => {
    await gotoHero(page);
    const { primary, secondary } = ctas(page);

    const [a, b] = await Promise.all([primary.boundingBox(), secondary.boundingBox()]);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();

    const verticalGap = Math.abs(b!.y - (a!.y + a!.height));
    const horizontalGap = Math.abs(b!.x - (a!.x + a!.width));
    const gap = Math.min(verticalGap, horizontalGap);

    expect(
      gap,
      `CTA-to-CTA gap should be >= 10px (got ${gap.toFixed(1)}px)`,
    ).toBeGreaterThanOrEqual(10);
  });
});
