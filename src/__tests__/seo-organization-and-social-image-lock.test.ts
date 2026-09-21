/**
 * SEO structured-data + social-image lock.
 *
 * 1. `#organization` must be defined EXACTLY once, sitewide, by
 *    `organizationLd()` in src/lib/jsonld.ts. No route may emit a second
 *    top-level Organization / TravelAgency / LocalBusiness node reusing
 *    that @id (the `organizationUsCaAudienceLd()` regression).
 * 2. Every indexable public route must carry an og:image + twitter:image,
 *    either route-specific or through the shared `socialImageMeta()`
 *    helper — and never both, which would duplicate the property.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = join(process.cwd(), "src", "routes");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const EXEMPT = [
  /__root\.tsx$/,
  /[/\\]api[./]/,
  /[/\\]admin[./]/,
  /[/\\]_authenticated[./]/,
  /\[\.\]/,
  /[/\\]\$\.tsx$/,
];

const routeFiles = walk(ROUTES_DIR).filter((f) => !EXEMPT.some((re) => re.test(f)));

describe("organization entity is defined once", () => {
  it("no route references organizationUsCaAudienceLd", () => {
    const offenders = routeFiles.filter((f) =>
      readFileSync(f, "utf8").includes("organizationUsCaAudienceLd"),
    );
    expect(offenders).toEqual([]);
  });

  it("the helper no longer exists in src/lib/jsonld.ts", () => {
    const src = readFileSync(join(process.cwd(), "src", "lib", "jsonld.ts"), "utf8");
    expect(src).not.toMatch(/export function organizationUsCaAudienceLd/);
  });

  it("only one top-level (@context-bearing) node defines the #organization @id", () => {
    const src = readFileSync(join(process.cwd(), "src", "lib", "jsonld.ts"), "utf8");
    // A defining top-level node carries "@context" within a few lines above
    // its @id. Nested { "@type": ..., "@id": ... } references do not.
    const lines = src.split("\n");
    let defining = 0;
    lines.forEach((line, i) => {
      if (!/"@id":\s*`\$\{SITE_URL\}\/#organization`/.test(line)) return;
      const window = lines.slice(Math.max(0, i - 4), i).join("\n");
      if (window.includes('"@context"')) defining += 1;
    });
    expect(defining).toBe(1);
  });

  it("no route file DEFINES an #organization node (references are fine)", () => {
    const offenders: string[] = [];
    for (const f of routeFiles) {
      const lines = readFileSync(f, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!/"@id":[^\n]*#organization/.test(line)) return;
        const window = lines.slice(Math.max(0, i - 4), i).join("\n");
        if (window.includes('"@context"')) offenders.push(`${f}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("social preview images", () => {
  // Scope: the indexable routes actually listed in /sitemap.xml, plus their
  // PT twins. QA, redirect, token and noindex surfaces are out of scope.
  const sitemapFiles = (() => {
    const gen = readFileSync(
      join(process.cwd(), "src", "generated", "sitemap-routes.ts"),
      "utf8",
    );
    const paths = [...gen.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
    const files: string[] = [];
    for (const p of paths) {
      const base = p === "/" ? "index" : p.replace(/^\//, "").replace(/\//g, ".");
      const candidate = join(ROUTES_DIR, `${base}.tsx`);
      try {
        statSync(candidate);
        files.push(candidate);
      } catch {
        /* dynamic or nested route — covered elsewhere */
      }
    }
    return files;
  })();

  const withHead = sitemapFiles.filter((f) => /\bhead\s*:\s*\(/.test(readFileSync(f, "utf8")));

  it("resolves a meaningful set of sitemap route files", () => {
    expect(withHead.length).toBeGreaterThan(20);
  });

  it("every indexable sitemap route declares a social image", () => {
    const missing: string[] = [];
    for (const f of withHead) {
      const src = readFileSync(f, "utf8");
      const hasShared = src.includes("socialImageMeta(");
      const hasOwn = /property:\s*"og:image"/.test(src);
      if (!hasShared && !hasOwn) missing.push(f);
    }
    expect(missing).toEqual([]);
  });

  it("no route both hand-writes og:image and uses the shared helper", () => {
    const doubled = withHead.filter((f) => {
      const src = readFileSync(f, "utf8");
      return src.includes("socialImageMeta(") && /property:\s*"og:image"/.test(src);
    });
    expect(doubled).toEqual([]);
  });

  it("routes that hand-write og:image also declare twitter:image", () => {
    const missing = withHead.filter((f) => {
      const src = readFileSync(f, "utf8");
      return /property:\s*"og:image"/.test(src) && !/"twitter:image"/.test(src);
    });
    expect(missing).toEqual([]);
  });

  it("the shared helper emits absolute production URLs with alt text", () => {
    const src = readFileSync(join(process.cwd(), "src", "lib", "seo.ts"), "utf8");
    expect(src).toMatch(/export function socialImageMeta/);
    expect(src).toMatch(/og:image:alt/);
    expect(src).toMatch(/name: "twitter:image"/);
    expect(src).toMatch(/twitter:image:alt/);
    expect(src).toMatch(/abs\(image \|\| brandSocialImage\)/);
  });
});
