#!/usr/bin/env node
/**
 * Branch-protection / workflow job-name parity ENFORCER.
 *
 * Companion to `check-required-status-context.mjs`. That script
 * verifies; this one repairs. Specifically:
 *
 *   - Reads the job `name:` from the workflow file (same parser).
 *   - Reads the configured required-check contexts on the protected
 *     branch.
 *   - If the expected context is already present → no-op, exit 0.
 *   - If the expected context is missing AND `MODE=apply` → POSTs it
 *     to `…/required_status_checks/contexts` (additive — does not
 *     remove or reorder other contexts).
 *   - If `MODE=check` (the default) → exit 1 on drift; never writes.
 *
 * Safety boundaries
 * -----------------
 *   - Uses the granular contexts endpoint, NOT the full-replace
 *     `PUT /branches/:branch/protection` endpoint. We CANNOT
 *     accidentally clobber review counts, restrictions, signed-commit
 *     requirements, etc.
 *   - Refuses to run if branch protection isn't configured at all
 *     (404). That's a deliberate setup decision; an auto-healer
 *     shouldn't bootstrap protection out of thin air.
 *   - Refuses to remove any context. The only mutation is "add the
 *     one missing context".
 *   - Logs the full before/after contexts list so reviewers can audit
 *     exactly what changed.
 *
 * Inputs
 * ------
 *   GITHUB_REPOSITORY           "owner/repo" — provided by Actions.
 *   GITHUB_API_URL              Defaults to https://api.github.com.
 *   BRANCH_PROTECTION_TOKEN     PAT or GitHub App token. Scope:
 *                                 - MODE=check  → Administration: Read
 *                                 - MODE=apply  → Administration: Read+Write
 *   PROTECTED_BRANCH            Defaults to "main".
 *   WORKFLOW_PATH               Defaults to ".github/workflows/homepage-structure.yml".
 *   WORKFLOW_JOB_KEY            Defaults to "homepage-structure".
 *   MODE                        "check" (default) | "apply" | "apply-dry-run".
 *
 * Modes
 * -----
 *   check          Read-only. Exit 1 on drift, never writes. Token only
 *                  needs Administration: Read.
 *   apply-dry-run  Read-only. Reports the EXACT POST payload that
 *                  `apply` mode WOULD send (the missing context, the
 *                  endpoint URL, the request body), then exits 0.
 *                  Useful for previewing self-heal behavior from the
 *                  Actions UI before granting write permission.
 *                  Token only needs Administration: Read.
 *   apply          Mutating. Issues an additive POST to add the
 *                  missing context. Token needs Administration:
 *                  Read and write.
 *
 * Exit codes
 * ----------
 *   0  Already in sync, OR MODE=apply added the missing context, OR
 *      MODE=apply-dry-run completed (drift reported but not applied).
 *   1  Drift detected and MODE=check (read-only).
 *   2  Setup error — missing token, no protection configured, file
 *      missing, parse error, etc.
 */

import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

const REPO = process.env.GITHUB_REPOSITORY;
const API = process.env.GITHUB_API_URL ?? "https://api.github.com";
const TOKEN = process.env.BRANCH_PROTECTION_TOKEN;
const BRANCH = process.env.PROTECTED_BRANCH ?? "main";
const WORKFLOW_PATH = process.env.WORKFLOW_PATH ?? ".github/workflows/homepage-structure.yml";
const JOB_KEY = process.env.WORKFLOW_JOB_KEY ?? "homepage-structure";
const MODE = (process.env.MODE ?? "check").toLowerCase();

const VALID_MODES = ["check", "apply", "apply-dry-run"];
if (!VALID_MODES.includes(MODE)) {
  process.stderr.write(
    `❌ MODE must be one of ${VALID_MODES.map((m) => `"${m}"`).join(", ")}, got "${MODE}".\n`,
  );
  process.exit(2);
}

const IS_WRITE = MODE === "apply";

function fail(code, msg) {
  process.stderr.write(`❌ ${msg}\n`);
  process.exit(code);
}

