/**
 * Verifies that each hero phrase becomes visually active at the same
 * instant as its matching real-Portugal clip, and that the fade-in
 * duration the text uses === the fade-in duration the video uses.
 *
 * Probe: for every phraseIndex i in [0..N-1], records:
 *   - tPhrase[i] = first time the text node has data-hero-phrase-state="active"
 *   - tVideo[i]  = first time the matching <video data-hero-phrase-video=i>
 *                  has data-hero-phrase-active="true"
 *   - txFade[i] / vFade[i] = parsed transition-duration on each
 *
 * Asserts:
 *   |tPhrase[i] - tVideo[i]| <= 60ms       (synchronous activation)
 *   |txFade[i]  - vFade[i]|  <= 60ms       (same fade window)
 *
 * Runs at mobile (393×851) and desktop (1280×720).
 */
import { test, expect, devices, type Page } from "@playwright/test";

type Sample = {
  i: number;
  tPhrase: number | null;
  tVideo: number | null;
  txFadeMs: number;
  vFadeMs: number;
};

async function probe(page: Page, durationMs: number): Promise<Sample[]> {
  return page.evaluate(async (totalMs) => {
    const N = document.querySelectorAll("[data-hero-phrase-index]").length;
    const seenPhrase = new Map<number, number>();
    const seenVideo = new Map<number, number>();
    const fadeTx = new Map<number, number>();
    const fadeVid = new Map<number, number>();
    const t0 = performance.now();

    const parseMs = (s: string): number => {
      // transition-duration may be "1400ms" or "1.4s" or a list — take the first.
      const first = s.split(",")[0].trim();
      if (first.endsWith("ms")) return parseFloat(first);
      if (first.endsWith("s")) return parseFloat(first) * 1000;
      return 0;
    };

    return await new Promise<Sample[]>((resolve) => {
      const tick = () => {
        const now = performance.now() - t0;
        for (let i = 0; i < N; i++) {
          const p = document.querySelector(`[data-hero-phrase-index="${i}"]`) as HTMLElement | null;
          const v = document.querySelector(
            `video[data-hero-phrase-video="${i}"]`,
          ) as HTMLElement | null;
          if (p && !seenPhrase.has(i) && p.getAttribute("data-hero-phrase-state") === "active") {
            seenPhrase.set(i, now);
            fadeTx.set(i, parseMs(getComputedStyle(p).transitionDuration));
          }
          if (v && !seenVideo.has(i) && v.getAttribute("data-hero-phrase-active") === "true") {
            seenVideo.set(i, now);
            fadeVid.set(i, parseMs(getComputedStyle(v).transitionDuration));
          }
        }
        if (now >= totalMs) {
          const out: Sample[] = [];
          for (let i = 0; i < N; i++) {
            out.push({
              i,
              tPhrase: seenPhrase.get(i) ?? null,
              tVideo: seenVideo.get(i) ?? null,
              txFadeMs: fadeTx.get(i) ?? 0,
              vFadeMs: fadeVid.get(i) ?? 0,
            });
          }
          resolve(out);
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });
  }, durationMs);
}

const VIEWPORTS = [
  { name: "mobile 393×851", use: { viewport: { width: 393, height: 851 } } },
  { name: "desktop 1280×720", use: { viewport: { width: 1280, height: 720 } } },
] as const;
void devices; // keep import to avoid unused warning if later swapped

for (const vp of VIEWPORTS) {
  test.describe(`Hero phrase ↔ video sync — ${vp.name}`, () => {
    test.use(vp.use);
    test("each phrase activates with its matching real-Portugal clip", async ({ page }) => {
      await page.goto("/");
      // Wait for the first phrase video to mount.
      await page.locator('video[data-hero-phrase-video="0"]').waitFor({ state: "attached" });

      // Probe the full sequence — sum of beat + gaps is well under 60s.
      const samples = await probe(page, 55000);

      const rows = samples.map((s) => {
        const delta =
          s.tPhrase != null && s.tVideo != null ? Math.round(s.tVideo - s.tPhrase) : null;
        const fadeDelta = Math.abs(s.txFadeMs - s.vFadeMs);
        return { ...s, deltaMs: delta, fadeDeltaMs: fadeDelta };
      });

      // Compact CI log.

      console.log(
        `[hero-phrase-video-sync] ${vp.name}\n` +
          rows
            .map(
              (r) =>
                `  phrase ${r.i}: tPhrase=${r.tPhrase?.toFixed(0) ?? "-"}ms ` +
                `tVideo=${r.tVideo?.toFixed(0) ?? "-"}ms Δ=${r.deltaMs ?? "-"}ms ` +
                `fade(tx=${r.txFadeMs}ms vid=${r.vFadeMs}ms Δ=${r.fadeDeltaMs}ms)`,
            )
            .join("\n"),
      );

      for (const r of rows) {
        expect(r.tPhrase, `phrase ${r.i} never became active`).not.toBeNull();
        expect(r.tVideo, `video ${r.i} never became active`).not.toBeNull();
        expect(
          Math.abs(r.deltaMs as number),
          `phrase ${r.i} drift ${r.deltaMs}ms exceeds 60ms budget`,
        ).toBeLessThanOrEqual(60);
        expect(
          r.fadeDeltaMs,
          `phrase ${r.i} fade-duration mismatch text=${r.txFadeMs}ms video=${r.vFadeMs}ms`,
        ).toBeLessThanOrEqual(60);
      }
    });
  });
}
