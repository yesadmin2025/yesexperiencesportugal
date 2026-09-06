/**
 * SEO index-quality contract (unit-level, runs without a server).
 *
 * Locks the crawl / index strategy that the live e2e spec
 * (e2e/seo-conversion-index-quality.spec.ts) verifies over HTTP:
 *   - utility pages are unconditional `noindex, follow`, self-canonical,
 *     hreflang-paired and absent from the sitemap
 *   - EN /contact, /reviews and /pt/reviews stay indexable and in the sitemap
 *   - Tailor pages stay intentionally `noindex, follow`
 *   - the 10-day Travel Designer sample stays substantive and indexable
 *   - the Azeitão Signature FAQ tells the full-day truth
 *   - the sitemap never advertises noindex utilities, PT twins of them,
 *     Tailor variants or `?ref=` link variants
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { SITEMAP_STATIC_ROUTES } from "@/generated/sitemap-routes";
import { PT_PAIRED_PATHS } from "@/i18n/pt-ready";
import { PT_NOINDEX_UTILITY_PATHS, ptSitemapPaths } from "@/lib/seo/sitemap-policy";
import { WINE_TOUR_FAQ_BY_ID } from "@/content/seo-faq";

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://yesexperiencesportugal.com";

const routeSource = (file: string) => readFileSync(join(SRC_ROOT, "routes", file), "utf8");

/** Lines declaring a robots meta, e.g. `{ name: "robots", content: "noindex, follow" }`. */
function robotsLines(source: string): string[] {
  return source.split("\n").filter((line) => /name:\s*["']robots["']/.test(line));
}

const isConditional = (line: string) => /\.\.\.\(|\?/.test(line);

const NOINDEX_UTILITIES: Array<{ file: string; path: string; pair: string }> = [
  { file: "pt.contact.tsx", path: "/pt/contact", pair: "/contact" },
  { file: "privacy.tsx", path: "/privacy", pair: "/privacy" },
  { file: "pt.privacy.tsx", path: "/pt/privacy", pair: "/privacy" },
  { file: "cookies.tsx", path: "/cookies", pair: "/cookies" },
  { file: "pt.cookies.tsx", path: "/pt/cookies", pair: "/cookies" },
];

const INDEXABLE_TRUST: Array<{ file: string; path: string }> = [
  { file: "reviews.tsx", path: "/reviews" },
  { file: "pt.reviews.tsx", path: "/pt/reviews" },
];

describe("utility pages: noindex, follow — but usable, self-canonical and hreflang-paired", () => {
  it.each(NOINDEX_UTILITIES)("$path", ({ file, path, pair }) => {
    const src = routeSource(file);
    const robots = robotsLines(src);
    expect(robots.length, `${file} declares a robots meta`).toBeGreaterThan(0);
    const unconditional = robots.find((l) => /noindex,\s*follow/.test(l) && !isConditional(l));
    expect(unconditional, `${file} must be unconditional noindex, follow`).toBeTruthy();
    expect(src, `${file} must not nofollow`).not.toMatch(/nofollow/);
    // Self canonical (literal or via a PAGE_URL constant).
    expect(src).toContain(`${ORIGIN}${path}`);
    expect(src).toMatch(/rel:\s*["']canonical["']/);
    // hreflang reciprocity is preserved through the shared helper.
    expect(src).toContain(`localeAlternateLinks("${pair}")`);
    // Still a real page — no redirect, no notFound.
    expect(src).not.toMatch(/throw\s+redirect\s*\(/);
    expect(src).not.toMatch(/throw\s+notFound\s*\(/);
  });
});

describe("indexable lead-gen and trust pages", () => {
  it("/contact (EN) only noindexes the ?type= / ?place= param variant", () => {
    const src = routeSource("contact.tsx");
    const robots = robotsLines(src);
    expect(robots.length).toBeGreaterThan(0);
    for (const line of robots) {
      expect(isConditional(line), `unconditional noindex on /contact: ${line.trim()}`).toBe(true);
    }
    expect(src).toContain(`${ORIGIN}/contact"`);
    expect(src).toContain('localeAlternateLinks("/contact")');
  });

  it.each(INDEXABLE_TRUST)("$path is index, follow and self-canonical", ({ file, path }) => {
    const src = routeSource(file);
    expect(src).toMatch(/content:\s*["']index,\s*follow["']/);
    expect(src).not.toMatch(/noindex/);
    expect(src).toContain(`${path}\``);
  });
});

describe("Tailor pages stay intentionally noindex, follow", () => {
  it("tours_.$tourId.tailor.tsx", () => {
    const src = routeSource("tours_.$tourId.tailor.tsx");
    const robots = robotsLines(src);
    expect(robots.length).toBeGreaterThan(0);
    expect(robots.every((l) => /noindex,\s*follow/.test(l))).toBe(true);
    expect(src).not.toMatch(/nofollow/);
  });
});

describe("10-day Travel Designer sample stays substantive and indexable", () => {
  const src = routeSource("itineraries.10-day-private-portugal-tour.tsx");

  it("is index, follow with a self canonical", () => {
    expect(src).toMatch(/content:\s*["']index,\s*follow["']/);
    expect(src).not.toMatch(/noindex/);
    expect(src).toContain('const PAGE_PATH = "/itineraries/10-day-private-portugal-tour"');
    expect(src).toMatch(/rel:\s*["']canonical["'],\s*href:\s*PAGE_URL/);
  });

  it("is explicitly a sample shape composed with a human Travel Designer", () => {
    expect(src).toMatch(/sample shape/i);
    expect(src).toMatch(/Travel Designer/);
    expect(src).toMatch(/How this works/);
  });

  it("carries FAQ + FAQPage and Trip/Itinerary structured data", () => {
    expect(src).toMatch(/faqPageLd\(/);
    expect(src).toMatch(/tripItineraryLd\(/);
  });

  it("publishes no fixed multi-day price and no guaranteed transfer / dinner", () => {
    expect(src).not.toMatch(/€\s?\d/);
    expect(src).not.toMatch(/\d\s?€/);
    expect(src).not.toMatch(/airport transfer/i);
    expect(src).not.toMatch(/guaranteed/i);
    expect(src).toMatch(/farewell dinner[^.]*(option|only if|not a default)/i);
  });
});

describe("Azeitão Signature FAQ tells the full-day truth", () => {
  const faq = WINE_TOUR_FAQ_BY_ID["azeitao-cheese"] ?? [];
  const text = faq.map((f) => `${f.q} ${f.a}`).join("\n");

  it("describes the real 8–9 hour private day and its chapters", () => {
    expect(faq.length).toBeGreaterThan(0);
    expect(text).toMatch(/8–9 hour/);
    expect(text).toMatch(/Setúbal market/);
    expect(text).toMatch(/hands-on Azeitão cheese-making workshop/);
    expect(text).toMatch(/lunch in Azeitão/);
    expect(text).toMatch(/winery visit and tasting/);
    expect(text).toMatch(/Sesimbra Castle/);
  });

  it("carries none of the retired half-day claims and no supplier names", () => {
    expect(text).not.toMatch(/half[- ]day/i);
    expect(text).not.toMatch(/\bshorter\b/i);
    expect(text).not.toMatch(/one estate|single estate/i);
    expect(text).not.toMatch(/mid-afternoon/i);
    expect(text).not.toMatch(/Bacalh[ôo]a|Jos[ée] Maria da Fonseca|Quinta d[aeo]/i);
  });
});

describe("sitemap exclusions", () => {
  const staticPaths = new Set(SITEMAP_STATIC_ROUTES.map((r) => r.path));
  const ptPaths = new Set(ptSitemapPaths(PT_PAIRED_PATHS));

  it("keeps indexable pages in", () => {
    for (const p of ["/contact", "/reviews", "/itineraries/10-day-private-portugal-tour"]) {
      expect(staticPaths.has(p), `sitemap missing ${p}`).toBe(true);
    }
    expect(ptPaths.has("/pt")).toBe(true);
    expect(ptPaths.has("/pt/reviews")).toBe(true);
  });

  it("drops EN noindex utilities", () => {
    for (const p of ["/privacy", "/cookies"]) {
      expect(staticPaths.has(p), `sitemap advertises ${p}`).toBe(false);
    }
  });

  it("drops the PT twins of noindex utilities while keeping them hreflang-paired", () => {
    for (const en of PT_NOINDEX_UTILITY_PATHS) {
      expect(PT_PAIRED_PATHS, `${en} must stay bilingual`).toContain(en);
      expect(ptPaths.has(`/pt${en}`), `sitemap advertises /pt${en}`).toBe(false);
    }
    expect(ptPaths.has("/pt/contact")).toBe(false);
    expect(ptPaths.has("/pt/privacy")).toBe(false);
    expect(ptPaths.has("/pt/cookies")).toBe(false);
  });

  it("never lists Tailor variants, PT paths as static entries, or query strings", () => {
    for (const p of [...staticPaths, ...ptPaths]) {
      expect(p, `tailor in sitemap: ${p}`).not.toMatch(/\/tailor$/);
      expect(p, `query string in sitemap: ${p}`).not.toContain("?");
      expect(p, `ref param in sitemap: ${p}`).not.toMatch(/ref=/);
    }
    for (const p of staticPaths) expect(p.startsWith("/pt")).toBe(false);
  });

  it("the sitemap route ships the shared PT exclusion policy", () => {
    const src = readFileSync(join(SRC_ROOT, "routes", "sitemap[.]xml.ts"), "utf8");
    expect(src).toContain('from "@/lib/seo/sitemap-policy"');
    expect(src).toMatch(/ptSitemapPaths\(PT_PAIRED_PATHS\)/);
  });
});
