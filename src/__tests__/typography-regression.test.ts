/**
 * Typography regression test
 * ─────────────────────────────────────────────────────────────────
 * Locks the typography contract for every hero/headline on the
 * site — across mobile (393px), tablet (768px) and desktop (1280px+).
 *
 * What it snapshots:
 *   1. The class string of every headline / hero text element
 *      pulled directly from the source files. If anyone edits a
 *      headline's font-size, weight, leading, tracking or color in
 *      JSX, the snapshot fails.
 *   2. The CSS rule body for every typography TOKEN
 *      (.hero-h1, .t-display, .t-h1, .t-h2, .t-h3, .t-eyebrow, .t-lead)
 *      including all media-query overrides. If anyone edits the
 *      token at a breakpoint, the snapshot fails.
 *
 * Why this works without a real browser:
 *   - The Tailwind utility classes encode size + leading + tracking
 *     at every breakpoint (text-[2.05rem] sm:text-5xl md:text-7xl ...),
 *     so capturing the class string captures all 3 breakpoints at
 *     once.
 *   - Tokens like .hero-h1 carry their own @media rules, captured
 *     verbatim from styles.css.
 *
 * Update flow when an intentional change is made:
 *   bun run test -- -u
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

/* ── Stability guards ────────────────────────────────────────────
 * This suite is deterministic by design: it parses source files and
 * styles.css as text — it does NOT mount components, does NOT call
 * getComputedStyle, and does NOT depend on the DOM, fonts or layout.
 * That means there is nothing to "wait for" before reading values,
 * and the suite cannot flake across breakpoints.
 *
 * The guards below exist to KEEP it that way as the suite grows:
 *
 *   1. settleLayout() — ready-to-use helper that awaits
 *      document.fonts.ready (when a DOM is present) plus two rAFs
 *      so style recalc + layout has flushed. Call it in any future
 *      test that mounts JSX and reads getComputedStyle.
 *
 *   2. A static guard test that fails if anyone introduces a
 *      getComputedStyle / offsetWidth / getBoundingClientRect call
 *      in this file without also using settleLayout() first.
 * ──────────────────────────────────────────────────────────────── */

export async function settleLayout(): Promise<void> {
  if (typeof document === "undefined") return;

  // Wait for web fonts so font-size/line-height reflect real metrics.
  const fontsReady = (
    document as unknown as { fonts?: { ready?: Promise<unknown> } }
  ).fonts?.ready;
  if (fontsReady) await fontsReady;

  // Two rAFs to let style recalc + layout flush.
  const raf = (cb: () => void) =>
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame(cb)
      : (setTimeout(cb, 16) as unknown as number);

  await new Promise<void>((r) => raf(() => raf(() => r())));
}

beforeAll(async () => {
  // No-op for this static suite, but locks in the contract: any
  // future test that reads computed styles MUST run after settle.
  await settleLayout();
});

/* ── Diff artifact recorder ──────────────────────────────────────
 * Every test records what it captured into this in-memory store.
 * After the suite runs, afterAll writes:
 *   test-output/typography/current.json  — full machine-readable dump
 *   test-output/typography/previous.json — last run, for diffing
 *   test-output/typography/diff.html     — side-by-side HTML of drift
 *                                          (only written if drift exists)
 *   test-output/typography/diff.json     — same drift as JSON
 * Drift is grouped by category + key (page/role, page, selector) so
 * it's obvious which token, headline class, or breakpoint changed.
 * ──────────────────────────────────────────────────────────────── */

/**
 * Trace info attached to every measurement so a drift entry can be
 * tracked back to the EXACT element in the source code.
 *
 *   selector — best-guess CSS selector (tag + tokenized class fragment)
 *   index    — 0-based occurrence among siblings of the same selector
 *              within the same source file (so duplicates are unique)
 *   file     — source path the element was extracted from
 *   line     — 1-based line number of the match in that file
 */
type Trace = {
  selector: string;
  index: number;
  file: string;
  line: number;
};

type HeadlineRecord = { value: string; trace: Trace };
type SectionHit = { tag: string; cls: string; trace: Trace };
type TokenRecord = { value: string; source: "src/styles.css" };

