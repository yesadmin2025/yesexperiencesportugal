/**
 * Internal link hygiene: never link to a permanent-redirect alias.
 * ─────────────────────────────────────────────────────────────────
 * The legacy 301 routes MUST stay (external backlinks depend on them), but a
 * link inside our own pages should point straight at the final destination.
 * This test derives the alias → destination map from the real redirect
 * sources, then scans public source for internal link targets that would hit
 * one of those redirects.
 *
 * It also locks the crawl-clean guide attribution model: internal links never
 * append `ref` / `ref_slot` (attribution is captured at click time).
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  CONSOLIDATED_LOCAL_STORY_PATHS,
  CONSOLIDATED_LOCAL_STORY_SLUGS,
} from "@/content/local-stories-articles";
import { LEGACY_TOUR_REDIRECTS } from "@/lib/legacy-tour-redirects";

const ROUTES = "src/routes";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

function routePathFromFile(file: string): string | null {
  let base = file.slice(ROUTES.length + 1).replace(/\.tsx?$/, "");
  if (base.startsWith("api/") || base.includes("__")) return null;
  base = base.replace(/\[\.\]/g, ".");
  const seg = base.split(".").filter(Boolean);
  if (seg.some((s) => s.startsWith("$"))) return null;
  if (seg[seg.length - 1] === "index") seg.pop();
  return `/${seg.join("/")}`;
}

/** alias path → final destination (including hash when the redirect keeps one) */
export function buildRedirectAliasMap(): Map<string, string> {
  const aliases = new Map<string, string>();

  for (const file of walk(ROUTES)) {
    const src = readFileSync(file, "utf8");
    if (!src.includes("statusCode: 301")) continue;
    const from = routePathFromFile(file);
    if (!from) continue;

    const href = src.match(/redirect\(\{\s*href:\s*"([^"]+)"/);
    if (href) {
      aliases.set(from, href[1]);
      continue;
    }
    const to = src.match(/to:\s*"([^"]+)"/);
    if (!to) continue;
    let dest = to[1];
    const slug = src.match(/slug:\s*"([^"]+)"/);
    if (dest.includes("$slug") && slug) dest = dest.replace("$slug", slug[1]);
    if (dest.includes("$")) continue;
    aliases.set(from, dest);
  }

  for (const [retired, surviving] of Object.entries(CONSOLIDATED_LOCAL_STORY_SLUGS)) {
    aliases.set(`/local-stories/${retired}`, `/local-stories/${surviving}`);
  }
  for (const [retired, path] of Object.entries(CONSOLIDATED_LOCAL_STORY_PATHS)) {
    aliases.set(`/local-stories/${retired}`, path);
  }
  for (const [legacy, current] of Object.entries(LEGACY_TOUR_REDIRECTS)) {
    aliases.set(`/tours/${legacy}`, `/tours/${current}`);
  }

  return aliases;
}

function publicSourceFiles(): string[] {
  return walk("src").filter(
    (f) =>
      !f.includes("__tests__") &&
      !f.includes(".test.") &&
      !f.includes(".spec.") &&
      f !== "src/routeTree.gen.ts" &&
      !f.startsWith("src/routes/admin") &&
      !f.startsWith("src/routes/api") &&
      // Page identities for a component that is not mounted on any route —
      // these are page definitions, not internal links.
      f !== "src/content/service-area-pages.ts",
  );
}

describe("internal links never point at a permanent redirect alias", () => {
  const aliases = buildRedirectAliasMap();

  it("derives a non-trivial alias map from the real redirect sources", () => {
    expect(aliases.size).toBeGreaterThan(20);
    expect(aliases.get("/local-stories/best-day-trips-from-lisbon")).toBe("/day-trips-from-lisbon");
    expect(aliases.get("/private-tours-sintra")).toBe("/private-tours-sintra-cascais#sintra");
  });

  it("has zero internal link targets using an alias", () => {
    const offenders: string[] = [];

    for (const file of publicSourceFiles()) {
      const src = readFileSync(file, "utf8");
      const isRedirectRoute = src.includes("statusCode: 301");
      src.split("\n").forEach((line, i) => {
        for (const [alias, final] of aliases) {
          const patterns = [
            `](${alias})`,
            `path: "${alias}"`,
            `to="${alias}"`,
            `to: "${alias}"`,
            `href="${alias}"`,
            `href: "${alias}"`,
          ];
          if (!patterns.some((p) => line.includes(p))) continue;
          // The redirect route's own definition is what creates the alias.
          if (isRedirectRoute && /redirect\(|to: |href: /.test(line)) continue;
          offenders.push(`${file}:${i + 1} ${alias} → ${final}`);
        }
      });
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("guide attribution stays crawl-clean", () => {
  it("never appends ref or ref_slot to an internal link", () => {
    const offenders: string[] = [];
    for (const file of publicSourceFiles()) {
      const src = readFileSync(file, "utf8");
      src.split("\n").forEach((line, i) => {
        // Documentation of the retired scheme is allowed; only code counts.
        const trimmed = line.trim();
        if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) return;
        if (/["'`][^"'`]*[?&]ref=/.test(line) || /[?&]ref_slot=/.test(line)) {
          offenders.push(`${file}:${i + 1} ${trimmed.slice(0, 140)}`);
        }
        if (/\bref_slot:\s*["']/.test(line)) {
          offenders.push(`${file}:${i + 1} ${trimmed.slice(0, 140)}`);
        }
      });
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("keeps the click-time attribution helpers in place", () => {
    const inline = readFileSync("src/lib/guide-attribution-inline.ts", "utf8");
    expect(inline).toContain("guideRefDataAttrs");
    const attribution = readFileSync("src/lib/guide-attribution.ts", "utf8");
    expect(attribution).toContain("export function recordGuideLinkClick");
    // Legacy `?ref=` URLs must still be readable for backwards compatibility.
    expect(attribution).toContain("captureGuideRefFromLocation");
  });
});
