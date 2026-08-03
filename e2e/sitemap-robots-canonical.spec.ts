import { test, expect, request } from "@playwright/test";

/**
 * Automated guardrail for robots.txt and sitemap.xml.
 *
 * Validates that:
 *  1. robots.txt contains the intended Disallow rules and the Sitemap: directive
 *     pointing at the canonical domain.
 *  2. sitemap.xml lists every intended canonical route (public, HTTP 200).
 *  3. sitemap.xml does NOT list any URL that robots.txt disallows, nor any known
 *     redirect / auth / QA / admin path.
 *  4. Every <loc> uses the canonical https://yesexperiencesportugal.com origin
 *     and appears at most once.
 */

// Canonical public routes that MUST appear in sitemap.xml.
const REQUIRED_CANONICAL_PATHS = [
  "/",
  "/about",
  "/press",
  "/contact",
  "/experiences",
  "/experience-studio",
  "/day-tours",
  "/multi-day",
  "/portugal-travel-designer",
  "/proposal-in-portugal",
  "/corporate",
  "/local-stories",
  "/itineraries/10-day-private-portugal-tour",
  "/portugal-tours",
  "/luxury-tours-portugal",
  "/private-tours-portugal",
  "/terms",
  "/privacy",
  "/cookies",
];

// Paths that must NEVER appear in sitemap.xml (redirects, auth, QA, admin, transactional).
const FORBIDDEN_PATHS = [
  "/admin",
  "/auth",
  "/booking-confirmed",
  "/brand-qa",
  "/builder",
  "/checkout",
  "/e2e",
  "/hero-verify",
  "/lovable",
  "/preview-check",
  "/qa",
  "/studio-drift",
  "/studio-v3",
  "/studio-v2",
  "/typography-audit",
  "/unsubscribe",
  "/faq",
  "/moments",
  "/arrabida-wine-tour",
  "/arrabida-day-trip-from-lisbon",
  "/alentejo-wine-tour-from-lisbon",
  "/evora-alentejo-wine-tour",
  "/local-stories/$slug",
];

// Robots Disallow entries that MUST be present.
const REQUIRED_DISALLOWS = [
  "/admin",
  "/.lovable",
  "/auth",
  "/booking-confirmed",
  "/brand-qa",
  "/builder",
  "/checkout",
  "/e2e",
  "/hero-verify",
  "/lovable",
  "/preview-check",
  "/qa",
  "/s/",
  "/i/",
  "/studio-drift",
  "/studio-v2",
  "/typography-audit",
  "/unsubscribe",
];

const CANONICAL_ORIGIN = "https://yesexperiencesportugal.com";

async function fetchText(url: string): Promise<string> {
  const ctx = await request.newContext();
  const res = await ctx.get(url);
  expect(res.status(), `GET ${url}`).toBe(200);
  const body = await res.text();
  await ctx.dispose();
  return body;
}

function parseSitemapLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim());
}

function parseRobots(text: string): { disallows: string[]; sitemaps: string[] } {
  const disallows: string[] = [];
  const sitemaps: string[] = [];
  let inStarUA = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      inStarUA = value === "*";
    } else if (key === "disallow" && inStarUA && value) {
      disallows.push(value);
    } else if (key === "sitemap" && value) {
      sitemaps.push(value);
    }
  }
  return { disallows, sitemaps };
}

test.describe("robots.txt + sitemap.xml canonical guardrails", () => {
  test("robots.txt disallows internal routes and points at canonical sitemap", async () => {
    const body = await fetchText("/robots.txt");
    const { disallows, sitemaps } = parseRobots(body);
    for (const path of REQUIRED_DISALLOWS) {
      expect(disallows, `robots.txt missing Disallow: ${path}`).toContain(path);
    }
    expect(disallows, "robots.txt must not block the whole site").not.toContain("/");
    expect(sitemaps).toContain(`${CANONICAL_ORIGIN}/sitemap.xml`);
  });

  test("sitemap.xml includes all canonical routes and excludes disallowed ones", async () => {
    const xml = await fetchText("/sitemap.xml");
    const locs = parseSitemapLocs(xml);
    expect(locs.length, "sitemap has entries").toBeGreaterThan(0);

    // All URLs must use the canonical origin.
    for (const loc of locs) {
      expect(loc.startsWith(`${CANONICAL_ORIGIN}/`), `non-canonical origin: ${loc}`).toBe(true);
    }

    // No duplicates.
    const dupes = locs.filter((l, i) => locs.indexOf(l) !== i);
    expect(dupes, `duplicate <loc> entries: ${dupes.join(", ")}`).toEqual([]);

    const paths = new Set(locs.map((l) => l.slice(CANONICAL_ORIGIN.length) || "/"));

    // Required canonicals present.
    for (const path of REQUIRED_CANONICAL_PATHS) {
      expect(paths.has(path), `sitemap missing canonical: ${path}`).toBe(true);
    }

    // Forbidden paths absent (exact or prefix under /admin, /builder, etc.).
    const forbiddenPrefixes = [
      "/admin",
      "/builder",
      "/checkout",
      "/lovable",
      "/qa",
      "/e2e",
      "/studio-v2",
    ];
    for (const p of paths) {
      expect(FORBIDDEN_PATHS.includes(p), `sitemap includes forbidden path: ${p}`).toBe(false);
      for (const pref of forbiddenPrefixes) {
        expect(
          p === pref || p.startsWith(`${pref}/`),
          `sitemap includes forbidden prefix ${pref}: ${p}`,
        ).toBe(false);
      }
    }

    // Cross-check: nothing in sitemap is Disallow'd by robots.txt.
    const robots = parseRobots(await fetchText("/robots.txt"));
    for (const p of paths) {
      for (const dis of robots.disallows) {
        const blocked = dis.endsWith("/")
          ? p.startsWith(dis)
          : p === dis || p.startsWith(`${dis}/`);
        expect(blocked, `sitemap path ${p} is Disallow'd by robots.txt rule ${dis}`).toBe(false);
      }
    }
  });
});
