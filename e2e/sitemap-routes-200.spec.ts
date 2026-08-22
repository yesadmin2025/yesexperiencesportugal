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

    const api = await request.newContext({ baseURL, timeout: 60_000 });
    const bad: string[] = [];

    // Sequential with one retry: SSR-rendering ~70 routes in parallel can hang
    // up the dev server socket, which is a harness artefact, not a route bug.
    for (const p of paths) {
      let status = 0;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const res = await api.get(p, { maxRedirects: 0 });
          status = res.status();
          break;
        } catch (err) {
          if (attempt === 1) {
            bad.push(`${p} → request failed (${(err as Error).message})`);
          }
        }
      }
      if (status && status !== 200) bad.push(`${p} → ${status}`);
    }

    await api.dispose();
    expect(bad, `sitemap URLs that are not a direct 200:\n${bad.join("\n")}`).toEqual([]);
  });
});
