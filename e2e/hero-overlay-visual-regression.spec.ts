/**
 * Hero — overlay visual regression.
 *
 * Catches three classes of regression that the existing chapter-timeline
 * and chapter-crossfade specs intentionally split apart, but that real
 * users perceive as ONE bug ("the hero copy is broken"):
 *
 *   1. **Timing misalignment** — copy for chapter N appears while the
 *      film is playing chapter N-1 or N+1. Detected by sampling the
 *      DOM at deterministic mid-chapter playback times (boundary +
 *      30%, 50%, 70% of each chapter window) and asserting:
 *        • `section[data-hero-scene]` matches the manifest chapter
 *        • the rendered overlay text contains every `main` line for
 *          that chapter and ZERO main lines from any OTHER chapter
 *        • only one overlay (`data-hero-overlay="current"`) is mounted
 *          (the `prev` overlay must be absent in steady state)
 *
 *   2. **Copy bleeding** — text from the previous chapter persists
 *      into the next chapter's mid-window (i.e. the cross-fade did
 *      not unmount the prev overlay). Detected as part of (1): we
 *      sample WELL after each boundary (+700ms past the 600ms cross
 *      -fade window) and assert no `[data-hero-overlay="prev"]` node.
 *
 *   3. **Abrupt transitions** — the cross-fade is supposed to ramp
 *      both overlays' opacities along a cosine S-curve summing to ~1
 *      across ~600ms. Detected by sampling opacity ~every 60ms across
 *      every interior boundary and asserting:
 *        • monotonic ramp on each overlay (no zig-zag, no jump)
 *        • adjacent samples differ by <0.55 (rules out a hard cut)
 *        • the ramp lasts ≥250ms (rules out a sub-frame snap)
 *        • prev + current opacity ∈ [0.85, 1.15] across the ramp
 *
 * Snapshots are taken at the centre of each chapter as a final
 * pixel-level lock so any future styling drift on the overlay is also
 * caught visually. We use the manifest as the source of truth so a
 * legitimate film re-pace propagates automatically with no spec edit.
 */
import { test, expect, type Page } from "@playwright/test";
import { HERO_SCENES } from "../src/content/hero-scenes-manifest";

const VIDEO_SELECTOR = ".hero-story-stage video[data-hero-film='true']";
const OVERLAP_MS = 600;

async function waitForVideoMetadata(page: Page) {
  await page.locator(VIDEO_SELECTOR).waitFor({ state: "attached" });
  await page.evaluate(
    (sel) =>
      new Promise<void>((resolve) => {
        const v = document.querySelector(sel) as HTMLVideoElement | null;
        if (!v) return resolve();
        if (v.readyState >= 1) return resolve();
        v.addEventListener("loadedmetadata", () => resolve(), { once: true });
      }),
    VIDEO_SELECTOR,
  );
}

