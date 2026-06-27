/**
 * CinematicHero — background video attribute and fallback check.
 *
 * Verifies the hero background video (the held looping road clip in
 * CinematicHero) always renders with the correct autoplay contract:
 *   - autoplay, muted, loop, playsInline attributes present
 *   - poster fallback is set on the <video> and the <picture> fallback
 *     remains visible as the LCP fallback
 *
 * Runs at mobile and desktop because the video is intentionally deferred
 * via requestIdleCallback and is not always present on initial paint.
 */
import { test, expect } from "@playwright/test";

const VIDEO_SELECTOR = 'section[aria-label="YES Experiences Portugal"] video';
const POSTER_IMG_SELECTOR = 'section[aria-label="YES Experiences Portugal"] picture img[fetchPriority="high"]';

const VIEWPORTS = [
  {
    name: "mobile 393×851",
    use: { viewport: { width: 393, height: 851 } },
  },
  {
    name: "desktop 1280×720",
    use: { viewport: { width: 1280, height: 720 } },
  },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`CinematicHero video attributes — ${vp.name}`, () => {
    test.use(vp.use);

    test("background video has autoplay, muted, loop, playsInline", async ({ page }) => {
      await page.goto("/");

      // The <video> is mounted after requestIdleCallback. Wait for it.
      const video = page.locator(VIDEO_SELECTOR);
      await video.waitFor({ state: "attached", timeout: 5000 });

      await expect(video).toHaveAttribute("autoplay");
      await expect(video).toHaveAttribute("muted");
      await expect(video).toHaveAttribute("loop");
      await expect(video).toHaveAttribute("playsinline");
    });

    test("background video has a poster fallback", async ({ page }) => {
      await page.goto("/");

      const video = page.locator(VIDEO_SELECTOR);
      await video.waitFor({ state: "attached", timeout: 5000 });

      const poster = await video.getAttribute("poster");
      expect(poster, "video poster attribute should be a non-empty path").toBeTruthy();
      expect(poster).toMatch(/\.(jpg|webp|png)$/i);
    });

    test("poster image is present as the immediate loading fallback", async ({ page }) => {
      await page.goto("/");

      const posterImg = page.locator(POSTER_IMG_SELECTOR);
      await expect(posterImg).toBeVisible();

      const src = await posterImg.getAttribute("src");
      expect(src, "poster img src should be a non-empty image path").toBeTruthy();
      expect(src).toMatch(/\.(jpg|webp|png)$/i);
    });
  });
}
