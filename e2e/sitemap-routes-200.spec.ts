import { test, expect, request } from "@playwright/test";
import { SITEMAP_STATIC_ROUTES } from "../src/generated/sitemap-routes";

/**
 * Sitemap coverage + liveness guardrail.
 *
 * 1. Every auto-generated static route (scripts/generate-sitemap-routes.mjs)
 *    is present in the served sitemap.xml — so a newly published page can
 *    never be silently missing from it.
 * 2. Every <loc> in sitemap.xml resolves to a direct HTTP 200 on the running
 *    app — no redirects or 404s. Production-indexability is checked only
 *    on the production origin; the local preview intentionally sends noindex.
 * 3. Every HTML <loc> is self-canonical on the production origin.
 */

const CANONICAL_ORIGIN = "https://yesexperiencesportugal.com";

function canonicalFromHtml(html: string): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    if (!rel.split(/\s+/).includes("canonical")) continue;
    return tag.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? null;
  }
  return null;
}

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
    // All sitemap routes are checked serially against a cold CI SSR server.
    // The default 30s Playwright test timeout ended the entire scan early;
    // individual route HTTP 200 and canonical assertions remain unchanged.
    test.setTimeout(180_000);
    const paths = await fetchSitemapPaths(baseURL!);
    expect(paths.length).toBeGreaterThan(20);
    // CI serves localhost with X-Robots-Tag: noindex to prevent indexing of
    // previews. That is intentional; only the public production host must
    // be indexable. Keep checking real production headers whenever the test
    // points to the production origin.
    const checkPublicIndexability =
      new URL(baseURL!).hostname === new URL(CANONICAL_ORIGIN).hostname;

    const api = await request.newContext({
      baseURL,
      timeout: 60_000,
    });
    const bad: string[] = [];

    // Sequential with one retry: SSR-rendering ~70 routes in parallel can hang
    // up the dev server socket, which is a harness artefact, not a route bug.
    for (const p of paths) {
      let status = 0;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const res = await api.get(p, { maxRedirects: 0 });
          status = res.status();

          if (status === 200) {
            const xRobots = (res.headers()["x-robots-tag"] ?? "").toLowerCase();
            if (checkPublicIndexability && xRobots.includes("noindex")) {
              bad.push(`${p} → X-Robots-Tag noindex`);
            }

            const contentType = res.headers()["content-type"] ?? "";
            if (contentType.includes("text/html")) {
              const html = await res.text();
              const metaRobots =
                html.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] ??
                html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*name=["']robots["'][^>]*>/i)?.[1] ??
                "";
              if (checkPublicIndexability && metaRobots.toLowerCase().includes("noindex")) {
                bad.push(`${p} → meta robots noindex`);
              }

              const canonical = canonicalFromHtml(html);
              const expectedCanonical =
                p === "/" ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${p}`;
              if (canonical !== expectedCanonical) {
                bad.push(
                  `${p} → canonical ${canonical ?? "(missing)"}; expected ${expectedCanonical}`,
                );
              }
            }
          }
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