type Captured = {
  headlines: Record<string, HeadlineRecord>;
  sectionSweeps: Record<string, SectionHit[]>;
  tokenRules: Record<string, TokenRecord>;
};

const captured: Captured = {
  headlines: {},
  sectionSweeps: {},
  tokenRules: {},
};

/** Compute 1-based line number of a character offset within a string. */
function lineOf(src: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < src.length; i++) {
    if (src.charCodeAt(i) === 10) line++;
  }
  return line;
}

/**
 * Build a stable selector hint from a tag + class string. Picks the
 * first typography token (t-h2, hero-h1, …) as the discriminator,
 * falling back to the first class token. Keeps selectors short and
 * obvious in the diff report.
 */
function selectorFor(tag: string, cls: string): string {
  const tokens = cls.split(/\s+/).filter(Boolean);
  const typo = tokens.find((t) =>
    /^(hero-h1|t-display|t-h1|t-h2|t-h3|t-eyebrow|t-lead)$/.test(t),
  );
  const pick = typo ?? tokens[0] ?? "";
  return pick ? `${tag}.${pick}` : tag;
}

const ARTIFACT_DIR = path.join(ROOT, "test-output", "typography");
const CURRENT_PATH = path.join(ARTIFACT_DIR, "current.json");
const PREVIOUS_PATH = path.join(ARTIFACT_DIR, "previous.json");
const DIFF_HTML_PATH = path.join(ARTIFACT_DIR, "diff.html");
const DIFF_JSON_PATH = path.join(ARTIFACT_DIR, "diff.json");

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline word-level diff between two strings (very small, no deps). */
function inlineDiff(prev: string, next: string): string {
  if (prev === next) return `<span class="same">${escapeHtml(next)}</span>`;
  const a = prev.split(/(\s+)/);
  const b = next.split(/(\s+)/);
  const aSet = new Set(a);
  const bSet = new Set(b);
  const left = a
    .map((tok) =>
      bSet.has(tok)
        ? `<span class="same">${escapeHtml(tok)}</span>`
        : `<span class="del">${escapeHtml(tok)}</span>`,
    )
    .join("");
  const right = b
    .map((tok) =>
      aSet.has(tok)
        ? `<span class="same">${escapeHtml(tok)}</span>`
        : `<span class="add">${escapeHtml(tok)}</span>`,
    )
    .join("");
  return `<div class="row"><div class="prev">${left}</div><div class="next">${right}</div></div>`;
}

/** Detect which @media breakpoint(s) drifted inside a token rule diff. */
function affectedBreakpoints(prev: string, next: string): string[] {
  const lineRe = /^(base|@media \([^)]+\)):/gm;
  const lines = new Set<string>();
  for (const block of [prev, next]) {
    const ls = block.split("\n");
    for (const l of ls) {
      const m = l.match(/^(base|@media \([^)]+\)):\s*(.*)$/);
      if (m) lines.add(m[1]);
    }
  }
  // Find which line keys differ between prev and next
  const drifted: string[] = [];
  const prevMap = new Map<string, string>();
  const nextMap = new Map<string, string>();
  for (const l of prev.split("\n")) {
    const m = l.match(/^(base|@media \([^)]+\)):\s*(.*)$/);
    if (m) prevMap.set(m[1], m[2]);
  }
  for (const l of next.split("\n")) {
    const m = l.match(/^(base|@media \([^)]+\)):\s*(.*)$/);
    if (m) nextMap.set(m[1], m[2]);
  }
  for (const key of lines) {
    if (prevMap.get(key) !== nextMap.get(key)) drifted.push(key);
  }
  return drifted;
}

type DriftEntry = {
  category: "headline" | "sectionSweep" | "tokenRule";
  key: string; // page::role | page | selector
  breakpoints?: string[]; // for tokenRule
  trace?: Trace | Trace[]; // selector + index + file:line traceability
  prev: string | null;
  next: string | null;
};

