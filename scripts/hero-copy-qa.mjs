#!/usr/bin/env node
/**
 * Home hero copy localization QA checklist.
 *
 * Verifies that the canonical hero strings (eyebrow, both headline lines,
 * subheadline, both CTAs, and microcopy) match EXACTLY in the served HTML
 * of both the preview and production deployments.
 *
 * Source of truth: src/content/hero-copy.ts (HERO_COPY).
 *
 * Usage:
 *   node scripts/hero-copy-qa.mjs
 *
 * Optional env overrides:
 *   PREVIEW_URL=https://...    (defaults to id-preview--<id>.lovable.app)
 *   PRODUCTION_URL=https://... (defaults to dreamscape-builder-co.lovable.app)
 *
 * Exit codes:
 *   0 — every required string found in every target
 *   1 — at least one mismatch (release should be blocked)
 */

import { HERO_COPY } from "../src/content/hero-copy.ts";
import { parse as parseHtml } from "node-html-parser";

const ALL_TARGETS = [
  {
    name: "Preview",
    url:
      process.env.PREVIEW_URL ||
      "https://id-preview--5351efc5-c55a-4e41-b282-a4a019690d38.lovable.app/",
  },
  {
    name: "Production",
    url: process.env.PRODUCTION_URL || "https://dreamscape-builder-co.lovable.app/",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Exit code contract — stable for CI consumers.
//
//   0   OK              All checks passed (one-shot) or watch exited cleanly
//                       after meeting --max-runs / receiving SIGINT with no
//                       drift in the most recent run.
//   1   DRIFT           Substring or preflight checks failed against a target
//                       (one-shot), or watch exited with drift present in the
//                       most recent run (--fail-fast or --max-runs).
//   2   FLAG_MISCONFIG  Bad CLI flag value, unknown flag under --strict-flags,
//                       or empty target filter. The run never started.
//   3   RUNTIME_ERROR   Uncaught exception inside the script (bug, fs watcher
//                       crash, unhandled rejection, etc).
//   4   FETCH_ERROR     Network/HTTP failure prevented verifying a target
//                       (one-shot only — watch keeps polling and surfaces
//                       this as a transient error in the UI).
//
// Watch mode normally runs forever (exit code only delivered on Ctrl-C or
// when --max-runs is hit). Use --fail-fast and/or --max-runs=N to make watch
// suitable for a CI step that should terminate.
// ─────────────────────────────────────────────────────────────────────────────
const EXIT = Object.freeze({
  OK: 0,
  DRIFT: 1,
  FLAG_MISCONFIG: 2,
  RUNTIME_ERROR: 3,
  FETCH_ERROR: 4,
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI argument parsing.
//
// Supported flags (all optional):
//
//   --watch                              enable watch mode
//   --target=<preview|production|all>    filter which deployments to check
//                                        (shorthand: --preview-only, --production-only)
//   --debounce=<ms>                      watch-mode debounce (default 200ms,
//                                        clamped to [0, 10000])
//   --fail-fast                          watch: exit EXIT.DRIFT on first
//                                        failing run
//   --max-runs=<n>                       watch: exit after N runs (>=1).
//                                        Exit code reflects the LAST run.
//   --strict-flags                       treat unknown flags / bad values as
//                                        EXIT.FLAG_MISCONFIG instead of warning
//   --report-json[=<path|->]             emit a structured JSON report for CI.
//                                        "-" or no value = stdout (human log
//                                        is redirected to stderr so stdout is
//                                        machine-parseable). Otherwise treated
//                                        as a file path written on each run.
//   --report-json-strict                 validate every emitted report against
//                                        the declared schema; if anything ever
//                                        diverges from the contract the script
//                                        exits EXIT.RUNTIME_ERROR (it's a
//                                        script bug, not content drift).
//   --report-json-schema                 print the strict-validator schema
//                                        (version + shape) as JSON to stdout
//                                        and exit 0. No fetches performed.
//                                        Lets tests/CI assert the schema name
//                                        matches "hero-copy-qa@N".
//
// Without --strict-flags, unknown flags are warnings (back-compat); with it,
// CI can guarantee no silent typos.
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = {
    watch: false,
    target: "all",
    debounceMs: 200,
    failFast: false,
    maxRuns: Infinity,
    strictFlags: false,
    reportJson: null, // null = off; "-" = stdout; else file path
    reportJsonStrict: false,
    reportJsonSchema: false,
  };
  const errors = [];
  const strict = argv.includes("--strict-flags");
  const warn = (msg) => {
    if (strict) errors.push(msg);
    else console.log(`\x1b[33m⚠ ${msg}\x1b[0m`);
  };
  for (const raw of argv) {
    if (raw === "--watch") opts.watch = true;
    else if (raw === "--strict-flags") opts.strictFlags = true;
    else if (raw === "--fail-fast") opts.failFast = true;
    else if (raw === "--report-json-strict") opts.reportJsonStrict = true;
    else if (raw === "--report-json-schema") opts.reportJsonSchema = true;
    else if (raw === "--preview-only") opts.target = "preview";
    else if (raw === "--production-only" || raw === "--prod-only") opts.target = "production";
    else if (raw === "--report-json") opts.reportJson = "-";
    else if (raw.startsWith("--report-json=")) {
      const v = raw.slice("--report-json=".length);
      if (v === "" || v === "-" || v === "stdout") opts.reportJson = "-";
      else opts.reportJson = v; // treat as file path
    } else if (raw.startsWith("--target=")) {
      const v = raw.slice("--target=".length).toLowerCase();
      if (["preview", "production", "all"].includes(v)) opts.target = v;
      else warn(`Invalid --target=${v} (expected preview|production|all)`);
    } else if (raw.startsWith("--debounce=")) {
      const v = raw.slice("--debounce=".length);
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) opts.debounceMs = Math.min(10000, Math.floor(n));
      else warn(`Invalid --debounce=${v} (expected non-negative number)`);
    } else if (raw.startsWith("--max-runs=")) {
      const v = raw.slice("--max-runs=".length);
      const n = Number(v);
      if (Number.isInteger(n) && n >= 1) opts.maxRuns = n;
      else warn(`Invalid --max-runs=${v} (expected positive integer)`);
    } else if (raw.startsWith("--")) {
      warn(`Unknown flag ${raw}`);
    }
  }
  return { opts, errors };
}

const { opts: CLI, errors: CLI_ERRORS } = parseArgs(process.argv.slice(2));

// When piping JSON to stdout, the human-readable log MUST go to stderr or it
// will corrupt the machine-parseable stream. We redirect console.log/clear
// once, up-front, so every subsequent log call is automatically routed.
const JSON_TO_STDOUT = CLI.reportJson === "-";
if (JSON_TO_STDOUT) {
  console.log = (...args) => process.stderr.write(args.join(" ") + "\n");
  console.clear = () => {}; // suppress screen-clear so CI logs stay linear
}

if (CLI_ERRORS.length > 0) {
  console.log(`\x1b[31mFlag errors (--strict-flags):\x1b[0m`);
  for (const e of CLI_ERRORS) console.log(`  • ${e}`);
  process.exit(EXIT.FLAG_MISCONFIG);
}

const TARGETS = ALL_TARGETS.filter((t) => {
  if (CLI.target === "all") return true;
  return t.name.toLowerCase() === CLI.target;
});

if (TARGETS.length === 0) {
  console.log(`\x1b[31mNo targets matched filter --target=${CLI.target}\x1b[0m`);
  process.exit(EXIT.FLAG_MISCONFIG);
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON report (CI contract).
//
// Schema (stable):
//   {
//     "schema": "hero-copy-qa@1",
//     "ts": "2026-04-27T12:34:56.789Z",
//     "mode": "one-shot" | "watch",
//     "runIndex": 1,
//     "exitCode": 0,
//     "exitName": "OK",
//     "filter": { "target": "all" },
//     "targets": [{ name, url, status, driftKeys, fetchFailed }],
//     "totals": { "drift": 0, "fetchFailed": 0, "manual": 0 }
//   }
//
// Bump "schema" if a breaking change is ever made so consumers can pin.
// ─────────────────────────────────────────────────────────────────────────────
import { writeFileSync } from "node:fs";

// Single source of truth for the JSON schema version. Bump when the schema
// shape changes; the validator below MUST be updated in lockstep so consumers
// can pin against `"schema": "hero-copy-qa@N"`.
const REPORT_SCHEMA = "hero-copy-qa@1";

const exitNameOf = (code) => Object.entries(EXIT).find(([, v]) => v === code)?.[0] ?? "UNKNOWN";

function buildReport({ summary, mode, runIndex, exitCode }) {
  const targetsOut = TARGETS.map((t) => {
    const s = summary?.find((x) => x.target === t.name);
    return {
      name: t.name,
      url: t.url,
      status: s?.status ?? "unknown",
      driftKeys: s?.driftKeys ?? [],
      fetchFailed: s?.status === "fetch_failed",
    };
  });
  return {
    schema: REPORT_SCHEMA,
    ts: new Date().toISOString(),
    mode,
    runIndex,
    exitCode,
    exitName: exitNameOf(exitCode),
    filter: { target: CLI.target },
    targets: targetsOut,
    totals: {
      drift: targetsOut.filter((t) => t.status === "drift").length,
      fetchFailed: targetsOut.filter((t) => t.fetchFailed).length,
      manual: targetsOut.filter((t) => t.status === "manual").length,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema validator (used under --report-json-strict).
//
// Hand-rolled rather than pulling in a JSON-Schema dep so the validator has
// zero install footprint and runs in the same module as the emitter — meaning
// any local change to buildReport() is checked the moment a report is emitted.
//
// The validator is intentionally STRICT:
//   - rejects unknown top-level / per-target / totals keys
//   - asserts exact value types
//   - asserts enum membership for status / mode / target / exitName
//   - asserts internal consistency (totals match targets, exitName matches
//     exitCode, schema string matches REPORT_SCHEMA)
//
// Any violation is a script bug. We surface the path and exit RUNTIME_ERROR.
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_SCHEMA_SHAPE = {
  topKeys: [
    "schema",
    "ts",
    "mode",
    "runIndex",
    "exitCode",
    "exitName",
    "filter",
    "targets",
    "totals",
  ],
  modes: ["one-shot", "watch"],
  targetStatuses: ["ok", "drift", "fetch_failed", "manual", "unknown"],
  filterTargets: ["all", "preview", "production"],
  targetKeys: ["name", "url", "status", "driftKeys", "fetchFailed"],
  totalsKeys: ["drift", "fetchFailed", "manual"],
};

// ─────────────────────────────────────────────────────────────────────────────
// --report-json-schema: print the strict-validator schema and exit cleanly.
//
// Handled here (not in parseArgs) because REPORT_SCHEMA + REPORT_SCHEMA_SHAPE
// must be defined first. Runs BEFORE any fetch / target work, so it's safe in
// air-gapped CI and never triggers network exit codes. Output goes to real
// stdout regardless of --report-json (we use process.stdout.write to bypass
// the console.log redirect installed earlier).
// ─────────────────────────────────────────────────────────────────────────────
if (CLI.reportJsonSchema) {
  const schemaDoc = {
    schema: REPORT_SCHEMA,
    shape: REPORT_SCHEMA_SHAPE,
  };
  process.stdout.write(JSON.stringify(schemaDoc, null, 2) + "\n");
  process.exit(EXIT.OK);
}

function validateReport(report) {
  const errs = [];
  const E = (path, msg) => errs.push(`${path}: ${msg}`);

  if (report === null || typeof report !== "object" || Array.isArray(report)) {
    return [`<root>: must be a plain object`];
  }
  // Top-level shape
  const keys = Object.keys(report);
  for (const k of REPORT_SCHEMA_SHAPE.topKeys) {
    if (!(k in report)) E(k, "missing required key");
  }
  for (const k of keys) {
    if (!REPORT_SCHEMA_SHAPE.topKeys.includes(k)) E(k, `unknown top-level key`);
  }

  if (report.schema !== REPORT_SCHEMA) {
    E("schema", `expected "${REPORT_SCHEMA}", got ${JSON.stringify(report.schema)}`);
  }
  if (typeof report.ts !== "string" || Number.isNaN(Date.parse(report.ts))) {
    E("ts", `expected ISO-8601 timestamp string, got ${JSON.stringify(report.ts)}`);
  }
  if (!REPORT_SCHEMA_SHAPE.modes.includes(report.mode)) {
    E(
      "mode",
      `expected one of ${REPORT_SCHEMA_SHAPE.modes.join("|")}, got ${JSON.stringify(report.mode)}`,
    );
  }
  if (!Number.isInteger(report.runIndex) || report.runIndex < 1) {
    E("runIndex", `expected positive integer, got ${JSON.stringify(report.runIndex)}`);
  }
  if (!Number.isInteger(report.exitCode) || !Object.values(EXIT).includes(report.exitCode)) {
    E(
      "exitCode",
      `expected one of ${Object.values(EXIT).join("|")}, got ${JSON.stringify(report.exitCode)}`,
    );
  }
  if (typeof report.exitName !== "string" || exitNameOf(report.exitCode) !== report.exitName) {
    E(
      "exitName",
      `must equal exitNameOf(exitCode) (=${exitNameOf(report.exitCode)}), got ${JSON.stringify(report.exitName)}`,
    );
  }

  // filter
  if (!report.filter || typeof report.filter !== "object" || Array.isArray(report.filter)) {
    E("filter", "must be an object");
  } else {
    const fkeys = Object.keys(report.filter);
    if (fkeys.length !== 1 || fkeys[0] !== "target")
      E("filter", `expected exactly { target }, got keys [${fkeys.join(", ")}]`);
    if (!REPORT_SCHEMA_SHAPE.filterTargets.includes(report.filter.target)) {
      E(
        "filter.target",
        `expected one of ${REPORT_SCHEMA_SHAPE.filterTargets.join("|")}, got ${JSON.stringify(report.filter.target)}`,
      );
    }
  }

  // targets[]
  if (!Array.isArray(report.targets)) {
    E("targets", "must be an array");
  } else {
    report.targets.forEach((t, i) => {
      const path = `targets[${i}]`;
      if (!t || typeof t !== "object" || Array.isArray(t)) {
        E(path, "must be an object");
        return;
      }
      const tk = Object.keys(t);
      for (const k of REPORT_SCHEMA_SHAPE.targetKeys) if (!(k in t)) E(`${path}.${k}`, "missing");
      for (const k of tk)
        if (!REPORT_SCHEMA_SHAPE.targetKeys.includes(k)) E(`${path}.${k}`, "unknown key");
      if (typeof t.name !== "string" || !t.name) E(`${path}.name`, "expected non-empty string");
      if (typeof t.url !== "string" || !/^https?:\/\//.test(t.url))
        E(`${path}.url`, "expected http(s) URL");
      if (!REPORT_SCHEMA_SHAPE.targetStatuses.includes(t.status)) {
        E(
          `${path}.status`,
          `expected one of ${REPORT_SCHEMA_SHAPE.targetStatuses.join("|")}, got ${JSON.stringify(t.status)}`,
        );
      }
      if (!Array.isArray(t.driftKeys) || !t.driftKeys.every((k) => typeof k === "string")) {
        E(`${path}.driftKeys`, "expected string[]");
      }
      if (typeof t.fetchFailed !== "boolean") E(`${path}.fetchFailed`, "expected boolean");
      // Internal consistency: fetchFailed boolean must mirror status.
      if (t.fetchFailed !== (t.status === "fetch_failed")) {
        E(
          `${path}.fetchFailed`,
          `must equal (status === "fetch_failed"); got ${t.fetchFailed} for status=${t.status}`,
        );
      }
    });
  }

  // totals
  if (!report.totals || typeof report.totals !== "object" || Array.isArray(report.totals)) {
    E("totals", "must be an object");
  } else {
    const tk = Object.keys(report.totals);
    for (const k of REPORT_SCHEMA_SHAPE.totalsKeys)
      if (!(k in report.totals)) E(`totals.${k}`, "missing");
    for (const k of tk)
      if (!REPORT_SCHEMA_SHAPE.totalsKeys.includes(k)) E(`totals.${k}`, "unknown key");
    for (const k of REPORT_SCHEMA_SHAPE.totalsKeys) {
      if (!Number.isInteger(report.totals[k]) || report.totals[k] < 0) {
        E(`totals.${k}`, `expected non-negative integer, got ${JSON.stringify(report.totals[k])}`);
      }
    }
    // Cross-check totals against targets[].
    if (Array.isArray(report.targets)) {
      const expected = {
        drift: report.targets.filter((t) => t.status === "drift").length,
        fetchFailed: report.targets.filter((t) => t.status === "fetch_failed").length,
        manual: report.targets.filter((t) => t.status === "manual").length,
      };
      for (const k of REPORT_SCHEMA_SHAPE.totalsKeys) {
        if (report.totals[k] !== expected[k]) {
          E(
            `totals.${k}`,
            `inconsistent: expected ${expected[k]} (from targets[]), got ${report.totals[k]}`,
          );
        }
      }
    }
  }

  return errs;
}

function emitReport(report) {
  if (!CLI.reportJson) return;

  if (CLI.reportJsonStrict) {
    const errs = validateReport(report);
    if (errs.length > 0) {
      console.log(
        `\x1b[31m\x1b[1m✗ --report-json-strict: emitter format diverged from schema "${REPORT_SCHEMA}":\x1b[0m`,
      );
      for (const e of errs) console.log(`  • ${e}`);
      console.log(
        `\x1b[31mThis is a script bug (buildReport changed without bumping the schema). Update REPORT_SCHEMA + validateReport in lockstep.\x1b[0m`,
      );
      process.exit(EXIT.RUNTIME_ERROR);
    }
  }

  const line = JSON.stringify(report);
  if (CLI.reportJson === "-") {
    process.stdout.write(line + "\n");
  } else {
    try {
      writeFileSync(CLI.reportJson, line + "\n");
    } catch (err) {
      console.log(
        `\x1b[31m⚠ Failed to write JSON report to ${CLI.reportJson}: ${err.message}\x1b[0m`,
      );
    }
  }
}
// The localization checklist — every string here must appear verbatim in the
// served HTML of every target. Order is intentional (top-to-bottom in the UI).
const CHECKS = [
  { key: "eyebrow", label: "Eyebrow", value: HERO_COPY.eyebrow },
  { key: "headlineLine1", label: "Headline (line 1)", value: HERO_COPY.headlineLine1 },
  { key: "headlineLine2", label: "Headline (line 2)", value: HERO_COPY.headlineLine2 },
  { key: "subheadline", label: "Subheadline", value: HERO_COPY.subheadline },
  { key: "primaryCta", label: "Primary CTA", value: HERO_COPY.primaryCta },
  { key: "secondaryCta", label: "Secondary CTA", value: HERO_COPY.secondaryCta },
  { key: "microcopy", label: "Microcopy", value: HERO_COPY.microcopy },
];

// Preflight: the rendered app exposes the live runtime strings via
// `data-hero-*` attributes on a hidden probe element (see src/routes/index.tsx
// around line 574). We parse those attributes from the served HTML and assert
// each one is byte-for-byte equal to the source-of-truth value. If this fails,
// the substring checks below would lie — passing because the OLD copy still
// matches, even though something else has drifted.
const PROBE_ATTRS = [
  { attr: "data-hero-eyebrow", key: "eyebrow", expected: HERO_COPY.eyebrow },
  {
    attr: "data-hero-headline",
    key: "headline",
    expected: `${HERO_COPY.headlineLine1} ${HERO_COPY.headlineLine2}`,
  },
  { attr: "data-hero-subheadline", key: "subheadline", expected: HERO_COPY.subheadline },
  { attr: "data-hero-primary-cta", key: "primaryCta", expected: HERO_COPY.primaryCta },
  { attr: "data-hero-secondary-cta", key: "secondaryCta", expected: HERO_COPY.secondaryCta },
  { attr: "data-hero-microcopy", key: "microcopy", expected: HERO_COPY.microcopy },
];

// Tolerant DOM-based attribute extraction.
//
// Parses the served HTML once with node-html-parser, then for each probe
// attribute selects the element carrying it and reads the value via the
// parser's getAttribute() — which handles:
//   - any attribute order on the element
//   - single, double, or unquoted attribute values
//   - arbitrary surrounding whitespace, line breaks, or formatting
//   - HTML entity decoding (&amp; &quot; &#39; numeric refs, etc.)
//   - mixed case (HTML attributes are case-insensitive)
//   - the attribute appearing on any element in the document
//
// If multiple elements carry the same data-hero-* attribute (the page also
// renders some of these on the visible probe + a hidden mirror), we read the
// FIRST occurrence — they are written from the same HERO_COPY source so they
// must agree, and disagreement is itself a drift signal worth surfacing.
function readProbeAttr(root, attr) {
  const el = root.querySelector(`[${attr}]`);
  if (!el) return null;
  const value = el.getAttribute(attr);
  return value ?? null;
}

function runPreflight(html) {
  const root = parseHtml(html, {
    lowerCaseTagName: false,
    comment: false,
    blockTextElements: { script: false, style: false },
  });
  return PROBE_ATTRS.map((p) => {
    const actual = readProbeAttr(root, p.attr);
    return {
      ...p,
      actual,
      pass: actual !== null && actual === p.expected,
      missing: actual === null,
    };
  });
}

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

async function fetchHtml(url) {
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "Accept-Encoding": "gzip, deflate, br", "User-Agent": "hero-copy-qa/1.0" },
  });
  // Lovable preview hosts (id-preview--*.lovable.app) require auth — they
  // 302-redirect anonymous requests to /auth-bridge. We cannot verify from
  // a script; surface this so the operator does the check in the browser.
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location") || "";
    if (location.includes("/auth-bridge")) {
      const err = new Error("Login required (auth-bridge redirect)");
      err.requiresLogin = true;
      throw err;
    }
    throw new Error(`Unexpected redirect ${res.status} → ${location}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function runChecks(html) {
  return CHECKS.map((check) => ({
    ...check,
    pass: html.includes(check.value),
  }));
}

/**
 * Run preflight + substring checks against every target. Returns a
 * structured per-target summary so watch mode can diff results between runs.
 * Side-effect: prints a human-readable report to stdout.
 */
async function runOnce() {
  console.log(`${BOLD}Home hero copy localization QA${RESET}`);
  console.log(`${DIM}Source of truth: src/content/hero-copy.ts${RESET}\n`);

  const summary = [];
  let totalFailures = 0;
  let manualChecks = 0;
  let fetchFailures = 0;

  for (const target of TARGETS) {
    console.log(`${BOLD}${target.name}${RESET} ${DIM}${target.url}${RESET}`);
    let html;
    try {
      html = await fetchHtml(target.url);
    } catch (err) {
      if (err.requiresLogin) {
        console.log(
          `  ${BOLD}⚠ MANUAL CHECK REQUIRED${RESET} — preview is auth-gated; open the URL in a logged-in browser and visually verify each line below:`,
        );
        for (const c of CHECKS) {
          console.log(`    ${DIM}• ${c.label.padEnd(20)} "${c.value}"${RESET}`);
        }
        console.log("");
        manualChecks++;
        summary.push({ target: target.name, status: "manual", driftKeys: [] });
        continue;
      }
      console.log(`  ${RED}✗ Fetch failed: ${err.message}${RESET}\n`);
      totalFailures++;
      fetchFailures++;
      summary.push({ target: target.name, status: "fetch_failed", driftKeys: [] });
      continue;
    }

    // Preflight: rendered runtime strings must equal source-of-truth.
    console.log(`  ${DIM}Preflight — runtime strings vs src/content/hero-copy.ts${RESET}`);
    const preflight = runPreflight(html);
    const probeFound = preflight.some((p) => !p.missing);
    const driftKeys = [];
    if (!probeFound) {
      console.log(
        `    ${RED}✗ No data-hero-* probe attributes found in served HTML — cannot verify runtime parity.${RESET}`,
      );
      totalFailures++;
      driftKeys.push("__no_probe__");
    } else {
      for (const p of preflight) {
        if (p.pass) {
          console.log(`    ${GREEN}✓${RESET} ${p.attr.padEnd(24)} matches source-of-truth`);
        } else if (p.missing) {
          console.log(
            `    ${RED}✗${RESET} ${p.attr.padEnd(24)} ${RED}attribute missing from rendered HTML${RESET}`,
          );
          totalFailures++;
          driftKeys.push(p.key);
        } else {
          console.log(`    ${RED}✗${RESET} ${p.attr.padEnd(24)} ${RED}DRIFT${RESET}`);
          console.log(`        expected: ${DIM}"${p.expected}"${RESET}`);
          console.log(`        runtime:  ${DIM}"${p.actual}"${RESET}`);
          totalFailures++;
          driftKeys.push(p.key);
        }
      }
    }

    console.log(`  ${DIM}Substring checks — exact strings present in served HTML${RESET}`);
    const results = runChecks(html);
    for (const r of results) {
      const icon = r.pass ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
      const status = r.pass ? "" : `  ${RED}MISSING${RESET}`;
      console.log(`    ${icon} ${r.label.padEnd(20)} ${DIM}"${r.value}"${RESET}${status}`);
      if (!r.pass) totalFailures++;
    }
    console.log("");

    summary.push({
      target: target.name,
      status: driftKeys.length > 0 ? "drift" : "ok",
      driftKeys,
    });
  }

  return { summary, totalFailures, manualChecks, fetchFailures };
}

// Global safety net: any uncaught error inside the script (sync or async) is
// a runtime bug, not a content drift. CI should be able to tell them apart.
process.on("uncaughtException", (err) => {
  console.log(`${RED}${BOLD}✗ Uncaught exception: ${err?.stack || err}${RESET}`);
  process.exit(EXIT.RUNTIME_ERROR);
});
process.on("unhandledRejection", (err) => {
  console.log(`${RED}${BOLD}✗ Unhandled rejection: ${err?.stack || err}${RESET}`);
  process.exit(EXIT.RUNTIME_ERROR);
});

const WATCH = CLI.watch;

if (!WATCH) {
  const { summary, totalFailures, manualChecks, fetchFailures } = await runOnce();
  // Drift takes priority over fetch errors so a true content failure is never
  // masked by a flaky network call. Pure fetch-only failure → EXIT.FETCH_ERROR.
  const driftFailures = totalFailures - fetchFailures;
  let exitCode;
  if (driftFailures > 0) {
    console.log(`${RED}${BOLD}✗ ${driftFailures} drift check(s) failed — do not release.${RESET}`);
    exitCode = EXIT.DRIFT;
  } else if (fetchFailures > 0) {
    console.log(
      `${RED}${BOLD}✗ ${fetchFailures} target(s) unreachable — verification incomplete.${RESET}`,
    );
    exitCode = EXIT.FETCH_ERROR;
  } else if (manualChecks > 0) {
    console.log(
      `${GREEN}${BOLD}✓ Production verified.${RESET} ${BOLD}${manualChecks} target(s) need manual visual check before release.${RESET}`,
    );
    exitCode = EXIT.OK;
  } else {
    console.log(`${GREEN}${BOLD}✓ All hero copy verified across preview and production.${RESET}`);
    exitCode = EXIT.OK;
  }
  emitReport(buildReport({ summary, mode: "one-shot", runIndex: 1, exitCode }));
  process.exit(exitCode);
}

// ─────────────────────────────────────────────────────────────────────────────
// Watch mode: rerun preflight whenever any source file that affects rendered
// hero copy changes locally. Highlights drift transitions vs the previous run.
// ─────────────────────────────────────────────────────────────────────────────

import { watch as fsWatch } from "node:fs";
import { resolve as resolvePath, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolvePath(__dirname, "..");

// Files whose contents could change what gets rendered into the live hero.
// We watch the source-of-truth and the route that consumes it; together they
// cover every realistic local change that would introduce drift.
const WATCHED_FILES = ["src/content/hero-copy.ts", "src/routes/index.tsx"].map((p) =>
  resolvePath(projectRoot, p),
);

const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

function fmtTimestamp() {
  return new Date().toLocaleTimeString();
}

function diffSummaries(prev, curr) {
  // Returns transitions per target so we can call out NEW DRIFT vs RESOLVED.
  const transitions = [];
  for (const c of curr) {
    const p = prev?.find((x) => x.target === c.target);
    if (!p) continue;
    const prevKeys = new Set(p.driftKeys);
    const currKeys = new Set(c.driftKeys);
    const newDrift = [...currKeys].filter((k) => !prevKeys.has(k));
    const resolved = [...prevKeys].filter((k) => !currKeys.has(k));
    if (newDrift.length || resolved.length || p.status !== c.status) {
      transitions.push({ target: c.target, prev: p, curr: c, newDrift, resolved });
    }
  }
  return transitions;
}

function printTransitions(transitions) {
  if (transitions.length === 0) {
    console.log(`${DIM}No change vs previous run.${RESET}\n`);
    return;
  }
  console.log(`${BOLD}${CYAN}═══ Drift transitions since previous run ═══${RESET}`);
  for (const t of transitions) {
    const arrow = `${DIM}${t.prev.status} → ${t.curr.status}${RESET}`;
    if (t.curr.status === "drift" && t.prev.status !== "drift") {
      console.log(`  ${RED}${BOLD}● NEW DRIFT${RESET} on ${BOLD}${t.target}${RESET} (${arrow})`);
    } else if (t.curr.status === "ok" && t.prev.status === "drift") {
      console.log(`  ${GREEN}${BOLD}● RESOLVED${RESET} on ${BOLD}${t.target}${RESET} (${arrow})`);
    } else {
      console.log(`  ${YELLOW}● CHANGED${RESET} on ${BOLD}${t.target}${RESET} (${arrow})`);
    }
    if (t.newDrift.length) {
      console.log(`      ${RED}+ now drifting:${RESET} ${t.newDrift.join(", ")}`);
    }
    if (t.resolved.length) {
      console.log(`      ${GREEN}- now resolved:${RESET} ${t.resolved.join(", ")}`);
    }
  }
  console.log("");
}

let previousSummary = null;
let lastSummary = null;
let runCount = 0;
let running = false;
let pending = false;

// Compute the would-be exit code from a run's summary, mirroring one-shot
// semantics so --fail-fast / --max-runs / SIGINT all use the same contract.
function exitCodeFor(summary) {
  if (!summary || summary.length === 0) return EXIT.OK;
  const hasDrift = summary.some((s) => s.status === "drift");
  const hasFetchFail = summary.some((s) => s.status === "fetch_failed");
  if (hasDrift) return EXIT.DRIFT;
  if (hasFetchFail) return EXIT.FETCH_ERROR;
  return EXIT.OK;
}

async function tick(reason) {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  console.clear();
  console.log(
    `${DIM}[${fmtTimestamp()}]${RESET} ${BOLD}qa:hero-copy --watch${RESET} ${DIM}(${reason})${RESET}`,
  );
  console.log(
    `${DIM}target=${CLI.target} debounce=${CLI.debounceMs}ms failFast=${CLI.failFast} maxRuns=${CLI.maxRuns === Infinity ? "∞" : CLI.maxRuns} targets=[${TARGETS.map((t) => t.name).join(", ")}]${RESET}\n`,
  );
  let runFailedRuntime = false;
  try {
    const { summary } = await runOnce();
    const transitions = diffSummaries(previousSummary, summary);
    printTransitions(transitions);
    previousSummary = summary;
    lastSummary = summary;
  } catch (err) {
    console.log(`${RED}Run failed (script error): ${err?.stack || err.message}${RESET}\n`);
    runFailedRuntime = true;
  }
  runCount++;
  console.log(
    `${DIM}Run #${runCount} complete. Watching ${WATCHED_FILES.length} file(s). Press Ctrl-C to exit.${RESET}`,
  );
  running = false;

  // Termination triggers (CI-friendly):
  //   --fail-fast: exit on first run with drift/fetch failure
  //   --max-runs:  exit after N runs, with code derived from the last run
  //   runtime err: exit RUNTIME_ERROR immediately (test/script bug)
  if (runFailedRuntime) {
    emitReport(
      buildReport({
        summary: lastSummary,
        mode: "watch",
        runIndex: runCount,
        exitCode: EXIT.RUNTIME_ERROR,
      }),
    );
    process.exit(EXIT.RUNTIME_ERROR);
  }
  const code = exitCodeFor(lastSummary);
  // Per-tick report — one JSON line per run, so CI can stream and parse.
  emitReport(
    buildReport({ summary: lastSummary, mode: "watch", runIndex: runCount, exitCode: code }),
  );
  if (CLI.failFast && code !== EXIT.OK) {
    console.log(`${RED}${BOLD}--fail-fast: exiting with code ${code}.${RESET}`);
    process.exit(code);
  }
  if (runCount >= CLI.maxRuns) {
    const label = code === EXIT.OK ? GREEN : RED;
    console.log(
      `${label}${BOLD}--max-runs reached (${CLI.maxRuns}): exiting with code ${code}.${RESET}`,
    );
    process.exit(code);
  }

  if (pending) {
    pending = false;
    setTimeout(() => tick("queued change"), 50);
  }
}

// Debounce bursty fs events (editors often emit several events per save).
// Interval is configurable via --debounce=<ms> (default 200).
let debounceTimer = null;
function scheduleTick(reason) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => tick(reason), CLI.debounceMs);
}

for (const file of WATCHED_FILES) {
  try {
    fsWatch(file, () => scheduleTick(`changed: ${file.replace(projectRoot + "/", "")}`));
  } catch (err) {
    console.log(`${YELLOW}⚠ Could not watch ${file}: ${err.message}${RESET}`);
  }
}

// SIGINT (Ctrl-C) gets a clean exit reflecting the last completed run, so a
// CI operator who interrupts a long-running watch still gets a meaningful code.
process.on("SIGINT", () => {
  const code = exitCodeFor(lastSummary);
  console.log(`\n${DIM}SIGINT received — exiting with code ${code} (based on last run).${RESET}`);
  emitReport(
    buildReport({ summary: lastSummary, mode: "watch", runIndex: runCount, exitCode: code }),
  );
  process.exit(code);
});

await tick("initial run");