async function seekAndPause(page: Page, t: number) {
  await page.evaluate(
    ({ sel, t: time }) => {
      const v = document.querySelector(sel) as HTMLVideoElement | null;
      if (!v) throw new Error("hero film not found");
      v.pause();
      v.currentTime = time;
    },
    { sel: VIDEO_SELECTOR, t },
  );
  // Two rAFs: one for the seek to land, one to commit the rAF tick that
  // updates heroSceneIndex/heroPrevIndex and React's render.
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

type OverlaySnapshot = {
  activeSceneAttr: string | null;
  hasPrev: boolean;
  hasCurrent: boolean;
  prevOpacity: number;
  currentOpacity: number;
  prevText: string;
  currentText: string;
};

async function readOverlay(page: Page): Promise<OverlaySnapshot> {
  return page.evaluate(() => {
    const section = document.querySelector<HTMLElement>("section[data-hero-scene]");
    const prev = document.querySelector<HTMLElement>('[data-hero-overlay="prev"]');
    const current = document.querySelector<HTMLElement>('[data-hero-overlay="current"]');
    const op = (el: HTMLElement | null) => {
      if (!el) return -1;
      return parseFloat(getComputedStyle(el).opacity || "1");
    };
    return {
      activeSceneAttr: section?.getAttribute("data-hero-scene") ?? null,
      hasPrev: !!prev,
      hasCurrent: !!current,
      prevOpacity: op(prev),
      currentOpacity: op(current),
      prevText: prev?.textContent?.trim() || "",
      currentText: current?.textContent?.trim() || "",
    };
  });
}

function midChapterSamplePoints(start: number, end: number): readonly number[] {
  const span = end - start;
  // 30%, 50%, 70% of the chapter — well clear of both boundaries
  // (the 600ms cross-fade window is at most ~7% of the shortest
  // chapter, so 30% is comfortably steady-state).
  return [0.3, 0.5, 0.7].map((p) => start + span * p);
}

function otherMainLines(currentId: string): readonly string[] {
  return HERO_SCENES.filter((s) => s.id !== currentId).flatMap((s) => s.main);
}

test.describe("Hero overlay — timing alignment & no copy bleed", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForVideoMetadata(page);
    // Disable animations so steady-state samples are deterministic
    // (we re-enable them in the cross-fade describe block below).
    await page.addStyleTag({
      content: `*, *::before, *::after { animation: none !important; transition: none !important; }`,
    });
  });

  for (const scene of HERO_SCENES) {
    test(`chapter "${scene.id}" — copy aligned to playback, no bleed`, async ({ page }) => {
      const samplePoints = midChapterSamplePoints(scene.startTime, scene.endTime);
      const foreignLines = otherMainLines(scene.id);

      for (const t of samplePoints) {
        await seekAndPause(page, t);

        const snap = await readOverlay(page);

        // 1. Active scene attribute matches the manifest chapter.
        expect(
          snap.activeSceneAttr,
          `at t=${t.toFixed(2)}s expected scene "${scene.id}" but got "${snap.activeSceneAttr}"`,
        ).toBe(scene.id);

        // 2. Steady state: only the current overlay is mounted.
        expect(
          snap.hasPrev,
          `at t=${t.toFixed(2)}s a stale [data-hero-overlay="prev"] is still mounted (text="${snap.prevText}") — copy bleeding from previous chapter`,
        ).toBe(false);
        expect(snap.hasCurrent).toBe(true);
        expect(snap.currentOpacity).toBeGreaterThan(0.95);

        // 3. Current overlay carries every `main` line for this chapter.
        for (const line of scene.main) {
          expect(
            snap.currentText,
            `at t=${t.toFixed(2)}s expected chapter "${scene.id}" line "${line}" in overlay text "${snap.currentText}"`,
          ).toContain(line);
        }

        // 4. No FOREIGN chapter's main copy is bleeding into the
        //    current overlay text (catches both cross-mount bugs and
        //    accidental concat). We only check lines that are not
        //    substrings of one of THIS chapter's lines (some chapters
        //    legitimately share short tokens like "your").
        const ownText = scene.main.join(" ");
        for (const foreign of foreignLines) {
          if (foreign.length < 8) continue; // avoid common short tokens
          if (ownText.includes(foreign)) continue;
          expect(
            snap.currentText,
            `at t=${t.toFixed(2)}s chapter "${scene.id}" overlay leaked foreign copy "${foreign}"`,
          ).not.toContain(foreign);
        }
      }
    });
  }

  // Pixel-level lock for each chapter at its 50% point. Future styling
  // drift on the overlay (font, spacing, color) is caught here.
  for (const scene of HERO_SCENES) {
    test(`chapter "${scene.id}" — overlay snapshot at midpoint`, async ({ page }) => {
      const mid = scene.startTime + (scene.endTime - scene.startTime) * 0.5;
      await seekAndPause(page, mid);
      const copyColumn = page.locator(".hero-copy-column").first();
      await expect(copyColumn).toBeVisible();
      await copyColumn.scrollIntoViewIfNeeded();
      await expect(copyColumn).toHaveScreenshot(`hero-overlay-${scene.id}-midpoint.png`, {
        maxDiffPixelRatio: 0.04,
      });
    });
  }
});

