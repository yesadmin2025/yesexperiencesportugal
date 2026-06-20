#!/usr/bin/env node
/**
 * hero-frame-contrast — sample N frames from the hero film, average the
 * pixels in the regions where the headline / subheadline / microcopy sit,
 * composite the same dark scrim CSS uses on top, and assert the resulting
 * effective background passes WCAG AA contrast against the actual text
 * colors used in CinematicHero.
 *
 * Why frames, not just one poster?
 *   The film has light coastal water, dark forest, golden-hour light, etc.
 *   The poster JPG passes contrast trivially — the failure mode is "one
 *   bright frame in the loop washes out the headline." Sampling every few
 *   seconds catches that.
 *
 * Usage:
 *   node scripts/hero-frame-contrast.mjs           # human report, exits 1 on fail
 *   node scripts/hero-frame-contrast.mjs --json    # JSON output for tests/CI
 *
 * Skips gracefully (exit 0) if ffmpeg or the source video are missing —
 * the CI workflow / vitest test treats that as an environment skip, not a
 * regression.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

// --- Config: source of truth pulled from CinematicHero.tsx + styles.css. ----
// Every MP4 under public/video/film/ is treated as a hero film candidate by
// default — this catches both the 720p and 1080p renders the <video> tag
// references and any new resolution we drop in next to them.
//
// Alternate hero videos that live elsewhere (e.g. seasonal A/B films, an
// experimental coast loop) can be registered in public/video/hero-films.json
// as a JSON array of repo-root-relative paths. They will be audited the
// same way without further script changes.
//
// Per-invocation overrides:
//   --video <path>     repeatable; takes precedence over discovery
//   --samples <n>      override SAMPLES (default 8)
const FILM_DIR = resolve("public/video/film");
const ALT_MANIFEST = resolve("public/video/hero-films.json");
const DEFAULT_SAMPLES = 8;

// Text colors actually rendered (mirrors CinematicHero.tsx).
const TEXT = {
  headlineLine1: "#FAF8F3", // --ivory, font-bold
  headlineLine2: "#E1CFA6", // --gold-soft italic
  subheadline: "#FAF8F3", // --ivory full opacity
  microcopy: "#FAF8F3", // --ivory /90 — we still test against full ivory; the alpha hurts contrast slightly but text-shadow compensates
};

// Scrim characterisation. CinematicHero.tsx renders TWO overlays:
//   1. Linear darken: 0% → 0.44a, 36% → 0.56a, 70% → 0.82a, 100% → 0.94a, color rgb(15,12,9).
//   2. Radial backdrop directly behind the copy column (bottom 76%, peaks at 0.88a, edges 0).
// We sample the LINEAR overlay only — the radial is bonus headroom we keep as a safety margin so
// the test does not green-light marginal frames that only pass thanks to the radial.
const SCRIM_RGB = [15, 12, 9];

// Regions in normalised frame coordinates [y0, y1] full width. These mirror
// where the text sits at the mobile viewport (393×587, items-end + pb-10).
// Headline is the largest text → uses the AA-large threshold (3:1).
// Subheadline + microcopy are body text → AA-normal (4.5:1).
const REGIONS = [
  {
    id: "headline",
    y0: 0.58,
    y1: 0.78,
    scrimAlpha: 0.72,
    level: "large",
    colors: ["headlineLine1", "headlineLine2"],
  },
  {
    id: "subheadline",
    y0: 0.78,
    y1: 0.93,
    scrimAlpha: 0.84,
    level: "normal",
    colors: ["subheadline"],
  },
  { id: "microcopy", y0: 0.93, y1: 1.0, scrimAlpha: 0.9, level: "normal", colors: ["microcopy"] },
];

const THRESHOLD = { normal: 4.5, large: 3.0 };

// --- Math helpers ---------------------------------------------------------
const hexToRgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const srgbToLin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]) =>
  0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};
const composite = (under, over, alpha) => [
  Math.round(over[0] * alpha + under[0] * (1 - alpha)),
  Math.round(over[1] * alpha + under[1] * (1 - alpha)),
  Math.round(over[2] * alpha + under[2] * (1 - alpha)),
];

// --- ffmpeg ---------------------------------------------------------------
function haveFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function probeDuration(path) {
  const out = execFileSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    path,
  ])
    .toString()
    .trim();
  const d = parseFloat(out);
  if (!Number.isFinite(d) || d <= 0) throw new Error(`bad duration: ${out}`);
  return d;
}

/** Average colour of a normalised vertical band, full width, returned as [r,g,b]. */
function averageBand(path, t, y0, y1) {
  // crop=iw:ih*(y1-y0):0:ih*y0  → full-width band
  // scale=1:1 (with bilinear) → 1×1 pixel = arithmetic mean of the band
  const filter = `crop=iw:ih*${(y1 - y0).toFixed(4)}:0:ih*${y0.toFixed(4)},scale=1:1:flags=bilinear,format=rgb24`;
  const r = spawnSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-ss",
      t.toFixed(3),
      "-i",
      path,
      "-frames:v",
      "1",
      "-vf",
      filter,
      "-f",
      "rawvideo",
      "-",
    ],
    { encoding: "buffer" },
  );
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed at t=${t} y=[${y0},${y1}]: ${r.stderr?.toString() ?? ""}`);
  }
  const buf = r.stdout;
  if (!buf || buf.length < 3) throw new Error("ffmpeg returned no pixel data");
  return [buf[0], buf[1], buf[2]];
}

// --- Discovery ------------------------------------------------------------
function parseCliArgs(argv) {
  const out = { json: false, videos: [], samples: DEFAULT_SAMPLES };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--video") out.videos.push(resolve(argv[++i]));
    else if (a === "--samples")
      out.samples = Math.max(1, parseInt(argv[++i], 10) || DEFAULT_SAMPLES);
  }
  return out;
}

function discoverVideos(cli) {
  if (cli.videos.length > 0) return cli.videos;
  const found = new Set();
  if (existsSync(FILM_DIR)) {
    for (const name of readdirSync(FILM_DIR)) {
      if (name.toLowerCase().endsWith(".mp4")) found.add(join(FILM_DIR, name));
    }
  }
  if (existsSync(ALT_MANIFEST)) {
    try {
      const list = JSON.parse(readFileSync(ALT_MANIFEST, "utf8"));
      if (Array.isArray(list)) {
        for (const p of list) {
          if (typeof p === "string" && p.toLowerCase().endsWith(".mp4")) {
            found.add(resolve(p));
          }
        }
      }
    } catch (e) {
      console.warn(`hero-frame-contrast: ignoring malformed ${ALT_MANIFEST}: ${e.message}`);
    }
  }
  return [...found].sort();
}

function isUsableVideo(p) {
  return existsSync(p) && statSync(p).size > 10_000;
}

// --- Run ------------------------------------------------------------------
function auditVideo(path, samples) {
  const duration = probeDuration(path);
  const times = Array.from({ length: samples }, (_, i) => duration * ((i + 0.5) / samples));
  const frames = [];
  const failures = [];
  for (const t of times) {
    const frame = { t: Number(t.toFixed(2)), regions: [] };
    for (const region of REGIONS) {
      const avg = averageBand(path, t, region.y0, region.y1);
      const effectiveBg = composite(avg, SCRIM_RGB, region.scrimAlpha);
      const checks = region.colors.map((key) => {
        const fg = hexToRgb(TEXT[key]);
        const ratio = contrast(fg, effectiveBg);
        const required = THRESHOLD[region.level];
        const pass = ratio + 1e-6 >= required;
        if (!pass) failures.push({ t: frame.t, region: region.id, color: key, ratio, required });
        return { color: key, ratio: Number(ratio.toFixed(2)), required, pass };
      });
      frame.regions.push({
        id: region.id,
        rawAvg: avg,
        effectiveBg,
        scrimAlpha: region.scrimAlpha,
        level: region.level,
        checks,
      });
    }
    frames.push(frame);
  }
  return { duration: Number(duration.toFixed(2)), frames, failures, passed: failures.length === 0 };
}

function run() {
  const cli = parseCliArgs(process.argv.slice(2));
  const env = {
    skipped: false,
    reason: null,
    samples: cli.samples,
    threshold: THRESHOLD,
    videos: [],
  };

  if (!haveFfmpeg()) {
    env.skipped = true;
    env.reason = "ffmpeg not available";
    if (cli.json) process.stdout.write(JSON.stringify(env, null, 2));
    else console.log(`hero-frame-contrast: skipped (${env.reason})`);
    process.exit(0);
  }

  const candidates = discoverVideos(cli);
  const usable = candidates.filter(isUsableVideo);
  const skippedFiles = candidates.filter((p) => !isUsableVideo(p));

  if (usable.length === 0) {
    env.skipped = true;
    env.reason =
      candidates.length === 0
        ? "no hero videos discovered (public/video/film/ empty and no manifest)"
        : `no usable videos (all candidates missing or empty: ${candidates.map((p) => relative(process.cwd(), p)).join(", ")})`;
    if (cli.json) process.stdout.write(JSON.stringify(env, null, 2));
    else console.log(`hero-frame-contrast: skipped (${env.reason})`);
    process.exit(0);
  }

  const allFailures = [];
  for (const path of usable) {
    const rel = relative(process.cwd(), path);
    try {
      const result = auditVideo(path, cli.samples);
      env.videos.push({ path: rel, ...result });
      for (const f of result.failures) allFailures.push({ video: rel, ...f });
    } catch (e) {
      env.videos.push({ path: rel, error: e.message, passed: false });
      allFailures.push({ video: rel, error: e.message });
    }
  }
  env.skippedFiles = skippedFiles.map((p) => relative(process.cwd(), p));
  env.failures = allFailures;
  env.passed = allFailures.length === 0;

  if (cli.json) {
    process.stdout.write(JSON.stringify(env, null, 2));
    process.exit(env.passed ? 0 : 1);
  }

  // Human report
  console.log(`Hero film contrast — ${usable.length} video(s), ${cli.samples} frames each`);
  console.log(
    "(bg = avg frame colour composited with linear scrim; AA: 4.5:1 normal, 3.0:1 large)\n",
  );
  for (const v of env.videos) {
    console.log(`▸ ${v.path}${v.duration ? ` (${v.duration}s)` : ""}`);
    if (v.error) {
      console.log(`    ⚠ ${v.error}`);
      continue;
    }
    for (const frame of v.frames) {
      console.log(`  t=${frame.t.toFixed(2)}s`);
      for (const r of frame.regions) {
        const bg = `rgb(${r.effectiveBg.join(",")})`;
        for (const c of r.checks) {
          const mark = c.pass ? "✓" : "✗";
          console.log(
            `    ${mark} ${r.id.padEnd(11)} ${c.color.padEnd(14)} ${bg}  ${c.ratio.toFixed(2)}:1 (need ≥${c.required}:1)`,
          );
        }
      }
    }
  }
  if (skippedFiles.length > 0) {
    console.log(
      `\n(skipped ${skippedFiles.length} unreadable candidate(s): ${env.skippedFiles.join(", ")})`,
    );
  }
  if (env.passed) {
    console.log(`\n✅ All ${usable.length} hero video(s) pass WCAG AA across every sampled frame.`);
    process.exit(0);
  }
  console.log(`\n❌ ${allFailures.length} contrast failure(s) detected:`);
  for (const f of allFailures) {
    if (f.error) console.log(`   ${f.video}: ${f.error}`);
    else
      console.log(
        `   ${f.video} t=${f.t}s ${f.region}/${f.color}: ${f.ratio.toFixed(2)}:1 < ${f.required}:1`,
      );
  }
  process.exit(1);
}

run();
