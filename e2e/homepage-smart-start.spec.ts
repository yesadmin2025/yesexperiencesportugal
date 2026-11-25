import { expect, test, type Page } from "@playwright/test";

const TRUST_STRIP = "#five-paths";

async function openHome(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(TRUST_STRIP)).toBeVisible({ timeout: 20_000 });
}

test.describe("homepage conversion paths", () => {
  test("exposes all five services in their real commercial sections, not duplicate cards", async ({ page }) => {
    await openHome(page);
    await expect(page.locator("[data-home-primary-path]")).toHaveCount(0);
    for (const [section, href] of [["#signatures", "/experiences"], ["#builder", "/studio"], ["#multi-day", "/portugal-travel-designer"], ["#special-occasions", "/proposal-in-portugal"], ["#special-occasions", "/corporate"]]) {
      await expect(page.locator(`${section} a[href="${href}"]`).first()).toBeVisible();
    }
  });

  test("puts bookable products before the full reviews on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await openHome(page);
    const order = await page.evaluate(() => [
      "five-paths", "signatures", "builder", "reviews", "special-occasions", "plan-map", "journal",
    ].map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? -1));
    expect(order.every((top) => top >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const trustBox = await page.locator(TRUST_STRIP).boundingBox();
    expect(trustBox).not.toBeNull();
    expect(trustBox!.height).toBeLessThanOrEqual(108);
    await expect(page.locator("#five-paths + #signatures")).toHaveCount(1);
    await expect(page.locator("[data-home-primary-path]")).toHaveCount(0);
    await expect(page.locator(".home-quick-trust a")).toHaveAttribute("href", "#reviews");
    await expect(page.locator('[data-hero-field="primaryCta"]')).toHaveAttribute("href", "/experiences");
    await expect(page.locator('[data-hero-field="secondaryCta"]')).toHaveAttribute("href", "/studio");
    const firstCard = page.locator("#signatures article").first();
    for (const width of [320, 375, 390, 393, 414]) {
      await page.setViewportSize({ width, height: 852 });
      await expect(firstCard.locator(".home-signature-highlights li")).toHaveCount(3);
      for (const item of await firstCard.locator(".home-signature-highlights li").all()) await expect(item).toBeVisible();
      await expect(firstCard.getByTestId("signature-pickup")).toBeVisible();
      await expect(firstCard.getByTestId("signature-card-price")).toBeVisible();
      const intro = page.locator(".signature-chapter-intro");
      const title = intro.locator("h2");
      const copy = intro.locator("p.scene-body");
      const gap = await page.evaluate(() => { const a = document.querySelector(".signature-chapter-intro h2")!, b = document.querySelector(".signature-chapter-intro p.scene-body")!; return b.getBoundingClientRect().top - a.getBoundingClientRect().bottom; });
      expect(gap).toBeGreaterThanOrEqual(12);
      await expect(title).toBeVisible();
      await expect(copy).toBeVisible();
    }
    await expect(firstCard.locator(".home-signature-highlights li").first()).toContainText("Two wineries");
    await expect(page.locator("#signatures").getByText(/tailor selected details/i)).toBeVisible();
    await expect(page.locator("#why-yes li")).toHaveCount(6);
    await expect(page.locator("#faq").getByRole("link", { name: "Explore Signature Experiences" })).toHaveAttribute("href", "/experiences");
    await expect(page.locator("#signatures").getByRole("link", { name: /See dates and reserve/ }).first()).toHaveAttribute("href", "/tours/arrabida-wine-allinclusive#book");
  });

  test("keeps peer editorial chapters on one measured typographic rhythm", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHome(page);
    const sections = ["signatures", "builder", "multi-day", "reviews", "special-occasions", "why-yes", "plan-map", "journal"];
    for (const width of [320, 393, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      const measured = await page.evaluate((ids) => ids.map((id) => {
        const section = document.getElementById(id)!;
        const intro = section.querySelector(".home-major-intro, .home-editorial-intro")!;
        const h = intro.querySelector("h2")!;
        const cs = getComputedStyle(h);
        return { id, size: cs.fontSize, leading: cs.lineHeight, top: getComputedStyle(section).paddingTop, bottom: getComputedStyle(section).paddingBottom };
      }), sections);
      for (const item of measured) {
        expect(item.size, item.id).toBe(measured[0].size);
        expect(item.leading, item.id).toBe(measured[0].leading);
        expect(item.top, item.id).toBe(measured[0].top);
        expect(item.bottom, item.id).toBe(measured[0].bottom);
      }
      if (width !== 320) {
        for (const id of sections) await page.locator("#" + id).scrollIntoViewIfNeeded();
        await page.locator("footer").scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollTo(0, 0));
        await testInfo.attach("homepage-editorial-" + width, { body: await page.screenshot({ fullPage: true, animations: "disabled" }), contentType: "image/png" });
      }
    }
    await expect(page.locator("footer").getByText(/shown the way a local shows a friend/i)).toBeVisible();
  });

  test("keeps commercial footer links visible and secondary navigation accessible", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await openHome(page);
    await page.waitForFunction(() => (window as Window & { __APP_READY__?: boolean }).__APP_READY__ === true, undefined, { timeout: 30_000 });
    const footer = page.locator("footer").first();
    const nav = footer.getByRole("navigation", { name: "Explore YES Experiences Portugal services and company" });
    for (const href of ["/experiences", "/studio", "/portugal-travel-designer", "/proposal-in-portugal", "/corporate", "/trade"]) {
      await expect(nav.locator(`a[href="${href}"]`).first()).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "For Travel Advisors & Agencies" })).toHaveAttribute("href", "/trade");
    const consent = page.getByRole("button", { name: "Essential only", exact: true });
    if (await consent.isVisible()) await consent.click();
    for (const [name, id] of [["Company", "company"], ["Legal", "legal"], ["Discover Portugal", "discover-portugal"]]) {
      const toggle = nav.getByRole("button", { name, exact: true });
      const group = nav.locator(`#footer-group-${id}`);
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(group).toBeHidden();
      expect(await group.locator("a").count()).toBeGreaterThan(0);
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(group).toBeVisible();
      await toggle.click();
      await expect(group).toBeHidden();
    }
    await expect(footer.getByRole("link", { name: "WhatsApp", exact: true }).first()).toBeVisible();
    await expect(footer.getByRole("link", { name: /guest reviews/i }).first()).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(nav.getByRole("button", { name: "Company", exact: true })).toBeHidden();
    await expect(nav.locator("#footer-group-company")).toBeVisible();
    await expect(nav.locator("#footer-group-legal")).toBeVisible();
    await expect(nav.locator("#footer-group-discover-portugal")).toBeVisible();
    await expect(nav.getByRole("link", { name: "For Travel Advisors & Agencies" })).toBeVisible();
  });

  test("does not pretend a generic visitor has a Studio draft", async ({ page }) => {
    await openHome(page);
    await expect(page.locator('[data-testid="home-smart-start-resume"]')).toHaveCount(0);
    await expect(page.getByText("Your Studio draft is waiting", { exact: true })).toHaveCount(0);
  });

  test("navigates directly to Studio from the custom-day path", async ({ page }) => {
    await openHome(page);
    const studio = page.locator("#builder a[href='/studio']").first();
    // The page is SSR-first and the Studio route is dynamically imported.
    // Wait for the homepage load event before the interaction, then assert
    // that the *real click* navigates; never replace it with page.goto().
    await page.waitForLoadState("load");
    // Full load can precede hydration in the SSR dev server. The public
    // app explicitly signals when links are interactive; never click early.
    await page.waitForFunction(() => (window as Window & { __APP_READY__?: boolean }).__APP_READY__ === true, undefined, { timeout: 30_000 });
    await expect(studio).toHaveAttribute("href", "/studio");
    await studio.scrollIntoViewIfNeeded();
    await studio.click();
    await expect(page).toHaveURL(/\/studio(?:[?#].*)?$/, { timeout: 20_000 });
  });

  test("recognises a privacy-safe saved Studio draft", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      const now = Date.now();
      window.localStorage.setItem(
        "yes.studio-v3.draft.v1",
        JSON.stringify({
          version: 1,
          updatedAt: new Date(now).toISOString(),
          expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
          state: {
            phase: "rhythm",
            feeling: "coastal",
            companions: "couple",
            rhythm: "slow",
          },
        }),
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    const resume = page.locator('[data-testid="home-smart-start-resume"]');
    await expect(resume).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Coastal · Couple · Slow/)).toBeVisible();
    await expect(resume).toHaveAttribute("href", "/studio");
    await expect(resume).toHaveAttribute("data-smart-start-recommended", "true");
  });
});