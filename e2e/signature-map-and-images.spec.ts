/**
 * Signature pages — automated visual regression guard.
 *
 * For every Signature tour, this spec verifies two invariants that a
 * regression could silently break:
 *
 *  1. The current `RouteGlance` contains a visible and accessibly named SVG
 *     orientation of Portugal. Its compact drawing is intentionally narrower
 *     than the surrounding route rail, and does not use Leaflet.
 *
 *  2. Every `<img>` on the page loads successfully — no broken assets:
 *     `complete === true` and `naturalWidth > 0`. Also fails on any
 *     network response for image types with status ≥ 400.
 *
 * Runs against every publicly released Signature tour ID so a broken map or missing
 * gallery photo on a single tour fails CI, not just the one we clicked.
 */
import { test, expect, type Request, type Response } from "@playwright/test";
import { publicSignatureTours } from "../src/data/signatureTours";
import { PENDING_VENUE_SIGNATURE_IDS } from "../src/data/pendingSignatures";

const TOUR_IDS = publicSignatureTours.map((t) => t.id);

test.describe("Signature tour pages — map + image integrity", () => {
  // Pending venues intentionally redirect, rather than expose an unbookable tour.
  for (const tourId of PENDING_VENUE_SIGNATURE_IDS) {
    test(`/${tourId} remains unpublished until venues are verified`, async ({ page }) => {
      await page.goto(`/tours/${tourId}`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/experiences\/?$/);
      await expect(page.getByTestId("route-glance")).toHaveCount(0);
    });
  }

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
        const step = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
        const h = document.body.scrollHeight;
        for (let y = 0; y <= h; y += 600) {
          window.scrollTo(0, y);
          await step();
        }
        window.scrollTo(0, 0);
      });

      // 1) The real RouteGlance orientation is present and rendered.
      const glance = page.getByTestId("route-glance");
      await expect(glance, `route glance missing on /tours/${tourId}`).toBeVisible({ timeout: 25_000 });
      const map = glance.locator('svg[role="img"][aria-label^="Where this day sits in Portugal"]');
      await expect(map, `map missing on /tours/${tourId}`).toBeVisible({
        timeout: 25_000,
      });
      // Poll the compact inline SVG in case hydration briefly remounts it.
      await expect
        .poll(async () => (await map.boundingBox().catch(() => null))?.width ?? 0, {
          message: `map has no bounding box on /tours/${tourId}`,
          timeout: 20_000,
        })
        .toBeGreaterThan(40);
      const glanceBox = await glance.boundingBox();
      expect(glanceBox!.width).toBeGreaterThan(200);
      const box = await map.boundingBox();
      expect(box!.height).toBeGreaterThan(120);

      // Images that started loading may still be decoding — give the browser a
      // short bounded window before asserting.
      await page
        .waitForFunction(
          () => Array.from(document.images).every((img) => !img.complete || img.naturalWidth > 0),
          undefined,
          { timeout: 5_000 },
        )
        .catch(() => {});

      // 2) Every <img> the browser actually fetched resolved to a real bitmap.
      // Images with `loading="lazy"` that never entered the viewport are never
      // requested at all (complete === false, no bytes) — those are not broken.
      // Genuine 404s / decode failures still surface here (complete + zero
      // natural width) and through the HTTP status listener below.
      const broken = await page.$$eval("img", (imgs) =>
        imgs
          .filter((el) => {
            const img = el as HTMLImageElement;
            if (!img.currentSrc && !img.src) return false;
            return img.complete && img.naturalWidth === 0;
          })
          .map((el) => (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src),
      );
      expect(broken, `broken <img> on /tours/${tourId}:\n${broken.join("\n")}`).toEqual([]);

      expect(
        imageFailures,
        `image HTTP failures on /tours/${tourId}:\n${imageFailures.join("\n")}`,
      ).toEqual([]);
    });
  }
});
