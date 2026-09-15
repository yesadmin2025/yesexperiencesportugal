#!/usr/bin/env node
/**
 * Lightweight external health check (P0 item 7).
 *
 * Checks the revenue-critical URLs plus crawl files, retries each once before
 * reporting, and fails only on repeated failures so a single blip does not
 * page anyone. No paid monitoring service required.
 *
 * Usage: node scripts/health-check.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? process.env.HEALTH_BASE_URL ?? "https://yesexperiencesportugal.com";

const PATHS = [
  "/",
  "/experiences",
  "/studio-v3",
  "/portugal-travel-designer",
  "/tours/arrabida-wine-allinclusive",
  "/robots.txt",
  "/sitemap.xml",
];

const TIMEOUT_MS = 15000;

async function probe(path) {
  const url = `${BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "yes-health-check/1.0" },
    });
    const body = res.status < 400 ? await res.text() : "";
    const brokenChunk = /Failed to fetch dynamically imported module|Loading chunk \d+ failed/i.test(
      body,
    );
    return {
      ok: res.status < 400 && !brokenChunk,
      status: res.status,
      reason: brokenChunk ? "chunk-load-failure" : res.status >= 400 ? `http-${res.status}` : null,
    };
  } catch (error) {
    return { ok: false, status: 0, reason: error?.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

const failures = [];

for (const path of PATHS) {
  let result = await probe(path);
  if (!result.ok) {
    // Retry once — only repeated failures count as an incident.
    await new Promise((r) => setTimeout(r, 3000));
    result = await probe(path);
    if (!result.ok) failures.push({ path, ...result });
  }
  console.log(`${result.ok ? "ok  " : "FAIL"} ${result.status || "---"}  ${path}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} URL(s) failing repeatedly on ${BASE}:`);
  for (const f of failures) console.error(`  ${f.path} — ${f.reason}`);
  process.exit(1);
}

console.log(`\nAll ${PATHS.length} checks passed on ${BASE}.`);
