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

  // Partition the full scan into bounded serial batches, retaining every URL
  // and every assertion on every browser project. No concurrent SSR flood.
  const batchCount = 8;
  for (let batch = 0; batch < batchCount; batch += 1) {
  test(`every sitemap URL returns a direct 200 (batch ${batch + 1}/${batchCount})`, async ({ baseURL }) => {
    test.setTimeout(180_000);
    const allPaths = await fetchSitemapPaths(baseURL!);
    expect(allPaths.length).toBeGreaterThan(20);
    const paths = allPaths.filter((_, index) => index % batchCount === batch);
    expect(paths.length).toBeGreaterThan(0);
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
          await res.dispose();
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
  }
});