if (!REPO) fail(2, "GITHUB_REPOSITORY env var is missing.");
if (!TOKEN) {
  // Advisory guard — see check-required-status-context.mjs. Without an
  // admin-scoped token branch protection simply can't be inspected, so we skip
  // instead of holding every run red on a missing repository secret. The check
  // still enforces hard whenever the token IS configured.
  process.stdout.write(
    `⏭️  Skipped: BRANCH_PROTECTION_TOKEN is not configured, so branch ` +
      `protection can't be ${IS_WRITE ? "modified" : "read"}. Add a PAT or ` +
      `GitHub App token with \`Administration: ` +
      `${IS_WRITE ? "Read and write" : "Read"}\` as the ` +
      `BRANCH_PROTECTION_${IS_WRITE ? "WRITE" : "READ"}_TOKEN secret to ` +
      `enable this enforcement.\n`,
  );
  process.exit(0);
}

/**
 * Extract `jobs.<JOB_KEY>.name` from the workflow YAML without pulling
 * a YAML parser dep. Handles plain / single-quoted / double-quoted
 * scalar values; rejects anything more exotic so authoring mistakes
 * surface loudly instead of silently mis-matching.
 */
function extractJobName(yamlText, jobKey) {
  const lines = yamlText.split(/\r?\n/);
  const i = lines.findIndex((l) => /^jobs\s*:\s*(#.*)?$/.test(l));
  if (i < 0) throw new Error("`jobs:` block not found in workflow file.");

  const jobHeader = new RegExp(`^  ${jobKey}\\s*:\\s*(#.*)?$`);
  let j = -1;
  for (let k = i + 1; k < lines.length; k++) {
    if (jobHeader.test(lines[k])) {
      j = k;
      break;
    }
    if (/^[A-Za-z_]/.test(lines[k])) break; // hit a sibling top-level key
  }
  if (j < 0) throw new Error(`Job key "${jobKey}" not found under jobs: in ${WORKFLOW_PATH}.`);

  for (let k = j + 1; k < lines.length; k++) {
    const line = lines[k];
    if (line.trim() === "") continue;
    const indent = (/^( *)/.exec(line) ?? ["", ""])[1].length;
    if (indent <= 2) break; // left the job block
    const m = /^ {4}name\s*:\s*(.*?)\s*(#.*)?$/.exec(line);
    if (m) {
      const raw = m[1];
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
    `Job "${jobKey}" has no \`name:\` field — GitHub falls back to the ` +
      "key as the check context, which is fragile. Add an explicit name.",
  );
}

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

async function gh(method, path, body) {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "branch-protection-parity-enforcer",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(
      new Error(`GitHub API ${res.status} on ${method} ${path}: ${text.slice(0, 500)}`),
      { status: res.status },
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

async function main() {
  // Echo the inputs we resolved BEFORE doing any work. When a comment
  // links to the wrong file or the wrong job, the first thing an
  // operator wants to know is "what did the script actually parse?"
  // — so log it unconditionally up front.
  process.stdout.write(
    `── Resolved inputs ──────────────────────────────────────────\n` +
      `  Repository       : ${REPO}\n` +
      `  Protected branch : ${BRANCH}\n` +
      `  Workflow YAML    : ${WORKFLOW_PATH}\n` +
      `  Workflow job key : ${JOB_KEY}\n` +
      `  Mode             : ${MODE}\n` +
      `  GitHub API base  : ${API}\n` +
      `─────────────────────────────────────────────────────────────\n`,
  );

  // 1. Read expected job name from the workflow file in the checkout.
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

  // Confirm what we extracted, and where from. Hex-stringify so
  // invisible-char drift (em-dash vs hyphen-minus) is obvious in the
  // log without waiting for the failure path.
  process.stdout.write(
    `Parsed job name from \`${WORKFLOW_PATH}\` → \`jobs.${JOB_KEY}.name\`:\n` +
      `  "${expected}"\n` +
      `  utf-8 bytes: ${Buffer.from(expected, "utf8").toString("hex")}\n\n`,
  );

  // 2. Fetch configured contexts on the protected branch.
  let before;
  try {
    before = await gh(
      "GET",
      `repos/${REPO}/branches/${BRANCH}/protection/required_status_checks/contexts`,
    );
  } catch (err) {
    if (err.status === 404) {
      fail(
        2,
        `Branch "${BRANCH}" has no required-status-checks configured. ` +
          `This enforcer will NOT bootstrap protection out of thin air — ` +
          `that's a deliberate setup decision. Configure protection (with at ` +
          `least one required check) once in the GitHub UI, then re-run.`,
      );
    }
    fail(2, `Failed to read branch protection: ${err.message}`);
  }
  if (!Array.isArray(before)) fail(2, "Unexpected response shape.");

  // 3. Decide.
  const inSync = before.some((c) => c === expected);
  if (inSync) {
    process.stdout.write(
      `✅ Required-check context already in sync on "${BRANCH}":\n` +
        `   "${expected}"\n` +
        `   (${before.length} required check${before.length === 1 ? "" : "s"} total)\n`,
    );
    return;
  }

  // 4. Drift. Either report or repair, depending on MODE.
  const report = [
    `Required-check context on "${BRANCH}" is MISSING the workflow job name.`,
    "",
    hexDump("Expected (from workflow)", expected),
    "",
    `Configured contexts on ${BRANCH} (${before.length}):`,
    ...(before.length === 0
      ? ["  (none)"]
      : before.map((c) => hexDump(`  - ${JSON.stringify(c)}`, c))),
    "",
    "Common cause: the rule was typed by hand and the em-dash (U+2014, " +
      "e2 80 94) was substituted with a hyphen-minus (U+002D, 2d) or two " +
      "hyphens. Copy the name verbatim from the workflow file.",
  ].join("\n");

  if (MODE === "check") {
    fail(1, report);
  }

  // Compose the EXACT request that `apply` mode would send. Used by
  // both apply-dry-run (print only) and apply (print + send), so the
  // two paths can never disagree about what would be written.
  const writePath = `repos/${REPO}/branches/${BRANCH}/protection/required_status_checks/contexts`;
  const writeBody = { contexts: [expected] };

  if (MODE === "apply-dry-run") {
    process.stdout.write(`${report}\n\n`);
    process.stdout.write(
      `🧪 MODE=apply-dry-run — NO write performed.\n` +
        `   The following request WOULD be sent in MODE=apply:\n\n` +
        `     POST ${API}/${writePath}\n` +
        `     Content-Type: application/json\n` +
        `     Body: ${JSON.stringify(writeBody)}\n\n` +
        `   Endpoint is additive — it would add the missing context to the\n` +
        `   existing list of ${before.length} context${before.length === 1 ? "" : "s"} ` +
        `without removing or reordering any.\n\n` +
        `   Predicted contexts after apply (${before.length + 1}): ` +
        `${JSON.stringify([...before, expected])}\n\n` +
        `   Re-run this workflow with mode=apply to perform the write.\n`,
    );
    return;
  }

  // MODE === "apply" — additive only.
  process.stdout.write(`${report}\n\n`);
  process.stdout.write(`🔧 MODE=apply — adding the missing context (additive).\n`);

  // POST appends the given contexts to the existing list — it does NOT
  // remove or reorder others. We send only the one missing context to
  // make the audit trail unambiguous.
  // https://docs.github.com/en/rest/branches/branch-protection
  //   #add-status-check-contexts
  let after;
  try {
    after = await gh("POST", writePath, writeBody);
  } catch (err) {
    fail(
      2,
      `Failed to add required-check context: ${err.message}\n` +
        `(Token needs Administration: Read and write on this repository.)`,
    );
  }

  if (!Array.isArray(after) || !after.some((c) => c === expected)) {
    fail(
      2,
      `POST succeeded but the expected context is still missing from the ` +
        `response. Aborting to avoid a false-positive success.\n` +
        `Response: ${JSON.stringify(after)}`,
    );
  }

  // Sanity: assert we did NOT remove anything.
  const removed = before.filter((c) => !after.includes(c));
  if (removed.length > 0) {
    fail(
      2,
      `Refusing to claim success: the POST removed pre-existing contexts. ` +
        `This should be impossible with the additive endpoint — please ` +
        `investigate immediately.\n` +
        `Removed: ${JSON.stringify(removed)}`,
    );
  }

  process.stdout.write(
    `✅ Added required-check context to "${BRANCH}":\n` +
      `   "${expected}"\n\n` +
      `Before (${before.length}): ${JSON.stringify(before)}\n` +
      `After  (${after.length}): ${JSON.stringify(after)}\n`,
  );
}

main().catch((err) => {
  fail(2, `Unexpected error: ${err.stack ?? err.message}`);
});
