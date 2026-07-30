#!/usr/bin/env node
/**
 * Branch-protection / workflow job-name parity check.
 *
 * Asserts that the **required status check context** configured in
 * GitHub branch protection on the target branch (default: `main`)
 * EXACTLY matches the job `name:` field of the homepage-structure
 * workflow at `.github/workflows/homepage-structure.yml`.
 *
 * Why this exists
 * ---------------
 * GitHub registers the job's `name:` field as the status-check context.
 * If someone renames the job (or types the rule by hand and silently
 * substitutes `--` for the em-dash `—`, U+2014), branch protection will
 * keep blocking against a name no run ever produces — every PR will
 * appear "stuck on a missing required check" indefinitely.
 *
 * This script catches that drift in CI before it hits main.
 *
 * Inputs
 * ------
 *   GITHUB_REPOSITORY           "owner/repo" — provided automatically by Actions.
 *   GITHUB_API_URL              Defaults to https://api.github.com.
 *   BRANCH_PROTECTION_TOKEN     PAT or GitHub App token with `Administration: read`.
 *   PROTECTED_BRANCH            Defaults to "main".
 *   WORKFLOW_PATH               Defaults to ".github/workflows/homepage-structure.yml".
 *   WORKFLOW_JOB_KEY            Defaults to "homepage-structure" — the YAML key
 *                               under `jobs:` whose `name:` is the required check.
 *
 * Exit codes
 * ----------
 *   0  Required-check context matches the workflow's job name byte-for-byte.
 *   1  Mismatch — emits a hex-dump diff so invisible chars (em-dash vs hyphen,
 *      NBSP vs space, trailing whitespace) are obvious in the log.
 *   2  Setup error — missing token, branch protection not configured, file
 *      missing, etc. (Treated as a setup problem, not a content failure.)
 */

import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

const REPO = process.env.GITHUB_REPOSITORY;
const API = process.env.GITHUB_API_URL ?? "https://api.github.com";
const TOKEN = process.env.BRANCH_PROTECTION_TOKEN;
const BRANCH = process.env.PROTECTED_BRANCH ?? "main";
const WORKFLOW_PATH = process.env.WORKFLOW_PATH ?? ".github/workflows/homepage-structure.yml";
const JOB_KEY = process.env.WORKFLOW_JOB_KEY ?? "homepage-structure";

function fail(code, msg) {
  process.stderr.write(`❌ ${msg}\n`);
  process.exit(code);
}

if (!REPO) fail(2, "GITHUB_REPOSITORY env var is missing.");
if (!TOKEN) {
  // Advisory guard: it compares branch-protection required contexts against the
  // workflow job names. Reading branch protection needs an admin-scoped token,
  // which forks and repos without `BRANCH_PROTECTION_READ_TOKEN` don't have.
  // Skipping (exit 0) keeps the check honest instead of permanently red for a
  // missing secret — it still fails hard whenever the token IS configured.
  process.stdout.write(
    "⏭️  Skipped: BRANCH_PROTECTION_TOKEN is not configured, so branch " +
      "protection can't be read. Add a PAT or GitHub App token with " +
      "`Administration: read` as the BRANCH_PROTECTION_READ_TOKEN secret to " +
      "enable this parity check.\n",
  );
  process.exit(0);
}

/**
 * Extract the `name:` field of `jobs.<JOB_KEY>` from a GitHub Actions
 * workflow file WITHOUT pulling a YAML dependency (this script runs in
 * a clean CI step, no install). The grammar we need is tiny:
 *
 *   jobs:
 *     <JOB_KEY>:
 *       name: <value>
 *
 * Where <value> can be plain, single-quoted, or double-quoted. Any
 * other YAML shape would be a workflow authoring error this script
 * legitimately should refuse to guess at.
 */