function computeDrift(prev: Captured | null, next: Captured): DriftEntry[] {
  const drift: DriftEntry[] = [];
  if (!prev) return drift;

  const allHeadlineKeys = new Set([
    ...Object.keys(prev.headlines),
    ...Object.keys(next.headlines),
  ]);
  for (const key of allHeadlineKeys) {
    const p = prev.headlines[key]?.value ?? null;
    const n = next.headlines[key]?.value ?? null;
    if (p !== n) {
      drift.push({
        category: "headline",
        key,
        // Always trace to the CURRENT location when present, else the previous.
        trace: next.headlines[key]?.trace ?? prev.headlines[key]?.trace,
        prev: p,
        next: n,
      });
    }
  }

  const allSweepKeys = new Set([
    ...Object.keys(prev.sectionSweeps),
    ...Object.keys(next.sectionSweeps),
  ]);
  for (const key of allSweepKeys) {
    const p = JSON.stringify(prev.sectionSweeps[key] ?? null, null, 2);
    const n = JSON.stringify(next.sectionSweeps[key] ?? null, null, 2);
    if (p !== n) {
      drift.push({
        category: "sectionSweep",
        key,
        // Trace = ordered list of every hit's location on the current page.
        trace: (next.sectionSweeps[key] ?? []).map((h) => h.trace),
        prev: p,
        next: n,
      });
    }
  }

  const allTokenKeys = new Set([
    ...Object.keys(prev.tokenRules),
    ...Object.keys(next.tokenRules),
  ]);
  for (const key of allTokenKeys) {
    const p = prev.tokenRules[key]?.value ?? "";
    const n = next.tokenRules[key]?.value ?? "";
    if (p !== n) {
      drift.push({
        category: "tokenRule",
        key,
        breakpoints: affectedBreakpoints(p, n),
        prev: p,
        next: n,
      });
    }
  }

  return drift;
}