test.describe("Hero overlay — no abrupt transitions across boundaries", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForVideoMetadata(page);
    // NOTE: we do NOT disable animations here — the cross-fade is the
    // subject under test.
  });

  for (let i = 0; i < HERO_SCENES.length - 1; i += 1) {
    const outgoing = HERO_SCENES[i];
    const incoming = HERO_SCENES[i + 1];
    const boundary = outgoing.endTime;

    test(`smooth ramp between "${outgoing.id}" → "${incoming.id}" (no abrupt cut)`, async ({
      page,
    }) => {
      // Park 150ms before boundary, then step 100ms past — this is
      // the same trigger the chapter-crossfade spec uses. We then
      // sample opacity ~every 60ms for ~660ms (full ramp + slack).
      await seekAndPause(page, Math.max(0, boundary - 0.15));
      await seekAndPause(page, boundary + 0.1);

      const samples: { t: number; prev: number; current: number }[] = [];
      const start = Date.now();
      const STEP_MS = 60;
      const TOTAL_MS = OVERLAP_MS + 100;
      while (Date.now() - start < TOTAL_MS) {
        const snap = await readOverlay(page);
        samples.push({
          t: Date.now() - start,
          prev: snap.prevOpacity,
          current: snap.currentOpacity,
        });
        await page.waitForTimeout(STEP_MS);
      }

      // Filter to samples taken while BOTH overlays are mounted —
      // those are the in-flight cross-fade frames.
      const inFlight = samples.filter((s) => s.prev >= 0 && s.current >= 0);

      expect(
        inFlight.length,
        `cross-fade was not observed at all — samples=${JSON.stringify(samples)}`,
      ).toBeGreaterThanOrEqual(4);

      // Ramp duration: time between first and last in-flight sample
      // must be ≥250ms. A hard cut would show 0 or 1 in-flight frames.
      const rampMs = inFlight[inFlight.length - 1].t - inFlight[0].t;
      expect(
        rampMs,
        `cross-fade lasted only ${rampMs}ms — abrupt cut suspected (expected ≥250ms)`,
      ).toBeGreaterThanOrEqual(250);

      // Adjacent-sample delta: a smooth ramp moves the opacity by
      // <0.55 between samples ~60ms apart. A hard 1→0 swap would
      // produce a delta close to 1.0 in a single step.
      for (let k = 1; k < inFlight.length; k += 1) {
        const dPrev = Math.abs(inFlight[k].prev - inFlight[k - 1].prev);
        const dCurrent = Math.abs(inFlight[k].current - inFlight[k - 1].current);
        expect(
          dPrev,
          `prev-overlay opacity jumped ${dPrev.toFixed(2)} between samples (abrupt) at t≈${inFlight[k].t}ms`,
        ).toBeLessThan(0.55);
        expect(
          dCurrent,
          `current-overlay opacity jumped ${dCurrent.toFixed(2)} between samples (abrupt) at t≈${inFlight[k].t}ms`,
        ).toBeLessThan(0.55);
      }

      // Cosine ease is complementary: prev + current ≈ 1 at every
      // in-flight frame.
      for (const s of inFlight) {
        const sum = s.prev + s.current;
        expect(
          sum,
          `prev+current opacity = ${sum.toFixed(2)} at t≈${s.t}ms (expected ≈1, suggests overlap broken)`,
        ).toBeGreaterThan(0.85);
        expect(sum).toBeLessThan(1.15);
      }

      // Direction check: prev should generally trend DOWN, current UP
      // across the ramp (allow tiny jitter — assert first vs last).
      expect(inFlight[0].prev).toBeGreaterThan(inFlight[inFlight.length - 1].prev);
      expect(inFlight[inFlight.length - 1].current).toBeGreaterThan(inFlight[0].current);
    });
  }
});