function extractJobName(yamlText, jobKey) {
  const lines = yamlText.split(/\r?\n/);

  // Find `jobs:` at column 0.
  let i = lines.findIndex((l) => /^jobs\s*:\s*(#.*)?$/.test(l));
  if (i < 0) throw new Error("`jobs:` block not found in workflow file.");

  // Walk forward looking for `  <jobKey>:` at exactly 2-space indent.
  const jobHeader = new RegExp(`^  ${jobKey}\\s*:\\s*(#.*)?$`);
  let j = -1;
  for (let k = i + 1; k < lines.length; k++) {
    if (jobHeader.test(lines[k])) {
      j = k;
      break;
    }
    // If we hit another top-level key, the job key is absent.
    if (/^[A-Za-z_]/.test(lines[k])) break;
  }
  if (j < 0) throw new Error(`Job key "${jobKey}" not found under jobs: in ${WORKFLOW_PATH}.`);

  // Within the job, find `    name: …` at exactly 4-space indent.
  // Stop scanning when we leave the job (indent ≤ 2 on a non-blank line).
  for (let k = j + 1; k < lines.length; k++) {
    const line = lines[k];
    if (line.trim() === "") continue;
    const indentMatch = /^( *)/.exec(line);
    const indent = indentMatch ? indentMatch[1].length : 0;
    if (indent <= 2) break; // left the job block
    const m = /^ {4}name\s*:\s*(.*?)\s*(#.*)?$/.exec(line);
    if (m) {
      const raw = m[1];
      // Strip surrounding quotes if quoted, else use as-is.
      if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ) {
        return raw.slice(1, -1);
      }
      return raw;
    }
  }
  throw new Error(
    `Job "${jobKey}" has no \`name:\` field — GitHub will fall back to the ` +
      "key as the check context, which is fragile. Add an explicit name.",
  );
}

/**
 * Hex dump a string so invisible-char drift (em-dash vs hyphen, NBSP
 * vs space, trailing spaces, BOM) is obvious in CI logs.
 */
function hexDump(label, str) {
  const buf = Buffer.from(str, "utf8");
  const lines = [];
  for (let i = 0; i < buf.length; i += 16) {
    const slice = buf.subarray(i, i + 16);
    const hex = [...slice].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = [...slice]
      .map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(`  ${i.toString(16).padStart(4, "0")}  ${hex.padEnd(48)}  ${ascii}`);
  }
  return `${label} (utf-8, ${buf.length} bytes):\n${lines.join("\n")}`;
}

async function gh(path) {
  const res = await fetch(`${API}/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "branch-protection-parity-check",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw Object.assign(new Error(`GitHub API ${res.status} on ${path}: ${body.slice(0, 500)}`), {
      status: res.status,
    });
  }
  return res.json();
}

async function main() {
  // 1. Read expected job name from the workflow file in this checkout.
  let yamlText;
  try {
    yamlText = await readFile(WORKFLOW_PATH, "utf8");
  } catch (err) {
    fail(2, `Could not read ${WORKFLOW_PATH}: ${err.message}`);
  }
  let expected;
  try {
    expected = extractJobName(yamlText, JOB_KEY);
  } catch (err) {
    fail(2, err.message);
  }

  // 2. Fetch configured required-check contexts from branch protection.
  let contexts;
  try {
    // This endpoint returns just the contexts array — lighter than
    // GET /branches/:branch/protection and fails cleanly with 404 if
    // protection isn't configured yet.
    contexts = await gh(
      `repos/${REPO}/branches/${BRANCH}/protection/required_status_checks/contexts`,
    );
  } catch (err) {
    if (err.status === 404) {
      fail(
        2,
        `Branch "${BRANCH}" has no required-status-checks configured. ` +
          `Add the workflow's job name as a required check first, then ` +
          `re-run this guard.`,
      );
    }
    fail(2, `Failed to read branch protection: ${err.message}`);
  }

  if (!Array.isArray(contexts)) {
    fail(2, `Unexpected response shape from contexts endpoint.`);
  }

  // 3. Strict byte-for-byte equality — the configured list must contain
  //    a string that === the expected name. We do NOT trim, normalize,
  //    or case-fold; GitHub matches contexts byte-for-byte too.
  const exact = contexts.some((c) => c === expected);
  if (exact) {
    process.stdout.write(
      `✅ Required-check context matches workflow job name on "${BRANCH}":\n` +
        `   "${expected}"\n`,
    );
    return;
  }

  // 4. Mismatch — emit hex dumps of expected and every configured
  //    context whose printable form looks similar, so reviewers can spot
  //    em-dash drift without leaving the log.
  const out = [];
  out.push(
    `Required-check context on "${BRANCH}" does NOT match the job name in ${WORKFLOW_PATH}.`,
  );
  out.push("");
  out.push(hexDump("Expected (from workflow)", expected));
  out.push("");
  out.push(`Configured contexts on ${BRANCH} (${contexts.length}):`);
  if (contexts.length === 0) {
    out.push("  (none)");
  } else {
    for (const c of contexts) {
      out.push(hexDump(`  - ${JSON.stringify(c)}`, c));
    }
  }
  out.push("");
  out.push(
    "Common cause: the rule was typed by hand and the em-dash (U+2014, e2 80 94) " +
      "was substituted with a hyphen-minus (U+002D, 2d) or two hyphens. Copy the " +
      "name verbatim from the workflow file.",
  );

  fail(1, out.join("\n"));
}

main().catch((err) => {
  fail(2, `Unexpected error: ${err.stack ?? err.message}`);
});
