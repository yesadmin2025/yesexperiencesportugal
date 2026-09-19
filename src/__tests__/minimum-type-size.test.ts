import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Brand floor: no public-facing text renders below 11px.
 *
 * A Playwright sweep found labels at 6.5–10.5px (third-party review badge,
 * cookie banner, region chips, review sort). Those are fixed; this guard keeps
 * new arbitrary sizes from reintroducing unreadable type. Admin panels, debug
 * overlays and the PDF one-pager are internal/print surfaces and exempt.
 */
const EXEMPT = [
  "admin",
  "DebugOverlay",
  "typography-audit",
  "signatureOnePagerPdf",
  "__tests__",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

describe("minimum public type size", () => {
  it("has no arbitrary font size below 11px in public components", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      if (EXEMPT.some((k) => file.includes(k))) continue;
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
        if (Number(match[1]) < 11) offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
