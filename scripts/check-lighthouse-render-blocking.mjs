/**
 * Validate the original <=300 ms render-blocking budget across every LHCI LHR.
 * Lighthouse 13 migrated "render-blocking-resources" to "render-blocking-insight".
 * The legacy audit may exist with scoreDisplayMode="error" and no number.
 * Fail closed if neither audit supplies a valid measurement or N/A result.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = ".lighthouseci";
const files = readdirSync(dir).filter(
  (name) => /^lhr-.*\.json$/.test(name) || name.endsWith(".report.json"),
);
if (!files.length) {
  console.error("No Lighthouse JSON reports found; failing closed.");
  process.exit(1);
}

let failures = 0;
for (const file of files) {
  const report = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const legacy = report.audits?.["render-blocking-resources"];
  const insight = report.audits?.["render-blocking-insight"];
  let measuredMs;
  let source;
  let exempt = false;

  if (legacy?.scoreDisplayMode === "notApplicable") {
    exempt = true;
    source = "render-blocking-resources N/A";
  } else if (Number.isFinite(legacy?.numericValue)) {
    measuredMs = legacy.numericValue;
    source = "render-blocking-resources";
  } else if (insight?.scoreDisplayMode === "notApplicable") {
    exempt = true;
    source = "render-blocking-insight N/A";
  } else {
    const savings = insight?.metricSavings;
    // Both metrics can be affected by blocking stylesheets. Enforce the
    // original 300ms limit against the largest measured potential saving.
    const measured = [savings?.FCP, savings?.LCP].filter(Number.isFinite);
    if (measured.length) {
      measuredMs = Math.max(...measured);
      source = "render-blocking-insight metricSavings";
    }
  }

  if (exempt) {
    console.log(file, source, "(no render-blocking candidates)");
    continue;
  }
  if (!Number.isFinite(measuredMs)) {
    console.error(file, "no valid render-blocking measurement; failing closed", {
      version: report.lighthouseVersion,
      legacyMode: legacy?.scoreDisplayMode,
      legacyError: legacy?.errorMessage,
      insightMode: insight?.scoreDisplayMode,
      insightError: insight?.errorMessage,
      insightMetricSavings: insight?.metricSavings,
      auditIds: Object.keys(report.audits || {}).filter((id) => id.includes("render-blocking")),
    });
    failures++;
  } else if (measuredMs > 300) {
    console.error(file, source, measuredMs, "ms exceeds unchanged 300ms budget");
    failures++;
  } else {
    console.log(file, source, measuredMs, "ms within unchanged 300ms budget");
  }
}
if (failures) process.exit(1);
