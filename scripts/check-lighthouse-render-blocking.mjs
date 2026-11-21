/**
 * Lighthouse render-blocking budget.
 * LHCI's numeric assertion misreads a notApplicable audit as NaN and fails.
 * Treat N/A as zero render-blocking time; for all applicable measurements
 * enforce the original hard limit of 300ms. Unexpected/missing values fail.
 * No Lighthouse performance budgets or severities are reduced.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = ".lighthouseci";
const files = readdirSync(dir).filter((name) => name.endsWith(".report.json"));
if (files.length === 0) {
  console.error("No Lighthouse JSON reports found; failing closed.");
  process.exit(1);
}

let failures = 0;
for (const file of files) {
  const report = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const audit = report.audits?.["render-blocking-resources"];
  if (!audit) {
    console.error(file, "missing render-blocking-resources audit");
    failures++;
    continue;
  }
  if (audit.scoreDisplayMode === "notApplicable") {
    console.log(file, "render-blocking: N/A (zero candidates)");
    continue;
  }
  const ms = audit.numericValue;
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    console.error(file, "render-blocking audit has no finite numeric value:", audit.scoreDisplayMode);
    failures++;
  } else if (ms > 300) {
    console.error(file, "render-blocking", ms, "ms exceeds original 300ms budget");
    failures++;
  } else {
    console.log(file, "render-blocking", ms, "ms within 300ms budget");
  }
}
if (failures) process.exit(1);
