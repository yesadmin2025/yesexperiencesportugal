/**
 * Layout stability + image-loading contract.
 *
 * Guards the lazy-loading optimizations: adding `loading="lazy"` /
 * `decoding="async"` must never change visual spacing. Two guarantees per
 * public route:
 *
 *  1. CLS stays under budget while the page loads AND while the user scrolls
 *     the whole page (lazy images decode late — that is exactly when a
 *     missing size reservation shows up as a shift).
 *  2. Every lazy image reserves its box before it decodes: it must have
 *     intrinsic width/height attributes, an explicit CSS aspect-ratio, a
 *     fixed height, or sit in an absolutely-positioned/inset fill container.
 *
 * The spec runs at the mobile baseline (393px) because that is the primary
 * viewport for this project.
 */
import { test, expect, type Page } from "@playwright/test";

const ROUTES = [
  { name: "home", path: "/" },
  { name: "experiences", path: "/experiences" },
  { name: "tour", path: "/tours/lisbon-arrabida-sanctuary" },
  { name: "designer", path: "/portugal-travel-designer" },
  { name: "partners", path: "/partners" },
] as const;

const CLS_BUDGET = 0.1;

type ImageReport = {
  src: string;
  loading: string;
  reserved: boolean;
  reason: string;
};

async function startCls(page: Page) {
  await page.addInitScript(() => {
    // The Web Vitals CLS metric is the largest 5s session window with
    // no gap over 1s, NOT the sum of every shift over a long scroll.
    // Keep the exact 0.1 budget and record the raw total for diagnosis.
    const metrics = window as unknown as { __cls: number; __clsRaw: number };
    metrics.__cls = 0;
    metrics.__clsRaw = 0;
    let sessionValue = 0;
    let sessionStart = -1;
    let lastShift = -1;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<
          PerformanceEntry & { hadRecentInput?: boolean; value?: number }
        >) {
          if (entry.hadRecentInput) continue;
          const shift = entry.value ?? 0;
          if (shift === 0) continue;
          metrics.__clsRaw += shift;
          if (
            lastShift < 0 ||
            entry.startTime - lastShift > 1000 ||
            entry.startTime - sessionStart > 5000
          ) {
            sessionStart = entry.startTime;
            sessionValue = shift;
          } else {
            sessionValue += shift;
          }
          lastShift = entry.startTime;
          metrics.__cls = Math.max(metrics.__cls, sessionValue);
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      /* unsupported — the assertion below simply reads 0 */
    }
  });
}

/** Scroll the full page so every lazy image is requested and decoded. */
async function scrollThroughPage(page: Page) {
  // Keep each scroll in its own browser task. A single long page.evaluate
  // can lose its execution context on route hydration/navigation and hide
  // the actual page that caused the problem.
  const origin = new URL(page.url()).pathname;
  const { step, height } = await page.evaluate(() => ({
    step: Math.max(1, Math.round(window.innerHeight * 0.8)),
    height: document.body.scrollHeight,
  }));
  for (let y = 0; y < height; y += step) {
    await page.evaluate((offset) => window.scrollTo(0, offset), y);
    await page.waitForTimeout(150);
    expect(new URL(page.url()).pathname, "route changed during lazy-image audit").toBe(origin);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
}
for (const route of ROUTES) {
  test(`layout stability + image sizing — ${route.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await startCls(page);
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

    await scrollThroughPage(page);

    // ── 1. Cumulative layout shift budget ───────────────────────────────
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls ?? 0);
    expect(
      cls,
      `${route.name} max-session CLS after scroll (raw total: ${await page.evaluate(() => (window as unknown as { __clsRaw: number }).__clsRaw ?? 0)})`,
    ).toBeLessThan(CLS_BUDGET);

    // ── 2. Every lazy image reserves space before it decodes ────────────
    const unreserved: ImageReport[] = await page.evaluate(() => {
      const out: Array<{ src: string; loading: string; reserved: boolean; reason: string }> = [];

      for (const img of Array.from(document.querySelectorAll("img"))) {
        const loading = img.getAttribute("loading") ?? "eager";
        if (loading !== "lazy") continue;

        const cs = getComputedStyle(img);
        const parent = img.parentElement;
        const parentCs = parent ? getComputedStyle(parent) : null;

        const hasAttrs = Boolean(img.getAttribute("width") && img.getAttribute("height"));
        const hasAspect = cs.aspectRatio !== "auto" && cs.aspectRatio !== "";
        const fixedHeight = cs.height !== "auto" && parseFloat(cs.height) > 0;
        const isFill =
          cs.position === "absolute" ||
          cs.position === "fixed" ||
          (parentCs?.position === "relative" && parseFloat(cs.height) > 0);
        const parentReserves = Boolean(
          parentCs &&
            (parentCs.aspectRatio !== "auto" ||
              (parentCs.height !== "auto" && parseFloat(parentCs.height) > 0)),
        );

        const reserved = hasAttrs || hasAspect || fixedHeight || isFill || parentReserves;
        if (!reserved) {
          out.push({
            src: (img.currentSrc || img.src || "(no src)").slice(-90),
            loading,
            reserved,
            reason: `computed height=${cs.height} aspect-ratio=${cs.aspectRatio} position=${cs.position}`,
          });
        }
      }
      return out;
    });

    expect(
      unreserved,
      `${route.name}: lazy images without a reserved box:\n` +
        unreserved.map((i) => ` • ${i.src} — ${i.reason}`).join("\n"),
    ).toEqual([]);

    // ── 3. Lazy images also decode async (keeps the main thread free) ───
    // Third-party vendor markup (Trustindex certificate) is out of our
    // control and is already injected lazily — only first-party images count.
    const lazyWithoutAsyncDecode = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img[loading="lazy"]'))
        .filter((img) => !/trustindex\.|stripe\.com|googletagmanager/i.test((img as HTMLImageElement).src))
        .filter((img) => img.getAttribute("decoding") !== "async")
        .map((img) => (img as HTMLImageElement).src.slice(-90)),
    );
    expect(
      lazyWithoutAsyncDecode,
      `${route.name}: lazy images missing decoding="async"`,
    ).toEqual([]);

  });
}
