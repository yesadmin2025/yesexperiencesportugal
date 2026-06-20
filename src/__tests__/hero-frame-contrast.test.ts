/**
 * Hero film contrast — runs scripts/hero-frame-contrast.mjs which
 * discovers every hero film MP4 (every resolution under
 * public/video/film/ plus any alternates registered in
 * public/video/hero-films.json), samples N frames from each, composites
 * the same dark scrim CinematicHero.tsx renders on top, and asserts
 * every text region (headline · subheadline · microcopy) clears WCAG
 * AA against the computed effective background on every sampled frame
 * of every video.
 *
 * The script skips gracefully when ffmpeg or the source videos are
 * unavailable (e.g. some CI shards) — we treat that as a skip, not a
 * failure, so this test never blocks on infra. When the script does
 * run, any frame below threshold fails the suite with the offending
 * video, timestamp, region and ratio.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { describe, it, expect } from "vitest";

const SCRIPT = resolve("scripts/hero-frame-contrast.mjs");
const FILM_DIR = resolve("public/video/film");

function haveFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function listFilmMp4s(): string[] {
  if (!existsSync(FILM_DIR)) return [];
  return readdirSync(FILM_DIR)
    .filter((f) => f.toLowerCase().endsWith(".mp4"))
    .map((f) => join(FILM_DIR, f))
    .filter((p) => {
      try {
        return statSync(p).size > 10_000;
      } catch {
        return false;
      }
    });
}

const videos = listFilmMp4s();
const ffmpegOk = haveFfmpeg();
const canRun = videos.length > 0 && ffmpegOk;

interface Report {
  skipped: boolean;
  reason: string | null;
  passed?: boolean;
  videos?: Array<{
    path: string;
    duration?: number;
    passed?: boolean;
    error?: string;
    frames?: Array<unknown>;
  }>;
  failures?: Array<{
    video: string;
    t?: number;
    region?: string;
    color?: string;
    ratio?: number;
    required?: number;
    error?: string;
  }>;
}

describe("Hero film — frame-sampled WCAG AA contrast (all resolutions)", () => {
  it.skipIf(!canRun)(
    "every sampled frame of every hero video clears WCAG AA",
    () => {
      let stdout: string;
      try {
        stdout = execFileSync("node", [SCRIPT, "--json"], {
          encoding: "utf8",
          timeout: 240_000,
          maxBuffer: 8 * 1024 * 1024,
        });
      } catch (err) {
        const e = err as { stdout?: Buffer | string };
        const payload = e.stdout?.toString() ?? "";
        throw new Error(`hero-frame-contrast failed:\n${payload || (err as Error).message}`);
      }

      const report = JSON.parse(stdout) as Report;
      if (report.skipped) return; // matches it.skipIf belt-and-braces

      expect(report.passed, `Failures: ${JSON.stringify(report.failures ?? [], null, 2)}`).toBe(
        true,
      );

      // We must have audited at least every MP4 we discovered locally —
      // catches a regression where the script's discovery silently misses
      // files (e.g. someone tightens the glob).
      expect(report.videos?.length ?? 0).toBeGreaterThanOrEqual(videos.length);

      // Sanity: each audited video must have produced frame samples.
      for (const v of report.videos ?? []) {
        expect(
          (v.frames?.length ?? 0) >= 4,
          `video ${v.path} produced too few frames (${v.frames?.length ?? 0})`,
        ).toBe(true);
      }
    },
    260_000,
  );

  it("script is checked in", () => {
    if (!canRun) {
      console.warn(`[hero-frame-contrast] skipped — ffmpeg=${ffmpegOk} videos=${videos.length}`);
    }
    expect(existsSync(SCRIPT)).toBe(true);
  });
});
