/**
 * Signature pages — automated visual regression guard.
 *
 * For every Signature tour, this spec verifies two invariants that a
 * regression could silently break:
 *
 *  1. The route map renders — a `[role="img"][aria-label^="Route map"]`
 *     tile with non-zero pixel size is present after scroll + hydration.
 *     Covers both the real Leaflet `SignatureRouteMap` (lazy-loaded) and
 *     the fallback SVG `RouteMap` in `tours.$tourId.tsx`.
 *
 *  2. Every `<img>` on the page loads successfully — no broken assets:
 *     `complete === true` and `naturalWidth > 0`. Also fails on any
 *     network response for image types with status ≥ 400.
 *
 * Runs against all 11 Signature tour IDs so a broken map or missing
 * gallery photo on a single tour fails CI, not just the one we clicked.
 */
import { test, expect, type Request, type Response } from "@playwright/test";
import { signatureTours } from "../src/data/signatureTours";

const TOUR_IDS = signatureTours.map((t) => t.id);

test.describe("Signature tour pages — map + image integrity", () => {
  for (const tourId of TOUR_IDS) {
    test(`/${tourId} renders map and loads all images`, async ({ page }) => {
      const imageFailures: string[] = [];

      page.on("response", (res: Response) => {
        const req: Request = res.request();
        const type = req.resourceType();
        if (type !== "image") return;
        if (res.status() >= 400) {
          imageFailures.push(`${res.status()} ${req.url()}`);
        }
      });

      await page.goto(`/tours/${tourId}`, { waitUntil: "domcontentloaded" });

      // Trigger lazy sections + IntersectionObserver reveals.
      await page.evaluate(async () => {
        const step = () =>
          new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
        const h = document.body.scrollHeight;
        for (let y = 0; y <= h; y += 600) {
          window.scrollTo(0, y);
          await step();
        }
        window.scrollTo(0, 0);
      });

      // 1) Map is present and has non-zero rendered size.
      const map = page.locator('[role="img"][aria-label^="Route map"]').first();
      await expect(map, `map missing on /tours/${tourId}`).toBeVisible({
        timeout: 10_000,
      });
      const box = await map.boundingBox();
      expect(box, `map has no bounding box on /tours/${tourId}`).not.toBeNull();
      expect(box!.width).toBeGreaterThan(200);
      expect(box!.height).toBeGreaterThan(120);

      // 2) Every rendered <img> resolved to a real bitmap.
      const broken = await page.$$eval("img", (imgs) =>
        imgs
          .filter((el) => {
            const img = el as HTMLImageElement;
            // Ignore lazy imgs that haven't been given a src yet.
            if (!img.currentSrc && !img.src) return false;
            return !img.complete || img.naturalWidth === 0;
          })
          .map((el) => (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src),
      );
      expect(
        broken,
        `broken <img> on /tours/${tourId}:\n${broken.join("\n")}`,
      ).toEqual([]);

      expect(
        imageFailures,
        `image HTTP failures on /tours/${tourId}:\n${imageFailures.join("\n")}`,
      ).toEqual([]);
    });
  }
});
