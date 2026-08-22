import { test, expect, request } from "@playwright/test";
import { SITEMAP_STATIC_ROUTES } from "../src/generated/sitemap-routes";

/**
 * Sitemap coverage + liveness guardrail.
 *
 * 1. Every auto-generated static route (scripts/generate-sitemap-routes.mjs)
 *    is present in the served sitemap.xml — so a newly published page can
 *    never be silently missing from it.
 * 2. Every <loc> in sitemap.xml resolves to a direct HTTP 200 on the running
 *    app — no redirects, no 404s, no noindex pages.
 */

const CANONICAL_ORIGIN = "https://yesexperiencesportugal.com";

async function fetchSitemapPaths(baseURL: string): Promise<string[]> {
  const api = await request.newContext({ baseURL });
  const res = await api.get("/sitemap.xml");
  expect(res.status(), "sitemap.xml must be served").toBe(200);
  const xml = await res.text();
  await api.dispose();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].replace(CANONICAL_ORIGIN, "").trim(),
  );
}

test.describe("sitemap route coverage", () => {
  test("every generated static route is listed in sitemap.xml", async ({ baseURL }) => {
    const paths = new Set(await fetchSitemapPaths(baseURL!));
    const missing = SITEMAP_STATIC_ROUTES.map((r) => r.path).filter((p) => !paths.has(p));
    expect(missing, `routes missing from sitemap.xml: ${missing.join(", ")}`).toEqual([]);
  });

  test("every sitemap URL returns a direct 200", async ({ baseURL }) => {
    const paths = await fetchSitemapPaths(baseURL!);
    expect(paths.length).toBeGreaterThan(20);

    const api = await request.newContext({ baseURL });
    const bad: string[] = [];

    // Sequential-ish batching keeps the dev/preview server responsive.
    const BATCH = 6;
    for (let i = 0; i < paths.length; i += BATCH) {
      const batch = paths.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (p) => {
          const res = await api.get(p, { maxRedirects: 0 });
          return { path: p, status: res.status() };
        }),
      );
      for (const r of results) {
        if (r.status !== 200) bad.push(`${r.path} → ${r.status}`);
      }
    }

    await api.dispose();
    expect(bad, `sitemap URLs that are not a direct 200:\n${bad.join("\n")}`).toEqual([]);
  });
});
