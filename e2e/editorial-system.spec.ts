import { expect, test } from "@playwright/test";

const routes = [
  "/", "/experiences", "/tours/arrabida-wine-allinclusive",
  "/tours/arrabida-wine-allinclusive/tailor", "/portugal-travel-designer",
  "/proposal-in-portugal", "/corporate", "/trade", "/about", "/day-tours",
  "/lisbon-wine-tours", "/regions-of-portugal", "/local-stories",
  "/local-stories/troia-comporta-guide", "/contact", "/reviews", "/faq", "/press",
  "/itineraries/10-day-private-portugal-tour", "/pt", "/pt/experiences",
  "/pt/about", "/pt/corporate", "/studio",
];

test.use({ reducedMotion: "reduce" });
for (const path of routes) {
  for (const width of [393, 1440]) {
    test(path + " editorial geometry at " + width, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
      await page.evaluate(() => document.fonts.ready);
      const consent = page.locator(".cookie-consent-card button").filter({ hasText: /essential only|só essenciais|apenas essenciais/i }).first();
      if (await consent.isVisible()) await consent.click();
      const readings = await page.evaluate(() => {
        const root = document.querySelector("main[data-editorial-page]");
        if (!root) return [];
        const pairs = root.querySelectorAll(".he-eyebrow-bar + h2, .scene-atmosphere + h2, [data-eyebrow] + h2");
        return Array.from(pairs).filter(h => !h.closest(".hero-cinematic, article, form, #book, #reserve") && h.getBoundingClientRect().height > 0).map(h => {
          const label = h.previousElementSibling!;
          const a = label.getBoundingClientRect(), b = h.getBoundingClientRect();
          const css = getComputedStyle(h);
          return { label: label.textContent?.trim(), title: h.textContent?.trim(), gap: b.top - a.bottom, marginTop: parseFloat(css.marginTop), size: parseFloat(css.fontSize), leading: css.lineHeight };
        });
      });
      for (const reading of readings) {
        expect(reading.gap, reading.title).toBeGreaterThanOrEqual(width >= 768 ? 18 : 15.5);
        if (width < 768) expect(reading.marginTop, reading.title).toBe(16);
        expect(reading.gap, reading.title).toBeLessThanOrEqual(36);
        expect(reading.size, reading.title).toBe(width >= 768 ? 40 : 30);
      }
      if (path === "/") {
        expect(readings.length).toBeGreaterThanOrEqual(6);
        await expect(page.locator("#faq")).toHaveCount(1);
        if (width < 768) {
          await expect(page.locator("#faq")).toHaveCSS("padding-top", "32px");
          await expect(page.locator("#signatures")).toHaveCSS("padding-bottom", "32px");
          await expect(page.locator("#builder")).toHaveCSS("padding-top", "32px");
          await expect(page.locator(".home-signature-content").first()).toHaveCSS("padding-left", "16px");
          await expect(page.locator(".home-signature-promise").first()).toHaveCSS("font-size", "14px");
          await expect(page.locator("#home-faq-content")).toHaveCSS("padding-top", "0px");
          await expect(page.locator("#faq .homepage-faq-trigger").first()).toHaveCSS("font-size", "15.5px");
          await expect(page.locator("#why-yes h3").first()).toHaveCSS("font-size", "15px");
          await expect(page.locator("#signatures .home-major-intro > p")).toHaveCSS("font-size", "15px");
        }
      }
      if (path === "/experiences" && width < 768) {
        await expect(page.locator(".experience-card-title").first()).toHaveCSS("font-size", "20px");
        await expect(page.locator(".experience-card-meta").first()).toHaveCSS("font-size", "13px");
        await expect(page.locator(".experience-card-content").first()).toHaveCSS("padding-left", "16px");
        await expect(page.locator(".experience-card-promise").first()).toHaveCSS("font-size", "14px");
      }
      if (path.startsWith("/pt")) {
        const footer = page.locator("footer");
        await expect(footer.locator('a[href="/pt/experiences"]').first()).toBeVisible();
        await expect(footer.locator('a[href="/pt/corporate"]').first()).toBeVisible();
        await expect(footer.getByText("Parcerias com profissionais de turismo", { exact: true })).toBeVisible();
      }
      await testInfo.attach("editorial-measurements", { body: JSON.stringify({ path, width, readings }, null, 2), contentType: "application/json" });
      // Visit each public content chapter to trigger its real lazy images and reveals.
      if (path !== "/studio") {
        for (const section of await page.locator("main section").all()) {
          if (await section.isVisible()) await section.scrollIntoViewIfNeeded();
        }
      }
      await page.evaluate(async () => {
        await Promise.race([
          Promise.all(Array.from(document.images).filter(img => img.complete && img.naturalWidth > 0).map(img => img.decode().catch(() => undefined))),
          new Promise(resolve => setTimeout(resolve, 1500)),
        ]);
        window.scrollTo(0, 0);
      });
      await testInfo.attach("editorial-" + path.replace(/[^a-z0-9]+/gi, "-") + "-" + width, {
        body: await page.screenshot({ fullPage: true, animations: "disabled" }), contentType: "image/png",
      });
    });
  }
}