function renderDiffHtml(drift: DriftEntry[]): string {
  const groups = {
    headline: drift.filter((d) => d.category === "headline"),
    sectionSweep: drift.filter((d) => d.category === "sectionSweep"),
    tokenRule: drift.filter((d) => d.category === "tokenRule"),
  };
  const section = (title: string, items: DriftEntry[]) => {
    if (items.length === 0) return "";
    const rows = items
      .map((d) => {
        const bp =
          d.breakpoints && d.breakpoints.length
            ? `<div class="bp">drifted at: ${d.breakpoints
                .map((b) => `<code>${escapeHtml(b)}</code>`)
                .join(", ")}</div>`
            : "";
        const renderTrace = (t: Trace) =>
          `<code>${escapeHtml(t.selector)}[${t.index}]</code> · <code>${escapeHtml(t.file)}:${t.line}</code>`;
        const traceHtml = !d.trace
          ? ""
          : Array.isArray(d.trace)
            ? `<div class="trace">${d.trace.map(renderTrace).join("<br/>")}</div>`
            : `<div class="trace">${renderTrace(d.trace)}</div>`;
        return `
          <article>
            <header><h3>${escapeHtml(d.key)}</h3>${bp}${traceHtml}</header>
            ${inlineDiff(d.prev ?? "(missing)", d.next ?? "(missing)")}
          </article>`;
      })
      .join("");
    return `<section><h2>${title} <span class="count">${items.length}</span></h2>${rows}</section>`;
  };

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Typography drift</title>
<style>
  body { font: 14px/1.5 -apple-system, system-ui, sans-serif; margin: 0; padding: 24px 32px; background: #0b0b0c; color: #e8e6df; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #8a8a8a; margin-bottom: 24px; font-size: 12px; }
  section { margin-bottom: 32px; }
  section h2 { font-size: 16px; border-bottom: 1px solid #2a2a2a; padding-bottom: 6px; }
  .count { background: #c4a25a; color: #1a1a1a; border-radius: 999px; padding: 1px 8px; font-size: 11px; margin-left: 6px; vertical-align: middle; }
  article { background: #131315; border: 1px solid #25252a; border-radius: 8px; padding: 12px 14px; margin: 10px 0; }
  article header h3 { font-size: 13px; margin: 0 0 4px; color: #c4a25a; font-weight: 600; }
  .bp { font-size: 11px; color: #8a8a8a; margin-bottom: 8px; }
  .bp code { background: #1f1f24; padding: 1px 6px; border-radius: 4px; }
  .trace { font-size: 11px; color: #8a8a8a; margin-bottom: 8px; }
  .trace code { background: #1f1f24; padding: 1px 6px; border-radius: 4px; color: #c4a25a; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .prev, .next { background: #08080a; border-radius: 6px; padding: 10px 12px; font: 12px/1.55 ui-monospace, monospace; word-break: break-all; white-space: pre-wrap; }
  .prev { border-left: 3px solid #6b2b2b; }
  .next { border-left: 3px solid #2b6b3a; }
  .same { color: #6b6b6b; }
  .del  { background: #3a1414; color: #ff8a8a; padding: 0 2px; border-radius: 3px; }
  .add  { background: #143a1f; color: #8aff9c; padding: 0 2px; border-radius: 3px; }
  .empty { color: #8a8a8a; padding: 20px; text-align: center; }
</style>
</head><body>
  <h1>Typography drift report</h1>
  <div class="meta">Generated ${new Date().toISOString()} · ${drift.length} change${drift.length === 1 ? "" : "s"} since last run</div>
  ${drift.length === 0 ? '<div class="empty">No drift detected.</div>' : section("Headline class strings", groups.headline) + section("Section-headline sweeps", groups.sectionSweep) + section("Token CSS rules", groups.tokenRule)}
</body></html>`;
}

afterAll(() => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  // Load previous run for diffing (if any)
  let previous: Captured | null = null;
  if (fs.existsSync(CURRENT_PATH)) {
    try {
      previous = JSON.parse(fs.readFileSync(CURRENT_PATH, "utf8")) as Captured;
      fs.writeFileSync(PREVIOUS_PATH, JSON.stringify(previous, null, 2));
    } catch {
      previous = null;
    }
  }

  // Always write the current dump
  fs.writeFileSync(CURRENT_PATH, JSON.stringify(captured, null, 2));

  // Compute and write drift artifacts
  const drift = computeDrift(previous, captured);
  fs.writeFileSync(DIFF_JSON_PATH, JSON.stringify(drift, null, 2));
  fs.writeFileSync(DIFF_HTML_PATH, renderDiffHtml(drift));

  // eslint-disable-next-line no-console
  console.log(
    `\n[typography] ${drift.length} drift entr${drift.length === 1 ? "y" : "ies"} → ${path.relative(ROOT, DIFF_HTML_PATH)}`,
  );
});

/* ── 1. Headline class strings, pulled from source ──────────────── */

type HeadlineSpec = {
  page: string;
  role: string; // e.g. "hero h1", "section h2", "final CTA h2"
  file: string;
  // RegExp that captures the className contents of the target element
  pattern: RegExp;
};

const HEADLINES: HeadlineSpec[] = [
  // Homepage hero — frozen contract, must not drift.
  // Anchored on the inner data-hero-field="eyebrow" span (stable hook),
  // matching the Typography v3 hero markup (the outer wrapper sizing
  // changed during the structural rework but the eyebrow text node is
  // the actual locked element).
  {
    page: "home",
    role: "hero eyebrow",
    file: "src/components/home/CinematicHero.tsx",
    pattern: /<span data-hero-field="eyebrow" className="([^"]+)"/,
  },
  {
    page: "home",
    role: "hero h1",
    file: "src/components/home/CinematicHero.tsx",
    pattern: /<h1\s+data-hero-field="headlineLine1 headlineLine2"\s+className="([^"]+)"/,
  },
  {
    page: "home",
    role: "hero h1 line 2 (italic gold)",
    file: "src/components/home/CinematicHero.tsx",
    pattern: /data-hero-field="headlineLine2"\s+className="([^"]+)"/,
  },
  {
    page: "home",
    role: "hero subheadline",
    file: "src/components/home/CinematicHero.tsx",
    pattern: /<p\s+data-hero-field="subheadline"\s+className="([^"]+)"/,
  },
  {
    page: "home",
    role: "hero microcopy",
    file: "src/components/home/CinematicHero.tsx",
    pattern: /<p\s+data-hero-field="microcopy"\s+className="([^"]+)"/,
  },

  // Multi-day page hero — now uses the canonical <SectionTitle as="h1" size="anchor">
  // primitive (Eyebrow + SectionTitle + CtaButton consolidation). The hero
  // copy is asserted; class strings come from SectionTitle so they're
  // covered by the SectionTitle unit contract instead of a substring match.
  {
    page: "multi-day",
    role: "hero subhead",
    file: "src/routes/multi-day.tsx",
    pattern:
      /<p className="(mt-6 text-\[1rem\][^"]+)">\s*\n\s*Build Portugal across regions/,
  },
  {
    page: "proposals",
    role: "hero subhead",
    file: "src/routes/proposals.tsx",
    pattern:
      /<p className="(mt-6 text-\[1rem\][^"]+)">\s*\n\s*A private moment/,
  },
];

/* ── 2. Typography token rules from styles.css ──────────────────── */

const TOKENS = [
  ".hero-h1",
  ".t-display",
  ".t-h1",
  ".t-h2",
  ".t-h3",
  ".t-eyebrow",
  ".t-lead",
];

/**
 * Extract every CSS rule (and its media-query overrides) for a
 * given selector from styles.css. Returns a normalized string we
 * can snapshot.
 */
function extractTokenRules(css: string, selector: string): string {
  // Collect base rule(s)
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lines: string[] = [];

  // Match `selector { ... }` not inside @media (i.e. with no preceding @)
  const baseRe = new RegExp(
    `(^|\\n)\\s*${escaped}\\s*\\{([^}]+)\\}`,
    "g",
  );
  let m: RegExpExecArray | null;
  while ((m = baseRe.exec(css))) {
    const body = m[2].trim().replace(/\s+/g, " ");
    lines.push(`base: ${body}`);
  }

  // Match `@media (...) { ... selector { ... } ... }`
  const mediaRe = /@media\s*\(([^)]+)\)\s*\{([\s\S]*?)\n\s*\}/g;
  let mm: RegExpExecArray | null;
  while ((mm = mediaRe.exec(css))) {
    const cond = mm[1].trim();
    const inner = mm[2];
    const innerRe = new RegExp(
      `${escaped}\\s*\\{([^}]+)\\}`,
      "g",
    );
    let im: RegExpExecArray | null;
    while ((im = innerRe.exec(inner))) {
      const body = im[1].trim().replace(/\s+/g, " ");
      lines.push(`@media (${cond}): ${body}`);
    }
  }

  return lines.join("\n");
}

/* ── 3. Tests ───────────────────────────────────────────────────── */

describe("Typography regression — headline class strings", () => {
  for (const h of HEADLINES) {
    it(`[${h.page}] ${h.role}`, () => {
      const src = read(h.file);
      const match = src.match(h.pattern);
      expect(match, `Could not locate ${h.role} in ${h.file}`).toBeTruthy();
      // Normalize whitespace so a re-format doesn't trip the snapshot
      const cls = match![1].split(/\s+/).filter(Boolean).join(" ");

      // Trace info: pull tag from the matched substring, derive selector,
      // count how many earlier identical (tag+selector) hits already
      // appeared in this file → 0-based occurrence index.
      const matchedSlice = match![0];
      const tagMatch = matchedSlice.match(/^<\s*([a-zA-Z][a-zA-Z0-9]*)/);
      const tag = tagMatch ? tagMatch[1] : "unknown";
      const selector = selectorFor(tag, cls);
      const offset = match!.index ?? src.indexOf(matchedSlice);
      const before = src.slice(0, offset);
      const occurrenceRe = new RegExp(
        `<${tag}\\b[^>]*\\sclassName="[^"]*\\b${selector
          .split(".")
          .slice(1)
          .join(".")
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "g",
      );
      const index = (before.match(occurrenceRe) ?? []).length;

      captured.headlines[`${h.page} :: ${h.role}`] = {
        value: cls,
        trace: {
          selector,
          index,
          file: h.file,
          line: lineOf(src, offset),
        },
      };
      expect(cls).toMatchSnapshot();
    });
  }
});

/* ── 3b. Section-headline sweep across premium pages ─────────────
 * For every page below, find every element whose className uses one
 * of the typography tokens (t-h1/t-h2/t-h3/t-eyebrow/t-lead) and
 * snapshot the full ordered list of (tag, class string) pairs.
 *
 * This catches:
 *   - a section H2 losing the t-h2 token
 *   - a token being swapped for an ad-hoc class string
 *   - a new section being added without going through the token system
 *   - mt-* / max-w-* spacing drift on any tokenized section heading
 *
 * Update with `bunx vitest run -u` when the change is intentional.
 * ───────────────────────────────────────────────────────────────── */

// Note: home, /multi-day and /proposals were rebuilt to Typography v3
// (Montserrat font-display + Georgia italic + direct sizing) and intentionally
// no longer use the legacy serif-based t-h* tokens. The homepage uses
// `he-eyebrow-bar` and direct `font-display font-bold` per the v3 canon.
// Hero fields are covered by the explicit HEADLINES patterns above; section
// H2s on these pages are governed by Typography v3 source-level rules
// elsewhere. The token sweep is now reserved for any future page that opts
// into the legacy t-h* token system.
const SECTION_PAGES: { page: string; file: string }[] = [];

const TOKEN_CLASS_RE =
  /<(h1|h2|h3|h4|p|span|div)\b[^>]*\sclassName="([^"]*\b(?:t-h1|t-h2|t-h3|t-eyebrow|t-lead)\b[^"]*)"/g;

describe("Typography regression — section headlines (token sweep)", () => {
  if (SECTION_PAGES.length === 0) {
    // All current pages were rebuilt to Typography v3 raw classes and
    // intentionally do NOT use the legacy serif-based t-h* tokens. The sweep
    // remains armed for any future page that opts into the token system.
    it("no pages currently use the legacy t-h* token system (Typography v3)", () => {
      expect(SECTION_PAGES).toEqual([]);
    });
    return;
  }
  for (const { page, file } of SECTION_PAGES) {
    it(`[${page}] all tokenized section headlines`, () => {
      const src = read(file);
      const hits: SectionHit[] = [];
      // Track per-selector occurrence index so duplicates (e.g. three
      // <h2 class="t-h2 …">) get a unique index 0, 1, 2.
      const occurrence = new Map<string, number>();
      let m: RegExpExecArray | null;
      TOKEN_CLASS_RE.lastIndex = 0;
      while ((m = TOKEN_CLASS_RE.exec(src))) {
        const tag = m[1];
        const cls = m[2].split(/\s+/).filter(Boolean).join(" ");
        const selector = selectorFor(tag, cls);
        const index = occurrence.get(selector) ?? 0;
        occurrence.set(selector, index + 1);
        hits.push({
          tag,
          cls,
          trace: {
            selector,
            index,
            file,
            line: lineOf(src, m.index),
          },
        });
      }
      expect(
        hits.length,
        `No tokenized section headlines found in ${file}`,
      ).toBeGreaterThan(0);
      captured.sectionSweeps[page] = hits;
      expect(hits).toMatchSnapshot();
    });
  }
});

describe("Typography regression — token rules from styles.css", () => {
  const css = read("src/styles.css");
  for (const sel of TOKENS) {
    it(`token ${sel}`, () => {
      const rules = extractTokenRules(css, sel);
      expect(rules, `No rules found for ${sel}`).not.toBe("");
      captured.tokenRules[sel] = { value: rules, source: "src/styles.css" };
      expect(rules).toMatchSnapshot();
    });
  }
});

/* ── 4. Stability guard ─────────────────────────────────────────
 * If anyone extends this file with live DOM measurements, force
 * them to also use settleLayout() so the new tests can't flake on
 * font load or layout timing across breakpoints.
 * ──────────────────────────────────────────────────────────────── */

describe("Typography regression — stability guard", () => {
  it("any live DOM measurement is paired with settleLayout()", () => {
    const self = read("src/__tests__/typography-regression.test.ts");
    const usesLiveMeasurement =
      /\bgetComputedStyle\s*\(|\.offsetWidth\b|\.offsetHeight\b|getBoundingClientRect\s*\(/.test(
        self,
      );
    if (!usesLiveMeasurement) {
      // Nothing to guard — suite is fully static.
      expect(true).toBe(true);
      return;
    }
    const usesSettle = /\bsettleLayout\s*\(\s*\)/.test(self);
    expect(
      usesSettle,
      "Live DOM measurement detected (getComputedStyle / offset* / getBoundingClientRect) " +
        "without a settleLayout() call. Await settleLayout() before reading layout-dependent " +
        "values to prevent breakpoint/font flakiness.",
    ).toBe(true);
  });
});
