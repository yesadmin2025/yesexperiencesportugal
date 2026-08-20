import { test, expect, request, type APIRequestContext } from "@playwright/test";

/**
 * Build-time SEO head contract.
 *
 * Crawls every URL advertised by sitemap.xml and asserts, per page:
 *  1. exactly one <link rel="canonical">, absolute, on the canonical origin,
 *     self-referencing (no cross-locale or homepage canonicalisation);
 *  2. og:url present, absolute, and identical to the canonical;
 *  3. hreflang alternates are absolute, use valid BCP-47 values, are unique,
 *     include x-default, and are reciprocal (the alternate page points back);
 *  4. no indexable page emits `noindex`;
 *  5. known query-parameter variants DO emit `noindex, follow` and canonicalise
 *     to their clean, same-locale URL.
 *
 * Complements e2e/sitemap-robots-canonical.spec.ts (which validates which URLs
 * are listed) by validating what each listed URL actually emits.
 */

const CANONICAL_ORIGIN = "https://yesexperiencesportugal.com";

/** ?query variants that must stay crawl-safe but never indexable duplicates. */
const NOINDEX_VARIANTS: Array<{ path: string; canonical: string }> = [
  { path: "/contact?type=corporate", canonical: `${CANONICAL_ORIGIN}/contact` },
  { path: "/pt/contact?type=corporate", canonical: `${CANONICAL_ORIGIN}/pt/contact` },
];

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"));
  return m ? m[1].trim() : undefined;
}

function tags(html: string, re: RegExp): string[] {
  return Array.from(html.matchAll(re)).map((m) => m[0]);
}

function canonicalsOf(html: string): string[] {
  return tags(html, /<link[^>]+rel=["']canonical["'][^>]*>/gi)
    .map((t) => attr(t, "href"))
    .filter((h): h is string => Boolean(h));
}

function ogUrlOf(html: string): string | undefined {
  const t = tags(html, /<meta[^>]+property=["']og:url["'][^>]*>/gi)[0];
  return t ? attr(t, "content") : undefined;
}

function robotsOf(html: string): string | undefined {
  const t = tags(html, /<meta[^>]+name=["']robots["'][^>]*>/gi)[0];
  return t ? attr(t, "content") : undefined;
}

function alternatesOf(html: string): Array<{ lang: string; href: string }> {
  return tags(html, /<link[^>]+rel=["']alternate["'][^>]*>/gi)
    .map((t) => ({
      lang: (attr(t, "hreflang") ?? attr(t, "hrefLang") ?? "").toLowerCase(),
      href: attr(t, "href") ?? "",
    }))
    .filter((a) => a.lang && a.href);
}

const BCP47 = /^(x-default|[a-z]{2}(-[A-Za-z]{2})?)$/i;

async function getHtml(ctx: APIRequestContext, url: string) {
  const res = await ctx.get(url);
  return { status: res.status(), html: await res.text() };
}

test.describe("SEO head contract across public routes", () => {
  let ctx: APIRequestContext;
  let paths: string[] = [];
  const htmlCache = new Map<string, string>();

  test.beforeAll(async ({ baseURL }) => {
    ctx = await request.newContext({ baseURL });
    const res = await ctx.get("/sitemap.xml");
    expect(res.status(), "GET /sitemap.xml").toBe(200);
    const xml = await res.text();
    paths = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
      .map((m) => m[1].trim().slice(CANONICAL_ORIGIN.length) || "/")
      .filter((p, i, a) => a.indexOf(p) === i);
    expect(paths.length, "sitemap has entries").toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test("canonical + og:url are absolute, unique and self-referencing", async () => {
    const problems: string[] = [];
    for (const path of paths) {
      const { status, html } = await getHtml(ctx, path);
      htmlCache.set(path, html);
      if (status !== 200) {
        problems.push(`${path}: HTTP ${status}`);
        continue;
      }
      const canonicals = canonicalsOf(html);
      if (canonicals.length !== 1) {
        problems.push(`${path}: expected 1 canonical, found ${canonicals.length}`);
        continue;
      }
      const canonical = canonicals[0];
      const expected = `${CANONICAL_ORIGIN}${path === "/" ? "/" : path}`;
      if (canonical.replace(/\/$/, "") !== expected.replace(/\/$/, "")) {
        problems.push(`${path}: canonical is ${canonical}, expected ${expected}`);
      }
      const ogUrl = ogUrlOf(html);
      if (!ogUrl) problems.push(`${path}: missing og:url`);
      else if (ogUrl.replace(/\/$/, "") !== canonical.replace(/\/$/, "")) {
        problems.push(`${path}: og:url ${ogUrl} !== canonical ${canonical}`);
      }
      const robots = robotsOf(html);
      if (robots && /noindex/i.test(robots)) {
        problems.push(`${path}: sitemap URL emits robots "${robots}"`);
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  test("hreflang alternates are valid, unique and reciprocal", async () => {
    const problems: string[] = [];
    for (const path of paths) {
      const html = htmlCache.get(path) ?? (await getHtml(ctx, path)).html;
      htmlCache.set(path, html);
      const alts = alternatesOf(html).filter((a) => a.lang !== "");
      if (alts.length === 0) continue; // page has no translated equivalent

      const seen = new Set<string>();
      for (const a of alts) {
        if (!BCP47.test(a.lang)) problems.push(`${path}: invalid hreflang "${a.lang}"`);
        if (!a.href.startsWith(`${CANONICAL_ORIGIN}/`))
          problems.push(`${path}: non-absolute/foreign alternate ${a.href}`);
        if (seen.has(a.lang)) problems.push(`${path}: duplicate hreflang "${a.lang}"`);
        seen.add(a.lang);
      }
      if (!seen.has("x-default")) problems.push(`${path}: missing hreflang x-default`);

      // Reciprocity: every alternate must list this page back.
      for (const a of alts) {
        if (a.lang === "x-default") continue;
        const altPath = a.href.slice(CANONICAL_ORIGIN.length) || "/";
        const altHtml = htmlCache.get(altPath) ?? (await getHtml(ctx, altPath)).html;
        htmlCache.set(altPath, altHtml);
        const back = alternatesOf(altHtml).map((x) => x.href.replace(/\/$/, ""));
        const self = `${CANONICAL_ORIGIN}${path}`.replace(/\/$/, "");
        if (!back.includes(self)) {
          problems.push(`${path}: alternate ${altPath} does not link back (${a.lang})`);
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  test("query-parameter variants are noindex and canonicalise to the clean same-locale URL", async () => {
    const problems: string[] = [];
    for (const { path, canonical } of NOINDEX_VARIANTS) {
      const { status, html } = await getHtml(ctx, path);
      if (status !== 200) {
        problems.push(`${path}: HTTP ${status}`);
        continue;
      }
      const robots = robotsOf(html) ?? "";
      if (!/noindex/i.test(robots)) problems.push(`${path}: robots is "${robots}", expected noindex`);
      if (!/follow/i.test(robots)) problems.push(`${path}: robots is "${robots}", expected follow`);
      const found = canonicalsOf(html);
      if (found.length !== 1 || found[0] !== canonical) {
        problems.push(`${path}: canonical ${found.join(",") || "(none)"} !== ${canonical}`);
      }
      const ogUrl = ogUrlOf(html);
      if (ogUrl && ogUrl.includes("?")) problems.push(`${path}: og:url leaks query string (${ogUrl})`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
