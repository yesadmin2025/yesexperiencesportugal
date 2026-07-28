import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { localeAlternateLinks } from "../seo";
import { PT_PAIRED_PATHS, isPtPaired } from "../pt-ready";

const ROOT = process.cwd();
const ORIGIN = "https://yesexperiencesportugal.com";

/** EN route file for a locale-neutral path ("/" -> index.tsx). */
function enRouteFile(path: string): string {
  return join(ROOT, "src/routes", path === "/" ? "index.tsx" : `${path.slice(1)}.tsx`);
}
/** PT twin route file ("/" -> pt.index.tsx). */
function ptRouteFile(path: string): string {
  return join(ROOT, "src/routes", path === "/" ? "pt.index.tsx" : `pt.${path.slice(1)}.tsx`);
}

describe("localeAlternateLinks", () => {
  it("emits en, pt-PT and x-default for a path", () => {
    expect(localeAlternateLinks("/about")).toEqual([
      { rel: "alternate", hrefLang: "en", href: `${ORIGIN}/about` },
      { rel: "alternate", hrefLang: "pt-PT", href: `${ORIGIN}/pt/about` },
      { rel: "alternate", hrefLang: "x-default", href: `${ORIGIN}/about` },
    ]);
  });

  it("keeps the trailing slash on the homepage so it matches the canonical", () => {
    for (const link of localeAlternateLinks("/")) {
      expect(link.href).not.toBe(ORIGIN);
    }
    expect(localeAlternateLinks("/")[0].href).toBe(`${ORIGIN}/`);
  });

  it("is symmetric — the same set regardless of which side renders it", () => {
    expect(localeAlternateLinks("/contact")).toEqual(localeAlternateLinks("/contact"));
  });
});

describe("hreflang reciprocity across EN/PT twins", () => {
  it.each(PT_PAIRED_PATHS)("both %s and its PT twin call the shared helper", (path) => {
    for (const file of [enRouteFile(path), ptRouteFile(path)]) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} must emit alternates via localeAlternateLinks`).toContain(
        `localeAlternateLinks("${path}")`,
      );
      // No hand-rolled alternates — they drift out of sync.
      expect(src, `${file} must not hand-roll rel="alternate" links`).not.toMatch(
        /rel:\s*"alternate"/,
      );
    }
  });

  it("excludes redirect stubs from the paired set", () => {
    for (const stub of ["/faq", "/moments", "/proposals"]) {
      expect(isPtPaired(stub)).toBe(false);
    }
  });
});

describe("bilingual sitemap", () => {
  const sitemap = readFileSync(join(ROOT, "src/routes/sitemap[.]xml.ts"), "utf8");

  it("derives PT entries from PT_PAIRED_PATHS instead of a hard-coded list", () => {
    expect(sitemap).toContain("PT_PAIRED_PATHS");
  });

  it("never lists a PT redirect stub", () => {
    for (const stub of ["/pt/faq", "/pt/moments", "/pt/proposals"]) {
      expect(sitemap).not.toContain(stub);
    }
  });
});
